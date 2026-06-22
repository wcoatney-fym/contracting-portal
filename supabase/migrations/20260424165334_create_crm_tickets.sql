/*
  # Create CRM Tickets and Ticket Messages Tables

  1. New Tables
    - `crm_tickets`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies)
      - `subject` (text) - ticket subject line
      - `description` (text) - initial ticket description
      - `category` (text) - agent-issue, crm-issue, billing, other
      - `status` (text) - open, in-progress, resolved, closed
      - `priority` (text) - low, normal, high
      - `submitted_by` (text) - name of person who submitted
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)

    - `crm_ticket_messages`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, FK to crm_tickets)
      - `sender_type` (text) - agency or admin
      - `sender_name` (text) - name of sender
      - `message` (text) - message content
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Policies allow authenticated users to perform CRUD operations
*/

CREATE TABLE IF NOT EXISTS crm_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id),
  subject text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  submitted_by text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT crm_tickets_category_check CHECK (category IN ('agent-issue', 'crm-issue', 'billing', 'other')),
  CONSTRAINT crm_tickets_status_check CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  CONSTRAINT crm_tickets_priority_check CHECK (priority IN ('low', 'normal', 'high'))
);

CREATE TABLE IF NOT EXISTS crm_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES crm_tickets(id),
  sender_type text NOT NULL DEFAULT 'agency',
  sender_name text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT crm_ticket_messages_sender_type_check CHECK (sender_type IN ('agency', 'admin'))
);

ALTER TABLE crm_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tickets"
  ON crm_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert tickets"
  ON crm_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tickets"
  ON crm_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read ticket messages"
  ON crm_ticket_messages FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ticket messages"
  ON crm_ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read tickets"
  ON crm_tickets FOR SELECT
  TO anon
  USING (true = true);

CREATE POLICY "Anon users can insert tickets"
  ON crm_tickets FOR INSERT
  TO anon
  WITH CHECK (true = true);

CREATE POLICY "Anon users can update tickets"
  ON crm_tickets FOR UPDATE
  TO anon
  USING (true = true)
  WITH CHECK (true = true);

CREATE POLICY "Anon users can read ticket messages"
  ON crm_ticket_messages FOR SELECT
  TO anon
  USING (true = true);

CREATE POLICY "Anon users can insert ticket messages"
  ON crm_ticket_messages FOR INSERT
  TO anon
  WITH CHECK (true = true);
