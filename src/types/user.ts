import type { Models } from 'appwrite';

export type RoleTarget = 'pm' | 'ai' | 'fo';

export type IndustryTarget =
  | 'fintech'
  | 'saas'
  | 'd2c'
  | 'healthtech'
  | 'edtech'
  | 'deeptech'
  | 'climatetech'
  | 'ecommerce'
  | 'any';

export type ExperienceLevel = 'fresher' | 'intern' | '0-1yr' | '1-2yr';

export interface UserProfileDocument extends Models.Document {
  appwrite_user_id: string;
  email: string;
  display_name?: string;
  role_targets: string;       // JSON-stringified RoleTarget[]
  industry_targets: string;   // JSON-stringified IndustryTarget[]
  experience_level: ExperienceLevel;
  onboarding_complete: boolean;
  profile_score?: number;
  resume_text?: string;
}

export interface OnboardingState {
  roleTargets: RoleTarget[];
  industryTargets: IndustryTarget[];
  experienceLevel: ExperienceLevel | '';
}
