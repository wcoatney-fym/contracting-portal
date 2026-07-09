import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FORM_ROUTE_MAP: Record<string, string> = {
  'hip': '/hip',
  'hip-career': '/hip-career',
  'hip-broker': '/hip-broker',
  'life-only': '/life',
  'field': '/field',
  'direct-pay': '/direct-pay',
  'telesales': '/telesales',
};

const generateSecurityCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

interface AutoSendParams {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  formType: string;
  agency: string;
  baseUrl: string;
  supabase: SupabaseClient;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const autoSendForm = async (params: AutoSendParams) => {
  const {
    firstName, lastName, email, phoneNumber,
    formType, agency, baseUrl, supabase,
    supabaseUrl, supabaseAnonKey,
  } = params;

  const securityCode = generateSecurityCode();
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + 72);

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phoneNumber,
      form_type: formType,
      agency: agency,
      security_code: securityCode,
      status: "pending",
      expiration_date: expirationDate.toISOString(),
      form_url: "temp",
    })
    .select()
    .single();

  if (agentError) throw agentError;

  const formUrl = `${baseUrl}${FORM_ROUTE_MAP[formType]}?id=${agent.id}`;

  await supabase
    .from("agents")
    .update({ form_url: formUrl })
    .eq("id", agent.id);

  await supabase.from("activity_log").insert({
    agent_id: agent.id,
    action: "form_created",
    details: `Auto-generated form for new hire ${firstName} ${lastName}`,
  });

  const populateWebhookUrl = `${supabaseUrl}/functions/v1/populate-form-webhook`;

  const webhookPayload = {
    firstName,
    lastName,
    email,
    phone: phoneNumber,
    formType,
    agency,
    generatedUrl: formUrl,
    securityCode,
    expirationDate: expirationDate.toISOString(),
  };

  console.log(`[autoSendForm] Triggering populate webhook for ${firstName} ${lastName} (${formType}/${agency})`);

  const populateResponse = await fetch(populateWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(webhookPayload),
  });

  if (!populateResponse.ok) {
    const errorText = await populateResponse.text();
    console.error(`[autoSendForm] Populate webhook failed (${populateResponse.status}):`, errorText);
    throw new Error(`Populate webhook failed with status ${populateResponse.status}: ${errorText}`);
  }

  const populateResult = await populateResponse.json();

  if (!populateResult.success) {
    console.error(`[autoSendForm] Zapier forwarding failed:`, populateResult);
    throw new Error(`Zapier forwarding reported failure: ${JSON.stringify(populateResult)}`);
  }

  console.log(`[autoSendForm] Successfully triggered Zapier for ${firstName} ${lastName} — agent ${agent.id}`);

  return { agentId: agent.id, formUrl };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const raw = await req.json();

    const firstName = raw.firstName || raw.first_name || '';
    const lastName = raw.lastName || raw.last_name || '';
    const email = raw.email || '';
    const phoneNumber = raw.phoneNumber || raw.phone_number || '';
    const formType = (raw.formType || raw.form_type || '').toLowerCase().trim().replace(/\s+/g, '-');
    const agency = raw.agency || 'FYM';
    const appUrl = raw.appUrl || raw.app_url || '';

    if (!firstName || !lastName || !email || !phoneNumber) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["firstName (or first_name)", "lastName (or last_name)", "email", "phoneNumber (or phone_number)"],
          received: { firstName, lastName, email, phoneNumber },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("webhook_log").insert({
      function_name: "new-hire-webhook",
      payload: { firstName, lastName, email, phoneNumber, formType, agency },
      outcome: "received",
    });

    const baseUrl = (appUrl || "https://contracting.teamfym.com").replace(/\/+$/, '');

    const directAutoSend = !!(formType && FORM_ROUTE_MAP[formType]);

    if (directAutoSend) {
      const result = await autoSendForm({
        firstName, lastName, email, phoneNumber,
        formType, agency, baseUrl, supabase,
        supabaseUrl, supabaseAnonKey,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "New hire processed and form sent automatically",
          agent_id: result.agentId,
          form_url: result.formUrl,
          auto_sent: true,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data, error } = await supabase
      .from("new_hires")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phoneNumber,
        form_type: formType || undefined,
        agency: agency,
        processed: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({
            error: "Duplicate entry",
            message: "An agent with this email already exists in new hires",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    const dbFormType = data.form_type;

    if (dbFormType && FORM_ROUTE_MAP[dbFormType]) {
      const result = await autoSendForm({
        firstName, lastName, email, phoneNumber,
        formType: dbFormType, agency, baseUrl, supabase,
        supabaseUrl, supabaseAnonKey,
      });

      await supabase
        .from("new_hires")
        .update({ processed: true })
        .eq("id", data.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "New hire added and form sent automatically based on database form type",
          new_hire_id: data.id,
          agent_id: result.agentId,
          form_url: result.formUrl,
          auto_sent: true,
          form_type_source: "database_default",
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "New hire added successfully",
        data,
        auto_sent: false,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing new hire webhook:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
