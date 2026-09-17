'use client';

import { useState, useEffect } from 'react';

export function avatarColor(name: string) {
  const C = [
    'from-purple-600 to-indigo-600',
    'from-blue-600 to-cyan-600',
    'from-green-600 to-emerald-600',
    'from-orange-500 to-red-600',
    'from-pink-600 to-rose-600',
    'from-yellow-500 to-orange-500'
  ];
  return C[name.charCodeAt(0) % C.length];
}

export function cleanDomain(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
}

interface CompanyLogoProps {
  name: string;
  website?: string;
  className?: string;
  fallbackTextClass?: string;
}

export function getLogoDomain(url?: string, name: string = ''): string {
  let domain = cleanDomain(url).toLowerCase();
  const blocked = [
    'entrackr.com', 'inc42.com', 'yourstory.com', 'linkedin.com', 
    'youtube.com', 'techcrunch.com', 'vccircle.com', 'dealstreetasia.com', 
    'moneycontrol.com', 'economictimes.indiatimes.com', 'indiatimes.com', 
    'forbes.com', 'news.google.com', 'twitter.com', 'instagram.com', 
    'facebook.com', 'medium.com'
  ];
  if (!domain || blocked.includes(domain)) {
    // Guess domain from name
    domain = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  }
  return domain;
}

export function CompanyLogo({ name, website, className = 'w-10 h-10 rounded-xl', fallbackTextClass = 'text-sm font-bold' }: CompanyLogoProps) {
  const [step, setStep] = useState(0);
  const domain = getLogoDomain(website, name);
  
  useEffect(() => {
    setStep(0);
  }, [website, name]);

  // Step 2: Fallback to initials
  if (step === 2 || !domain) {
    return (
      <div className={`flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br ${avatarColor(name)} ${className}`}>
        <span className={fallbackTextClass}>{name.charAt(0).toUpperCase()}</span>
      </div>
    );
  }

  // Step 0: Clearbit Logo API
  // Step 1: Google Favicon API (never 404s, returns default globe if missing)
  const src = step === 0 
    ? `https://logo.clearbit.com/${domain}` 
    : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  return (
    <div className={`flex items-center justify-center bg-white flex-shrink-0 overflow-hidden ${className}`}>
      <img 
        src={src} 
        alt={`${name} logo`}
        className="w-full h-full object-contain p-1"
        onError={() => setStep(s => s + 1)}
      />
    </div>
  );
}
