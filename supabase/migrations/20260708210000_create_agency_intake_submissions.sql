/*
  # Create agency_intake_submissions (public agency intake -> staged review)

  1. Purpose
    - Backs the public `/agency-intake` link handed to the contracting team.
    - Submissions land here as `pending` and are reviewed inside the Hierarchy tab.
    - On Approve, an admin (authenticated) creates the real `crm_agencies` row from
      the submission and marks it `approved`. Nothing writes to `crm_agencies` from
      the public/anon path -- keeps the live production table free of junk.

  2. New Table
    - `agency_intake_submissions`
      - `id` (uuid, pk)
      - `agency_name` (text, not null)
      - `parent_agency_id` (uuid, FK crm_agencies ON DELETE SET NULL, nullable)
      - `parent_agency_name` (text, nullable) - snapshot for display if parent is later removed
      - `agency_npn` (text, not null)
      - `agency_ein` (text, not null)
      - `principal_agent` (text, not null)
      - `principal_agent_npn` (text, not null)
      - `contracting_email` (text, not null)
      - `contracting_contact` (text, nullable)
      - `status` (text, not null, default 'pending') CHECK in ('pending','approved','rejected')
      - `approved_agency_id` (uuid, FK crm_agencies ON DELETE SET NULL, nullable)
      - `review_note` (text, nullable)
      - `reviewed_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())

  3. Security (matches the cancellation-tables precedent: anon may INSERT only)
    - Enable RLS.
    - anon: INSERT only, forced to status='pending' via WITH CHECK. No anon SELECT
      (the public form does not read submissions back).
    - authenticated: full CRUD (CRM admins review/approve inside the portal).

  4. Indexes
    - status (pending-tray lookups), created_at.
*/

CREATE TABLE IF NOT EXISTS agency_intake_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text NOT NULL,
  parent_agency_id uuid REFERENCES crm_agencies(id) ON DELETE SET NULL,
  parent_agency_name text,
  agency_npn text NOT NULL,
  agency_ein text NOT NULL,
  principal_agent text NOT NULL,
  principal_agent_npn text NOT NULL,
  contracting_email text NOT NULL,
  contracting_contact text,
  status text NOT NULL DEFAULT 'pending',
  approved_agency_id uuid REFERENCES crm_agencies(id) ON DELETE SET NULL,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_intake_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_agency_intake_submissions_status ON agency_intake_submissions(status);
CREATE INDEX IF NOT EXISTS idx_agency_intake_submissions_created_at ON agency_intake_submissions(created_at DESC);

ALTER TABLE agency_intake_submissions ENABLE ROW LEVEL SECURITY;

-- Public form: anon may only INSERT pending submissions. No anon SELECT/UPDATE/DELETE.
DROP POLICY IF EXISTS "anon_insert_agency_intake" ON agency_intake_submissions;
CREATE POLICY "anon_insert_agency_intake" ON agency_intake_submissions FOR INSERT
  TO anon WITH CHECK (status = 'pending');

-- CRM admins (authenticated) review and manage submissions.
DROP POLICY IF EXISTS "auth_select_agency_intake" ON agency_intake_submissions;
CREATE POLICY "auth_select_agency_intake" ON agency_intake_submissions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_agency_intake" ON agency_intake_submissions;
CREATE POLICY "auth_insert_agency_intake" ON agency_intake_submissions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_agency_intake" ON agency_intake_submissions;
CREATE POLICY "auth_update_agency_intake" ON agency_intake_submissions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_agency_intake" ON agency_intake_submissions;
CREATE POLICY "auth_delete_agency_intake" ON agency_intake_submissions FOR DELETE
  TO authenticated USING (true);

-- Table-level grants (RLS policies are enforced on top of these).
GRANT INSERT ON agency_intake_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON agency_intake_submissions TO authenticated;

-- Force PostgREST to reload its schema cache so new grants/policies take effect immediately.
NOTIFY pgrst, 'reload schema';
