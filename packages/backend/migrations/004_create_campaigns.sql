-- Migration: 004_create_campaigns
-- Email campaigns owned by a user. Status drives the state machine
-- (draft -> scheduled -> sending -> sent).

CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent');

CREATE TABLE campaigns (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200)    NOT NULL,
  subject       VARCHAR(255)    NOT NULL,
  body          TEXT            NOT NULL,
  status        campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at  TIMESTAMPTZ,
  created_by    UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Most list queries are "campaigns I own", optionally filtered by status.
-- Composite index covers both the (created_by) and (created_by, status) cases.
CREATE INDEX campaigns_created_by_status_idx ON campaigns (created_by, status);

-- Standalone status index for cross-user admin/reporting queries (and future cron
-- jobs that find scheduled campaigns due to send).
CREATE INDEX campaigns_status_idx ON campaigns (status);

-- Auto-bump updated_at on UPDATE.
CREATE TRIGGER campaigns_set_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
