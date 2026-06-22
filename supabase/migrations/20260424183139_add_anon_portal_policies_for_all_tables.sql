/*
  # Add anon (portal) RLS policies for all portal-facing tables

  1. Context
    - Agency portal pages are accessed by unauthenticated visitors (anon role)
    - These visitors need to read/write data in several tables for the portal
      dashboard, agents tab, tickets tab, and onboarding flow to function

  2. Tables receiving new anon policies
    - `agency_kpis` - SELECT (portal dashboard KPI display)
    - `crm_pipeline` - SELECT, INSERT, UPDATE (portal agents tab)
    - `crm_notifications` - SELECT, INSERT (portal dashboard + onboarding notifications)
    - `crm_templates` - SELECT (onboarding template display)
    - `crm_roster_uploads` - SELECT, INSERT, DELETE (onboarding roster management)
    - `crm_roster` - INSERT, DELETE (onboarding roster data)
    - `crm_dba_uploads` - SELECT, INSERT, DELETE (onboarding DBA uploads)
    - `crm_dba_rows` - INSERT (onboarding DBA row data)
    - `crm_agencies` - UPDATE (onboarding status updates)

  3. Important Notes
    - Existing authenticated policies remain unchanged
    - crm_tickets and crm_ticket_messages already have anon policies
    - All policies use permissive mode
*/

-- agency_kpis: portal dashboard reads KPIs
CREATE POLICY "Anon users can read agency kpis"
  ON agency_kpis
  FOR SELECT
  TO anon
  USING (true);

-- crm_pipeline: portal agents tab reads, creates, and updates pipeline entries
CREATE POLICY "Anon users can read pipeline"
  ON crm_pipeline
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert pipeline"
  ON crm_pipeline
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update pipeline"
  ON crm_pipeline
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- crm_notifications: portal dashboard reads, onboarding creates
CREATE POLICY "Anon users can read notifications"
  ON crm_notifications
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert notifications"
  ON crm_notifications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- crm_templates: onboarding view reads templates
CREATE POLICY "Anon users can read templates"
  ON crm_templates
  FOR SELECT
  TO anon
  USING (true);

-- crm_roster_uploads: onboarding roster management
CREATE POLICY "Anon users can read roster uploads"
  ON crm_roster_uploads
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert roster uploads"
  ON crm_roster_uploads
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can delete roster uploads"
  ON crm_roster_uploads
  FOR DELETE
  TO anon
  USING (true);

-- crm_roster: onboarding roster data
CREATE POLICY "Anon users can insert roster entries"
  ON crm_roster
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can delete roster entries"
  ON crm_roster
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon users can read roster entries"
  ON crm_roster
  FOR SELECT
  TO anon
  USING (true);

-- crm_dba_uploads: onboarding DBA file management
CREATE POLICY "Anon users can read dba uploads"
  ON crm_dba_uploads
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert dba uploads"
  ON crm_dba_uploads
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can delete dba uploads"
  ON crm_dba_uploads
  FOR DELETE
  TO anon
  USING (true);

-- crm_dba_rows: onboarding DBA row data
CREATE POLICY "Anon users can insert dba rows"
  ON crm_dba_rows
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- crm_agencies: onboarding status updates from portal
CREATE POLICY "Anon users can update active agencies"
  ON crm_agencies
  FOR UPDATE
  TO anon
  USING (is_active = true)
  WITH CHECK (is_active = true);
