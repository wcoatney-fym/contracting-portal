/*
  # Add Unified HIP Form Type

  ## Summary
  Consolidates the three separate HIP form types (field-hip, direct-pay-hip, telesales-hip)
  into a single unified 'hip' form type. The agent type (HIP Broker vs HIP Career Agent)
  is now captured within the form itself and transmitted via the Zapier webhook.

  ## Changes
  - Modified Tables:
    - `agents`: Updated form_type CHECK constraint to include 'hip' as a valid value
      alongside the existing types.

  ## Notes
  - The old hip variants (field-hip, direct-pay-hip, telesales-hip) are retained in the
    constraint so that any existing agent records remain valid.
  - New agents will use 'hip' as the form_type going forward.
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
    'hip'::text
  ]));
