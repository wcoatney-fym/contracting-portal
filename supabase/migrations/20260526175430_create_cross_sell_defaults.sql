/*
  # Create Cross-Sell Defaults Table

  1. New Tables
    - `cross_sell_defaults`
      - `id` (uuid, primary key)
      - `product_number` (integer, 1-5)
      - `product_name` (text - default product name)
      - `field_key` (text - one of 28 normalized field keys)
      - `field_value` (text - default value for the field)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated users can read, insert, update
    - Anon users can read (for portal display)

  3. Constraints
    - Unique on (product_number, field_key)

  4. Seed Data
    - 5 default products with names only (fields empty)
*/

CREATE TABLE IF NOT EXISTS cross_sell_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_number integer NOT NULL,
  product_name text NOT NULL DEFAULT '',
  field_key text NOT NULL DEFAULT '',
  field_value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cross_sell_defaults_product_field_unique UNIQUE (product_number, field_key),
  CONSTRAINT cross_sell_defaults_product_number_check CHECK (product_number >= 1 AND product_number <= 5)
);

ALTER TABLE cross_sell_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cross sell defaults"
  ON cross_sell_defaults FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert cross sell defaults"
  ON cross_sell_defaults FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cross sell defaults"
  ON cross_sell_defaults FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read cross sell defaults"
  ON cross_sell_defaults FOR SELECT
  TO anon
  USING (true);

-- Seed default product names with a placeholder field_key
INSERT INTO cross_sell_defaults (product_number, product_name, field_key, field_value) VALUES
  (1, 'Final Expense Life Insurance', 'headline', ''),
  (1, 'Final Expense Life Insurance', 'meta_title', ''),
  (1, 'Final Expense Life Insurance', 'meta_description', ''),
  (1, 'Final Expense Life Insurance', 'meta_image_url', ''),
  (1, 'Final Expense Life Insurance', 'cta_text', ''),
  (1, 'Final Expense Life Insurance', 'button_cta_text', ''),
  (1, 'Final Expense Life Insurance', 'bullet_1', ''),
  (1, 'Final Expense Life Insurance', 'bullet_1_description', ''),
  (1, 'Final Expense Life Insurance', 'bullet_2', ''),
  (1, 'Final Expense Life Insurance', 'bullet_2_description', ''),
  (1, 'Final Expense Life Insurance', 'bullet_3', ''),
  (1, 'Final Expense Life Insurance', 'bullet_3_description', ''),
  (1, 'Final Expense Life Insurance', 'bullet_4', ''),
  (1, 'Final Expense Life Insurance', 'bullet_4_description', ''),
  (1, 'Final Expense Life Insurance', 'bullet_5', ''),
  (1, 'Final Expense Life Insurance', 'bullet_5_description', ''),
  (1, 'Final Expense Life Insurance', 'specialist_full_name', ''),
  (1, 'Final Expense Life Insurance', 'specialist_title', ''),
  (1, 'Final Expense Life Insurance', 'specialist_email', ''),
  (1, 'Final Expense Life Insurance', 'specialist_mobile', ''),
  (1, 'Final Expense Life Insurance', 'funnel_link_step_1', ''),
  (1, 'Final Expense Life Insurance', 'funnel_link_step_2', ''),
  (1, 'Final Expense Life Insurance', 'calendar_embed_code', ''),
  (1, 'Final Expense Life Insurance', 'appointment_disclaimer', ''),
  (1, 'Final Expense Life Insurance', 'confirmation_headline', ''),
  (1, 'Final Expense Life Insurance', 'confirmation_subheadline', ''),
  (1, 'Final Expense Life Insurance', 'confirmation_next_steps', ''),
  (1, 'Final Expense Life Insurance', 'system_crm_number', ''),
  (2, 'Hospital Indemnity', 'headline', ''),
  (2, 'Hospital Indemnity', 'meta_title', ''),
  (2, 'Hospital Indemnity', 'meta_description', ''),
  (2, 'Hospital Indemnity', 'meta_image_url', ''),
  (2, 'Hospital Indemnity', 'cta_text', ''),
  (2, 'Hospital Indemnity', 'button_cta_text', ''),
  (2, 'Hospital Indemnity', 'bullet_1', ''),
  (2, 'Hospital Indemnity', 'bullet_1_description', ''),
  (2, 'Hospital Indemnity', 'bullet_2', ''),
  (2, 'Hospital Indemnity', 'bullet_2_description', ''),
  (2, 'Hospital Indemnity', 'bullet_3', ''),
  (2, 'Hospital Indemnity', 'bullet_3_description', ''),
  (2, 'Hospital Indemnity', 'bullet_4', ''),
  (2, 'Hospital Indemnity', 'bullet_4_description', ''),
  (2, 'Hospital Indemnity', 'bullet_5', ''),
  (2, 'Hospital Indemnity', 'bullet_5_description', ''),
  (2, 'Hospital Indemnity', 'specialist_full_name', ''),
  (2, 'Hospital Indemnity', 'specialist_title', ''),
  (2, 'Hospital Indemnity', 'specialist_email', ''),
  (2, 'Hospital Indemnity', 'specialist_mobile', ''),
  (2, 'Hospital Indemnity', 'funnel_link_step_1', ''),
  (2, 'Hospital Indemnity', 'funnel_link_step_2', ''),
  (2, 'Hospital Indemnity', 'calendar_embed_code', ''),
  (2, 'Hospital Indemnity', 'appointment_disclaimer', ''),
  (2, 'Hospital Indemnity', 'confirmation_headline', ''),
  (2, 'Hospital Indemnity', 'confirmation_subheadline', ''),
  (2, 'Hospital Indemnity', 'confirmation_next_steps', ''),
  (2, 'Hospital Indemnity', 'system_crm_number', ''),
  (3, 'Cancer/Stroke Coverage', 'headline', ''),
  (3, 'Cancer/Stroke Coverage', 'meta_title', ''),
  (3, 'Cancer/Stroke Coverage', 'meta_description', ''),
  (3, 'Cancer/Stroke Coverage', 'meta_image_url', ''),
  (3, 'Cancer/Stroke Coverage', 'cta_text', ''),
  (3, 'Cancer/Stroke Coverage', 'button_cta_text', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_1', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_1_description', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_2', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_2_description', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_3', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_3_description', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_4', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_4_description', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_5', ''),
  (3, 'Cancer/Stroke Coverage', 'bullet_5_description', ''),
  (3, 'Cancer/Stroke Coverage', 'specialist_full_name', ''),
  (3, 'Cancer/Stroke Coverage', 'specialist_title', ''),
  (3, 'Cancer/Stroke Coverage', 'specialist_email', ''),
  (3, 'Cancer/Stroke Coverage', 'specialist_mobile', ''),
  (3, 'Cancer/Stroke Coverage', 'funnel_link_step_1', ''),
  (3, 'Cancer/Stroke Coverage', 'funnel_link_step_2', ''),
  (3, 'Cancer/Stroke Coverage', 'calendar_embed_code', ''),
  (3, 'Cancer/Stroke Coverage', 'appointment_disclaimer', ''),
  (3, 'Cancer/Stroke Coverage', 'confirmation_headline', ''),
  (3, 'Cancer/Stroke Coverage', 'confirmation_subheadline', ''),
  (3, 'Cancer/Stroke Coverage', 'confirmation_next_steps', ''),
  (3, 'Cancer/Stroke Coverage', 'system_crm_number', ''),
  (4, 'LTC/STC', 'headline', ''),
  (4, 'LTC/STC', 'meta_title', ''),
  (4, 'LTC/STC', 'meta_description', ''),
  (4, 'LTC/STC', 'meta_image_url', ''),
  (4, 'LTC/STC', 'cta_text', ''),
  (4, 'LTC/STC', 'button_cta_text', ''),
  (4, 'LTC/STC', 'bullet_1', ''),
  (4, 'LTC/STC', 'bullet_1_description', ''),
  (4, 'LTC/STC', 'bullet_2', ''),
  (4, 'LTC/STC', 'bullet_2_description', ''),
  (4, 'LTC/STC', 'bullet_3', ''),
  (4, 'LTC/STC', 'bullet_3_description', ''),
  (4, 'LTC/STC', 'bullet_4', ''),
  (4, 'LTC/STC', 'bullet_4_description', ''),
  (4, 'LTC/STC', 'bullet_5', ''),
  (4, 'LTC/STC', 'bullet_5_description', ''),
  (4, 'LTC/STC', 'specialist_full_name', ''),
  (4, 'LTC/STC', 'specialist_title', ''),
  (4, 'LTC/STC', 'specialist_email', ''),
  (4, 'LTC/STC', 'specialist_mobile', ''),
  (4, 'LTC/STC', 'funnel_link_step_1', ''),
  (4, 'LTC/STC', 'funnel_link_step_2', ''),
  (4, 'LTC/STC', 'calendar_embed_code', ''),
  (4, 'LTC/STC', 'appointment_disclaimer', ''),
  (4, 'LTC/STC', 'confirmation_headline', ''),
  (4, 'LTC/STC', 'confirmation_subheadline', ''),
  (4, 'LTC/STC', 'confirmation_next_steps', ''),
  (4, 'LTC/STC', 'system_crm_number', ''),
  (5, 'SmartSaveMeds', 'headline', ''),
  (5, 'SmartSaveMeds', 'meta_title', ''),
  (5, 'SmartSaveMeds', 'meta_description', ''),
  (5, 'SmartSaveMeds', 'meta_image_url', ''),
  (5, 'SmartSaveMeds', 'cta_text', ''),
  (5, 'SmartSaveMeds', 'button_cta_text', ''),
  (5, 'SmartSaveMeds', 'bullet_1', ''),
  (5, 'SmartSaveMeds', 'bullet_1_description', ''),
  (5, 'SmartSaveMeds', 'bullet_2', ''),
  (5, 'SmartSaveMeds', 'bullet_2_description', ''),
  (5, 'SmartSaveMeds', 'bullet_3', ''),
  (5, 'SmartSaveMeds', 'bullet_3_description', ''),
  (5, 'SmartSaveMeds', 'bullet_4', ''),
  (5, 'SmartSaveMeds', 'bullet_4_description', ''),
  (5, 'SmartSaveMeds', 'bullet_5', ''),
  (5, 'SmartSaveMeds', 'bullet_5_description', ''),
  (5, 'SmartSaveMeds', 'specialist_full_name', ''),
  (5, 'SmartSaveMeds', 'specialist_title', ''),
  (5, 'SmartSaveMeds', 'specialist_email', ''),
  (5, 'SmartSaveMeds', 'specialist_mobile', ''),
  (5, 'SmartSaveMeds', 'funnel_link_step_1', ''),
  (5, 'SmartSaveMeds', 'funnel_link_step_2', ''),
  (5, 'SmartSaveMeds', 'calendar_embed_code', ''),
  (5, 'SmartSaveMeds', 'appointment_disclaimer', ''),
  (5, 'SmartSaveMeds', 'confirmation_headline', ''),
  (5, 'SmartSaveMeds', 'confirmation_subheadline', ''),
  (5, 'SmartSaveMeds', 'confirmation_next_steps', ''),
  (5, 'SmartSaveMeds', 'system_crm_number', '')
ON CONFLICT (product_number, field_key) DO NOTHING;