import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { ResilientAirQualityService } from './server/adapters/airQualityAdapter';
import { getServerConfig } from './server/config';
import { attachLiveVoiceBridge } from './server/liveBridge';
import { GeminiOrchestrator } from './server/llm/orchestrator';
import { createApiRouter } from './server/routes';
import { buildHelmetMiddleware, corsMiddleware, errorHandler } from './server/security';

export async function createServer() {
  const cfg = getServerConfig();
  const app = express();

  app.disable('x-powered-by');
  app.use(buildHelmetMiddleware());
  app.use(corsMiddleware);
  app.use(express.json({ limit: '128kb' }));

  const aqService = new ResilientAirQualityService();
  const orchestrator = new GeminiOrchestrator(aqService);

  app.use('/api', createApiRouter(aqService, orchestrator));
  app.use(errorHandler);

  if (cfg.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { maxAge: '7d' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  attachLiveVoiceBridge(httpServer, orchestrator);

  return { app, httpServer, port: cfg.PORT };
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isMain) {
  createServer()
    .then(({ httpServer, port }) => {
      httpServer.listen(port, '0.0.0.0', () => {
        console.log(`AirNest server running on http://0.0.0.0:${port}`);
      });
    })
    .catch((err: unknown) => {
      console.error('Failed to start AirNest server:', err);
      process.exit(1);
    });
}
