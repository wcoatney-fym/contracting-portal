/*
  # Add missing UPDATE policy to crm_roster

  1. Security Changes
    - Add UPDATE policy for authenticated users on `crm_roster` table
    - This was missing, causing silent failures when updating roster seat data
      after CRM onboarding

  2. Important Notes
    - The crm_roster table already has SELECT, INSERT, and DELETE policies
    - Without this UPDATE policy, RLS silently blocked all row updates
    - This fix allows the CRM onboarding flow to properly write agent data
      into roster seats
*/

CREATE POLICY "Authenticated users can update roster entries"
  ON crm_roster
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
