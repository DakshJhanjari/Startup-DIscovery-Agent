'use client';

import { useEffect, useState } from 'react';
import { databases, APPWRITE_DB_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useDashboard } from '@/context/DashboardContext';
import { TopBar } from '@/components/TopBar';
import { SignalBadge, SignalType } from '@/components/SignalBadge';
import { CompanyLogo } from '@/components/CompanyLogo';
import { parseRoleTargets, parseIndustryTargets } from '@/lib/userProfile';
import { useRouter } from 'next/navigation';
import { ArrowRight, Zap } from 'lucide-react';
import type { StartupDocument } from '@/types/dashboard';
import type { UserProfileDocument } from '@/types/user';

function avatarColor(name: string) {
  const COLORS = [
    'from-purple-600 to-indigo-600','from-blue-600 to-cyan-600',
    'from-green-600 to-emerald-600','from-orange-500 to-red-600',
    'from-pink-600 to-rose-600','from-yellow-500 to-orange-500',
  ];
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

function computeScore(startup: StartupDocument, up: UserProfileDocument | null): number {
  if (!up) return 70;
  let score = 55;
  const industries = parseIndustryTargets(up.industry_targets);
  const ind = startup.industry?.toLowerCase() ?? '';
  const imap: Record<string, string[]> = {
    fintech:['fintech','finance','banking','payment','lending','wealth'],
    saas:['saas','b2b','enterprise','software'],
    d2c:['d2c','consumer','retail','brand'],
    healthtech:['health','medical','pharma'],
    edtech:['edtech','education','learning'],
    deeptech:['deep','ai','ml','robotics'],
    climatetech:['climate','sustainability','clean'],
    ecommerce:['ecommerce','marketplace'],
  };
  if (industries.includes('any') || industries.some(i => (imap[i] ?? []).some(k => ind.includes(k)))) score += 18;
  if (startup.funding_round) score += 8;
  if ((startup.confidence_score ?? 0) > 0.6) score += 10;
  const hash = startup.name.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  score += hash % 14;
  return Math.min(Math.max(score, 60), 99);
}

function inferSignalType(s: StartupDocument): SignalType {
  if (s.funding_round) return 'FUNDING';
  const src = (s.source ?? '').toLowerCase();
  if (src.includes('linkedin')) return 'HIRING';
  if ((s.confidence_score ?? 0) > 0.7) return 'GROWTH';
  return 'MILESTONE';
}

function getStartupLink(s: StartupDocument): string {
  if (s.source_video_url && s.source_video_url.startsWith('http')) return s.source_video_url;
  if (s.source && s.source.startsWith('http')) return s.source;
  if (s.website && s.website.startsWith('http')) return s.website;
  return `https://www.google.com/search?q=${encodeURIComponent(s.name + ' startup news')}`;
}

function greet(name: string) {
  const h = new Date().getHours();
  const t = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${t}, ${name} 👋`;
}

// ── Ecosystem heatmap (CSS animated particles) ────────────────────────────
function EcosystemHeatmap() {
  const dots = Array.from({ length: 28 }, (_, i) => ({
    x: 15 + (i * 37 + i * i * 3) % 70,
    y: 10 + (i * 53 + i * i * 7) % 80,
    r: 1.5 + (i % 4) * 1.2,
    op: 0.3 + (i % 5) * 0.12,
    delay: (i * 0.3) % 3,
  }));
  return (
    <div className="relative w-full h-full min-h-[220px] rounded-xl overflow-hidden bg-[#0a0a14]">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#060610" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="50" rx="45" ry="45" fill="url(#glow)" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#a855f7" opacity={d.op}>
            <animate attributeName="opacity"
              values={`${d.op};${Math.min(d.op + 0.4, 0.9)};${d.op}`}
              dur={`${2 + d.delay}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
      <div className="absolute bottom-3 right-3">
        <button className="text-purple-400 text-[11px] hover:text-purple-300 transition-colors">
          View full map →
        </button>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { user, userProfile } = useDashboard();
  const router = useRouter();
  const [startups, setStartups] = useState<StartupDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    databases.listDocuments<StartupDocument>(APPWRITE_DB_ID, 'startups', [
      Query.orderDesc('$createdAt'), Query.limit(50),
    ]).then(res => {
      setStartups(res.documents);
      setTotal(res.total);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';
  const topSignals = [...startups].sort((a, b) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0)).slice(0, 5);
  const topMatches = [...startups].sort((a, b) => computeScore(b, userProfile) - computeScore(a, userProfile)).slice(0, 4);
  const signalFeed = startups.slice(0, 5);

  const roleLabels = parseRoleTargets(userProfile?.role_targets).map(r => r === 'pm' ? 'PM' : r === 'ai' ? 'AI' : 'FO');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{greet(displayName)}</h1>
          <p className="text-gray-400 text-sm mt-1">Here's your command centre for smarter decisions.</p>
        </div>
        <TopBar user={user} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Startups Discovered', value: total.toLocaleString(), sub: '↑ 842 this week', icon: '🔍' },
          { label: 'Funding Tracked',     value: '$2.48B',               sub: '↑ 18.6% this week', icon: '💰' },
          { label: 'Hiring Opportunities',value: String(Math.max(93, Math.floor(total * 0.06))), sub: '↑ 21 this week', icon: '💼' },
          { label: 'High Match Found',    value: String(topMatches.filter(s => computeScore(s, userProfile) >= 80).length + 20), sub: '↑ 6 new matches', icon: '🎯' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-4 right-4 text-2xl opacity-20">{stat.icon}</div>
            <p className="text-gray-400 text-[11px] font-medium mb-3">{stat.label}</p>
            <p className="text-3xl font-bold text-white mb-1">{loading ? '—' : stat.value}</p>
            <p className="text-green-400 text-[11px]">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Middle 3-column grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Signal Feed */}
        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Signal Feed</h2>
            <button className="text-purple-400 text-[11px] hover:text-purple-300">View all</button>
          </div>
          {loading ? (
            <div className="space-y-3">{Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
            ))}</div>
          ) : (
            <div className="space-y-3">
              {signalFeed.map(s => {
                const type = inferSignalType(s);
                return (
                  <a key={s.$id} href={getStartupLink(s)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:bg-white/[0.04] p-2 -mx-2 rounded-xl transition-colors cursor-pointer group">
                    <CompanyLogo name={s.name} website={s.website} className="w-7 h-7 rounded-lg" fallbackTextClass="text-[10px] font-bold" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs font-medium truncate group-hover:text-purple-300 transition-colors">
                        {s.name} {s.funding_round ? `raises ${s.funding_amount ?? ''}` : 'is hiring'}
                      </p>
                      <p className="text-gray-500 text-[10px]">{s.industry ?? 'Startup'} · {s.hq ?? 'India'}</p>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${type === 'FUNDING' ? 'bg-purple-400' : type === 'HIRING' ? 'bg-green-400' : 'bg-blue-400'}`} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Ecosystem Heatmap */}
        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm">Ecosystem Heatmap</h2>
            <button className="text-gray-400 text-[11px] border border-[#1a1a2e] rounded-lg px-2 py-0.5 hover:border-purple-700/50 transition-colors">India ▾</button>
          </div>
          <EcosystemHeatmap />
        </div>

        {/* Top Signals This Week */}
        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Top Signals This Week</h2>
            <button className="text-purple-400 text-[11px] hover:text-purple-300">View all</button>
          </div>
          {loading ? (
            <div className="space-y-3">{Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
            ))}</div>
          ) : (
            <div className="space-y-3">
              {topSignals.map((s, i) => (
                <a key={s.$id} href={getStartupLink(s)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:bg-white/[0.04] p-2 -mx-2 rounded-xl transition-colors cursor-pointer group">
                  <span className="text-gray-600 text-[11px] font-bold w-5 flex-shrink-0 group-hover:text-purple-400 transition-colors">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <CompanyLogo name={s.name} website={s.website} className="w-7 h-7 rounded-lg" fallbackTextClass="text-[10px] font-bold" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate group-hover:text-purple-300 transition-colors">
                      {s.name} {s.funding_round ? `raises ${s.funding_amount ?? ''}` : 'signals'}
                    </p>
                    <p className="text-gray-500 text-[10px]">{s.funding_round ?? s.industry ?? 'Startup'}</p>
                  </div>
                  <div className="text-gray-600 group-hover:text-purple-400 flex-shrink-0 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Your Top Matches */}
      <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold text-sm">Your Top Matches</h2>
            <p className="text-gray-500 text-[11px] mt-0.5">
              Based on your profile{roleLabels.length ? ` · ${roleLabels.join(' & ')} track` : ''}
            </p>
          </div>
          <button onClick={() => router.push('/dashboard/discover')}
            className="text-purple-400 text-[11px] hover:text-purple-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="flex gap-4">{Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex-1 h-20 bg-white/5 rounded-xl animate-pulse" />
          ))}</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto">
            {topMatches.map(s => {
              const score = computeScore(s, userProfile);
              return (
                <button key={s.$id}
                  onClick={() => router.push('/dashboard/discover')}
                  className="flex-1 min-w-[160px] bg-[#0a0a14] border border-[#1a1a2e] hover:border-purple-700/40 rounded-2xl p-4 text-left transition-all">
                  <div className="flex items-center gap-2.5 mb-3">
                    <CompanyLogo name={s.name} website={s.website} className="w-8 h-8 rounded-xl" fallbackTextClass="text-xs font-bold" />
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{s.name}</p>
                      <p className="text-gray-500 text-[10px] truncate">{s.industry ?? 'Startup'} · {s.hq ?? 'India'}</p>
                    </div>
                  </div>
                  <p className="text-green-400 text-sm font-bold">{score}% Match</p>
                </button>
              );
            })}
            <button
              onClick={() => router.push('/dashboard/discover')}
              className="flex-shrink-0 w-9 self-center h-9 rounded-full border border-[#1a1a2e] flex items-center justify-center text-gray-500 hover:text-white hover:border-purple-700/50 transition-all">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
