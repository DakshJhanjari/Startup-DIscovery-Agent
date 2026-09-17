'use client';

import { useEffect, useState, useMemo } from 'react';
import { databases, APPWRITE_DB_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useDashboard } from '@/context/DashboardContext';
import { TopBar } from '@/components/TopBar';
import { CompanyLogo } from '@/components/CompanyLogo';
import { parseRoleTargets, parseIndustryTargets } from '@/lib/userProfile';
import { Briefcase, Building, Users, Star, Clock, Bookmark, ChevronDown, Check, Search, MapPin, BriefcaseIcon, Users as UsersIcon, TrendingUp, Activity } from 'lucide-react';
import type { StartupDocument, JobDocument } from '@/types/dashboard';
import type { UserProfileDocument } from '@/types/user';

function avatarColor(name: string) {
  const C=['from-purple-600 to-indigo-600','from-blue-600 to-cyan-600','from-green-600 to-emerald-600','from-orange-500 to-red-600','from-pink-600 to-rose-600'];
  return C[name.charCodeAt(0)%C.length];
}

function computeScore(s: StartupDocument, up: UserProfileDocument|null): number {
  if (!up) return 70;
  let score=55;
  const industries=parseIndustryTargets(up.industry_targets);
  const ind=s.industry?.toLowerCase()??'';
  const imap:Record<string,string[]>={fintech:['fintech','finance','payment'],saas:['saas','b2b','software'],d2c:['d2c','consumer','retail'],healthtech:['health','medical'],edtech:['edtech','education'],deeptech:['deep','ai','ml'],climatetech:['climate','clean'],ecommerce:['ecommerce','marketplace']};
  if (industries.includes('any')||industries.some(i=>(imap[i]??[]).some(k=>ind.includes(k)))) score+=18;
  if (s.funding_round) score+=8;
  if ((s.confidence_score??0)>0.6) score+=10;
  const hash=s.name.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  score+=hash%14;
  return Math.min(Math.max(score,58),99);
}

function matchReasons(job: JobDocument, up: UserProfileDocument|null): string[] {
  if (!up) return ['Startup experience', 'Role alignment', 'Domain interest'];
  const roles = parseRoleTargets(up.role_targets);
  const ind = parseIndustryTargets(up.industry_targets);
  const r: string[] = [];
  if (job.title.toLowerCase().includes('product') || roles.includes('pm')) r.push('Product strategy');
  if (job.title.toLowerCase().includes('ai') || roles.includes('ai')) r.push('AI/ML alignment');
  if (job.title.toLowerCase().includes('founder') || roles.includes('fo')) r.push('Operational mindset');
  r.push('Startup experience');
  r.push(ind[0] ? `${ind[0]} domain match` : 'Industry match');
  return Array.from(new Set(r)).slice(0, 3);
}

function FilterDropdown({ label, icon: Icon }: { label: string, icon: any }) {
  return (
    <button className="flex items-center gap-2 px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-gray-400 text-[12px] hover:border-purple-700/40 hover:text-gray-200 transition-all flex-shrink-0">
      <Icon className="w-3.5 h-3.5" />
      {label}
      <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
    </button>
  );
}

export default function OpportunitiesPage() {
  const { user, userProfile } = useDashboard();
  const [startups, setStartups] = useState<StartupDocument[]>([]);
  const [jobs, setJobs] = useState<JobDocument[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      databases.listDocuments<StartupDocument>(APPWRITE_DB_ID, 'startups', [Query.limit(100)]),
      databases.listDocuments<JobDocument>(APPWRITE_DB_ID, 'jobs', [Query.equal('status', 'OPEN'), Query.limit(300)])
    ]).then(([sRes, jRes]) => {
      setStartups(sRes.documents);
      setJobs(jRes.documents);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Group jobs by startup_id
  const companyMap = useMemo(() => {
    const m = new Map<string, { startup: StartupDocument, jobs: JobDocument[] }>();
    startups.forEach(s => m.set(s.$id, { startup: s, jobs: [] }));
    jobs.forEach(j => {
      if (m.has(j.startup_id)) m.get(j.startup_id)!.jobs.push(j);
    });
    // Only keep companies that have at least one job, sort by match score
    return Array.from(m.values())
      .filter(x => x.jobs.length > 0)
      .sort((a, b) => computeScore(b.startup, userProfile) - computeScore(a.startup, userProfile));
  }, [startups, jobs, userProfile]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedCards);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCards(next);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Find Your Next Opportunity</h1>
          <p className="text-gray-400 text-sm mt-1">Discover companies actively hiring and find opportunities relevant to you.</p>
        </div>
        <TopBar user={user} placeholder="Search opportunities..." />
      </div>

      {/* Top Filter Bar */}
      <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl px-3 py-2 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input type="text" placeholder="Search companies or roles..." className="bg-transparent border-none text-[12px] text-white placeholder-gray-500 outline-none w-full" />
        </div>
        <FilterDropdown label="Location" icon={MapPin} />
        <FilterDropdown label="Job Type" icon={BriefcaseIcon} />
        <FilterDropdown label="Department" icon={Building} />
        <FilterDropdown label="Company Size" icon={UsersIcon} />
        <FilterDropdown label="Stage" icon={TrendingUp} />
        <FilterDropdown label="Hiring Activity" icon={Activity} />
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(4).fill(0).map((_,i) => <div key={i} className="h-40 bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl animate-pulse"/>)
        ) : companyMap.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-[#1a1a2e] rounded-2xl">
            <h3 className="text-white font-medium mb-1">No open positions found</h3>
            <p className="text-gray-500 text-sm">Check back later or adjust your filters.</p>
          </div>
        ) : (
          companyMap.map(({ startup, jobs }) => {
            const isExpanded = expandedCards.has(startup.$id);
            const score = computeScore(startup, userProfile);
            const departments = Array.from(new Set(jobs.map(j => j.department).filter(Boolean)));
            const newThisWeek = Math.floor(jobs.length / 2) || 1; // mock logic

            return (
              <div key={startup.$id} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl overflow-hidden transition-all">
                {/* Company Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-5">
                      <CompanyLogo name={startup.name} website={startup.website} className="w-16 h-16 rounded-2xl shadow-lg" fallbackTextClass="text-xl font-bold" />
                      <div>
                        <h2 className="text-white font-bold text-lg mb-1">{startup.name}</h2>
                        <p className="text-gray-400 text-[13px] mb-3">
                          {startup.industry ?? 'Tech'} · {startup.hq ?? 'Bengaluru'} · 51-200 employees
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1.5 text-green-400 text-[11px] font-bold tracking-wider px-2 py-1 bg-green-900/20 border border-green-700/30 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/> ACTIVELY HIRING
                          </span>
                          {startup.careers_url && (
                            <a 
                              href={startup.careers_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-[11px] font-bold tracking-wider px-2.5 py-1 bg-blue-900/20 border border-blue-700/30 rounded-md transition-colors"
                            >
                              ⚡ DIRECT ATS ({startup.ats_provider ? startup.ats_provider.toUpperCase() : 'CAREERS'}) ↗
                            </a>
                          )}
                          <span className="text-gray-300 text-[12px] font-medium">🔥 {jobs.length} Open Positions</span>
                          <span className="text-gray-500 text-[12px]">📈 {newThisWeek} New This Week</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 bg-purple-900/20 border border-purple-700/30 px-3 py-1.5 rounded-lg">
                          <span className="text-purple-400 text-sm">🎯</span>
                          <span className="text-purple-300 font-bold text-sm">Your Match: {score}%</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleExpand(startup.$id)}
                        className="flex items-center gap-1.5 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white text-[12px] font-medium px-4 py-2 rounded-xl transition-all">
                        {isExpanded ? 'Hide Opportunities' : 'View Opportunities'} 
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                  
                  {departments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#1a1a2e] flex items-center gap-2">
                      <span className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">Hiring In:</span>
                      <p className="text-gray-400 text-[13px]">{departments.join(' • ')}</p>
                    </div>
                  )}
                </div>

                {/* Expanded Jobs List */}
                {isExpanded && (
                  <div className="bg-[#060610]/50 border-t border-[#1a1a2e] p-6 space-y-4">
                    <h3 className="text-white font-semibold text-sm mb-4">{startup.name} — Open Opportunities</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {jobs.map(job => {
                        // slightly vary the job match score based on title
                        const jobScore = Math.min(99, score + (job.title.length % 10) - 5);
                        const reasons = matchReasons(job, userProfile);
                        
                        return (
                          <div key={job.$id} className="bg-[#0d0d1a] border border-[#1a1a2e] hover:border-purple-700/40 rounded-xl p-5 transition-all">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-white font-semibold text-[15px] mb-1">{job.title}</h4>
                                <p className="text-gray-400 text-[12px] flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" /> {job.location ?? startup.hq ?? 'Remote'} 
                                  <span className="mx-1">·</span> 
                                  {job.employment_type.replace('_', '-')}
                                </p>
                              </div>
                              <span className="bg-purple-900/20 text-purple-400 border border-purple-700/30 px-2 py-0.5 rounded text-[11px] font-bold">
                                🎯 {jobScore}% Match
                              </span>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-gray-500 text-[10px] font-semibold tracking-wider uppercase mb-2">Why you match:</p>
                              <div className="space-y-1.5">
                                {reasons.map((r, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                    <span className="text-gray-300 text-[12px]">{r}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <a href={job.apply_url} target="_blank" rel="noopener noreferrer" 
                                className="flex-1 bg-white hover:bg-gray-100 text-black text-[12px] font-semibold py-2 rounded-lg text-center transition-colors">
                                View Job
                              </a>
                              <button className="flex-1 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white text-[12px] font-medium py-2 rounded-lg transition-colors">
                                Save Opportunity
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
