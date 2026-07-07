/*
  # Add form_sent_at audit column to agents

  ## Why
  "Generate Intake Form" and "Send to Agent" are two separate manual steps in the
  Agent Intake tab. Only `form_created` is logged; the send fires a Zapier webhook
  but persists nothing. A record whose send never completed (navigated away before
  clicking Send, or a silent non-OK webhook) is indistinguishable from a sent one
  because `date_sent` defaults to now() at row insert. This left James Graves
  (created 2026-07-06) stuck at `pending` with no email out and no way to tell.

  ## Changes
  - Add nullable `form_sent_at timestamptz` to `agents`. NULL = the Zapier send
    webhook never confirmed success. Stamped only on a successful send.
  - Index for the "generated but never sent" recovery queue.

  ## Notes
  - Read-only/anon SELECT policies already cover agents; no policy change here.
  - Existing rows keep NULL (unknown/unsent) — intentionally recoverable via the
    new Unsent Forms queue rather than back-filled to a false "sent" state.
*/

ALTER TABLE agents ADD COLUMN IF NOT EXISTS form_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_agents_form_sent_at ON agents(form_sent_at);
