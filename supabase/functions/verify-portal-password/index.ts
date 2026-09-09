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
      JSON.stringify({ valid: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { slug, password } = await req.json();

    if (!slug || typeof slug !== "string" || !password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "slug and password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Sanitize slug — alphanumeric + hyphens + spaces + common punctuation, max 100 chars
    // Agency names may include parentheses, slashes, ampersands, etc.
    const cleanSlug = slug.trim().slice(0, 100);
    if (!/^[\w\s\-&'.,()\/:]+$/i.test(cleanSlug)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid slug format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Two-path verification: eliminates any deploy ordering dependency.
    //
    // Path 1 (post-migration): Call the verify_portal_password RPC.
    //   The RPC is SECURITY DEFINER — reads portal_password from the base
    //   table (_hierarchy_agencies) and returns a boolean match. The password
    //   never leaves the DB. Created atomically in the barrier view migration.
    //
    // Path 2 (pre-migration fallback): If the RPC does not exist yet, fall
    //   back to reading portal_password from hierarchy_agencies directly
    //   (the base table, pre-rename). This keeps logins working during the
    //   window between edge function deploy and migration.
    //
    // Result: deploy this edge function and run the migration in any order.
    //   Zero downtime window.

    // Try the RPC first (post-migration path)
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc("verify_portal_password", {
        p_slug: cleanSlug,
        p_password: password,
      });

    if (!rpcError && rpcResult !== null && rpcResult !== undefined) {
      // RPC exists and returned a result — use it
      return new Response(
        JSON.stringify({ valid: rpcResult }),
        { status: rpcResult ? 200 : 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // RPC not found (pre-migration) — fall back to direct table read
    const { data, error } = await supabase
      .from("hierarchy_agencies")
      .select("portal_password")
      .eq("name", cleanSlug)
      .maybeSingle();

    if (error || !data || !data.portal_password) {
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Constant-time-ish comparison
    const stored = data.portal_password;
    const valid = stored.length === password.length &&
      stored.split("").every((c: string, i: number) => c === password[i]);

    return new Response(
      JSON.stringify({ valid }),
      { status: valid ? 200 : 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ valid: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
