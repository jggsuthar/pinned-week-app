'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Download,
  ExternalLink,
  Globe,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jaiminAvatarImg from '../../Assets/my pic1.png';
import { usePwsStore } from '../store/usePwsStore';
import { DAYS_OF_WEEK, DayOfWeek, ScheduledTaskBlock } from '../types/pws';
import { formatDayName, formatDuration } from '../lib/timeUtils';
import { getPipelineIconComponent, getStageIconComponent } from '../lib/creatorIcons';

/**
 * Formats work + setup concisely: "1h + 10m setup" or "1h" when setup is 0.
 */
function formatCompactBlockTime(durationMins: number, setupBufferMins: number): string {
  const workStr = formatDuration(durationMins);
  if (setupBufferMins > 0) {
    return `${workStr} + ${setupBufferMins}m setup`;
  }
  return workStr;
}

/**
 * Picks high-contrast text color (#0f172a or #ffffff) against any Zone hex color.
 */
function getContrastTextColor(hexColor: string): string {
  const clean = hexColor.replace('#', '');
  if (clean.length !== 6) return '#ffffff';
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.65 ? '#0f172a' : '#ffffff';
}

export const MasterTimetableExportStudio: React.FC = () => {
  const { zones, calendarSlots, contentTypes, solverResult } = usePwsStore();

  const [viewMode, setViewMode] = useState<'GRID' | 'CHECKLIST'>('GRID');
  const [isExporting, setIsExporting] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const printableRef = useRef<HTMLDivElement>(null);

  const { scheduledBlocks, batchingMetrics, totalSlackMinutes } = solverResult;

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Lookup maps for Zone colors, Pipeline icons, and Stage icons
  const zoneMap = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const ctMap = useMemo(
    () => new Map(contentTypes.map((ct) => [ct.id, ct])),
    [contentTypes]
  );
  const taskIconMap = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const ct of contentTypes) {
      for (const t of ct.tasks) map.set(t.id, t.icon);
    }
    return map;
  }, [contentTypes]);

  // Zone totals for header legend
  const zoneTotalHoursMap = useMemo(() => {
    const totals = new Map<string, number>();
    for (const slot of calendarSlots) {
      totals.set(
        slot.zoneId,
        (totals.get(slot.zoneId) || 0) + (slot.endMinute - slot.startMinute)
      );
    }
    return totals;
  }, [calendarSlots]);

  // Checklist completion metrics
  const completedCount = useMemo(
    () => scheduledBlocks.filter((b) => checkedItems[b.id]).length,
    [scheduledBlocks, checkedItems]
  );
  const completionPct =
    scheduledBlocks.length > 0
      ? Math.round((completedCount / scheduledBlocks.length) * 100)
      : 0;

  // Export to PNG (2x High-DPI)
  const handleExportPng = useCallback(async () => {
    if (!printableRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(printableRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `pinned-week-${viewMode === 'GRID' ? 'poster' : 'checklist'}-${new Date()
        .toISOString()
        .slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Error generating PNG export. Please check browser console.');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, viewMode]);

  // Listen for bottom WizardFooter "DOWNLOAD PNG" CTA click
  useEffect(() => {
    const onDownloadEvent = () => {
      handleExportPng();
    };
    window.addEventListener('pws-download-png', onDownloadEvent);
    return () => {
      window.removeEventListener('pws-download-png', onDownloadEvent);
    };
  }, [handleExportPng]);

  // Group scheduled blocks by Day
  const blocksByDay = useMemo(
    () =>
      DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day] = scheduledBlocks
          .filter((b) => b.day === day)
          .sort((a, b) => a.startMinute - b.startMinute);
        return acc;
      }, {} as Record<DayOfWeek, ScheduledTaskBlock[]>),
    [scheduledBlocks]
  );

  // Group calendar slots by Day
  const slotsByDay = useMemo(
    () =>
      DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day] = calendarSlots
          .filter((s) => s.day === day)
          .sort((a, b) => a.startMinute - b.startMinute);
        return acc;
      }, {} as Record<DayOfWeek, typeof calendarSlots>),
    [calendarSlots]
  );

  // Max cohort depth across active pipelines for compact Steady-State Loop strip
  const maxStages = useMemo(
    () => Math.min(5, Math.max(3, ...contentTypes.map((ct) => ct.tasks.length || 0))),
    [contentTypes]
  );

  const loopSteps = useMemo(() => {
    const labels: Record<number, string> = {
      1: 'Publish Ready',
      2: 'Edit & Polish',
      3: 'Shoot / Record',
      4: 'Script & Ideate',
      5: 'Research & Plan',
    };
    const steps: { offset: number; label: string }[] = [];
    for (let offset = maxStages; offset >= 1; offset--) {
      steps.push({
        offset,
        label: labels[offset] || `Stage ${maxStages - offset + 1}`,
      });
    }
    return steps;
  }, [maxStages]);

  return (
    <div className="w-full space-y-6 mb-24">
      {/* Studio Toolbar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-glow p-4 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#46b1e1]" />
            <h2 className="text-lg font-[900] text-slate-900 tracking-tight">
              Step 4: Pinned Week Poster &amp; Weekly Checklist
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Switch between your Pinned Week Poster and Weekly Checklist, or download as a high-res PNG.
          </p>
        </div>

        {/* View Switcher & PNG Download CTA */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/70">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'GRID'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#46b1e1]" />
              <span>Pinned Week Poster</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CHECKLIST')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'CHECKLIST'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Weekly Checklist</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c1527] hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm disabled:opacity-60 ml-auto sm:ml-0"
            title="Download high-resolution PNG"
          >
            <Download className="w-3.5 h-3.5 text-[#46b1e1]" />
            <span>{isExporting ? 'Downloading...' : 'Download PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Exportable Container */}
      <div
        ref={printableRef}
        id="printable-timetable-area"
        className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-3 sm:p-5 space-y-5"
      >
        {/* Poster Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-5 border-b border-slate-100 gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0c1527] text-white text-[10px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#46b1e1]" />
              <span>
                {viewMode === 'GRID'
                  ? 'PINNED WEEK MASTER POSTER'
                  : 'WEEKLY EXECUTION CHECKLIST'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-[900] text-[#0a0f1d] tracking-tight">
              {viewMode === 'GRID' ? (
                <>
                  Pinned <span className="text-[#46b1e1]">Week</span> Timetable
                </>
              ) : (
                <>
                  Weekly <span className="text-[#46b1e1]">Action</span> Checklist
                </>
              )}
            </h1>

            {/* Color-Coded Work Zones Legend */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {zones.map((z) => {
                const zMins = zoneTotalHoursMap.get(z.id) || 0;
                return (
                  <span
                    key={z.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-bold text-slate-700"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: z.color }}
                    />
                    <span>{z.name}</span>
                    {zMins > 0 && (
                      <span className="text-slate-400 font-semibold tabular-nums">
                        ({formatDuration(zMins)})
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right Summary Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800">
              {scheduledBlocks.length} Sessions
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200/70 font-bold text-sky-900">
              {formatDuration(batchingMetrics.totalSetupMinutesSaved)} Setup Saved
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 font-bold text-emerald-800">
              {formatDuration(totalSlackMinutes)} Free Buffer
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: PINNED WEEK POSTER (7-DAY TIME GRID)                   */}
        {/* ============================================================== */}
        {viewMode === 'GRID' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-px bg-slate-200 rounded-2xl border border-slate-200 overflow-hidden">
              {DAYS_OF_WEEK.map((day, dayIdx) => {
                const dayBlocks = blocksByDay[day] || [];
                const daySlots = slotsByDay[day] || [];
                const totalDayMinutes = daySlots.reduce(
                  (sum, s) => sum + (s.endMinute - s.startMinute),
                  0
                );
                const totalWorkMinutes = dayBlocks.reduce(
                  (sum, b) => sum + b.totalBlockMins,
                  0
                );
                const freeSlackMins = Math.max(0, totalDayMinutes - totalWorkMinutes);

                // Zone-wise Free Slack Bifurcation for this day
                const zoneSlacks = zones
                  .map((z) => {
                    const avail = daySlots
                      .filter((s) => s.zoneId === z.id)
                      .reduce((sum, s) => sum + (s.endMinute - s.startMinute), 0);
                    if (avail === 0) return null;
                    const used = dayBlocks
                      .filter((b) => b.zoneId === z.id)
                      .reduce((sum, b) => sum + b.totalBlockMins, 0);
                    const free = Math.max(0, avail - used);
                    return { zone: z, free, avail };
                  })
                  .filter(
                    (item): item is { zone: (typeof zones)[number]; free: number; avail: number } =>
                      Boolean(item && item.free > 0)
                  );

                return (
                  <div
                    key={day}
                    className={`${
                      dayIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    } px-1.5 py-2.5 flex flex-col h-full min-h-[360px]`}
                  >
                    {/* Day Column Header */}
                    <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-slate-200/80 gap-1">
                      <div className="min-w-0">
                        <span className="text-xs font-[900] text-slate-900 uppercase tracking-wider block">
                          {day}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          {formatDayName(day)}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 tabular-nums shrink-0">
                        {formatDuration(totalDayMinutes)}
                      </span>
                    </div>

                    {/* Day Task Cards */}
                    <div className="space-y-1.5 flex-1">
                      {dayBlocks.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-center p-2 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                          <span>No scheduled blocks</span>
                          <span className="text-[10px] font-bold text-emerald-600 mt-1">
                            Rest / Overflow Day
                          </span>
                        </div>
                      ) : (
                        dayBlocks.map((block) => {
                          const zone = zoneMap.get(block.zoneId);
                          const zoneColor = zone?.color || '#46b1e1';
                          const zoneTextColor = getContrastTextColor(zoneColor);
                          const ct = ctMap.get(block.contentTypeId);
                          const PipeIcon = getPipelineIconComponent(ct?.icon);
                          const StageIcon = getStageIconComponent(
                            taskIconMap.get(block.taskId),
                            block.taskName
                          );
                          const weekOffset = Math.max(1, block.cohortOffset);

                          return (
                            <div
                              key={block.id}
                              className="flex items-stretch rounded-xl border border-slate-200/90 bg-white shadow-xs transition hover:shadow-md overflow-hidden min-h-[96px]"
                            >
                              {/* Left Edge Zone Strip with 90° Anti-Clockwise Zone Name */}
                              <div
                                className="w-[18px] shrink-0 flex items-center justify-center py-1.5 px-0.5 select-none"
                                style={{
                                  backgroundColor: zoneColor,
                                  color: zoneTextColor,
                                }}
                                title={zone?.name || 'Zone'}
                              >
                                <span
                                  className="text-[8px] font-[900] uppercase tracking-wide whitespace-nowrap leading-none"
                                  style={{
                                    writingMode: 'vertical-rl',
                                    transform: 'rotate(180deg)',
                                  }}
                                >
                                  {zone?.name || 'Zone'}
                                </span>
                              </div>

                              {/* Main Card Body */}
                              <div className="flex-1 min-w-0 px-2 py-2 space-y-1.5">
                                {/* Row 1: Rounded-Square Pipeline Icon + Content Pipe Label (no truncation) */}
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <span className="w-4 h-4 rounded bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                                    <PipeIcon className="w-2.5 h-2.5" />
                                  </span>
                                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 break-words leading-tight">
                                    {block.contentTypeName}
                                  </span>
                                </div>

                                {/* Row 2: Week N-n on its own row */}
                                <div>
                                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-sky-50 text-[#0c1527] text-[9px] font-extrabold border border-sky-200/70 tabular-nums">
                                    Week N-{weekOffset}
                                  </span>
                                </div>

                                {/* Row 3: Circular Stage Icon + Full Unclipped "{Stage_Name} ×N" */}
                                <div className="flex items-start gap-1.5 pt-0.5">
                                  <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white shadow-2xs mt-0.5"
                                    style={{ backgroundColor: zoneColor }}
                                  >
                                    <StageIcon className="w-3 h-3" />
                                  </span>
                                  <div className="text-[11.5px] font-extrabold text-slate-900 leading-snug break-words min-w-0 flex-1">
                                    {block.taskName}
                                    {block.unitCount > 1 && (
                                      <span className="whitespace-nowrap font-[900] text-[#0c1527]">
                                        &nbsp;×{block.unitCount}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Row 4: Compact Time Footer ("1h + 10m setup") */}
                                <div className="pt-1 border-t border-slate-100 flex items-center text-[10px]">
                                  <span className="font-bold text-slate-800 inline-flex items-center gap-1 tabular-nums leading-tight">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>
                                      {formatCompactBlockTime(
                                        block.durationMins,
                                        block.setupBufferMins
                                      )}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Zone-Wise Free Slack Bifurcation */}
                      {freeSlackMins > 0 && daySlots.length > 0 && (
                        <div className="p-2 rounded-xl border border-dashed border-slate-200 bg-white/90 space-y-1.5">
                          <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-500">
                            <span>Free Slack</span>
                            <span className="text-slate-800 font-extrabold tabular-nums">
                              {formatDuration(freeSlackMins)}
                            </span>
                          </div>
                          {zoneSlacks.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {zoneSlacks.map(({ zone, free }) => (
                                <span
                                  key={zone.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 text-[9px] font-semibold text-slate-600 tabular-nums"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: zone.color }}
                                  />
                                  <span>{zone.name}:</span>
                                  <strong className="text-slate-800">
                                    {formatDuration(free)}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compact Single-Bar Steady-State Loop Key (Poster View Only) */}
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-[900] uppercase tracking-wider text-slate-800">
                  Steady-State Loop:
                </span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  1-week lead per stage prevents same-week crunch
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {loopSteps.map((step, idx) => (
                  <React.Fragment key={step.offset}>
                    {idx > 0 && (
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 font-bold text-slate-800">
                      <span className="text-[#46b1e1] font-extrabold">
                        Week N-{step.offset}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 font-semibold">{step.label}</span>
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: WEEKLY CHECKLIST (VISUAL, MINIMALIST, +30% TYPOGRAPHY) */}
        {/* ============================================================== */}
        {viewMode === 'CHECKLIST' && (
          <div className="space-y-5 pt-1">
            {/* Checklist Progress Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/90">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums shrink-0">
                  {completedCount} / {scheduledBlocks.length} Done
                  <span className="ml-2 text-xs sm:text-sm font-bold text-[#46b1e1]">
                    ({completionPct}%)
                  </span>
                </div>
                <div className="flex-1 max-w-xs h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>

              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setCheckedItems({})}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Checks</span>
                </button>
              )}
            </div>

            {DAYS_OF_WEEK.map((day) => {
              const dayBlocks = blocksByDay[day] || [];
              if (dayBlocks.length === 0) return null;
              const dayDone = dayBlocks.filter((b) => checkedItems[b.id]).length;

              return (
                <div
                  key={day}
                  className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-slate-50/50 space-y-3.5"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-[#0c1527]" />
                      <h3 className="text-base sm:text-lg font-[900] text-slate-900 tracking-tight">
                        {formatDayName(day)}
                      </h3>
                    </div>
                    <span className="text-xs sm:text-sm text-slate-600 font-bold tabular-nums">
                      {dayDone}/{dayBlocks.length} completed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dayBlocks.map((block) => {
                      const isChecked = !!checkedItems[block.id];
                      const zone = zoneMap.get(block.zoneId);
                      const zoneColor = zone?.color || '#46b1e1';
                      const zoneTextColor = getContrastTextColor(zoneColor);
                      const ct = ctMap.get(block.contentTypeId);
                      const PipeIcon = getPipelineIconComponent(ct?.icon);
                      const StageIcon = getStageIconComponent(
                        taskIconMap.get(block.taskId),
                        block.taskName
                      );
                      const weekOffset = Math.max(1, block.cohortOffset);

                      return (
                        <div
                          key={block.id}
                          onClick={() => toggleCheck(block.id)}
                          className={`flex items-stretch rounded-xl border transition cursor-pointer overflow-hidden ${
                            isChecked
                              ? 'bg-slate-100/80 border-slate-300 opacity-60'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          {/* Left Edge Zone Strip with 90° Anti-Clockwise Zone Name */}
                          <div
                            className="w-6 shrink-0 flex items-center justify-center py-2 px-0.5 select-none"
                            style={{
                              backgroundColor: zoneColor,
                              color: zoneTextColor,
                            }}
                            title={zone?.name || 'Zone'}
                          >
                            <span
                              className="text-[8.5px] font-[900] uppercase tracking-wide whitespace-nowrap leading-none"
                              style={{
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)',
                              }}
                            >
                              {zone?.name || 'Zone'}
                            </span>
                          </div>

                          {/* Checklist Row Body (+30% larger fonts, zero whitespace bloat) */}
                          <div className="flex-1 min-w-0 p-4 flex items-center gap-3.5">
                            {/* Large Tactile Checkbox */}
                            <div
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
                                isChecked
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                            </div>

                            {/* Circular Stage Icon */}
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white shadow-2xs"
                              style={{ backgroundColor: zoneColor }}
                            >
                              <StageIcon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className={`text-base font-extrabold leading-tight break-words min-w-0 ${
                                    isChecked
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {block.taskName}
                                  {block.unitCount > 1 && (
                                    <span className="whitespace-nowrap">
                                      &nbsp;×{block.unitCount}
                                    </span>
                                  )}
                                </span>

                                <span className="text-xs sm:text-sm font-extrabold text-slate-800 tabular-nums shrink-0 inline-flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                                  <Clock className="w-3.5 h-3.5 text-[#46b1e1]" />
                                  <span>
                                    {formatCompactBlockTime(
                                      block.durationMins,
                                      block.setupBufferMins
                                    )}
                                  </span>
                                </span>
                              </div>

                              {/* Content Pipe label & Week N-n on separate clean pills */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs sm:text-[13px]">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-bold w-fit">
                                  <PipeIcon className="w-3.5 h-3.5" />
                                  <span>{block.contentTypeName}</span>
                                </span>

                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-sky-50 text-[#0c1527] font-extrabold border border-sky-200/80 w-fit">
                                  Week N-{weekOffset}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Exported PNG Footer Watermark */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-semibold">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="font-extrabold text-slate-800">
              Pinned Week System
            </span>
            <span className="text-slate-300">•</span>
            <span>Engineered by Jaimin Suthar</span>
            <span className="text-slate-300">•</span>
            <span className="text-[#46b1e1] font-bold">jaiminsuthar.com</span>
            <span className="text-slate-300">•</span>
            <span>YouTube @jaimin.youtube</span>
          </div>
          <div className="tabular-nums text-slate-400">
            Generated {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* JAIMIN SUTHAR BRAND CONVERSION SECTION (JS WEBSITE IDENTITY)   */}
      {/* ============================================================== */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-glow p-6 sm:p-8 lg:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7 pb-6 border-b border-slate-100">
          {/* 1:1 Portrait Photo from Assets/my pic1.png scaled to match text block height */}
          <div className="relative w-28 h-28 sm:w-40 sm:h-40 lg:w-44 lg:h-44 aspect-square rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm shrink-0 bg-slate-100">
            <Image
              src={jaiminAvatarImg}
              alt="Jaimin Suthar"
              fill
              sizes="(max-width: 640px) 112px, 176px"
              className="object-cover object-top"
            />
          </div>

          <div className="space-y-1.5 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#46b1e1]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>BUILT FOR PART-TIME CREATORS</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-[900] text-[#111111] tracking-tight leading-tight">
              Stop treating YouTube like a lottery.{' '}
              <span className="text-[#46b1e1]">Treat it like an engineering problem.</span>
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Hi, I&apos;m <strong className="text-slate-900">Jaimin Suthar</strong> — Engineer by Day, Creator by Night. I built this Pinned Week System to help part-time creators ship consistently alongside a demanding 9–5 without burning out.
            </p>
          </div>
        </div>

        {/* Two Brand CTA Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: jaiminsuthar.com */}
          <a
            href="https://jaiminsuthar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-slate-200/90 bg-[#f8fafc] hover:bg-white hover:border-[#46b1e1] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between gap-5"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200/70 text-[10px] font-extrabold uppercase tracking-wider text-sky-800">
                  <Globe className="w-3 h-3 text-[#46b1e1]" />
                  <span>Creator Media Hub</span>
                </span>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#46b1e1] transition-colors" />
              </div>

              <h4 className="text-lg sm:text-xl font-[900] text-slate-900 group-hover:text-[#46b1e1] transition-colors">
                Blueprints, Free Tools &amp; Frameworks on jaiminsuthar.com
              </h4>

              <p className="text-sm text-slate-600 leading-relaxed">
                Get written creator blueprints, interactive production tools, Creator Post frameworks, or book a 1-on-1 workflow &amp; bottleneck audit.
              </p>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#46b1e1] group-hover:bg-[#38bdf8] text-white text-xs font-extrabold uppercase tracking-wider shadow-xs transition">
                <span>Visit jaiminsuthar.com</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </a>

          {/* Card 2: YouTube @jaimin.youtube */}
          <a
            href="https://www.youtube.com/@jaimin.youtube"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-slate-200/90 bg-[#f8fafc] hover:bg-white hover:border-slate-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between gap-5"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200/70 text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span>YouTube Channel</span>
                </span>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>

              <h4 className="text-lg sm:text-xl font-[900] text-slate-900 transition-colors">
                Watch System Breakdowns on YouTube (@jaimin.youtube)
              </h4>

              <p className="text-sm text-slate-600 leading-relaxed">
                Deep-dive visual teardowns, creator workflow experiments, and real-world case studies engineered for consistent channel growth.
              </p>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c1527] group-hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider shadow-xs transition">
                <span>Subscribe to @jaimin.youtube</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#46b1e1] transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
};
