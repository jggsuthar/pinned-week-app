'use client';

import React, { useRef } from 'react';
import { Sparkles, RotateCcw, Download, Upload, Zap } from 'lucide-react';
import { usePwsStore } from '../store/usePwsStore';

export const Header: React.FC = () => {
  const { loadCreatorDemoPreset, resetToMinConstraints, exportStateToJson, importStateFromJson } = usePwsStore();
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
    <header className="w-full pt-8 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Bar with Badge & Presets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0c1527] text-white text-xs font-semibold tracking-wider uppercase shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#46b1e1] animate-pulse" />
          TIMETABLE MAKER FOR CREATORS
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadCreatorDemoPreset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 transition shadow-sm"
            title="Load the 4-zone Creator Demo Preset"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#46b1e1]" />
            Demo Preset
          </button>

          <button
            onClick={resetToMinConstraints}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 transition shadow-sm"
            title="Reset targets to hard minimum commitments"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Min Constraints
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 transition shadow-sm"
            title="Export timetable configuration to JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 transition shadow-sm"
            title="Import timetable configuration from JSON"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Import
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

      {/* Main Wordmark & Tagline */}
      <div className="text-left">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-[900] tracking-tight text-[#0a0f1d] leading-none">
          Pinned{' '}
          <span className="bg-gradient-to-r from-[#46b1e1] via-[#38bdf8] to-[#2563eb] bg-clip-text text-transparent">
            Week
          </span>{' '}
          Designer
        </h1>

        <p className="mt-3 text-base sm:text-lg text-slate-600 font-medium max-w-2xl">
          <span className="relative font-semibold text-slate-900">
            Predictable, Pre-Planned,
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#46b1e1]/60 -mb-0.5" />
          </span>{' '}
          Burnout-free Routine for modern digital content creators.
        </p>
      </div>
    </header>
  );
};
