-- Migration: 006_add_migration_checksum
-- Stores a SHA-256 hash of each migration file's contents so the runner
-- can detect tampering with already-applied migrations.

ALTER TABLE schema_migrations
  ADD COLUMN IF NOT EXISTS checksum CHAR(64);