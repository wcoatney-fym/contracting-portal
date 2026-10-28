-- 20261027190000_intake_authenticated_insert.sql
-- Public intake forms must succeed regardless of the browser's auth state.
-- Root cause (2026-10-27): a browser that has ever logged into the FYM App carries a
-- portal session (storage key fym-portal-auth-token). Since the 2026-09-28 portal-client
-- unification, the PUBLIC intake forms share that session-aware client, so the submit
-- runs as role `authenticated` — which had no INSERT policy on agent_intake or
-- agent_hub_tokens → 42501 "new row violates row-level security policy" → agents see
-- "Error submitting form". Anonymous browsers were unaffected (anon INSERT policies exist).
-- Fix: mirror the anon INSERT policies for authenticated. Same WITH CHECK conditions.

create policy "agent_intake: authenticated insert"
  on public.agent_intake
  for insert
  to authenticated
  with check (agent_id is not null);

create policy "hub token: authenticated insert"
  on public.agent_hub_tokens
  for insert
  to authenticated
  with check (is_active = true);
