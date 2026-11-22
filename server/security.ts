import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { getServerConfig } from './config';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function buildHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://maps.googleapis.com',
          'https://apis.google.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://maps.gstatic.com',
          'https://maps.googleapis.com',
          'https://*.googleusercontent.com',
        ],
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          'https://maps.googleapis.com',
          'https://airquality.googleapis.com',
          'https://air-quality-api.open-meteo.com',
          'https://api.open-meteo.com',
          'https://*.googleapis.com',
          'https://*.firebaseio.com',
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
        ],
        frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com'],
        frameAncestors: [
          "'self'",
          'https://aistudio.google.com',
          'https://*.google.com',
          'https://*.googleusercontent.com',
          'https://*.run.app',
        ],
        workerSrc: ["'self'", 'blob:'],
      },
    },
    frameguard: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  });
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const { corsOrigins } = getServerConfig();
  if (
    origin &&
    (corsOrigins.includes(origin) ||
      origin.endsWith('.run.app') ||
      origin.startsWith('http://localhost:'))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Session-Id');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(maxRequests = 80, windowMs = 60_000) {
  const buckets = new Map<string, RateBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const sessionId = String(req.headers['x-session-id'] || 'anon').slice(0, 64);
    const key = `${ip}:${sessionId}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= maxRequests) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment before trying again.',
        },
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}

/** Strips health conditions and fine-grained coordinates before writing any server logs. */
export function redactForLogs(meta: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/health|condition|asthma|heart|pregnan|email|token|key|secret/i.test(key)) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message },
  });
}
