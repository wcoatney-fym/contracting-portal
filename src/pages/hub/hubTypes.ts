import type { AgentPipelineStage } from '../../lib/supabase';

export type HubAgent = {
  agent_id: string;
  agent_slug: string;
  token: string;
  first_name: string | null;
  last_name: string | null;
  agency: string | null;
  stage: AgentPipelineStage | null;
  is_rts: boolean;
};

export type WnSubmission = {
  id: string;
  carrier: 'UNL' | 'GTL';
  writing_number: string | null;
  ai_extracted_number: string | null;
  submission_method: 'typed' | 'image';
  status: 'pending' | 'verified' | 'rejected';
  review_note: string | null;
  created_at: string;
};

export type TrainingContent = {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_format: string;
  content_url: string | null;
  carrier: string;
  category: string;
  has_quiz: boolean;
  quiz_questions: { question: string; options: string[]; correct_index: number }[];
};

export type LiveSession = {
  id: string;
  title: string;
  session_datetime: string;
  join_url: string;
};

export type HubTab = 'home' | 'progress' | 'training' | 'sessions';
