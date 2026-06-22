import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GHL_BASE = "https://services.leadconnectorhq.com";
const BATCH_SIZE = 100;
const PAGES_PER_CHUNK = 20; // 20 pages x 100 = 2000 contacts per chunk
const PAGE_DELAY_MS = 150;
const MAX_RETRIES = 2;
const MAX_CHUNKS = 50; // Safety: max 50 chunks = 100,000 contacts before forced stop
const CHUNK_DELAY_MS = 500; // Delay between chunks to be kind to GHL rate limits

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GhlHeaders {
  Authorization: string;
  "Content-Type": string;
  Version: string;
}

interface GhlContact {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customFields?: { id: string; key?: string; field_key?: string; value: string }[];
  dateAdded?: string;
  assignedTo?: string;
}

function getCustomField(contact: GhlContact, key: string): string {
  if (!contact.customFields) return "";
  const field = contact.customFields.find(
    (f) =>
      f.key?.toLowerCase() === key.toLowerCase() ||
      f.field_key?.toLowerCase() === key.toLowerCase(),
  );
  return field?.value || "";
}

function mapContactStatus(
  contact: GhlContact,
): "active" | "terminated" | "at_risk" | "lapsed" {
  const clientStatus = getCustomField(contact, "client_status").toLowerCase();
  if (clientStatus === "declined") return "terminated";
  if (clientStatus === "cancelled") return "at_risk";
  if (clientStatus === "lapsed") return "lapsed";
  return "active";
}

interface ChunkResult {
  contacts: GhlContact[];
  nextCursor: string | null;
  metaTotal: number;
  done: boolean;
}

async function fetchWithRetry(
  url: string,
  headers: GhlHeaders,
): Promise<Response | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res;
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "3", 10);
      await sleep(retryAfter * 1000);
      continue;
    }
    if (res.status >= 500) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    return null;
  }
  return null;
}

async function fetchContactsChunk(
  locationId: string,
  headers: GhlHeaders,
  startCursor: string | null,
): Promise<ChunkResult> {
  const contacts: GhlContact[] = [];
  let cursor = startCursor;
  let metaTotal = 0;

  for (let page = 0; page < PAGES_PER_CHUNK; page++) {
    let url = `${GHL_BASE}/contacts/?locationId=${locationId}&limit=100`;
    if (cursor) {
      url += `&startAfterId=${cursor}`;
    }

    const res = await fetchWithRetry(url, headers);
    if (!res) break;

    const data = await res.json();

    if (page === 0 && !startCursor && data.meta?.total) {
      metaTotal = data.meta.total;
    }

    const batch: GhlContact[] = data.contacts || [];
    if (batch.length === 0) {
      return { contacts, nextCursor: null, metaTotal, done: true };
    }

    contacts.push(...batch);
    cursor = batch[batch.length - 1].id;

    if (batch.length < 100) {
      return { contacts, nextCursor: null, metaTotal, done: true };
    }

    if (page < PAGES_PER_CHUNK - 1) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  return { contacts, nextCursor: cursor, metaTotal, done: false };
}

interface Opportunity {
  id: string;
  name?: string;
  contact?: { name?: string };
  monetaryValue?: number;
  pipelineStageId?: string;
  status?: string;
  assignedTo?: string;
  closedDate?: string;
  source?: string;
  tags?: string[];
  pipelineStageName?: string;
}

async function fetchAllOpportunities(
  locationId: string,
  headers: GhlHeaders,
): Promise<Opportunity[]> {
  const all: Opportunity[] = [];
  let hasMore = true;
  let page = 1;

  while (hasMore) {
    const url =
      `${GHL_BASE}/opportunities/search?location_id=${locationId}&limit=100&page=${page}`;
    const res = await fetchWithRetry(url, headers);
    if (!res) break;
    const data = await res.json();
    const opps: Opportunity[] = data.opportunities || [];
    all.push(...opps);
    hasMore = opps.length === 100;
    page++;
    if (page > 50) break;
    await sleep(PAGE_DELAY_MS);
  }

  return all;
}

function computeKpisFromOpportunities(opps: Opportunity[]) {
  let crossSellOpportunities = 0;
  let savedPolicies = 0;
  let cancellations = 0;

  for (const opp of opps) {
    const stageLower = (opp.pipelineStageName || opp.pipelineStageId || "")
      .toLowerCase();
    const nameLower = (opp.name || "").toLowerCase();
    const tags = (opp.tags || []).map((t: string) => t.toLowerCase());

    if (
      stageLower.includes("cross") || stageLower.includes("x-sell") ||
      nameLower.includes("cross") || nameLower.includes("x-sell") ||
      tags.some((t) => t.includes("cross") || t.includes("x-sell"))
    ) {
      crossSellOpportunities++;
    }

    if (
      opp.status === "won" &&
      (stageLower.includes("save") || stageLower.includes("retain") ||
        nameLower.includes("save") || nameLower.includes("retain") ||
        tags.some((t) => t.includes("save") || t.includes("retain")))
    ) {
      savedPolicies++;
    }

    if (
      opp.status === "lost" || opp.status === "abandoned" ||
      stageLower.includes("cancel") || stageLower.includes("churn") ||
      nameLower.includes("cancel") || nameLower.includes("churn") ||
      tags.some((t) => t.includes("cancel") || t.includes("churn"))
    ) {
      cancellations++;
    }
  }

  return { crossSellOpportunities, savedPolicies, cancellations };
}

function buildDealRows(opportunities: Opportunity[], agencyId: string) {
  const now = new Date().toISOString();
  return opportunities.map((opp) => ({
    agency_id: agencyId,
    ghl_deal_id: opp.id,
    deal_name: opp.name || "Untitled Deal",
    contact_name: opp.contact?.name || null,
    value: opp.monetaryValue || 0,
    stage: opp.pipelineStageId || "",
    status: opp.status === "won"
      ? "won"
      : opp.status === "lost"
      ? "lost"
      : opp.status === "abandoned"
      ? "abandoned"
      : "open",
    assigned_agent_name: opp.assignedTo || null,
    close_date: opp.closedDate || null,
    source: opp.source || null,
    synced_at: now,
  }));
}

function buildClientRows(contacts: GhlContact[], agencyId: string) {
  const now = new Date().toISOString();
  return contacts.map((c) => ({
    agency_id: agencyId,
    ghl_contact_id: c.id,
    first_name: c.firstName || "",
    last_name: c.lastName || "",
    client_name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
      "Unknown",
    phone: c.phone || "",
    email: c.email || "",
    submit_date: c.dateAdded || null,
    ghl_assigned_to: c.assignedTo || "",
    status: mapContactStatus(c),
    carrier: getCustomField(c, "carrier") ||
      getCustomField(c, "insurance_carrier") || "",
    policy_number: getCustomField(c, "policy_number") || "",
    premium_amount:
      parseFloat(
        getCustomField(c, "premium_amount") ||
          getCustomField(c, "premium") || "0",
      ) || 0,
    product_type: getCustomField(c, "product_type") ||
      getCustomField(c, "lob") || "",
    effective_date: getCustomField(c, "effective_date") || null,
    termination_date: getCustomField(c, "termination_date") || null,
    updated_at: now,
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agency_id, test_only } = await req.json();

    if (!agency_id) {
      return new Response(
        JSON.stringify({ success: false, error: "agency_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: config, error: configError } = await supabase
      .from("agency_ghl_configs")
      .select("*")
      .eq("agency_id", agency_id)
      .maybeSingle();

    if (configError || !config) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GHL config not found for this agency",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!config.ghl_api_key || !config.ghl_location_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "API key or Location ID is missing",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const ghlHeaders: GhlHeaders = {
      Authorization: `Bearer ${config.ghl_api_key}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    };

    // Verify connection
    const testRes = await fetch(
      `${GHL_BASE}/locations/${config.ghl_location_id}`,
      { headers: ghlHeaders },
    );

    if (!testRes.ok) {
      const errText = await testRes.text();
      await supabase
        .from("agency_ghl_configs")
        .update({
          connection_status: "error",
          last_error:
            `GHL API returned ${testRes.status}: ${errText.slice(0, 200)}`,
          sync_in_progress: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: `GHL API returned ${testRes.status}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    await supabase
      .from("agency_ghl_configs")
      .update({
        connection_status: "connected",
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", config.id);

    if (test_only) {
      return new Response(
        JSON.stringify({ success: true, message: "Connection verified" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Always start fresh -- clear cursor for a clean full sync each time
    // This prevents permanently stuck states from partial syncs
    await supabase
      .from("agency_ghl_configs")
      .update({
        sync_cursor: null,
        sync_in_progress: true,
        sync_fetched_so_far: 0,
        sync_total_expected: 0,
      })
      .eq("id", config.id);

    // --- Loop internally: fetch ALL contacts in consecutive chunks ---
    let cursor: string | null = null;
    let totalFetched = 0;
    let totalExpected = 0;
    let clientsSynced = 0;
    let chunkCount = 0;

    while (chunkCount < MAX_CHUNKS) {
      chunkCount++;

      const { contacts, nextCursor, metaTotal, done } =
        await fetchContactsChunk(config.ghl_location_id, ghlHeaders, cursor);

      if (metaTotal > 0 && totalExpected === 0) {
        totalExpected = metaTotal;
      }

      // Upsert this chunk into agency_clients
      const clientRows = buildClientRows(contacts, agency_id);
      for (let i = 0; i < clientRows.length; i += BATCH_SIZE) {
        const batch = clientRows.slice(i, i + BATCH_SIZE);
        const { error: batchError } = await supabase
          .from("agency_clients")
          .upsert(batch, {
            onConflict: "agency_id,ghl_contact_id",
            ignoreDuplicates: false,
          });
        if (!batchError) {
          clientsSynced += batch.length;
        }
      }

      totalFetched += contacts.length;
      cursor = nextCursor;

      // Update progress in DB so UI can show status
      await supabase
        .from("agency_ghl_configs")
        .update({
          sync_cursor: cursor,
          sync_fetched_so_far: totalFetched,
          sync_total_expected: totalExpected,
        })
        .eq("id", config.id);

      if (done || contacts.length === 0) {
        break;
      }

      // Safety valve: if we've fetched well beyond expected total, stop
      if (totalExpected > 0 && totalFetched >= totalExpected * 1.5) {
        break;
      }

      // Delay between chunks to avoid GHL rate limits
      await sleep(CHUNK_DELAY_MS);
    }

    // --- Sync complete: compute KPIs and sync deals ---
    const opportunities = await fetchAllOpportunities(
      config.ghl_location_id,
      ghlHeaders,
    );

    // Get full client counts from DB for KPIs
    const { count: activeCount } = await supabase
      .from("agency_clients")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency_id)
      .eq("status", "active");
    const { count: terminatedCount } = await supabase
      .from("agency_clients")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency_id)
      .eq("status", "terminated");
    const { count: atRiskCount } = await supabase
      .from("agency_clients")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency_id)
      .eq("status", "at_risk");
    const { count: totalClients } = await supabase
      .from("agency_clients")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency_id);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { count: policiesThisMonth } = await supabase
      .from("agency_clients")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency_id)
      .gte("effective_date", isoDate(monthStart));

    const { crossSellOpportunities, savedPolicies, cancellations } =
      computeKpisFromOpportunities(opportunities);

    const kpiRow = {
      agency_id,
      period_type: "snapshot",
      period_start: isoDate(now),
      period_end: isoDate(now),
      deals_closed: opportunities.filter((o) => o.status === "won").length,
      revenue: opportunities
        .filter((o) => o.status === "won")
        .reduce((sum, o) => sum + (o.monetaryValue || 0), 0),
      pipeline_value: opportunities
        .filter((o) =>
          o.status !== "won" && o.status !== "lost" &&
          o.status !== "abandoned"
        )
        .reduce((sum, o) => sum + (o.monetaryValue || 0), 0),
      total_contacts: totalExpected || (totalClients || 0),
      contacts_week: 0,
      contacts_month: 0,
      cross_sell_opportunities: crossSellOpportunities,
      saved_policies: savedPolicies,
      cancellations,
      active_clients: activeCount || 0,
      terminated_clients: terminatedCount || 0,
      at_risk_clients: atRiskCount || 0,
      total_policies: totalClients || 0,
      policies_this_month: policiesThisMonth || 0,
      computed_at: now.toISOString(),
    };

    await supabase.from("agency_kpis").insert(kpiRow);

    // Batch upsert deals
    const dealRows = buildDealRows(opportunities, agency_id);
    for (let i = 0; i < dealRows.length; i += BATCH_SIZE) {
      const batch = dealRows.slice(i, i + BATCH_SIZE);
      await supabase
        .from("agency_deals")
        .upsert(batch, { onConflict: "ghl_deal_id" });
    }

    // Mark sync complete
    await supabase
      .from("agency_ghl_configs")
      .update({
        last_sync_at: now.toISOString(),
        sync_cursor: null,
        sync_in_progress: false,
        sync_fetched_so_far: totalFetched,
        updated_at: now.toISOString(),
      })
      .eq("id", config.id);

    return new Response(
      JSON.stringify({
        success: true,
        complete: true,
        total_contacts_fetched: totalFetched,
        total_contacts_synced: clientsSynced,
        total_expected: totalExpected,
        chunks_processed: chunkCount,
        opportunities_synced: dealRows.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
