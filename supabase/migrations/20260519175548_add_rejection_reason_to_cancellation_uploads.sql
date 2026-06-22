/*
  # Add rejection reason to cancellation uploads

  1. Modified Tables
    - `agency_cancellation_uploads`
      - `rejection_reason` (text, nullable) - Explanation from CRM team when rejecting a cancellation upload

  2. Notes
    - Mirrors the roster_sent_back_reason / dba_sent_back_reason pattern already used for other upload types
    - Allows the CRM team to provide clear feedback to agencies when their cancellation data is rejected
    - The reason is displayed prominently in the agency portal so they can self-correct
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_cancellation_uploads' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE agency_cancellation_uploads ADD COLUMN rejection_reason text;
  END IF;
END $$;
