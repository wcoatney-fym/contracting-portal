/*
  # Add is_alumni flag to crm_agencies

  1. Modified Tables
    - `crm_agencies`
      - `is_alumni` (boolean, not null, default false) - marks legacy agencies that don't send calendar/URL fields in webhooks

  2. Data Updates
    - Sets is_alumni = true for: FYM, Aspire, Wisechoice, MHA (IFG), MHA (YFMO)
    - All other current and future agencies default to false (non-alumni)

  3. Notes
    - Alumni agencies skip sending Calendar Embed Code, Digital Business Card URL, and Confirmation URL in the onboarding webhook
    - Non-alumni agencies derive these values from their stored calendar_embed_code and agency_url_prefix fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'is_alumni'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN is_alumni boolean NOT NULL DEFAULT false;
  END IF;
END $$;

UPDATE crm_agencies
SET is_alumni = true
WHERE name IN ('FYM', 'Aspire', 'Wisechoice', 'MHA (IFG)', 'MHA (YFMO)');
