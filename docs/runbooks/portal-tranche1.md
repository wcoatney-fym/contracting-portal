# Portal Tranche-1 Runbook — staff auth, rotation, hub-token lockdown, anon revokes

**Scope:** contracting-portal (akhojh `akhojhncsswyzcnicedt`) + FYM-App secrets (rcbzag `rcbzagjyhyrkuwvlrlnf`).
**Order approved by Charlie 2026-11-04:** ① CP #112 → ② rotation window → ③ T1a additive → ④ CP #111 → ⑤ T1b revokes.
**Prereqs already live:** FYM-App #902 merged + fns deployed (agent-contracting v1, prod-data, push-contracting-stage, agent-lifecycle-sync); akhojh `enqueue_ghl_push` test_agent guard applied (D3).
**Hard rules:** no step starts without the prior step's smoke passing; every DB action is read back after apply; nothing here prints or stores a credential value.

---

## ① Merge + deploy CP #112 (staff-login containment + hardening)

**Blocked on:** Charlie's final staff allowlist (migration seed is currently `charlie@` + `will@` only — anyone not listed loses staff-page access the moment this deploys).

**Action**
1. Charlie confirms allowlist → commit final seed rows to `supabase/migrations/20261104170000_staff_login_allowlist_and_rate_limit.sql`.
2. Charlie merges #112 → Netlify auto-deploys the frontend.
3. Apply migration `20261104170000` to akhojh (Management API / SQL editor — this repo's migrations are not auto-applied).
4. Deploy fn: `npx supabase functions deploy staff-login --project-ref akhojhncsswyzcnicedt --no-verify-jwt` (it IS the login).

**Smoke**
- (a) Each allowlisted staffer signs in at contracting.teamfym.com; confirm the session JWT carries `app_metadata.kind = 'staff'`.
- (b) Negative: unlisted email + correct shared password → 401; five bad passwords on one email → 429 lockout; confirm rows landing in `staff_login_attempts`.
- (c) A logged-in staffer opens BiancaHub — recent-logins and attendance panels render **with data** (exercises the new `agent_hub_logins` / `agent_live_attendance` staff SELECT policies).
- (d) Force one client-side error → new `webhook_log` row with `function_name LIKE 'client:%'`, `outcome='error'` (exercises the staff INSERT policy).

**Rollback**
- Netlify instant rollback to the prior deploy — frontend returns to current (anon) behavior.
- Migration is purely additive (new tables + new policies); leave it in place.
- Allowlist/lockout false positive: fix the row in `staff_allowlist` / delete stale `staff_login_attempts` rows — no deploy needed.

---

## ② Rotation window — `service@teamfym.com` (on Charlie's go, after his Netlify env + GHL/n8n checks)

**Action** (executed by Diamond, in-shell, per agreement — the value is generated, applied, and discarded; **never printed, logged, or stored anywhere**)
1. In one shell pipeline: generate a strong random password → `auth.admin.updateUserById('2d503fa5-3c3d-437c-9c1b-0caca9c4c05e', { password })` on akhojh → set rcbzag secret `PORTAL_SERVICE_PASSWORD` to the same value — **same minute**, value held only in the pipeline variable.
2. Delete (or refresh, if Charlie prefers) akhojh's stale `PORTAL_SERVICE_EMAIL`/`PORTAL_SERVICE_PASSWORD` secret copy — no deployed fn reads it.
3. Optional, same window: disable `crm-automation@teamfym.com` (idle since 9/23).

**Smoke**
- portal-auth agency login end-to-end on agency.teamfym.com.
- One portal-db consumer fires clean (e.g. push-contracting-stage or agent-lifecycle-sync invocation).
- pii-read still works (uses `PORTAL_SERVICE_ROLE_KEY`, not the password — this is the control).
- Watch akhojh auth logs ~15 min: baseline is ~1,100 password-grant sign-ins/day on this account, so a bad rotation shows as a failure spike within minutes.
- **Next morning:** confirm `sync-agencies-nightly`, `identity-sync-nightly`, and `coaching-completion-nightly` all succeeded on their first post-rotation run.

**Rollback**
- Nobody holds the old password (that's the point), so rollback is **not** "re-enter the old one." Rollback = run the exact same in-shell rotation again with a fresh value (rotate forward). The failure mode this fixes is a mismatch between the auth password and the rcbzag secret — re-running the pipeline re-synchronizes them in one minute.

---

## ③ Apply T1a additive SQL (akhojh)

**Action**
- Apply `supabase/portal-migrations/20261105T1a_portal_tranche1_additive.sql` (lives in FYM-App repo): CREATEs `hub_login(p_token)` RPC + supporting functions. Additive only — current production code never calls them. (Its `enqueue_ghl_push` guard is already live from the pre-approved D3 apply; re-running is idempotent.)
- Read back: `SELECT proname FROM pg_proc WHERE proname = 'hub_login';` returns a row.

**Smoke**
- Load the Agent Hub once via the existing (pre-#111) path — confirms nothing regressed; the new RPCs are invisible until ④ deploys.

**Rollback**
- `DROP FUNCTION` the newly created RPCs — nothing references them until step ④.

---

## ④ Merge + deploy CP #111 (hub-token server-side minting + staff-tools)

**Precondition:** ③ applied and read back — AgentHub's new code calls `hub_login` unconditionally; deploying ④ before ③ breaks every hub visit.

**Action**
1. Charlie merges #111 → Netlify auto-deploys frontend (HubLogin → `hub-login` fn, AgentHub → `hub_login` RPC, intake-form server-side minting, security-code regen via `staff-tools`).
2. Deploy fns: `hub-login` + `contracting-form` with `--no-verify-jwt`; `staff-tools` normally (JWT-gated, positive `kind === 'staff'` check).

**Smoke**
- Hub sign-in: name + NPN → token → hub loads.
- One intake form end-to-end, including hub-token mint via `contracting-form`.
- AgentIntake security-code create as a staff session (exercises staff-tools).
- AgentTracking security-code resend.
- RosterImport token mint.
- Negative: call staff-tools with an agency JWT (and, if available, a no-kind JWT) → 403.

**Rollback**
- Netlify rollback of the frontend — the old anon paths still work because T1b hasn't run. The new edge fns can stay deployed harmlessly.

---

## ⑤ Apply T1b revokes (akhojh)

**Precondition:** ④'s full smoke suite green. **Before applying:** commit the exact inverse re-GRANT script (`20261105T1b_rollback_regrants.sql`) alongside, so rollback is paste-ready — never write the rollback under pressure.

**Action**
- Apply `supabase/portal-migrations/20261105T1b_portal_tranche1_revokes.sql` (FYM-App repo): revokes the anon/authenticated surfaces the new fns/RPCs replaced.
- Read back: re-query `information_schema.role_table_grants` for the revoked tables; confirm anon rows gone.

**Smoke**
- Re-run the entire ④ suite on the live site (hub sign-in, intake e2e, AgentIntake, AgentTracking, RosterImport).
- Verify anon is actually shut: an anon-key select on `agent_hub_tokens` (and the other revoked tables) now returns a permission error.
- Watch CP console + `webhook_log` for an error spike for ~30 minutes.

**Rollback**
- Run the prepared re-GRANT script — restores the pre-⑤ grant state exactly. (Code paths from ①–④ keep working either way; the re-grants only re-open the legacy anon surfaces.)

---

## Standing notes
- Ticketed, not in scope: per-person staff passwords or magic links (replaces shared domain password); `clientIp()` switch to gateway-appended x-forwarded-for hop; wide default GRANTs on portal tables (later tranche); portal-db cached-token refactor + auth.sessions cleanup on rcbzag.
- Pre-existing design limitation (no action): hub-login trusts name + NPN; NPNs are public on NIPR.
- akhojh `disable_signup = true` (verified 2026-11-04) — staff-tools' positive kind check no longer depends on it, but don't flip it on without revisiting auth assumptions.
