'use client';

import { useEffect, useState } from 'react';
import { databases, APPWRITE_DB_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useDashboard } from '@/context/DashboardContext';
import { TopBar } from '@/components/TopBar';
import { SignalBadge, SignalType } from '@/components/SignalBadge';
import { CompanyLogo } from '@/components/CompanyLogo';
import type { StartupDocument } from '@/types/dashboard';

function avatarColor(name: string) {
  const C=['from-purple-600 to-indigo-600','from-blue-600 to-cyan-600','from-green-600 to-emerald-600','from-orange-500 to-red-600','from-pink-600 to-rose-600'];
  return C[name.charCodeAt(0)%C.length];
}

function inferType(s: StartupDocument): SignalType {
  if (s.funding_round) return 'FUNDING';
  if ((s.source??'').toLowerCase().includes('linkedin')) return 'HIRING';
  if ((s.confidence_score??0)>0.7) return 'GROWTH';
  return 'MILESTONE';
}

function getStartupLink(s: StartupDocument): string {
  if (s.source_video_url && s.source_video_url.startsWith('http')) return s.source_video_url;
  if (s.source && s.source.startsWith('http')) return s.source;
  if (s.website && s.website.startsWith('http')) return s.website;
  return `https://www.google.com/search?q=${encodeURIComponent(s.name + ' startup news')}`;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function SignalsPage() {
  const { user } = useDashboard();
  const [startups, setStartups] = useState<StartupDocument[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<SignalType|'ALL'>('ALL');

  useEffect(() => {
    databases.listDocuments<StartupDocument>(APPWRITE_DB_ID,'startups',[
      Query.orderDesc('$createdAt'),Query.limit(100),
    ]).then(r=>setStartups(r.documents)).catch(console.error).finally(()=>setLoading(false));
  }, []);

  const filtered = filter==='ALL' ? startups : startups.filter(s=>inferType(s)===filter);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Signals</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time funding, hiring and growth signals from the startup ecosystem.</p>
        </div>
        <TopBar user={user} placeholder="Search signals..." />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6">
        {(['ALL','FUNDING','HIRING','GROWTH','MILESTONE'] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-all ${
              filter===f?'bg-purple-700 text-white':'bg-[#0d0d1a] border border-[#1a1a2e] text-gray-400 hover:border-purple-700/40'
            }`}>{f==='ALL'?'All Signals':f.charAt(0)+f.slice(1).toLowerCase()}</button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(8).fill(0).map((_,i)=><div key={i} className="h-20 bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl animate-pulse"/>)
        ) : filtered.map(s=>(
          <a key={s.$id} href={getStartupLink(s)} target="_blank" rel="noopener noreferrer" className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-4 flex items-center gap-4 hover:border-purple-700/30 transition-all cursor-pointer group block">
            <CompanyLogo name={s.name} website={s.website} className="w-10 h-10 rounded-xl" fallbackTextClass="font-bold" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white font-semibold text-[13px] group-hover:text-purple-300 transition-colors">
                  {s.name}{s.funding_round&&s.funding_amount?` raises ${s.funding_amount}`:s.funding_round?` closes ${s.funding_round}`:' is hiring'}
                </p>
                <SignalBadge type={inferType(s)} />
              </div>
              <p className="text-gray-500 text-[12px] truncate">
                {s.industry??'Startup'} · {s.hq??'India'} · {s.mission?.slice(0,60)??'Building for the next wave of users'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className="text-gray-500 text-[11px]">{timeAgo(s.$createdAt)}</span>
              <div className="text-gray-600 group-hover:text-purple-400 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
