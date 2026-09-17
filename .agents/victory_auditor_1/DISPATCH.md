## 2026-08-29T21:55:29Z

Conduct an independent post-victory audit for the candidate dashboard UI task in d:\Python Files\intern-hunt-web.

<original_task>
This is a single self-contained feature; keep it small and focused.

Build an interactive, high-converting candidate dashboard UI for the Intern Hunt web app, optimized specifically for job and internship seekers discovering stealth startups, viewing verified founder/recruiter contacts, and initiating cold outreach.

Working directory: d:\Python Files\intern-hunt-web
Integrity mode: development

## Requirements

### R1. Candidate-Centric Filtering & Role Badging
The dashboard must allow candidates to filter and categorize startups by target role interests: Product Management (PM), Artificial Intelligence / Automation (AI), and Founder's Office (FO). Startups matching these focus areas must display visual badges, with sticky or quick-toggle filter pills that instantly refine the listing.

### R2. One-Click Lead Reveal (Founders & Contacts)
Each startup card must include an interactive contact drawer or modal that queries the Appwrite `lead_profiles` collection by startup name or startup doc ID. It must display discovered founders, CTOs, and recruiters with verified roles and direct links to their LinkedIn profiles.

### R3. Cold Outreach Drafter & Template Launcher
Provide a direct "Draft Outreach" action for revealed leads. Clicking this opens a personalized cold internship application template modal pre-populated with the founder's name, role, company name, mission snippet, and candidate pitch structure, with a 1-click "Copy to Clipboard" button.

### R4. Search, Responsiveness, and Empty/Loading States
The interface must include real-time keyword search (by startup name, industry, or mission), polished loading skeletons, clear error states, and full responsive design for desktop and mobile devices using Tailwind CSS and Lucide icons.

## Acceptance Criteria

### Build & Type Integrity
- [ ] `npm run build` succeeds in `d:\Python Files\intern-hunt-web` with zero TypeScript errors and zero lint failures.
- [ ] No regressions in existing auth routing or Appwrite client initialization.

### Functional Verification
- [ ] Clicking any role filter pill (e.g., "PM Intern", "AI / Automation", "Founder's Office") updates the displayed list without page reload.
- [ ] Clicking "View Contacts" / "Reveal Leads" on a startup card triggers an asynchronous lookup in the `lead_profiles` collection and renders contact cards with working LinkedIn links.
- [ ] When no leads exist for a startup, a graceful empty state ("No direct founder leads indexed yet") is rendered without breaking the UI.
- [ ] Clicking "Draft Email" on a lead generates a coherent, personalized pitch message with company and contact tokens properly filled in, and copying the text notifies the user with a confirmation state.
</original_task>
