/**
 * set-portal-password — Admin-only edge function to set/update agency portal passwords
 *
 * After the barrier view migration, portal_password is excluded from the
 * hierarchy_agencies view. This edge function writes directly to the base table
 * (_hierarchy_agencies) using service_role.
 *
 * Auth: Requires authenticated akhojh session (signInWithPassword).
 * The caller must be the portal service account (service@teamfym.com).
 * This matches the auth pattern used by the CRM admin pages in contracting-portal.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // 1. Verify caller is authenticated (has a valid akhojh JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the JWT — must be a real authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Parse and validate request body
    const { agency_id, password } = await req.json();

    if (!agency_id || typeof agency_id !== "string") {
      return new Response(
        JSON.stringify({ error: "agency_id required (UUID)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!password || typeof password !== "string" || password.length < 1) {
      return new Response(
        JSON.stringify({ error: "password required (non-empty string)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // UUID format check
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agency_id)) {
      return new Response(
        JSON.stringify({ error: "agency_id must be a valid UUID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Write portal_password to the base table (not the view)
    const { data, error } = await supabase
      .from("_hierarchy_agencies")
      .update({
        portal_password: password.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", agency_id)
      .select("id, name")
      .single();

    if (error) {
      console.error("[set-portal-password] Update failed:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: "Agency not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, agency_id: data.id, agency_name: data.name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[set-portal-password] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
