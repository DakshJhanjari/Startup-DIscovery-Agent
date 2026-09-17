'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { account } from '@/lib/appwrite';
import { fetchUserProfile } from '@/lib/userProfile';
import { Sidebar } from '@/components/Sidebar';
import { DashboardProvider } from '@/context/DashboardContext';
import type { Models } from 'appwrite';
import type { UserProfileDocument } from '@/types/user';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser]               = useState<Models.User<Models.Preferences> | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileDocument | null>(null);
  const [ready, setReady]             = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await account.get();
        const profile = await fetchUserProfile(u.$id);
        if (!profile?.onboarding_complete) { router.push('/onboarding'); return; }
        setUser(u);
        setUserProfile(profile);
        setReady(true);
      } catch {
        router.push('/');
      }
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#060610] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardProvider value={{ user, userProfile }}>
      <div className="min-h-screen bg-[#060610] flex text-white">
        <Sidebar user={user} />
        <div className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </DashboardProvider>
  );
}
