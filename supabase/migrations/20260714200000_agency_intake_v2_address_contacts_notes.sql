/*
  # Agency Intake v2 — Address, Additional Contacts, Notes

  1. agency_intake_submissions
     - Drop parent_agency_id / parent_agency_name (parent assigned during approval, not on intake)
     - Add address fields: street_address, city, state, zip
     - Add additional_contacts jsonb[] — [{name, title, department, email, phone}]

  2. hierarchy_agencies
     - Add street_address, city, state (already has agency_state from rolodex, keep both for now), zip
     - Add additional_contacts jsonb[]
     - Add internal_notes text (notes section on detail view, internal team only)

  All changes are additive. No data loss.
*/

-- ── agency_intake_submissions ─────────────────────────────────────────────────

-- Remove parent fields (parent is assigned during approval, not public intake)
ALTER TABLE public.agency_intake_submissions
  DROP COLUMN IF EXISTS parent_agency_id,
  DROP COLUMN IF EXISTS parent_agency_name;

-- Address fields
ALTER TABLE public.agency_intake_submissions
  ADD COLUMN IF NOT EXISTS street_address  text,
  ADD COLUMN IF NOT EXISTS city            text,
  ADD COLUMN IF NOT EXISTS state           text,
  ADD COLUMN IF NOT EXISTS zip             text;

-- Additional contacts: [{name, title, department, email, phone}]
ALTER TABLE public.agency_intake_submissions
  ADD COLUMN IF NOT EXISTS additional_contacts jsonb DEFAULT '[]'::jsonb;

-- Sub-agency invitation tracking: which agency sent the intake link
ALTER TABLE public.agency_intake_submissions
  ADD COLUMN IF NOT EXISTS invited_by_agency_id   uuid REFERENCES public.hierarchy_agencies(id),
  ADD COLUMN IF NOT EXISTS invited_by_agency_name text;

-- ── hierarchy_agencies ────────────────────────────────────────────────────────

-- Address fields (agency_state already exists as UNL rolodex field — keep it)
ALTER TABLE public.hierarchy_agencies
  ADD COLUMN IF NOT EXISTS street_address  text,
  ADD COLUMN IF NOT EXISTS city            text,
  ADD COLUMN IF NOT EXISTS zip             text;

-- Additional contacts
ALTER TABLE public.hierarchy_agencies
  ADD COLUMN IF NOT EXISTS additional_contacts jsonb DEFAULT '[]'::jsonb;

-- Internal notes (CRM team only, never exposed to agency portal)
ALTER TABLE public.hierarchy_agencies
  ADD COLUMN IF NOT EXISTS internal_notes text;
