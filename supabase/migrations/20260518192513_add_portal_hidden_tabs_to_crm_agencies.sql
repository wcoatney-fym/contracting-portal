/*
  # Add portal_hidden_tabs column to crm_agencies

  1. Modified Tables
    - `crm_agencies`
      - `portal_hidden_tabs` (text[], default empty array) - stores tab keys that should display as "Coming Soon" on the agency portal

  2. Notes
    - Allows CRM team to toggle portal tab visibility per agency
    - Tab keys are: dashboard, agents, book, tickets, csr
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'portal_hidden_tabs'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN portal_hidden_tabs text[] DEFAULT '{}' NOT NULL;
  END IF;
END $$;