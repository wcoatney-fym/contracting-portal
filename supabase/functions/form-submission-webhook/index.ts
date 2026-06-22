import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/25274165/ugmpxb6/';

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

    const FORM_TYPE_TO_AGENT_TYPE: Record<string, string> = {
      'hip-broker': 'HIP Broker',
      'hip-career': 'HIP Career Agent',
    };

    const derivedAgentType = data.agentType || FORM_TYPE_TO_AGENT_TYPE[data.formType] || null;

    const webhookPayload = {
      event: 'form_submitted',
      timestamp: new Date().toISOString(),
      form_type: data.formType,
      agent_type: derivedAgentType,
      agent: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        security_code: data.securityCode
      },
      submission: {
        date_of_birth: data.dob,
        address: data.address,
        city: data.city,
        state: data.state,
        postal_code: data.postalCode,
        ssn: data.ssn,
        resident_license_number: data.residentLicenseNumber,
        npn: data.npn,
        resident_state: data.residentState,
        ctm_acknowledgment: data.ctmAcknowledgment || null,
        release_needed: data.releaseNeeded,
        state_licenses: data.stateLicenses
      },
      files: data.uploadedFiles?.map((file: any) => ({
        file_name: file.name,
        file_type: file.type
      })) || []
    };

    console.log('Forwarding submission webhook to Zapier:', webhookPayload);

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