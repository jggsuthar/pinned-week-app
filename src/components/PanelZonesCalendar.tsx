'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Edit2,
  X,
  AlertTriangle,
  Layers,
  Check,
  Palette,
} from 'lucide-react';
import { usePwsStore } from '../store/usePwsStore';
import { CalendarSlot, DayOfWeek, DAYS_OF_WEEK, Zone } from '../types/pws';
import { formatDuration, formatDayName } from '../lib/timeUtils';
import { ColorPicker } from './ColorPicker';

const QUICK_DURATION_PRESETS = [30, 60, 90, 120, 180, 240];

export const PanelZonesCalendar: React.FC = () => {
  const {
    zoneMode,
    setZoneMode,
    zones,
    calendarSlots,
    addZone,
    updateZone,
    deleteZone,
    addContinuousBlock,
    resizeCalendarSlot,
    mergeCalendarSlots,
    deleteCalendarSlot,
    clearAllCalendarSlots,
  } = usePwsStore();

  // Zone Creation & Editing State
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneColor, setNewZoneColor] = useState('#46b1e1');

  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editZoneName, setEditZoneName] = useState('');
  const [editZoneColor, setEditZoneColor] = useState('#46b1e1');

  // Continuous Work Block Builder State (15-min chunks, no timestamps)
  const [isSlotBuilderOpen, setIsSlotBuilderOpen] = useState(false);
  const [builderZoneId, setBuilderZoneId] = useState<string>('');
  const [builderDurationMins, setBuilderDurationMins] = useState<number>(120);
  const [applyToDays, setApplyToDays] = useState<DayOfWeek[]>(['MON']);

  // Edit Continuous Block Modal State
  const [editingSlot, setEditingSlot] = useState<CalendarSlot | null>(null);
  const [editDurationMins, setEditDurationMins] = useState<number>(60);
  const [editSlotZoneId, setEditSlotZoneId] = useState<string>('');

  // Clear All Confirmation State
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Smartphone-specific State
  const [mobileActiveDay, setMobileActiveDay] = useState<DayOfWeek>('MON');
  const [isMobileAddSheetOpen, setIsMobileAddSheetOpen] = useState(false);

  // Keep builderZoneId strictly synchronized to a valid zone ID
  useEffect(() => {
    if (zones.length > 0) {
      if (!builderZoneId || !zones.some((z) => z.id === builderZoneId)) {
        setBuilderZoneId(zones[0].id);
      }
    } else {
      setBuilderZoneId('');
      setIsSlotBuilderOpen(false);
      setIsMobileAddSheetOpen(false);
    }
  }, [zones, builderZoneId]);

  const isSimpleMode = zoneMode === 'SIMPLE';
  const canAddWorkingSlot = isSimpleMode ? zones.length > 0 : zones.length > 0 && Boolean(builderZoneId);

  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    const newZone: Zone = {
      id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newZoneName.trim(),
      color: newZoneColor,
      icon: 'Layers',
    };
    addZone(newZone);
    setBuilderZoneId(newZone.id);
    setNewZoneName('');
    setNewZoneColor('#46b1e1');
    setIsAddingZone(false);
  };

  const openEditZone = (zone: Zone) => {
    setEditingZone(zone);
    setEditZoneName(zone.name);
    setEditZoneColor(zone.color);
    setIsAddingZone(false);
  };

  const handleSaveZoneEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone || !editZoneName.trim()) return;
    updateZone(editingZone.id, {
      name: editZoneName.trim(),
      color: editZoneColor,
    });
    setEditingZone(null);
  };

  const handleAddContinuousBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const targetZone = zones.find((z) => z.id === builderZoneId) || zones[0];
    if (!targetZone || applyToDays.length === 0) return;

    addContinuousBlock(applyToDays, targetZone.id, builderDurationMins);
  };

  const openEditSlot = (slot: CalendarSlot) => {
    const dur = Math.max(15, Math.round((slot.endMinute - slot.startMinute) / 15) * 15);
    setEditingSlot(slot);
    setEditDurationMins(dur);
    setEditSlotZoneId(slot.zoneId);
  };

  const handleSaveSlotEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    const targetZone = zones.find((z) => z.id === editSlotZoneId) || zones[0];
    resizeCalendarSlot(editingSlot.id, editDurationMins, targetZone?.id);
    setEditingSlot(null);
  };

  const toggleDayInApply = (day: DayOfWeek) => {
    if (applyToDays.includes(day)) {
      if (applyToDays.length > 1) {
        setApplyToDays(applyToDays.filter((d) => d !== day));
      }
    } else {
      setApplyToDays([...applyToDays, day]);
    }
  };

  // Compute total weekly minutes and per-zone stats
  const totalWeeklyMinutes = calendarSlots.reduce(
    (sum, s) => sum + Math.max(0, s.endMinute - s.startMinute),
    0
  );

  const zoneStats = zones.map((z) => {
    const slots = calendarSlots.filter((s) => s.zoneId === z.id);
    const totalMinutes = slots.reduce((acc, s) => acc + Math.max(0, s.endMinute - s.startMinute), 0);
    return {
      ...z,
      blockCount: slots.length,
      totalMinutes,
      formatted: formatDuration(totalMinutes),
    };
  });

  const mobileDaySlots = calendarSlots
    .filter((s) => s.day === mobileActiveDay)
    .sort((a, b) => a.startMinute - b.startMinute);

  const mobileDayTotalMinutes = mobileDaySlots.reduce(
    (sum, s) => sum + Math.max(0, s.endMinute - s.startMinute),
    0
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-glow p-4 sm:p-6 mb-8 space-y-5 md:space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 md:pb-5 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#46b1e1]" />
            <h2 className="text-base sm:text-lg font-[900] text-slate-900 tracking-tight">
              Step 1: Life Zones & Continuous Work Blocks
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create your work zones and add continuous time blocks (in 15-min chunks) per day — no exact clock timestamps required.
          </p>
        </div>

        {/* Header Summary & Clear All */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50/80 border border-sky-200/70 text-xs font-bold text-sky-950 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[#46b1e1]" />
            <span>{formatDuration(totalWeeklyMinutes)} Total / Week</span>
          </div>

          {calendarSlots.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/70 transition shadow-xs cursor-pointer"
              title="Clear all blocks across all 7 days"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Zone Mode Selector (Mode 1: Simple vs Mode 2: Custom Zones) */}
      <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setIsAddingZone(false);
            setEditingZone(null);
            setZoneMode('SIMPLE');
          }}
          className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
            isSimpleMode
              ? 'bg-white border-[#46b1e1] shadow-xs ring-2 ring-[#46b1e1]/15'
              : 'bg-transparent border-transparent hover:bg-white/70 text-slate-600'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
              isSimpleMode ? 'border-[#46b1e1]' : 'border-slate-300'
            }`}
          >
            {isSimpleMode && <span className="w-2 h-2 rounded-full bg-[#46b1e1]" />}
          </span>
          <div>
            <div className="text-xs font-extrabold text-slate-900">
              Simple Mode <span className="text-[#46b1e1] font-bold">(General Zone)</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              No custom zones needed — your whole day is treated as one General Zone.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setZoneMode('CUSTOM')}
          className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
            !isSimpleMode
              ? 'bg-white border-[#0c1527] shadow-xs ring-2 ring-[#0c1527]/10'
              : 'bg-transparent border-transparent hover:bg-white/70 text-slate-600'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
              !isSimpleMode ? 'border-[#0c1527]' : 'border-slate-300'
            }`}
          >
            {!isSimpleMode && <span className="w-2 h-2 rounded-full bg-[#0c1527]" />}
          </span>
          <div>
            <div className="text-xs font-extrabold text-slate-900">
              Custom Zones Mode{' '}
              <span className="text-[#46b1e1] font-bold">(Recommended)</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Design your own physical/focus zones (Studio, Desk, Cafe) with custom colors.
            </p>
          </div>
        </button>
      </div>

      {/* Clear All Confirmation Banner */}
      {showClearConfirm && (
        <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-rose-900 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Clear <strong>all {calendarSlots.length} continuous work blocks</strong> across all 7 days? Your configured Life Zones will remain intact.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                clearAllCalendarSlots();
                setShowClearConfirm(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Yes, Clear All
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SMARTPHONE VIEW (< md): THUMB-FIRST ZONE STRIP + DAY PLANNER   */}
      {/* ============================================================== */}
      <div className="block md:hidden space-y-5">
        {/* Mobile 1: Life Zones Strip (Hidden in Simple Mode) */}
        {!isSimpleMode && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 select-none">
                <Layers className="w-3.5 h-3.5 text-[#46b1e1]" />
                Custom Zones ({zones.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingZone(null);
                  setIsAddingZone(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-[#0c1527] bg-sky-50 active:bg-sky-100 border border-sky-200/70"
              >
                <Plus className="w-3.5 h-3.5 text-[#46b1e1]" />
                New Zone
              </button>
            </div>

            {zones.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center text-xs text-slate-500 font-medium">
                No custom zones yet. Tap <strong>+ New Zone</strong> above to add your first zone.
              </div>
            ) : (
              <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 snap-x">
                {zoneStats.map((z) => (
                  <div
                    key={z.id}
                    className="snap-start shrink-0 min-w-[165px] max-w-[200px] p-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 flex flex-col justify-between gap-2 shadow-xs"
                    style={{ borderLeft: `4px solid ${z.color}` }}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: z.color,
                            boxShadow: `0 0 0 3px ${z.color}20`,
                          }}
                        />
                        <span className="text-xs font-bold text-slate-900 truncate">{z.name}</span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditZone(z)}
                          className="p-1.5 rounded-lg text-slate-500 active:bg-slate-200"
                          title={`Edit ${z.name}`}
                        >
                          <Palette className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteZone(z.id)}
                          className="p-1.5 rounded-lg text-slate-400 active:text-rose-500 active:bg-rose-50"
                          title={`Delete ${z.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium tabular-nums">
                      <strong className="text-slate-900">{z.formatted}</strong> • {z.blockCount} blocks
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile 2: 7-Day Segmented Strip (Full week balance at a glance) */}
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-1 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70">
            {DAYS_OF_WEEK.map((day) => {
              const daySlots = calendarSlots.filter((s) => s.day === day);
              const dayMins = daySlots.reduce(
                (sum, s) => sum + Math.max(0, s.endMinute - s.startMinute),
                0
              );
              const isActive = mobileActiveDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setMobileActiveDay(day)}
                  className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition ${
                    isActive
                      ? 'bg-[#0c1527] text-white shadow-sm'
                      : 'text-slate-600 active:bg-white/80'
                  }`}
                >
                  <span className="text-[10px] font-[900] tracking-wide">{day}</span>
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      isActive
                        ? 'text-[#46b1e1]'
                        : dayMins > 0
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {dayMins > 0 ? formatDuration(dayMins) : '—'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Day Header + Prominent Add Block CTA */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-[900] text-slate-900">
                {formatDayName(mobileActiveDay)}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium tabular-nums">
                {mobileDaySlots.length} {mobileDaySlots.length === 1 ? 'block' : 'blocks'} •{' '}
                <strong className="text-slate-800">{formatDuration(mobileDayTotalMinutes)}</strong> continuous capacity
              </p>
            </div>

            <button
              type="button"
              disabled={!canAddWorkingSlot}
              onClick={() => {
                if (!canAddWorkingSlot) return;
                setApplyToDays([mobileActiveDay]);
                setIsMobileAddSheetOpen(true);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold shadow-sm transition ${
                canAddWorkingSlot
                  ? 'bg-[#0c1527] active:bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
              title={
                canAddWorkingSlot
                  ? 'Add Continuous working slot'
                  : 'Create a custom zone first'
              }
            >
              <Plus className={`w-3.5 h-3.5 ${canAddWorkingSlot ? 'text-[#46b1e1]' : 'text-slate-400'}`} />
              <span>Add Continuous working slot</span>
            </button>
          </div>

          {/* Active Day Continuous Blocks List (Touch-First Cards) */}
          <div className="space-y-2.5">
            {mobileDaySlots.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-500">
                  No continuous work blocks on {formatDayName(mobileActiveDay)} yet.
                </p>
                <button
                  type="button"
                  disabled={!canAddWorkingSlot}
                  onClick={() => {
                    if (!canAddWorkingSlot) return;
                    setApplyToDays([mobileActiveDay]);
                    setIsMobileAddSheetOpen(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold shadow-xs transition ${
                    canAddWorkingSlot
                      ? 'bg-white border-slate-200 text-[#0c1527] active:bg-slate-100'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Plus className={`w-3.5 h-3.5 ${canAddWorkingSlot ? 'text-[#46b1e1]' : 'text-slate-400'}`} />
                  <span>
                    {canAddWorkingSlot
                      ? `Add ${formatDuration(builderDurationMins)} Slot`
                      : 'Create a Zone First'}
                  </span>
                </button>
              </div>
            ) : (
              mobileDaySlots.map((slot, idx) => {
                const zone = zones.find((z) => z.id === slot.zoneId) || zones[0];
                const duration = Math.max(15, slot.endMinute - slot.startMinute);
                const chunkCount = Math.round(duration / 15);
                const nextSlot = mobileDaySlots[idx + 1];
                const canMergeWithNext = nextSlot && nextSlot.zoneId === slot.zoneId;

                return (
                  <React.Fragment key={slot.id}>
                    <div
                      className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3"
                      style={{ borderLeft: `5px solid ${zone?.color || '#46b1e1'}` }}
                    >
                      {/* Top Row: Zone Pill + Always-Visible Touch Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: zone?.color || '#46b1e1' }}
                          />
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {zone?.name || 'Work Zone'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditSlot(slot)}
                            className="p-2 rounded-xl bg-slate-50 active:bg-slate-200 text-slate-600 border border-slate-200/60"
                            title="Change zone or length"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCalendarSlot(slot.id)}
                            className="p-2 rounded-xl bg-rose-50/70 active:bg-rose-100 text-rose-600 border border-rose-200/60"
                            title="Delete block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Big Duration Display + Generous 15m Tap Steppers */}
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                        <div>
                          <div className="text-lg font-[900] text-slate-900 tabular-nums leading-tight">
                            {formatDuration(duration)}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400 tabular-nums">
                            {chunkCount} × 15m continuous chunks
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              resizeCalendarSlot(slot.id, Math.max(15, duration - 15))
                            }
                            disabled={duration <= 15}
                            className="h-9 px-3 rounded-xl bg-slate-100 active:bg-slate-200 border border-slate-200 text-xs font-extrabold text-slate-800 disabled:opacity-40 select-none"
                          >
                            -15m
                          </button>
                          <button
                            type="button"
                            onClick={() => resizeCalendarSlot(slot.id, duration + 15)}
                            className="h-9 px-3 rounded-xl bg-slate-100 active:bg-slate-200 border border-slate-200 text-xs font-extrabold text-slate-800 select-none"
                          >
                            +15m
                          </button>
                        </div>
                      </div>
                    </div>

                    {canMergeWithNext && (
                      <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-between gap-2 text-xs text-sky-950">
                        <div className="flex items-center gap-1.5 font-bold truncate">
                          <Sparkles className="w-3.5 h-3.5 text-[#46b1e1] shrink-0" />
                          <span className="truncate">Merge consecutive {zone?.name}?</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => mergeCalendarSlots(slot.id, nextSlot.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#0c1527] text-white font-extrabold text-[11px] shrink-0"
                        >
                          Merge
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet: Add Continuous Work Block */}
      {isMobileAddSheetOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-xs flex items-end justify-center md:hidden">
          <form
            onSubmit={(e) => {
              handleAddContinuousBlock(e);
              setIsMobileAddSheetOpen(false);
            }}
            className="bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl w-full max-h-[88vh] overflow-y-auto p-5 pb-7 space-y-5 animate-in slide-in-from-bottom"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-[900] text-slate-900">
                  Add Continuous Block
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  15-minute chunks • No clock timestamps needed
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileAddSheetOpen(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Zone Selection (Custom Zones Mode Only) */}
            {!isSimpleMode && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  1. Pick Custom Zone
                </label>
                <div className="flex flex-wrap gap-2">
                  {zones.map((z) => {
                    const isSelected = z.id === (builderZoneId || zones[0]?.id);
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setBuilderZoneId(z.id)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                          isSelected
                            ? 'bg-[#0c1527] text-white border-[#0c1527] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: z.color }}
                        />
                        <span>{z.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#46b1e1]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Continuous Length */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  2. Continuous Length
                </label>
                <span className="text-[11px] font-bold text-[#46b1e1] tabular-nums">
                  {builderDurationMins / 15} × 15m chunks
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBuilderDurationMins((d) => Math.max(15, d - 15))}
                  className="h-11 px-4 rounded-xl bg-slate-100 active:bg-slate-200 border border-slate-200 font-extrabold text-slate-800 text-sm"
                >
                  -15m
                </button>
                <div className="flex-1 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-[900] text-base text-slate-900 tabular-nums select-none">
                  {formatDuration(builderDurationMins)}
                </div>
                <button
                  type="button"
                  onClick={() => setBuilderDurationMins((d) => d + 15)}
                  className="h-11 px-4 rounded-xl bg-slate-100 active:bg-slate-200 border border-slate-200 font-extrabold text-slate-800 text-sm"
                >
                  +15m
                </button>
              </div>

              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {QUICK_DURATION_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setBuilderDurationMins(mins)}
                    className={`py-2 rounded-xl text-[11px] font-bold transition ${
                      builderDurationMins === mins
                        ? 'bg-[#46b1e1] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {formatDuration(mins)}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  3. Apply to Days
                </label>
                <div className="flex gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setApplyToDays(['MON', 'TUE', 'WED', 'THU', 'FRI'])}
                    className="text-[#46b1e1] font-bold"
                  >
                    Mon–Fri
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyToDays(['SAT', 'SUN'])}
                    className="text-[#46b1e1] font-bold"
                  >
                    Weekend
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyToDays([...DAYS_OF_WEEK])}
                    className="text-[#46b1e1] font-bold"
                  >
                    All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((day) => {
                  const active = applyToDays.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDayInApply(day)}
                      className={`py-2.5 rounded-xl text-[10px] font-extrabold transition ${
                        active
                          ? 'bg-[#0c1527] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0c1527] active:bg-slate-800 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-[#46b1e1]" />
              <span>
                Add {formatDuration(builderDurationMins)} to{' '}
                {applyToDays.length === 1
                  ? formatDayName(applyToDays[0])
                  : `${applyToDays.length} Days`}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* PC VIEW (>= md)                                                */}
      {/* ============================================================== */}
      <div className="hidden md:block space-y-5">
        {/* SECTION 1: CUSTOM ZONES MANAGER (Hidden in Simple Mode) */}
        {!isSimpleMode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 select-none">
                <Layers className="w-3.5 h-3.5 text-[#46b1e1]" />
                Your Custom Zones ({zones.length})
              </span>

              <button
                type="button"
                onClick={() => {
                  setEditingZone(null);
                  setIsAddingZone(!isAddingZone);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#0c1527] bg-sky-50 hover:bg-sky-100/80 transition border border-sky-200/70 cursor-pointer select-none"
              >
                <Plus className="w-3.5 h-3.5 text-[#46b1e1]" />
                New Zone
              </button>
            </div>

            {zones.length === 0 && !isAddingZone ? (
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  No custom zones created yet. Add your first zone (e.g., Studio, Desk) to enable working slots, or switch to <strong>Simple Mode</strong> above.
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingZone(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0c1527] hover:bg-slate-800 text-white text-xs font-bold shrink-0 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5 text-[#46b1e1]" />
                  <span>Create First Zone</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {zoneStats.map((z) => (
                  <div
                    key={z.id}
                    className="group p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex items-center justify-between gap-2 shadow-xs"
                    style={{ borderLeft: `4px solid ${z.color}` }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: z.color,
                            boxShadow: `0 0 0 3px ${z.color}20`,
                          }}
                        />
                        <span className="text-xs font-bold text-slate-900 truncate">{z.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5 tabular-nums">
                        <strong className="text-slate-800">{z.formatted}</strong> • {z.blockCount} blocks
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditZone(z)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                        title={`Customize ${z.name} name or color`}
                      >
                        <Palette className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteZone(z.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                        title={`Delete ${z.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Zone Drawer with Cool Spectrum Color Picker (Desktop Inline) */}
            {isAddingZone && (
              <form
                onSubmit={handleCreateZone}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col md:flex-row items-start gap-5 animate-in fade-in"
              >
                <div className="flex-1 w-full space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      New Zone Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acoustic Studio, Morning Cafe, Couch"
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#46b1e1] bg-white font-semibold"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-xl shrink-0 border border-slate-200"
                      style={{ backgroundColor: newZoneColor }}
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">
                        {newZoneName.trim() || 'Zone Preview'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Accent {newZoneColor.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-[#0c1527] hover:bg-slate-800 rounded-xl transition cursor-pointer shadow-xs"
                    >
                      Create Zone
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingZone(false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <ColorPicker
                  color={newZoneColor}
                  onChange={setNewZoneColor}
                  label="Custom Spectrum & Hex"
                />
              </form>
            )}
          </div>
        )}

        {/* SECTION 2: TOGGLE BUTTON "Add Continuous working slot" + EXPANDABLE BUILDER */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!canAddWorkingSlot}
                onClick={() => {
                  if (!canAddWorkingSlot) return;
                  setIsSlotBuilderOpen((prev) => !prev);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition shadow-sm ${
                  canAddWorkingSlot
                    ? 'bg-[#0c1527] hover:bg-slate-800 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                }`}
                title={
                  canAddWorkingSlot
                    ? 'Open continuous working slot builder'
                    : 'Create at least 1 custom zone first'
                }
              >
                <Plus
                  className={`w-4 h-4 transition-transform ${
                    isSlotBuilderOpen ? 'rotate-45 text-rose-400' : canAddWorkingSlot ? 'text-[#46b1e1]' : 'text-slate-400'
                  }`}
                />
                <span>
                  {isSlotBuilderOpen ? 'Close Slot Builder' : 'Add Continuous working slot'}
                </span>
              </button>

              {!canAddWorkingSlot && !isSimpleMode && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                  Create a custom zone first to enable adding working slots
                </span>
              )}
            </div>

            <span className="text-[11px] font-semibold text-slate-400 select-none">
              15-minute increments • No clock timestamps needed
            </span>
          </div>

          {isSlotBuilderOpen && canAddWorkingSlot && (
            <form
              onSubmit={(e) => {
                handleAddContinuousBlock(e);
                setIsSlotBuilderOpen(false);
              }}
              className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 select-none">
                  <Plus className="w-3.5 h-3.5 text-[#46b1e1]" />
                  Add Continuous working slot
                </span>
                <button
                  type="button"
                  onClick={() => setIsSlotBuilderOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                {/* 1. Pick Zone Pills (Only shown in Custom Zones mode) */}
                {!isSimpleMode && (
                  <div className="lg:col-span-4 space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                      1. Pick Custom Zone
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {zones.map((z) => {
                        const isSelected = z.id === (builderZoneId || zones[0]?.id);
                        return (
                          <button
                            key={z.id}
                            type="button"
                            onClick={() => setBuilderZoneId(z.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer select-none ${
                              isSelected
                                ? 'bg-[#0c1527] text-white border-[#0c1527] shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: z.color }}
                            />
                            <span>{z.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-[#46b1e1]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Continuous Duration in 15m chunks */}
                <div className={`${isSimpleMode ? 'lg:col-span-6' : 'lg:col-span-4'} space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                      {isSimpleMode ? '1. Continuous Slot Length' : '2. Continuous Slot Length'}
                    </label>
                    <span className="text-[10px] font-bold text-[#46b1e1] tabular-nums select-none">
                      {builderDurationMins / 15} × 15m chunks
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBuilderDurationMins((d) => Math.max(15, d - 15))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer select-none shrink-0"
                      title="Decrease by 15 mins"
                    >
                      -15
                    </button>
                    <input
                      type="text"
                      readOnly
                      value={formatDuration(builderDurationMins)}
                      onKeyDown={(e) => e.preventDefault()}
                      className="flex-1 h-8 px-2 text-center font-[900] text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none tabular-nums cursor-default caret-transparent select-none"
                    />
                    <button
                      type="button"
                      onClick={() => setBuilderDurationMins((d) => d + 15)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer select-none shrink-0"
                      title="Increase by 15 mins"
                    >
                      +15
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {QUICK_DURATION_PRESETS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setBuilderDurationMins(mins)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer select-none ${
                          builderDurationMins === mins
                            ? 'bg-[#46b1e1] text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {formatDuration(mins)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Select Days + Submit */}
                <div className={`${isSimpleMode ? 'lg:col-span-6' : 'lg:col-span-4'} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                      {isSimpleMode ? '2. Apply to Days' : '3. Apply to Days'}
                    </label>
                    <div className="flex gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setApplyToDays(['MON', 'TUE', 'WED', 'THU', 'FRI'])}
                        className="text-[#46b1e1] hover:underline font-bold cursor-pointer"
                      >
                        Mon–Fri
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplyToDays(['SAT', 'SUN'])}
                        className="text-[#46b1e1] hover:underline font-bold cursor-pointer"
                      >
                        Weekend
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplyToDays([...DAYS_OF_WEEK])}
                        className="text-[#46b1e1] hover:underline font-bold cursor-pointer"
                      >
                        All
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const active = applyToDays.includes(day);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => toggleDayInApply(day)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer select-none ${
                            active
                              ? 'bg-[#0c1527] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-xl bg-[#0c1527] hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#46b1e1]" />
                    <span>
                      Add {formatDuration(builderDurationMins)} Working Slot ({applyToDays.length}{' '}
                      {applyToDays.length === 1 ? 'day' : 'days'})
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* SECTION 3: STEP-4-STYLE UNIFIED 7-COLUMN WEEKLY GRID (ZERO GAP BETWEEN DAYS) */}
        <div className="pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-slate-200 rounded-2xl border border-slate-200 overflow-hidden">
            {DAYS_OF_WEEK.map((day, dayIdx) => {
              const daySlots = calendarSlots
                .filter((s) => s.day === day)
                .sort((a, b) => a.startMinute - b.startMinute);

              const totalDayMinutes = daySlots.reduce(
                (sum, s) => sum + Math.max(0, s.endMinute - s.startMinute),
                0
              );

              return (
                <div
                  key={day}
                  className={`${
                    dayIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  } px-1.5 py-2.5 flex flex-col h-full min-h-[360px]`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-slate-200/80 gap-1">
                    <div className="min-w-0">
                      <span className="text-xs font-[900] text-slate-900 uppercase tracking-wider block">
                        {day}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        {formatDayName(day)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 tabular-nums">
                        {formatDuration(totalDayMinutes)}
                      </span>
                      <button
                        type="button"
                        disabled={!canAddWorkingSlot}
                        onClick={() => {
                          if (!canAddWorkingSlot) return;
                          const targetZone = zones.find((z) => z.id === builderZoneId) || zones[0];
                          if (targetZone) {
                            addContinuousBlock([day], targetZone.id, builderDurationMins);
                          }
                        }}
                        className={`p-1 rounded-md transition ${
                          canAddWorkingSlot
                            ? 'text-slate-400 hover:text-[#46b1e1] hover:bg-slate-100 cursor-pointer'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                        title={
                          canAddWorkingSlot
                            ? `Quick-add ${formatDuration(builderDurationMins)} slot to ${day}`
                            : 'Create a custom zone first'
                        }
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Day Continuous Zone Cards Stack */}
                  <div className="space-y-1.5 flex-1">
                    {daySlots.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center text-center p-2 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                        <span>Rest / Off Day</span>
                        {canAddWorkingSlot && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetZone = zones.find((z) => z.id === builderZoneId) || zones[0];
                              if (targetZone) {
                                addContinuousBlock([day], targetZone.id, builderDurationMins);
                              }
                            }}
                            className="text-[10px] font-bold text-[#46b1e1] hover:underline mt-1 cursor-pointer"
                          >
                            + Add {formatDuration(builderDurationMins)}
                          </button>
                        )}
                      </div>
                    ) : (
                      daySlots.map((slot, idx) => {
                        const zone = zones.find((z) => z.id === slot.zoneId) || zones[0];
                        const duration = Math.max(15, slot.endMinute - slot.startMinute);
                        const chunkCount = Math.round(duration / 15);
                        const nextSlot = daySlots[idx + 1];

                        const canMergeWithNext = nextSlot && nextSlot.zoneId === slot.zoneId;

                        return (
                          <React.Fragment key={slot.id}>
                            <div
                              className="group p-2 rounded-xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-all space-y-1.5"
                              style={{ borderLeft: `4px solid ${zone?.color || '#46b1e1'}` }}
                            >
                              {/* Top: Zone Name + Hover Actions */}
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: zone?.color || '#46b1e1' }}
                                  />
                                  <span className="text-[10.5px] font-bold text-slate-700 break-words leading-tight">
                                    {zone?.name || 'General Zone'}
                                  </span>
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openEditSlot(slot)}
                                    className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                    title="Edit zone or duration"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteCalendarSlot(slot.id)}
                                    className="p-0.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                    title="Delete block"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Middle: Continuous Duration */}
                              <div className="flex items-baseline justify-between gap-1">
                                <span className="text-sm font-[900] text-slate-900 tabular-nums">
                                  {formatDuration(duration)}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-400 tabular-nums">
                                  {chunkCount}×15m
                                </span>
                              </div>

                              {/* Bottom: Quick +/- 15m Inline Stepper */}
                              <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    resizeCalendarSlot(slot.id, Math.max(15, duration - 15))
                                  }
                                  disabled={duration <= 15}
                                  className="flex-1 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-[10px] font-bold text-slate-600 disabled:opacity-40 cursor-pointer select-none transition"
                                  title="Subtract 15 mins"
                                >
                                  -15m
                                </button>
                                <button
                                  type="button"
                                  onClick={() => resizeCalendarSlot(slot.id, duration + 15)}
                                  className="flex-1 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-[10px] font-bold text-slate-600 cursor-pointer select-none transition"
                                  title="Add 15 mins"
                                >
                                  +15m
                                </button>
                              </div>
                            </div>

                            {canMergeWithNext && (
                              <div className="my-1 p-1.5 rounded-xl bg-sky-50/90 border border-sky-200/80 flex items-center justify-between gap-1 text-[10px] text-sky-950 shadow-xs">
                                <div className="flex items-center gap-1 font-bold truncate">
                                  <Sparkles className="w-3 h-3 text-[#46b1e1] shrink-0" />
                                  <span className="truncate">Merge?</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => mergeCalendarSlots(slot.id, nextSlot.id)}
                                  className="px-2 py-0.5 rounded-md bg-[#0c1527] hover:bg-slate-800 text-white font-extrabold text-[9px] shrink-0 transition cursor-pointer"
                                >
                                  Merge
                                </button>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SHARED MODALS (MOBILE BOTTOM-SHEET + PC CENTERED DIALOGS)      */}
      {/* ============================================================== */}

      {/* Mobile Add Zone Bottom Sheet (Only on mobile when isAddingZone is true) */}
      {isAddingZone && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-xs flex items-end justify-center md:hidden">
          <form
            onSubmit={handleCreateZone}
            className="bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl w-full max-h-[90vh] overflow-y-auto p-5 pb-7 space-y-4 animate-in slide-in-from-bottom"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-[900] text-slate-900">Create New Life Zone</h3>
              <button
                type="button"
                onClick={() => setIsAddingZone(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Zone Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acoustic Studio, Morning Cafe"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#46b1e1] bg-white font-semibold"
                required
              />
            </div>

            <div className="flex justify-center">
              <ColorPicker
                color={newZoneColor}
                onChange={setNewZoneColor}
                label="Custom Spectrum & Hex"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingZone(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] py-3 rounded-2xl bg-[#0c1527] text-white font-extrabold text-xs shadow-sm"
              >
                Save Zone
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Existing Zone Modal (Bottom sheet on phone, dialog on PC) */}
      {editingZone && (
        <div className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <form
            onSubmit={handleSaveZoneEdit}
            className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl sm:max-w-sm w-full max-h-[90vh] overflow-y-auto p-5 pb-7 sm:pb-5 space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Customize Life Zone</h3>
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                className="p-1.5 rounded-full bg-slate-100 sm:bg-transparent text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Zone Name
              </label>
              <input
                type="text"
                value={editZoneName}
                onChange={(e) => setEditZoneName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#46b1e1] font-semibold"
                required
              />
            </div>

            <div className="flex justify-center">
              <ColorPicker
                color={editZoneColor}
                onChange={setEditZoneColor}
                label="Pick Any Color or Enter Hex"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                className="px-3.5 py-2 sm:py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 sm:py-1.5 rounded-xl bg-[#0c1527] hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Save Zone
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Continuous Block Modal (Bottom sheet on phone, dialog on PC) */}
      {editingSlot && (
        <div className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl sm:max-w-md w-full p-5 pb-7 sm:pb-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Continuous Block ({formatDayName(editingSlot.day)})
              </h3>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="p-1.5 rounded-full bg-slate-100 sm:bg-transparent text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlotEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Life Zone
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {zones.map((z) => {
                    const isSelected = z.id === editSlotZoneId;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setEditSlotZoneId(z.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#0c1527] text-white border-[#0c1527]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: z.color }}
                        />
                        <span>{z.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Continuous Duration (15-min chunks)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditDurationMins((d) => Math.max(15, d - 15))}
                    className="w-11 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 cursor-pointer select-none"
                  >
                    -15
                  </button>
                  <input
                    type="text"
                    readOnly
                    value={formatDuration(editDurationMins)}
                    onKeyDown={(e) => e.preventDefault()}
                    className="flex-1 h-10 sm:h-9 text-center font-[900] text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none tabular-nums cursor-default caret-transparent select-none"
                  />
                  <button
                    type="button"
                    onClick={() => setEditDurationMins((d) => d + 15)}
                    className="w-11 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 cursor-pointer select-none"
                  >
                    +15
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-3.5 py-2 sm:py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 sm:py-1.5 rounded-lg bg-[#0c1527] hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
