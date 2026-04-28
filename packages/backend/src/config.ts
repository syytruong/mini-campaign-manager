import path from 'node:path';
import dotenv from 'dotenv';

// Load .env from the monorepo root (two levels up from packages/backend/src)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (raw && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ['http://localhost:5173'];
}

export const config: AppConfig = {
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  port: Number(process.env.API_PORT) || 4000,
  databaseUrl: required('DATABASE_URL'),
  corsOrigins: parseCorsOrigins(),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
