/*
  # Create CRM Agencies Table

  1. New Tables
    - `crm_agencies`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - Agency display name
      - `assigned_csr` (text, nullable) - Free-text CSR assignment
      - `onboarding_status` (text, not null, default 'pending_csr_assignment') - Current onboarding step
      - `date_added` (timestamptz, default now()) - When agency was first added
      - `seat_count` (integer, default 0) - Number of CRM seats (0-200)
      - `is_active` (boolean, default true) - Whether agency is active
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `crm_agencies` table
    - Add policies for authenticated users to read, insert, update, and delete

  3. Seed Data
    - Insert existing agencies (FYM, Wisechoice, Aspire) as fully onboarded

  4. Notes
    - onboarding_status constrained to: pending_csr_assignment, awaiting_roster_upload, awaiting_dba_upload, onboarding_complete
    - seat_count constrained between 0 and 200
*/

CREATE TABLE IF NOT EXISTS crm_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  assigned_csr text,
  onboarding_status text NOT NULL DEFAULT 'pending_csr_assignment'
    CHECK (onboarding_status IN ('pending_csr_assignment', 'awaiting_roster_upload', 'awaiting_dba_upload', 'onboarding_complete')),
  date_added timestamptz DEFAULT now(),
  seat_count integer NOT NULL DEFAULT 0
    CHECK (seat_count >= 0 AND seat_count <= 200),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agencies"
  ON crm_agencies FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert agencies"
  ON crm_agencies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update agencies"
  ON crm_agencies FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete agencies"
  ON crm_agencies FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

INSERT INTO crm_agencies (name, onboarding_status, is_active)
VALUES
  ('FYM', 'onboarding_complete', true),
  ('Wisechoice', 'onboarding_complete', true),
  ('Aspire', 'onboarding_complete', true)
ON CONFLICT (name) DO NOTHING;
