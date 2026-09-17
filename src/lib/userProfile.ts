import { databases, account, APPWRITE_DB_ID } from './appwrite';
import { ID, Query } from 'appwrite';
import type { UserProfileDocument, OnboardingState, ExperienceLevel } from '@/types/user';

const COLLECTION = 'user_profiles';

/** Fetch the current user's profile document, or null if not found */
export async function fetchUserProfile(userId: string): Promise<UserProfileDocument | null> {
  try {
    const res = await databases.listDocuments<UserProfileDocument>(
      APPWRITE_DB_ID,
      COLLECTION,
      [Query.equal('appwrite_user_id', userId), Query.limit(1)]
    );
    return res.documents[0] ?? null;
  } catch {
    return null;
  }
}

/** Save or update onboarding data for the current user */
export async function saveOnboarding(
  userId: string,
  email: string,
  displayName: string,
  state: OnboardingState
): Promise<UserProfileDocument> {
  const existing = await fetchUserProfile(userId);
  const data = {
    appwrite_user_id: userId,
    email,
    display_name: displayName,
    role_targets: JSON.stringify(state.roleTargets),
    industry_targets: JSON.stringify(state.industryTargets),
    experience_level: state.experienceLevel as ExperienceLevel,
    onboarding_complete: true,
  };

  if (existing) {
    return databases.updateDocument<UserProfileDocument>(
      APPWRITE_DB_ID,
      COLLECTION,
      existing.$id,
      data
    );
  }
  return databases.createDocument<UserProfileDocument>(
    APPWRITE_DB_ID,
    COLLECTION,
    ID.unique(),
    data
  );
}

/** Parse stored JSON arrays safely */
export function parseRoleTargets(raw?: string): string[] {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}
export function parseIndustryTargets(raw?: string): string[] {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}
