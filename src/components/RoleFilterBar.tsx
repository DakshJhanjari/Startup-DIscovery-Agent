import React from 'react';
import { Search, X, Bot, Briefcase, Zap, Compass, ArrowUpDown, Filter } from 'lucide-react';
import { RoleTrack, SortOption } from '@/types/dashboard';
import { getAllRoleBadges } from '@/lib/roleClassifier';

interface RoleFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTrack: RoleTrack;
  onSelectTrack: (track: RoleTrack) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  trackCounts: Record<RoleTrack, number>;
  totalResults: number;
}

export const RoleFilterBar: React.FC<RoleFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTrack,
  onSelectTrack,
  sortBy,
  onSortChange,
  trackCounts,
  totalResults,
}) => {
  const roleBadges = getAllRoleBadges();

  const getTrackIcon = (id: RoleTrack) => {
    switch (id) {
      case 'ai':
        return Bot;
      case 'pm':
        return Briefcase;
      case 'fo':
        return Zap;
      default:
        return Compass;
    }
  };

  const isFiltered = searchQuery.trim() !== '' || selectedTrack !== 'all';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6 space-y-4">
      {/* Top row: Search Input & Sort Selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search startups, keywords, AI, SaaS, mission..."
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <span className="hidden sm:inline">Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="py-2 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="newest">Newest Discovered</option>
            <option value="verified_first">Verified Leads First</option>
            <option value="funding_desc">Highest Funding</option>
            <option value="name_asc">Startup Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Bottom row: Sticky / Quick-toggle Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
        <span className="text-xs font-medium text-gray-400 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Track:
        </span>

        {roleBadges.map((badge) => {
          const Icon = getTrackIcon(badge.id);
          const isSelected = selectedTrack === badge.id;
          const count = trackCounts[badge.id] || 0;

          return (
            <button
              key={badge.id}
              onClick={() => onSelectTrack(badge.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                isSelected
                  ? badge.activeClass
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
              <span>{badge.shortLabel}</span>
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200/80 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Clear Filters indicator if filtered */}
        {isFiltered && (
          <button
            onClick={() => {
              onSearchChange('');
              onSelectTrack('all');
            }}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            Clear filters ({totalResults} found)
          </button>
        )}
      </div>
    </div>
  );
};
