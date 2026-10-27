import { supabase } from './supabase';

/**
 * Hardened submit path for the agent intake forms.
 *
 * Three failure classes, three defenses:
 * 1. Transient network blips (mobile)  -> insertWithRetry: 2 retries w/ backoff
 * 2. Stale cached bundle w/ dead key   -> isStaleBundleError + forceFreshReload
 *    (legacy anon keys were disabled 2026-09-03; any pre-migration cached
 *    bundle fails every write with "Legacy API keys are disabled")
 * 3. Swallowed errors (undiagnosable)  -> describeSubmitError in the alert +
 *    reportSubmitFailure logs to webhook_log so we see failures server-side
 */

type SupabaseResult = { error: { code?: string; message?: string } | null };

function isTransient(err: unknown): boolean {
  // fetch() network failures surface as TypeError('Failed to fetch') or similar
  if (err instanceof TypeError) return true;
  const msg = errMessage(err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('fetch event')
  );
}

function errMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  const anyErr = err as { message?: string; error_description?: string; hint?: string };
  return anyErr.message || anyErr.error_description || anyErr.hint || JSON.stringify(err);
}

function errCode(err: unknown): string {
  const anyErr = err as { code?: string; status?: number };
  return anyErr?.code ? String(anyErr.code) : anyErr?.status ? String(anyErr.status) : '';
}

/** Run a supabase mutation; retry up to 2 times on transient network errors. */
export async function insertWithRetry<T extends SupabaseResult>(
  run: () => PromiseLike<T>,
  attempts = 3,
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await run();
      // PostgREST errors come back on the result object, not as throws.
      // Only retry those that look transient; real rejections bubble up.
      if (result.error && isTransient(result.error) && i < attempts - 1) {
        last = result.error;
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        continue;
      }
      return result;
    } catch (err) {
      last = err;
      if (!isTransient(err) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw last;
}

/** True when the browser is running an old cached bundle with a disabled key. */
export function isStaleBundleError(err: unknown): boolean {
  const msg = errMessage(err).toLowerCase();
  return (
    msg.includes('legacy api keys are disabled') ||
    msg.includes('invalid api key') ||
    msg.includes('no api key found')
  );
}

/** Hard reload with a cache-buster, guarded so we never loop. */
export function forceFreshReload(): void {
  try {
    if (sessionStorage.getItem('fym_forced_reload') === '1') return;
    sessionStorage.setItem('fym_forced_reload', '1');
  } catch {
    // sessionStorage unavailable — reload anyway, the guard is best-effort
  }
  const url = new URL(window.location.href);
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(url.toString());
}

/** Human-readable error line for the alert. Never includes form PII. */
export function describeSubmitError(err: unknown): string {
  const code = errCode(err);
  const msg = errMessage(err) || 'Unknown error';
  return code ? `${msg} (code ${code})` : msg;
}

/**
 * Best-effort server-side record of a failed client submit.
 * Writes to webhook_log (function_name 'client:intake_submit').
 * Payload carries diagnostics only — never SSN/DOB/license data.
 */
export async function reportSubmitFailure(params: {
  form: string;
  agentId?: string;
  error: unknown;
}): Promise<void> {
  try {
    await supabase.from('webhook_log').insert({
      function_name: 'client:intake_submit',
      outcome: 'error',
      error_message: `${errCode(params.error)} ${errMessage(params.error)}`.trim().slice(0, 500),
      payload: {
        form: params.form,
        agent_id: params.agentId ?? null,
        url: window.location.pathname,
        user_agent: navigator.userAgent.slice(0, 300),
        online: navigator.onLine,
        ts_client: new Date().toISOString(),
      },
    });
  } catch {
    // Logging must never break the user flow — swallow.
  }
}

/** Shared catch-block handler for all intake forms. Returns the alert shown. */
export async function handleIntakeSubmitError(params: {
  form: string;
  agentId?: string;
  error: unknown;
}): Promise<void> {
  console.error(params.error);
  await reportSubmitFailure(params);
  if (isStaleBundleError(params.error)) {
    alert(
      'Your browser was using an outdated version of this form. ' +
        'The page will refresh automatically — please press Submit again after it reloads.',
    );
    forceFreshReload();
    return;
  }
  alert(
    'Error submitting form: ' +
      describeSubmitError(params.error) +
      '\n\nPlease try again. If this keeps happening, screenshot this message and send it to your contracting contact.',
  );
}
