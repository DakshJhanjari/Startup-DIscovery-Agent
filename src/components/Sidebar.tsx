'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { account } from '@/lib/appwrite';
import {
  LayoutDashboard, Search, Send, Radio, Briefcase,
  Bookmark, Code2, Settings, LogOut,
} from 'lucide-react';
import type { Models } from 'appwrite';

function DishaLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
      <path d="M7 7L7 29L18 29C25.18 29 29 24.07 29 18C29 11.93 25.18 7 18 7L7 7Z"
        stroke="white" strokeWidth="1.8" fill="none"
        strokeLinejoin="round" strokeLinecap="round" />
      <line x1="25" y1="11" x2="11" y2="25"
        stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="25" cy="11" r="2.5" fill="white" opacity="0.95" />
      <circle cx="25" cy="11" r="5" fill="#a855f7" opacity="0.2" />
    </svg>
  );
}

const NAV = [
  { href: '/dashboard',              label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/dashboard/discover',     label: 'Discover',     Icon: Search },
  { href: '/dashboard/opportunities',label: 'Opportunities',Icon: Briefcase },
  { href: '/dashboard/projects',     label: 'AI Projects',  Icon: Code2 },
  { href: '/dashboard/outreach',     label: 'Outreach',     Icon: Send },
  { href: '/dashboard/signals',      label: 'Signals',      Icon: Radio },
  { href: '/dashboard/saved',        label: 'Saved',        Icon: Bookmark },
];

interface SidebarProps {
  user: Models.User<Models.Preferences> | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router  = useRouter();

  const handleLogout = async () => {
    try { await account.deleteSession('current'); } finally { router.push('/'); }
  };

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="w-[200px] min-h-screen bg-[#08080f] border-r border-white/[0.04] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <DishaLogo />
        <span className="text-[13px] font-bold tracking-[0.22em] uppercase text-white">Disha</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 mt-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                active
                  ? 'bg-purple-600/15 text-purple-400 font-medium'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-0.5">
        <Link href="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
          <Settings className="w-4 h-4" />Settings
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-all">
          <LogOut className="w-4 h-4" />Log out
        </button>

        {user && (
          <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{displayName}</p>
              <p className="text-gray-500 text-[10px]">Level 7 · Builder</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
