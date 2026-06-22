import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/25274165/ugmpquj/';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const data = await req.json();

    const webhookPayload = {
      event: 'form_populated',
      timestamp: new Date().toISOString(),
      agency: data.agency,
      agent: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone
      },
      form: {
        type: data.formType,
        url: data.generatedUrl,
        security_code: data.securityCode,
        expiration_date: data.expirationDate
      }
    };

    console.log('Forwarding populate webhook to Zapier:', webhookPayload);

    const webhookResponse = await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookResponse.ok) {
      console.error('Zapier webhook failed:', webhookResponse.status, webhookResponse.statusText);
      const errorText = await webhookResponse.text();
      console.error('Error response:', errorText);
    } else {
      console.log('Zapier webhook succeeded');
    }

    return new Response(
      JSON.stringify({ 
        success: webhookResponse.ok,
        status: webhookResponse.status
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (error) {
    console.error('Webhook proxy error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});