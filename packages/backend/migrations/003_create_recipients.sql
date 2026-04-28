-- Migration: 003_create_recipients
-- A pool of email contacts. Recipients are global (not per-user) so the same
-- email can be reused across campaigns without duplication.

CREATE TABLE recipients (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(254) NOT NULL,
  name       VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX recipients_email_unique ON recipients (email);
