'use client';

import React from 'react';
import { Mail, MessageSquare, ExternalLink, Heart, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-16">
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0c1527] text-[#46b1e1] flex items-center justify-center font-[900] text-lg shadow-sm">
            PW
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Pinned Week System (PWS)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#46b1e1] border border-sky-200/60">
                v1.0 Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Deterministic MRV + Augmenting-Path Eviction Engine for Evergreen Creator Timetables.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200/80 transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#46b1e1]" />
            Creator Feedback
          </a>

          <a
            href="mailto:creator-support@example.com"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0c1527] hover:bg-slate-800 text-white font-semibold transition shadow-sm"
          >
            <Mail className="w-3.5 h-3.5 text-[#46b1e1]" />
            Contact Team
          </a>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-slate-400 font-medium">
        Designed with high craft for creators • Zero-latency offline execution with IndexedDB
      </div>
    </footer>
  );
};
