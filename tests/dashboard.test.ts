import test from 'node:test';
import assert from 'node:assert/strict';

// Test imports
import {
  getStartupRoleTracks,
  getRoleBadge,
  getAllRoleBadges,
} from '../src/lib/roleClassifier.ts';

import {
  generateOutreachPitch,
  buildMailtoUrl,
} from '../src/lib/templates.ts';

import { copyToClipboard } from '../src/lib/clipboard.ts';
import { formatExternalUrl, getInitials } from '../src/lib/formatters.ts';

import type { StartupDocument, LeadProfileDocument } from '../src/types/dashboard.ts';

// ---------------------------------------------------------
// R1: Role Classifier & Badging Tests
// ---------------------------------------------------------
test('R1: Role Classifier identifies AI startups correctly', () => {
  const aiStartup: Partial<StartupDocument> = {
    name: 'Cognitive Labs',
    industry: 'Generative AI & LLM Systems',
    mission: 'Building autonomous agent workflows for engineering teams.',
    funding_round: 'Series A',
  };

  const tracks = getStartupRoleTracks(aiStartup);
  assert.ok(tracks.includes('ai'), 'Should include AI track');
  assert.ok(tracks.includes('fo'), 'Series A should include Founder Office');
});

test('R1: Role Classifier identifies Product Management (PM) startups correctly', () => {
  const pmStartup: Partial<StartupDocument> = {
    name: 'SaaSFlow',
    industry: 'B2B SaaS / Fintech Platform',
    mission: 'Developing customer analytics and product telemetry workflows.',
    funding_round: 'Series B',
  };

  const tracks = getStartupRoleTracks(pmStartup);
  assert.ok(tracks.includes('pm'), 'Should include PM track');
});

test('R1: Role Classifier handles special character keywords (0-1, e-commerce, D2C)', () => {
  const earlyStartup: Partial<StartupDocument> = {
    name: 'AlphaStealth',
    industry: '0-to-1 D2C & Quick Commerce',
    mission: '0-1 market expansion in stealth.',
    funding_round: 'Pre-Seed',
  };

  const tracks = getStartupRoleTracks(earlyStartup);
  assert.ok(tracks.includes('fo'), 'Should include Founder Office for 0-1 and Pre-Seed');
  assert.ok(tracks.includes('pm'), 'Should include PM for D2C & Quick Commerce');
});

test('R1: Role Classifier defaults gracefully when startup fields are empty or unknown', () => {
  const emptyStartup: Partial<StartupDocument> = {};
  const tracks = getStartupRoleTracks(emptyStartup);
  assert.deepEqual(tracks, ['fo', 'pm'], 'Empty startup should default to fo and pm');
});

test('R1: Role Badges metadata and configs are valid and non-empty', () => {
  const badges = getAllRoleBadges();
  assert.equal(badges.length, 4, 'Should contain all 4 role badge configs (all, ai, pm, fo)');

  const aiBadge = getRoleBadge('ai');
  assert.equal(aiBadge.id, 'ai');
  assert.ok(aiBadge.label.includes('AI'));
  assert.ok(aiBadge.badgeClass.includes('purple'));

  const foBadge = getRoleBadge('fo');
  assert.equal(foBadge.id, 'fo');
  assert.ok(foBadge.label.includes("Founder's Office"));
});

// ---------------------------------------------------------
// R3: Outreach Pitch Generation Tests
// ---------------------------------------------------------
test('R3: Template generator interpolates startup, founder, and candidate tokens', () => {
  const mockStartup = {
    $id: 'doc_123',
    $sequence: 1,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $databaseId: 'intern_hunt_db',
    $collectionId: 'startups',
    name: 'Zepto',
    industry: 'Quick Commerce',
    funding_round: 'Series G',
    funding_amount: '$340M',
    mission: 'Delivering groceries in 10 minutes across top metropolitan hubs.',
  } as unknown as StartupDocument;

  const mockLead = {
    $id: 'lead_456',
    $sequence: 1,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $databaseId: 'intern_hunt_db',
    $collectionId: 'lead_profiles',
    name: 'Aadit Palicha',
    role: 'Co-Founder & CEO',
    startup_name: 'Zepto',
    startup_doc_id: 'doc_123',
    linkedin_url: 'https://www.linkedin.com/in/aadit-palicha',
  } as unknown as LeadProfileDocument;

  // AI Track Pitch
  const aiPitch = generateOutreachPitch({
    lead: mockLead,
    startup: mockStartup,
    roleTrack: 'ai',
    candidateName: 'Daksh Jhanjari',
    candidateBackground: 'CS & AI Builder',
    candidateLinkedIn: 'https://linkedin.com/in/daksh-jhanjari',
  });

  assert.ok(aiPitch.subject.includes('Zepto'), 'Subject should contain company name');
  assert.ok(aiPitch.subject.includes('Daksh Jhanjari'), 'Subject should contain candidate name');
  assert.ok(aiPitch.body.includes('Hi Aadit,'), 'Body should greet founder by first name');
  assert.ok(aiPitch.body.includes('Series G ($340M)'), 'Body should mention funding milestone');
  assert.ok(aiPitch.body.includes('AI agent systems'), 'Body should focus on AI competencies');
  assert.ok(aiPitch.body.includes('https://linkedin.com/in/daksh-jhanjari'), 'Body should include candidate LinkedIn link');
});

test('R3: Template generator personalizes based on recipient role (CTO vs Recruiter vs Founder)', () => {
  const mockStartup = {
    $id: 'doc_123',
    $sequence: 1,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $databaseId: 'intern_hunt_db',
    $collectionId: 'startups',
    name: 'NeuralScale',
    industry: 'AI Infrastructure',
    mission: 'Scale distributed training pipelines.',
  } as unknown as StartupDocument;

  // Engineering Lead / CTO
  const techLead = {
    $id: 'lead_789',
    $sequence: 1,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $databaseId: 'intern_hunt_db',
    $collectionId: 'lead_profiles',
    name: 'Sarah Chen',
    role: 'Chief Technology Officer (CTO)',
    startup_name: 'NeuralScale',
    linkedin_url: 'https://linkedin.com/in/sarah-chen',
  } as unknown as LeadProfileDocument;

  const techPitch = generateOutreachPitch({
    lead: techLead,
    startup: mockStartup,
    roleTrack: 'ai',
  });
  assert.ok(techPitch.body.includes('engineering velocity'), 'CTO outreach should mention engineering velocity');

  // Recruiter / Talent
  const recruiterLead = {
    $id: 'lead_790',
    $sequence: 1,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $databaseId: 'intern_hunt_db',
    $collectionId: 'lead_profiles',
    name: 'Alex Rivera',
    role: 'Talent Acquisition Partner',
    startup_name: 'NeuralScale',
    linkedin_url: 'https://linkedin.com/in/alex-rivera',
  } as unknown as LeadProfileDocument;

  const recruiterPitch = generateOutreachPitch({
    lead: recruiterLead,
    startup: mockStartup,
    roleTrack: 'pm',
  });
  assert.ok(recruiterPitch.body.includes('talent and team growth'), 'Recruiter outreach should address talent/growth');
});

test('R3: buildMailtoUrl constructs valid mailto links with encoded parameters', () => {
  const url = buildMailtoUrl('AI Intern Interest', 'Hi there,\n\nI want to apply.', 'founder@startup.io');
  assert.ok(url.startsWith('mailto:founder@startup.io?'), 'Should format mailto URL recipient');
  assert.ok(url.includes('subject=AI%20Intern%20Interest'), 'Should encode subject');
  assert.ok(url.includes('body=Hi%20there%2C'), 'Should encode body');
});

// ---------------------------------------------------------
// R4: Filtering, Search, and Sort In-Memory Logic Tests
// ---------------------------------------------------------
test('R4: Startup Search and Sort logic behaves correctly', () => {
  const sampleStartups: StartupDocument[] = [
    {
      $id: '1',
      $sequence: 1,
      $createdAt: '2026-08-01T00:00:00.000Z',
      $updatedAt: '',
      $permissions: [],
      $databaseId: '',
      $collectionId: '',
      name: 'AlphaAI',
      industry: 'AI Robotics',
      funding_amount_numeric: 5000000,
      funding_amount: '$5M',
      funding_round: 'Seed',
      mission: 'Robotics automation',
    } as unknown as StartupDocument,
    {
      $id: '2',
      $sequence: 2,
      $createdAt: '2026-08-10T00:00:00.000Z',
      $updatedAt: '',
      $permissions: [],
      $databaseId: '',
      $collectionId: '',
      name: 'BetaPay',
      industry: 'Fintech Payments',
      funding_amount_numeric: 20000000,
      funding_amount: '$20M',
      funding_round: 'Series A',
      mission: 'Payment gateway',
    } as unknown as StartupDocument,
    {
      $id: '3',
      $sequence: 3,
      $createdAt: '2026-08-05T00:00:00.000Z',
      $updatedAt: '',
      $permissions: [],
      $databaseId: '',
      $collectionId: '',
      name: 'GammaHealth',
      industry: 'HealthTech SaaS',
      funding_amount_numeric: 1000000,
      funding_amount: '$1M',
      funding_round: 'Pre-Seed',
      mission: 'Clinical workflows',
    } as unknown as StartupDocument,
  ];

  // 1. Sort newest
  const sortedNewest = [...sampleStartups].sort(
    (a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
  );
  assert.equal(sortedNewest[0].name, 'BetaPay');
  assert.equal(sortedNewest[2].name, 'AlphaAI');

  // 2. Sort highest funding
  const sortedFunding = [...sampleStartups].sort(
    (a, b) => (b.funding_amount_numeric || 0) - (a.funding_amount_numeric || 0)
  );
  assert.equal(sortedFunding[0].name, 'BetaPay');
  assert.equal(sortedFunding[1].name, 'AlphaAI');
  assert.equal(sortedFunding[2].name, 'GammaHealth');

  // 3. Sort Alphabetical
  const sortedAlpha = [...sampleStartups].sort((a, b) => a.name.localeCompare(b.name));
  assert.equal(sortedAlpha[0].name, 'AlphaAI');
  assert.equal(sortedAlpha[1].name, 'BetaPay');
  assert.equal(sortedAlpha[2].name, 'GammaHealth');

  // 4. Search query matching
  const q = 'robotics';
  const filtered = sampleStartups.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.industry && s.industry.toLowerCase().includes(q)) ||
      (s.mission && s.mission.toLowerCase().includes(q))
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, 'AlphaAI');
});

test('R1: Role Classifier prevents false-positive substring matches (retail, chain, storage, development, html)', () => {
  // A retail clothing store should not be classified as AI just because 'retail' and 'chain' contain 'ai'
  const retailStartup: Partial<StartupDocument> = {
    name: 'Classic Threads',
    industry: 'Retail Apparel & Fashion Chain',
    mission: 'Selling sustainable organic cotton clothes across retail stores.',
    funding_round: 'Series B',
  };
  const retailTracks = getStartupRoleTracks(retailStartup);
  assert.ok(!retailTracks.includes('ai'), 'Retail store should NOT be classified as AI');

  // A storage consulting business should not match RAG or AI
  const storageStartup: Partial<StartupDocument> = {
    name: 'Storage Box',
    industry: 'Warehouse Storage',
    mission: 'Providing physical storage units and garage solutions.',
    funding_round: 'Series C',
  };
  const storageTracks = getStartupRoleTracks(storageStartup);
  assert.ok(!storageTracks.includes('ai'), 'Storage units should NOT be classified as AI / RAG');

  // Software development consulting should match PM/FO but not AI
  const devConsulting: Partial<StartupDocument> = {
    name: 'DevCraft',
    industry: 'IT Consulting',
    mission: 'Custom HTML template development for marketing agencies.',
    funding_round: 'Bootstrapped',
  };
  const devTracks = getStartupRoleTracks(devConsulting);
  assert.ok(!devTracks.includes('ai'), 'HTML template consulting should NOT match AI or ML');
});

// ---------------------------------------------------------
// Clipboard Utility Tests
// ---------------------------------------------------------
test('Clipboard: copyToClipboard returns false gracefully in non-window/SSR environment', async () => {
  const result = await copyToClipboard('Test copy');
  assert.equal(result, false, 'Should return false when window is undefined');
});

// ---------------------------------------------------------
// Multi-token Search and Verified First Sorting Tests
// ---------------------------------------------------------
test('R4: Multi-token Search and Verified First Sorting works accurately', () => {
  const testStartups: StartupDocument[] = [
    {
      $id: 's1',
      $sequence: 1,
      $createdAt: '2026-08-01T00:00:00.000Z',
      $updatedAt: '',
      $permissions: [],
      $databaseId: '',
      $collectionId: '',
      name: 'AgenticFlow',
      industry: 'AI Automation',
      funding_amount_numeric: 3000000,
      funding_amount: '$3M',
      funding_round: 'Seed',
      mission: 'Autonomous workflow agents for engineering.',
      internship_researched: true,
    } as unknown as StartupDocument,
    {
      $id: 's2',
      $sequence: 2,
      $createdAt: '2026-08-15T00:00:00.000Z',
      $updatedAt: '',
      $permissions: [],
      $databaseId: '',
      $collectionId: '',
      name: 'PaySprint',
      industry: 'Fintech SaaS',
      funding_amount_numeric: 10000000,
      funding_amount: '$10M',
      funding_round: 'Series A',
      mission: 'Instant merchant payment settlements.',
      internship_researched: false,
    } as unknown as StartupDocument,
  ];

  // Multi-token search: "seed ai" should match AgenticFlow
  const query = 'seed ai';
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matched = testStartups.filter((s) => {
    const text = [s.name, s.industry, s.mission, s.funding_round].filter(Boolean).join(' ').toLowerCase();
    return tokens.every((tok) => text.includes(tok));
  });
  assert.equal(matched.length, 1);
  assert.equal(matched[0].name, 'AgenticFlow');

  // Verified First Sorting
  const leadsCache: Record<string, LeadProfileDocument[]> = {
    AgenticFlow: [{ $id: 'l1', name: 'Founder' } as unknown as LeadProfileDocument],
  };

  const sortedVerified = [...testStartups].sort((a, b) => {
    const aHasLeads = (leadsCache[a.name]?.length || 0) > 0 || !!a.internship_researched;
    const bHasLeads = (leadsCache[b.name]?.length || 0) > 0 || !!b.internship_researched;
    if (aHasLeads && !bHasLeads) return -1;
    if (!aHasLeads && bHasLeads) return 1;
    return 0;
  });

  assert.equal(sortedVerified[0].name, 'AgenticFlow', 'Verified lead startup should come first');
});

// ---------------------------------------------------------
// Formatting Utilities Tests
// ---------------------------------------------------------
test('Formatters: formatExternalUrl properly normalizes URLs', () => {
  assert.equal(formatExternalUrl('https://linkedin.com/in/founder'), 'https://linkedin.com/in/founder');
  assert.equal(formatExternalUrl('http://startup.io'), 'http://startup.io');
  assert.equal(formatExternalUrl('linkedin.com/in/founder'), 'https://linkedin.com/in/founder');
  assert.equal(formatExternalUrl('  www.startup.io  '), 'https://www.startup.io');
  assert.equal(formatExternalUrl('//cdn.startup.io/app'), 'https://cdn.startup.io/app');
  assert.equal(formatExternalUrl(''), '');
  assert.equal(formatExternalUrl(undefined), '');
});

test('Formatters: getInitials extracts correct uppercase abbreviations', () => {
  assert.equal(getInitials('Aadit Palicha'), 'AP');
  assert.equal(getInitials('Sarah Chen'), 'SC');
  assert.equal(getInitials('Alex'), 'AL');
  assert.equal(getInitials(''), 'F');
  assert.equal(getInitials(undefined), 'F');
});

// ---------------------------------------------------------
// Template Edge Cases Tests
// ---------------------------------------------------------
test('R3: Template generator handles edge case without lead, mission, or funding', () => {
  const minimalStartup = {
    $id: 's_min',
    name: 'StealthCo',
    industry: 'Robotics',
  } as unknown as StartupDocument;

  const pitch = generateOutreachPitch({
    startup: minimalStartup,
    roleTrack: 'ai',
  });

  assert.ok(pitch.body.includes('Hi there,'), 'Should greet with generic "there" when lead is missing');
  assert.ok(pitch.body.includes('innovative solutions in Robotics'), 'Should fall back to grammatical mission placeholder');
  assert.ok(pitch.body.includes('Loved learning about StealthCo'), 'Should fall back to friendly opening when funding is unannounced');
  assert.ok(pitch.subject.includes('StealthCo'), 'Subject should contain company name');
});

test('R3: buildMailtoUrl includes recipient email when provided', () => {
  const url = buildMailtoUrl('AI Application', 'Hello', 'founder@stealth.ai');
  assert.ok(url.startsWith('mailto:founder@stealth.ai?'), 'Should set recipient email in mailto link');
  assert.ok(url.includes('subject=AI%20Application'));
  assert.ok(url.includes('body=Hello'));
});

