BEGIN;
-- LOCKDOWN ① — anon revoke + log_form_activity RPC
-- DRAFT — do not apply until the 72h anon pg_stat_statements diff (Saturday) confirms scope
-- and Charlie gives explicit go. Evidence snapshot: memory/akhojh-anon-pss-snapshot-2026-11-04.json.
--
-- Keeps anon: agent_intake INSERT, uploaded_files INSERT,
--             agency_intake_submissions INSERT+SELECT (live agency intake form,
--             scoped policies anon_insert_agency_intake / anon_select_own_agency_intake).
-- Everything else: REVOKE ALL FROM anon (49 tables carried wide default GRANTs).
--
-- activity_log anon writes are replaced by the SECURITY DEFINER RPC below.
-- FYM-App's form helper (src/lib/contracting/form-activity.ts) ALREADY calls
-- log_form_activity first and only falls back to direct insert — so the RPC can
-- deploy ahead of the revoke with zero frontend change, and the fallback dies
-- silently when the revoke lands. Rollback: supabase/rollbacks/20261105000000_rollback.sql

-- 1) RPC first (matches the FYM-App helper signature exactly)
CREATE OR REPLACE FUNCTION public.log_form_activity(p_agent_id uuid, p_action text, p_details text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_action IS NULL OR length(p_action) = 0 OR length(p_action) > 200 THEN
    RAISE EXCEPTION 'invalid action' USING ERRCODE = '22023';
  END IF;
  IF p_details IS NULL OR length(p_details) > 4000 THEN
    RAISE EXCEPTION 'invalid details' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agents WHERE id = p_agent_id) THEN
    RAISE EXCEPTION 'unknown agent' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.activity_log (agent_id, action, details)
  VALUES (p_agent_id, p_action, p_details);
END;
$$;
REVOKE ALL ON FUNCTION public.log_form_activity(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_form_activity(uuid, text, text) TO anon, authenticated, service_role;

-- 2) Revoke anon everywhere, regrant the keep-list

REVOKE ALL ON public.activity_log FROM anon;
REVOKE ALL ON public.agency_cancellation_uploads FROM anon;
REVOKE ALL ON public.agency_cancellations FROM anon;
REVOKE ALL ON public.agency_deals FROM anon;
REVOKE ALL ON public.agency_intake_submissions FROM anon;
REVOKE ALL ON public.agency_revenue_log FROM anon;
REVOKE ALL ON public.agent_hub_logins FROM anon;
REVOKE ALL ON public.agent_intake FROM anon;
REVOKE ALL ON public.agent_live_attendance FROM anon;
REVOKE ALL ON public.agent_live_sessions FROM anon;
REVOKE ALL ON public.agent_lob_assignments FROM anon;
REVOKE ALL ON public.agent_pipeline FROM anon;
REVOKE ALL ON public.agent_pipeline_ghl_config FROM anon;
REVOKE ALL ON public.agent_pipeline_stage_map FROM anon;
REVOKE ALL ON public.agent_pipeline_stage_steps FROM anon;
REVOKE ALL ON public.agent_production FROM anon;
REVOKE ALL ON public.agent_step_completions FROM anon;
REVOKE ALL ON public.agent_training_content FROM anon;
REVOKE ALL ON public.agent_training_events FROM anon;
REVOKE ALL ON public.agent_writing_number_submissions FROM anon;
REVOKE ALL ON public.agents FROM anon;
REVOKE ALL ON public.cc_agency_crosswalk FROM anon;
REVOKE ALL ON public.cc_reconciliation_issues FROM anon;
REVOKE ALL ON public.cc_skill_events FROM anon;
REVOKE ALL ON public.cc_task_assignees FROM anon;
REVOKE ALL ON public.cc_tasks FROM anon;
REVOKE ALL ON public.cc_team_member_skills FROM anon;
REVOKE ALL ON public.cc_team_members FROM anon;
REVOKE ALL ON public.crm_agency_cross_sell FROM anon;
REVOKE ALL ON public.crm_business_intake FROM anon;
REVOKE ALL ON public.crm_dba_rows FROM anon;
REVOKE ALL ON public.crm_dba_uploads FROM anon;
REVOKE ALL ON public.crm_notifications FROM anon;
REVOKE ALL ON public.crm_pipeline FROM anon;
REVOKE ALL ON public.crm_pipeline_history FROM anon;
REVOKE ALL ON public.crm_roster FROM anon;
REVOKE ALL ON public.crm_roster_uploads FROM anon;
REVOKE ALL ON public.crm_templates FROM anon;
REVOKE ALL ON public.crm_termination_log FROM anon;
REVOKE ALL ON public.crm_ticket_messages FROM anon;
REVOKE ALL ON public.crm_tickets FROM anon;
REVOKE ALL ON public.cross_sell_defaults FROM anon;
REVOKE ALL ON public.dashboard_snapshots FROM anon;
REVOKE ALL ON public.ghl_custom_field_map FROM anon;
REVOKE ALL ON public.ghl_sync_log FROM anon;
REVOKE ALL ON public.hierarchy_agencies FROM anon;
REVOKE ALL ON public.new_hires FROM anon;
REVOKE ALL ON public.pipeline_stage_history FROM anon;
REVOKE ALL ON public.specialist_change_requests FROM anon;
REVOKE ALL ON public.uploaded_files FROM anon;
REVOKE ALL ON public.webhook_log FROM anon;
GRANT INSERT ON public.agent_intake TO anon;
GRANT INSERT ON public.uploaded_files TO anon;
GRANT INSERT, SELECT ON public.agency_intake_submissions TO anon;

-- anon: keep-list inserts must work
SET LOCAL role anon;
INSERT INTO public.agent_intake (agent_id, date_of_birth, address, city, state, postal_code, ssn, resident_license_number, npn, resident_state, release_needed)
VALUES ('d6fe7763-adec-4acc-9d72-0f269be15025','1990-01-01','1 Smoke St','Austin','TX','78701','000-00-0000','SMOKE-LIC','0000000','TX','no');
INSERT INTO public.uploaded_files (file_name, file_type, file_data) VALUES ('smoke.txt','text/plain','c21va2U=');
INSERT INTO public.agency_intake_submissions (agency_name, agency_npn, agency_ein, principal_agent, principal_agent_npn, contracting_email)
VALUES ('SMOKE AGENCY','0000000','00-0000000','Smoke Tester','0000000','smoke@test.teamfym.com');
-- anon: RPC write works (uses a real agent id via definer; validate with Tester's akhojh agent)
SELECT public.log_form_activity('d6fe7763-adec-4acc-9d72-0f269be15025','smoke-test','lockdown1 smoke');
-- anon: revoked tables are dead at the grant layer
DO $d1$ DECLARE msg text; BEGIN
  PERFORM count(*) FROM public.agents;
  RAISE EXCEPTION 'ASSERT FAIL: anon SELECT agents still allowed';
EXCEPTION WHEN insufficient_privilege THEN
  GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
  IF msg NOT LIKE '%permission denied%' THEN RAISE EXCEPTION 'unexpected: %', msg; END IF;
END $d1$;
DO $d2$ BEGIN
  INSERT INTO public.activity_log (agent_id, action, details) VALUES ('d6fe7763-adec-4acc-9d72-0f269be15025','x','y');
  RAISE EXCEPTION 'ASSERT FAIL: anon direct INSERT activity_log still allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $d2$;
DO $d3$ BEGIN
  PERFORM count(*) FROM public.new_hires;
  RAISE EXCEPTION 'ASSERT FAIL: anon SELECT new_hires still allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $d3$;
RESET role;
-- verify the three anon inserts + RPC write landed inside txn
DO $v1$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.activity_log WHERE action='smoke-test';
  IF n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL: RPC write missing'; END IF;
  SELECT count(*) INTO n FROM public.agent_intake WHERE resident_license_number='SMOKE-LIC';
  IF n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL: agent_intake insert missing'; END IF;
END $v1$;
ROLLBACK;
SELECT
  (SELECT count(*) FROM public.activity_log WHERE action='smoke-test') AS rpc_rows_after_rb,
  (SELECT count(*) FROM public.agent_intake WHERE resident_license_number='SMOKE-LIC') AS intake_rows_after_rb,
  (SELECT count(*) FROM pg_proc WHERE proname='log_form_activity') AS fn_after_rb,
  'lockdown1 smoke green' AS verdict;
