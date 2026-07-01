import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your hosting platform.');
  throw new Error('Application not configured. Please contact support at Contracting@teamFYM.com');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Agent = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  form_type: 'life-only' | 'field' | 'direct-pay' | 'telesales';
  agency: 'FYM' | 'Wisechoice' | 'Aspire';
  security_code: string;
  status: 'pending' | 'in-progress' | 'completed' | 'expired' | 'terminated';
  date_sent: string;
  date_completed: string | null;
  expiration_date: string;
  form_url: string;
  crm_onboarded: boolean;
  terminated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FormSubmission = {
  id: string;
  agent_id: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  ssn: string;
  resident_license_number: string;
  npn: string;
  resident_state: string;
  ctm_acknowledgment: string | null;
  agent_type: string | null;
  gender: string | null;
  release_needed: string;
  state_licenses: string[];
  submitted_at: string;
};

export type UploadedFile = {
  id: string;
  agent_id: string;
  file_name: string;
  file_type: string;
  file_data: string;
  uploaded_at: string;
};

export type ActivityLog = {
  id: string;
  agent_id: string | null;
  action: string;
  details: string;
  created_at: string;
};

export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length !== 10) return raw;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

export type AgentLobAssignment = {
  id: string;
  agent_id: string;
  line_of_business: string;
  carrier: string;
  writing_number: string;
  created_at: string;
  updated_at: string;
};

export const HIP_CARRIERS = ['UNL', 'GTL'] as const;

export const LINES_OF_BUSINESS = ['HIP'] as const;

export type CrmAgency = {
  id: string;
  name: string;
  assigned_csr: string | null;
  csr_first_name: string | null;
  csr_last_name: string | null;
  csr_phone: string | null;
  csr_email: string | null;
  csr_npn: string | null;
  csr_gender: string | null;
  csr_can_fill_seat: boolean;
  onboarding_status: 'pending_csr_assignment' | 'awaiting_agency_phone' | 'awaiting_subaccount_setup' | 'awaiting_roster_upload' | 'awaiting_dba_upload' | 'onboarding_complete';
  date_added: string;
  seat_count: number;
  is_active: boolean;
  csr_confirmed: boolean;
  roster_confirmed: boolean;
  dba_confirmed: boolean;
  is_test: boolean;
  agency_type: 'main' | 'sub';
  parent_agency_id: string | null;
  crm_number: string | null;
  agency_phone: string | null;
  slug: string | null;
  portal_password: string | null;
  date_created: string | null;
  roster_sent_back_reason: string | null;
  dba_sent_back_reason: string | null;
  setup_subaccount: boolean;
  setup_snapshot: boolean;
  setup_ghl_api: boolean;
  setup_zapier: boolean;
  zaps_paused: boolean;
  price_per_contact: number;
  dba_client_count: number;
  portal_hidden_tabs: string[];
  calendar_embed_code: string | null;
  agency_url_prefix: string | null;
  business_name: string | null;
  business_logo_url: string | null;
  cross_sell_confirmed: boolean;
  is_alumni: boolean;
  crm_enabled: boolean;
  agency_npn: string | null;
  agency_ein: string | null;
  principal_agent: string | null;
  principal_agent_npn: string | null;
  contracting_email: string | null;
  contracting_contact: string | null;
  carriers: string[];
  created_at: string;
  updated_at: string;
};

export type CrmNotification = {
  id: string;
  agency_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type CrmDbaUpload = {
  id: string;
  agency: string;
  file_name: string;
  row_count: number;
  headers: string[];
  uploaded_at: string;
};

export type CrmDbaRow = {
  id: string;
  upload_id: string;
  row_data: Record<string, string>;
  created_at: string;
};

export type CrmTemplate = {
  id: string;
  name: string;
  description: string;
  file_name: string;
  headers: string[];
  sample_rows: Record<string, string>[];
  defaults_uploaded: boolean | null;
  created_at: string;
  updated_at: string;
};

export type AgencyGhlConfig = {
  id: string;
  agency_id: string;
  ghl_api_key: string;
  ghl_location_id: string;
  connection_status: 'connected' | 'error' | 'disconnected';
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type AgencyDeal = {
  id: string;
  agency_id: string;
  ghl_deal_id: string | null;
  deal_name: string;
  contact_name: string | null;
  value: number;
  stage: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  assigned_agent_name: string | null;
  close_date: string | null;
  source: string | null;
  synced_at: string;
  created_at: string;
};

export type AgentPipelineStage =
  | 'hip_broker' | 'hip_career' | 'iaa' | 'signed_iaa' | 'bill_com'
  | 'crm' | 'in_contracting' | 'rts' | 'hip_broker_ready'
  | 'hip_career_ready' | 'actively_selling' | 'terminated';

export type AgentPipelineRecord = {
  id: string;
  ghl_opportunity_id: string;
  ghl_contact_id: string | null;
  ghl_pipeline_id: string | null;
  ghl_stage_id: string | null;
  stage: AgentPipelineStage;
  agent_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  agency: string | null;
  agency_id: string | null;
  writing_numbers: string | null;
  notes: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  completed_steps: Record<string, string>;
  last_updated_by: 'ghl_webhook' | 'ui';
  ghl_sync_status: 'synced' | 'pending_push' | 'pushing';
  stage_entered_at: string;
  created_at: string;
  updated_at: string;
};

export type AgentPipelineGhlConfig = {
  id: string;
  ghl_api_key: string;
  ghl_location_id: string;
  ghl_pipeline_id: string;
  connection_status: 'disconnected' | 'connected' | 'error';
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentPipelineStageStep = {
  id: string;
  internal_stage: AgentPipelineStage;
  label: string;
  display_order: number;
  active: boolean;
  created_at: string;
};

export type AgentPipelineStageMap = {
  id: string;
  ghl_stage_name: string;
  internal_stage: AgentPipelineStage;
  ghl_stage_id: string | null;
  display_order: number;
  created_at: string;
};

export type AgencyKpi = {
  id: string;
  agency_id: string;
  period_type: 'week' | 'month' | 'quarter' | 'year' | 'snapshot';
  period_start: string;
  period_end: string;
  deals_closed: number;
  revenue: number;
  pipeline_value: number;
  total_contacts: number;
  contacts_week: number;
  contacts_month: number;
  cross_sell_opportunities: number;
  saved_policies: number;
  cancellations: number;
  agents_onboarded: number;
  agents_in_pipeline: number;
  active_clients: number;
  terminated_clients: number;
  at_risk_clients: number;
  total_policies: number;
  policies_this_month: number;
  top_carrier: string;
  avg_policies_per_agent: number;
  computed_at: string;
};

export type AgencyClient = {
  id: string;
  agency_id: string;
  agent_id: string | null;
  ghl_contact_id: string | null;
  first_name: string;
  last_name: string;
  client_name: string;
  phone: string;
  email: string;
  submit_date: string | null;
  ghl_assigned_to: string;
  policy_number: string;
  carrier: string;
  status: 'active' | 'terminated' | 'at_risk' | 'lapsed';
  premium_amount: number;
  product_type: string;
  effective_date: string | null;
  termination_date: string | null;
  risk_flag_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentProduction = {
  id: string;
  agency_id: string;
  agent_id: string;
  period_start: string;
  period_end: string;
  policies_written: number;
  policies_active: number;
  policies_cancelled: number;
  total_premium: number;
  carrier: string;
  computed_at: string;
};

export type CrmTicket = {
  id: string;
  agency_id: string;
  subject: string;
  description: string;
  category: 'agent-issue' | 'crm-issue' | 'billing' | 'other';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high';
  submitted_by: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type CrmTicketMessage = {
  id: string;
  ticket_id: string;
  sender_type: 'agency' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
};

export const RESERVED_SLUGS = new Set([
  'life', 'field', 'direct-pay', 'telesales', 'hip', 'hip-career', 'hip-broker',
  'field-hip', 'direct-pay-hip', 'telesales-hip', 'thank-you',
  'dashboard', 'agent-intake', 'new-hires', 'populate-form', 'populate',
  'agent-tracking', 'agent-database', 'crm-team', 'crm',
]);

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
];
