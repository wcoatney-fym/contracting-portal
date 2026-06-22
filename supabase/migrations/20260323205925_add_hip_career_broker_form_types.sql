/*
  # Add HIP Career and HIP Broker Form Types

  ## Summary
  Splits the single "hip" form type into two distinct form types:
  - `hip-career`: For HIP Career Agents (30% contract, free leads)
  - `hip-broker`: For HIP Broker Agents (60% contract, own book of business)

  This eliminates agent self-selection by routing to the correct form
  based on the form_type set during new hire intake.

  ## Changes
  - Modified Tables:
    - `agents`: Updated form_type CHECK constraint to include 'hip-career' and 'hip-broker'

  ## Notes
  - The old hip variants (hip, field-hip, direct-pay-hip, telesales-hip) are retained
    so existing agent records remain valid.
  - New agents going forward will use 'hip-career' or 'hip-broker' instead of 'hip'.
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
    'telesales-hip'::text,
    'hip'::text,
    'hip-career'::text,
    'hip-broker'::text
  ]));