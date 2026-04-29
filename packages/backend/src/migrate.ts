/* eslint-disable no-console */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { QueryTypes } from 'sequelize';
import { config } from './config';
import { sequelize } from './db';

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

interface AppliedRow {
  filename: string;
  checksum: string | null;
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function ensureMigrationsTable(): Promise<void> {
  // The checksum column is added by migration 006 itself, so we tolerate
  // its absence on the very first run by creating the table without it.
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function checksumColumnExists(): Promise<boolean> {
  const rows = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'schema_migrations' AND column_name = 'checksum'
     ) AS "exists"`,
    { type: QueryTypes.SELECT },
  );
  return rows[0]?.exists === true;
}

async function loadAppliedMap(): Promise<Map<string, string | null>> {
  // Two-step: check column existence first, then issue the appropriate SELECT.
  // Embedding the existence check inside a CASE WHEN doesn't work — Postgres
  // parses the entire CASE expression at prepare time, so a reference to
  // `checksum` in the THEN branch fails when the column doesn't exist yet.
  const hasChecksum = await checksumColumnExists();

  if (hasChecksum) {
    const rows = await sequelize.query<AppliedRow>(
      `SELECT filename, checksum FROM schema_migrations`,
      { type: QueryTypes.SELECT },
    );
    return new Map(rows.map((r) => [r.filename, r.checksum]));
  }

  // Pre-006 era: the column doesn't exist yet. Treat every row as
  // "applied with unknown checksum" so the runner backfills after 006 lands.
  const rows = await sequelize.query<{ filename: string }>(
    `SELECT filename FROM schema_migrations`,
    { type: QueryTypes.SELECT },
  );
  return new Map(rows.map((r) => [r.filename, null]));
}

async function listMigrationFiles(): Promise<string[]> {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

async function readMigration(filename: string): Promise<{ sql: string; checksum: string }> {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sql = await fs.readFile(fullPath, 'utf8');
  return { sql, checksum: sha256(sql) };
}

async function applyMigration(filename: string, sql: string, checksum: string): Promise<void> {
  await sequelize.transaction(async (tx) => {
    await sequelize.query(sql, { transaction: tx });
    // After 006 runs, the checksum column exists; before that, the column is
    // missing and we have to insert without it. We try the new shape first
    // and fall back. (After this initial roll-out, we'll always be on path A.)
    try {
      await sequelize.query(
        `INSERT INTO schema_migrations (filename, checksum) VALUES (:filename, :checksum)`,
        { replacements: { filename, checksum }, transaction: tx },
      );
    } catch {
      await sequelize.query(`INSERT INTO schema_migrations (filename) VALUES (:filename)`, {
        replacements: { filename },
        transaction: tx,
      });
    }
  });
}

async function backfillChecksum(filename: string, checksum: string): Promise<void> {
  await sequelize.query(
    `UPDATE schema_migrations SET checksum = :checksum WHERE filename = :filename`,
    { replacements: { filename, checksum } },
  );
}

interface ChecksumMismatch {
  filename: string;
  expected: string;
  actual: string;
}

async function main(): Promise<void> {
  console.log(`[migrate] connecting to ${config.databaseUrl.split('@')[1] ?? '(unknown)'}`);
  await sequelize.authenticate();

  await ensureMigrationsTable();
  const applied = await loadAppliedMap();
  const all = await listMigrationFiles();

  let pending = 0;
  let backfilled = 0;
  const mismatches: ChecksumMismatch[] = [];

  for (const filename of all) {
    const { sql, checksum } = await readMigration(filename);
    const appliedChecksum = applied.get(filename);

    if (appliedChecksum === undefined) {
      // New migration (not in schema_migrations yet) — apply it.
      process.stdout.write(`  + ${filename} ... `);
      try {
        await applyMigration(filename, sql, checksum);
        console.log('ok');
        pending += 1;
      } catch (err) {
        console.log('FAILED');
        console.error(err);
        await sequelize.close();
        process.exit(1);
      }
    } else if (appliedChecksum === null) {
      // Already applied, but pre-checksum era — backfill silently.
      // Note: if migration 006 hasn't run yet the column doesn't exist,
      // so backfill will no-op until the next run after 006.
      try {
        await backfillChecksum(filename, checksum);
        backfilled += 1;
      } catch {
        // Column not yet present; will backfill after 006 runs.
      }
    } else if (appliedChecksum !== checksum) {
      // TAMPERING — file content has changed since we applied it.
      mismatches.push({ filename, expected: appliedChecksum, actual: checksum });
    }
  }

  if (mismatches.length > 0) {
    console.error('\n[migrate] CHECKSUM MISMATCH — applied migrations have been edited:');
    for (const m of mismatches) {
      console.error(`  - ${m.filename}`);
      console.error(`      expected ${m.expected}`);
      console.error(`      actual   ${m.actual}`);
    }
    console.error(
      '\nApplied migrations must be immutable. To change a schema, write a new migration.',
    );
    await sequelize.close();
    process.exit(1);
  }

  if (pending === 0 && backfilled === 0) {
    console.log('[migrate] no pending migrations');
  } else {
    if (pending > 0) console.log(`[migrate] applied ${pending} migration(s)`);
    if (backfilled > 0) console.log(`[migrate] backfilled checksum for ${backfilled} row(s)`);
  }

  await sequelize.close();
}

void main();