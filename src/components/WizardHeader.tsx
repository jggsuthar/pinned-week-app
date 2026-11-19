'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  Calendar,
  Layers,
  Printer,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import toolIconImg from '../../Assets/tool-pws.jpg';
import { usePwsStore } from '../store/usePwsStore';

const STEPS_NAV = [
  { step: 1, label: 'Zones & Grid', icon: Calendar },
  { step: 2, label: 'Pipelines & Cohorts', icon: Layers },
  { step: 3, label: 'Capacity Sandbox', icon: Sliders },
  { step: 4, label: 'Timetable Studio', icon: Printer },
];

export const WizardHeader: React.FC = () => {
  const { currentStep, setCurrentStep, startFromScratch } = usePwsStore();

  // Double-confirmation state: 0 = closed, 1 = first prompt, 2 = final confirmation
  const [resetConfirmStage, setResetConfirmStage] = useState<0 | 1 | 2>(0);

  const handleConfirmReset = () => {
    if (resetConfirmStage === 1) {
      setResetConfirmStage(2);
    } else if (resetConfirmStage === 2) {
      startFromScratch();
      setResetConfirmStage(0);
      setCurrentStep(0);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: tool-pws.jpg + "PWS Designer" linking Home */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="flex items-center gap-2.5 group text-left cursor-pointer"
              title="Return to Home"
            >
              <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white border border-slate-200/80 shadow-xs shrink-0 group-hover:border-[#46b1e1] transition-colors">
                <Image
                  src={toolIconImg}
                  alt="PWS Designer Icon"
                  fill
                  sizes="36px"
                  className="object-contain p-0.5"
                />
              </div>
              <span className="font-[900] text-sm tracking-tight text-[#0a0f1d] group-hover:text-[#46b1e1] transition-colors">
                PWS Designer
              </span>
            </button>
          </div>

          {/* Center: Step Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
            {STEPS_NAV.map((s) => {
              const isActive = currentStep === s.step;
              const isCompleted = currentStep > s.step;

              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setCurrentStep(s.step)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : isCompleted
                      ? 'text-slate-700 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-extrabold ${
                      isActive
                        ? 'bg-[#46b1e1] text-white'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {s.step}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Reset Button with Double Confirmation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setResetConfirmStage(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition shadow-xs cursor-pointer"
              title="Reset all app data and return Home"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Double-Confirmation Reset Modal */}
      {resetConfirmStage > 0 && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setResetConfirmStage(0)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block">
                    Confirmation {resetConfirmStage} of 2
                  </span>
                  <h3 className="text-sm sm:text-base font-[900] text-slate-900">
                    {resetConfirmStage === 1
                      ? 'Reset entire workspace?'
                      : 'Are you completely sure?'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetConfirmStage(0)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Cancel reset"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {resetConfirmStage === 1
                ? 'This will remove all zones, time blocks, content pipelines, and targets you have configured so far and return you to the Home page.'
                : 'This action cannot be undone. Click below to permanently erase all loaded data and start fresh from Home.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetConfirmStage(0)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm cursor-pointer"
              >
                {resetConfirmStage === 1
                  ? 'Continue to Final Confirm'
                  : 'Yes, Clear Everything & Go Home'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
