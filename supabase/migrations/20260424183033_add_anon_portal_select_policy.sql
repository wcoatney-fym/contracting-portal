/*
  # Add public portal read access for crm_agencies

  1. Security Changes
    - Add a SELECT policy for the `anon` role on `crm_agencies`
    - Only allows reading rows where `is_active = true`
    - This is required because the agency portal pages are accessed by
      unauthenticated visitors who need to look up agencies by slug
      and verify portal passwords

  2. Important Notes
    - The existing authenticated policies remain unchanged
    - The anon policy is read-only (SELECT only) -- no insert/update/delete
    - Only active agencies are visible to anonymous users
*/

CREATE POLICY "Anon users can read active agencies for portal access"
  ON crm_agencies
  FOR SELECT
  TO anon
  USING (is_active = true);
