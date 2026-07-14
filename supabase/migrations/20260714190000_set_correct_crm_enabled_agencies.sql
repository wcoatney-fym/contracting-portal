/*
  # Set correct crm_enabled agencies

  The guard migration (20260714170000) re-enabled crm_enabled=true on all
  agencies with onboarding_status='onboarding_complete'. That was too broad —
  it enabled 11 agencies that are NOT in the FYM CRM Ops team.

  Authoritative list of CRM-enabled agencies (confirmed by Charlie, 2026-07-14):
    - FYM
    - DH Insurance Group      ← "DH Insurance" in CRM
    - Wisechoice Senior Advisors, LLC  ← "Wisechoice" in CRM (slug=wisechoice-senior-advisors)
    - Aspire
    - MHA (IFG)               ← Medicare Health Advisors, IFG GHL sub-account
    - MHA (YFMO)              ← Medicare Health Advisors, YFMO GHL sub-account

  Fuzzy match notes:
    - "Wisechoice" in CRM Ops = "Wisechoice Senior Advisors, LLC" (slug=wisechoice-senior-advisors)
      The plain "Wisechoice" row (slug=wisechoice) is a separate entity → crm_enabled=false.
    - "DH Insurance" in CRM = "DH Insurance Group" in DB.
    - "Medicare Health Advisors" (slug=medicare-health-advisors) is the UNL rolodex entry —
      stays crm_enabled=false. The two CRM rows are MHA (IFG) and MHA (YFMO).

  This migration:
  1. Disables crm_enabled on the incorrectly enabled agencies (including plain 'wisechoice').
  2. Ensures the 6 correct agencies have crm_enabled=true.
  Idempotent.
*/

-- Step 1: Disable all incorrectly enabled agencies
UPDATE public.hierarchy_agencies
SET crm_enabled = false
WHERE slug IN (
  'wisechoice',                         -- plain Wisechoice row; CRM uses wisechoice-senior-advisors
  'axia-senior-insurance-advisors',
  'bwl-insurance-ii',
  'guardian-benefits',
  'healthcare123-insurance-services',
  'highland-health-direct',
  'senior-benefits-agency',
  'senior-services-direct',
  'silver-care-advisors',
  'the-premier-agency',
  'wealth-alliance-group'
);

-- Step 2: Ensure the 6 correct agencies are ON
UPDATE public.hierarchy_agencies
SET crm_enabled = true
WHERE slug IN (
  'dh-insurance-group',
  'mha-ifg',
  'mha-yfmo',
  'wisechoice-senior-advisors'          -- "Wisechoice" in CRM Ops
)
OR name IN ('FYM', 'Aspire');
