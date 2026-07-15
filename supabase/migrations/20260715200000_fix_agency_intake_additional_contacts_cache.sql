/*
  # Fix: agency_intake_submissions additional_contacts schema cache

  Problem:
    The 20260714200000 migration added `additional_contacts` (jsonb),
    `street_address`, `city`, `state`, `zip`, `invited_by_agency_id`, and
    `invited_by_agency_name` columns to `agency_intake_submissions`, but did
    NOT include a `NOTIFY pgrst, 'reload schema'` at the end. As a result,
    PostgREST's schema cache still reflects the old table shape, and anon
    INSERT requests that include `additional_contacts` (or any of the new
    columns) fail with:
      "Could not find the 'additional_contacts' column of
       'agency_intake_submissions' in the schema cache"

  Fix:
    1. Ensure the columns exist (idempotent ADD COLUMN IF NOT EXISTS — safe
       to run even if the previous migration was already applied).
    2. Re-grant INSERT on the table to anon (idempotent — ensures grants are
       current after any schema changes).
    3. NOTIFY pgrst to force a schema cache reload immediately.
*/

-- 1. Ensure new columns exist (idempotent).
-- Note: invited_by_agency_id is plain uuid (no FK) so each ALTER runs independently;
-- a constraint error on one cannot roll back the others.
ALTER TABLE public.agency_intake_submissions ADD COLUMN IF NOT EXISTS street_address         text;
ALTER TABLE public.agency_intake_submissions ADD COLUMN IF NOT EXISTS city                   text;
ALTER TABLE public.agency_intake_submissions ADD COLUMN IF NOT EXISTS state                  text;
ALTER TABLE public.agency_intake_submissions ADD COLUMN IF NOT EXISTS zip                    text;
ALTER TABLE public.agency_intake_submissions ADD COLUMN IF NOT EXISTS additional_contacts    jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.agency_intake_submissions ADD COLUMN IF NOT EXISTS invited_by_agency_id   uuid;
ALTER TABLE public.agency_intake_submissions ADD COLUMN IF NOT EXISTS invited_by_agency_name text;

-- 2. Re-affirm grants so PostgREST picks up all columns
GRANT INSERT ON public.agency_intake_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_intake_submissions TO authenticated;

-- 3. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
