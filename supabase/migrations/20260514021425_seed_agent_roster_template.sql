/*
  # Seed Agent Roster Template

  1. Changes
    - Inserts a system-level "Agent Roster Template" into `crm_templates`
    - This template has 6 user-facing columns: First Name, Last Name, Email, Phone, Agent NPN, Gender
    - Agencies download this during onboarding; the system normalizes uploads into the canonical internal schema

  2. Notes
    - Uses ON CONFLICT to avoid duplicates if re-run
    - Includes a sample row to demonstrate expected format
*/

INSERT INTO crm_templates (id, name, description, file_name, headers, sample_rows)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Agent Roster Template',
  'Standard template for agency agent roster uploads. Fill in your agents and upload during onboarding.',
  'agent_roster_template.csv',
  '["First Name", "Last Name", "Email", "Phone", "Agent NPN", "Gender"]'::jsonb,
  '[{"First Name": "John", "Last Name": "Smith", "Email": "john.smith@example.com", "Phone": "555-123-4567", "Agent NPN": "12345678", "Gender": "Male"}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  file_name = EXCLUDED.file_name,
  headers = EXCLUDED.headers,
  sample_rows = EXCLUDED.sample_rows,
  updated_at = now();
