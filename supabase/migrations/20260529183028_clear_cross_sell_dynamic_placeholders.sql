/*
  # Clear Dynamic Placeholder Values in Cross-Sell Defaults

  1. Changes
    - Sets funnel_link_step_1, funnel_link_step_2, and system_crm_number to empty strings
    - These fields are populated dynamically per-agency from agency_phone and agency_url_prefix during onboarding

  2. Notes
    - Only affects the defaults template; existing agencies are not changed
    - Dynamic values are injected at initialization time in the application layer
*/

UPDATE cross_sell_defaults
SET field_value = '', updated_at = now()
WHERE field_key IN ('funnel_link_step_1', 'funnel_link_step_2', 'system_crm_number');