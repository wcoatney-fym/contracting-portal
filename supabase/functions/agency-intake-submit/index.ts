import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Public Agency Intake endpoint.
 *
 * Backs the standalone /agency-intake link that the contracting team shares
 * externally. It mirrors the "Add New Agency" action in the Hierarchy tab, but
 * runs server-side with the service-role key so the public page never holds any
 * privileged credential and RLS on crm_agencies stays locked down (anon has no
 * INSERT policy — this function is the only public write path).
 *
 * GET  -> returns the parent-agency options for the dropdown (id, name, type,
 *          parent) so the public page needs no broad anon read.
 * POST -> validates the intake payload, creates a pending sub-agency, and drops
 *          an "agency_added" notification so it surfaces in the Hierarchy tab.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Keep in sync with RESERVED_SLUGS in src/lib/supabase.ts — a public slug must
// never shadow an app route.
const RESERVED_SLUGS = new Set([
  "life", "field", "direct-pay", "telesales", "hip", "hip-career", "hip-broker",
  "field-hip", "direct-pay-hip", "telesales-hip", "thank-you",
  "dashboard", "agent-intake", "new-hires", "populate-form", "populate",
  "agent-tracking", "agent-database", "agent-pipeline", "hierarchy",
  "crm-team", "crm", "fym-agent-resources", "agency-intake",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("crm_agencies")
        .select("id, name, agency_type, parent_agency_id")
        .eq("is_active", true)
        .order("name");
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, agencies: data ?? [] });
    }

    if (req.method !== "POST") {
      return json({ success: false, error: "Method not allowed" }, 405);
    }

    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const parentId = String(body.parentId ?? "").trim();
    const agencyNpn = String(body.agencyNpn ?? "").trim();
    const agencyEin = String(body.agencyEin ?? "").trim();
    const principalAgent = String(body.principalAgent ?? "").trim();
    const principalAgentNpn = String(body.principalAgentNpn ?? "").trim();
    const contractingEmail = String(body.contractingEmail ?? "").trim();
    const contractingContact = String(body.contractingContact ?? "").trim();

    // Validation — mirrors the Hierarchy modal's required fields.
    if (!name) return json({ success: false, error: "Agency name is required." }, 400);
    if (!parentId) return json({ success: false, error: "Please select a parent agency." }, 400);
    if (!agencyNpn) return json({ success: false, error: "Agency NPN is required." }, 400);
    if (!agencyEin) return json({ success: false, error: "Agency EIN is required." }, 400);
    if (!principalAgent) return json({ success: false, error: "Principal Agent name is required." }, 400);
    if (!principalAgentNpn) return json({ success: false, error: "Principal Agent NPN is required." }, 400);
    if (!contractingEmail) return json({ success: false, error: "Contracting email is required." }, 400);
    if (!EMAIL_RE.test(contractingEmail)) return json({ success: false, error: "Please enter a valid email address." }, 400);

    const slug = generateSlug(name);
    if (!slug || RESERVED_SLUGS.has(slug)) {
      return json({ success: false, error: `The name "${name}" conflicts with a reserved URL path. Please choose a different name.` }, 400);
    }

    // Confirm the parent exists and is active before creating a child under it.
    const { data: parent, error: parentErr } = await supabase
      .from("crm_agencies")
      .select("id, name")
      .eq("id", parentId)
      .eq("is_active", true)
      .maybeSingle();
    if (parentErr) return json({ success: false, error: parentErr.message }, 500);
    if (!parent) return json({ success: false, error: "Selected parent agency was not found." }, 400);

    const portalPassword = `${name}CRMPortal!`;

    const { data: newAgency, error: insertError } = await supabase
      .from("crm_agencies")
      .insert({
        name,
        agency_type: "sub",
        parent_agency_id: parentId,
        onboarding_status: "pending_csr_assignment",
        is_active: true,
        crm_enabled: false,
        slug,
        portal_password: portalPassword,
        date_created: new Date().toISOString().slice(0, 10),
        agency_npn: agencyNpn || null,
        agency_ein: agencyEin || null,
        principal_agent: principalAgent || null,
        principal_agent_npn: principalAgentNpn || null,
        contracting_email: contractingEmail || null,
        contracting_contact: contractingContact || null,
      })
      .select()
      .maybeSingle();

    if (insertError) {
      if (insertError.code === "23505") {
        return json({ success: false, error: "An agency with this name already exists." }, 409);
      }
      return json({ success: false, error: insertError.message }, 500);
    }
    if (!newAgency) {
      return json({ success: false, error: "Agency creation failed. Please try again." }, 500);
    }

    // Surface it in the Hierarchy/CRM notifications feed, same as the in-app add.
    await supabase.from("crm_notifications").insert({
      agency_id: newAgency.id,
      type: "agency_added",
      message: `New sub-agency "${name}" submitted via intake link under ${parent.name} -- begin onboarding`,
    });

    return json({ success: true, agency: { id: newAgency.id, name: newAgency.name, slug: newAgency.slug } });
  } catch (err) {
    console.error("agency-intake-submit error:", err);
    return json({ success: false, error: "Unexpected server error." }, 500);
  }
});
