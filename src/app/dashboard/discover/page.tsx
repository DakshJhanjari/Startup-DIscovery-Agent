'use client';

import { useEffect, useState, useMemo } from 'react';
import { databases, APPWRITE_DB_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useDashboard } from '@/context/DashboardContext';
import { TopBar } from '@/components/TopBar';
import { MatchScoreGauge } from '@/components/MatchScoreGauge';
import { SignalBadge, SignalType } from '@/components/SignalBadge';
import { CompanyLogo, getLogoDomain } from '@/components/CompanyLogo';
import { parseRoleTargets, parseIndustryTargets } from '@/lib/userProfile';
import { Check, ChevronLeft, ChevronRight, Filter, ArrowUpDown, Bookmark } from 'lucide-react';
import type { StartupDocument } from '@/types/dashboard';
import type { UserProfileDocument } from '@/types/user';

// ── Helpers ───────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  const C = ['from-purple-600 to-indigo-600','from-blue-600 to-cyan-600','from-green-600 to-emerald-600','from-orange-500 to-red-600','from-pink-600 to-rose-600','from-yellow-500 to-orange-500'];
  return C[name.charCodeAt(0) % C.length];
}

function getStartupLink(s: StartupDocument): string {
  if (s.source_video_url && s.source_video_url.startsWith('http')) return s.source_video_url;
  if (s.source && s.source.startsWith('http')) return s.source;
  if (s.website && s.website.startsWith('http')) return s.website;
  return `https://www.google.com/search?q=${encodeURIComponent(s.name + ' startup news')}`;
}



function computeScore(s: StartupDocument, up: UserProfileDocument | null): number {
  if (!up) return 70;
  let score = 55;
  const industries = parseIndustryTargets(up.industry_targets);
  const ind = s.industry?.toLowerCase() ?? '';
  const imap: Record<string, string[]> = {
    fintech:['fintech','finance','banking','payment','lending','wealth'],
    saas:['saas','b2b','enterprise','software'],d2c:['d2c','consumer','retail','brand'],
    healthtech:['health','medical','pharma'],edtech:['edtech','education','learning'],
    deeptech:['deep','ai','ml','robotics'],climatetech:['climate','sustainability','clean'],
    ecommerce:['ecommerce','marketplace'],
  };
  if (industries.includes('any')||industries.some(i=>(imap[i]??[]).some(k=>ind.includes(k)))) score+=18;
  if (s.funding_round) score+=8;
  if ((s.confidence_score??0)>0.6) score+=10;
  const hash=s.name.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  score+=hash%14;
  return Math.min(Math.max(score,58),99);
}

function keySignals(s: StartupDocument): string[] {
  const r:string[]=[];
  if (s.funding_round && s.funding_amount) r.push(`${s.funding_round} funding (${s.funding_amount})`);
  else if (s.funding_round) r.push(`${s.funding_round} funding activity`);
  const ind=s.industry?.toLowerCase()??'';
  if (ind.includes('ai')||ind.includes('saas')) r.push('Expanding AI/ML team');
  else if (ind.includes('fintech')) r.push('Hiring across product & growth');
  else r.push('Expanding team (new hires)');
  r.push((s.confidence_score??0)>0.6?'Strong growth in last 6 months':'Active in startup ecosystem');
  while(r.length<3) r.push('Stealth signals of upcoming expansion');
  return r.slice(0,3);
}

function matchReasons(s: StartupDocument, up: UserProfileDocument|null): string[] {
  if (!up) return ['Domain interest match','Role alignment','Early-stage focus'];
  const roles=parseRoleTargets(up.role_targets);
  const industries=parseIndustryTargets(up.industry_targets);
  const ind=s.industry?.toLowerCase()??'';
  const r:string[]=[];
  if (industries.includes('any')||industries.some(i=>ind.includes(i.replace('tech',''))))
    r.push(`${s.industry??'startup'} domain interest`);
  if (roles.includes('pm')) r.push('Product & strategy experience');
  if (roles.includes('ai')) r.push('AI/ML background fit');
  if (roles.includes('fo')) r.push("Founder's office skill match");
  r.push('Early-stage startup focus'); r.push('Growth trajectory alignment');
  return r.slice(0,3);
}

function inferType(s: StartupDocument): SignalType {
  if (s.funding_round) return 'FUNDING';
  if ((s.source??'').toLowerCase().includes('linkedin')) return 'HIRING';
  if ((s.confidence_score??0)>0.7) return 'GROWTH';
  return 'MILESTONE';
}

function inferTags(s: StartupDocument): string[] {
  const ind = s.industry ?? '';
  const parts = ind.split(/[\s,·\-&]+/).filter(Boolean).slice(0, 2);
  if (s.hq) parts.push('India');
  return parts.slice(0, 3);
}

const TABS = ['All','AI','Fintech','SaaS','Consumer','ClimateTech','Healthtech','Web3'] as const;
type Tab = typeof TABS[number];

const TAB_KEYWORDS: Record<Tab, string[]> = {
  All: [], AI: ['ai','ml','deep','nlp'], Fintech: ['fintech','finance','banking','payment'],
  SaaS: ['saas','b2b','enterprise','software'], Consumer: ['consumer','d2c','retail','brand'],
  ClimateTech: ['climate','sustainability','clean','energy'], Healthtech: ['health','medical','pharma'],
  Web3: ['web3','blockchain','crypto','nft'],
};

const PER_PAGE = 8;

export default function DiscoverPage() {
  const { user, userProfile } = useDashboard();
  const [startups, setStartups]   = useState<StartupDocument[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    databases.listDocuments<StartupDocument>(APPWRITE_DB_ID,'startups',[
      Query.orderDesc('$createdAt'), Query.limit(200),
    ]).then(r=>setStartups(r.documents)).catch(console.error).finally(()=>setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = startups;
    if (search) list = list.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.industry??'').toLowerCase().includes(search.toLowerCase())
    );
    if (activeTab !== 'All') {
      const kws = TAB_KEYWORDS[activeTab];
      list = list.filter(s => kws.some(k => (s.industry??'').toLowerCase().includes(k)));
    }
    return list.sort((a,b) => computeScore(b,userProfile) - computeScore(a,userProfile));
  }, [startups, activeTab, search, userProfile]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const trending   = [...startups].sort((a,b)=>(b.confidence_score??0)-(a.confidence_score??0)).slice(0,4);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Discover</h1>
          <p className="text-gray-400 text-sm mt-1">Explore startups, signals and opportunities that matter to you.</p>
        </div>
        <TopBar user={user} placeholder="Search companies, sectors, founders..." />
      </div>

      {/* Trending Now */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-purple-400 text-[11px] font-bold tracking-wider">⚡ TRENDING NOW</span>
          <button className="ml-auto text-purple-400 text-[11px] hover:text-purple-300">View all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {loading
            ? Array(4).fill(0).map((_,i)=><div key={i} className="min-w-[220px] h-24 bg-white/5 rounded-2xl animate-pulse flex-shrink-0"/>)
            : trending.map(s => (
              <a key={s.$id} href={getStartupLink(s)} target="_blank" rel="noopener noreferrer" className="min-w-[220px] flex-shrink-0 bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-4 hover:border-purple-700/40 transition-all cursor-pointer group block">
                <div className="flex items-center gap-3 mb-2">
                  <CompanyLogo name={s.name} website={s.website} className="w-9 h-9 rounded-xl" fallbackTextClass="text-sm font-bold" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate group-hover:text-purple-300 transition-colors">
                      {s.name} {s.funding_amount ? `raises ${s.funding_amount}` : 'is hiring'}
                    </p>
                    <p className="text-gray-500 text-[11px] truncate flex items-center gap-1.5">
                      <span>{s.funding_round??'Growth'}</span>
                      <span>·</span>
                      <span>{s.hq??'India'}</span>
                      <span>·</span>
                      <span className="text-purple-400">{getLogoDomain(s.website, s.name)}</span>
                    </p>
                  </div>
                </div>
                <SignalBadge type={inferType(s)} />
              </a>
            ))}
        </div>
      </div>

      {/* Explore the ecosystem */}
      <h2 className="text-white font-semibold text-base mb-4">Explore the ecosystem</h2>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-medium flex-shrink-0 transition-all ${
              activeTab===tab
                ? 'bg-purple-600 text-white'
                : 'bg-[#0d0d1a] border border-[#1a1a2e] text-gray-400 hover:border-purple-700/40 hover:text-gray-200'
            }`}>
            {tab}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-gray-400 text-[12px] hover:border-purple-700/40 transition-all">
            <Filter className="w-3.5 h-3.5" />Filters
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-gray-400 text-[12px] hover:border-purple-700/40 transition-all">
            <ArrowUpDown className="w-3.5 h-3.5" />Sort: Most relevant
          </button>
        </div>
      </div>

      {/* Startup rows */}
      <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl overflow-hidden mb-5">
        {loading ? (
          Array(5).fill(0).map((_,i)=><div key={i} className="h-28 border-b border-[#1a1a2e] animate-pulse bg-white/[0.02]"/>)
        ) : pageItems.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No startups found for this filter.</div>
        ) : (
          pageItems.map((s, idx) => {
            const score   = computeScore(s, userProfile);
            const signals = keySignals(s);
            const reasons = matchReasons(s, userProfile);
            const tags    = inferTags(s);
            return (
              <div key={s.$id}
                className={`grid grid-cols-[2fr_1.6fr_1.6fr_auto] gap-6 p-5 items-start hover:bg-white/[0.02] transition-colors ${idx < pageItems.length-1 ? 'border-b border-[#1a1a2e]' : ''}`}>
                {/* Col 1: Info */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CompanyLogo name={s.name} website={s.website} className="w-10 h-10 rounded-xl" fallbackTextClass="text-sm font-bold" />
                    <div>
                      <p className="text-white font-semibold text-[14px]">{s.name}</p>
                      <p className="text-gray-500 text-[11px] flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{s.industry??'Startup'}</span>
                        <span>·</span>
                        <span>{s.hq??'India'}</span>
                        <span>·</span>
                        <a href={`https://${getLogoDomain(s.website, s.name)}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                          {getLogoDomain(s.website, s.name)}
                        </a>
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-[12px] leading-relaxed mb-3 line-clamp-2">
                    {s.mission ?? 'AI-powered startup building for the next generation of users.'}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {tags.map(t=>(
                      <span key={t} className="text-[10px] text-gray-400 border border-[#2a2a3e] px-2 py-0.5 rounded-lg">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Col 2: Key Signals */}
                <div>
                  <p className="text-gray-500 text-[10px] font-semibold tracking-wider uppercase mb-3">Key Signals</p>
                  <div className="space-y-2">
                    {signals.map((sig, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${i===0?'bg-purple-400':i===1?'bg-green-400':'bg-blue-400'}`}/>
                        <p className="text-gray-300 text-[12px] leading-relaxed">{sig}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Col 3: Why it matches you */}
                <div>
                  <p className="text-gray-500 text-[10px] font-semibold tracking-wider uppercase mb-3">Why It Matches You</p>
                  <div className="space-y-2">
                    {reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-300 text-[12px] leading-relaxed">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Col 4: Score + actions */}
                <div className="flex flex-col items-center gap-3 min-w-[110px]">
                  <MatchScoreGauge score={score} />
                  <a href={getStartupLink(s)} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-1.5 bg-[#0a0a14] hover:bg-purple-700/20 border border-[#1a1a2e] hover:border-purple-700/50 text-white text-[12px] font-medium px-3 py-2 rounded-xl transition-all">
                    View details →
                  </a>
                  <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-[12px] transition-colors">
                    <Bookmark className="w-3.5 h-3.5" />Save
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={()=>setPage(p=>Math.max(p-1,1))} disabled={page===1}
            className="w-8 h-8 rounded-xl border border-[#1a1a2e] flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-700/50 transition-all disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(n=>(
            <button key={n} onClick={()=>setPage(n)}
              className={`w-8 h-8 rounded-xl text-[13px] font-medium transition-all ${
                n===page?'bg-purple-700 text-white':'border border-[#1a1a2e] text-gray-400 hover:text-white hover:border-purple-700/50'
              }`}>{n}</button>
          ))}
          {totalPages > 10 && <span className="text-gray-600">…</span>}
          <button onClick={()=>setPage(p=>Math.min(p+1,totalPages))} disabled={page===totalPages}
            className="w-8 h-8 rounded-xl border border-[#1a1a2e] flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-700/50 transition-all disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
