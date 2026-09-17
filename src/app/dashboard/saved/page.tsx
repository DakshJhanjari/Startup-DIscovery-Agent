'use client';
import { useDashboard } from '@/context/DashboardContext';
import { TopBar } from '@/components/TopBar';
import { Bookmark } from 'lucide-react';

export default function SavedPage() {
  const { user } = useDashboard();
  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Saved</h1>
          <p className="text-gray-400 text-sm mt-1">Your saved startups and people, all in one place.</p>
        </div>
        <TopBar user={user} placeholder="Search saved..." />
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-900/20 border border-purple-700/20 flex items-center justify-center mb-5">
          <Bookmark className="w-7 h-7 text-purple-400" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">Nothing saved yet</h2>
        <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
          Start saving startups and people from Discover and Outreach to find them here quickly.
        </p>
      </div>
    </div>
  );
}
