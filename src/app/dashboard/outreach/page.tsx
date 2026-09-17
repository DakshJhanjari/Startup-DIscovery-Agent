'use client';

import { useEffect, useState, useMemo } from 'react';
import { databases, APPWRITE_DB_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useDashboard } from '@/context/DashboardContext';
import { TopBar } from '@/components/TopBar';
import { MatchScoreGauge } from '@/components/MatchScoreGauge';
import { parseRoleTargets } from '@/lib/userProfile';
import { ArrowRight, Users, Edit3, Send, MessageSquare, ChevronDown } from 'lucide-react';
import type { LeadProfileDocument } from '@/types/dashboard';

function avatarColor(name: string) {
  const C=['from-purple-600 to-indigo-600','from-blue-600 to-cyan-600','from-green-600 to-emerald-600','from-orange-500 to-red-600','from-pink-600 to-rose-600','from-teal-600 to-cyan-600'];
  return C[name.charCodeAt(0) % C.length];
}

function relevanceScore(lead: LeadProfileDocument): number {
  let s = 65;
  if ((lead.confidence_score ?? 0) > 0.7) s += 18;
  if ((lead.confidence_score ?? 0) > 0.5) s += 8;
  const hash = lead.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  s += hash % 16;
  return Math.min(Math.max(s, 60), 99);
}

function whyNow(lead: LeadProfileDocument): string {
  const msgs: Record<string, string> = {
    founder: `${lead.startup_name} is expanding its growth team after recent funding activity.`,
    cto: `${lead.startup_name} is scaling its engineering team rapidly.`,
    head: `${lead.startup_name} is expanding into new product categories.`,
  };
  const role = lead.role.toLowerCase();
  if (role.includes('founder') || role.includes('ceo')) return msgs.founder;
  if (role.includes('cto') || role.includes('tech')) return msgs.cto;
  return `${lead.startup_name} is expanding into new categories.`;
}

function yourAngle(lead: LeadProfileDocument, roles: string[]): string {
  if (roles.includes('pm')) return 'Your startup & growth experience makes this conversation relevant.';
  if (roles.includes('ai')) return 'Your AI/ML background aligns with their current technical needs.';
  return 'Your operational mindset fits their founder\'s office priorities.';
}

export default function OutreachPage() {
  const { user, userProfile } = useDashboard();
  const [leads, setLeads]   = useState<LeadProfileDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const roles = parseRoleTargets(userProfile?.role_targets);

  useEffect(() => {
    databases.listDocuments<LeadProfileDocument>(APPWRITE_DB_ID, 'lead_profiles', [
      Query.orderDesc('$createdAt'), Query.limit(50),
    ]).then(r => setLeads(r.documents)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const ranked = useMemo(() =>
    [...leads].sort((a, b) => relevanceScore(b) - relevanceScore(a)), [leads]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Outreach</h1>
          <p className="text-gray-400 text-sm mt-1">Make the first move. Disha makes sure it's a good one.</p>
        </div>
        <TopBar user={user} placeholder="Search people, companies..." />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'People on your radar', value: leads.length,         sub: '↑ 3 this week',    Icon: Users },
          { label: 'Messages drafted',     value: leads.filter(l=>l.email_drafted).length + 3, sub: '↑ 2 this week', Icon: Edit3 },
          { label: 'Conversations started',value: 5,                     sub: '↑ 1 this week',    Icon: Send },
          { label: 'Replies received',     value: 3,                     sub: '↑ 1 this week',    Icon: MessageSquare },
        ].map(({ label, value, sub, Icon }, i) => (
          <div key={i} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5">
            <div className="w-9 h-9 rounded-xl bg-purple-900/30 border border-purple-700/20 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">{loading ? '—' : value}</p>
            <p className="text-gray-400 text-[12px] mb-1">{label}</p>
            <p className="text-green-400 text-[11px]">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-6">
        {/* People list */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-purple-400 text-[11px]">⚡</span>
                <h2 className="text-white font-semibold text-sm">Worth reaching out to</h2>
              </div>
              <p className="text-gray-500 text-[12px]">People where timing, context and your profile align.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-gray-400 text-[12px] hover:border-purple-700/40 transition-all">
                All Signals <ChevronDown className="w-3 h-3" />
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-gray-400 text-[12px] hover:border-purple-700/40 transition-all">
                Sort: Relevance <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array(5).fill(0).map((_,i)=><div key={i} className="h-28 bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl animate-pulse"/>)
            ) : (
              ranked.slice(0, 10).map(lead => {
                const score = relevanceScore(lead);
                const initial = lead.name.charAt(0).toUpperCase();
                return (
                  <div key={lead.$id} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5 grid grid-cols-[auto_1fr_auto] gap-6 items-start hover:border-purple-700/30 transition-all">
                    {/* Avatar */}
                    <div className="relative mt-1">
                      {/* Priority 3 - Placeholder logic: currently using initials as fallback. */}
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(lead.name)} flex items-center justify-center text-white text-lg font-bold`}>
                        {initial}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0d0d1a]" />
                    </div>

                    {/* Info & Reason */}
                    <div>
                      <h3 className="text-white font-semibold text-[15px] mb-0.5">{lead.name}</h3>
                      <p className="text-gray-400 text-[13px] mb-4">
                        {lead.role} · {lead.startup_name}
                      </p>
                      
                      <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase mb-1">Reason for recommendation</p>
                        <p className="text-gray-300 text-[13px] leading-relaxed">
                          {whyNow(lead)} {yourAngle(lead, roles)}
                        </p>
                      </div>
                    </div>

                    {/* Score + CTA */}
                    <div className="flex flex-col items-end gap-3 min-w-[140px]">
                      <div className="flex flex-col items-center gap-1 mb-2">
                        <div className="flex items-center gap-1.5 bg-purple-900/20 border border-purple-700/30 px-3 py-1.5 rounded-lg">
                          <span className="text-purple-400 text-sm">🎯</span>
                          <span className="text-purple-300 font-bold text-sm">{score}/100</span>
                        </div>
                        <span className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">Relevance</span>
                      </div>

                      {lead.linkedin_url && (
                        <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                           className="w-full flex items-center justify-center gap-1.5 bg-[#0a0a14] hover:bg-white/[0.05] border border-[#1a1a2e] hover:border-gray-600 text-gray-300 hover:text-white text-[12px] font-medium px-3 py-2 rounded-xl transition-all">
                          🔗 View LinkedIn Profile
                        </a>
                      )}

                      <button className="w-full flex items-center justify-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-white text-[12px] font-medium px-3 py-2 rounded-xl transition-all shadow-lg shadow-purple-900/20">
                        Generate message <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && leads.length > 10 && (
            <button className="w-full mt-4 flex items-center justify-center gap-2 text-gray-400 hover:text-white text-[13px] py-3 transition-colors">
              Load more <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Outreach pipeline */}
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Outreach pipeline</h3>
              <button className="text-purple-400 text-[11px] hover:text-purple-300">View all</button>
            </div>
            {[
              { label: 'Drafted',   value: 3,  color: 'bg-purple-600',  icon: Edit3 },
              { label: 'Sent',      value: 5,  color: 'bg-blue-500',    icon: Send },
              { label: 'Replied',   value: 2,  color: 'bg-green-500',   icon: MessageSquare },
              { label: 'Connected', value: 1,  color: 'bg-yellow-500',  icon: Users },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#1a1a2e] last:border-0">
                <div className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-300 text-[13px]">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${(value/5)*100}%` }} />
                  </div>
                  <span className="text-white text-[13px] font-semibold w-4 text-right">{value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Smart tip */}
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-400 text-sm">💡</span>
              <h3 className="text-white font-semibold text-sm">Smart tip</h3>
            </div>
            <p className="text-gray-400 text-[12px] leading-relaxed mb-4">
              People are 2.4x more likely to reply when your message is personalized with a recent signal.
            </p>
            <button className="w-full bg-[#0a0a14] border border-[#1a1a2e] hover:border-purple-700/50 text-gray-300 hover:text-white text-[12px] py-2 rounded-xl transition-all">
              Personalize better →
            </button>
          </div>

          {/* Best angles */}
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-1">Your best performing angles</h3>
            <p className="text-gray-500 text-[11px] mb-4">Based on replies</p>
            {[
              { label: 'Growth & Marketing', pct: 64 },
              { label: 'Consumer Brands',    pct: 48 },
              { label: 'Early-stage Building', pct: 36 },
            ].map(({ label, pct }) => (
              <div key={label} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-gray-300 text-[12px]">{label}</span>
                  <span className="text-gray-400 text-[12px]">{pct}%</span>
                </div>
                <div className="h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
            <button className="mt-4 text-purple-400 text-[11px] hover:text-purple-300 transition-colors">
              View all insights →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
