import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * agency-intake-welcome
 *
 * Fires after a successful agency_intake_submissions insert.
 * Two-path logic:
 *
 *   PATH A — Credentials found in the Activity Tracker's admin_credentials table:
 *     → Send welcome email via Resend with the tracker admin link + login creds.
 *
 *   PATH B — No credentials found (agency not yet provisioned in the tracker):
 *     → Insert a cc_tasks row into the portal DB so the team is flagged to
 *       send the welcome email manually once credentials are created.
 *
 * Required edge-function secrets (set in portal Supabase dashboard → Secrets):
 *   RESEND_API_KEY              — Resend API key
 *   TRACKER_SUPABASE_URL        — Activity Tracker Supabase project URL
 *   TRACKER_SERVICE_ROLE_KEY    — Activity Tracker service-role key (read admin_credentials)
 *   TRACKER_APP_URL             — Activity Tracker frontend URL (e.g. https://hi.teamfym.com)
 *
 * Portal DB credentials auto-injected by Supabase runtime (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */

const RESEND_API_KEY          = Deno.env.get("RESEND_API_KEY") ?? "";
const TRACKER_SUPABASE_URL    = Deno.env.get("TRACKER_SUPABASE_URL") ?? "";
const TRACKER_SERVICE_KEY     = Deno.env.get("TRACKER_SERVICE_ROLE_KEY") ?? "";
const TRACKER_APP_URL         = (Deno.env.get("TRACKER_APP_URL") ?? "").replace(/\/$/, "");

// Portal DB (auto-injected by Supabase edge runtime)
const PORTAL_SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const PORTAL_SERVICE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Email builder ─────────────────────────────────────────────────────────────

function buildWelcomeEmail(params: {
  agencyName: string;
  principalAgent: string;
  toEmail: string;
  toName: string;
  adminUrl: string;
  username: string;
  password: string;
}) {
  const { agencyName, principalAgent, toEmail, toName, adminUrl, username, password } = params;

  const subject = `Your Activity Tracker Access — ${agencyName}`;

  const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
  <div style="background: #1a1a2e; padding: 24px; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0; font-size: 20px;">FYM Financial</h2>
    <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">where transparency &amp; opportunity meet</p>
  </div>
  <div style="background: #f9f9f9; padding: 28px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #1a1a2e; margin-top: 0;">Hi ${toName},</p>
    <p style="color: #374151; line-height: 1.6;">
      Welcome to FYM! Your agency's Activity Tracker portal is ready. Below are your admin login
      credentials — use them to access your agency's production reports, leaderboard, and policy data.
    </p>

    <div style="background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0 0 14px;">Activity Tracker — Admin Access</p>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #555; width: 36%; font-size: 14px;">Agency</td>
          <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1a1a2e;">${agencyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #555; font-size: 14px;">Login URL</td>
          <td style="padding: 8px 0; font-size: 14px;">
            <a href="${adminUrl}" style="color: #1a56db; text-decoration: underline;">${adminUrl}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #555; font-size: 14px;">Username</td>
          <td style="padding: 8px 0; font-size: 14px; font-family: monospace; background: #f3f4f6; padding: 6px 10px; border-radius: 4px;">${username}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #555; font-size: 14px;">Password</td>
          <td style="padding: 8px 0; font-size: 14px; font-family: monospace; background: #f3f4f6; padding: 6px 10px; border-radius: 4px;">${password}</td>
        </tr>
      </table>
    </div>

    <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #92400e;">
        🔒 Keep these credentials secure. You can change your password anytime from within the portal.
      </p>
    </div>

    <div style="background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 10px; font-size: 15px; font-weight: 700; color: #0c4a6e;">📋 Next Step: Upload Your Agent Roster</p>
      <p style="margin: 0 0 10px; font-size: 14px; color: #0369a1; line-height: 1.6;">
        To get your agency fully set up, please upload your agent roster inside the Activity Tracker:
      </p>
      <ol style="margin: 0 0 10px; padding-left: 20px; font-size: 14px; color: #0369a1; line-height: 1.8;">
        <li>Log in using the credentials above</li>
        <li>Navigate to the <strong>Admin</strong> panel</li>
        <li>Select <strong>Agent Roster</strong> and upload your CSV file</li>
      </ol>
      <p style="margin: 0; font-size: 13px; color: #0369a1;">
        Need the roster template? It's available for download inside the portal. Reach out to us if you need help formatting your file.
      </p>
    </div>

    <p style="color: #374151; font-size: 14px; line-height: 1.6;">
      Questions? Reply to this email or reach us at
      <a href="mailto:Contracting@teamfym.com" style="color: #1a1a2e;">Contracting@teamfym.com</a>.
    </p>
    <p style="color: #374151; font-size: 14px; margin-bottom: 0;">— The FYM Team</p>
  </div>
</div>`;

  const textBody = `Hi ${toName},

Your Activity Tracker portal is ready for ${agencyName}.

LOGIN DETAILS
Agency:    ${agencyName}
Login URL: ${adminUrl}
Username:  ${username}
Password:  ${password}

Keep these credentials secure.

NEXT STEP: Upload Your Agent Roster
1. Log in using the credentials above
2. Navigate to the Admin panel
3. Select Agent Roster and upload your CSV file

Need the roster template? It's available for download inside the portal.

Questions? Contact Contracting@teamfym.com`;

  return { subject, htmlBody, textBody, toEmail, toName };
}

// ── cc_tasks fallback ─────────────────────────────────────────────────────────

async function createFallbackTask(params: {
  agencyName: string;
  principalAgent: string;
  contractingEmail: string;
  intakeSubmissionId: string;
  reason: string;
}) {
  if (!PORTAL_SUPABASE_URL || !PORTAL_SERVICE_KEY) {
    console.error("Portal Supabase env not configured — cannot create fallback task");
    return;
  }

  const portal = createClient(PORTAL_SUPABASE_URL, PORTAL_SERVICE_KEY);

  const title = `Send Activity Tracker credentials — ${params.agencyName}`;
  const description =
    `Agency "${params.agencyName}" completed their intake form but no Activity Tracker ` +
    `credentials were found (${params.reason}).\n\n` +
    `Principal: ${params.principalAgent}\n` +
    `Email: ${params.contractingEmail}\n` +
    `Intake ID: ${params.intakeSubmissionId}\n\n` +
    `Action: Create agency credentials in the Activity Tracker admin panel, then ` +
    `send the welcome email with the admin link and login details.`;

  const { error } = await portal.from("cc_tasks").insert({
    title,
    description,
    source: "agency_intake",
    skill_category: "retention",
    difficulty: 3,
    priority: "P2",
    status: "backlog",
    assignee_id: null,
  });

  if (error) {
    console.error("Failed to create fallback cc_task:", error.message);
  } else {
    console.log("Fallback cc_task created for agency:", params.agencyName);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      agency_name,
      agency_slug,          // optional — passed through if known at intake time
      principal_agent,
      contracting_email,
      contracting_contact,
      intake_submission_id, // uuid of the agency_intake_submissions row
    } = body;

    if (!agency_name || !contracting_email) {
      return jsonResponse({ success: false, error: "agency_name and contracting_email are required" }, 400);
    }

    // Resolve the display name for the email greeting
    const toName = contracting_contact?.trim() || principal_agent?.trim() || "there";

    // ── Step 1: Look up credentials in the tracker DB ─────────────────────────
    let credUsername: string | null = null;
    let credPassword: string | null = null;
    let agencySlug:   string | null = agency_slug ?? null;
    let trackerLookupError: string | null = null;

    if (!TRACKER_SUPABASE_URL || !TRACKER_SERVICE_KEY) {
      trackerLookupError = "TRACKER_SUPABASE_URL or TRACKER_SERVICE_ROLE_KEY not configured";
      console.warn(trackerLookupError);
    } else {
      const tracker = createClient(TRACKER_SUPABASE_URL, TRACKER_SERVICE_KEY);

      // Try to find the agency in the tracker's agencies table first (by name match)
      // so we can get the slug and then the credential.
      const { data: agencyRows, error: agencyErr } = await tracker
        .from("agencies")
        .select("id, slug, name")
        .ilike("name", agency_name.trim())
        .limit(1);

      if (agencyErr) {
        trackerLookupError = `Agency lookup error: ${agencyErr.message}`;
      } else if (agencyRows && agencyRows.length > 0) {
        const agency = agencyRows[0];
        agencySlug = agencySlug ?? agency.slug;

        // Now look up credentials for this agency
        const { data: credRows, error: credErr } = await tracker
          .from("admin_credentials")
          .select("email_domain, password")
          .eq("agency_id", agency.id)
          .eq("role", "agency_admin")
          .limit(1);

        if (credErr) {
          trackerLookupError = `Credential lookup error: ${credErr.message}`;
        } else if (credRows && credRows.length > 0) {
          credUsername = credRows[0].email_domain;
          credPassword = credRows[0].password;
        } else {
          trackerLookupError = "Agency found in tracker but no admin_credentials row exists yet";
        }
      } else {
        trackerLookupError = `Agency "${agency_name}" not found in tracker DB`;
      }
    }

    // ── Step 2a: Credentials found → send welcome email ───────────────────────
    if (credUsername && credPassword) {
      const adminUrl = agencySlug
        ? `${TRACKER_APP_URL}/admin/dashboard/${agencySlug}`
        : `${TRACKER_APP_URL}/admin`;

      const { subject, htmlBody, textBody } = buildWelcomeEmail({
        agencyName: agency_name,
        principalAgent: principal_agent ?? "",
        toEmail: contracting_email,
        toName,
        adminUrl,
        username: credUsername,
        password: credPassword,
      });

      const resendPayload = {
        from: "FYM Activation <activation@send.teamfym.com>",
        to: [`${toName} <${contracting_email}>`],
        reply_to: "will@teamfym.com",
        subject,
        html: htmlBody,
        text: textBody,
        // Tracking per MEMORY.md standing rule
        headers: {
          "X-Entity-Ref-ID": intake_submission_id ?? agency_name,
        },
      };

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(resendPayload),
      });

      const resendResult = await resendRes.json();

      if (!resendRes.ok) {
        console.error("Resend error:", resendResult);
        // Still create a fallback task so nothing falls through the cracks
        await createFallbackTask({
          agencyName: agency_name,
          principalAgent: principal_agent ?? "",
          contractingEmail: contracting_email,
          intakeSubmissionId: intake_submission_id ?? "",
          reason: `Resend send failed: ${JSON.stringify(resendResult)}`,
        });
        return jsonResponse({ success: false, path: "email_failed_task_created", error: resendResult });
      }

      console.log("Welcome email sent:", resendResult.id, "→", contracting_email);
      return jsonResponse({ success: true, path: "email_sent", resend_id: resendResult.id });
    }

    // ── Step 2b: No credentials → create cc_tasks flag ───────────────────────
    console.log("No credentials found, creating fallback task. Reason:", trackerLookupError);

    await createFallbackTask({
      agencyName: agency_name,
      principalAgent: principal_agent ?? "",
      contractingEmail: contracting_email,
      intakeSubmissionId: intake_submission_id ?? "",
      reason: trackerLookupError ?? "Unknown — no credential match",
    });

    return jsonResponse({
      success: true,
      path: "task_created",
      reason: trackerLookupError,
    });

  } catch (err) {
    console.error("agency-intake-welcome error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
