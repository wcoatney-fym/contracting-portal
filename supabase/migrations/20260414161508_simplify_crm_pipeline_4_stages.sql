/*
  # Simplify CRM Pipeline to 4 Stages

  1. Changes
    - Add `auto_advance_at` column (timestamptz, nullable) to `crm_pipeline`
      - Stores the exact time a processing record should auto-promote to sunfire_workflows
    - Add index on `auto_advance_at` for efficient timer queries

  2. Data Migration
    - Backfill existing records in zap_sent, user_created, or seat_filled stages
      to the new `processing` stage
    - Set auto_advance_at to 5 minutes after their created_at time
    - Fill in missing timestamp fields for consolidated records

  3. Important Notes
    - New pipeline stages: processing, sunfire_workflows, agency_workflows, completed
    - The `processing` stage replaces zap_sent, user_created, and seat_filled
    - Records auto-advance from processing to sunfire_workflows after 5 minutes
    - Existing timestamp columns (zap_sent_at, user_created_at, seat_filled_at) are kept for historical data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_pipeline' AND column_name = 'auto_advance_at'
  ) THEN
    ALTER TABLE crm_pipeline ADD COLUMN auto_advance_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_auto_advance ON crm_pipeline(auto_advance_at);

UPDATE crm_pipeline
SET
  stage = 'processing',
  auto_advance_at = created_at + interval '5 minutes',
  zap_sent_at = COALESCE(zap_sent_at, created_at),
  user_created_at = COALESCE(user_created_at, created_at),
  seat_filled_at = COALESCE(seat_filled_at, created_at),
  updated_at = now()
WHERE stage IN ('zap_sent', 'user_created', 'seat_filled');

ALTER TABLE crm_pipeline
  ALTER COLUMN stage SET DEFAULT 'processing';
