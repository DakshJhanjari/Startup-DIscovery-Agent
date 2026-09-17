import type { LeadProfileDocument, RoleTrack, StartupDocument } from '../types/dashboard.ts';

export interface TemplateGenerateParams {
  lead?: LeadProfileDocument | null;
  startup: StartupDocument;
  roleTrack: RoleTrack;
  candidateName?: string;
  candidateBackground?: string;
  candidateLinkedIn?: string;
}

export interface OutreachTemplateResult {
  subject: string;
  body: string;
  roleTitle: string;
  highlights: string[];
}

export function generateOutreachPitch(params: TemplateGenerateParams): OutreachTemplateResult {
  const {
    lead,
    startup,
    roleTrack,
    candidateName = 'Daksh Jhanjari',
    candidateBackground = 'Computer Science & Product Builder',
    candidateLinkedIn = 'https://www.linkedin.com/in/daksh-jhanjari',
  } = params;

  const rawLeadName = lead?.name?.trim() || '';
  const firstName = rawLeadName.split(' ')[0] || 'there';
  const rawLeadRole = lead?.role?.trim() || '';
  const isFounderOrExec = /founder|ceo|co-founder|co founder/i.test(rawLeadRole);
  const isEngineeringLead = /cto|engineer|tech lead|architect/i.test(rawLeadRole);
  const isProductLead = /product|cpo|head of product/i.test(rawLeadRole);
  const isTalentRecruiter = /recruiter|talent|people|hiring/i.test(rawLeadRole);

  const companyName = startup.name?.trim() || 'your company';
  const rawMission = startup.mission?.replace(/[\r\n]+/g, ' ').trim();
  const missionSnippet = rawMission
    ? rawMission.length > 160
      ? rawMission.slice(0, 160) + '...'
      : rawMission
    : `innovative solutions in ${startup.industry || 'the tech ecosystem'}`;
    
  const fundingContext = startup.funding_round
    ? `Congrats on the recent ${startup.funding_round}${startup.funding_amount ? ` (${startup.funding_amount})` : ''} milestone!`
    : `Loved learning about ${companyName}'s rapid growth in ${startup.industry || 'stealth'}.`;

  const linkedinFooter = candidateLinkedIn.trim()
    ? `LinkedIn: ${candidateLinkedIn.trim()}`
    : '[LinkedIn Profile / Portfolio Link]';

  // Specific Greeting Context based on recipient role
  let roleGreetingContext = '';
  if (isTalentRecruiter) {
    roleGreetingContext = `I noticed you're driving talent and team growth at ${companyName}.`;
  } else if (isEngineeringLead) {
    roleGreetingContext = `As someone leading engineering velocity at ${companyName}, I'm reaching out directly to support your technical roadmap.`;
  } else if (isProductLead) {
    roleGreetingContext = `Seeing your leadership on the product side at ${companyName}, I wanted to share specific ideas for your user feature sprints.`;
  } else if (isFounderOrExec) {
    roleGreetingContext = `As founder leading ${companyName}, I know high-agency execution and 0-to-1 speed are critical.`;
  }

  const openingParagraph = [fundingContext, roleGreetingContext].filter(Boolean).join(' ');

  if (roleTrack === 'ai') {
    const roleTitle = 'AI / Automation Engineering Intern';
    return {
      roleTitle,
      highlights: [
        'LLM agent orchestration & RAG architectures',
        'Autonomous task workflows & Python tooling',
        'Model fine-tuning & evaluation benchmarks',
      ],
      subject: `AI / Automation Intern @ ${companyName} — ${candidateName}`,
      body: `Hi ${firstName},

${openingParagraph}

I've been closely following ${companyName}'s mission to build ${missionSnippet}. As someone focused on AI agent systems, LLM automation, and backend architectures (${candidateBackground}), I would love to contribute to your engineering sprint as an AI / Automation Intern.

Here is how I can create immediate value for ${companyName}:
• Prototype & ship autonomous LLM workflows and agentic pipelines.
• Optimize inference latency, prompt routing, and vector retrieval (RAG).
• Build internal automation scripts to accelerate core engineering velocity.

Would you be open to a brief 10-minute chat this week to discuss how I can help your team ship faster?

Best regards,
${candidateName}
${linkedinFooter}`,
    };
  }

  if (roleTrack === 'pm') {
    const roleTitle = 'Product Management (PM) Intern';
    return {
      roleTitle,
      highlights: [
        '0-to-1 feature specs, PRDs & user journeys',
        'Retention analytics & product telemetry',
        'Customer discovery & competitor teardowns',
      ],
      subject: `Product Management Intern Interest @ ${companyName} — ${candidateName}`,
      body: `Hi ${firstName},

${openingParagraph}

I came across ${companyName} and was super impressed by your approach to ${missionSnippet}. As an aspiring Product Manager with a strong technical foundation (${candidateBackground}), I am eager to help your team turn user insights into high-impact features.

Areas where I can take full ownership:
• Writing sharp PRDs, scoping user stories, and unblocking sprint items.
• Conducting user interview teardowns and competitive landscape mapping.
• Setting up product telemetry funnels to boost activation and retention.

I'd love to share a 1-page teardown/spec I drafted for ${companyName}. Do you have 10 minutes for a quick intro call next week?

Best regards,
${candidateName}
${linkedinFooter}`,
    };
  }

  if (roleTrack === 'fo') {
    const roleTitle = "Founder's Office Intern / Generalist";
    return {
      roleTitle,
      highlights: [
        '0-to-1 operational execution & CEO leverage',
        'Growth hacking, outbound lead gen & partnerships',
        'Rapid research, market mapping & financial modeling',
      ],
      subject: `Founder's Office Intern @ ${companyName} — ${candidateName}`,
      body: `Hi ${firstName},

${openingParagraph}

Building ${companyName} (${missionSnippet}) requires relentless 0-to-1 velocity. As an agile generalist (${candidateBackground}), I want to serve as an operational force multiplier in your Founder's Office.

What I can take completely off your plate from Day 1:
• Execute high-priority growth experiments, inbound funnels, and customer outreach.
• Conduct deep-dive market intelligence, competitor benchmarking, and investor update prep.
• Automate internal ops workflows, cross-functional syncs, and special projects.

I operate with high agency and zero hand-holding. Are you free for a quick 10-minute conversation this week to see if I'd be a strong fit for your team?

Best regards,
${candidateName}
${linkedinFooter}`,
    };
  }

  // Default / All Track
  return {
    roleTitle: 'High-Ownership Internship Applicant',
    highlights: [
      'High agency & fast execution speed',
      'Cross-functional problem solving',
      'Stealth startup sprint acceleration',
    ],
    subject: `Internship Inquiry @ ${companyName} — ${candidateName}`,
    body: `Hi ${firstName},

${openingParagraph}

I came across ${companyName}'s work around ${missionSnippet} and was really energized by your vision. With my background in ${candidateBackground}, I'm looking for a high-intensity internship opportunity where I can ship impactful work from day one.

Whether it's accelerating product development, building automation workflows, or executing strategic growth sprints, I'm ready to roll up my sleeves and build.

Would you be open to a 10-minute introductory call sometime this week?

Best regards,
${candidateName}
${linkedinFooter}`,
  };
}

export function buildMailtoUrl(subject: string, body: string, recipientEmail?: string): string {
  const email = recipientEmail || '';
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${email}?${params.toString().replace(/\+/g, '%20')}`;
}
