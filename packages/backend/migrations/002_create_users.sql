-- Migration: 002_create_users
-- The User table — owns campaigns and authenticates via email + password hash.

CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(254) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique email; case-insensitive comparison done at app layer (lowercase on insert).
CREATE UNIQUE INDEX users_email_unique ON users (email);
