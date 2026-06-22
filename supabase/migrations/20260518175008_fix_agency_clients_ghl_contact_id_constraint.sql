/*
  # Fix agency_clients GHL contact ID constraint for upserts

  1. Changes
    - Drop the partial unique index (WHERE ghl_contact_id IS NOT NULL)
    - Add a standard unique constraint on (agency_id, ghl_contact_id)
    - This allows Supabase upsert to correctly use ON CONFLICT

  2. Important Notes
    - The partial index didn't work with standard PostgreSQL ON CONFLICT
    - The new constraint allows NULLs (unique only enforced on non-null pairs in postgres)
*/

DROP INDEX IF EXISTS agency_clients_ghl_contact_id_unique;

ALTER TABLE agency_clients
  DROP CONSTRAINT IF EXISTS agency_clients_agency_id_ghl_contact_id_key;

ALTER TABLE agency_clients
  ADD CONSTRAINT agency_clients_agency_id_ghl_contact_id_key
  UNIQUE (agency_id, ghl_contact_id);
