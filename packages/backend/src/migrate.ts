/* eslint-disable no-console */
import fs from 'node:fs/promises';
import path from 'node:path';
import { QueryTypes } from 'sequelize';
import { config } from './config';
import { sequelize } from './db';

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

async function ensureMigrationsTable(): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const rows = await sequelize.query<{ filename: string }>(
    `SELECT filename FROM schema_migrations`,
    { type: QueryTypes.SELECT },
  );
  return new Set(rows.map((r) => r.filename));
}

async function listMigrationFiles(): Promise<string[]> {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

async function runMigration(filename: string): Promise<void> {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sql = await fs.readFile(fullPath, 'utf8');

  await sequelize.transaction(async (tx) => {
    await sequelize.query(sql, { transaction: tx });
    await sequelize.query(`INSERT INTO schema_migrations (filename) VALUES (:filename)`, {
      replacements: { filename },
      transaction: tx,
    });
  });
}

async function main(): Promise<void> {
  console.log(`[migrate] connecting to ${config.databaseUrl.split('@')[1] ?? '(unknown)'}`);
  await sequelize.authenticate();

  await ensureMigrationsTable();
  const applied = await appliedMigrations();
  const all = await listMigrationFiles();
  const pending = all.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('[migrate] no pending migrations');
    await sequelize.close();
    return;
  }

  console.log(`[migrate] applying ${pending.length} migration(s):`);
  for (const filename of pending) {
    process.stdout.write(`  - ${filename} ... `);
    try {
      await runMigration(filename);
      console.log('ok');
    } catch (err) {
      console.log('FAILED');
      console.error(err);
      await sequelize.close();
      process.exit(1);
    }
  }

  console.log('[migrate] done');
  await sequelize.close();
}

void main();