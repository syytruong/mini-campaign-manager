-- Migration: 005_create_campaign_recipients
-- Join table tracking per-recipient delivery state for a campaign.
-- Composite primary key prevents the same recipient being added to
-- the same campaign twice.

CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE campaign_recipients (
  campaign_id  UUID            NOT NULL REFERENCES campaigns(id)  ON DELETE CASCADE,
  recipient_id UUID            NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  status       delivery_status NOT NULL DEFAULT 'pending',
  sent_at      TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  PRIMARY KEY (campaign_id, recipient_id)
);

-- Stats aggregations group by status per campaign.
CREATE INDEX campaign_recipients_campaign_status_idx
  ON campaign_recipients (campaign_id, status);

-- Reverse lookup: "what campaigns has this recipient received".
CREATE INDEX campaign_recipients_recipient_idx
  ON campaign_recipients (recipient_id);
