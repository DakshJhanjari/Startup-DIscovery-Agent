import React from 'react';
import { Bot, Briefcase, Zap, Building2 } from 'lucide-react';
import { RoleTrack } from '@/types/dashboard';

interface StatsBannerProps {
  totalStartups: number;
  aiCount: number;
  pmCount: number;
  foCount: number;
  activeTrack: RoleTrack;
  onSelectTrack: (track: RoleTrack) => void;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  totalStartups,
  aiCount,
  pmCount,
  foCount,
  activeTrack,
  onSelectTrack,
}) => {
  const cards = [
    {
      id: 'all' as RoleTrack,
      label: 'Total Startups',
      count: totalStartups,
      subtext: 'Stealth & funded ventures',
      icon: Building2,
      color: 'text-gray-900',
      bg: 'bg-white',
      border: activeTrack === 'all' ? 'border-gray-900 ring-2 ring-gray-900/10' : 'border-gray-200',
      iconBg: 'bg-gray-100 text-gray-700',
    },
    {
      id: 'ai' as RoleTrack,
      label: 'AI & Automation',
      count: aiCount,
      subtext: 'LLM, Agents & Robotics',
      icon: Bot,
      color: 'text-purple-600',
      bg: 'bg-white',
      border: activeTrack === 'ai' ? 'border-purple-600 ring-2 ring-purple-600/20' : 'border-gray-200',
      iconBg: 'bg-purple-50 text-purple-600',
    },
    {
      id: 'pm' as RoleTrack,
      label: 'Product Management',
      count: pmCount,
      subtext: 'SaaS, B2B & Platform PM',
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-white',
      border: activeTrack === 'pm' ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-gray-200',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'fo' as RoleTrack,
      label: "Founder's Office",
      count: foCount,
      subtext: '0-to-1 Generalist & Ops',
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-white',
      border: activeTrack === 'fo' ? 'border-amber-600 ring-2 ring-amber-600/20' : 'border-gray-200',
      iconBg: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeTrack === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onSelectTrack(card.id)}
            className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${card.bg} ${card.border} hover:shadow-md hover:border-gray-300 relative group overflow-hidden`}
          >
            {isSelected && (
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 w-8 h-8 rotate-45 bg-blue-600/10 pointer-events-none" />
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-2 rounded-lg ${card.iconBg} transition-transform group-hover:scale-105`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-extrabold ${card.color}`}>
                {card.count}
              </span>
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">openings</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              {card.subtext}
            </p>
          </button>
        );
      })}
    </div>
  );
};
