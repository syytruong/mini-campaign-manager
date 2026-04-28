-- Migration: 001_extensions_and_helpers
-- Enables required extensions and creates a shared trigger function for updated_at.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic trigger function that bumps updated_at on UPDATE.
-- Reused by every table that has updated_at.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
