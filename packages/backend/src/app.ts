import express, { type Express, type Request, type Response } from 'express';
import { pingDatabase } from './db';

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get('/health', async (_req: Request, res: Response) => {
    try {
      await pingDatabase();
      res.json({
        status: 'ok',
        service: 'backend',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'degraded',
        service: 'backend',
        database: 'disconnected',
        error: err instanceof Error ? err.message : 'unknown',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return app;
}
