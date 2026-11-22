import express, { type Router } from 'express';
import { z } from 'zod';
import { DEMO_SCENARIOS } from '../packages/shared/demoScenarios';
import {
  calculateCadr,
  calculateChoiceImpact,
  rankAlternatives,
  simulateWhatIf,
} from '../packages/shared/impact/index';
import {
  AqiSnapshotSchema,
  ChatRequestSchema,
  UserProfileSchema,
  WhatIfSlidersSchema,
} from '../packages/shared/schemas';
import { ResilientAirQualityService } from './adapters/airQualityAdapter';
import { getServerConfig } from './config';
import { GeminiOrchestrator } from './llm/orchestrator';
import { AppError, createRateLimiter } from './security';

const AqiQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).default(11.02),
  lng: z.coerce.number().min(-180).max(180).default(76.96),
  city: z.string().min(1).max(80).default('Coimbatore'),
  region: z.string().min(1).max(80).default('Tamil Nadu, India'),
  demoScenario: z.enum(['coimbatore', 'delhi']).optional(),
});

const PlanBodySchema = z.object({
  profile: UserProfileSchema,
  aqiData: AqiSnapshotSchema.optional(),
  mode: z.enum(['daily', 'weekly']).default('daily'),
});

const SimulateBodySchema = z.object({
  profile: UserProfileSchema,
  sliders: WhatIfSlidersSchema,
  baselineAqi: z.number().min(0).max(600),
  baselinePm25: z.number().min(0).max(1000),
});

const AlternativesBodySchema = z.object({
  profile: UserProfileSchema,
  aqi: z.number().min(0).max(600),
  pm25: z.number().min(0).max(1000),
  communityN: z.number().int().min(10).max(10000).default(500),
});

const CadrBodySchema = z.object({
  roomAreaM2: z.number().min(6).max(300),
  ceilingHeightM: z.number().min(2.2).max(5).default(3.0),
  targetAch: z.number().min(2).max(8).default(5.0),
});

const TtsBodySchema = z.object({
  text: z.string().min(1).max(700),
  language: z.enum(['en', 'hi', 'ta']).default('en'),
});

const QuickTipBodySchema = z.object({
  profile: UserProfileSchema,
  aqiData: AqiSnapshotSchema,
});

export function createApiRouter(
  aqService = new ResilientAirQualityService(),
  orchestrator = new GeminiOrchestrator(aqService),
  rateLimitMax = 90
): Router {
  const router = express.Router();
  router.use(createRateLimiter(rateLimitMax, 60_000));

  router.get('/health', (_req, res) => {
    const cfg = getServerConfig();
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(cfg.GEMINI_API_KEY),
      hasMapsKey: Boolean(cfg.mapsApiKey),
      cache: aqService.getCacheStats(),
      llm: orchestrator.getTelemetryStats(),
    });
  });

  router.get('/aqi', async (req, res, next) => {
    try {
      const query = AqiQuerySchema.parse(req.query);
      const snapshot = await aqService.getAirQuality(query);
      res.json(snapshot);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Invalid AQI query'));
        return;
      }
      next(err);
    }
  });

  router.post('/plan', async (req, res, next) => {
    try {
      const body = PlanBodySchema.parse(req.body);
      const aqiData =
        body.aqiData ??
        (await aqService.getAirQuality({
          lat: body.profile.approxLat,
          lng: body.profile.approxLng,
          city: body.profile.city,
          region: body.profile.region,
          demoScenario:
            body.profile.scenarioKey === 'custom' ? undefined : body.profile.scenarioKey,
        }));
      const plan = await orchestrator.generatePlan(body.profile, aqiData, body.mode);
      res.json(plan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Invalid plan request'));
        return;
      }
      next(err);
    }
  });

  router.post('/quick-tip', async (req, res, next) => {
    try {
      const body = QuickTipBodySchema.parse(req.body);
      const result = await orchestrator.generateLowLatencyTip(body.profile, body.aqiData);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Invalid tip request'));
        return;
      }
      next(err);
    }
  });

  router.post('/alternatives', (req, res, next) => {
    try {
      const body = AlternativesBodySchema.parse(req.body);
      const ranked = rankAlternatives(body.profile, body.aqi, body.pm25, body.communityN);
      res.json({ alternatives: ranked });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Invalid input'));
        return;
      }
      next(err);
    }
  });

  router.post('/simulate', (req, res, next) => {
    try {
      const body = SimulateBodySchema.parse(req.body);
      const result = simulateWhatIf(body.profile, body.sliders, body.baselineAqi, body.baselinePm25);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Invalid sliders'));
        return;
      }
      next(err);
    }
  });

  router.post('/cadr', (req, res, next) => {
    try {
      const body = CadrBodySchema.parse(req.body);
      res.json(calculateCadr(body.roomAreaM2, body.ceilingHeightM, body.targetAch));
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Invalid room dimensions'));
        return;
      }
      next(err);
    }
  });

  router.post('/impact', (req, res, next) => {
    try {
      const schema = z.object({
        choiceId: z.string().min(1),
        title: z.string().min(1),
        baselinePm25: z.number().min(0).max(1000),
        exposureReductionFraction: z.number().min(0).max(0.85),
        weeklyCo2eAvoidedKg: z.number().min(0),
        weeklyPm25AvoidedGrams: z.number().min(0),
        communityHouseholdsN: z.number().int().min(10).max(10000).default(500),
      });
      const parsed = schema.parse(req.body);
      res.json(
        calculateChoiceImpact({
          ...parsed,
          confidence: 'High',
          formulas: ['Modeled deterministic estimate from user baseline PM2.5'],
          assumptions: ['Assumes consistent weekly adoption'],
          citation: 'CPCB NAQI / WHO 2021 / IPCC AR6',
        })
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Invalid impact input'));
        return;
      }
      next(err);
    }
  });

  router.post('/chat', async (req, res, next) => {
    try {
      const parsed = ChatRequestSchema.parse(req.body);
      const wantsStream = req.headers.accept?.includes('text/event-stream');
      const result = await orchestrator.handleChat(parsed);

      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const words = result.reply.split(/(\s+)/);
        const chunkSize = 8;
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join('');
          res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ type: 'done', meta: result })}\n\n`);
        res.end();
        return;
      }

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Invalid chat payload'));
        return;
      }
      next(err);
    }
  });

  router.post('/tts', async (req, res, next) => {
    try {
      const body = TtsBodySchema.parse(req.body);
      const audio = await orchestrator.synthesizeSpeech(body.text, body.language);
      res.json(audio);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Invalid TTS input'));
        return;
      }
      next(new AppError(503, 'TTS_UNAVAILABLE', err instanceof Error ? err.message : 'TTS failed'));
    }
  });

  router.get('/community', (req, res) => {
    const scenario = req.query.scenario === 'delhi' ? 'delhi' : 'coimbatore';
    res.json(DEMO_SCENARIOS[scenario].community);
  });

  return router;
}
