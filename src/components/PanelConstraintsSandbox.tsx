'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { usePwsStore } from '../store/usePwsStore';
import { formatDuration } from '../lib/timeUtils';
import { getPipelineIconComponent, getStageIconComponent } from '../lib/creatorIcons';
import type { ContentType, WorkflowTaskConfig } from '../types/pws';

interface ZoneTaskSummaryItem {
  key: string;
  contentTypeId: string;
  contentTypeName: string;
  contentTypeIcon?: string;
  taskId: string;
  taskName: string;
  taskIcon?: string;
  unitsScheduled: number;
  workMinutes: number;
  setupMinutes: number;
  isBatchedOrChained: boolean;
}

interface ZoneCalculationBreakdown {
  items: ZoneTaskSummaryItem[];
  savedSetupMinutes: number;
  unscheduledForZoneCount: number;
}

const SETUP_STRIPE_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #0f172a, #0f172a 4px, #334155 4px, #334155 7px)',
};

export const PanelConstraintsSandbox: React.FC = () => {
  const {
    contentTypes,
    zones,
    batchingGroups,
    solverResult,
    setTargetWeeklyUnits,
    resetToMinConstraints,
  } = usePwsStore();

  const {
    status,
    scheduledBlocks,
    unscheduledTasks,
    batchingMetrics,
    totalSlackMinutes,
    surplusOptions,
    zoneUtilizations,
    swapsExecuted,
  } = solverResult;

  const [hoveredCtId, setHoveredCtId] = useState<string | null>(null);

  // Totals across all zones for top summary
  const totalAvailableMinutes = useMemo(
    () => zoneUtilizations.reduce((sum, z) => sum + z.totalAvailableMinutes, 0),
    [zoneUtilizations]
  );
  const totalAllocatedMinutes = useMemo(
    () => zoneUtilizations.reduce((sum, z) => sum + z.totalAllocatedMinutes, 0),
    [zoneUtilizations]
  );
  const overallUtilPercent =
    totalAvailableMinutes > 0
      ? Math.round((totalAllocatedMinutes / totalAvailableMinutes) * 100)
      : 0;

  // Lookup maps for icons & setup buffers
  const ctMap = useMemo(
    () => new Map(contentTypes.map((ct) => [ct.id, ct])),
    [contentTypes]
  );
  const taskMap = useMemo(() => {
    const map = new Map<string, WorkflowTaskConfig>();
    for (const ct of contentTypes) {
      for (const t of ct.tasks) map.set(t.id, t);
    }
    return map;
  }, [contentTypes]);
  const batchGroupMap = useMemo(
    () => new Map(batchingGroups.map((g) => [g.id, g])),
    [batchingGroups]
  );

  // Per-zone exact calculation breakdown derived directly from scheduledBlocks
  const zoneBreakdowns = useMemo(() => {
    const map = new Map<string, ZoneCalculationBreakdown>();

    for (const z of zones) {
      const zBlocks = scheduledBlocks.filter((b) => b.zoneId === z.id);
      const itemMap = new Map<
        string,
        {
          summary: ZoneTaskSummaryItem;
          unitSet: Set<number>;
        }
      >();

      for (const block of zBlocks) {
        const key = `${block.contentTypeId}::${block.taskId}`;
        const ct = ctMap.get(block.contentTypeId);
        const taskCfg = taskMap.get(block.taskId);

        let entry = itemMap.get(key);
        if (!entry) {
          entry = {
            summary: {
              key,
              contentTypeId: block.contentTypeId,
              contentTypeName: block.contentTypeName,
              contentTypeIcon: ct?.icon,
              taskId: block.taskId,
              taskName: block.taskName,
              taskIcon: taskCfg?.icon,
              unitsScheduled: 0,
              workMinutes: 0,
              setupMinutes: 0,
              isBatchedOrChained: false,
            },
            unitSet: new Set<number>(),
          };
          itemMap.set(key, entry);
        }

        entry.summary.workMinutes += block.durationMins;
        entry.summary.setupMinutes += block.setupBufferMins;
        if (block.isContiguousBatch || block.isSharedGroupContinuation || block.unitCount > 1) {
          entry.summary.isBatchedOrChained = true;
        }
        for (const uIdx of block.unitIndices) {
          entry.unitSet.add(uIdx);
        }
      }

      let savedSetupMinutes = 0;
      const items: ZoneTaskSummaryItem[] = [];
      for (const entry of Array.from(itemMap.values())) {
        const units = entry.unitSet.size || 1;
        entry.summary.unitsScheduled = units;

        const taskCfg = taskMap.get(entry.summary.taskId);
        if (taskCfg) {
          const perUnitSetup =
            taskCfg.batchGroupId && batchGroupMap.has(taskCfg.batchGroupId)
              ? batchGroupMap.get(taskCfg.batchGroupId)!.setupBufferMins
              : taskCfg.setupBufferMins;
          const baseline = units * perUnitSetup;
          savedSetupMinutes += Math.max(0, baseline - entry.summary.setupMinutes);
        }

        items.push(entry.summary);
      }

      // Count any unscheduled tasks targeting this zone
      const unscheduledForZoneCount = unscheduledTasks.filter((u) => {
        const t = taskMap.get(u.taskId);
        return t?.eligibleZoneIds.includes(z.id);
      }).length;

      map.set(z.id, {
        items,
        savedSetupMinutes,
        unscheduledForZoneCount,
      });
    }

    return map;
  }, [zones, scheduledBlocks, unscheduledTasks, ctMap, taskMap, batchGroupMap]);

  // Compute per-pipeline per-zone footprint for 1 unit (pure work time)
  const getPipelineZoneFootprint = (ct: ContentType) => {
    const byZone = new Map<string, number>();
    let workMinsPerUnit = 0;

    for (const t of ct.tasks) {
      workMinsPerUnit += t.durationMins;
      if (t.eligibleZoneIds.length === 1) {
        const zId = t.eligibleZoneIds[0];
        byZone.set(zId, (byZone.get(zId) || 0) + t.durationMins);
      }
    }

    // Also include flexible multi-zone primary zone hint if needed
    const flexibleMins = ct.tasks
      .filter((t) => t.eligibleZoneIds.length > 1)
      .reduce((acc, t) => acc + t.durationMins, 0);

    return {
      workMinsPerUnit,
      pinnedZones: Array.from(byZone.entries()).map(([zoneId, mins]) => ({
        zoneId,
        zone: zones.find((z) => z.id === zoneId),
        mins,
      })),
      flexibleMins,
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-glow p-4 sm:p-6 mb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <h2 className="text-lg font-[900] text-slate-900 tracking-tight">
              Step 3: Weekly Capacity &amp; Output Simulator
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Set how many pieces you can publish weekly. Auto-batching shares setups automatically and locks when a zone hits capacity.
          </p>
        </div>

        <button
          onClick={resetToMinConstraints}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition shadow-xs self-start sm:self-auto"
          title="Reset all pipelines to baseline minimum weekly units"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Baseline</span>
        </button>
      </div>

      {/* Top Status & Weekly Capacity Summary Strip */}
      <div className="my-5 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Indicator */}
          <div className="flex items-start sm:items-center gap-3">
            {status === 'OPTIMAL_FIT' && (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {status === 'SWAP_APPLIED' && (
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#46b1e1] flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
            )}
            {status === 'CAPACITY_EXCEEDED' && (
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                    status === 'OPTIMAL_FIT'
                      ? 'bg-emerald-500 text-white'
                      : status === 'SWAP_APPLIED'
                      ? 'bg-[#0c1527] text-[#46b1e1]'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {status === 'OPTIMAL_FIT' && 'Schedule Fits'}
                  {status === 'SWAP_APPLIED' && 'Auto-Balanced Across Zones'}
                  {status === 'CAPACITY_EXCEEDED' && 'Over Capacity — Action Needed'}
                </span>
              </div>

              <p className="text-xs text-slate-700 font-medium mt-1 leading-snug">
                {status === 'OPTIMAL_FIT' &&
                  'Every pipeline fits within your Step 1 work zones with healthy buffer remaining.'}
                {status === 'SWAP_APPLIED' &&
                  `Flexible tasks automatically shifted between eligible zones (${swapsExecuted.length} smart move${
                    swapsExecuted.length === 1 ? '' : 's'
                  }) to fit your targets.`}
                {status === 'CAPACITY_EXCEEDED' &&
                  'Your current targets exceed available Step 1 time. Reduce output using − below, or add more hours in Step 1.'}
              </p>
            </div>
          </div>

          {/* 3 Clean Summary Counters */}
          <div className="grid grid-cols-3 gap-2.5 sm:flex sm:items-center text-xs shrink-0">
            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Booked / Total
              </span>
              <span className="text-sm font-[900] text-slate-900 tabular-nums">
                {formatDuration(totalAllocatedMinutes)}
                <span className="text-[11px] font-semibold text-slate-400">
                  {' '}
                  / {formatDuration(totalAvailableMinutes)}
                </span>
              </span>
              <span className="block text-[10px] font-bold text-slate-500 tabular-nums">
                {overallUtilPercent}% used
              </span>
            </div>

            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Batching Saved
              </span>
              <span className="text-sm font-[900] text-emerald-600 tabular-nums inline-flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {formatDuration(batchingMetrics.totalSetupMinutesSaved)}
              </span>
              <span className="block text-[10px] font-semibold text-slate-400">
                auto-amortized
              </span>
            </div>

            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Free Buffer
              </span>
              <span className="text-sm font-[900] text-slate-800 tabular-nums">
                {formatDuration(totalSlackMinutes)}
              </span>
              <span className="block text-[10px] font-semibold text-slate-400">
                open time
              </span>
            </div>
          </div>
        </div>

        {/* Plain-English Smart Swap Note (only when flexible tasks shifted zones) */}
        {swapsExecuted.length > 0 && status !== 'CAPACITY_EXCEEDED' && (
          <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="font-bold text-slate-700 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#46b1e1]" />
              Flexible relocations:
            </span>
            {swapsExecuted.map((sw, idx) => {
              const fromName = zones.find((z) => z.id === sw.fromZoneId)?.name || sw.fromZoneId;
              const toName = zones.find((z) => z.id === sw.toZoneId)?.name || sw.toZoneId;
              return (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium"
                >
                  <strong>{sw.displacedTaskName}</strong>: {fromName} → {toName}
                </span>
              );
            })}
          </div>
        )}

        {/* Unscheduled Tasks Alert List (only when overloaded) */}
        {status === 'CAPACITY_EXCEEDED' && unscheduledTasks.length > 0 && (
          <div className="pt-2.5 border-t border-rose-200/70 space-y-1.5">
            <div className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">
              Stages Not Fitting Right Now:
            </div>
            <div className="flex flex-wrap gap-2">
              {unscheduledTasks.map((u, idx) => (
                <div
                  key={`${u.taskId}-${u.unitIndex}-${idx}`}
                  className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-1.5"
                >
                  <span>
                    {u.contentTypeName}: <strong>{u.taskName}</strong> (Unit #{u.unitIndex + 1},{' '}
                    {formatDuration(u.missingMinutes)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Smartphone Sticky Mini Zone Bar (< lg) */}
      <div className="lg:hidden sticky top-[62px] z-20 -mx-1 px-3 py-2.5 mb-5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
          Live Zone Fill
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {zoneUtilizations.map((zUtil) => {
            const zone = zones.find((z) => z.id === zUtil.zoneId);
            const pct = Math.min(100, Math.round(zUtil.utilizationPercent));
            return (
              <div key={zUtil.zoneId} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="truncate text-slate-800">{zUtil.zoneName}</span>
                  <span
                    className={`tabular-nums ${
                      pct >= 95 ? 'text-rose-600' : 'text-slate-600'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: zone?.color || '#0c1527',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 cols): Content Volume Dials with Strict Capacity Lock */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              1. Weekly Content Volume
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              Auto-locked at zone limit
            </span>
          </div>

          {contentTypes.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
              No content pipelines configured yet. Add one in Step 2.
            </div>
          ) : (
            <div className="space-y-3">
              {contentTypes.map((ct) => {
                const surplus = surplusOptions.find((s) => s.contentTypeId === ct.id);
                const additionalUnits = surplus?.additionalUnits ?? 0;
                const isOverloadedSchedule = status === 'CAPACITY_EXCEEDED';
                const hasOwnUnscheduled = unscheduledTasks.some(
                  (u) => u.contentTypeId === ct.id
                );

                // Strict capacity lock: cannot increase past ceiling or while overloaded
                const canIncrease = !isOverloadedSchedule && additionalUnits > 0;
                const maxAllowedUnits = canIncrease
                  ? ct.targetWeeklyUnits + additionalUnits
                  : ct.targetWeeklyUnits;

                const footprint = getPipelineZoneFootprint(ct);
                const PipeIcon = getPipelineIconComponent(ct.icon);
                const isHovered = hoveredCtId === ct.id;

                return (
                  <div
                    key={ct.id}
                    onMouseEnter={() => setHoveredCtId(ct.id)}
                    onMouseLeave={() => setHoveredCtId(null)}
                    className={`p-4 rounded-2xl border bg-white transition-all space-y-3 ${
                      hasOwnUnscheduled
                        ? 'border-rose-300 ring-2 ring-rose-100'
                        : isHovered
                        ? 'border-[#46b1e1] shadow-md'
                        : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Pipeline Identity & Stepper Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <PipeIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 truncate">
                            {ct.name}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            {formatDuration(footprint.workMinsPerUnit)} work / unit •{' '}
                            {ct.tasks.length} stage{ct.tasks.length === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>

                      {/* - [X / wk] + Tactile Stepper */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setTargetWeeklyUnits(ct.id, Math.max(0, ct.targetWeeklyUnits - 1))
                          }
                          disabled={ct.targetWeeklyUnits <= 0}
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold flex items-center justify-center transition active:scale-95"
                          title="Decrease weekly units"
                          aria-label={`Decrease ${ct.name} weekly units`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span
                          className={`min-w-[60px] text-center px-2.5 py-1.5 rounded-xl font-[900] text-xs tabular-nums ${
                            hasOwnUnscheduled
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
                          {ct.targetWeeklyUnits} /wk
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            if (!canIncrease) return;
                            setTargetWeeklyUnits(
                              ct.id,
                              Math.min(maxAllowedUnits, ct.targetWeeklyUnits + 1)
                            );
                          }}
                          disabled={!canIncrease}
                          className={`w-8 h-8 rounded-xl border font-bold flex items-center justify-center transition ${
                            canIncrease
                              ? 'border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-[#46b1e1] text-slate-800 active:scale-95'
                              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          title={
                            canIncrease
                              ? `Add 1 unit (up to ${maxAllowedUnits}/wk)`
                              : surplus?.limitingReason || 'Zone capacity reached'
                          }
                          aria-label={`Increase ${ct.name} weekly units`}
                        >
                          {canIncrease ? (
                            <Plus className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Zone Footprint Pills (1 unit cost per zone) */}
                    {(footprint.pinnedZones.length > 0 || footprint.flexibleMins > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {footprint.pinnedZones.map(({ zoneId, zone, mins }) => (
                          <span
                            key={zoneId}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] font-bold text-slate-600"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: zone?.color || '#94a3b8' }}
                            />
                            <span>{zone?.name || 'Zone'}:</span>
                            <span className="text-slate-900 tabular-nums">
                              {formatDuration(mins)}
                            </span>
                          </span>
                        ))}
                        {footprint.flexibleMins > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] font-bold text-slate-500">
                            <span>Flex Zones:</span>
                            <span className="text-slate-800 tabular-nums">
                              {formatDuration(footprint.flexibleMins)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Capped Range Slider */}
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, maxAllowedUnits)}
                        step={1}
                        disabled={maxAllowedUnits === 0 && ct.targetWeeklyUnits === 0}
                        value={ct.targetWeeklyUnits}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          const clamped = Math.max(0, Math.min(maxAllowedUnits, raw));
                          setTargetWeeklyUnits(ct.id, clamped);
                        }}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#46b1e1] disabled:opacity-50 disabled:cursor-not-allowed"
                      />

                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-slate-400">0</span>

                        {/* Live Headroom / Lock Status */}
                        {hasOwnUnscheduled ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Overloaded — click − to fit</span>
                          </span>
                        ) : canIncrease ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            Can fit +{additionalUnits} more (Max {maxAllowedUnits}/wk)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            <Lock className="w-2.5 h-2.5" />
                            <span>
                              {surplus?.limitingReason || 'At max capacity'}
                            </span>
                          </span>
                        )}

                        <span className="text-slate-500 font-bold tabular-nums">
                          Max {maxAllowedUnits}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (7 cols): Zone Utilization & Calculation Breakdowns */}
        <div className="lg:col-span-7 space-y-3.5 lg:sticky lg:top-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              2. Zone Capacity &amp; Math Breakdown
            </h3>

            {/* Accurate 3-Item Legend matching actual progress bars */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#46b1e1]" />
                Task Work (Zone Color)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={SETUP_STRIPE_STYLE} />
                Setup Time
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-200" />
                Free Buffer
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            {zoneUtilizations.map((zUtil) => {
              const zone = zones.find((z) => z.id === zUtil.zoneId);
              const zoneColor = zone?.color || '#0c1527';
              const breakdown = zoneBreakdowns.get(zUtil.zoneId);
              const totalAvail = zUtil.totalAvailableMinutes;
              const safeDenom = Math.max(1, totalAvail);

              const rawTaskPct = (zUtil.taskDurationMinutes / safeDenom) * 100;
              const rawSetupPct = (zUtil.setupBufferMinutes / safeDenom) * 100;
              const taskPct = totalAvail > 0 ? Math.min(100, rawTaskPct) : 0;
              const setupPct =
                totalAvail > 0 ? Math.min(100 - taskPct, rawSetupPct) : 0;

              const hasSavedSetup = (breakdown?.savedSetupMinutes ?? 0) > 0;
              const isZoneOverloaded = (breakdown?.unscheduledForZoneCount ?? 0) > 0;
              const isNearFull = zUtil.utilizationPercent >= 85;

              return (
                <div
                  key={zUtil.zoneId}
                  className={`p-4 rounded-2xl border bg-white transition-all space-y-3 ${
                    isZoneOverloaded
                      ? 'border-rose-300 ring-2 ring-rose-100/70'
                      : 'border-slate-200/90 shadow-xs'
                  }`}
                >
                  {/* Zone Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-xs"
                        style={{ backgroundColor: zoneColor }}
                      />
                      <span className="text-sm font-extrabold text-slate-900 truncate">
                        {zUtil.zoneName}
                      </span>

                      {isZoneOverloaded ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                          Overloaded
                        </span>
                      ) : zUtil.isBottleneck || isNearFull ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                          Limiting Zone
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 text-xs tabular-nums">
                      <span className="font-bold text-slate-800">
                        {formatDuration(zUtil.totalAllocatedMinutes)}
                        <span className="text-slate-400 font-semibold">
                          {' '}
                          / {formatDuration(totalAvail)}
                        </span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                          isZoneOverloaded
                            ? 'bg-rose-100 text-rose-700'
                            : isNearFull
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {Math.round(zUtil.utilizationPercent)}%
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        ({formatDuration(zUtil.remainingFreeMinutes)} free)
                      </span>
                    </div>
                  </div>

                  {/* Distinct 2-Tone Progress Bar (Zone Color Work + Striped Setup + Free Gray) */}
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/60">
                    {taskPct > 0 && (
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${taskPct}%`,
                          backgroundColor: zoneColor,
                        }}
                        title={`Task Work: ${formatDuration(zUtil.taskDurationMinutes)}`}
                      />
                    )}
                    {setupPct > 0 && (
                      <div
                        className="h-full transition-all duration-300 min-w-[5px] border-l border-white/60"
                        style={{
                          width: `${setupPct}%`,
                          ...SETUP_STRIPE_STYLE,
                        }}
                        title={`Setup Overhead: ${formatDuration(zUtil.setupBufferMinutes)}`}
                      />
                    )}
                  </div>

                  {/* Minimal-Text Calculation Breakdown Box */}
                  <div className="rounded-xl bg-slate-50/90 border border-slate-200/70 px-3 py-2.5 space-y-2">
                    {totalAvail === 0 ? (
                      <div className="text-[11px] font-medium text-slate-500">
                        No hours scheduled in Step 1 for this zone yet.
                      </div>
                    ) : zUtil.totalAllocatedMinutes === 0 ? (
                      <div className="text-[11px] font-medium text-slate-500">
                        0m booked — Full <strong>{formatDuration(totalAvail)}</strong> free.
                      </div>
                    ) : (
                      <>
                        {/* Equation Summary Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex flex-wrap items-center gap-1.5 text-slate-700 font-semibold tabular-nums">
                            <span>
                              Work{' '}
                              <strong className="text-slate-900">
                                {formatDuration(zUtil.taskDurationMinutes)}
                              </strong>
                            </span>
                            <span className="text-slate-400">+</span>
                            <span>
                              Setup{' '}
                              <strong className="text-slate-900">
                                {formatDuration(zUtil.setupBufferMinutes)}
                              </strong>
                            </span>
                            <span className="text-slate-400">=</span>
                            <span className="font-extrabold text-slate-900">
                              {formatDuration(zUtil.totalAllocatedMinutes)} used
                            </span>
                          </div>

                          {hasSavedSetup && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-bold text-[10px]">
                              <Zap className="w-3 h-3" />
                              Saved {formatDuration(breakdown!.savedSetupMinutes)} batched
                            </span>
                          )}
                        </div>

                        {/* Visual Task Pills Equation */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {breakdown?.items.map((item, idx) => {
                            const PipeIcon = getPipelineIconComponent(item.contentTypeIcon);
                            const StageIcon = getStageIconComponent(item.taskIcon, item.taskName);
                            const isHighlighted =
                              hoveredCtId === null || hoveredCtId === item.contentTypeId;

                            return (
                              <React.Fragment key={item.key}>
                                {idx > 0 && (
                                  <span className="text-[10px] font-bold text-slate-400">
                                    +
                                  </span>
                                )}
                                <div
                                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all ${
                                    hoveredCtId === item.contentTypeId
                                      ? 'bg-sky-50 border-[#46b1e1] text-slate-900 shadow-xs'
                                      : isHighlighted
                                      ? 'bg-white border-slate-200 text-slate-700'
                                      : 'bg-white/50 border-slate-200/60 text-slate-400 opacity-55'
                                  }`}
                                >
                                  <span className="w-4 h-4 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                                    <PipeIcon className="w-2.5 h-2.5" />
                                  </span>
                                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                                    <StageIcon className="w-2.5 h-2.5" />
                                  </span>
                                  <span className="font-semibold truncate max-w-[140px]">
                                    {item.taskName}
                                  </span>
                                  <span className="text-slate-400 font-bold">
                                    ×{item.unitsScheduled}
                                  </span>
                                  <span className="font-extrabold text-slate-900 tabular-nums">
                                    {formatDuration(item.workMinutes)}
                                  </span>
                                </div>
                              </React.Fragment>
                            );
                          })}

                          {zUtil.setupBufferMinutes > 0 && (
                            <>
                              <span className="text-[10px] font-bold text-slate-400">+</span>
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold tabular-nums">
                                <span
                                  className="w-2.5 h-2.5 rounded-sm border border-white/40"
                                  style={SETUP_STRIPE_STYLE}
                                />
                                <span>Setup {formatDuration(zUtil.setupBufferMinutes)}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
