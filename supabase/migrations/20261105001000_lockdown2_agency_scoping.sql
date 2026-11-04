-- LOCKDOWN ② — agency scoping: portal_is_staff() OR own agency
-- DRAFT — do not apply until the 72h diff confirms scope and Charlie gives explicit go.
-- Replaces every true/public/anon policy on 18 tables with:
--   * staff: FOR ALL via portal_is_staff() (USING + WITH CHECK)
--   * agency sessions: own-agency rows only, via portal_session_agency_ids()/names()
--     (SECURITY DEFINER helpers, recursive — sub-agencies included)
--   * Tier B (CRM ops tooling + activity_log): staff-only, no agency access
-- anon gets NO policies here — combined with lockdown ①'s grant revoke, anon is dead
-- on all 18 tables. service_role bypasses RLS (edge fns unaffected).
-- Exact pre-migration policy definitions: memory/akhojh-policies-pre-lockdown-2026-11-04.json
-- Rollback: supabase/rollbacks/20261105001000_rollback.sql


-- ===== activity_log =====
DROP POLICY IF EXISTS "Allow all access to activity_log" ON public.activity_log;
CREATE POLICY "staff_all_activity_log" ON public.activity_log FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

-- ===== agent_lob_assignments =====
DROP POLICY IF EXISTS "Allow delete on agent_lob_assignments" ON public.agent_lob_assignments;
DROP POLICY IF EXISTS "Allow insert on agent_lob_assignments" ON public.agent_lob_assignments;
DROP POLICY IF EXISTS "Allow select on agent_lob_assignments" ON public.agent_lob_assignments;
DROP POLICY IF EXISTS "Allow update on agent_lob_assignments" ON public.agent_lob_assignments;
CREATE POLICY "staff_all_agent_lob_assignments" ON public.agent_lob_assignments FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());
CREATE POLICY "agency_select_own_lob" ON public.agent_lob_assignments FOR SELECT TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE agency IN (SELECT public.portal_session_agency_names())));

-- ===== agent_pipeline =====
DROP POLICY IF EXISTS "anon_insert_agent_pipeline" ON public.agent_pipeline;
DROP POLICY IF EXISTS "anon_select_agent_pipeline" ON public.agent_pipeline;
DROP POLICY IF EXISTS "anon_update_agent_pipeline" ON public.agent_pipeline;
DROP POLICY IF EXISTS "authenticated_delete_agent_pipeline" ON public.agent_pipeline;
CREATE POLICY "staff_all_agent_pipeline" ON public.agent_pipeline FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());
CREATE POLICY "agency_select_own_pipeline" ON public.agent_pipeline FOR SELECT TO authenticated USING ((agency_id IN (SELECT public.portal_session_agency_ids()) OR agency IN (SELECT public.portal_session_agency_names())));

-- ===== agents =====
DROP POLICY IF EXISTS "Allow all access to agents" ON public.agents;
CREATE POLICY "staff_all_agents" ON public.agents FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());
CREATE POLICY "agency_select_own_agents" ON public.agents FOR SELECT TO authenticated USING (agency IN (SELECT public.portal_session_agency_names()));

-- ===== crm_agency_cross_sell =====
DROP POLICY IF EXISTS "Anon users can read agency cross sell" ON public.crm_agency_cross_sell;
DROP POLICY IF EXISTS "Authenticated users can insert agency cross sell" ON public.crm_agency_cross_sell;
DROP POLICY IF EXISTS "Authenticated users can read agency cross sell" ON public.crm_agency_cross_sell;
DROP POLICY IF EXISTS "Authenticated users can update agency cross sell" ON public.crm_agency_cross_sell;
CREATE POLICY "staff_all_crm_agency_cross_sell" ON public.crm_agency_cross_sell FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());
CREATE POLICY "agency_select_own_cross_sell" ON public.crm_agency_cross_sell FOR SELECT TO authenticated USING (agency_id IN (SELECT public.portal_session_agency_ids()));

-- ===== crm_business_intake =====
DROP POLICY IF EXISTS "Allow read" ON public.crm_business_intake;
CREATE POLICY "staff_all_crm_business_intake" ON public.crm_business_intake FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());
CREATE POLICY "agency_select_own_business_intake" ON public.crm_business_intake FOR SELECT TO authenticated USING (agency_id IN (SELECT public.portal_session_agency_ids()));
CREATE POLICY "agency_insert_own_business_intake" ON public.crm_business_intake FOR INSERT TO authenticated WITH CHECK (agency_id IN (SELECT public.portal_session_agency_ids()));

-- ===== crm_dba_rows =====
DROP POLICY IF EXISTS "Authenticated users can delete dba rows" ON public.crm_dba_rows;
DROP POLICY IF EXISTS "Authenticated users can insert dba rows" ON public.crm_dba_rows;
DROP POLICY IF EXISTS "Authenticated users can read dba rows" ON public.crm_dba_rows;
CREATE POLICY "staff_all_crm_dba_rows" ON public.crm_dba_rows FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

-- ===== crm_dba_uploads =====
DROP POLICY IF EXISTS "Anon users can insert dba uploads" ON public.crm_dba_uploads;
DROP POLICY IF EXISTS "Anon users can read dba uploads" ON public.crm_dba_uploads;
DROP POLICY IF EXISTS "Authenticated users can delete dba uploads" ON public.crm_dba_uploads;
DROP POLICY IF EXISTS "Authenticated users can insert dba uploads" ON public.crm_dba_uploads;
DROP POLICY IF EXISTS "Authenticated users can read dba uploads" ON public.crm_dba_uploads;
DROP POLICY IF EXISTS "Authenticated users can update dba uploads" ON public.crm_dba_uploads;
CREATE POLICY "staff_all_crm_dba_uploads" ON public.crm_dba_uploads FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

-- ===== crm_notifications =====
DROP POLICY IF EXISTS "Anon users can insert notifications" ON public.crm_notifications;
DROP POLICY IF EXISTS "Anon users can read notifications" ON public.crm_notifications;
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON public.crm_notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.crm_notifications;
DROP POLICY IF EXISTS "Authenticated users can read notifications" ON public.crm_notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.crm_notifications;
CREATE POLICY "staff_all_crm_notifications" ON public.crm_notifications FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());
CREATE POLICY "agency_select_own_notifications" ON public.crm_notifications FOR SELECT TO authenticated USING (agency_id IN (SELECT public.portal_session_agency_ids()));
CREATE POLICY "agency_update_own_notifications" ON public.crm_notifications FOR UPDATE TO authenticated USING (agency_id IN (SELECT public.portal_session_agency_ids())) WITH CHECK (agency_id IN (SELECT public.portal_session_agency_ids()));

-- ===== crm_pipeline =====
DROP POLICY IF EXISTS "Anon users can read pipeline" ON public.crm_pipeline;
DROP POLICY IF EXISTS "Authenticated users can delete pipeline" ON public.crm_pipeline;
DROP POLICY IF EXISTS "Authenticated users can insert pipeline" ON public.crm_pipeline;
DROP POLICY IF EXISTS "Authenticated users can read pipeline" ON public.crm_pipeline;
DROP POLICY IF EXISTS "Authenticated users can update pipeline" ON public.crm_pipeline;
CREATE POLICY "staff_all_crm_pipeline" ON public.crm_pipeline FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

-- ===== crm_pipeline_history =====
DROP POLICY IF EXISTS "Anon users can insert pipeline history" ON public.crm_pipeline_history;
DROP POLICY IF EXISTS "Anon users can read pipeline history" ON public.crm_pipeline_history;
DROP POLICY IF EXISTS "Anon users can update pipeline history" ON public.crm_pipeline_history;
DROP POLICY IF EXISTS "Authenticated users can insert pipeline history" ON public.crm_pipeline_history;
DROP POLICY IF EXISTS "Authenticated users can read pipeline history" ON public.crm_pipeline_history;
DROP POLICY IF EXISTS "Authenticated users can update pipeline history" ON public.crm_pipeline_history;
CREATE POLICY "staff_all_crm_pipeline_history" ON public.crm_pipeline_history FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

-- ===== crm_roster =====
DROP POLICY IF EXISTS "Anon users can insert roster entries" ON public.crm_roster;
DROP POLICY IF EXISTS "Anon users can read roster entries" ON public.crm_roster;
DROP POLICY IF EXISTS "Anon users can update roster entries" ON public.crm_roster;
DROP POLICY IF EXISTS "Authenticated users can delete roster entries" ON public.crm_roster;
DROP POLICY IF EXISTS "Authenticated users can insert roster entries" ON public.crm_roster;
DROP POLICY IF EXISTS "Authenticated users can update roster entries" ON public.crm_roster;
DROP POLICY IF EXISTS "Authenticated users can view roster entries" ON public.crm_roster;
CREATE POLICY "staff_all_crm_roster" ON public.crm_roster FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

-- ===== crm_roster_uploads =====
DROP POLICY IF EXISTS "Anon users can insert roster uploads" ON public.crm_roster_uploads;
DROP POLICY IF EXISTS "Anon users can read roster uploads" ON public.crm_roster_uploads;
DROP POLICY IF EXISTS "Authenticated users can delete roster uploads" ON public.crm_roster_uploads;
DROP POLICY IF EXISTS "Authenticated users can insert roster uploads" ON public.crm_roster_uploads;
DROP POLICY IF EXISTS "Authenticated users can view roster uploads" ON public.crm_roster_uploads;
CREATE POLICY "staff_all_crm_roster_uploads" ON public.crm_roster_uploads FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

-- ===== crm_templates =====
DROP POLICY IF EXISTS "Anon users can read templates" ON public.crm_templates;
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON public.crm_templates;
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON public.crm_templates;
DROP POLICY IF EXISTS "Authenticated users can read templates" ON public.crm_templates;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON public.crm_templates;
CREATE POLICY "staff_all_crm_templates" ON public.crm_templates FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

-- ===== crm_termination_log =====
DROP POLICY IF EXISTS "Anon users can insert termination log" ON public.crm_termination_log;
DROP POLICY IF EXISTS "Anon users can read termination log" ON public.crm_termination_log;
DROP POLICY IF EXISTS "Authenticated users can insert termination log" ON public.crm_termination_log;
DROP POLICY IF EXISTS "Authenticated users can read termination log" ON public.crm_termination_log;
CREATE POLICY "staff_all_crm_termination_log" ON public.crm_termination_log FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

-- ===== crm_ticket_messages =====
DROP POLICY IF EXISTS "Anon users can insert ticket messages" ON public.crm_ticket_messages;
DROP POLICY IF EXISTS "Anon users can read ticket messages" ON public.crm_ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can insert ticket messages" ON public.crm_ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can read ticket messages" ON public.crm_ticket_messages;
CREATE POLICY "staff_all_crm_ticket_messages" ON public.crm_ticket_messages FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());
CREATE POLICY "agency_select_own_ticket_msgs" ON public.crm_ticket_messages FOR SELECT TO authenticated USING (ticket_id IN (SELECT id FROM public.crm_tickets WHERE agency_id IN (SELECT public.portal_session_agency_ids())));
CREATE POLICY "agency_insert_own_ticket_msgs" ON public.crm_ticket_messages FOR INSERT TO authenticated WITH CHECK (ticket_id IN (SELECT id FROM public.crm_tickets WHERE agency_id IN (SELECT public.portal_session_agency_ids())));

-- ===== crm_tickets =====
DROP POLICY IF EXISTS "Anon users can insert tickets" ON public.crm_tickets;
DROP POLICY IF EXISTS "Anon users can read tickets" ON public.crm_tickets;
DROP POLICY IF EXISTS "Anon users can update tickets" ON public.crm_tickets;
DROP POLICY IF EXISTS "Authenticated users can insert tickets" ON public.crm_tickets;
DROP POLICY IF EXISTS "Authenticated users can read tickets" ON public.crm_tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON public.crm_tickets;
CREATE POLICY "staff_all_crm_tickets" ON public.crm_tickets FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());
CREATE POLICY "agency_select_own_tickets" ON public.crm_tickets FOR SELECT TO authenticated USING (agency_id IN (SELECT public.portal_session_agency_ids()));
CREATE POLICY "agency_insert_own_tickets" ON public.crm_tickets FOR INSERT TO authenticated WITH CHECK (agency_id IN (SELECT public.portal_session_agency_ids()));

-- ===== cross_sell_defaults =====
DROP POLICY IF EXISTS "Anon users can read cross sell defaults" ON public.cross_sell_defaults;
DROP POLICY IF EXISTS "Authenticated users can insert cross sell defaults" ON public.cross_sell_defaults;
DROP POLICY IF EXISTS "Authenticated users can read cross sell defaults" ON public.cross_sell_defaults;
DROP POLICY IF EXISTS "Authenticated users can update cross sell defaults" ON public.cross_sell_defaults;
CREATE POLICY "staff_all_cross_sell_defaults" ON public.cross_sell_defaults FOR ALL TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());
