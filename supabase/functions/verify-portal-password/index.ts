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

    // Sanitize slug — alphanumeric + hyphens + spaces only, max 100 chars
    const cleanSlug = slug.trim().slice(0, 100);
    if (!/^[\w\s\-&'.]+$/i.test(cleanSlug)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid slug format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read portal_password using service_role — anon cannot read this column after REVOKE
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

    // Constant-time-ish comparison to avoid timing attacks
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
