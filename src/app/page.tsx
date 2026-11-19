'use client';

import React, { useEffect, useState } from 'react';
import { usePwsStore } from '../store/usePwsStore';
import { StepLanding } from '../components/StepLanding';
import { WizardHeader } from '../components/WizardHeader';
import { WizardFooter } from '../components/WizardFooter';
import { PanelZonesCalendar } from '../components/PanelZonesCalendar';
import { PanelContentPipelines } from '../components/PanelContentPipelines';
import { PanelConstraintsSandbox } from '../components/PanelConstraintsSandbox';
import { MasterTimetableExportStudio } from '../components/MasterTimetableExportStudio';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { currentStep } = usePwsStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="pws-bg-atmosphere min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white border border-slate-200/80 shadow-glow">
          <span className="w-3 h-3 rounded-full bg-[#46b1e1] animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Initializing Pinned Week Engine...
          </span>
        </div>
      </main>
    );
  }

  // Step 0: Marketing Landing View
  if (currentStep === 0) {
    return (
      <main className="pws-bg-atmosphere min-h-screen flex flex-col">
        <StepLanding />
      </main>
    );
  }

  // Steps 1 to 4: Wizard Flow with Common Header & Sticky Footer
  return (
    <main className="pws-bg-atmosphere min-h-screen flex flex-col">
      {/* Persistent Wizard Header */}
      <WizardHeader />

      {/* Main Wizard Step Content Area */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 pb-24">
        {currentStep === 1 && <PanelZonesCalendar />}
        {currentStep === 2 && <PanelContentPipelines />}
        {currentStep === 3 && <PanelConstraintsSandbox />}
        {currentStep === 4 && <MasterTimetableExportStudio />}
      </section>

      {/* Sticky Bottom Progress Footer */}
      <WizardFooter
        onTriggerExport={() => {
          window.dispatchEvent(new CustomEvent('pws-download-png'));
        }}
      />
    </main>
  );
}
