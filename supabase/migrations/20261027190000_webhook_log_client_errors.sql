-- Allow the intake forms (anon role) to log client-side submit failures
-- into webhook_log, scoped strictly to client-prefixed function names.
--
-- Context: the intake forms previously swallowed submit errors behind a
-- generic alert. The client now reports failures server-side so they are
-- diagnosable without the agent's phone console. Anon already holds the
-- table-level INSERT grant; RLS had no anon INSERT policy, so this is the
-- additive policy that opens exactly the client-error path and nothing else.

CREATE POLICY anon_insert_client_errors
  ON public.webhook_log
  FOR INSERT
  TO anon
  WITH CHECK (function_name LIKE 'client:%' AND outcome = 'error');
