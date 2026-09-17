import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Send,
  Users,
  Search,
  Sparkles,
  RefreshCw,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedInIcon';
import { StartupDocument, LeadProfileDocument, RoleTrack } from '@/types/dashboard';
import { databases, APPWRITE_DB_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { formatExternalUrl, getInitials } from '@/lib/formatters';

interface ContactDrawerProps {
  startup: StartupDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onDraftOutreach: (startup: StartupDocument, lead?: LeadProfileDocument, track?: RoleTrack) => void;
  onLeadsLoaded?: (startupName: string, leads: LeadProfileDocument[]) => void;
  leadsCache?: Record<string, LeadProfileDocument[]>;
}

export const ContactDrawer: React.FC<ContactDrawerProps> = ({
  startup,
  isOpen,
  onClose,
  onDraftOutreach,
  onLeadsLoaded,
  leadsCache = {},
}) => {
  const [fetchedMap, setFetchedMap] = useState<
    Record<string, { leads: LeadProfileDocument[]; error: string | null }>
  >({});

  const startupKey = startup?.name?.trim() || '';
  const cachedLeads = startupKey ? leadsCache[startupKey] : undefined;
  const fetchedEntry = startupKey ? fetchedMap[startupKey] : undefined;

  const leads = cachedLeads ?? fetchedEntry?.leads ?? [];
  const error = fetchedEntry?.error ?? null;
  const loading = isOpen && !!startupKey && !cachedLeads && !fetchedEntry;

  // Lock body scroll when drawer is open
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

  useEffect(() => {
    if (!isOpen || !startup) return;

    const key = startup.name.trim();
    if (leadsCache[key] || fetchedMap[key]) return;

    let isCancelled = false;

    const fetchLeads = async () => {
      try {
        // Query by startup_name first
        const response = await databases.listDocuments<LeadProfileDocument>(
          APPWRITE_DB_ID,
          'lead_profiles',
          [Query.equal('startup_name', startup.name), Query.limit(100)]
        );

        let docs = response.documents;

        // If no docs matched exact name, try querying by startup_doc_id if available
        if (docs.length === 0 && startup.$id) {
          try {
            const fallbackResponse = await databases.listDocuments<LeadProfileDocument>(
              APPWRITE_DB_ID,
              'lead_profiles',
              [Query.equal('startup_doc_id', startup.$id), Query.limit(100)]
            );
            docs = fallbackResponse.documents;
          } catch {
            // Ignore secondary query error and keep empty list
          }
        }

        // If still empty, try exact-match client filtering against recent leads
        if (docs.length === 0) {
          try {
            const allLeadsRes = await databases.listDocuments<LeadProfileDocument>(
              APPWRITE_DB_ID,
              'lead_profiles',
              [Query.limit(100)]
            );
            const targetName = startup.name.toLowerCase().trim();
            docs = allLeadsRes.documents.filter(
              (d) =>
                (d.startup_name && d.startup_name.toLowerCase().trim() === targetName) ||
                (d.startup_doc_id && d.startup_doc_id === startup.$id)
            );
          } catch {
            // Ignore and fall through
          }
        }

        if (!isCancelled) {
          setFetchedMap((prev) => ({ ...prev, [key]: { leads: docs, error: null } }));
          if (onLeadsLoaded) {
            onLeadsLoaded(key, docs);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load leads:', err);
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Unable to fetch leadership contacts.';
          setFetchedMap((prev) => ({ ...prev, [key]: { leads: [], error: msg } }));
        }
      }
    };

    fetchLeads();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, startup, leadsCache, fetchedMap, onLeadsLoaded]);

  // Handle ESC key to close
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

  const linkedinSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    `${startup.name} founder OR CEO OR CTO OR hiring`
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-drawer-title"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <Users className="w-4 h-4" />
                  </span>
                  <h2 id="contact-drawer-title" className="text-xl font-bold text-gray-900">{startup.name}</h2>
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>{startup.industry || 'Stealth Startup'}</span>
                  {startup.funding_round && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium">{startup.funding_round}</span>
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-blue-600 font-medium animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching verified founder & leadership directory...</span>
                </div>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 animate-pulse space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-gray-200 rounded-md w-1/2" />
                        <div className="h-3 bg-gray-200 rounded-md w-1/3" />
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to fetch contacts</p>
                  <p className="mt-0.5 text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Leads List */}
            {!loading && !error && leads.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Leadership Contacts ({leads.length})</span>
                  </h3>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
                    Direct Outreach Ready
                  </span>
                </div>

                {leads.map((lead) => {
                  const initials = getInitials(lead.name);

                  const isFounderRole =
                    /founder|ceo|cto|co-founder/i.test(lead.role || '');

                  return (
                    <div
                      key={lead.$id}
                      className="p-5 rounded-2xl border border-gray-200/90 bg-white hover:border-blue-300 hover:shadow-md transition-all space-y-4 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-blue-500/20 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                              {lead.name || 'Founder / Leadership'}
                            </h4>
                            <p className="text-xs font-medium text-gray-600 mt-0.5">
                              {lead.role || 'Executive'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {isFounderRole && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Decision Maker
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Lead
                              </span>
                            </div>
                          </div>
                        </div>

                        {lead.linkedin_url && (
                          <a
                            href={formatExternalUrl(lead.linkedin_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-[#0077b5]/10 text-[#0077b5] hover:bg-[#0077b5] hover:text-white transition-all shadow-xs"
                            title="Open LinkedIn Profile"
                          >
                            <LinkedInIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            onDraftOutreach(startup, lead);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Draft Outreach</span>
                        </button>

                        {lead.linkedin_url && (
                          <a
                            href={formatExternalUrl(lead.linkedin_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                          >
                            <span>Profile</span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && leads.length === 0 && (
              <div className="text-center py-10 px-4 bg-gray-50/80 rounded-2xl border border-dashed border-gray-200 space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    No direct founder leads indexed yet
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    Our discovery workers run continuously to verify new founder & recruiter LinkedIn profiles. You can search directly on LinkedIn or draft a pitch to their team.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <a
                    href={linkedinSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    <LinkedInIcon className="w-3.5 h-3.5" />
                    <span>Search Founders on LinkedIn</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>

                  <button
                    onClick={() => onDraftOutreach(startup)}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>Draft Cold Pitch</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mission Context Recap */}
            {startup.mission && (
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-blue-800">
                  <Sparkles className="w-3.5 h-3.5" /> Company Mission & Context
                </span>
                <p className="text-blue-950/80 leading-relaxed">{startup.mission}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center text-xs text-gray-500">
            <span>Discovered via {startup.source || 'Automated Pipeline'}</span>
            <button
              onClick={onClose}
              className="py-1.5 px-3 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
