/*
  # Grant anon role explicit SELECT/INSERT/UPDATE on crm_roster

  The RLS policies added in 20260424183139 allow anon SELECT on crm_roster,
  but the underlying Postgres table privilege (GRANT) was never explicitly
  added. In some Supabase project configurations, RLS policies alone are not
  sufficient without the backing GRANT—causing anonymous reads to silently
  return empty result sets.

  When the portal's AddAgentModal reads crm_roster to find an open seat and
  gets an empty result (even though 200 padded seats exist), it falls through
  to the INSERT branch and creates a brand-new seat row with seat_number 1
  every time—duplicating seat rows in the Command Center roster view.

  This migration adds the explicit GRANTs to ensure anon users can
  read, insert, and update crm_roster rows as the existing RLS policies intend.
*/

GRANT SELECT, INSERT, UPDATE ON crm_roster TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm_roster TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON crm_roster_uploads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm_roster_uploads TO authenticated;
