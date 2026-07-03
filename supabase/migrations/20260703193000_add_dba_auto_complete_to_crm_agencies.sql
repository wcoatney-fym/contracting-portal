/*
  # Add dba_auto_complete toggle to crm_agencies

  Adds a per-agency flag controlling whether the DBA Client Roster (DB Template)
  upload step requires CRM Team approval before onboarding is marked complete.

  Behavior:
    - dba_auto_complete = false (default): CRM Team must approve the DBA upload
      before onboarding completes (current behavior; toggle OFF).
    - dba_auto_complete = true: the agency's DBA upload auto-completes onboarding
      with no CRM approval required (toggle ON).

  Non-destructive, additive, reversible. Existing rows default to false so the
  current "CRM approval required" behavior is preserved for every agency.
*/

ALTER TABLE crm_agencies
  ADD COLUMN IF NOT EXISTS dba_auto_complete boolean NOT NULL DEFAULT false;
