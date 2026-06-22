/*
  # Add CASCADE delete for agency-related tables

  1. Changes
    - Update `agency_deals.agency_id` FK to CASCADE on delete
    - Update `agency_ghl_configs.agency_id` FK to CASCADE on delete
    - Update `agency_kpis.agency_id` FK to CASCADE on delete
    - Update `crm_tickets.agency_id` FK to CASCADE on delete
    - Update `crm_ticket_messages.ticket_id` FK to CASCADE on delete

  2. Purpose
    - When an agency (e.g. a test agency) is deleted, all related deals,
      GHL configs, KPIs, tickets, and ticket messages are automatically
      cleaned up without leaving orphan rows or FK violations.

  3. Safety
    - Only affects child rows belonging to the deleted agency
    - No data for other agencies is impacted
    - Existing notifications FK already has CASCADE (unchanged)
*/

-- agency_deals: drop and recreate with CASCADE
ALTER TABLE agency_deals DROP CONSTRAINT IF EXISTS agency_deals_agency_id_fkey;
ALTER TABLE agency_deals
  ADD CONSTRAINT agency_deals_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES crm_agencies(id) ON DELETE CASCADE;

-- agency_ghl_configs: drop and recreate with CASCADE
ALTER TABLE agency_ghl_configs DROP CONSTRAINT IF EXISTS agency_ghl_configs_agency_id_fkey;
ALTER TABLE agency_ghl_configs
  ADD CONSTRAINT agency_ghl_configs_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES crm_agencies(id) ON DELETE CASCADE;

-- agency_kpis: drop and recreate with CASCADE
ALTER TABLE agency_kpis DROP CONSTRAINT IF EXISTS agency_kpis_agency_id_fkey;
ALTER TABLE agency_kpis
  ADD CONSTRAINT agency_kpis_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES crm_agencies(id) ON DELETE CASCADE;

-- crm_tickets: drop and recreate with CASCADE
ALTER TABLE crm_tickets DROP CONSTRAINT IF EXISTS crm_tickets_agency_id_fkey;
ALTER TABLE crm_tickets
  ADD CONSTRAINT crm_tickets_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES crm_agencies(id) ON DELETE CASCADE;

-- crm_ticket_messages: drop and recreate with CASCADE (so deleting a ticket cascades to messages)
ALTER TABLE crm_ticket_messages DROP CONSTRAINT IF EXISTS crm_ticket_messages_ticket_id_fkey;
ALTER TABLE crm_ticket_messages
  ADD CONSTRAINT crm_ticket_messages_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES crm_tickets(id) ON DELETE CASCADE;
