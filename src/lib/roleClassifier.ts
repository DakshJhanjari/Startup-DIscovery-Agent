import type { RoleTrack, RoleBadgeInfo, StartupDocument } from '../types/dashboard.ts';

const AI_KEYWORDS = [
  'ai',
  'artificial intelligence',
  'machine learning',
  'ml',
  'automation',
  'agent',
  'agents',
  'agentic',
  'llm',
  'generative',
  'genai',
  'deep learning',
  'robotics',
  'nlp',
  'computer vision',
  'vision',
  'bot',
  'bots',
  'autonomous',
  'neural',
  'rag',
  'intelligent',
  'data science',
];

const PM_KEYWORDS = [
  'product',
  'pm',
  'saas',
  'b2b',
  'b2c',
  'platform',
  'marketplace',
  'fintech',
  'edtech',
  'healthtech',
  'consumer',
  'e-commerce',
  'ecommerce',
  'd2c',
  'quick commerce',
  'analytics',
  'app',
  'crm',
  'workflow',
  'cloud',
  'developer tools',
  'devtool',
  'devtools',
  'cleantech',
  'logistics',
  'payments',
  'dashboard',
  'portal',
];

const FO_KEYWORDS = [
  'founder',
  'founders office',
  'stealth',
  'seed',
  'pre-seed',
  'pre seed',
  'angel',
  'generalist',
  'operations',
  'growth',
  'strategy',
  '0 to 1',
  '0-1',
  'early stage',
  'incubator',
  'yc',
  'venture',
  'expansion',
];

const FO_FUNDING_ROUNDS = [
  'seed',
  'pre-seed',
  'pre seed',
  'angel',
  'stealth',
  'series a',
  'grant',
  'bootstrapped',
];

function containsKeyword(text: string, kw: string): boolean {
  if (!text || !kw) return false;
  const lowerText = text.toLowerCase();
  const lowerKw = kw.toLowerCase();
  
  // Escape special regex characters
  const escaped = lowerKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match word boundary: start of string or non-alphanumeric char, followed by keyword, followed by non-alphanumeric char or end of string
  const boundaryRegex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i');
  return boundaryRegex.test(lowerText);
}

/**
 * Returns the matching role tracks ('ai', 'pm', 'fo') for a given startup document.
 */
export function getStartupRoleTracks(startup: Partial<StartupDocument>): RoleTrack[] {
  const tracks: RoleTrack[] = [];
  
  const textPool = [
    startup.name || '',
    startup.industry || '',
    startup.mission || '',
    startup.funding_round || '',
  ]
    .join(' ')
    .toLowerCase();

  // 1. Check AI / Automation
  const isAi = AI_KEYWORDS.some((kw) => containsKeyword(textPool, kw));
  if (isAi) {
    tracks.push('ai');
  }

  // 2. Check Product Management (PM)
  const isPm = PM_KEYWORDS.some((kw) => containsKeyword(textPool, kw));
  if (isPm) {
    tracks.push('pm');
  }

  // 3. Check Founder's Office (FO)
  const fundingRoundLower = (startup.funding_round || '').toLowerCase();
  const isEarlyStage = FO_FUNDING_ROUNDS.some((r) => fundingRoundLower.includes(r));
  const hasFoKeywords = FO_KEYWORDS.some((kw) => containsKeyword(textPool, kw));

  // Early-stage startups (< Series B) or explicit generalist keywords match FO track
  if (hasFoKeywords || isEarlyStage || (startup.source === 'youtube' && !tracks.includes('fo'))) {
    tracks.push('fo');
  }

  // If none matched, assign FO and PM by default for early-stage discovery
  if (tracks.length === 0) {
    tracks.push('fo', 'pm');
  }

  return Array.from(new Set(tracks));
}

export const ROLE_TRACK_CONFIGS: Record<RoleTrack, RoleBadgeInfo> = {
  all: {
    id: 'all',
    label: 'All Discoveries',
    shortLabel: 'All Roles',
    iconName: 'Compass',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    activeClass: 'bg-gray-900 text-white shadow-sm border-gray-900',
    description: 'Explore all discovered stealth startups and high-growth ventures.',
  },
  ai: {
    id: 'ai',
    label: 'AI & Automation',
    shortLabel: 'AI / Automation',
    iconName: 'Bot',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/10',
    activeClass: 'bg-purple-600 text-white shadow-purple-500/20 shadow-lg border-purple-600',
    description: 'Autonomous systems, LLM agents, computer vision, and machine learning infrastructure.',
  },
  pm: {
    id: 'pm',
    label: 'Product Management',
    shortLabel: 'PM Intern',
    iconName: 'Briefcase',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10',
    activeClass: 'bg-blue-600 text-white shadow-blue-500/20 shadow-lg border-blue-600',
    description: '0-to-1 feature scoping, SaaS workflows, user analytics, and platform product strategy.',
  },
  fo: {
    id: 'fo',
    label: "Founder's Office",
    shortLabel: "Founder's Office",
    iconName: 'Zap',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10',
    activeClass: 'bg-amber-600 text-white shadow-amber-500/20 shadow-lg border-amber-600',
    description: 'High-leverage generalist roles, CEO shadowing, growth experiments, and strategic execution.',
  },
};

export function getRoleBadge(role: RoleTrack): RoleBadgeInfo {
  return ROLE_TRACK_CONFIGS[role] || ROLE_TRACK_CONFIGS.all;
}

export function getAllRoleBadges(): RoleBadgeInfo[] {
  return [
    ROLE_TRACK_CONFIGS.all,
    ROLE_TRACK_CONFIGS.ai,
    ROLE_TRACK_CONFIGS.pm,
    ROLE_TRACK_CONFIGS.fo,
  ];
}
