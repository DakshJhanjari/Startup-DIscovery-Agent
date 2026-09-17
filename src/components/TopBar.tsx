'use client';
import { Bell, ChevronDown } from 'lucide-react';
import type { Models } from 'appwrite';

interface TopBarProps {
  user: Models.User<Models.Preferences> | null;
  placeholder?: string;
}

export function TopBar({ user, placeholder = 'Search startups, investors, sectors...' }: TopBarProps) {
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="flex items-center gap-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl px-4 py-2 text-gray-500 text-[13px] min-w-[260px]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="flex-1">{placeholder}</span>
        <kbd className="text-[10px] bg-[#1a1a2e] text-gray-600 px-1.5 py-0.5 rounded">⌘K</kbd>
      </div>

      {/* Notification bell */}
      <button className="relative w-9 h-9 rounded-xl bg-[#0d0d1a] border border-[#1a1a2e] flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0">
        <Bell className="w-4 h-4" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full text-white text-[9px] flex items-center justify-center font-bold">3</span>
      </button>

      {/* User chip */}
      {user && (
        <button className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/[0.04] transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initial}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-white text-[12px] font-semibold leading-tight">{displayName}</p>
            <p className="text-gray-500 text-[10px] leading-tight">Level 7 · Builder</p>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </button>
      )}
    </div>
  );
}
