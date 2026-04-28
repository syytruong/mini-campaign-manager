import path from 'node:path';
import dotenv from 'dotenv';

// Load root .env BEFORE anything else imports config.ts
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

process.env.NODE_ENV = 'test';

// If TEST_DATABASE_URL is provided, use it. Otherwise fall back to the dev DB
// — the developer is responsible for not running tests against production data.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// JWT_SECRET must be present — fall back to a deterministic test value.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
}
