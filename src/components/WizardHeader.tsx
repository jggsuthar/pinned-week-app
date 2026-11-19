'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  RotateCcw,
  Download,
  Upload,
  Calendar,
  Layers,
  Sliders,
  Printer,
  Home,
} from 'lucide-react';
import appIconImg from '../../Assets/tool-pws.png';
import { usePwsStore } from '../store/usePwsStore';

const STEPS_NAV = [
  { step: 1, label: 'Zones & Grid', icon: Calendar },
  { step: 2, label: 'Pipelines & Cohorts', icon: Layers },
  { step: 3, label: 'Capacity Sandbox', icon: Sliders },
  { step: 4, label: 'Timetable Studio', icon: Printer },
];

export const WizardHeader: React.FC = () => {
  const {
    currentStep,
    setCurrentStep,
    loadCreatorDemoPreset,
    resetToMinConstraints,
    exportStateToJson,
    importStateFromJson,
  } = usePwsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const jsonStr = exportStateToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pws-creator-schedule-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importStateFromJson(content);
        if (!ok) {
          alert('Failed to parse PWS JSON file. Please check file format.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo + Home link */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentStep(0)}
            className="flex items-center gap-2 group text-left"
            title="Return to Home Landing"
          >
            <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-white border border-slate-200/80 shadow-sm shrink-0">
              <Image
                src={appIconImg}
                alt="Pinned Week"
                fill
                sizes="32px"
                className="object-contain p-0.5"
              />
            </div>
            <div className="hidden sm:block">
              <span className="font-[900] text-sm tracking-tight text-[#0a0f1d] block leading-none">
                Pinned <span className="text-[#46b1e1]">Week</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 block tracking-wider uppercase">
                Creator Studio
              </span>
            </div>
          </button>
        </div>

        {/* Center: Step Navigation Pills */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
          {STEPS_NAV.map((s) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            const Icon = s.icon;

            return (
              <button
                key={s.step}
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

        {/* Right: Quick Utility Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadCreatorDemoPreset}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-xs"
            title="Load the 4-zone Creator Demo Preset"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#46b1e1]" />
            <span className="hidden sm:inline">Demo Preset</span>
          </button>

          <button
            onClick={resetToMinConstraints}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-xs"
            title="Reset targets to minimum commitments"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleExport}
            className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            title="Export JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            title="Import JSON"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>
    </header>
  );
};
