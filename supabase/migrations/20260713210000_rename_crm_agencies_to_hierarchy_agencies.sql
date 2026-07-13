/*
  # Rename crm_agencies → hierarchy_agencies

  The table was originally named crm_agencies but is used for the full
  agency hierarchy (including non-CRM agencies). Renaming to hierarchy_agencies
  removes the misleading "CRM" prefix and avoids confusion with CRM Ops data.

  Postgres automatically transfers:
    - All column definitions
    - All indexes
    - All CHECK / UNIQUE / NOT NULL constraints
    - All FK constraints pointing TO this table (they follow the table rename)
    - RLS enabled flag
    - Sequences

  What does NOT transfer automatically and must be re-created:
    - Named RLS policies (they are attached to the table by name; Postgres
      renames the internal association but the policy names themselves remain
      valid — no drop/re-create needed; the policies follow the rename)
    - Existing GRANTs on the table name — must be re-granted on new name

  Verification: after applying, confirm with:
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hierarchy_agencies';
*/

-- Step 1: Rename the table
ALTER TABLE public.crm_agencies RENAME TO hierarchy_agencies;

-- Step 2: Rename the self-referential FK constraint to match new naming
ALTER TABLE public.hierarchy_agencies
  RENAME CONSTRAINT crm_agencies_parent_agency_fk TO hierarchy_agencies_parent_agency_fk;

-- Step 3: Re-grant table privileges (Postgres does NOT auto-transfer GRANTs on rename)
GRANT SELECT ON public.hierarchy_agencies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hierarchy_agencies TO authenticated;

-- Step 4: Re-grant the anon UPDATE that was set up for portal onboarding status
-- (was covered by the policy in 20260424183139; the policy follows the rename,
--  but we re-grant the underlying privilege explicitly to be safe)
GRANT UPDATE ON public.hierarchy_agencies TO anon;
