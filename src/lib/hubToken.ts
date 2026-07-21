/**
 * hubToken.ts
 * Generates an agent hub token immediately after intake form submission.
 * Called in handleFinalSubmit of every intake form, after the agent_intake
 * insert and agents status update succeed — never before.
 *
 * Token is generated server-side (gen_random_bytes via Supabase default).
 * This function just inserts the row; the token value is returned and can
 * be logged or passed to the thank-you page for display.
 */

import { supabase } from './supabase';

function buildAgentSlug(firstName: string | null, lastName: string | null, npn: string | null): string {
  const parts = [firstName, lastName, npn]
    .map(s => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
  return parts.join('-');
}

export async function generateHubToken(params: {
  agentId: string;
  npn: string | null;
  firstName: string | null;
  lastName: string | null;
}): Promise<{ token: string; agentSlug: string; hubUrl: string } | null> {
  const { agentId, npn, firstName, lastName } = params;

  // Check if a token already exists for this agent (idempotent — don't double-create)
  const { data: existing } = await supabase
    .from('agent_hub_tokens')
    .select('token, agent_slug')
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    const appUrl = import.meta.env.VITE_APP_URL ?? '';
    return {
      token: existing.token,
      agentSlug: existing.agent_slug,
      hubUrl: `${appUrl}/hub/${existing.token}`,
    };
  }

  const agentSlug = buildAgentSlug(firstName, lastName, npn);

  const { data, error } = await supabase
    .from('agent_hub_tokens')
    .insert({
      agent_id: agentId,
      npn: npn ?? null,
      agent_slug: agentSlug || null,
    })
    .select('token, agent_slug')
    .maybeSingle();

  if (error || !data) {
    console.error('[hubToken] Failed to generate hub token:', error?.message);
    return null;
  }

  const appUrl = import.meta.env.VITE_APP_URL ?? '';
  return {
    token: data.token,
    agentSlug: data.agent_slug,
    hubUrl: `${appUrl}/hub/${data.token}`,
  };
}
