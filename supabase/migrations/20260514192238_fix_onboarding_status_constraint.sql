/*
  # Fix onboarding_status CHECK constraint

  1. Modified Tables
    - `crm_agencies`
      - Drops and recreates the `crm_agencies_onboarding_status_check` constraint
      - Adds `awaiting_subaccount_setup` to the list of valid onboarding_status values

  2. Notes
    - The previous migration added the subaccount setup step but did not update
      this constraint, causing updates to silently fail
*/

ALTER TABLE crm_agencies DROP CONSTRAINT IF EXISTS crm_agencies_onboarding_status_check;

ALTER TABLE crm_agencies ADD CONSTRAINT crm_agencies_onboarding_status_check
  CHECK (onboarding_status = ANY (ARRAY[
    'pending_csr_assignment'::text,
    'awaiting_agency_phone'::text,
    'awaiting_subaccount_setup'::text,
    'awaiting_roster_upload'::text,
    'awaiting_dba_upload'::text,
    'onboarding_complete'::text
  ]));
