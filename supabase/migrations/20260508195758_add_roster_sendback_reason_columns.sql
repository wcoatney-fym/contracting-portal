/*
  # Add send-back reason columns for roster uploads

  1. Modified Tables
    - `crm_agencies`
      - `roster_sent_back_reason` (text, nullable) - Stores the reason when CRM sends back the agent roster
      - `dba_sent_back_reason` (text, nullable) - Stores the reason when CRM sends back the DBA roster

  2. Notes
    - These fields are set when CRM team sends back a roster upload
    - They are cleared when the agency re-uploads a new file
    - Used to display the reason to the agency on the portal
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'roster_sent_back_reason'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN roster_sent_back_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'dba_sent_back_reason'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN dba_sent_back_reason text;
  END IF;
END $$;