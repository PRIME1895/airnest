/**
 * WebSocket bridge for Gemini Live API (`gemini-3.8-live`).
 * Streams 16kHz PCM microphone audio from browser -> Gemini Live,
 * and relays 24kHz PCM model audio + transcripts back to the browser.
 */

import type { Server as HttpServer } from 'node:http';
import { Modality, type LiveServerMessage } from '@google/genai';
import { WebSocketServer, type WebSocket } from 'ws';
import { buildAssistantSystemPrompt } from '../prompts/systemPrompts';
import type { GeminiOrchestrator } from './llm/orchestrator';

interface LiveClientPayload {
  type?: 'init' | 'audio' | 'text';
  audio?: string;
  text?: string;
  language?: 'en' | 'hi' | 'ta';
  city?: string;
  aqi?: number;
  eli10Mode?: boolean;
  elderMode?: boolean;
}

export function attachLiveVoiceBridge(httpServer: HttpServer, orchestrator: GeminiOrchestrator): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/api/live' });

  wss.on('connection', (clientWs: WebSocket) => {
    const ai = orchestrator.getClient();
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: 'Live Voice requires GEMINI_API_KEY configured on the server.',
        })
      );
      clientWs.close();
      return;
    }

    let sessionPromise: ReturnType<typeof ai.live.connect> | null = null;
    let activeSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;

    const startSession = (init: LiveClientPayload) => {
      const lang = init.language ?? 'en';
      const systemInstruction =
        buildAssistantSystemPrompt({
          language: lang,
          eli10Mode: Boolean(init.eli10Mode),
          elderMode: Boolean(init.elderMode),
        }) +
        `\nUser city: ${init.city ?? 'Coimbatore'}, Current AQI: ${init.aqi ?? 85}. Keep spoken replies brief (2-4 sentences) and include a zero-cost action.`;

      sessionPromise = ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ready' }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== clientWs.OPEN) return;
            const sc = message.serverContent;
            if (sc?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
            if (sc?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({ type: 'inputTranscript', text: sc.inputTranscription.text })
              );
            }
            if (sc?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({ type: 'outputTranscript', text: sc.outputTranscription.text })
              );
            }
            for (const part of sc?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ type: 'audio', audio: part.inlineData.data }));
              }
            }
          },
          onerror: (err: unknown) => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: err instanceof Error ? err.message : 'Live session error',
                })
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
          },
        },
      });

      sessionPromise
        .then((session) => {
          activeSession = session;
        })
        .catch((err: unknown) => {
          if (clientWs.readyState === clientWs.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message: err instanceof Error ? err.message : 'Failed to connect to Gemini Live',
              })
            );
          }
        });
    };

    clientWs.on('message', (raw) => {
      try {
        const payload = JSON.parse(raw.toString()) as LiveClientPayload;
        if (payload.type === 'init' && !sessionPromise) {
          startSession(payload);
          return;
        }
        if (!sessionPromise) {
          startSession({});
        }
        if (payload.audio && sessionPromise) {
          sessionPromise
            .then((s) =>
              s.sendRealtimeInput({
                audio: { data: payload.audio as string, mimeType: 'audio/pcm;rate=16000' },
              })
            )
            .catch(() => undefined);
        } else if (payload.text && sessionPromise) {
          sessionPromise
            .then((s) => s.sendRealtimeInput({ text: payload.text as string }))
            .catch(() => undefined);
        }
      } catch {
        // Ignore malformed client frames safely
      }
    });

    clientWs.on('close', () => {
      try {
        activeSession?.close();
      } catch {
        // Ignore close cleanup errors
      }
    });
  });
}
