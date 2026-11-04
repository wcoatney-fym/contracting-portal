/**
 * hubToken.ts
 * Mints an agent hub token immediately after intake form submission.
 * Called in handleFinalSubmit of every intake form, after the agent_intake
 * insert and agents status update succeed — never before.
 *
 * Tranche-1 rework (2026-11-04): minting moved SERVER-SIDE into the
 * contracting-form edge function. The old anon-key INSERT required an open
 * anon INSERT policy on agent_hub_tokens that let any visitor mint an active
 * token for any agent_id (hub impersonation). The function verifies the
 * form's 6-digit security code — the same credential that opened the form —
 * before minting, and is idempotent (existing active token is returned).
 */

export async function generateHubToken(params: {
  agentId: string;
  /** The verified 6-digit code the agent entered at the SecurityCodeGate. */
  securityCode: string;
  npn: string | null;
  firstName: string | null;
  lastName: string | null;
}): Promise<{ token: string; agentSlug: string; hubUrl: string } | null> {
  const { agentId, securityCode, npn, firstName, lastName } = params;

  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contracting-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'mint_hub_token',
        form_id: agentId,
        security_code: securityCode,
        npn: npn ?? null,
        first_name: firstName ?? null,
        last_name: lastName ?? null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      console.error('[hubToken] Failed to generate hub token:', data.error ?? `HTTP ${res.status}`);
      return null;
    }

    const appUrl = import.meta.env.VITE_APP_URL ?? '';
    return {
      token: data.token,
      agentSlug: data.agent_slug ?? '',
      hubUrl: `${appUrl}/hub/${data.token}`,
    };
  } catch (err) {
    console.error('[hubToken] Failed to generate hub token:', err);
    return null;
  }
}
