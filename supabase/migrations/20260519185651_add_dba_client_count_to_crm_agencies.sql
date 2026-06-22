/*
  # Add DBA client count to agencies

  1. Modified Tables
    - `crm_agencies`
      - `dba_client_count` (integer, default 0) - Number of pre-existing clients
        in the agency's book of business at onboarding time (historical baseline).
        Subtracted from total contacts when computing avg/week and avg/month
        growth metrics so that historical data doesn't inflate activity numbers.

  2. Notes
    - Only editable by CRM team admins
    - Used in avg/week and avg/month calculations:
      avg/week = (total_contacts - dba_client_count) / weeks_since_date_created
      avg/month = (total_contacts - dba_client_count) / months_since_date_created
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'dba_client_count'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN dba_client_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;
