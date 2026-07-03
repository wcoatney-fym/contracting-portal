/*
  # Roster-edit work orders on crm_tickets

  Agencies can now edit their own roster rows from the portal. Each successful
  edit creates a "work order" in the CRM Work Queue (crm_tickets) so the CRM
  team can re-fire the onboarding Zap for the updated agent. The Send-to-Zap
  button on the work order reads the live fields straight from the referenced
  crm_roster row (single source of truth shared by the portal and CRM team),
  so it always fires the current data.

  Rather than create a new work-queue table, we extend crm_tickets minimally:

  1. Changes to `crm_tickets`
    - `roster_row_id` (uuid, nullable) - references crm_roster(id). Lets the
      Send-to-Zap button pull the full onboarding payload from the roster row.
      ON DELETE SET NULL so deleting a roster upload doesn't break the queue.
    - `order_type` (text, nullable) - marks the ticket kind. NULL = a normal
      support ticket (unchanged behavior); 'roster-edit' = a roster-edit work
      order. Chosen instead of overloading `category` so the existing category
      check constraint and its UI labels stay untouched.

  2. Index
    - Partial index on roster-edit orders for fast work-queue reads.

  3. Security
    - No policy change needed: new columns inherit the existing crm_tickets
      RLS policies (anon + authenticated read/insert/update).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_tickets' AND column_name = 'roster_row_id'
  ) THEN
    ALTER TABLE crm_tickets
      ADD COLUMN roster_row_id uuid REFERENCES crm_roster(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_tickets' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE crm_tickets ADD COLUMN order_type text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_tickets_roster_edit
  ON crm_tickets (order_type)
  WHERE order_type = 'roster-edit';
