import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  GEMINI_API_KEY: z.string().optional().default(''),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  APP_URL: z.string().optional().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().optional().default(''),
});

export type ServerConfig = z.infer<typeof EnvSchema> & {
  mapsApiKey: string;
  corsOrigins: string[];
};

let cachedConfig: ServerConfig | null = null;

export function getServerConfig(): ServerConfig {
  if (cachedConfig) return cachedConfig;
  const parsed = EnvSchema.parse(process.env);
  const mapsApiKey = parsed.GOOGLE_MAPS_API_KEY || parsed.VITE_GOOGLE_MAPS_API_KEY || '';
  const extraOrigins = parsed.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  cachedConfig = {
    ...parsed,
    mapsApiKey,
    corsOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      parsed.APP_URL,
      ...extraOrigins,
    ].filter(Boolean),
  };
  return cachedConfig;
}
