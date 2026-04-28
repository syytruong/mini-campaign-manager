import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import { config } from './config';
import { pingDatabase } from './db';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
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

  app.use('/auth', authRouter);

  // 404 for unknown routes — must come BEFORE the error handler.
  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  app.use(errorHandler);

  return app;
}
