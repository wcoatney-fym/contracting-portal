import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * agency-intake-alert
 *
 * Called by AgencyIntake.tsx immediately after a successful Supabase insert.
 * Sends a notification email via Resend to Will, Charlie, and Nell.
 *
 * When the submission came through a parent agency's invite link
 * (invited_by_agency_name is set), the email prominently flags the parent
 * so the team knows which downline relationship is being activated.
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
      agency_ein,
      city,
      state,
      submitted_at,
      invited_by_agency_name,
    } = data;

    const submittedAt = submitted_at
      ? new Date(submitted_at).toLocaleString("en-US", { timeZone: "America/New_York" })
      : new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

    const locationLine = [city, state].filter(Boolean).join(", ") || "—";
    const hasParent = !!invited_by_agency_name;

    // Subject line differs based on whether this came via a parent agency
    const subjectLine = hasParent
      ? `Sub-Agency Intake: ${agency_name ?? "New Submission"} (via ${invited_by_agency_name})`
      : `Agency Intake: ${agency_name ?? "New Submission"}`;

    // Banner color and headline: orange when parent-agency-referred (higher signal)
    const bannerBg = hasParent ? "#b45309" : "#1a1a2e";
    const headline = hasParent
      ? `📋 Sub-Agency Intake — ${invited_by_agency_name}`
      : `✅ Agency Intake Form Completed`;

    const parentBannerHtml = hasParent ? `
      <tr>
        <td colspan="2" style="padding: 10px 0 6px;">
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 10px 14px;">
            <strong style="color: #92400e;">Parent Agency:</strong>
            <span style="color: #78350f; font-size: 15px; margin-left: 6px;">${invited_by_agency_name}</span>
          </div>
        </td>
      </tr>` : "";

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
  <div style="background: ${bannerBg}; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0; font-size: 18px;">${headline}</h2>
    ${hasParent ? `<p style="color: #fcd34d; margin: 6px 0 0; font-size: 13px;">Submitted via ${invited_by_agency_name}'s invite link</p>` : ""}
  </div>
  <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      ${parentBannerHtml}
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 40%; color: #555;">Agency Name</td>
        <td style="padding: 8px 0; font-size: 15px; font-weight: 600;">${agency_name ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Principal Agent</td>
        <td style="padding: 8px 0;">${principal_agent ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Contracting Email</td>
        <td style="padding: 8px 0;"><a href="mailto:${contracting_email}" style="color: #1a1a2e;">${contracting_email ?? "—"}</a></td>
      </tr>
      ${contracting_contact ? `
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Contracting Contact</td>
        <td style="padding: 8px 0;">${contracting_contact}</td>
      </tr>` : ""}
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Agency NPN</td>
        <td style="padding: 8px 0;">${agency_npn ?? "—"}</td>
      </tr>
      ${agency_ein ? `
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #555;">Agency EIN</td>
        <td style="padding: 8px 0;">${agency_ein}</td>
      </tr>` : ""}
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

    const textBody = `${hasParent ? `Sub-Agency Intake via ${invited_by_agency_name}` : "Agency Intake Completed"}

${hasParent ? `Parent Agency: ${invited_by_agency_name}\n` : ""}Agency: ${agency_name ?? "—"}
Principal: ${principal_agent ?? "—"}
Email: ${contracting_email ?? "—"}
${contracting_contact ? `Contact: ${contracting_contact}\n` : ""}NPN: ${agency_npn ?? "—"}
${agency_ein ? `EIN: ${agency_ein}\n` : ""}Location: ${locationLine}
Submitted: ${submittedAt} ET

Review at https://contracting.teamfym.com`;

    const resendPayload = {
      from: "FYM Contracting <activation@send.teamfym.com>",
      to: ALERT_RECIPIENTS.map((r) => `${r.name} <${r.email}>`),
      reply_to: "will@teamfym.com",
      subject: subjectLine,
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
