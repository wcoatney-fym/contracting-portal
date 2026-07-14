-- Fix: ensure all CRM-active agencies still have crm_enabled = true
-- after the hierarchy rename + seed migrations.
--
-- Root cause: PR #27 renamed crm_agencies → hierarchy_agencies and seeded 96 new
-- agencies with crm_enabled = false (correct). However, a prior migration
-- (20260623200144) set crm_enabled = true on all is_active agencies. If the
-- seed migrations ran against a database that had not yet applied that migration
-- (e.g., a fresh deploy ordering issue), or if any conflict resolution silently
-- zeroed the flag, CRM Ops would see an empty agencies list.
--
-- This migration is idempotent and safe to re-run:
--   1. Re-sets crm_enabled = true for the 13 known CRM-enabled agencies by slug.
--      These are the agencies that existed before the rename and were actively
--      managed in CRM Ops.
--   2. Ensures agency_pipeline_webhook and GHL sync edge functions can resolve
--      the renamed FK join (hierarchy_agencies instead of crm_agencies).
--      (Code fix in edge functions applied alongside this migration.)

-- Restore crm_enabled on the 13 original CRM-managed agencies
-- (idempotent — only updates rows that need it)
UPDATE public.hierarchy_agencies
SET crm_enabled = true
WHERE slug IN (
  'fym',
  'guardian-benefits',
  'wisechoice-senior-advisors',
  'dh-insurance-group',
  'bwl-insurance-ii',
  'silver-care-advisors',
  'healthcare123-insurance-services',
  'highland-health-direct',
  'axia-senior-insurance-advisors',
  'wealth-alliance-group',
  'the-premier-agency',
  'senior-benefits-agency',
  'senior-services-direct'
)
AND crm_enabled = false;

-- Safety: any agency that has onboarding_complete status and was managed
-- pre-rename should be CRM visible. Re-enable if somehow flipped off.
UPDATE public.hierarchy_agencies
SET crm_enabled = true
WHERE onboarding_status = 'onboarding_complete'
  AND is_active = true
  AND crm_enabled = false;
