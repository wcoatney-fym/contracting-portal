/*
  # Add HIP Form Types to Agents Constraint

  ## Summary
  The agents_form_type_check constraint was missing the three HIP form type values,
  causing inserts to fail silently when any HIP form type was selected.

  ## Changes
  - Modified Tables:
    - `agents`: Updated form_type CHECK constraint to include all 7 valid values

  ## Before
  - Allowed: life-only, field, direct-pay, telesales

  ## After
  - Allowed: life-only, field, direct-pay, telesales, field-hip, direct-pay-hip, telesales-hip
*/

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_form_type_check;

ALTER TABLE agents ADD CONSTRAINT agents_form_type_check
  CHECK (form_type = ANY (ARRAY[
    'life-only'::text,
    'field'::text,
    'direct-pay'::text,
    'telesales'::text,
    'field-hip'::text,
    'direct-pay-hip'::text,
    'telesales-hip'::text
  ]));
