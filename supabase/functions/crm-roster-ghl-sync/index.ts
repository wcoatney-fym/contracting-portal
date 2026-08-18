import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * crm-roster-ghl-sync — Direct GHL API sync for CRM roster changes.
 *
 * Replaces the broken Zapier integration. When an agent is added/edited
 * on the CRM roster, this function:
 *   1. Resolves the agency name → per-agency API key + GHL location ID
 *   2. PUTs custom values to the agency's GHL subaccount
 *   3. For dual-account agencies (FYM, MHA IFG, MHA YFMO) → also pushes to Sunfire
 *   4. POSTs to create a GHL user in the agency subaccount (if action=add)
 *
 * Payload matches the existing crm-onboarding-webhook format exactly.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Agency → GHL configuration mapping ──────────────────────────────────

interface AgencyGhlConfig {
  agencyLocationId: string;
  agencyApiKeyEnv: string;
  sunfireLocationId?: string;
  sunfireApiKeyEnv?: string;
}

const AGENCY_GHL_MAP: Record<string, AgencyGhlConfig> = {
  // Dual-account agencies (push custom values to BOTH agency + Sunfire)
  "FYM": {
    agencyLocationId: "YM9XmCanfO6p28b1sQOH",
    agencyApiKeyEnv: "CRM_OPS_FYM_AGENCY_API",
    sunfireLocationId: "IQljfeWX6wWHmzUtgSyz",
    sunfireApiKeyEnv: "CRM_OPS_FYM_SUNFIRE_API",
  },
  "MHA (IFG)": {
    agencyLocationId: "W2d8rLlhu7zchstuX3m9",
    agencyApiKeyEnv: "CRM_OPS_MHA_IFG_AGENCY_API",
    sunfireLocationId: "J3OhGPUb6xcoWHnFGOit",
    sunfireApiKeyEnv: "CRM_OPS_MHA_IFG_SUNFIRE_API",
  },
  "MHA (YFMO)": {
    agencyLocationId: "OAd1PnliebjgodpEGuCI",
    agencyApiKeyEnv: "CRM_OPS_MHA_YFMO_AGENCY_API",
    sunfireLocationId: "wIbVl4AX2LZRDL8pTK2c",
    sunfireApiKeyEnv: "CRM_OPS_MHA_YFMO_SUNFIRE_API",
  },
  // Single-account agencies (agency subaccount only)
  "Wisechoice": {
    agencyLocationId: "I7Mw22ovq7fPgJWV5eWL",
    agencyApiKeyEnv: "CRM_OPS_WISECHOICE_AGENCY_API",
  },
  "Aspire": {
    agencyLocationId: "MrRGbMxuEFqc6y00tr5A",
    agencyApiKeyEnv: "CRM_OPS_ASPIRE_AGENCY_API",
  },
  "DH Insurance Group": {
    agencyLocationId: "gUWVjvEQMniOUvPEV2Z6",
    agencyApiKeyEnv: "CRM_OPS_DH_INSURANCE_AGENCY_API",
  },
  "Berith Partners LLC": {
    agencyLocationId: "2zscje2WhD64VpxQvTsU",
    agencyApiKeyEnv: "CRM_OPS_BERITH_PARTNERS_AGENCY_API",
  },
  "360 Insurance Group": {
    agencyLocationId: "Uc3AEjz4qy9D672Q4IsC",
    agencyApiKeyEnv: "CRM_OPS_360_INSURANCE_AGENCY_API",
  },
};

// ── GHL API helpers ─────────────────────────────────────────────────────

const GHL_API_BASE = "https://services.leadconnectorhq.com";

/**
 * Build the custom values object for a single seat.
 * Key format: "Agent #{seatNumber} {fieldName}"
 * Matches the exact Zapier Step 28 payload.
 */
function buildCustomValues(payload: RosterPayload): Record<string, string> {
  const s = payload.seatNumber;
  return {
    [`Agent #${s} CRM #`]: payload.crmNumber,
    [`Agent #${s} First Name`]: payload.firstName,
    [`Agent #${s} Full Name`]: `${payload.firstName} ${payload.lastName}`.trim(),
    [`Agent #${s} Mobile #`]: payload.phone,
    [`Agent #${s} NPN`]: payload.agentNpn,
    [`Agent #${s} Professional Image`]: payload.profileImage,
    [`Agent #${s} Title`]: "Licensed Insurance Agent",
    [`Agent #${s} Work Email`]: payload.email,
    [`Agent #${s} Calendar Embed Code`]: payload.calendarEmbedCode,
    [`Agent #${s} Digital Business Card Home Page`]: payload.digitalBusinessCardUrl,
    [`Agent #${s} Appt Booked Confirmation Page`]: payload.confirmationPageUrl,
  };
}

/**
 * Push custom values to a GHL location.
 * Uses PUT /locations/{locationId}/customValues — per-location API key required.
 */
async function pushCustomValues(
  locationId: string,
  apiKey: string,
  customValues: Record<string, string>,
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(
      `${GHL_API_BASE}/locations/${locationId}/customValues`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Version": "2021-07-28",
        },
        body: JSON.stringify({ customValues }),
      },
    );

    if (res.ok) {
      return { ok: true, status: res.status };
    }

    const body = await res.text();
    return { ok: false, status: res.status, error: body };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Create a GHL user in a location.
 * Uses POST /users/ with the agency-level access token.
 *
 * Permissions: restrict data visibility + conversations, opportunities,
 * contacts, and dashboard ON. Everything else OFF.
 */
async function createGhlUser(
  locationId: string,
  agencyAccessToken: string,
  payload: RosterPayload,
): Promise<{ ok: boolean; status: number; userId?: string; error?: string }> {
  try {
    const userPayload = {
      companyId: locationId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      type: "account",
      role: "user",
      locationIds: [locationId],
      permissions: {
        campaignsEnabled: false,
        campaignsReadOnly: false,
        contactsEnabled: true,
        workflowsEnabled: false,
        workflowsReadOnly: false,
        triggersEnabled: false,
        funnelsEnabled: false,
        websitesEnabled: false,
        opportunitiesEnabled: true,
        dashboardStatsEnabled: true,
        bulkRequestsEnabled: false,
        appointmentsEnabled: false,
        reviewsEnabled: false,
        onlineListingsEnabled: false,
        phoneCallEnabled: false,
        conversationsEnabled: true,
        assignedDataOnly: true,
        adwordsReportingEnabled: false,
        membershipEnabled: false,
        facebookAdsReportingEnabled: false,
        attributionsReportingEnabled: false,
        settingsEnabled: false,
        tagsEnabled: false,
        leadValueEnabled: false,
        marketingEnabled: false,
        agentReportingEnabled: false,
        botService: false,
        socialPlanner: false,
        bloggingEnabled: false,
        invoiceEnabled: false,
        affiliateManagerEnabled: false,
        contentAiEnabled: false,
        refundsEnabled: false,
        recordPaymentEnabled: false,
        cancelSubscriptionEnabled: false,
        paymentsEnabled: false,
        communitiesEnabled: false,
        exportPaymentsEnabled: false,
      },
      profilePhoto: payload.profileImage || undefined,
      scopes: ["contacts.readonly", "conversations.readonly", "opportunities.readonly"],
    };

    const res = await fetch(`${GHL_API_BASE}/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${agencyAccessToken}`,
        "Version": "2021-07-28",
      },
      body: JSON.stringify(userPayload),
    });

    if (res.ok) {
      const data = await res.json();
      return { ok: true, status: res.status, userId: data?.id };
    }

    const body = await res.text();

    // 422 with "User already exists" is not a failure — it's expected on edits
    if (res.status === 422 && body.includes("already exists")) {
      return { ok: true, status: res.status, error: "User already exists (skipped)" };
    }

    return { ok: false, status: res.status, error: body };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Types ───────────────────────────────────────────────────────────────

interface RosterPayload {
  seatNumber: string;
  agentNpn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string;
  crmNumber: string;
  agency: string;
  digitalBusinessCardUrl: string;
  confirmationPageUrl: string;
  calendarEmbedCode: string;
  action?: "add" | "edit" | "terminate";
}

// ── Main handler ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Warm-up ping
    if (body.ping) {
      return new Response(
        JSON.stringify({ success: true, warm: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse payload (same shape as the old Zapier webhook)
    const payload: RosterPayload = {
      seatNumber: body.seatNumber || "",
      agentNpn: body.agentNpn || "",
      firstName: body.firstName || "",
      lastName: body.lastName || "",
      email: body.email || "",
      phone: body.phone || "",
      profileImage: body.profileImage || "",
      crmNumber: body.crmNumber || "",
      agency: body.agency || "",
      digitalBusinessCardUrl: body.digitalBusinessCardUrl || "",
      confirmationPageUrl: body.confirmationPageUrl || "",
      calendarEmbedCode: body.calendarEmbedCode || "",
      action: body.action || "add",
    };

    // Validate required fields
    if (!payload.agency) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing agency name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!payload.seatNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing seatNumber" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!payload.firstName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing firstName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Resolve agency → GHL config ──
    const config = AGENCY_GHL_MAP[payload.agency];
    if (!config) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Agency "${payload.agency}" is not configured for GHL sync. Known agencies: ${Object.keys(AGENCY_GHL_MAP).join(", ")}`,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Resolve API keys from env ──
    const agencyApiKey = Deno.env.get(config.agencyApiKeyEnv);
    if (!agencyApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `API key not found for ${config.agencyApiKeyEnv}. Add it as a Supabase function secret.`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sunfireApiKey = config.sunfireApiKeyEnv
      ? Deno.env.get(config.sunfireApiKeyEnv)
      : undefined;

    const agencyAccessToken = Deno.env.get("GHL_AGENCY_ACCESS_TOKEN");

    // ── Build custom values ──
    const customValues = buildCustomValues(payload);

    const results: Record<string, unknown> = {};

    // ── Step 1: Push custom values to agency subaccount ──
    const agencyResult = await pushCustomValues(
      config.agencyLocationId,
      agencyApiKey,
      customValues,
    );
    results.agencyCustomValues = {
      locationId: config.agencyLocationId,
      ...agencyResult,
    };

    // ── Step 2: Push custom values to Sunfire subaccount (dual-account only) ──
    if (config.sunfireLocationId && sunfireApiKey) {
      const sunfireResult = await pushCustomValues(
        config.sunfireLocationId,
        sunfireApiKey,
        customValues,
      );
      results.sunfireCustomValues = {
        locationId: config.sunfireLocationId,
        ...sunfireResult,
      };
    } else if (config.sunfireLocationId && !sunfireApiKey) {
      results.sunfireCustomValues = {
        locationId: config.sunfireLocationId,
        ok: false,
        error: `Sunfire API key not found for ${config.sunfireApiKeyEnv}`,
      };
    }

    // ── Step 3: Create GHL user (agency subaccount only, on add) ──
    if (payload.action !== "terminate" && agencyAccessToken && payload.email) {
      const userResult = await createGhlUser(
        config.agencyLocationId,
        agencyAccessToken,
        payload,
      );
      results.userCreation = {
        locationId: config.agencyLocationId,
        ...userResult,
      };
    } else if (!agencyAccessToken) {
      results.userCreation = {
        ok: false,
        error: "GHL_AGENCY_ACCESS_TOKEN not set — user creation skipped",
      };
    } else if (!payload.email) {
      results.userCreation = {
        ok: false,
        error: "No email provided — user creation skipped",
      };
    }

    // ── Determine overall success ──
    const overallOk = agencyResult.ok;

    return new Response(
      JSON.stringify({
        success: overallOk,
        agency: payload.agency,
        seatNumber: payload.seatNumber,
        agent: `${payload.firstName} ${payload.lastName}`.trim(),
        results,
      }),
      {
        status: overallOk ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
