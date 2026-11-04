# Lockdown tranche 1 — anon revoke + agency scoping (DRAFTS, 2026-11-04)

Two migrations, drafted per Charlie's spec. **Neither applies until the 72h anon
pg_stat_statements diff (window started 2026-11-04 13:55 CT, decides Saturday)
confirms scope AND Charlie gives explicit go.** Absent queryid = treat as live.

## Files
| What | File |
|---|---|
| ① anon revoke + log_form_activity RPC | `supabase/migrations/20261105000000_lockdown1_anon_revoke.sql` |
| ① rollback (exact pre-state regrant) | `supabase/rollbacks/20261105000000_rollback.sql` |
| ② agency scoping (18 tables) | `supabase/migrations/20261105001000_lockdown2_agency_scoping.sql` |
| ② rollback (recreates all 76 original policies) | `supabase/rollbacks/20261105001000_rollback.sql` |
| Smoke SQL (ran green 2026-11-04, BEGIN…ROLLBACK) | `supabase/smokes/lockdown{1,2}_smoke.sql` |

Pre-state evidence (captured live 2026-11-04, workspace memory):
`akhojh-anon-grants-pre-lockdown-2026-11-04.json` (51 grant rows),
`akhojh-policies-pre-lockdown-2026-11-04.json` (76 policies),
`akhojh-anon-pss-snapshot-2026-11-04.json` (anon caller evidence).

## ① anon revoke
- REVOKE ALL FROM anon on all 51 granted public tables (most carried wide default
  GRANTs incl. DELETE/TRUNCATE).
- Keep-list regranted: `agent_intake` INSERT, `uploaded_files` INSERT,
  `agency_intake_submissions` INSERT+SELECT (live agency intake form; its anon
  policies are already scoped: WITH CHECK agent_id/status conditions).
- `log_form_activity(uuid, text, text)` SECURITY DEFINER RPC created FIRST —
  FYM-App `src/lib/contracting/form-activity.ts` already calls it with a direct-insert
  fallback, so the RPC deploys ahead of the revoke with **zero frontend change**;
  the fallback dies silently once the revoke lands. Validates action ≤200 chars,
  details ≤4000, agent must exist.
- CP repo's own form pages (`src/pages/forms/*.tsx`) still direct-insert — that's
  the RETIRED site; dies with the redirect, no swap needed.

## ② agency scoping
- 18 tables, every true/public/anon policy dropped (76 total), replaced with:
  - `staff_all_<table>` — FOR ALL, `portal_is_staff()` USING+CHECK
  - Tier A agency policies via `portal_session_agency_ids()/names()` (recursive,
    sub-agencies included): agents/agent_pipeline/agent_lob_assignments SELECT-only;
    crm_tickets SELECT+INSERT own; crm_ticket_messages SELECT+INSERT via ticket;
    crm_notifications SELECT+UPDATE own; crm_agency_cross_sell SELECT;
    crm_business_intake SELECT+INSERT own.
  - Tier B staff-only (no agency access): activity_log, crm_pipeline(+history),
    crm_termination_log, crm_dba_*, crm_roster(+uploads), crm_templates,
    cross_sell_defaults.
- anon gets NO policies; service_role bypasses RLS (edge fns unaffected).

## Smoke results (2026-11-04, all inside BEGIN…ROLLBACK, nothing persisted)
- ①: anon keep-list inserts land; log_form_activity works as anon; anon SELECT
  agents / INSERT activity_log / SELECT new_hires all `permission denied`;
  post-rollback: fn absent, 0 smoke rows.
- ②: staff sees exact admin counts; FYM agency session sees exactly its tree
  (367 agents / 115 agencies — Wisechoice is INSIDE FYM's tree, Aspire is not);
  disjoint-agency rows invisible; cross-agency ticket INSERT 42501; agency
  UPDATE on agents = 0 rows; anon sees 0 rows; post-rollback: new policies gone,
  originals intact.

## Known judgment calls for review (flag before Saturday apply)
1. Tables with deliberate-looking anon policies that ① still revokes — confirm
   dead via the 72h diff: agent_hub_logins, agent_live_attendance/sessions,
   agent_training_content/events, agent_production, agent_writing_number_submissions,
   agent_pipeline anon SELECT/UPDATE, _hierarchy_agencies anon read/update,
   agency_kpis, agency_cancellation*, crm_* anon reads, webhook_log anon select.
2. Agency write surfaces kept minimal (tickets/messages/notifications/business
   intake). If the agency portal writes anything else directly, the 72h diff or
   Charlie's review should surface it.
3. FYM house-agency portal session sees ~all agents by design (103 agencies chain
   under FYM in `_hierarchy_agencies`). If FYM-the-agency shouldn't get portal
   tree access, that's a hierarchy data question, not a policy one.
4. Apply order: ② before or with ①; the log_form_activity RPC must exist before
   ①'s activity_log revoke (same file, ordered correctly).
