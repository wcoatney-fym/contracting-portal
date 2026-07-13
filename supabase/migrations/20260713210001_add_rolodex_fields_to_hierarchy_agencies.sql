/*
  # Add rolodex fields to hierarchy_agencies

  Adds three new columns to store data sourced from Will's UNL agency rolodex
  (UNL_202JVV00_2026-06-12.csv). These fields do not exist in the current schema
  and are additive — no existing CRM Ops queries are affected.

  New columns:
    - agency_state      text  — 2-letter state abbreviation from UNL CSV
    - unl_writing_number text — UNL carrier-assigned writing/agent number (e.g. 202NPK00)
    - unl_status        text  — Status as reported in the UNL hierarchy file (Active / Pending / Terminated)

  These are informational/reference fields. The agency intake form overwrites
  authoritative fields (NPN, EIN, etc.) on approval; these three stay as UNL
  source data.
*/

ALTER TABLE public.hierarchy_agencies
  ADD COLUMN IF NOT EXISTS agency_state       text,
  ADD COLUMN IF NOT EXISTS unl_writing_number text,
  ADD COLUMN IF NOT EXISTS unl_status         text;
