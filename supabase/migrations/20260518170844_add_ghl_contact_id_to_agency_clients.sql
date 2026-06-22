/*
  # Add GHL Contact ID to agency_clients

  1. Modified Tables
    - `agency_clients`
      - Added `ghl_contact_id` (text, nullable, unique per agency)
      - Added unique constraint on (agency_id, ghl_contact_id) for upserts during GHL sync

  2. Important Notes
    - This column allows the sync-ghl-data function to upsert contacts from GHL
    - The unique constraint enables ON CONFLICT upserts keyed by GHL contact ID per agency
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_clients' AND column_name = 'ghl_contact_id'
  ) THEN
    ALTER TABLE agency_clients ADD COLUMN ghl_contact_id text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS agency_clients_ghl_contact_id_unique
  ON agency_clients (agency_id, ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;
