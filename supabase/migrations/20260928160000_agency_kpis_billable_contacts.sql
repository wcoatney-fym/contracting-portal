-- Billable Contacts column (Charlie, #dev-fym-app 2026-09-28)
-- billable_contacts = exact GHL-side count of contacts whose "Client Status"
-- custom field equals "Active", written by sync-ghl-data at KPI compute time
-- via the GHL contacts/search server-side total (field ID resolved by name
-- per location). NULL = count unknown (location has no "Client Status"
-- field or the search call failed) — distinct from 0 (field exists, no
-- Active contacts).

ALTER TABLE public.agency_kpis
  ADD COLUMN IF NOT EXISTS billable_contacts integer;

COMMENT ON COLUMN public.agency_kpis.billable_contacts IS
  'Exact GHL count of contacts with custom field "Client Status" = Active (contacts/search total). NULL = unknown (missing field or API error), 0 = field exists but no Active contacts.';
