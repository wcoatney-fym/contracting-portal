/*
  # Create Agency Cross-Sell Table

  1. New Tables
    - `crm_agency_cross_sell`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies)
      - `product_number` (integer, 1-5)
      - `product_name` (text - editable per agency)
      - `fields` (jsonb - 28-key object with all field values)
      - `ai_prompt` (text, nullable - auto-generated on product name change)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated can read, insert, update
    - Anon can read (portal display)

  3. Constraints
    - Unique on (agency_id, product_number)
*/

CREATE TABLE IF NOT EXISTS crm_agency_cross_sell (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id) ON DELETE CASCADE,
  product_number integer NOT NULL,
  product_name text NOT NULL DEFAULT '',
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_agency_cross_sell_unique UNIQUE (agency_id, product_number),
  CONSTRAINT crm_agency_cross_sell_product_check CHECK (product_number >= 1 AND product_number <= 5)
);

ALTER TABLE crm_agency_cross_sell ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agency cross sell"
  ON crm_agency_cross_sell FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert agency cross sell"
  ON crm_agency_cross_sell FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update agency cross sell"
  ON crm_agency_cross_sell FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read agency cross sell"
  ON crm_agency_cross_sell FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_crm_agency_cross_sell_agency ON crm_agency_cross_sell (agency_id);