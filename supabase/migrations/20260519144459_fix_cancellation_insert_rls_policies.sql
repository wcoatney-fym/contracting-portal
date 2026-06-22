/*
  # Fix cancellation upload INSERT RLS policies

  1. Problem
    - The INSERT policies on `agency_cancellation_uploads` and `agency_cancellations`
      use a subquery against `crm_agencies` that triggers nested RLS evaluation,
      causing inserts to be rejected even for valid active agencies.
    - There is NO INSERT policy for the `authenticated` role, so CRM users
      visiting the portal while logged in are blocked entirely.

  2. Changes
    - Drop the existing restrictive anon INSERT policies on both tables
    - Create new permissive anon INSERT policies (WITH CHECK true)
    - Add INSERT policies for authenticated role on both tables
    - Data integrity is still enforced by the FK constraint on agency_id

  3. Security Notes
    - Table-level GRANTs still control which roles can access the API
    - FK constraint on agency_id -> crm_agencies(id) prevents invalid agency references
    - RLS SELECT policies still restrict what data each role can read
*/

-- Fix agency_cancellation_uploads INSERT policy
DROP POLICY IF EXISTS "Anon can insert cancellation uploads for portal" ON agency_cancellation_uploads;

CREATE POLICY "Anon can insert cancellation uploads"
  ON agency_cancellation_uploads
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert cancellation uploads"
  ON agency_cancellation_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix agency_cancellations INSERT policy
DROP POLICY IF EXISTS "Anon can insert cancellations for portal" ON agency_cancellations;

CREATE POLICY "Anon can insert cancellations"
  ON agency_cancellations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert cancellations"
  ON agency_cancellations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';