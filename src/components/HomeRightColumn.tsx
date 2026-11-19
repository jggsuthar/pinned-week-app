'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  ChevronDown,
  FlaskConical,
  HelpCircle,
  Mail,
  Upload,
} from 'lucide-react';
import appIconImg from '../../Assets/tool-pws.png';
import { usePwsStore } from '../store/usePwsStore';

export const HomeRightColumn: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const { setCurrentStep, startFromScratch, loadCreatorDemoPreset, importStateFromJson } =
    usePwsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isWhatIsPwsOpen, setIsWhatIsPwsOpen] = useState(false);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importStateFromJson(content);
        if (ok) {
          setCurrentStep(1);
        } else {
          alert('Failed to parse PWS JSON file. Please check file format.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`lg:col-span-6 flex flex-col items-start space-y-6 ${className}`}>
      {/* Main App Icon */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-sm shrink-0">
        <Image
          src={appIconImg}
          alt="Pinned Week Designer Icon"
          fill
          sizes="80px"
          priority
          className="object-contain p-1.5"
        />
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-2.5">
        <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-[900] tracking-tight text-[#0a0f1d] leading-[1.06]">
          Pinned{' '}
          <span className="bg-gradient-to-r from-[#46b1e1] via-[#38bdf8] to-[#2563eb] bg-clip-text text-transparent">
            Week
          </span>{' '}
          Designer
        </h1>

        <p className="text-base sm:text-xl text-slate-600 font-medium leading-relaxed">
          Predictable, Pre-Planned, Burnout-free Routine
        </p>
      </div>

      {/* 3 Action Buttons */}
      <div className="w-full max-w-lg space-y-3 pt-1">
        <button
          type="button"
          onClick={() => {
            startFromScratch();
            setCurrentStep(1);
          }}
          className="w-full sm:w-auto group px-7 py-4 rounded-2xl bg-[#0c1527] hover:bg-slate-800 text-white font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-between sm:justify-center gap-4 transition-all duration-200 shadow-md hover:shadow-glow hover:scale-[1.01]"
        >
          <span>Design Your Week</span>
          <ArrowRight className="w-4 h-4 text-[#46b1e1] group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              loadCreatorDemoPreset();
              setCurrentStep(1);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:border-[#46b1e1] hover:bg-sky-50/40 transition shadow-xs"
            title="Load dummy creator sample data to experiment and play with the tool"
          >
            <FlaskConical className="w-3.5 h-3.5 text-[#46b1e1]" />
            <span>Load Creator Demo</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-500">
              Sample Data
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 transition shadow-xs"
            title="Import saved PWS JSON configuration"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import JSON</span>
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

      {/* Collapsed "What is PWS?" Accordion */}
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white/95 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsWhatIsPwsOpen((prev) => !prev)}
          aria-expanded={isWhatIsPwsOpen}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition"
        >
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-900">
            <HelpCircle className="w-4 h-4 text-[#46b1e1]" />
            <span>What is PWS?</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isWhatIsPwsOpen ? 'rotate-180 text-[#46b1e1]' : ''
            }`}
          />
        </button>

        {isWhatIsPwsOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium">
            The Pinned Week System turns content creation into a predictable routine. Instead of relying on fleeting motivation, you lock in a single, repeatable weekly schedule that fits your real life. By assigning specific days or time blocks to tasks like scripting, shooting, and editing, you build a resilient pipeline. This system creates stability, reduces creator burnout, and makes uploads automatic.
          </div>
        )}
      </div>

      {/* Feedback & Suggestions */}
      <div className="pt-1 flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Mail className="w-3.5 h-3.5 text-[#46b1e1] shrink-0" />
        <span>
          For Feedback and Suggestions, reach out to{' '}
          <a
            href="mailto:jaimin@jaiminsuthar.com"
            className="font-bold text-slate-800 hover:text-[#46b1e1] underline underline-offset-2 transition-colors"
          >
            jaimin@jaiminsuthar.com
          </a>
        </span>
      </div>
    </div>
  );
};
