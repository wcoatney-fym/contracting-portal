/*
# Add tags and intake custom fields to agent pipeline

Enables the pipeline card/modal to show a full picture of each agent:
GHL contact tags and the intake-form answers (stored in GHL as contact
custom fields). Previously the sync only pulled the thin opportunity
contact object, so tags and intake data never made it into the portal.

1. Changes
  - `agent_pipeline.tags` (jsonb, default '[]') - array of GHL contact tag strings.
  - `agent_pipeline.custom_fields` (jsonb, default '{}') - map of intake-form
    field name/id -> value, sourced from GHL contact customFields.
  - `agent_pipeline.ghl_contact_id` (text, nullable) - GHL contact id, so we can
    enrich (GET /contacts/{id}) and push tags back without re-searching.

2. Notes
  - Both default to empty containers so existing rows and UI render safely.
  - No RLS changes; existing anon/authenticated policies cover the new columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pipeline' AND column_name = 'tags') THEN
    ALTER TABLE agent_pipeline ADD COLUMN tags jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pipeline' AND column_name = 'custom_fields') THEN
    ALTER TABLE agent_pipeline ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pipeline' AND column_name = 'ghl_contact_id') THEN
    ALTER TABLE agent_pipeline ADD COLUMN ghl_contact_id text;
  END IF;
END $$;
