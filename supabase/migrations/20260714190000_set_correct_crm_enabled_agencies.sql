/*
  # Set correct crm_enabled agencies

  The guard migration (20260714170000) re-enabled crm_enabled=true on all
  agencies with onboarding_status='onboarding_complete'. That was too broad —
  it enabled 11 agencies that are NOT in the FYM CRM Ops team.

  Authoritative list of CRM-enabled agencies (confirmed by Charlie, 2026-07-14):
    - FYM
    - DH Insurance Group
    - Wisechoice              ← slug=wisechoice (NOT Wisechoice Senior Advisors, LLC)
    - Aspire
    - MHA (IFG)               ← Medicare Health Advisors in GHL, IFG sub-account
    - MHA (YFMO)              ← Medicare Health Advisors in GHL, YFMO sub-account

  Note: "Wisechoice Senior Advisors, LLC" (slug=wisechoice-senior-advisors) is a
  separate entity and NOT in CRM Ops — crm_enabled must be false on that row.

  Note: "Medicare Health Advisors" (slug=medicare-health-advisors) is the UNL
  rolodex entry. The two CRM rows are MHA (IFG) and MHA (YFMO) — those stay on.

  This migration:
  1. Disables crm_enabled on the 11 agencies incorrectly enabled by the guard migration.
  2. Ensures the 6 correct agencies have crm_enabled=true.
  Idempotent.
*/

-- Step 1: Disable the 11 incorrectly enabled agencies
UPDATE public.hierarchy_agencies
SET crm_enabled = false
WHERE slug IN (
  'axia-senior-insurance-advisors',
  'bwl-insurance-ii',
  'guardian-benefits',
  'healthcare123-insurance-services',
  'highland-health-direct',
  'senior-benefits-agency',
  'senior-services-direct',
  'silver-care-advisors',
  'the-premier-agency',
  'wealth-alliance-group',
  'wisechoice-senior-advisors'
);

-- Step 2: Ensure the 6 correct agencies are ON
-- (Using name match for FYM/Aspire/Wisechoice/MHA rows which have NULL slugs)
UPDATE public.hierarchy_agencies
SET crm_enabled = true
WHERE slug IN ('dh-insurance-group', 'mha-ifg', 'mha-yfmo', 'wisechoice')
   OR name IN ('FYM', 'Aspire');
