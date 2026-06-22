/*
  # Create agency_ghl_configs table

  1. New Tables
    - `agency_ghl_configs`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to crm_agencies, unique)
      - `ghl_api_key` (text) - encrypted API key for GoHighLevel
      - `ghl_location_id` (text) - GHL location identifier
      - `connection_status` (text) - connected/error/disconnected
      - `last_sync_at` (timestamptz, nullable) - last successful sync timestamp
      - `last_error` (text, nullable) - last error message if any
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `agency_ghl_configs` table
    - Add policy for authenticated users to read configs
    - Add policy for authenticated users to insert configs
    - Add policy for authenticated users to update configs
    - Add policy for authenticated users to delete configs
*/

CREATE TABLE IF NOT EXISTS agency_ghl_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL UNIQUE REFERENCES crm_agencies(id),
  ghl_api_key text NOT NULL DEFAULT '',
  ghl_location_id text NOT NULL DEFAULT '',
  connection_status text NOT NULL DEFAULT 'disconnected',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agency_ghl_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ghl configs"
  ON agency_ghl_configs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ghl configs"
  ON agency_ghl_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ghl configs"
  ON agency_ghl_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ghl configs"
  ON agency_ghl_configs FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
