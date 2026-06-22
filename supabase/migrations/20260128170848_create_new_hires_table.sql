/*
  # Create new_hires table for Zapier integration

  1. New Tables
    - `new_hires`
      - `id` (uuid, primary key) - Unique identifier for each new hire
      - `first_name` (text) - Agent's first name
      - `last_name` (text) - Agent's last name
      - `email` (text) - Agent's email address
      - `phone_number` (text) - Agent's phone number
      - `processed` (boolean, default false) - Whether the hire has been processed
      - `created_at` (timestamptz) - When the record was created
      - `created_by` (uuid, nullable) - Which admin user created/processed this
      
  2. Security
    - Enable RLS on `new_hires` table
    - Add policy for authenticated users to read all new hires
    - Add policy for authenticated users to update processed status
    
  3. Notes
    - This table stores new hire data received from Zapier webhook
    - Processed flag helps track which hires have been sent forms
    - Email should be unique to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS new_hires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE new_hires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all new hires"
  ON new_hires
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert new hires"
  ON new_hires
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update new hires"
  ON new_hires
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete new hires"
  ON new_hires
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_new_hires_email ON new_hires(email);
CREATE INDEX IF NOT EXISTS idx_new_hires_processed ON new_hires(processed);
CREATE INDEX IF NOT EXISTS idx_new_hires_created_at ON new_hires(created_at DESC);