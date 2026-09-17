import React, { useState } from 'react';
import {
  ExternalLink,
  Building2,
  TrendingUp,
  Users,
  Bot,
  Briefcase,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  Clock,
} from 'lucide-react';
import { StartupDocument, LeadProfileDocument, RoleTrack } from '@/types/dashboard';
import { getStartupRoleTracks, getRoleBadge } from '@/lib/roleClassifier';
import { formatExternalUrl } from '@/lib/formatters';

interface StartupCardProps {
  startup: StartupDocument;
  onRevealLeads: (startup: StartupDocument) => void;
  onDraftOutreach: (startup: StartupDocument, lead?: LeadProfileDocument, track?: RoleTrack) => void;
  cachedLeadCount?: number;
}

export const StartupCard: React.FC<StartupCardProps> = ({
  startup,
  onRevealLeads,
  onDraftOutreach,
  cachedLeadCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const roleTracks = getStartupRoleTracks(startup);

  const getRoleIcon = (track: RoleTrack) => {
    switch (track) {
      case 'ai':
        return Bot;
      case 'pm':
        return Briefcase;
      case 'fo':
        return Zap;
      default:
        return Sparkles;
    }
  };

  const formattedDate = startup.$createdAt
    ? new Date(startup.$createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        {/* Header: Name, Website Link, Source */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {startup.name}
              </h3>
              {startup.website && (
                <a
                  href={formatExternalUrl(startup.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-50 rounded-md"
                  title="Visit Website"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            {startup.industry && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{startup.industry}</span>
              </div>
            )}
          </div>

          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
            {startup.source === 'youtube' ? 'YouTube' : startup.source ? startup.source : 'Stealth'}
          </span>
        </div>

        {/* Role Matching Badges (R1) */}
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {roleTracks.map((track) => {
            const badge = getRoleBadge(track);
            const Icon = getRoleIcon(track);
            return (
              <span
                key={track}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.badgeClass}`}
                title={badge.description}
              >
                <Icon className="w-3 h-3" />
                <span>{badge.shortLabel}</span>
              </span>
            );
          })}
        </div>

        {/* Funding Information */}
        {(startup.funding_amount || startup.funding_round) && (
          <div className="mb-3.5 p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
            <div className="p-1 rounded-md bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="font-semibold text-emerald-800">
                {startup.funding_round || 'Funded'}
              </span>
              {startup.funding_amount && (
                <span className="text-emerald-700 font-medium ml-1.5">
                  • {startup.funding_amount}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mission & Context */}
        {startup.mission ? (
          <div className="text-xs text-gray-600 leading-relaxed mb-4 flex-1">
            <p className={isExpanded ? '' : 'line-clamp-3'}>{startup.mission}</p>
            {startup.mission.length > 150 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-0.5 cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    Show less <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Read more <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic mb-4 flex-1">
            Stealth mission statement being indexed by discovery pipeline.
          </p>
        )}

        {/* Metadata Footer */}
        {formattedDate && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-3 pt-2 border-t border-gray-100">
            <Clock className="w-3 h-3" />
            <span>Discovered {formattedDate}</span>
          </div>
        )}
      </div>

      {/* Action Footer (R2 & R3) */}
      <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center gap-2">
        <button
          onClick={() => onRevealLeads(startup)}
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-500/10 cursor-pointer"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Reveal Leads</span>
          {typeof cachedLeadCount === 'number' && cachedLeadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {cachedLeadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onDraftOutreach(startup, undefined, roleTracks[0] || 'all')}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold transition-all cursor-pointer"
          title="Draft Cold Outreach Pitch"
        >
          <Send className="w-3.5 h-3.5 text-gray-500" />
          <span className="hidden sm:inline">Pitch</span>
        </button>
      </div>
    </div>
  );
};
