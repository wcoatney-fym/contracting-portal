/*
  # Add contact detail fields to agency_clients

  1. Modified Tables
    - `agency_clients`
      - `first_name` (text) - Contact first name from GHL
      - `last_name` (text) - Contact last name from GHL
      - `phone` (text) - Contact phone number
      - `email` (text) - Contact email address
      - `submit_date` (timestamptz) - Date contact was added in GHL (dateAdded)
      - `ghl_assigned_to` (text) - GHL user ID of the assigned follower/agent

  2. Notes
    - These fields are already available in the GHL API response but were not being stored
    - Existing rows will have NULL values until next sync populates them
    - client_name column is preserved for backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_clients' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE agency_clients ADD COLUMN first_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_clients' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE agency_clients ADD COLUMN last_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_clients' AND column_name = 'phone'
  ) THEN
    ALTER TABLE agency_clients ADD COLUMN phone text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_clients' AND column_name = 'email'
  ) THEN
    ALTER TABLE agency_clients ADD COLUMN email text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_clients' AND column_name = 'submit_date'
  ) THEN
    ALTER TABLE agency_clients ADD COLUMN submit_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_clients' AND column_name = 'ghl_assigned_to'
  ) THEN
    ALTER TABLE agency_clients ADD COLUMN ghl_assigned_to text NOT NULL DEFAULT '';
  END IF;
END $$;
