import type { Models } from 'appwrite';

export interface StartupDocument extends Models.Document {
  name: string;
  website?: string;
  careers_url?: string;
  ats_provider?: string;
  industry?: string;
  funding_amount?: string;
  funding_amount_numeric?: number;
  funding_round?: string;
  mission?: string;
  source?: string;
  source_video_url?: string;
  hq?: string;
  confidence_score?: number;
  internship_researched?: boolean;
}

export interface ProjectSpec {
  id: string;
  title: string;
  track: 'pm' | 'ai' | 'fo';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimated_days: number;
  summary: string;
  business_impact: string;
  tech_stack: string[];
  key_deliverables: string[];
  github_readme_template: string;
}

export interface ResumeSkillAnalysis {
  overall_match_score: number;
  target_track: 'pm' | 'ai' | 'fo';
  candidate_strengths: string[];
  skill_gaps: string[];
  missing_keywords: string[];
  recommended_project_id: string;
  immediate_action_items: string[];
}

export interface JobDocument extends Models.Document {
  startup_id: string;
  title: string;
  location?: string;
  employment_type: string; // 'INTERNSHIP' | 'FULL_TIME' | 'PART_TIME' | 'CONTRACT'
  department?: string;
  description?: string;
  apply_url: string;
  source_url?: string;
  source_name?: string;
  posted_at?: string;
  last_verified_at: string;
  status: 'OPEN' | 'CLOSED' | 'UNKNOWN';
}

export interface LeadProfileDocument extends Models.Document {
  name: string;
  role: string;
  startup_name: string;
  startup_doc_id?: string;
  linkedin_url: string;
  confidence_score?: number;
  source?: string;
  email?: string;
  email_drafted?: boolean;
  email_drafted_at?: string;
}

export type RoleTrack = 'all' | 'ai' | 'pm' | 'fo';

export interface RoleBadgeInfo {
  id: RoleTrack;
  label: string;
  shortLabel: string;
  iconName: string;
  badgeClass: string;
  activeClass: string;
  description: string;
}

export type SortOption = 'newest' | 'funding_desc' | 'name_asc' | 'verified_first';

export interface OutreachDraftPayload {
  lead: LeadProfileDocument;
  startup: StartupDocument;
  roleTrack: RoleTrack;
  candidateName: string;
  candidateBackground: string;
  subject: string;
  body: string;
}
