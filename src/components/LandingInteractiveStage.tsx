'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Cpu,
  MonitorPlay,
  PenTool,
  Scissors,
  Smartphone,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';

interface SimBlock {
  id: string;
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
  pipeline: 'YouTube' | 'Shorts';
  pipelineIcon: 'youtube' | 'shorts';
  stage: string;
  stageIcon: 'script' | 'shoot' | 'edit' | 'publish';
  weekLabel: string;
  zoneName: 'Studio' | 'Desk' | 'Admin';
  zoneColor: string;
  duration: string;
  batchTag?: string;
  setupSavedMins: number;
  batchGroup: 'write' | 'camera' | 'edit' | 'publish';
  chaosRotate: string;
  chaosShift: string;
  chaosWastedSetup: string;
}

const SIM_BLOCKS: SimBlock[] = [
  {
    id: 'b-mon-1',
    day: 'MON',
    pipeline: 'YouTube',
    pipelineIcon: 'youtube',
    stage: 'Script',
    stageIcon: 'script',
    weekLabel: 'Week N-4',
    zoneName: 'Desk',
    zoneColor: '#8b5cf6',
    duration: '1h 30m',
    batchGroup: 'write',
    setupSavedMins: 15,
    chaosRotate: '-rotate-3',
    chaosShift: '-translate-y-1 translate-x-1',
    chaosWastedSetup: '+15m switch',
  },
  {
    id: 'b-tue-1',
    day: 'TUE',
    pipeline: 'YouTube',
    pipelineIcon: 'youtube',
    stage: 'Shoot',
    stageIcon: 'shoot',
    weekLabel: 'Week N-3',
    zoneName: 'Studio',
    zoneColor: '#46b1e1',
    duration: '1h 30m',
    batchTag: 'Rig Shared',
    batchGroup: 'camera',
    setupSavedMins: 30,
    chaosRotate: 'rotate-2',
    chaosShift: 'translate-y-2 -translate-x-1',
    chaosWastedSetup: '+30m rig setup',
  },
  {
    id: 'b-tue-2',
    day: 'TUE',
    pipeline: 'Shorts',
    pipelineIcon: 'shorts',
    stage: 'Shoot ×3',
    stageIcon: 'shoot',
    weekLabel: 'Week N-3',
    zoneName: 'Studio',
    zoneColor: '#46b1e1',
    duration: '1h 15m',
    batchTag: 'Chained 0m setup',
    batchGroup: 'camera',
    setupSavedMins: 60,
    chaosRotate: '-rotate-2',
    chaosShift: 'translate-y-1 translate-x-2',
    chaosWastedSetup: '+60m duplicate',
  },
  {
    id: 'b-wed-1',
    day: 'WED',
    pipeline: 'Shorts',
    pipelineIcon: 'shorts',
    stage: 'Script ×3',
    stageIcon: 'script',
    weekLabel: 'Week N-4',
    zoneName: 'Desk',
    zoneColor: '#8b5cf6',
    duration: '1h',
    batchGroup: 'write',
    setupSavedMins: 30,
    chaosRotate: 'rotate-3',
    chaosShift: '-translate-y-2',
    chaosWastedSetup: '+30m scatter',
  },
  {
    id: 'b-thu-1',
    day: 'THU',
    pipeline: 'YouTube',
    pipelineIcon: 'youtube',
    stage: 'Edit',
    stageIcon: 'edit',
    weekLabel: 'Week N-2',
    zoneName: 'Studio',
    zoneColor: '#46b1e1',
    duration: '2h',
    batchTag: 'Suite Shared',
    batchGroup: 'edit',
    setupSavedMins: 20,
    chaosRotate: '-rotate-2',
    chaosShift: 'translate-y-1',
    chaosWastedSetup: '+20m teardown',
  },
  {
    id: 'b-thu-2',
    day: 'THU',
    pipeline: 'Shorts',
    pipelineIcon: 'shorts',
    stage: 'Edit ×3',
    stageIcon: 'edit',
    weekLabel: 'Week N-2',
    zoneName: 'Studio',
    zoneColor: '#46b1e1',
    duration: '1h 30m',
    batchTag: 'Chained 0m setup',
    batchGroup: 'edit',
    setupSavedMins: 40,
    chaosRotate: 'rotate-2',
    chaosShift: '-translate-x-1 translate-y-2',
    chaosWastedSetup: '+40m reload',
  },
  {
    id: 'b-fri-1',
    day: 'FRI',
    pipeline: 'YouTube',
    pipelineIcon: 'youtube',
    stage: 'Publish',
    stageIcon: 'publish',
    weekLabel: 'Week N-1',
    zoneName: 'Admin',
    zoneColor: '#10b981',
    duration: '45m',
    batchGroup: 'publish',
    setupSavedMins: 10,
    chaosRotate: '-rotate-3',
    chaosShift: 'translate-y-1',
    chaosWastedSetup: 'Last-min rush!',
  },
];

const DAYS: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI')[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const ENGINE_PHASES = [
  { id: 0, label: '01 · Scanning Creator Pipelines', accent: '#38bdf8' },
  { id: 1, label: '02 · Amortizing Shared Rig Setups', accent: '#10b981' },
  { id: 2, label: '03 · Locking Week N-4 → N-1 Loop', accent: '#46b1e1' },
];

const ZONES_LEGEND: { name: 'Studio' | 'Desk' | 'Admin'; color: string; hrs: string }[] = [
  { name: 'Studio', color: '#46b1e1', hrs: '8h' },
  { name: 'Desk', color: '#8b5cf6', hrs: '4h' },
  { name: 'Admin', color: '#10b981', hrs: '2h' },
];

export const LandingInteractiveStage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);

  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [spotlight, setSpotlight] = useState({ x: 50, y: 35, active: false });
  const [isChaosMode, setIsChaosMode] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(2);
  const [hoveredBlock, setHoveredBlock] = useState<SimBlock | null>(null);
  const [hoveredZone, setHoveredZone] = useState<'Studio' | 'Desk' | 'Admin' | null>(null);
  const [hoveredPipeline, setHoveredPipeline] = useState<'YouTube' | 'Shorts' | null>(null);

  // Continuous living phase cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIdx((prev) => (prev + 1) % ENGINE_PHASES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;

    // Gentle 3D parallax tilt capped to +/- 5.5 deg
    const ry = ((px - 50) / 50) * 5.5;
    const rx = -((py - 50) / 50) * 5.5;

    setTilt({ rx, ry });
    setSpotlight({ x: px, y: py, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setSpotlight((prev) => ({ ...prev, active: false }));
    setHoveredBlock(null);
    setHoveredZone(null);
    setHoveredPipeline(null);
  };

  const renderStageIcon = (kind: SimBlock['stageIcon']) => {
    if (kind === 'script') return <PenTool className="w-2.5 h-2.5" />;
    if (kind === 'shoot') return <Camera className="w-2.5 h-2.5" />;
    if (kind === 'edit') return <Scissors className="w-2.5 h-2.5" />;
    return <Wand2 className="w-2.5 h-2.5" />;
  };

  const renderPipeIcon = (kind: SimBlock['pipelineIcon']) => {
    return kind === 'youtube' ? (
      <MonitorPlay className="w-2.5 h-2.5" />
    ) : (
      <Smartphone className="w-2.5 h-2.5" />
    );
  };

  const currentPhase = ENGINE_PHASES[phaseIdx];

  return (
    <div
      className="relative w-full py-2 sm:py-4 select-none"
      style={{ perspective: '1200px' }}
    >
      {/* Ambient outer aura glow behind card */}
      <div
        className={`pointer-events-none absolute -inset-4 rounded-[36px] blur-3xl transition-colors duration-700 ${
          isChaosMode ? 'bg-rose-500/15' : 'bg-[#46b1e1]/20'
        }`}
        aria-hidden="true"
      />

      {/* Interactive 3D Tilted Obsidian Engine Card */}
      <div
        ref={stageRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
          transition: spotlight.active
            ? 'transform 120ms ease-out'
            : 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="relative rounded-3xl bg-[#0c1527] border border-slate-800/90 shadow-[0_28px_70px_-18px_rgba(12,21,39,0.55)] overflow-hidden p-4 sm:p-5 space-y-4"
      >
        {/* Dynamic Cursor Spotlight Glow */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: spotlight.active ? 1 : 0.35,
            background: isChaosMode
              ? `radial-gradient(380px circle at ${spotlight.x}% ${spotlight.y}%, rgba(244,63,94,0.16), transparent 65%)`
              : `radial-gradient(380px circle at ${spotlight.x}% ${spotlight.y}%, rgba(70,177,225,0.22), transparent 65%)`,
          }}
          aria-hidden="true"
        />

        {/* Subtle Tech Blueprint Dot Matrix */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
          aria-hidden="true"
        />

        {/* Scanning Light Beam when in Pinned Mode */}
        {!isChaosMode && (
          <div
            className="pointer-events-none absolute inset-y-0 w-36 bg-gradient-to-r from-transparent via-[#46b1e1]/10 to-transparent animate-pws-scan"
            aria-hidden="true"
          />
        )}

        {/* TOP BAR: Live Engine Telemetry & Chaos/Pinned Interactive Switch */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                isChaosMode
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : 'bg-[#46b1e1]/15 border-[#46b1e1]/30 text-[#46b1e1]'
              }`}
            >
              {isChaosMode ? (
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <Cpu className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-ping ${
                    isChaosMode ? 'bg-rose-400' : 'bg-emerald-400'
                  }`}
                />
                <span>
                  {isChaosMode ? 'Unplanned Ad-Hoc Week' : currentPhase.label}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Chaos vs Pinned Toggle Pill */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setIsChaosMode(true)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                isChaosMode
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chaos
            </button>
            <button
              type="button"
              onClick={() => setIsChaosMode(false)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer inline-flex items-center gap-1 ${
                !isChaosMode
                  ? 'bg-[#46b1e1] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>Pinned</span>
            </button>
          </div>
        </div>

        {/* INTERACTIVE FILTER CHIPS (Hover Zone or Pipeline to Trace) */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-1.5">
            {ZONES_LEGEND.map((z) => {
              const isActive = hoveredZone === z.name;
              return (
                <button
                  key={z.name}
                  type="button"
                  onMouseEnter={() => setHoveredZone(z.name)}
                  onMouseLeave={() => setHoveredZone(null)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border transition cursor-pointer font-bold ${
                    isActive
                      ? 'bg-slate-800 border-[#46b1e1] text-white scale-105'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: z.color }}
                  />
                  <span>{z.name}</span>
                  <span className="text-slate-500 tabular-nums">{z.hrs}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            {(['YouTube', 'Shorts'] as const).map((pipe) => {
              const active = hoveredPipeline === pipe;
              return (
                <button
                  key={pipe}
                  type="button"
                  onMouseEnter={() => setHoveredPipeline(pipe)}
                  onMouseLeave={() => setHoveredPipeline(null)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition cursor-pointer font-bold ${
                    active
                      ? 'bg-[#46b1e1]/20 border-[#46b1e1] text-[#38bdf8] scale-105'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pipe === 'YouTube' ? (
                    <MonitorPlay className="w-2.5 h-2.5" />
                  ) : (
                    <Smartphone className="w-2.5 h-2.5" />
                  )}
                  <span>{pipe}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LIVE 5-DAY INTERACTIVE TIMETABLE MATRIX */}
        <div className="relative z-10 grid grid-cols-5 gap-1.5 sm:gap-2">
          {DAYS.map((day, dIdx) => {
            const blocks = SIM_BLOCKS.filter((b) => b.day === day);
            const isPhaseHighlight = !isChaosMode && phaseIdx === 2 && dIdx % 2 === 0;

            return (
              <div
                key={day}
                className={`rounded-2xl border p-1.5 sm:p-2 transition-all duration-500 min-h-[210px] sm:min-h-[230px] flex flex-col ${
                  isChaosMode
                    ? 'bg-rose-950/20 border-rose-500/25'
                    : isPhaseHighlight
                    ? 'bg-slate-900/90 border-[#46b1e1]/30'
                    : 'bg-slate-900/75 border-slate-800/90'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/90 px-0.5">
                  <span className="text-[9px] sm:text-[10px] font-[900] tracking-wider text-slate-300">
                    {day}
                  </span>
                  <Calendar className="w-2.5 h-2.5 text-slate-600" />
                </div>

                {/* Animated Stage Cards */}
                <div className="space-y-1.5 flex-1">
                  {blocks.map((block, bIdx) => {
                    const isSelfHovered = hoveredBlock?.id === block.id;
                    const matchesHoveredBlock =
                      hoveredBlock &&
                      (hoveredBlock.pipeline === block.pipeline ||
                        hoveredBlock.batchGroup === block.batchGroup);
                    const matchesZone = hoveredZone === block.zoneName;
                    const matchesPipe = hoveredPipeline === block.pipeline;

                    const hasActiveFilter = Boolean(
                      hoveredBlock || hoveredZone || hoveredPipeline
                    );
                    const isHighlighted =
                      isSelfHovered || matchesHoveredBlock || matchesZone || matchesPipe;

                    return (
                      <div
                        key={block.id}
                        onMouseEnter={() => setHoveredBlock(block)}
                        onMouseLeave={() => setHoveredBlock(null)}
                        style={{
                          animationDelay: `${(dIdx * 2 + bIdx) * 0.25}s`,
                          borderLeft: `3px solid ${isChaosMode ? '#f43f5e' : block.zoneColor}`,
                        }}
                        className={`relative rounded-xl border p-1.5 transition-all duration-300 cursor-pointer ${
                          isChaosMode
                            ? `bg-slate-950/90 border-rose-500/40 ${block.chaosRotate} ${block.chaosShift}`
                            : isHighlighted
                            ? 'bg-slate-800/95 border-[#46b1e1] scale-[1.04] shadow-[0_0_22px_rgba(70,177,225,0.42)] z-20'
                            : hasActiveFilter
                            ? 'bg-slate-950/60 border-slate-800/60 opacity-35'
                            : 'bg-slate-950/85 border-slate-800/90 hover:border-[#46b1e1] animate-pws-float'
                        }`}
                      >
                        {/* Pipeline + Stage */}
                        <div className="flex items-center justify-between gap-1 text-[8px] font-bold text-slate-400">
                          <span className="inline-flex items-center gap-0.5 text-slate-300 truncate">
                            {renderPipeIcon(block.pipelineIcon)}
                            <span className="hidden sm:inline">{block.pipeline}</span>
                          </span>
                          <span
                            className={`px-1 py-0.2 rounded text-[7.5px] font-extrabold ${
                              isChaosMode
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-[#46b1e1]/15 text-[#38bdf8]'
                            }`}
                          >
                            {isChaosMode ? 'RUSH' : block.weekLabel.replace('Week ', '')}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-1">
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-white"
                            style={{
                              backgroundColor: isChaosMode ? '#e11d48' : block.zoneColor,
                            }}
                          >
                            {renderStageIcon(block.stageIcon)}
                          </span>
                          <span className="text-[9.5px] sm:text-[10.5px] font-extrabold text-white leading-tight break-words">
                            {block.stage}
                          </span>
                        </div>

                        {/* Time / Batching Tag */}
                        <div className="mt-1 flex items-center justify-between text-[8px] font-semibold">
                          <span className="text-slate-400 tabular-nums">{block.duration}</span>
                          {isChaosMode ? (
                            <span className="text-rose-400 font-bold truncate max-w-[60px]">
                              {block.chaosWastedSetup}
                            </span>
                          ) : block.batchTag && phaseIdx >= 1 ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-400 font-extrabold">
                              <Zap className="w-2 h-2" />
                              <span className="hidden sm:inline">Batched</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM LIVE HUD & INTERACTIVE INSPECTOR */}
        <div className="relative z-10 rounded-2xl bg-slate-900/95 border border-slate-800 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
          {hoveredBlock ? (
            <div className="flex items-center gap-2 text-sky-300 font-semibold animate-in fade-in">
              <Zap className="w-3.5 h-3.5 text-[#46b1e1] shrink-0" />
              <span>
                <strong className="text-white">
                  {hoveredBlock.pipeline} · {hoveredBlock.stage}
                </strong>{' '}
                in {hoveredBlock.zoneName} ({hoveredBlock.weekLabel}) — saves{' '}
                <strong className="text-emerald-400">
                  {hoveredBlock.setupSavedMins}m
                </strong>{' '}
                setup via batching
              </span>
            </div>
          ) : hoveredZone ? (
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#46b1e1] shrink-0" />
              <span>
                Showing <strong className="text-white">{hoveredZone} Zone</strong> blocks across your Pinned Week
              </span>
            </div>
          ) : isChaosMode ? (
            <div className="flex items-center justify-between w-full gap-2">
              <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>2h 45m setup wasted · Same-week upload panic</span>
              </span>
              <button
                type="button"
                onClick={() => setIsChaosMode(false)}
                className="text-[10px] font-extrabold text-[#46b1e1] hover:underline shrink-0"
              >
                Auto-Solve with PWS →
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between w-full gap-3">
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Setup Saved: 1h 25m/wk</span>
              </span>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                <span>
                  Output: <strong className="text-white">4 Videos / wk</strong>
                </span>
                <span>•</span>
                <span>
                  Lead Buffer: <strong className="text-[#46b1e1]">Week N-4 → N-1</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
