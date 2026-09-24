-- ============================================================================
-- DRAFT — NOT YET APPROVED FOR EXECUTION
-- ============================================================================
-- This file is a reference draft, not a live migration. It is intentionally
-- named without a timestamp prefix so Supabase migration tooling will NOT
-- pick it up and run it automatically. Do not rename/timestamp this file
-- until Charlie (and anyone else looped in — Zach/Max's replacement, given
-- the revenue data touched below) has explicitly approved running it at
-- this exact scope, on a scheduled/reviewed window.
--
-- Drafted: 2026-09-24, Diamond, per Charlie (#dev-fym-app,
-- thread 1790174871.947199), following discovery during lifecycle-sync
-- (PR #690/#691) testing.
--
-- ----------------------------------------------------------------------------
-- PROBLEM
-- ----------------------------------------------------------------------------
-- FYM's own house agency has two different UUIDs in two different
-- databases, both representing the same agency ("FYM" / fym_id
-- FYM-A-000150):
--
--   Portal DB (akhojhncsswyzcnicedt) `_hierarchy_agencies.id`:
--     723620b6-0297-4690-a9ad-52c18945fdb4
--     (name: 'FYM', agency_type: 'main', is_active: true)
--
--   FYM App DB (rcbzagjyhyrkuwvlrlnf) `agencies.id`:
--     338230f2-2058-407c-9507-5aa88d6d5e14
--     (name: 'FYM', fym_id: 'FYM-A-000150')
--
-- Charlie's decision (2026-09-24): "the app should be the source of
-- truth" — the Portal DB's ID gets updated to match the App DB's ID, not
-- the other way around.
--
-- `_hierarchy_agencies` is the real base table (NOT the `hierarchy_agencies`
-- view, which only reflects rows correctly for legacy data and caused
-- earlier false confidence during scoping). It carries a leftover
-- UNIQUE constraint `crm_agencies_name_key` on `name` (evidence the table
-- was renamed at some point from `crm_agencies`), which is why a same-named
-- INSERT of a new row under the App's ID fails — this MUST be an in-place
-- UPDATE of the existing row's primary key, not an insert.
--
-- ----------------------------------------------------------------------------
-- BLAST RADIUS (verified counts as of 2026-09-24 — RE-VERIFY before running,
-- do not trust these numbers if run more than a few days after this draft)
-- ----------------------------------------------------------------------------
--   _hierarchy_agencies      1 row  (the agency row itself — PK update)
--   agency_deals          8,299 rows  (GHL opportunity sync cache — CRM Ops tab)
--   agency_clients        1,315 rows  (client/policy records)
--   agency_kpis              416 rows  (computed KPI snapshots)
--   agent_pipeline           744 rows  (contracting pipeline — the originally
--                                       scoped table; DO NOT treat this as
--                                       the full scope, see below)
--   crm_tickets               11 rows
--   crm_agency_cross_sell      5 rows
--   agent_production          2 rows
--   agency_ghl_configs        1 row
--   ------------------------------------
--   TOTAL                ~10,800 rows across 17 8 dependent tables + the
--                         agency row itself
--
-- NOTE: the original approval Charlie gave (2026-09-24, earlier in this
-- thread) was scoped to "744 agent_pipeline rows" only, before the full FK
-- fan-out was discovered. This migration is intentionally NOT run under
-- that approval — it requires a fresh, scope-accurate sign-off at the
-- ~10,800-row / 17-table scope shown above, given agency_deals and
-- agency_clients carry real revenue/production data.
--
-- ----------------------------------------------------------------------------
-- APPROACH
-- ----------------------------------------------------------------------------
-- Single transaction, all-or-nothing. Postgres will let us UPDATE the
-- referenced row's PK and have `ON UPDATE CASCADE` handle dependents ONLY
-- IF the FKs are defined with that clause — they are NOT (verified 2026-09-24,
-- default NO ACTION). So we do it manually and explicitly, in FK-safe order:
--   1. Update all 8 dependent tables' agency_id columns first (while the old
--      PK row in _hierarchy_agencies still exists, so their FK constraint
--      stays satisfied at every intermediate step).
--   2. Update the _hierarchy_agencies row's own id last, once nothing else
--      references the old value.
-- This ordering means the transaction is never in a state where a FK could
-- be violated if it were (hypothetically) checked mid-transaction, and it
-- means a failure at any step rolls back cleanly with zero partial writes.
--
-- Before running: re-run the COUNT queries below and confirm they match the
-- verified counts above. If they don't match, STOP and re-investigate before
-- touching anything — a mismatch means new data landed since this draft was
-- written and the scope needs re-confirming, not blindly re-run.
--
-- ============================================================================

BEGIN;

-- ---- Pre-flight verification (run these as a separate read-only check
--      before BEGIN; included here again for reference/documentation) ----
-- SELECT count(*) FROM agency_deals             WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4'; -- expect 8299
-- SELECT count(*) FROM agency_clients           WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4'; -- expect 1315
-- SELECT count(*) FROM agency_kpis              WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4'; -- expect 416
-- SELECT count(*) FROM agent_pipeline           WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4'; -- expect 744
-- SELECT count(*) FROM crm_tickets              WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4'; -- expect 11
-- SELECT count(*) FROM crm_agency_cross_sell    WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4'; -- expect 5
-- SELECT count(*) FROM agent_production         WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4'; -- expect 2
-- SELECT count(*) FROM agency_ghl_configs       WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4'; -- expect 1
-- SELECT id, name, fym_id FROM _hierarchy_agencies WHERE id = '723620b6-0297-4690-a9ad-52c18945fdb4';     -- expect the FYM row
-- SELECT id, name, fym_id FROM _hierarchy_agencies WHERE id = '338230f2-2058-407c-9507-5aa88d6d5e14';     -- expect NO ROW (confirms no collision)

-- Step 1: repoint all 8 dependent tables from the old Portal-only ID to the
-- App DB's canonical ID. Order among these 8 doesn't matter — none of them
-- reference each other by agency_id, they all independently reference
-- _hierarchy_agencies.

UPDATE agency_deals
  SET agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'
  WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4';

UPDATE agency_clients
  SET agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'
  WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4';

UPDATE agency_kpis
  SET agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'
  WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4';

UPDATE agent_pipeline
  SET agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'
  WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4';

UPDATE crm_tickets
  SET agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'
  WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4';

UPDATE crm_agency_cross_sell
  SET agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'
  WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4';

UPDATE agent_production
  SET agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'
  WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4';

UPDATE agency_ghl_configs
  SET agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'
  WHERE agency_id = '723620b6-0297-4690-a9ad-52c18945fdb4';

-- Step 2: now that nothing references the old PK, repoint the agency row's
-- own id. This is the row that used to be '723620b6...' and becomes
-- '338230f2...' to match the App DB.
UPDATE _hierarchy_agencies
  SET id = '338230f2-2058-407c-9507-5aa88d6d5e14'
  WHERE id = '723620b6-0297-4690-a9ad-52c18945fdb4';

-- ---- Post-flight verification (run before COMMIT) ----
-- Row counts under the NEW id should equal the pre-flight counts under the
-- OLD id, and counts under the OLD id should now be zero everywhere.
-- SELECT count(*) FROM agency_deals             WHERE agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'; -- expect 8299
-- SELECT count(*) FROM agency_clients           WHERE agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'; -- expect 1315
-- SELECT count(*) FROM agency_kpis              WHERE agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'; -- expect 416
-- SELECT count(*) FROM agent_pipeline           WHERE agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'; -- expect 744
-- SELECT count(*) FROM crm_tickets              WHERE agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'; -- expect 11
-- SELECT count(*) FROM crm_agency_cross_sell    WHERE agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'; -- expect 5
-- SELECT count(*) FROM agent_production         WHERE agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'; -- expect 2
-- SELECT count(*) FROM agency_ghl_configs       WHERE agency_id = '338230f2-2058-407c-9507-5aa88d6d5e14'; -- expect 1
-- SELECT id, name, fym_id FROM _hierarchy_agencies WHERE id = '338230f2-2058-407c-9507-5aa88d6d5e14';     -- expect the FYM row, old id gone
-- SELECT count(*) FROM _hierarchy_agencies WHERE id = '723620b6-0297-4690-a9ad-52c18945fdb4';             -- expect 0

-- If every check above matches: COMMIT.
-- If ANY check is off: ROLLBACK, do not attempt a partial fix, re-investigate.

COMMIT;
-- ROLLBACK;  -- uncomment / use instead of COMMIT if any verification fails

-- ============================================================================
-- FOLLOW-UP (after this migration ships)
-- ============================================================================
-- 1. Delete supabase/functions/_shared/agency-id-alias.ts and its one call
--    site in FYM-App's lifecycle-sync/index.ts (FYM-App PR #692). The alias
--    becomes dead code the moment this migration lands — leaving it in
--    place after that point is itself a bug (a second, now-incorrect
--    "source of truth" for a mapping that no longer applies).
-- 2. Re-run lifecycle-sync's reconcile pass against Carole Walters
--    (agents.id = 7a5f852c-9077-40ad-91b7-0668852ff9ba) WITHOUT the alias
--    in place, confirm the agent_lifecycle insert/update succeeds using the
--    raw Portal agency_id directly (no more FK violation) — this is the
--    real regression check that the migration worked, not just the row
--    count verification above.
-- 3. Spot-check a few agency_deals / agency_clients rows in the Portal UI
--    (CRM Ops > Agency Deals tab, agency profile view for FYM) to confirm
--    revenue/client data still renders correctly post-migration.
-- ============================================================================
