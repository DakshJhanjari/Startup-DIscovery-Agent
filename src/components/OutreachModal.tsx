import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Mail,
  Sparkles,
  Bot,
  Briefcase,
  Zap,
  User,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedInIcon';
import { StartupDocument, LeadProfileDocument, RoleTrack } from '@/types/dashboard';
import { generateOutreachPitch, buildMailtoUrl } from '@/lib/templates';
import { getStartupRoleTracks } from '@/lib/roleClassifier';
import { copyToClipboard } from '@/lib/clipboard';
import { formatExternalUrl } from '@/lib/formatters';

interface OutreachModalProps {
  startup: StartupDocument | null;
  lead?: LeadProfileDocument | null;
  initialRoleTrack?: RoleTrack;
  isOpen: boolean;
  onClose: () => void;
}

export const OutreachModal: React.FC<OutreachModalProps> = ({
  startup,
  lead,
  initialRoleTrack = 'all',
  isOpen,
  onClose,
}) => {
  const [userTrack, setUserTrack] = useState<RoleTrack | null>(null);
  const [candidateName, setCandidateName] = useState('Daksh Jhanjari');
  const [candidateBackground, setCandidateBackground] = useState('Computer Science & Product Builder');
  const [candidateLinkedIn, setCandidateLinkedIn] = useState('https://www.linkedin.com/in/daksh-jhanjari');
  const [customSubject, setCustomSubject] = useState<string | null>(null);
  const [customBody, setCustomBody] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'all' | 'subject' | 'body' | null>(null);

  // Target key tracking to automatically reset custom overrides when target startup/lead changes
  const targetKey = `${startup?.$id || startup?.name || ''}_${lead?.$id || lead?.name || 'none'}`;
  const [prevTargetKey, setPrevTargetKey] = useState(targetKey);

  if (targetKey !== prevTargetKey) {
    setPrevTargetKey(targetKey);
    setCustomSubject(null);
    setCustomBody(null);
    setUserTrack(null);
    setCopiedType(null);
  }

  // Active track derived declaratively
  const activeTrack: RoleTrack = useMemo(() => {
    if (userTrack) return userTrack;
    if (initialRoleTrack && initialRoleTrack !== 'all') return initialRoleTrack;
    if (startup) {
      const tracks = getStartupRoleTracks(startup);
      if (tracks.length > 0) return tracks[0];
    }
    return 'all';
  }, [userTrack, initialRoleTrack, startup]);

  // Derived default pitch
  const generatedPitch = useMemo(() => {
    if (!startup) {
      return {
        subject: '',
        body: '',
        roleTitle: '',
        highlights: [],
      };
    }

    return generateOutreachPitch({
      lead,
      startup,
      roleTrack: activeTrack,
      candidateName,
      candidateBackground,
      candidateLinkedIn,
    });
  }, [startup, lead, activeTrack, candidateName, candidateBackground, candidateLinkedIn]);

  const currentSubject = customSubject !== null ? customSubject : generatedPitch.subject;
  const currentBody = customBody !== null ? customBody : generatedPitch.body;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !startup) return null;

  const handleCopy = async (type: 'all' | 'subject' | 'body') => {
    let textToCopy = '';
    if (type === 'all') {
      textToCopy = `Subject: ${currentSubject}\n\n${currentBody}`;
    } else if (type === 'subject') {
      textToCopy = currentSubject;
    } else if (type === 'body') {
      textToCopy = currentBody;
    }

    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopiedType(type);
      setTimeout(() => {
        setCopiedType(null);
      }, 2500);
    }
  };

  const handleTrackChange = (track: RoleTrack) => {
    setUserTrack(track);
    setCustomSubject(null);
    setCustomBody(null);
  };

  const handleResetToTemplate = () => {
    setUserTrack(null);
    setCustomSubject(null);
    setCustomBody(null);
  };

  const mailtoUrl = buildMailtoUrl(currentSubject, currentBody, lead?.email);
  const isCustomized = customSubject !== null || customBody !== null || userTrack !== null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outreach-modal-title"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="min-h-full flex items-center justify-center p-4 sm:p-6 text-center">
        <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl text-left overflow-hidden border border-gray-100 transform transition-all animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 via-white to-purple-50/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h2 id="outreach-modal-title" className="text-lg sm:text-xl font-bold text-gray-900">
                    Cold Outreach Drafter
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-1.5">
                  <span>Target:</span>
                  <span className="font-semibold text-gray-800">{startup.name}</span>
                  {lead && (
                    <>
                      <span>•</span>
                      <span className="text-blue-700 font-medium">{lead.name} ({lead.role})</span>
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Track Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-400 mr-1">Pitch Track:</span>
              <button
                onClick={() => handleTrackChange('ai')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  activeTrack === 'ai'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI / Automation</span>
              </button>

              <button
                onClick={() => handleTrackChange('pm')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  activeTrack === 'pm'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Product (PM)</span>
              </button>

              <button
                onClick={() => handleTrackChange('fo')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  activeTrack === 'fo'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Founder&apos;s Office</span>
              </button>

              <button
                onClick={() => handleTrackChange('all')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  activeTrack === 'all'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>General Intern</span>
              </button>

              {isCustomized && (
                <button
                  onClick={handleResetToTemplate}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded-lg cursor-pointer"
                  title="Reset to generated pitch"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Pitch</span>
                </button>
              )}
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Candidate Settings Drawer */}
            <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-700 font-semibold">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sender Persona Details</span>
                </span>
                <span className="text-[11px] text-gray-400 font-normal">
                  Auto-interpolates into template
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">
                    Your Background / Focus
                  </label>
                  <input
                    type="text"
                    value={candidateBackground}
                    onChange={(e) => setCandidateBackground(e.target.value)}
                    placeholder="e.g. CS Sophomore @ Stanford"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">
                    LinkedIn / Portfolio
                  </label>
                  <input
                    type="text"
                    value={candidateLinkedIn}
                    onChange={(e) => setCandidateLinkedIn(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Subject Line Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Subject Line</label>
                <button
                  onClick={() => handleCopy('subject')}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedType === 'subject' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Subject</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={currentSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>

            {/* Pitch Body Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Outreach Message Body</label>
                <button
                  onClick={() => handleCopy('body')}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedType === 'body' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Body</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={currentBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={10}
                className="w-full px-3.5 py-2.5 text-xs text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans leading-relaxed resize-y"
              />
            </div>

            {/* Copy Feedback Banner */}
            {copiedType === 'all' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Full outreach pitch copied to clipboard! Ready to paste into LinkedIn DM or Email.</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 sm:p-6 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5 justify-between items-center">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {lead?.linkedin_url && (
                <a
                  href={formatExternalUrl(lead.linkedin_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white text-xs font-semibold transition-all shadow-xs"
                >
                  <LinkedInIcon className="w-3.5 h-3.5" />
                  <span>Open LinkedIn Profile</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}

              <a
                href={mailtoUrl}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold transition-colors shadow-xs"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Launch Mail App</span>
              </a>
            </div>

            <button
              onClick={() => handleCopy('all')}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                copiedType === 'all'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/20'
              }`}
            >
              {copiedType === 'all' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>1-Click Copy Outreach</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
