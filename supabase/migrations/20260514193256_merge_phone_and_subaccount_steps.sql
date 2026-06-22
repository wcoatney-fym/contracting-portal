/*
  # Merge Phone & Subaccount Setup into a single onboarding step

  1. Modified Tables
    - `crm_agencies`
      - Migrates any rows with `awaiting_subaccount_setup` back to `awaiting_agency_phone`
      - Drops and recreates the `crm_agencies_onboarding_status_check` constraint
        removing `awaiting_subaccount_setup` from the allowed values

  2. Notes
    - The phone number input and subaccount setup checklist are now combined
      into one step in the UI. The status goes directly from
      `awaiting_agency_phone` to `awaiting_roster_upload`.
    - Any agencies currently in `awaiting_subaccount_setup` are moved back to
      `awaiting_agency_phone` so they appear correctly in the combined step.
*/

UPDATE crm_agencies
SET onboarding_status = 'awaiting_agency_phone',
    updated_at = now()
WHERE onboarding_status = 'awaiting_subaccount_setup';

ALTER TABLE crm_agencies DROP CONSTRAINT IF EXISTS crm_agencies_onboarding_status_check;

ALTER TABLE crm_agencies ADD CONSTRAINT crm_agencies_onboarding_status_check
  CHECK (onboarding_status = ANY (ARRAY[
    'pending_csr_assignment'::text,
    'awaiting_agency_phone'::text,
    'awaiting_roster_upload'::text,
    'awaiting_dba_upload'::text,
    'onboarding_complete'::text
  ]));
