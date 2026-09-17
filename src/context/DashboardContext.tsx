'use client';
import { createContext, useContext } from 'react';
import type { Models } from 'appwrite';
import type { UserProfileDocument } from '@/types/user';

interface DashboardContextValue {
  user: Models.User<Models.Preferences> | null;
  userProfile: UserProfileDocument | null;
}

const DashboardContext = createContext<DashboardContextValue>({ user: null, userProfile: null });
export const DashboardProvider = DashboardContext.Provider;
export const useDashboard = () => useContext(DashboardContext);
