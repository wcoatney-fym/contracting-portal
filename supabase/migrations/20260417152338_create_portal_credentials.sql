/*
  # Create portal credentials table

  1. New Tables
    - `portal_credentials`
      - `id` (uuid, primary key)
      - `email_domain` (text, unique) - the allowed email domain (e.g. "teamfym.com")
      - `password_hash` (text) - SHA-256 hash of the portal password
      - `is_active` (boolean, default true) - whether this credential set is active
      - `created_at` (timestamptz)

  2. Seed Data
    - Insert one row for teamfym.com with the SHA-256 hash of "ContractingFYM!"

  3. Security
    - Enable RLS on `portal_credentials`
    - No public policies - only accessible via service_role key (edge functions)
*/

CREATE TABLE IF NOT EXISTS portal_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_domain text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE portal_credentials ENABLE ROW LEVEL SECURITY;

INSERT INTO portal_credentials (email_domain, password_hash)
VALUES (
  'teamfym.com',
  encode(digest('ContractingFYM!', 'sha256'), 'hex')
)
ON CONFLICT (email_domain) DO NOTHING;
