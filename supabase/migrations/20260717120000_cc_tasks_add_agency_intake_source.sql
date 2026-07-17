/*
  # cc_tasks — add 'agency_intake' and 'activation' source values

  The agency-intake-welcome edge function creates cc_tasks rows with
  source = 'agency_intake' when an agency completes their intake form but
  the Activity Tracker credentials aren't provisioned yet.

  The activation-aging engine (FYM Command) already writes source = 'activation'.
  Both values were missing from the original CHECK constraint.

  This migration drops and recreates the constraint to include all current
  valid source values: flag, optimization, manual, activation, agency_intake.
*/

ALTER TABLE cc_tasks
  DROP CONSTRAINT IF EXISTS cc_tasks_source_check;

ALTER TABLE cc_tasks
  ADD CONSTRAINT cc_tasks_source_check
  CHECK (source IN ('flag', 'optimization', 'manual', 'activation', 'agency_intake'));
