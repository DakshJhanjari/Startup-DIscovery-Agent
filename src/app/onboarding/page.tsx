'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { account } from '@/lib/appwrite';
import { saveOnboarding } from '@/lib/userProfile';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import type { RoleTarget, IndustryTarget, ExperienceLevel, OnboardingState } from '@/types/user';
import type { Models } from 'appwrite';

// ── Disha Logo (inline) ──────────────────────────────────────────────────────
function DishaLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <path d="M7 7L7 29L18 29C25.18 29 29 24.07 29 18C29 11.93 25.18 7 18 7L7 7Z"
        stroke="white" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="25" y1="11" x2="11" y2="25" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="25" cy="11" r="2.5" fill="white" opacity="0.95" />
      <circle cx="25" cy="11" r="5" fill="#a855f7" opacity="0.2" />
    </svg>
  );
}

// ── Config ───────────────────────────────────────────────────────────────────
const ROLES: { id: RoleTarget; label: string; desc: string; emoji: string }[] = [
  { id: 'pm', label: 'Product Management', desc: 'Strategy, roadmaps, user research, and 0→1 building', emoji: '🎯' },
  { id: 'ai', label: 'AI / Automation', desc: 'ML, data engineering, LLMs, and AI product work', emoji: '🤖' },
  { id: 'fo', label: "Founder's Office", desc: 'Ops, growth, special projects directly with founders', emoji: '🚀' },
];

const INDUSTRIES: { id: IndustryTarget; label: string; emoji: string }[] = [
  { id: 'fintech', label: 'FinTech', emoji: '💳' },
  { id: 'saas', label: 'SaaS / B2B', emoji: '☁️' },
  { id: 'd2c', label: 'D2C / Consumer', emoji: '🛍️' },
  { id: 'healthtech', label: 'HealthTech', emoji: '🏥' },
  { id: 'edtech', label: 'EdTech', emoji: '📚' },
  { id: 'deeptech', label: 'DeepTech', emoji: '🔬' },
  { id: 'climatetech', label: 'ClimateTech', emoji: '🌱' },
  { id: 'ecommerce', label: 'E-Commerce', emoji: '📦' },
  { id: 'any', label: 'Open to Any', emoji: '🌐' },
];

const EXPERIENCE: { id: ExperienceLevel; label: string; desc: string }[] = [
  { id: 'fresher', label: 'Fresher', desc: 'No prior work experience — looking for my first opportunity' },
  { id: 'intern', label: 'Had an internship', desc: '1–2 internships under my belt' },
  { id: '0-1yr', label: '0–1 year', desc: 'Less than a year of full-time experience' },
  { id: '1-2yr', label: '1–2 years', desc: 'Some experience, ready for a bigger challenge' },
];

// ── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i === current ? 'w-8 bg-purple-500' : i < current ? 'w-4 bg-purple-700' : 'w-4 bg-[#1e1e35]'
          }`}
        />
      ))}
    </div>
  );
}

// ── Main onboarding page ─────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    roleTargets: [],
    industryTargets: [],
    experienceLevel: '',
  });

  useEffect(() => {
    account.get()
      .then(setUser)
      .catch(() => router.push('/'));
  }, [router]);

  const toggleRole = (id: RoleTarget) => {
    setState(s => ({
      ...s,
      roleTargets: s.roleTargets.includes(id)
        ? s.roleTargets.filter(r => r !== id)
        : [...s.roleTargets, id],
    }));
  };

  const toggleIndustry = (id: IndustryTarget) => {
    // If "any" selected, clear others; if other selected, clear "any"
    if (id === 'any') {
      setState(s => ({ ...s, industryTargets: ['any'] }));
      return;
    }
    setState(s => ({
      ...s,
      industryTargets: s.industryTargets.includes(id)
        ? s.industryTargets.filter(i => i !== id)
        : [...s.industryTargets.filter(i => i !== 'any'), id],
    }));
  };

  const canProceed = () => {
    if (step === 0) return state.roleTargets.length > 0;
    if (step === 1) return state.industryTargets.length > 0;
    if (step === 2) return state.experienceLevel !== '';
    return false;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveOnboarding(
        user.$id,
        user.email,
        user.name || user.email.split('@')[0],
        state as OnboardingState & { experienceLevel: ExperienceLevel }
      );
      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding save failed:', err);
      setSaving(false);
    }
  };

  const next = () => {
    if (step < 2) setStep(s => s + 1);
    else handleFinish();
  };

  return (
    <div className="min-h-screen bg-[#060610] text-white flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-14">
        <DishaLogo />
        <span className="text-sm font-bold tracking-[0.22em] uppercase">Disha</span>
      </div>

      <div className="w-full max-w-2xl">
        <StepDots current={step} total={3} />

        {/* ── Step 0: Role ── */}
        {step === 0 && (
          <div>
            <p className="text-purple-400 text-[11px] font-semibold tracking-[0.3em] uppercase mb-4">
              Step 1 of 3
            </p>
            <h1 className="text-3xl font-bold mb-2">What role are you targeting?</h1>
            <p className="text-gray-400 mb-8">Pick all that apply — Disha will filter startups accordingly.</p>
            <div className="space-y-3">
              {ROLES.map(role => {
                const active = state.roleTargets.includes(role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => toggleRole(role.id)}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${
                      active
                        ? 'border-purple-600 bg-purple-900/20'
                        : 'border-[#1e1e35] bg-[#0d0d1a] hover:border-purple-700/50'
                    }`}
                  >
                    <span className="text-2xl">{role.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{role.label}</p>
                      <p className="text-gray-400 text-sm mt-0.5">{role.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                      active ? 'bg-purple-600 border-purple-600' : 'border-[#2e2e50]'
                    }`}>
                      {active && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 1: Industry ── */}
        {step === 1 && (
          <div>
            <p className="text-purple-400 text-[11px] font-semibold tracking-[0.3em] uppercase mb-4">
              Step 2 of 3
            </p>
            <h1 className="text-3xl font-bold mb-2">Which industries excite you?</h1>
            <p className="text-gray-400 mb-8">Disha will surface startups from your preferred sectors first.</p>
            <div className="grid grid-cols-3 gap-3">
              {INDUSTRIES.map(ind => {
                const active = state.industryTargets.includes(ind.id);
                return (
                  <button
                    key={ind.id}
                    onClick={() => toggleIndustry(ind.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                      active
                        ? 'border-purple-600 bg-purple-900/20'
                        : 'border-[#1e1e35] bg-[#0d0d1a] hover:border-purple-700/50'
                    }`}
                  >
                    <span className="text-xl">{ind.emoji}</span>
                    <span className="font-medium text-sm text-white">{ind.label}</span>
                    {active && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Experience ── */}
        {step === 2 && (
          <div>
            <p className="text-purple-400 text-[11px] font-semibold tracking-[0.3em] uppercase mb-4">
              Step 3 of 3
            </p>
            <h1 className="text-3xl font-bold mb-2">Where are you in your journey?</h1>
            <p className="text-gray-400 mb-8">This helps Disha personalise the profile score framework for you.</p>
            <div className="space-y-3">
              {EXPERIENCE.map(exp => {
                const active = state.experienceLevel === exp.id;
                return (
                  <button
                    key={exp.id}
                    onClick={() => setState(s => ({ ...s, experienceLevel: exp.id }))}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${
                      active
                        ? 'border-purple-600 bg-purple-900/20'
                        : 'border-[#1e1e35] bg-[#0d0d1a] hover:border-purple-700/50'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-white">{exp.label}</p>
                      <p className="text-gray-400 text-sm mt-0.5">{exp.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                      active ? 'bg-purple-600 border-purple-600' : 'border-[#2e2e50]'
                    }`}>
                      {active && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div className="flex items-center justify-between mt-10">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={next}
            disabled={!canProceed() || saving}
            className={`flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all ${
              canProceed() && !saving
                ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'bg-[#1e1e35] text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting up...
              </>
            ) : step === 2 ? (
              <>
                <Sparkles className="w-4 h-4" />
                Launch Disha
              </>
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
