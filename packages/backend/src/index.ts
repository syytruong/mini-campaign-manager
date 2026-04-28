import './models';

import { createApp } from './app';
import { config } from './config';
import { pingDatabase, sequelize } from './db';

async function main(): Promise<void> {
  try {
    await pingDatabase();
    console.log('[db] connected');
  } catch (err) {
    console.error('[db] failed to connect:', err);
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`[api] listening on http://localhost:${config.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[api] received ${signal}, shutting down`);
    server.close(async () => {
      await sequelize.close();
      console.log('[api] closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
