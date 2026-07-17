const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const POPULATE_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/populate-form-webhook`;
const AGENCY_INTAKE_ALERT_URL = `${SUPABASE_URL}/functions/v1/agency-intake-alert`;
const SUBMISSION_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/form-submission-webhook`;
const HIP_WRITING_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/hip-writing-webhook`;
const CRM_ONBOARDING_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/crm-onboarding-webhook`;
const CROSS_SELL_CONFIRM_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/cross-sell-confirm-webhook`;

interface PopulateWebhookData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  formType: string;
  agency: string;
  generatedUrl: string;
  securityCode: string;
  expirationDate: string;
}

interface SubmissionWebhookData {
  formType: string;
  agentType?: string;
  agency: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  securityCode: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  ssn: string;
  residentLicenseNumber: string;
  npn: string;
  residentState: string;
  gender: string;
  ctmAcknowledgment?: string;
  releaseNeeded: string;
  stateLicenses: string[];
  uploadedFiles: Array<{ name: string; type: string }>;
}

export const firePopulateWebhook = async (data: PopulateWebhookData): Promise<void> => {
  const response = await fetch(POPULATE_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      formType: data.formType,
      agency: data.agency,
      generatedUrl: data.generatedUrl,
      securityCode: data.securityCode,
      expirationDate: data.expirationDate
    })
  });

  if (!response.ok) {
    throw new Error(`Populate webhook failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(`Zapier forwarding failed (status ${result.status})`);
  }
};

export const fireSubmissionWebhook = async (data: SubmissionWebhookData): Promise<void> => {
  try {
    const response = await fetch(SUBMISSION_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      console.log('Submission webhook fired successfully');
    } else {
      console.error('Submission webhook failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Submission webhook error:', error);
  }
};

interface HipWritingWebhookData {
  firstName: string;
  lastName: string;
  npn: string;
  agency: string;
  unlWritingNumber: string;
  gtlWritingNumber: string;
}

export const fireHipWritingWebhook = async (data: HipWritingWebhookData): Promise<void> => {
  try {
    const response = await fetch(HIP_WRITING_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log('HIP writing webhook fired successfully');
    } else {
      console.error('HIP writing webhook failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('HIP writing webhook error:', error);
  }
};

interface CrmOnboardingWebhookData {
  seatNumber: string;
  agentNpn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string;
  crmNumber: string;
  agency: string;
  digitalBusinessCardUrl?: string;
  confirmationPageUrl?: string;
  calendarEmbedCode?: string;
}

export const warmUpCrmOnboardingWebhook = async (): Promise<void> => {
  try {
    await fetch(CRM_ONBOARDING_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ ping: true }),
    });
  } catch {
    // Warm-up failure is non-critical
  }
};

/**
 * Calendar embed codes are raw HTML (<iframe ...>/<script ...>) containing double
 * quotes and line breaks. Downstream (Zapier -> HL Pro Tools) drops these values
 * into a JSON payload (custom_values_json); the literal quotes and newlines break
 * the JSON ("Unexpected non-whitespace character after JSON"). Normalize to a
 * single line with single-quoted attributes so it stays valid HTML AND JSON-safe.
 */
export const sanitizeEmbedCodeForJson = (embed?: string): string => {
  if (!embed) return '';
  return embed
    .replace(/[\r\n\t]+/g, ' ') // remove line breaks / tabs
    .replace(/"/g, "'")         // double quotes -> single quotes (valid HTML, JSON-safe)
    .replace(/\s{2,}/g, ' ')     // collapse runs of whitespace
    .trim();
};

export const fireCrmOnboardingWebhook = async (data: CrmOnboardingWebhookData): Promise<boolean> => {
  const payload = {
    ...data,
    calendarEmbedCode: sanitizeEmbedCodeForJson(data.calendarEmbedCode),
  };
  try {
    const response = await fetch(CRM_ONBOARDING_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return true;
      }
      console.error('CRM onboarding webhook: Zapier returned non-OK status', result.status);
      return false;
    } else {
      console.error('CRM onboarding webhook failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('CRM onboarding webhook error:', error);
    return false;
  }
};

interface CrossSellProduct {
  product_number: number;
  product_name: string;
  fields: Record<string, string>;
}

interface CrossSellConfirmWebhookData {
  agency: string;
  businessName: string;
  businessLogoUrl: string;
  csrFirstName: string;
  csrLastName: string;
  csrPhone: string;
  csrEmail: string;
  agencyPhone: string;
  agencyUrlPrefix: string;
  products: CrossSellProduct[];
}

interface AgencyIntakeAlertData {
  agency_name: string;
  principal_agent: string;
  contracting_email: string;
  contracting_contact?: string | null;
  agency_npn: string;
  agency_ein?: string | null;
  city?: string | null;
  state?: string | null;
  submitted_at?: string;
  // Parent agency context — populated when submitted via a parent agency's invite link
  invited_by_agency_name?: string | null;
}

export const fireAgencyIntakeAlert = async (data: AgencyIntakeAlertData): Promise<void> => {
  try {
    const response = await fetch(AGENCY_INTAKE_ALERT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      console.log('Agency intake alert sent');
    } else {
      console.error('Agency intake alert failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Agency intake alert error:', error);
  }
};

// ── Agency Intake Welcome ────────────────────────────────────────────────────

const AGENCY_INTAKE_WELCOME_URL = `${SUPABASE_URL}/functions/v1/agency-intake-welcome`;

interface AgencyIntakeWelcomeData {
  agency_name: string;
  agency_slug?: string | null;
  principal_agent: string;
  contracting_email: string;
  contracting_contact?: string | null;
  intake_submission_id?: string | null;
}

/**
 * Fires after a successful agency_intake_submissions insert.
 * Looks up the agency's Activity Tracker credentials and either:
 *   • sends a welcome email with the admin link + login creds, OR
 *   • creates a cc_tasks flag for the team to send manually.
 * Best-effort, non-blocking — call without await.
 */
export const fireAgencyIntakeWelcome = async (data: AgencyIntakeWelcomeData): Promise<void> => {
  try {
    const response = await fetch(AGENCY_INTAKE_WELCOME_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      const result = await response.json();
      console.log('Agency intake welcome fired:', result.path, result.resend_id ?? '');
    } else {
      console.error('Agency intake welcome webhook failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Agency intake welcome webhook error:', error);
  }
};

export const fireCrossSellConfirmWebhook = async (data: CrossSellConfirmWebhookData): Promise<boolean> => {
  try {
    const response = await fetch(CROSS_SELL_CONFIRM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const result = await response.json();
      return result.success;
    }
    console.error('Cross-sell confirm webhook failed:', response.status, response.statusText);
    return false;
  } catch (error) {
    console.error('Cross-sell confirm webhook error:', error);
    return false;
  }
};
