/*
  # Fix: hierarchy_agencies missing columns from 20260714200000 migration

  Root cause:
    Migration 20260714200000 added street_address, city, zip, and
    additional_contacts to BOTH agency_intake_submissions AND
    hierarchy_agencies. The agency_intake_submissions ALTER succeeded, but
    the hierarchy_agencies ALTER silently failed (or was never applied).

    The follow-up fix migration (20260715200000) only re-applied columns to
    agency_intake_submissions — it never touched hierarchy_agencies.

    Result: the approval flow in Hierarchy.tsx upserts into
    hierarchy_agencies with additional_contacts, street_address, city, zip
    and PostgREST rejects the request:
      "Could not find the 'additional_contacts' column of
       'hierarchy_agencies' in the schema cache"

  Fix:
    1. Add the four missing columns (idempotent).
    2. NOTIFY pgrst to reload schema cache.

  Applied live via Management API on 2026-07-21. This migration file
  exists for repo parity.
*/

ALTER TABLE public.hierarchy_agencies
  ADD COLUMN IF NOT EXISTS street_address       text,
  ADD COLUMN IF NOT EXISTS city                 text,
  ADD COLUMN IF NOT EXISTS zip                  text,
  ADD COLUMN IF NOT EXISTS additional_contacts  jsonb DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
