/*
  # Seed Cancellation Upload Template

  1. Changes
    - Inserts a new template "Cancellation Upload Template" into `crm_templates`
    - Provides the required headers and a sample row for agencies to follow
    - Template will appear automatically in the CRM Templates management tab

  2. Notes
    - Uses IF NOT EXISTS check to avoid duplicate inserts
    - Tag value must be exactly "cancelled policy | launch"
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM crm_templates WHERE name = 'Cancellation Upload Template'
  ) THEN
    INSERT INTO crm_templates (name, description, file_name, headers, sample_rows)
    VALUES (
      'Cancellation Upload Template',
      'Template for agency cancellation uploads. All rows must include: First Name (no middle initials), Last Name, Phone, and Tag set to "cancelled policy | launch".',
      'cancellation_upload_template.csv',
      '["First Name", "Last Name", "Phone", "Tag"]'::jsonb,
      '[{"First Name": "John", "Last Name": "Smith", "Phone": "555-123-4567", "Tag": "cancelled policy | launch"}]'::jsonb
    );
  END IF;
END $$;