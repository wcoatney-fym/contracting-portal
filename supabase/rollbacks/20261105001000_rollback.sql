-- ROLLBACK for 20261105001000_lockdown2_agency_scoping.sql
-- Drops the lockdown policies and recreates the exact pre-migration policies
-- (captured live 2026-11-04 from pg_policies).


-- ===== activity_log =====
DROP POLICY IF EXISTS "staff_all_activity_log" ON public.activity_log;
CREATE POLICY "Allow all access to activity_log" ON public.activity_log FOR ALL USING (true) WITH CHECK (true);

-- ===== agent_lob_assignments =====
DROP POLICY IF EXISTS "staff_all_agent_lob_assignments" ON public.agent_lob_assignments;
DROP POLICY IF EXISTS "agency_select_own_lob" ON public.agent_lob_assignments;
CREATE POLICY "Allow delete on agent_lob_assignments" ON public.agent_lob_assignments FOR DELETE USING (true);
CREATE POLICY "Allow insert on agent_lob_assignments" ON public.agent_lob_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select on agent_lob_assignments" ON public.agent_lob_assignments FOR SELECT USING (true);
CREATE POLICY "Allow update on agent_lob_assignments" ON public.agent_lob_assignments FOR UPDATE USING (true) WITH CHECK (true);

-- ===== agent_pipeline =====
DROP POLICY IF EXISTS "staff_all_agent_pipeline" ON public.agent_pipeline;
DROP POLICY IF EXISTS "agency_select_own_pipeline" ON public.agent_pipeline;
CREATE POLICY "anon_insert_agent_pipeline" ON public.agent_pipeline FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_select_agent_pipeline" ON public.agent_pipeline FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_update_agent_pipeline" ON public.agent_pipeline FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_agent_pipeline" ON public.agent_pipeline FOR DELETE TO authenticated USING (true);

-- ===== agents =====
DROP POLICY IF EXISTS "staff_all_agents" ON public.agents;
DROP POLICY IF EXISTS "agency_select_own_agents" ON public.agents;
CREATE POLICY "Allow all access to agents" ON public.agents FOR ALL USING (true) WITH CHECK (true);

-- ===== crm_agency_cross_sell =====
DROP POLICY IF EXISTS "staff_all_crm_agency_cross_sell" ON public.crm_agency_cross_sell;
DROP POLICY IF EXISTS "agency_select_own_cross_sell" ON public.crm_agency_cross_sell;
CREATE POLICY "Anon users can read agency cross sell" ON public.crm_agency_cross_sell FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can insert agency cross sell" ON public.crm_agency_cross_sell FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read agency cross sell" ON public.crm_agency_cross_sell FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update agency cross sell" ON public.crm_agency_cross_sell FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

-- ===== crm_business_intake =====
DROP POLICY IF EXISTS "staff_all_crm_business_intake" ON public.crm_business_intake;
DROP POLICY IF EXISTS "agency_select_own_business_intake" ON public.crm_business_intake;
DROP POLICY IF EXISTS "agency_insert_own_business_intake" ON public.crm_business_intake;
CREATE POLICY "Allow read" ON public.crm_business_intake FOR SELECT TO anon USING (true);

-- ===== crm_dba_rows =====
DROP POLICY IF EXISTS "staff_all_crm_dba_rows" ON public.crm_dba_rows;
CREATE POLICY "Authenticated users can delete dba rows" ON public.crm_dba_rows FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert dba rows" ON public.crm_dba_rows FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read dba rows" ON public.crm_dba_rows FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));

-- ===== crm_dba_uploads =====
DROP POLICY IF EXISTS "staff_all_crm_dba_uploads" ON public.crm_dba_uploads;
CREATE POLICY "Anon users can insert dba uploads" ON public.crm_dba_uploads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can read dba uploads" ON public.crm_dba_uploads FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can delete dba uploads" ON public.crm_dba_uploads FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert dba uploads" ON public.crm_dba_uploads FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read dba uploads" ON public.crm_dba_uploads FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update dba uploads" ON public.crm_dba_uploads FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

-- ===== crm_notifications =====
DROP POLICY IF EXISTS "staff_all_crm_notifications" ON public.crm_notifications;
DROP POLICY IF EXISTS "agency_select_own_notifications" ON public.crm_notifications;
DROP POLICY IF EXISTS "agency_update_own_notifications" ON public.crm_notifications;
CREATE POLICY "Anon users can insert notifications" ON public.crm_notifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can read notifications" ON public.crm_notifications FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can delete notifications" ON public.crm_notifications FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert notifications" ON public.crm_notifications FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read notifications" ON public.crm_notifications FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update notifications" ON public.crm_notifications FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

-- ===== crm_pipeline =====
DROP POLICY IF EXISTS "staff_all_crm_pipeline" ON public.crm_pipeline;
CREATE POLICY "Anon users can read pipeline" ON public.crm_pipeline FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can delete pipeline" ON public.crm_pipeline FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert pipeline" ON public.crm_pipeline FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read pipeline" ON public.crm_pipeline FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update pipeline" ON public.crm_pipeline FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

-- ===== crm_pipeline_history =====
DROP POLICY IF EXISTS "staff_all_crm_pipeline_history" ON public.crm_pipeline_history;
CREATE POLICY "Anon users can insert pipeline history" ON public.crm_pipeline_history FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can read pipeline history" ON public.crm_pipeline_history FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can update pipeline history" ON public.crm_pipeline_history FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert pipeline history" ON public.crm_pipeline_history FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read pipeline history" ON public.crm_pipeline_history FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update pipeline history" ON public.crm_pipeline_history FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

-- ===== crm_roster =====
DROP POLICY IF EXISTS "staff_all_crm_roster" ON public.crm_roster;
CREATE POLICY "Anon users can insert roster entries" ON public.crm_roster FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can read roster entries" ON public.crm_roster FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can update roster entries" ON public.crm_roster FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete roster entries" ON public.crm_roster FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert roster entries" ON public.crm_roster FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update roster entries" ON public.crm_roster FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view roster entries" ON public.crm_roster FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));

-- ===== crm_roster_uploads =====
DROP POLICY IF EXISTS "staff_all_crm_roster_uploads" ON public.crm_roster_uploads;
CREATE POLICY "Anon users can insert roster uploads" ON public.crm_roster_uploads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can read roster uploads" ON public.crm_roster_uploads FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can delete roster uploads" ON public.crm_roster_uploads FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert roster uploads" ON public.crm_roster_uploads FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view roster uploads" ON public.crm_roster_uploads FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));

-- ===== crm_templates =====
DROP POLICY IF EXISTS "staff_all_crm_templates" ON public.crm_templates;
CREATE POLICY "Anon users can read templates" ON public.crm_templates FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can delete templates" ON public.crm_templates FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can insert templates" ON public.crm_templates FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read templates" ON public.crm_templates FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update templates" ON public.crm_templates FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

-- ===== crm_termination_log =====
DROP POLICY IF EXISTS "staff_all_crm_termination_log" ON public.crm_termination_log;
CREATE POLICY "Anon users can insert termination log" ON public.crm_termination_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can read termination log" ON public.crm_termination_log FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can insert termination log" ON public.crm_termination_log FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read termination log" ON public.crm_termination_log FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));

-- ===== crm_ticket_messages =====
DROP POLICY IF EXISTS "staff_all_crm_ticket_messages" ON public.crm_ticket_messages;
DROP POLICY IF EXISTS "agency_select_own_ticket_msgs" ON public.crm_ticket_messages;
DROP POLICY IF EXISTS "agency_insert_own_ticket_msgs" ON public.crm_ticket_messages;
CREATE POLICY "Anon users can insert ticket messages" ON public.crm_ticket_messages FOR INSERT TO anon WITH CHECK ((true = true));
CREATE POLICY "Anon users can read ticket messages" ON public.crm_ticket_messages FOR SELECT TO anon USING ((true = true));
CREATE POLICY "Authenticated users can insert ticket messages" ON public.crm_ticket_messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read ticket messages" ON public.crm_ticket_messages FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));

-- ===== crm_tickets =====
DROP POLICY IF EXISTS "staff_all_crm_tickets" ON public.crm_tickets;
DROP POLICY IF EXISTS "agency_select_own_tickets" ON public.crm_tickets;
DROP POLICY IF EXISTS "agency_insert_own_tickets" ON public.crm_tickets;
CREATE POLICY "Anon users can insert tickets" ON public.crm_tickets FOR INSERT TO anon WITH CHECK ((true = true));
CREATE POLICY "Anon users can read tickets" ON public.crm_tickets FOR SELECT TO anon USING ((true = true));
CREATE POLICY "Anon users can update tickets" ON public.crm_tickets FOR UPDATE TO anon USING ((true = true)) WITH CHECK ((true = true));
CREATE POLICY "Authenticated users can insert tickets" ON public.crm_tickets FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read tickets" ON public.crm_tickets FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update tickets" ON public.crm_tickets FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

-- ===== cross_sell_defaults =====
DROP POLICY IF EXISTS "staff_all_cross_sell_defaults" ON public.cross_sell_defaults;
CREATE POLICY "Anon users can read cross sell defaults" ON public.cross_sell_defaults FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can insert cross sell defaults" ON public.cross_sell_defaults FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can read cross sell defaults" ON public.cross_sell_defaults FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can update cross sell defaults" ON public.cross_sell_defaults FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));
