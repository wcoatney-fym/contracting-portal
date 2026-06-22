/*
  # Add cancellation upload approval workflow

  1. Modified Tables
    - `agency_cancellation_uploads`
      - Add `confirmed_at` (timestamptz, nullable) - timestamp when CRM team confirms the upload
      - Status field now supports: 'pending_approval', 'success', 'rejected'

  2. Security
    - Add UPDATE policy for anon users (CRM team uses session auth, runs as anon)
      scoped to active agencies
    - Add UPDATE policy for authenticated users

  3. Notes
    - Agencies upload CSVs which land as 'pending_approval'
    - CRM team confirms (status -> 'success', confirmed_at set) or rejects (status -> 'rejected')
    - Only confirmed uploads fire to external Zapier webhook
*/

-- Add confirmed_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_cancellation_uploads' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE agency_cancellation_uploads ADD COLUMN confirmed_at timestamptz;
  END IF;
END $$;

-- Add anon update policy for approval workflow
CREATE POLICY "Anon can update cancellation uploads for active agencies"
  ON agency_cancellation_uploads
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_agencies WHERE id = agency_id AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_agencies WHERE id = agency_id AND is_active = true
    )
  );

-- Add authenticated update policy
CREATE POLICY "Authenticated can update cancellation uploads"
  ON agency_cancellation_uploads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);