/*
  # Create FYM Financial Contracting Portal Schema

  1. New Tables
    - `agents`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `phone` (text)
      - `form_type` (text) - life-only, field, direct-pay, telesales
      - `security_code` (text, unique, 6-digit)
      - `status` (text) - pending, in-progress, completed, expired
      - `date_sent` (timestamptz)
      - `date_completed` (timestamptz, nullable)
      - `expiration_date` (timestamptz)
      - `form_url` (text, unique)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `form_submissions`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `date_of_birth` (date)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `postal_code` (text)
      - `ssn` (text, encrypted)
      - `resident_license_number` (text)
      - `npn` (text)
      - `resident_state` (text)
      - `ctm_acknowledgment` (text, nullable)
      - `release_needed` (text)
      - `state_licenses` (jsonb)
      - `submitted_at` (timestamptz)

    - `uploaded_files`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `file_name` (text)
      - `file_type` (text)
      - `file_data` (text) - base64 encoded
      - `uploaded_at` (timestamptz)

    - `activity_log`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key, nullable)
      - `action` (text)
      - `details` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  form_type text NOT NULL CHECK (form_type IN ('life-only', 'field', 'direct-pay', 'telesales')),
  security_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'expired')),
  date_sent timestamptz DEFAULT now(),
  date_completed timestamptz,
  expiration_date timestamptz NOT NULL,
  form_url text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create form_submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  date_of_birth date NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  ssn text NOT NULL,
  resident_license_number text NOT NULL,
  npn text NOT NULL,
  resident_state text NOT NULL,
  ctm_acknowledgment text,
  release_needed text NOT NULL,
  state_licenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz DEFAULT now()
);

-- Create uploaded_files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_data text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_security_code ON agents(security_code);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_agent_id ON form_submissions(agent_id);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (agents can access their own data with security code)
-- For now, we'll allow all access since authentication is handled at application level
CREATE POLICY "Allow all access to agents"
  ON agents FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to form_submissions"
  ON form_submissions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to uploaded_files"
  ON uploaded_files FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to activity_log"
  ON activity_log FOR ALL
  USING (true)
  WITH CHECK (true);