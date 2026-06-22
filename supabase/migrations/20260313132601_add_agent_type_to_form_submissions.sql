/*
  # Add agent_type column to form_submissions

  1. Modified Tables
    - `form_submissions`
      - Added `agent_type` (text, nullable) - stores the HIP agent type selection
        - Values: 'HIP Broker' or 'HIP Career Agent'
        - Null for non-HIP form submissions

  2. Notes
    - This column captures the first question on the HIP form ("Type of Agent")
    - Non-HIP submissions will have NULL for this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_submissions' AND column_name = 'agent_type'
  ) THEN
    ALTER TABLE form_submissions ADD COLUMN agent_type text;
  END IF;
END $$;
