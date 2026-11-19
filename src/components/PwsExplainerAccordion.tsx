'use client';

import React from 'react';
import { Calendar, Layers, ShieldCheck } from 'lucide-react';

export const PwsExplainerAccordion: React.FC = () => {
  return (
    <section
      id="what-is-pws"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 border-t border-slate-200/70"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-7">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#46b1e1] block mb-1">
            THE SYSTEM
          </span>
          <h2 className="text-2xl sm:text-3xl font-[900] text-[#0a0f1d] tracking-tight">
            What is the Pinned Week System (PWS)?
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md">
          Design one repeatable weekly blueprint once—so you always know what to make, where to make it, and never rush an upload.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1 */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-[#46b1e1]/60 hover:shadow-md transition-all space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#46b1e1] flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-[900] text-slate-900">
            1. Work Zones, Not Rigid Clocks
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Block your spare 9–5 hours by <strong>location &amp; gear</strong> (Studio, Desk, Cafe) instead of brittle hourly alarms.
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-[#46b1e1]/60 hover:shadow-md transition-all space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-50 text-[#8b5cf6] flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-[900] text-slate-900">
            2. Week N-4 &rarr; N-1 Lead Loop
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Every stage operates <strong>1+ week ahead</strong> of publishing (Week N-4 Script &rarr; Week N-1 Publish). Zero same-week panic.
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-[#46b1e1]/60 hover:shadow-md transition-all space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-[900] text-slate-900">
            3. Cross-Pipeline Batching
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Pair shared setup rigs (e.g. Camera or Editing) across YouTube, Shorts &amp; Podcasts so setup overhead is paid <strong>only once</strong>.
          </p>
        </div>
      </div>
    </section>
  );
};
