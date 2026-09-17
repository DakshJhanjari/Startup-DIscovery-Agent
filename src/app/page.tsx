'use client';

import { useEffect, useState } from 'react';
import { account } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Play, Compass, Users, Send, TrendingUp,
  Radio, Package, MessageCircle, Target,
  ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';

// ── Disha D Logo ─────────────────────────────────────────────────────────────
function DishaLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <path
        d="M7 7L7 29L18 29C25.18 29 29 24.07 29 18C29 11.93 25.18 7 18 7L7 7Z"
        stroke="white" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round"
      />
      <line x1="25" y1="11" x2="11" y2="25" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="25" cy="11" r="2.5" fill="white" opacity="0.95" />
      <circle cx="25" cy="11" r="5" fill="#a855f7" opacity="0.2" />
    </svg>
  );
}

// ── Slide 1: Journey ─────────────────────────────────────────────────────────
function JourneySlide() {
  const steps = [
    {
      num: '01', Icon: Compass, title: 'Discover',
      desc: "We scan thousands of startups, signals and opportunities—so you don't have to."
    },
    {
      num: '02', Icon: Users, title: 'Understand',
      desc: 'Get to know the companies and the people behind them that matter.'
    },
    {
      num: '03', Icon: Send, title: 'Make your move',
      desc: 'Craft smart outreach that gets noticed and starts real conversations.'
    },
    {
      num: '04', Icon: TrendingUp, title: 'Level up',
      desc: 'Keep upgrading your skills and profile to become a stronger match for bigger opportunities.'
    },
  ];
  return (
    <div className="w-full max-w-6xl mx-auto px-8 py-16 text-center">
      <p className="text-purple-400 text-[11px] font-semibold tracking-[0.3em] uppercase mb-6">
        Your Journey With Disha
      </p>
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
        You have ambition.<br />
        Disha gives it <span className="text-purple-400">direction.</span>
      </h2>
      <p className="text-gray-400 text-lg mb-14 max-w-lg mx-auto">
        Disha turns the overwhelming startup ecosystem into a clear path you can act on.
      </p>
      <div className="grid grid-cols-4 gap-4">
        {steps.map(({ num, Icon, title, desc }, i) => (
          <div key={i} className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl p-6 text-left">
            <div className="w-8 h-8 rounded-full border border-purple-600/60 flex items-center justify-center text-purple-400 text-[11px] font-bold mb-5">
              {num}
            </div>
            <div className="w-14 h-14 rounded-full bg-purple-900/20 border border-purple-700/20 flex items-center justify-center mb-5">
              <Icon className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Slide 2: Intelligence Engine ─────────────────────────────────────────────
function IntelligenceSlide() {
  const features = [
    { Icon: Radio, title: 'Real-time Signals', desc: 'Catch funding, hiring, product launches and growth signals as they happen.' },
    { Icon: Users, title: 'Stakeholder Intelligence', desc: 'Know who to talk to, what they care about and how to reach them.' },
    { Icon: Package, title: 'High Match Opportunities', desc: 'AI matches opportunities that align with your profile, goals and trajectory.' },
    { Icon: MessageCircle, title: 'Smart Outreach', desc: 'Personalized messages that sound human, not templated.' },
    { Icon: Target, title: 'Actionable Insights', desc: 'Clear next steps so you always know what to do next.' },
  ];
  const stats = [
    { value: '12K+', label: 'Startups tracked' },
    { value: '4.2M+', label: 'Signals processed daily' },
    { value: '85K+', label: 'Users building clarity' },
    { value: '98%', label: "Opportunities you'd miss on your own" },
  ];
  return (
    <div className="w-full max-w-6xl mx-auto px-8 py-16 text-center">
      <p className="text-purple-400 text-[11px] font-semibold tracking-[0.3em] uppercase mb-6">
        Disha's Intelligence Engine
      </p>
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-14 leading-tight">
        We don't just show data.<br />
        We show <span className="text-purple-400">what matters.</span>
      </h2>
      <div className="grid grid-cols-5 gap-3 mb-4">
        {features.map(({ Icon, title, desc }, i) => (
          <div key={i} className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl p-5 text-left">
            <div className="w-10 h-10 rounded-full bg-purple-900/20 border border-purple-700/20 flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold text-sm mb-2">{title}</h3>
            <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl p-5 grid grid-cols-4 divide-x divide-[#1e1e35]">
        {stats.map(({ value, label }, i) => (
          <div key={i} className="px-6 first:pl-0 last:pr-0 flex items-center gap-3 text-left">
            <span className="text-2xl font-bold text-white">{value}</span>
            <span className="text-gray-400 text-xs leading-snug">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Slide 3: Profile ──────────────────────────────────────────────────────────
function ProfileSlide() {
  const skills = [
    { name: 'Strategy', pct: 80 },
    { name: 'Product Thinking', pct: 65 },
    { name: 'Data Analysis', pct: 50 },
    { name: 'Communication', pct: 70 },
    { name: 'Leadership', pct: 40 },
  ];
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference * (1 - 0.72);

  return (
    <div className="w-full max-w-6xl mx-auto px-8 py-16 grid grid-cols-2 gap-16 items-center">
      {/* Left */}
      <div className="text-left">
        <p className="text-purple-400 text-[11px] font-semibold tracking-[0.3em] uppercase mb-6">
          Update Your Profile
        </p>
        <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
          Your profile is your<br />first impression.<br />
          <span className="text-purple-400">Let's make it count.</span>
        </h2>
        <p className="text-gray-400 text-sm mb-10 leading-relaxed">
          Disha analyses your skills, experience and achievements to show you how you stack up—and how to level up.
        </p>
        <div className="space-y-6">
          {[
            { title: 'AI Profile Score', desc: 'Know how ready you are for the opportunities you want.' },
            { title: 'Skill Gap Analysis', desc: "See what's holding you back and how to fix it." },
            { title: 'Personalized Roadmap', desc: 'Get a custom plan to upgrade your profile and increase your match.' },
          ].map(({ title, desc }, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-purple-900/20 border border-purple-700/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-3 h-3 rounded-sm border-2 border-purple-400 opacity-80" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{title}</p>
                <p className="text-gray-400 text-sm mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Profile Card */}
      <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              D
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Daksh Jhanjari</p>
              <p className="text-gray-500 text-xs">Level 7 · Builder</p>
            </div>
          </div>
          <span className="text-[11px] text-purple-400 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-700/30">
            Top 18% Builders
          </span>
        </div>

        {/* Score + Strength */}
        <div className="flex items-start gap-6 mb-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="38" stroke="#1e1e35" strokeWidth="7" fill="none" />
              <circle cx="48" cy="48" r="38" stroke="#7c3aed" strokeWidth="7" fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circumference * 0.72} ${circumference}`}
                strokeDashoffset="0"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white leading-none">72</span>
              <span className="text-gray-500 text-[10px]">/100</span>
            </div>
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-1">Profile Strength</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Great start! A few upgrades can get you to the next level.
            </p>
          </div>
        </div>

        {/* Skills */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-white text-sm font-semibold">Skills Overview</p>
          <button className="text-purple-400 text-xs hover:text-purple-300">See analysis →</button>
        </div>
        <div className="space-y-2.5 mb-5">
          {skills.map(({ name, pct }) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-32">{name}</span>
              <div className="flex-1 h-1 bg-[#1e1e35] rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-gray-500 text-xs w-8 text-right">{pct}%</span>
            </div>
          ))}
        </div>

        {/* Next Step */}
        <div className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Next Best Step</p>
          <p className="text-white font-semibold text-sm">Learn SQL</p>
          <p className="text-purple-400 text-xs mb-3">High impact</p>
          <button className="w-full bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
            +250 XP ⚡
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [slide, setSlide] = useState(0);

  const slides = [<JourneySlide key="j" />, <IntelligenceSlide key="i" />, <ProfileSlide key="p" />];

  useEffect(() => {
    account.get()
      .then(() => router.push('/dashboard'))
      .catch(() => setLoading(false));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await account.createEmailPasswordSession(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060610]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060610] text-white overflow-x-hidden font-sans">

      {/* ══ Navbar ══════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-4 flex justify-between items-center border-b border-white/5 bg-[#060610]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <DishaLogo size={30} />
          <span className="text-[13px] font-bold tracking-[0.22em] uppercase text-white">Disha</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#" className="hover:text-white transition-colors">Product</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#" className="hover:text-white transition-colors">About</a>
          <a href="#login" className="hover:text-white transition-colors">Login</a>
        </div>
        <a href="#login" className="border border-white/25 hover:border-white/60 text-white text-sm px-5 py-2 rounded-lg transition-all hover:bg-white/5 flex items-center gap-2">
          Explore Disha <ArrowRight className="w-4 h-4" />
        </a>
      </nav>

      {/* ══ Hero ════════════════════════════════════════════════════════════════ */}
      <section className="min-h-screen flex items-center pt-20 px-8 md:px-16 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-purple-700/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-40 bg-purple-700/6 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
          {/* Left copy */}
          <div>
            <p className="text-purple-400 text-[11px] font-semibold tracking-[0.3em] uppercase mb-8">
              Your AI Startup Intelligence System
            </p>
            <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] mb-7">
              The startup world<br />is noisy.<br />
              <span className="text-purple-400">Disha shows you</span><br />
              where to look.
            </h1>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed">
              Discover the right companies. Find the right people.<br />Know your next move.
            </p>
            <div className="flex items-center gap-6">
              <a href="#login" className="bg-purple-700 hover:bg-purple-600 text-white px-7 py-3.5 rounded-xl font-semibold flex items-center gap-2.5 transition-all shadow-lg shadow-purple-900/30 text-sm">
                Explore Disha <ArrowRight className="w-4 h-4" />
              </a>
              <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm">
                <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
                See how it works
              </button>
            </div>
          </div>

          {/* Right: Glowing D logo */}
          <div className="flex items-center justify-center">
            <div className="relative w-72 h-72">
              {/* Outer ambient glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-56 h-56 rounded-full bg-purple-600/6 blur-3xl" />
              </div>
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 280 280"
                fill="none"
              >
                {/* D shape */}
                <path
                  d="M55 55L55 225L140 225Q225 225 225 140Q225 55 140 55L55 55Z"
                  stroke="rgba(168,85,247,0.35)"
                  strokeWidth="2"
                  fill="none"
                  strokeLinejoin="round"
                />
                {/* Diagonal laser ray */}
                <line x1="205" y1="75" x2="75" y2="205" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                {/* Star point glow at top */}
                <circle cx="205" cy="75" r="4" fill="white" opacity="0.95" />
                <circle cx="205" cy="75" r="14" fill="white" opacity="0.12" />
                <circle cx="205" cy="75" r="28" fill="#a855f7" opacity="0.07" />
                {/* Star spikes */}
                <line x1="205" y1="58" x2="205" y2="92" stroke="white" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
                <line x1="188" y1="75" x2="222" y2="75" stroke="white" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
                <line x1="193" y1="63" x2="217" y2="87" stroke="white" strokeWidth="0.7" opacity="0.35" strokeLinecap="round" />
                <line x1="217" y1="63" x2="193" y2="87" stroke="white" strokeWidth="0.7" opacity="0.35" strokeLinecap="round" />
                {/* Bottom ground glow */}
                <ellipse cx="140" cy="235" rx="70" ry="8" fill="#7c3aed" opacity="0.15" />
              </svg>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <p className="text-gray-600 text-[10px] tracking-[0.4em] uppercase">Scroll To Explore</p>
          <ChevronDown className="w-4 h-4 text-purple-500 animate-bounce" />
        </div>
      </section>

      {/* ══ Slideshow Section ═══════════════════════════════════════════════════ */}
      <section className="min-h-screen flex flex-col justify-center relative bg-[#060610] border-t border-white/5">
        {/* Slide content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full transition-all duration-500">
            {slides[slide]}
          </div>
        </div>

        {/* Prev / Next arrows */}
        {slide > 0 && (
          <button
            onClick={() => setSlide(s => s - 1)}
            className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {slide < slides.length - 1 && (
          <button
            onClick={() => setSlide(s => s + 1)}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Dot navigation */}
        <div className="flex justify-center items-center gap-2.5 pb-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`transition-all duration-300 rounded-full ${
                i === slide ? 'w-7 h-2 bg-purple-500' : 'w-2 h-2 bg-gray-700 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ══ How It Works ════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="min-h-screen flex flex-col justify-center px-8 py-24 bg-[#060610] border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center w-full">
          <p className="text-gray-500 text-[11px] font-semibold tracking-[0.3em] uppercase mb-6">How It Works</p>
          <h2 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            Less noise.<br />
            <span className="text-purple-400">More signal.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-20 max-w-md mx-auto">
            Disha cuts through the clutter and gives you clarity you can act on.
          </p>

          {/* Steps row */}
          <div className="grid grid-cols-4 gap-0 relative mb-20">
            {/* Connector line */}
            <div className="absolute top-[38px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-purple-700/40 to-transparent" />

            {[
              {
                num: '01', title: 'We scan everything.',
                desc: 'From funding rounds to hiring signals—millions of data points, real-time.',
                icon: (
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="14" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" fill="none" />
                    <circle cx="18" cy="18" r="6" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" fill="none" />
                    <circle cx="18" cy="18" r="2.5" fill="#a855f7" />
                    <line x1="4" y1="18" x2="8" y2="18" stroke="rgba(168,85,247,0.4)" strokeWidth="1" strokeLinecap="round" />
                    <line x1="28" y1="18" x2="32" y2="18" stroke="rgba(168,85,247,0.4)" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                )
              },
              {
                num: '02', title: 'We find what matters.',
                desc: 'Our AI filters the noise and picks signals that match your interests and goals.',
                icon: (
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <polygon points="18,4 32,32 4,32" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                    <circle cx="18" cy="28" r="3" fill="#a855f7" />
                  </svg>
                )
              },
              {
                num: '03', title: 'You get clarity.',
                desc: 'Relevant companies, key people and high-match opportunities—all in one place.',
                icon: (
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="13" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" fill="none" strokeDasharray="4 2" />
                    <circle cx="18" cy="18" r="5" fill="#a855f7" opacity="0.8" />
                  </svg>
                )
              },
              {
                num: '04', title: 'You take the next step.',
                desc: "Reach out, track, and move forward with confidence. We've got your back.",
                icon: (
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <line x1="6" y1="30" x2="30" y2="6" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M18 6 L30 6 L30 18" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" />
                  </svg>
                )
              },
            ].map(({ num, title, desc, icon }, i) => (
              <div key={i} className="flex flex-col items-center text-center px-6">
                <div className="w-8 h-8 rounded-full border border-purple-600/50 flex items-center justify-center text-purple-400 text-[11px] font-bold mb-10 bg-[#060610] relative z-10">
                  {num}
                </div>
                <div className="w-20 h-20 rounded-full bg-purple-900/10 border border-purple-700/15 flex items-center justify-center mb-6">
                  {icon}
                </div>
                <h3 className="text-white font-semibold mb-2 text-[15px]">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-400 text-sm">From overwhelming to actionable.</span>
            <span className="text-purple-400 text-sm font-medium">Disha is your unfair advantage.</span>
          </div>
        </div>
      </section>

      {/* ══ Login Section ═══════════════════════════════════════════════════════ */}
      <section id="login" className="py-28 px-8 flex flex-col items-center bg-[#060610] border-t border-white/5">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <DishaLogo size={44} />
            <h3 className="text-2xl font-bold mt-5 text-white">Sign in to Disha</h3>
            <p className="text-gray-400 text-sm mt-2">Your startup intelligence system awaits.</p>
          </div>
          <form
            onSubmit={handleLogin}
            className="bg-[#0d0d1a] border border-[#1e1e35] rounded-2xl p-6 space-y-4"
          >
            {error && (
              <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/50 p-3 rounded-xl">
                {error}
              </p>
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a14] border border-[#1e1e35] focus:border-purple-600 text-white placeholder-gray-600 px-4 py-3 rounded-xl outline-none transition-colors text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a14] border border-[#1e1e35] focus:border-purple-600 text-white placeholder-gray-600 px-4 py-3 rounded-xl outline-none transition-colors text-sm"
              required
            />
            <button
              type="submit"
              className="w-full bg-purple-700 hover:bg-purple-600 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 text-sm"
            >
              Explore Disha <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <p className="text-center text-gray-600 text-xs mt-4">
            © 2025 Disha. All rights reserved.
          </p>
        </div>
      </section>

    </div>
  );
}
