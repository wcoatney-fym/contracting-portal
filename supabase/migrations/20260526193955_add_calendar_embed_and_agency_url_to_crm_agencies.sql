/*
  # Add Calendar Embed Code and Agency URL Prefix to CRM Agencies

  1. Modified Tables
    - `crm_agencies`
      - `calendar_embed_code` (text, nullable) - HTML iframe embed code for calendar scheduling, applied identically across all roster rows
      - `agency_url_prefix` (text, nullable) - The agency-specific prefix for my-agent-appt.com URLs (e.g., "smithinsurance")

  2. Notes
    - No backfill for existing agencies; columns default to NULL
    - Only new agencies going through onboarding will have these set
    - These values are used during roster padding to populate per-seat URLs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'calendar_embed_code'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN calendar_embed_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'agency_url_prefix'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN agency_url_prefix text;
  END IF;
END $$;