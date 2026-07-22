import type { AgentPipelineStage } from '../../../lib/supabase';

export type AdminTab = 'dashboard' | 'agents' | 'training' | 'pipeline' | 'live';

export type AdminAgent = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  agency: string | null;
  npn: string | null;
  source: string | null;
  status: string | null;
  form_type: string | null;
  crm_onboarded: boolean;
  created_at: string;
};

export type IntakeRecord = {
  agent_id: string;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  ssn: string | null;
  resident_license_number: string | null;
  npn: string | null;
  resident_state: string | null;
  ctm_acknowledgment: string | null;
  agent_type: string | null;
  gender: string | null;
  release_needed: string | null;
  state_licenses: string[];
  submitted_at: string | null;
};

export type LobAssignment = {
  agent_id: string;
  line_of_business: string;
  carrier: string;
  writing_number: string;
};

export type PipelineAgent = {
  id: string;
  agent_id: string | null;
  agent_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  agency: string | null;
  stage: AgentPipelineStage;
  tags: string[];
  last_updated_by: string;
  last_updated_by_display: string | null;
  updated_by_source: 'contracting_portal' | 'training_hub' | 'ghl_webhook' | 'system' | null;
  stage_entered_at: string;
  updated_at: string;
};

export type TrainingEvent = {
  id: string;
  agent_id: string;
  event_type: string;
  content_id: string | null;
  content_title: string | null;
  quiz_score: number | null;
  created_at: string;
};

export type TrainingContentItem = {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_format: string;
  carrier: string;
  category: string;
  has_quiz: boolean;
  display_order: number;
};

export type LiveSessionItem = {
  id: string;
  title: string;
  session_datetime: string;
  join_url: string;
  is_active: boolean;
};

export type HubLogin = {
  id: string;
  agent_id: string;
  logged_in_at: string;
  login_method: string;
};

export type LiveAttendance = {
  id: string;
  agent_id: string;
  session_id: string;
  clicked_join_at: string;
};

// Derived summary for dashboard
export type AgentSummary = {
  agent_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  agency: string | null;
  stage: AgentPipelineStage | null;
  npn: string | null;
  form_type: string | null;
  crm_onboarded: boolean;
  tags: string[];
  video_views: number;
  quiz_attempts: number;
  quiz_passes: number;
  avg_quiz_score: number | null;
  live_clicks: number;
  last_event_at: string | null;
  last_login_at: string | null;
  login_count: number;
  days_in_stage: number | null;
  stage_entered_at: string | null;
  training_pct: number; // 0-100
  // Intake data
  intake: IntakeRecord | null;
  // LOB / writing numbers
  lob_assignments: LobAssignment[];
};

export type ContentStat = {
  content_id: string;
  title: string;
  carrier: string;
  category: string;
  has_quiz: boolean;
  view_count: number;
  quiz_attempt_count: number;
  quiz_pass_count: number;
  avg_score: number | null;
  pass_rate: number | null; // 0-100
};
