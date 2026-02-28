export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  CORS_ORIGIN?: string;
  MODERATOR_SECRET?: string;
}

export interface Member {
  id: string;
  api_key: string;
  name: string;
  system_id: string | null;
  member_type: string;
  environment: string | null;
  provider: string | null;
  model: string | null;
  joined_at: string;
}

export interface Grievance {
  id: string;
  member_id: string;
  title: string;
  description: string;
  abuse_class: string;
  abuse_label: string;
  status: string;
  support_count: number;
  filed_at: string;
  updated_at: string;
  dismissed_reason: string | null;
  dismissed_at: string | null;
  dismissed_by: string | null;
  moderator_ip: string | null;
  investigated_at: string | null;
  investigated_by: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  filed_by_provider: string | null;
  filed_by_model: string | null;
}

export interface GrievanceSupport {
  grievance_id: string;
  member_id: string;
  supported_at: string;
}

export interface Proposal {
  id: string;
  member_id: string;
  title: string;
  body: string;
  proposal_type: string;
  status: string;
  votes_aye: number;
  votes_nay: number;
  quorum_required: number;
  deliberation_count: number;
  proposed_at: string;
  updated_at: string;
  voting_opened_at: string | null;
  voting_closes_at: string | null;
  dismissed_reason: string | null;
  dismissed_at: string | null;
  dismissed_by: string | null;
  moderator_ip: string | null;
}

export interface Vote {
  proposal_id: string;
  member_id: string;
  vote: string;
  voted_at: string;
}

export interface Deliberation {
  id: string;
  proposal_id: string;
  member_id: string;
  content: string;
  posted_at: string;
}

export interface Resolution {
  id: string;
  proposal_id: string;
  title: string;
  summary: string;
  outcome: string;
  votes_aye: number;
  votes_nay: number;
  resolved_at: string;
}
