import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * agency-intake-alert
 *
 * Called by AgencyIntake.tsx immediately after a successful Supabase insert.
 * Sends a notification email via Resend to Will, Charlie, and Nell so the team
 * knows in real time when an agency completes the intake form.
 *
 * Required env vars (set in Supabase dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY  — Resend API key
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const ALERT_RECIPIENTS = [
  { email: "will@teamfym.com",        name: "Will Coatney" },
  { email: "rmitchell@teamfym.com",   name: "Charlie" },
  { email: "nell@teamfym.com",        name: "Nell" },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const data = await req.json();

    const {
      agency_name,
      principal_agent,
      contracting_email,
      contracting_contact,
      agency_npn,
      city,
      state,
      submitted_at,
    } = data;

    const submittedAt = submitted_at
      ? new Date(submitted_at).toLocaleString("en-US", { timeZone: "America/New_York" })
      : new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

    const locationLine = [city, state].filter(Boolean).join(", ") || "—";

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
  <div style="background: #1a1a2e; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0; font-size: 18px;">✅ Agency Intake Form Completed</h2>
  </div>
  <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 40%; color: #555;">Agency Name</td>
        <td style="padding: 8px 0;">${agency_name ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Principal Agent</td>
        <td style="padding: 8px 0;">${principal_agent ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Contracting Email</td>
        <td style="padding: 8px 0;">${contracting_email ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Contracting Contact</td>
        <td style="padding: 8px 0;">${contracting_contact ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Agency NPN</td>
        <td style="padding: 8px 0;">${agency_npn ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Location</td>
        <td style="padding: 8px 0;">${locationLine}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Submitted</td>
        <td style="padding: 8px 0;">${submittedAt} ET</td>
      </tr>
    </table>
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 13px; color: #888;">
      Review in the <a href="https://contracting.teamfym.com" style="color: #1a1a2e;">FYM Contracting Portal</a>
    </div>
  </div>
</div>`;

    const textBody = `Agency Intake Completed

Agency: ${agency_name ?? "—"}
Principal: ${principal_agent ?? "—"}
Email: ${contracting_email ?? "—"}
Contact: ${contracting_contact ?? "—"}
NPN: ${agency_npn ?? "—"}
Location: ${locationLine}
Submitted: ${submittedAt} ET

Review at https://contracting.teamfym.com`;

    const resendPayload = {
      from: "FYM Contracting <activation@send.teamfym.com>",
      to: ALERT_RECIPIENTS.map((r) => `${r.name} <${r.email}>`),
      reply_to: "will@teamfym.com",
      subject: `Agency Intake: ${agency_name ?? "New Submission"}`,
      html: htmlBody,
      text: textBody,
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendResult);
      return new Response(
        JSON.stringify({ success: false, error: resendResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Agency intake alert sent:", resendResult.id);
    return new Response(
      JSON.stringify({ success: true, resend_id: resendResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Agency intake alert error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
