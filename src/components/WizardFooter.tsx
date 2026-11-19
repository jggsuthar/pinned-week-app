'use client';

import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { usePwsStore } from '../store/usePwsStore';

const STEP_LABELS: Record<number, string> = {
  1: 'Life Zones & Weekly Calendar',
  2: 'Content Pipelines & Stage Matrix',
  3: 'Capacity Sandbox & Diagnostics',
  4: 'Pinned Week Poster & Checklist',
};

export const WizardFooter: React.FC<{
  onTriggerExport?: () => void;
}> = ({ onTriggerExport }) => {
  const { currentStep, setCurrentStep } = usePwsStore();

  const progressPercent = Math.min(100, Math.round((currentStep / 4) * 100));

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      setCurrentStep(0); // Return to landing
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else if (onTriggerExport) {
      onTriggerExport();
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-3.5 px-4 sm:px-8 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Step Progress & Indicator */}
        <div className="w-full sm:w-auto flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                STEP {currentStep} OF 4
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-800">
                {STEP_LABELS[currentStep] || 'Wizard Step'}
              </span>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-48 sm:w-60 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-[#46b1e1] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Navigation Action Buttons */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{currentStep === 1 ? 'Home' : 'Back'}</span>
          </button>

          {/* Continue or Export Button */}
          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-full bg-[#46b1e1] hover:bg-[#38bdf8] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm hover:shadow-glow transition-all active:scale-95"
            >
              <span>CONTINUE &gt;&gt;</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-full bg-[#0c1527] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm hover:shadow-glow transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-[#46b1e1]" />
              <span>DOWNLOAD PNG</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
