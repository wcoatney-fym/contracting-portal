/*
  # Writing Number Submissions + Verification Gate

  1. agent_writing_number_submissions
     - Staging table for writing numbers submitted by agents via the hub.
     - Contracting team reviews and verifies each submission.
     - On verification: agent_lob_assignments row is upserted with verified=true.

  2. agent_lob_assignments — add verified columns
     - verified: boolean, default false — set true only by contracting team
     - verified_at: timestamptz
     - verified_by: text (team member name)
     - submitted_by_agent: boolean — true if submitted via hub (vs. entered by staff)
     - ai_extracted: boolean — true if writing number came from AI image extraction
     - source_submission_id: FK to agent_writing_number_submissions

  3. agent_pipeline — add writing_number_flag columns
     - wn_pending_review: boolean — true when any unverified submission exists
     - wn_pending_count: integer — count of pending submissions (denormalized for fast card render)
*/

-- ── 1. Submissions staging table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_writing_number_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  carrier           text NOT NULL,                        -- 'UNL' | 'GTL' | ...
  writing_number    text,                                 -- typed by agent (if not image)
  ai_extracted_number text,                              -- extracted by Claude from image
  source_image_url  text,                                 -- storage URL if image uploaded
  submission_method text NOT NULL DEFAULT 'typed',        -- 'typed' | 'image'
  status            text NOT NULL DEFAULT 'pending',      -- 'pending' | 'verified' | 'rejected'
  review_note       text,
  reviewed_by       text,
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wn_submission_status CHECK (status IN ('pending','verified','rejected')),
  CONSTRAINT wn_submission_method CHECK (submission_method IN ('typed','image'))
);

CREATE INDEX IF NOT EXISTS idx_wn_submissions_agent_id  ON agent_writing_number_submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_wn_submissions_status    ON agent_writing_number_submissions(status);
CREATE INDEX IF NOT EXISTS idx_wn_submissions_created   ON agent_writing_number_submissions(created_at DESC);

ALTER TABLE agent_writing_number_submissions ENABLE ROW LEVEL SECURITY;

-- Agent hub (anon) can INSERT and read their own rows by agent_id.
-- No anon SELECT policy with agent_id filter is possible without session context,
-- so we allow full anon read (data is not sensitive — writing numbers + carrier names).
-- Contracting staff read/update via Management API / authenticated.
CREATE POLICY "wn_submissions_anon_insert"
  ON agent_writing_number_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "wn_submissions_anon_select"
  ON agent_writing_number_submissions FOR SELECT
  USING (true);

GRANT INSERT, SELECT ON agent_writing_number_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_writing_number_submissions TO authenticated;

-- ── 2. Extend agent_lob_assignments ─────────────────────────────────────────
ALTER TABLE agent_lob_assignments
  ADD COLUMN IF NOT EXISTS verified             boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at          timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by          text,
  ADD COLUMN IF NOT EXISTS submitted_by_agent   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_extracted         boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_submission_id uuid        REFERENCES agent_writing_number_submissions(id) ON DELETE SET NULL;

-- ── 3. Extend agent_pipeline — writing number flag ──────────────────────────
ALTER TABLE agent_pipeline
  ADD COLUMN IF NOT EXISTS wn_pending_review  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wn_pending_count   integer NOT NULL DEFAULT 0;

-- ── 4. Schema cache reload ───────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
