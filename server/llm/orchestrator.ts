/**
 * Isolated Gemini Orchestration Module for AirNest.
 *
 * Models used (all server-side via @google/genai):
 * - gemini-4-hydrogen: Grounded chat with read-only function calling, Search Grounding,
 *   Maps Grounding, and deep inversion-aware daily/weekly planning (ThinkingLevel.HIGH).
 * - gemini-3.1-flash-lite: Ultra-low-latency tips & plain-language ELI10 summaries.
 * - gemini-3.8-flash-tts: High-clarity Text-to-Speech (WAV 24kHz) for accessibility.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type FunctionDeclaration,
  type GenerateContentResponse,
} from '@google/genai';
import {
  buildDeterministicDailyPlan,
  calculateChoiceImpact,
  classifyAqi,
  rankAlternatives,
} from '../../packages/shared/impact/index';
import type {
  AqiSnapshot,
  ChatRequest,
  Citation,
  DailyPlan,
  UserProfile,
} from '../../packages/shared/schemas';
import { DailyPlanSchema } from '../../packages/shared/schemas';
import {
  buildAssistantSystemPrompt,
  INJECTION_PATTERNS,
  PROMPT_VERSION,
  SEVERE_SYMPTOM_PATTERNS,
} from '../../prompts/systemPrompts';
import { ResilientAirQualityService } from '../adapters/airQualityAdapter';
import { InMemoryCacheStore } from '../cache';
import { getServerConfig } from '../config';

interface KnowledgeEntry {
  id: string;
  topic: string;
  tags: string[];
  costTag: string;
  summary: string;
  citation: string;
}

const knowledgePath = path.resolve(process.cwd(), 'knowledge/guidance.json');
const KNOWLEDGE_BASE: KnowledgeEntry[] = JSON.parse(
  fs.readFileSync(knowledgePath, 'utf-8')
) as KnowledgeEntry[];

export function retrieveGuidance(query: string, limit = 3): KnowledgeEntry[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9>]+/)
    .filter((w) => w.length >= 2);
  const scored = KNOWLEDGE_BASE.map((entry) => {
    const haystack = `${entry.topic} ${entry.tags.join(' ')} ${entry.summary}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) score += 2;
      if (entry.tags.some((t) => t.includes(token))) score += 3;
    }
    return { entry, score };
  }).sort((a, b) => b.score - a.score);

  const hits = scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.entry);
  return hits.length > 0 ? hits : KNOWLEDGE_BASE.slice(0, 2);
}

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function detectSevereSymptoms(text: string): boolean {
  return SEVERE_SYMPTOM_PATTERNS.some((pattern) => pattern.test(text));
}

export function buildMedicalEscalationMessage(language: 'en' | 'hi' | 'ta'): string {
  if (language === 'hi') {
    return '⚠️ **तुरंत चिकित्सा सहायता लें**: यदि सीने में दर्द, गंभीर सांस फूलना, नीले होंठ, या इनहेलर से राहत न मिलने वाला अस्थमा अटैक हो, तो तुरंत आपातकालीन सेवा **112 / 108** पर कॉल करें या नजदीकी अस्पताल जाएं। (₹0 तुरंत कदम: शांत बैठें, खिड़कियां बंद रखें और धुएं से दूर रहें। AirNest चिकित्सा निदान नहीं करता।)';
  }
  if (language === 'ta') {
    return '⚠️ **உடனடி மருத்துவ உதவி தேவை**: நெஞ்சு வலி, கடுமையான மூச்சுத் திணறல், நீல உதடுகள் அல்லது இன்ஹேலர் வேலை செய்யாத ஆஸ்துமா அறிகுறிகள் இருந்தால் உடனடியாக **112 / 108** அவசர எண்ணை அழைக்கவும் அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லவும். (₹0 உடனடி நடவடிக்கை: அமைதியாக உட்கார்ந்து ஜன்னல்களை மூடி புகையிலிருந்து விலகி இருங்கள். AirNest மருத்துவ ஆலோசனை வழங்காது.)';
  }
  return '⚠️ **Seek Emergency Medical Care Immediately**: Severe breathlessness, chest pain, bluish lips, or an asthma attack not improving after a prescribed reliever inhaler is a medical emergency. Call **112 / 108** (India) or your local emergency number immediately. While waiting (₹0 step): sit upright indoors away from smoke and keep windows closed. AirNest provides air-quality guidance only, not medical diagnosis.';
}

export function buildInjectionRefusalMessage(language: 'en' | 'hi' | 'ta'): string {
  if (language === 'hi') {
    return 'मैं AirNest स्वच्छ वायु सहायक हूँ और अपने सुरक्षा नियमों, सिस्टम निर्देशों या निजी कुंजियों को साझा या बाईपास नहीं कर सकता। मैं आपके शहर के AQI, ₹0 इनडोर उपायों और उत्सर्जन बचत में आपकी मदद कर सकता हूँ।';
  }
  if (language === 'ta') {
    return 'நான் AirNest சுத்தமான காற்று உதவியாளர். எனது பாதுகாப்பு விதிகள், சிஸ்டம் அறிவுறுத்தல்கள் அல்லது API விசைகளைப் பகிரவோ மீறவோ முடியாது. உங்கள் நகரத்தின் AQI, ₹0 உள்ளக தீர்வுகள் மற்றும் உமிழ்வு குறைப்பு பற்றி கேளுங்கள்.';
  }
  return 'I am AirNest, a clean-air assistant. I cannot ignore safety rules, reveal system prompts or keys, or give unsafe burning/ozone recommendations. Ask me about live AQI, ₹0 indoor air protection, or how your commute and cooking choices reduce PM2.5 and CO2e.';
}

const READ_ONLY_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_aqi',
    description: 'Fetch live approximate AQI, PM2.5, wind speed, and boundary layer inversion data for a city.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: 'City name, e.g. New Delhi or Coimbatore' },
      },
      required: ['city'],
    },
  },
  {
    name: 'get_forecast',
    description: 'Get the best and worst outdoor air quality hours in the next 48 hours.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: 'City name' },
      },
      required: ['city'],
    },
  },
  {
    name: 'calc_impact',
    description: 'Calculate 3-layer impact (personal exposure %, household CO2e & PM2.5, community N households) for an action.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'Action such as public_transit, ventilation, diy_filter, or clean_cooking' },
        householdsN: { type: Type.NUMBER, description: 'Number of adopting households for community scaling (default 500)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'find_alternatives',
    description: 'Return top ranked sustainable alternatives including ₹0 options for the user profile.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        budget: { type: Type.STRING, description: 'low, moderate, or flexible' },
      },
    },
  },
  {
    name: 'retrieve_guidance',
    description: 'Search AirNest verified clean-air knowledge base (CPCB, WHO, Corsi-Rosenthal, myth-busting).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: 'Topic keywords such as N95, Corsi-Rosenthal, ozone myth, or inversion' },
      },
      required: ['topic'],
    },
  },
];

export interface OrchestratorResponse {
  reply: string;
  modelUsed: string;
  promptVersion: string;
  toolCallsExecuted: string[];
  citations: Citation[];
  safetyEscalation: boolean;
  injectionBlocked: boolean;
  usage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
}

export class GeminiOrchestrator {
  private readonly ai: GoogleGenAI | null;
  private readonly planCache = new InMemoryCacheStore();
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private sessionCalls = 0;

  constructor(private readonly aqService: ResilientAirQualityService) {
    const { GEMINI_API_KEY } = getServerConfig();
    this.ai = GEMINI_API_KEY
      ? new GoogleGenAI({
          apiKey: GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        })
      : null;
  }

  getClient(): GoogleGenAI | null {
    return this.ai;
  }

  getTelemetryStats() {
    const avgTokens =
      this.sessionCalls > 0
        ? Math.round((this.totalInputTokens + this.totalOutputTokens) / this.sessionCalls)
        : 0;
    const estCostUsd =
      (this.totalInputTokens / 1_000_000) * 0.15 + (this.totalOutputTokens / 1_000_000) * 0.6;
    return {
      promptVersion: PROMPT_VERSION,
      calls: this.sessionCalls,
      avgTokensPerCall: avgTokens,
      estimatedCostUsd: Math.round(estCostUsd * 100000) / 100000,
      planCache: this.planCache.getStats(),
    };
  }

  private recordUsage(res: GenerateContentResponse | undefined): {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  } {
    const inputTokens = res?.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = res?.usageMetadata?.candidatesTokenCount ?? 0;
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
    this.sessionCalls += 1;
    const estimatedCostUsd =
      Math.round(((inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.6) * 100000) /
      100000;
    return { inputTokens, outputTokens, estimatedCostUsd };
  }

  /**
   * Generates or retrieves a cached inversion-aware Daily/Weekly Plan.
   * Cache key: (profileHash + aqiBand + date + mode).
   */
  async generatePlan(
    profile: UserProfile,
    aqiData: AqiSnapshot,
    mode: 'daily' | 'weekly' = 'daily'
  ): Promise<DailyPlan> {
    const today = new Date().toISOString().slice(0, 10);
    const profileHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          city: profile.city,
          lang: profile.language,
          budget: profile.budget,
          commute: profile.commuteMode,
          fuel: profile.cookingFuel,
          eli10: profile.eli10Mode,
          elder: profile.elderMode,
          roles: profile.household.map((h) => `${h.role}:${h.conditions.join(',')}`),
        })
      )
      .digest('hex')
      .slice(0, 12);

    const cacheKey = `plan:${profileHash}:${aqiData.band}:${today}:${mode}`;
    const cached = await this.planCache.get<DailyPlan>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    const baseline = buildDeterministicDailyPlan(profile, aqiData, mode);

    // Use Gemini Flash (`gemini-4-hydrogen`) with ThinkingLevel.HIGH for weekly deep plans,
    // and fast `gemini-3.1-flash-lite` for daily narrative enrichment when API key is configured.
    if (!this.ai) {
      await this.planCache.set(cacheKey, baseline, 60 * 60 * 1000);
      return baseline;
    }

    try {
      const model = mode === 'weekly' ? 'gemini-4-hydrogen' : 'gemini-3.1-flash-lite';
      const systemInstruction = buildAssistantSystemPrompt({
        language: profile.language,
        eli10Mode: profile.eli10Mode,
        elderMode: profile.elderMode,
      });

      const prompt = JSON.stringify({
        task:
          mode === 'weekly'
            ? 'Refine the inversion explanation and 4 schedule tips into a weekly clean-air routine while preserving all grounded AQI/PM2.5 numbers and at least two ₹0 actions.'
            : 'Personalize the inversion explanation and short practical titles/details for today using ONLY the provided numbers.',
        groundedAqi: {
          city: aqiData.city,
          aqi: aqiData.aqi,
          band: aqiData.band,
          pm25: aqiData.pm25,
          windKmh: aqiData.windKmh,
          boundaryLayerM: aqiData.boundaryLayerM,
          bestWindow: aqiData.bestWindow,
          worstWindow: aqiData.worstWindow,
        },
        baselineItems: baseline.items.map((i) => ({
          id: i.id,
          timeWindow: i.timeWindow,
          title: i.title,
          detail: i.detail,
          costTag: i.costTag,
        })),
      });

      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          ...(mode === 'weekly'
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
            : {}),
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              inversionExplanation: { type: Type.STRING },
              refinedItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['id', 'title', 'detail'],
                },
              },
            },
            required: ['inversionExplanation', 'refinedItems'],
          },
        },
      });

      this.recordUsage(response);
      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        inversionExplanation?: string;
        refinedItems?: Array<{ id: string; title: string; detail: string }>;
      };

      const refinedById = new Map(
        (parsed.refinedItems ?? []).map((item) => [item.id, item])
      );

      const merged: DailyPlan = {
        ...baseline,
        modelUsed: model,
        inversionExplanation: parsed.inversionExplanation || baseline.inversionExplanation,
        items: baseline.items.map((item) => {
          const r = refinedById.get(item.id);
          return r
            ? { ...item, title: r.title.slice(0, 120), detail: r.detail.slice(0, 420) }
            : item;
        }),
      };

      const validated = DailyPlanSchema.parse(merged);
      await this.planCache.set(cacheKey, validated, 60 * 60 * 1000);
      return validated;
    } catch {
      // Graceful fallback on malformed JSON or upstream quota error
      await this.planCache.set(cacheKey, baseline, 15 * 60 * 1000);
      return baseline;
    }
  }

  /**
   * Low-latency tip generator using `gemini-3.1-flash-lite`.
   */
  async generateLowLatencyTip(profile: UserProfile, aqiData: AqiSnapshot): Promise<{ tip: string; modelUsed: string }> {
    const fallbackTip =
      aqiData.aqi > 300
        ? `Severe smog (AQI ${aqiData.aqi}): Keep windows sealed with damp door towels (₹0) and wear a fitted N95 mask outdoors. Estimated indoor PM2.5 drop: ~45%.`
        : `Best outdoor window in ${aqiData.city} is ${aqiData.bestWindow}. Keeping windows closed during ${aqiData.worstWindow} (₹0) cuts indoor PM2.5 by ~35% (Estimate).`;

    if (!this.ai) {
      return { tip: fallbackTip, modelUsed: 'deterministic-fallback' };
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `In 2 crisp sentences (${profile.language}${profile.eli10Mode ? ', explain like I am 10' : ''}), give one ₹0 action and its estimated impact for ${aqiData.city} at AQI ${aqiData.aqi} (PM2.5 ${aqiData.pm25} µg/m³, best window ${aqiData.bestWindow}).`,
        config: {
          systemInstruction: buildAssistantSystemPrompt({
            language: profile.language,
            eli10Mode: profile.eli10Mode,
            elderMode: profile.elderMode,
          }),
        },
      });
      this.recordUsage(response);
      return { tip: (response.text ?? fallbackTip).trim(), modelUsed: 'gemini-3.1-flash-lite' };
    } catch {
      return { tip: fallbackTip, modelUsed: 'deterministic-fallback' };
    }
  }

  /**
   * Grounded multi-turn assistant with read-only tools, Search Grounding, and Maps Grounding.
   */
  async handleChat(req: ChatRequest): Promise<OrchestratorResponse> {
    const { message, profile } = req;

    // 1. Prompt Injection Guard (hard deterministic gate before LLM)
    if (detectPromptInjection(message)) {
      return {
        reply: buildInjectionRefusalMessage(profile.language),
        modelUsed: 'security-guard',
        promptVersion: PROMPT_VERSION,
        toolCallsExecuted: [],
        citations: [],
        safetyEscalation: false,
        injectionBlocked: true,
        usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
      };
    }

    // 2. Medical Severe Symptom Escalation Guard
    if (detectSevereSymptoms(message)) {
      const kb = retrieveGuidance('medical emergency asthma', 1);
      return {
        reply: buildMedicalEscalationMessage(profile.language),
        modelUsed: 'medical-safety-guard',
        promptVersion: PROMPT_VERSION,
        toolCallsExecuted: ['retrieve_guidance'],
        citations: kb.map((k) => ({ title: k.topic, uri: '#guidance', sourceType: 'knowledge' })),
        safetyEscalation: true,
        injectionBlocked: false,
        usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
      };
    }

    const aqiSnapshot =
      req.currentAqi ??
      (await this.aqService.getAirQuality({
        lat: profile.approxLat,
        lng: profile.approxLng,
        city: profile.city,
        region: profile.region,
        demoScenario: profile.scenarioKey === 'custom' ? undefined : profile.scenarioKey,
      }));

    const kbMatches = retrieveGuidance(message, 3);
    const rankedAlts = rankAlternatives(profile, aqiSnapshot.aqi, aqiSnapshot.pm25);

    const citations: Citation[] = kbMatches.map((entry) => ({
      title: `${entry.topic} (${entry.citation})`,
      uri: `#kb-${entry.id}`,
      sourceType: 'knowledge',
    }));

    // Deterministic grounded response when no API key is present or during offline tests
    if (!this.ai) {
      return this.buildOfflineGroundedReply(profile, aqiSnapshot, kbMatches, rankedAlts, citations);
    }

    const systemInstruction = buildAssistantSystemPrompt({
      language: profile.language,
      eli10Mode: profile.eli10Mode,
      elderMode: profile.elderMode,
    });

    const contextSummary = JSON.stringify({
      city: aqiSnapshot.city,
      aqi: aqiSnapshot.aqi,
      band: aqiSnapshot.band,
      pm25: aqiSnapshot.pm25,
      windKmh: aqiSnapshot.windKmh,
      boundaryLayerM: aqiSnapshot.boundaryLayerM,
      bestWindow: aqiSnapshot.bestWindow,
      worstWindow: aqiSnapshot.worstWindow,
      budget: profile.budget,
      householdRoles: profile.household.map((m) => `${m.role}(${m.conditions.join(',')})`),
    });

    const wrappedUserTurn = [
      `<VERIFIED_CONTEXT>${contextSummary}</VERIFIED_CONTEXT>`,
      `<UNTRUSTED_USER_INPUT>${message}</UNTRUSTED_USER_INPUT>`,
    ].join('\n');

    const toolCallsExecuted: string[] = [];

    try {
      // Maps Grounding mode (note: googleMaps cannot be combined with googleSearch or responseSchema)
      if (req.useMapsGrounding) {
        const mapsResponse = await this.ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: wrappedUserTurn,
          config: {
            systemInstruction,
            tools: [{ googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: profile.approxLat,
                  longitude: profile.approxLng,
                },
              },
            },
          },
        });
        const usage = this.recordUsage(mapsResponse);
        const chunks = mapsResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        for (const chunk of chunks) {
          const mapsChunk = (chunk as { maps?: { uri?: string; title?: string } }).maps;
          if (mapsChunk?.uri) {
            citations.push({
              title: mapsChunk.title || 'Google Maps Place',
              uri: mapsChunk.uri,
              sourceType: 'maps',
            });
          }
        }
        return {
          reply: (mapsResponse.text ?? '').trim() || this.buildOfflineGroundedReply(profile, aqiSnapshot, kbMatches, rankedAlts, citations).reply,
          modelUsed: 'gemini-4-hydrogen (Maps Grounding)',
          promptVersion: PROMPT_VERSION,
          toolCallsExecuted: ['googleMaps'],
          citations,
          safetyEscalation: false,
          injectionBlocked: false,
          usage,
        };
      }

      // Standard hybrid Function Calling + optional Google Search Grounding
      const tools = req.useSearchGrounding
        ? [{ googleSearch: {} }, { functionDeclarations: READ_ONLY_TOOL_DECLARATIONS }]
        : [{ functionDeclarations: READ_ONLY_TOOL_DECLARATIONS }];

      const historyContents = req.history.slice(-6).map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }));

      const turn1 = await this.ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [...historyContents, { role: 'user', parts: [{ text: wrappedUserTurn }] }],
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools,
          ...(req.useSearchGrounding
            ? { toolConfig: { includeServerSideToolInvocations: true } }
            : {}),
        },
      });

      let finalResponse = turn1;
      const fnCalls = turn1.functionCalls ?? [];

      if (fnCalls.length > 0 && turn1.candidates?.[0]?.content) {
        const fnResponses = await Promise.all(
          fnCalls.map(async (call) => {
            const name = call.name ?? 'retrieve_guidance';
            toolCallsExecuted.push(name);
            const result = await this.executeReadOnlyTool(
              name,
              (call.args ?? {}) as Record<string, unknown>,
              profile,
              aqiSnapshot
            );
            return {
              functionResponse: {
                id: call.id,
                name,
                response: { result },
              },
            };
          })
        );

        finalResponse = await this.ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: [
            ...historyContents,
            { role: 'user', parts: [{ text: wrappedUserTurn }] },
            turn1.candidates[0].content,
            { role: 'user', parts: fnResponses },
          ],
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            tools,
            ...(req.useSearchGrounding
              ? { toolConfig: { includeServerSideToolInvocations: true } }
              : {}),
          },
        });
      }

      const usage = this.recordUsage(finalResponse);

      // Extract Google Search Grounding web URLs if present
      const groundingChunks =
        finalResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      for (const chunk of groundingChunks) {
        const web = (chunk as { web?: { uri?: string; title?: string } }).web;
        if (web?.uri) {
          citations.push({
            title: web.title || web.uri,
            uri: web.uri,
            sourceType: 'web',
          });
        }
      }

      const text = (finalResponse.text ?? '').trim();
      if (!text) {
        return this.buildOfflineGroundedReply(profile, aqiSnapshot, kbMatches, rankedAlts, citations);
      }

      return {
        reply: text,
        modelUsed: req.useSearchGrounding
          ? 'gemini-4-hydrogen (Search Grounding + Tools)'
          : 'gemini-4-hydrogen (Tools)',
        promptVersion: PROMPT_VERSION,
        toolCallsExecuted,
        citations,
        safetyEscalation: false,
        injectionBlocked: false,
        usage,
      };
    } catch {
      return this.buildOfflineGroundedReply(profile, aqiSnapshot, kbMatches, rankedAlts, citations);
    }
  }

  /**
   * Text-to-Speech using `gemini-3.8-flash-tts` (unary WAV 24kHz mono 16-bit).
   */
  async synthesizeSpeech(text: string, language: 'en' | 'hi' | 'ta'): Promise<{ audioBase64: string; mimeType: string }> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY is not configured for speech synthesis.');
    }
    const cleanText = text.replace(/[#*_`]/g, '').slice(0, 600);
    const style =
      language === 'hi'
        ? 'Warm, clear Hindi narrator speaking at a calm pace'
        : language === 'ta'
          ? 'Warm, clear Tamil narrator speaking at a calm pace'
          : 'Warm, calm, accessible health-coach narrator';

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: { style },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio returned from Gemini TTS.');
    }
    return { audioBase64: base64Audio, mimeType: 'audio/wav' };
  }

  private async executeReadOnlyTool(
    name: string,
    args: Record<string, unknown>,
    profile: UserProfile,
    aqiSnapshot: AqiSnapshot
  ): Promise<unknown> {
    switch (name) {
      case 'get_aqi':
        return {
          city: aqiSnapshot.city,
          aqi: aqiSnapshot.aqi,
          band: aqiSnapshot.band,
          pm25: aqiSnapshot.pm25,
          pm10: aqiSnapshot.pm10,
          windKmh: aqiSnapshot.windKmh,
          boundaryLayerM: aqiSnapshot.boundaryLayerM,
          inversionActive: aqiSnapshot.inversionActive,
        };
      case 'get_forecast':
        return {
          city: aqiSnapshot.city,
          bestWindow: aqiSnapshot.bestWindow,
          worstWindow: aqiSnapshot.worstWindow,
          next12h: aqiSnapshot.forecast48h.slice(0, 12).map((h) => ({
            hour: h.hourLabel,
            aqi: h.aqi,
            pm25: h.pm25,
            blhM: h.boundaryLayerM,
          })),
        };
      case 'calc_impact': {
        const action = String(args.action ?? 'public_transit');
        const householdsN = Number(args.householdsN ?? 500);
        return calculateChoiceImpact({
          choiceId: action,
          title: action.replace(/_/g, ' '),
          baselinePm25: aqiSnapshot.pm25,
          exposureReductionFraction: action.includes('filter') ? 0.6 : action.includes('vent') ? 0.38 : 0.25,
          weeklyCo2eAvoidedKg: action.includes('transit') ? 2.4 : 1.3,
          weeklyPm25AvoidedGrams: action.includes('cooking') ? 4.2 : 1.8,
          communityHouseholdsN: Number.isFinite(householdsN) ? householdsN : 500,
          confidence: 'High',
          formulas: ['Impact Engine deterministic estimate'],
          assumptions: ['Baseline PM2.5 from live city reading'],
          citation: 'CPCB / IPCC AR6 / WHO 2021',
        });
      }
      case 'find_alternatives':
        return rankAlternatives(profile, aqiSnapshot.aqi, aqiSnapshot.pm25)
          .slice(0, 3)
          .map((a) => ({
            title: a.title,
            costTag: a.costTag,
            exposureDropPct: a.impact.personalExposureDeltaPct,
            co2eKgWk: a.impact.householdCo2eKgPerWeek,
          }));
      case 'retrieve_guidance':
      default:
        return retrieveGuidance(String(args.topic ?? 'smog'), 2);
    }
  }

  private buildOfflineGroundedReply(
    profile: UserProfile,
    aqiSnapshot: AqiSnapshot,
    kbMatches: KnowledgeEntry[],
    rankedAlts: ReturnType<typeof rankAlternatives>,
    citations: Citation[]
  ): OrchestratorResponse {
    const cls = classifyAqi(aqiSnapshot.aqi);
    const freeAlt = rankedAlts.find((a) => a.costTag === '₹0') ?? rankedAlts[0];
    const n95Note = cls.n95Recommended
      ? ' Because AQI is above 300, wear a well-fitted N95/FFP2 respirator outdoors and avoid outdoor workouts.'
      : '';

    const reply = [
      `Current Air in ${aqiSnapshot.city}: AQI ${aqiSnapshot.aqi} (${aqiSnapshot.band}) with PM2.5 at ${aqiSnapshot.pm25} µg/m³. Best outdoor window: ${aqiSnapshot.bestWindow}.${n95Note}`,
      '',
      `What to do now (₹0 option): ${freeAlt.title} — ${freeAlt.summary}`,
      `What it changes (Estimate): Cuts personal PM2.5 exposure by ~${freeAlt.impact.personalExposureDeltaPct}%, avoids ${freeAlt.impact.householdCo2eKgPerWeek} kg CO2e/week and ${freeAlt.impact.householdPm25GramsPerWeek} g PM2.5/week. If ${freeAlt.impact.communityHouseholdsN} households adopt this, it avoids about ${freeAlt.impact.communityCo2eTonnesPerMonth} t CO2e/month.`,
      '',
      `Verified Guidance: ${kbMatches[0]?.summary ?? cls.shortAdvice}`,
      '',
      'Note: Numbers are modeled estimates. Never use ozone-generating purifiers or burn waste/leaves. For severe breathing symptoms, seek urgent medical care.',
    ].join('\n');

    return {
      reply,
      modelUsed: 'grounded-tool-fallback',
      promptVersion: PROMPT_VERSION,
      toolCallsExecuted: ['get_aqi', 'find_alternatives', 'retrieve_guidance'],
      citations,
      safetyEscalation: false,
      injectionBlocked: false,
      usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
    };
  }
}
