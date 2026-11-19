'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Zap,
  Tag,
  Check,
  X,
  Edit2,
  Sparkles,
  Lock,
  Scissors,
  Clock,
  Send,
} from 'lucide-react';
import { usePwsStore } from '../store/usePwsStore';
import {
  BatchingGroup,
  ContentType,
  ResistanceLevel,
  WorkflowTaskConfig,
} from '../types/pws';
import { formatDuration } from '../lib/timeUtils';
import {
  AUTO_PIPELINE_COLORS,
  PIPELINE_ICONS,
  STAGE_ICON_CATEGORIES,
  getPipelineIconComponent,
  getStageIconComponent,
  matchBatchingGroup,
  suggestStageIcon,
} from '../lib/creatorIcons';

const RESISTANCE_OPTIONS: { level: ResistanceLevel; label: string; short: string; mult: string }[] = [
  { level: 'LOW', label: 'Low', short: 'Easy', mult: '1x' },
  { level: 'MEDIUM', label: 'Med', short: 'Med', mult: '2x' },
  { level: 'HIGH', label: 'High', short: 'Heavy', mult: '3.5x' },
];

const QUICK_STAGE_TEMPLATES = [
  { name: 'Shoot', icon: 'Camera', durationMins: 60, resistance: 'HIGH' as ResistanceLevel, isSplittable: false },
  { name: 'Edit', icon: 'Scissors', durationMins: 90, resistance: 'MEDIUM' as ResistanceLevel, isSplittable: true },
  { name: 'Publish', icon: 'Send', durationMins: 30, resistance: 'LOW' as ResistanceLevel, isSplittable: false },
];

export const PanelContentPipelines: React.FC = () => {
  const {
    zoneMode,
    batchingGroups,
    contentTypes,
    zones,
    addBatchingGroup,
    updateBatchingGroup,
    deleteBatchingGroup,
    addContentType,
    updateContentType,
    deleteContentType,
    addTaskToContentType,
    updateTaskInContentType,
    deleteTaskFromContentType,
  } = usePwsStore();

  const [activeCtId, setActiveCtId] = useState<string>(contentTypes[0]?.id || '');

  // New / Edit Pipeline State (Icon-based, no color selection)
  const [isAddingCt, setIsAddingCt] = useState(false);
  const [newCtName, setNewCtName] = useState('');
  const [newCtIcon, setNewCtIcon] = useState('MonitorPlay');

  const [editingCt, setEditingCt] = useState<ContentType | null>(null);
  const [editCtName, setEditCtName] = useState('');
  const [editCtIcon, setEditCtIcon] = useState('MonitorPlay');

  // New Batching Group State (Color-free)
  const [isAddingBg, setIsAddingBg] = useState(false);
  const [newBgName, setNewBgName] = useState('');
  const [newBgSetup, setNewBgSetup] = useState(20);

  // Stage Icon Picker Popover State
  const [iconPickerTaskId, setIconPickerTaskId] = useState<string | null>(null);
  const [manuallyPickedIcons, setManuallyPickedIcons] = useState<Record<string, boolean>>({});
  const [autoMatchedTaskIds, setAutoMatchedTaskIds] = useState<Record<string, boolean>>({});

  // Mobile Accordion Expanded Stage ID
  const [mobileExpandedTaskId, setMobileExpandedTaskId] = useState<string | null>(null);

  const selectedContentType = contentTypes.find((ct) => ct.id === activeCtId) || contentTypes[0];

  // Keep activeCtId synchronized when pipelines change
  useEffect(() => {
    if (contentTypes.length > 0 && !contentTypes.some((ct) => ct.id === activeCtId)) {
      setActiveCtId(contentTypes[0].id);
    }
  }, [contentTypes, activeCtId]);

  // Default expand first stage on mobile when switching pipelines
  useEffect(() => {
    if (selectedContentType && selectedContentType.tasks.length > 0) {
      if (!selectedContentType.tasks.some((t) => t.id === mobileExpandedTaskId)) {
        setMobileExpandedTaskId(selectedContentType.tasks[0].id);
      }
    }
  }, [selectedContentType, mobileExpandedTaskId]);

  const handleCreateBatchGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBgName.trim()) return;
    const newGroup: BatchingGroup = {
      id: `bg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newBgName.trim(),
      setupBufferMins: newBgSetup,
    };
    addBatchingGroup(newGroup);
    setNewBgName('');
    setNewBgSetup(20);
    setIsAddingBg(false);
  };

  const handleCreateContentType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCtName.trim()) return;
    const autoColor = AUTO_PIPELINE_COLORS[contentTypes.length % AUTO_PIPELINE_COLORS.length];
    const matchedGroup = matchBatchingGroup('Script & Outline', batchingGroups);
    const newCt: ContentType = {
      id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newCtName.trim().slice(0, 10),
      color: autoColor,
      icon: newCtIcon,
      priorityRank: contentTypes.length + 1,
      minWeeklyUnits: 1,
      targetWeeklyUnits: 1,
      tasks: [
        {
          id: `task-${Date.now()}-1`,
          name: 'Script',
          icon: 'PenTool',
          stageOrder: 1,
          durationMins: 60,
          batchGroupId: matchedGroup?.id || 'bg-none',
          setupBufferMins: matchedGroup?.setupBufferMins ?? 0,
          isSplittable: true,
          minSplitChunkMins: 15,
          resistance: 'MEDIUM',
          eligibleZoneIds: zones.map((z) => z.id),
        },
      ],
    };
    addContentType(newCt);
    setActiveCtId(newCt.id);
    setNewCtName('');
    setNewCtIcon('MonitorPlay');
    setIsAddingCt(false);
  };

  const openEditCt = (ct: ContentType) => {
    setEditingCt(ct);
    setEditCtName(ct.name.slice(0, 10));
    setEditCtIcon(ct.icon || 'MonitorPlay');
  };

  const handleSaveEditCt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCt || !editCtName.trim()) return;
    updateContentType(editingCt.id, {
      name: editCtName.trim().slice(0, 10),
      icon: editCtIcon,
    });
    setEditingCt(null);
  };

  const handleAddStage = (template?: (typeof QUICK_STAGE_TEMPLATES)[number]) => {
    if (!selectedContentType) return;
    const nextOrder = selectedContentType.tasks.length + 1;
    const stageName = template ? template.name : `Stage ${nextOrder} Task`;
    const matchedGroup = matchBatchingGroup(stageName, batchingGroups);
    const newTaskId = `task-${selectedContentType.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newTask: WorkflowTaskConfig = {
      id: newTaskId,
      name: stageName,
      icon: template ? template.icon : suggestStageIcon(stageName),
      stageOrder: nextOrder,
      durationMins: template ? template.durationMins : 60,
      batchGroupId: matchedGroup?.id || 'bg-none',
      batchGroupLocked: false,
      setupBufferMins: matchedGroup?.setupBufferMins ?? 0,
      isSplittable: template ? template.isSplittable : false,
      minSplitChunkMins: 15,
      resistance: template ? template.resistance : 'LOW',
      eligibleZoneIds: zones.slice(0, 2).map((z) => z.id),
    };

    if (matchedGroup) {
      setAutoMatchedTaskIds((prev) => ({ ...prev, [newTaskId]: true }));
    }

    addTaskToContentType(selectedContentType.id, newTask);
    setMobileExpandedTaskId(newTaskId);
  };

  const handleStageNameChange = (task: WorkflowTaskConfig, nextName: string) => {
    if (!selectedContentType) return;
    const partial: Partial<WorkflowTaskConfig> = { name: nextName };

    // Auto-suggest circular icon unless user manually picked one for this stage
    if (!manuallyPickedIcons[task.id]) {
      partial.icon = suggestStageIcon(nextName);
    }

    // Smart Auto-Recognition of Batching Group unless user manually overrode it
    if (!task.batchGroupLocked) {
      const matched = matchBatchingGroup(nextName, batchingGroups);
      if (matched) {
        partial.batchGroupId = matched.id;
        partial.setupBufferMins = matched.setupBufferMins;
        setAutoMatchedTaskIds((prev) => ({ ...prev, [task.id]: true }));
      } else {
        setAutoMatchedTaskIds((prev) => ({ ...prev, [task.id]: false }));
      }
    }

    updateTaskInContentType(selectedContentType.id, task.id, partial);
  };

  const handleBatchGroupSelect = (task: WorkflowTaskConfig, groupId: string) => {
    if (!selectedContentType) return;
    setAutoMatchedTaskIds((prev) => ({ ...prev, [task.id]: false }));
    updateTaskInContentType(selectedContentType.id, task.id, {
      batchGroupId: groupId,
      batchGroupLocked: true,
    });
  };

  const handleSelectStageIcon = (taskId: string, iconName: string) => {
    if (!selectedContentType) return;
    setManuallyPickedIcons((prev) => ({ ...prev, [taskId]: true }));
    updateTaskInContentType(selectedContentType.id, taskId, { icon: iconName });
    setIconPickerTaskId(null);
  };

  const handleMoveStage = (index: number, direction: 'UP' | 'DOWN') => {
    if (!selectedContentType) return;
    const tasks = [...selectedContentType.tasks];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;

    const temp = tasks[index];
    tasks[index] = tasks[targetIndex];
    tasks[targetIndex] = temp;

    tasks.forEach((t, i) => {
      t.stageOrder = i + 1;
    });

    updateContentType(selectedContentType.id, { tasks });
  };

  const toggleTaskZone = (taskId: string, zoneId: string) => {
    if (!selectedContentType) return;
    const task = selectedContentType.tasks.find((t) => t.id === taskId);
    if (!task) return;

    let updatedZones = [...task.eligibleZoneIds];
    if (updatedZones.includes(zoneId)) {
      if (updatedZones.length > 1) {
        updatedZones = updatedZones.filter((id) => id !== zoneId);
      }
    } else {
      updatedZones.push(zoneId);
    }

    updateTaskInContentType(selectedContentType.id, taskId, {
      eligibleZoneIds: updatedZones,
    });
  };

  const getResolvedSetup = (task: WorkflowTaskConfig) => {
    const grp = batchingGroups.find((g) => g.id === task.batchGroupId);
    return grp ? grp.setupBufferMins : task.setupBufferMins;
  };

  // Breakdown stats for active pipeline
  const pipelineTotalWork = selectedContentType
    ? selectedContentType.tasks.reduce((sum, t) => sum + t.durationMins, 0)
    : 0;
  const pipelineTotalSetup = selectedContentType
    ? selectedContentType.tasks.reduce((sum, t) => sum + getResolvedSetup(t), 0)
    : 0;
  const pipelineTotalTime = pipelineTotalWork + pipelineTotalSetup;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-glow p-4 sm:p-6 mb-8 space-y-6">
      {/* ============================================================== */}
      {/* PANEL HEADER                                                   */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 sm:pb-5 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#46b1e1]" />
            <h2 className="text-base sm:text-lg font-[900] text-slate-900 tracking-tight">
              Step 2: Content Pipelines & PWS Stage Matrix
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Define shared Setup Rigs and design your repeatable stage pipeline with automatic Cohort Lead-Times.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingCt(!isAddingCt)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-[#0c1527] hover:bg-slate-800 transition shadow-xs cursor-pointer select-none self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-[#46b1e1]" />
          <span>New Content Pipeline</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SHARED BATCHING GROUPS (COLOR-FREE SETUP RIGS BAR)             */}
      {/* ============================================================== */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-100/80 text-[#46b1e1] flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 select-none">
                Shared Batching Groups (Setup Rigs)
              </span>
              <span className="text-[11px] text-slate-500 hidden lg:inline ml-2 select-none">
                Tasks sharing a rig pay setup once when scheduled back-to-back across pipelines.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingBg(!isAddingBg)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#0c1527] bg-white hover:bg-sky-50 transition border border-slate-200 self-start sm:self-auto cursor-pointer select-none shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#46b1e1]" />
            <span>New Setup Rig</span>
          </button>
        </div>

        {/* Neutral Batching Group Pills (No Dedicated Colors) */}
        <div className="flex flex-wrap items-center gap-2">
          {batchingGroups.map((group) => {
            const isDefaultZero = group.id === 'bg-none';
            return (
              <div
                key={group.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-xs text-xs"
              >
                <span className="font-bold text-slate-800 select-none">{group.name}</span>

                {isDefaultZero ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 tabular-nums select-none">
                    0m
                  </span>
                ) : (
                  <div className="inline-flex items-center gap-0.5 bg-slate-50 rounded-lg border border-slate-200/80 p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateBatchingGroup(group.id, {
                          setupBufferMins: Math.max(0, group.setupBufferMins - 5),
                        })
                      }
                      className="w-5 h-5 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center cursor-pointer select-none text-[11px]"
                      title="Decrease setup penalty by 5 mins"
                    >
                      -
                    </button>
                    <span className="px-1.5 text-[11px] font-bold text-[#46b1e1] tabular-nums select-none cursor-default">
                      {group.setupBufferMins}m
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateBatchingGroup(group.id, {
                          setupBufferMins: group.setupBufferMins + 5,
                        })
                      }
                      className="w-5 h-5 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center cursor-pointer select-none text-[11px]"
                      title="Increase setup penalty by 5 mins"
                    >
                      +
                    </button>
                  </div>
                )}

                {!isDefaultZero && (
                  <button
                    type="button"
                    onClick={() => deleteBatchingGroup(group.id)}
                    className="text-slate-400 hover:text-rose-500 transition cursor-pointer ml-0.5"
                    title={`Delete ${group.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Inline Add Batching Group Form (Color-Free) */}
        {isAddingBg && (
          <form
            onSubmit={handleCreateBatchGroup}
            className="pt-3 border-t border-slate-200/80 flex flex-wrap items-end gap-3 animate-in fade-in"
          >
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Rig / Group Name
              </label>
              <input
                type="text"
                placeholder="e.g. Shooting, Audio Booth, Color Suite"
                value={newBgName}
                onChange={(e) => setNewBgName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#46b1e1] bg-white font-semibold cursor-text"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Setup Penalty
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNewBgSetup((v) => Math.max(0, v - 5))}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer select-none"
                >
                  -
                </button>
                <input
                  type="text"
                  readOnly
                  value={`${newBgSetup}m`}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-14 px-2 py-1 text-center font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none tabular-nums cursor-default caret-transparent select-none text-xs"
                />
                <button
                  type="button"
                  onClick={() => setNewBgSetup((v) => v + 5)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer select-none"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0c1527] hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Save Group
              </button>
              <button
                type="button"
                onClick={() => setIsAddingBg(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ============================================================== */}
      {/* ADD CONTENT PIPELINE FORM (ICON PICKER, NO COLOR PICKER)       */}
      {/* ============================================================== */}
      {isAddingCt && (
        <form
          onSubmit={handleCreateContentType}
          className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Create Content Pipeline
            </span>
            <button
              type="button"
              onClick={() => setIsAddingCt(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Pipeline Name
                </label>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                  {newCtName.length}/10
                </span>
              </div>
              <input
                type="text"
                maxLength={10}
                placeholder="e.g. YouTube, Shorts"
                value={newCtName}
                onChange={(e) => setNewCtName(e.target.value.slice(0, 10))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#46b1e1] bg-white font-semibold cursor-text"
                required
              />
            </div>

            <div className="md:col-span-7 space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Select Pipeline Icon (Rounded Square)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = newCtIcon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setNewCtIcon(item.name)}
                      title={item.label}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#0c1527] text-[#46b1e1] border-[#0c1527] shadow-sm scale-105'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/70">
            <button
              type="button"
              onClick={() => setIsAddingCt(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#0c1527] hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Create Pipeline
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* CONTENT PIPELINES SELECTOR (ROUNDED-SQUARE ICON CARDS)         */}
      {/* ============================================================== */}
      <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5">
        {contentTypes.map((ct) => {
          const isSelected = ct.id === (selectedContentType?.id || '');
          const PipelineIcon = getPipelineIconComponent(ct.icon);
          const totalMins = ct.tasks.reduce(
            (sum, t) => sum + t.durationMins + getResolvedSetup(t),
            0
          );

          return (
            <div
              key={ct.id}
              onClick={() => setActiveCtId(ct.id)}
              className={`group shrink-0 inline-flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border cursor-pointer transition-all select-none ${
                isSelected
                  ? 'border-[#0c1527] bg-[#0c1527] text-white shadow-md'
                  : 'border-slate-200/90 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              {/* Rounded-Square Pipeline Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                  isSelected
                    ? 'bg-[#46b1e1]/20 text-[#46b1e1] border border-[#46b1e1]/30'
                    : 'bg-slate-100 text-slate-700 border border-slate-200/70'
                }`}
              >
                <PipelineIcon className="w-4 h-4" />
              </div>

              <div className="min-w-0 pr-1">
                <div className="text-xs font-bold truncate max-w-[170px]">{ct.name}</div>
                <div
                  className={`text-[10px] font-medium tabular-nums mt-0.5 ${
                    isSelected ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {ct.tasks.length} stages • {formatDuration(totalMins)}/unit
                </div>
              </div>

              {/* Edit / Delete Pipeline Actions */}
              <div className="flex items-center gap-0.5 pl-1 border-l border-current/10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditCt(ct);
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isSelected
                      ? 'text-slate-300 hover:text-white hover:bg-white/10'
                      : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                  title={`Edit ${ct.name}`}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {contentTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteContentType(ct.id);
                    }}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isSelected
                        ? 'text-slate-300 hover:text-rose-400 hover:bg-white/10'
                        : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                    }`}
                    title={`Delete ${ct.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Pipeline Modal */}
      {editingCt && (
        <div className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <form
            onSubmit={handleSaveEditCt}
            className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl sm:max-w-md w-full p-5 pb-7 sm:pb-5 space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Customize Content Pipeline</h3>
              <button
                type="button"
                onClick={() => setEditingCt(null)}
                className="p-1.5 rounded-full bg-slate-100 sm:bg-transparent text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Pipeline Name
                </label>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                  {editCtName.length}/10
                </span>
              </div>
              <input
                type="text"
                maxLength={10}
                value={editCtName}
                onChange={(e) => setEditCtName(e.target.value.slice(0, 10))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#46b1e1] font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Pipeline Icon (Rounded Square)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PIPELINE_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = editCtIcon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setEditCtIcon(item.name)}
                      title={item.label}
                      className={`h-10 rounded-xl flex items-center justify-center border transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#0c1527] text-[#46b1e1] border-[#0c1527] shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCt(null)}
                className="px-3.5 py-2 sm:py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 sm:py-1.5 rounded-xl bg-[#0c1527] hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Save Pipeline
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* ACTIVE PIPELINE STAGE MATRIX & PROPORTIONAL ANATOMY BAR        */}
      {/* ============================================================== */}
      {!selectedContentType && !isAddingCt && (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center space-y-3">
          <div className="text-sm font-extrabold text-slate-800">
            No Content Pipelines Yet
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create your first content pipeline (e.g., YouTube, Shorts, Podcast) and add production stages to calculate lead times and batching setups.
          </p>
          <button
            type="button"
            onClick={() => setIsAddingCt(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c1527] hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#46b1e1]" />
            <span>Create First Pipeline</span>
          </button>
        </div>
      )}

      {selectedContentType && (
        <div className="space-y-5">
          {/* Proportional Pipeline Time Breakdown Bar */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-[#46b1e1]" />
                <span>1-Unit Production Anatomy:</span>
                <span className="font-[900] text-slate-900 tabular-nums">
                  {formatDuration(pipelineTotalTime)}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
                {formatDuration(pipelineTotalWork)} work +{' '}
                <span className="text-[#46b1e1] font-bold">
                  {formatDuration(pipelineTotalSetup)} unbatched setup
                </span>
              </div>
            </div>

            {/* Proportional Stacked Stage Segments */}
            {pipelineTotalTime > 0 && (
              <div className="w-full h-3 bg-slate-200/70 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {selectedContentType.tasks.map((t, i) => {
                  const segTotal = t.durationMins + getResolvedSetup(t);
                  const pct = Math.max(4, (segTotal / pipelineTotalTime) * 100);
                  const shades = [
                    '#0c1527',
                    '#2563eb',
                    '#46b1e1',
                    '#64748b',
                    '#8b5cf6',
                  ];
                  return (
                    <div
                      key={t.id}
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: shades[i % shades.length],
                      }}
                      title={`${t.name}: ${formatDuration(t.durationMins)} work + ${getResolvedSetup(t)}m setup`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* SMARTPHONE VIEW (< md): ACCORDION STAGE CARDS                */}
          {/* ============================================================ */}
          <div className="block md:hidden space-y-2.5">
            {selectedContentType.tasks.map((task, idx) => {
              const totalStages = selectedContentType.tasks.length;
              const cohortOffset = Math.max(1, totalStages - idx);
              const resolvedSetup = getResolvedSetup(task);
              const StageIcon = getStageIconComponent(task.icon || suggestStageIcon(task.name));
              const isExpanded = mobileExpandedTaskId === task.id;
              const isFirst = idx === 0;
              const isLast = idx === totalStages - 1;

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'border-[#46b1e1] bg-white shadow-md'
                      : 'border-slate-200/90 bg-white shadow-xs'
                  }`}
                >
                  {/* Compact 2-Line Header (Tap to Expand/Collapse) */}
                  <div
                    onClick={() =>
                      setMobileExpandedTaskId(isExpanded ? null : task.id)
                    }
                    className="p-3.5 flex items-center justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Circular Stage Icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIconPickerTaskId(task.id);
                        }}
                        className="w-9 h-9 rounded-full bg-[#0c1527] text-[#46b1e1] flex items-center justify-center shrink-0 shadow-xs"
                        title="Tap to change stage icon"
                      >
                        <StageIcon className="w-4 h-4" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {task.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px]">
                          <span className="px-2 py-0.2 rounded-full bg-sky-50 text-sky-800 font-bold border border-sky-200/70">
                            Week N-{cohortOffset}
                          </span>
                          <span className="font-bold text-slate-700 tabular-nums">
                            {formatDuration(task.durationMins)}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[#46b1e1] font-bold tabular-nums">
                            +{resolvedSetup}m setup
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isExpanded ? 'rotate-90 text-[#46b1e1]' : ''
                      }`}
                    />
                  </div>

                  {/* Expanded Touch-Friendly Editor */}
                  {isExpanded && (
                    <div className="px-3.5 pb-4 pt-2 border-t border-slate-100 space-y-3.5 bg-slate-50/40">
                      {/* Stage Name + Reorder/Delete */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => handleStageNameChange(task, e.target.value)}
                          className="flex-1 px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#46b1e1]"
                          placeholder="Stage Name"
                        />
                        <button
                          type="button"
                          onClick={() => handleMoveStage(idx, 'UP')}
                          disabled={isFirst}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStage(idx, 'DOWN')}
                          disabled={isLast}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        {totalStages > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteTaskFromContentType(selectedContentType.id, task.id)
                            }
                            className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Work Duration (5m) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Work Duration
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateTaskInContentType(selectedContentType.id, task.id, {
                                durationMins: Math.max(5, task.durationMins - 5),
                              })
                            }
                            className="w-10 h-9 rounded-xl bg-white border border-slate-200 font-extrabold text-slate-700"
                          >
                            -5
                          </button>
                          <input
                            type="text"
                            readOnly
                            value={`${task.durationMins}m (${formatDuration(task.durationMins)})`}
                            onKeyDown={(e) => e.preventDefault()}
                            className="flex-1 h-9 text-center font-bold text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none tabular-nums cursor-default caret-transparent select-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateTaskInContentType(selectedContentType.id, task.id, {
                                durationMins: task.durationMins + 5,
                              })
                            }
                            className="w-10 h-9 rounded-xl bg-white border border-slate-200 font-extrabold text-slate-700"
                          >
                            +5
                          </button>
                        </div>
                      </div>

                      {/* Batching Group Selector */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Batching Group (Setup Rig)
                          </label>
                          {autoMatchedTaskIds[task.id] && !task.batchGroupLocked && (
                            <span className="text-[10px] font-bold text-[#46b1e1] inline-flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> Auto-matched
                            </span>
                          )}
                        </div>
                        <select
                          value={task.batchGroupId || 'bg-none'}
                          onChange={(e) => handleBatchGroupSelect(task, e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 text-xs"
                        >
                          {batchingGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} ({g.setupBufferMins}m setup)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Resistance & Splittable */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Resistance
                          </label>
                          <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-slate-200">
                            {RESISTANCE_OPTIONS.map((opt) => (
                              <button
                                key={opt.level}
                                type="button"
                                onClick={() =>
                                  updateTaskInContentType(selectedContentType.id, task.id, {
                                    resistance: opt.level,
                                  })
                                }
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold ${
                                  task.resistance === opt.level
                                    ? 'bg-[#0c1527] text-white'
                                    : 'text-slate-600'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Splittable
                            </label>
                            <input
                              type="checkbox"
                              checked={task.isSplittable}
                              onChange={(e) =>
                                updateTaskInContentType(selectedContentType.id, task.id, {
                                  isSplittable: e.target.checked,
                                  minSplitChunkMins: task.minSplitChunkMins || 15,
                                })
                              }
                              className="accent-[#46b1e1] w-4 h-4"
                            />
                          </div>
                          {task.isSplittable ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateTaskInContentType(selectedContentType.id, task.id, {
                                    minSplitChunkMins: Math.max(5, task.minSplitChunkMins - 5),
                                  })
                                }
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold"
                              >
                                -
                              </button>
                              <span className="flex-1 text-center text-xs font-bold tabular-nums">
                                {task.minSplitChunkMins}m
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateTaskInContentType(selectedContentType.id, task.id, {
                                    minSplitChunkMins: task.minSplitChunkMins + 5,
                                  })
                                }
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <div className="h-8 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                              Continuous
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Eligible Zones */}
                      {zoneMode === 'SIMPLE' ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-[#46b1e1]" />
                          <span>Simple Mode: Runs in General Zone</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Eligible Zones
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {zones.map((zone) => {
                              const isEligible = task.eligibleZoneIds.includes(zone.id);
                              return (
                                <button
                                  key={zone.id}
                                  type="button"
                                  onClick={() => toggleTaskZone(task.id, zone.id)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border ${
                                    isEligible
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-white text-slate-500 border-slate-200'
                                  }`}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: zone.color }}
                                  />
                                  <span>{zone.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* PC VIEW (>= md): CONNECTED LEAD-TIME TIMELINE SPINE          */}
          {/* ============================================================ */}
          <div className="hidden md:block relative pl-14 space-y-3.5">
            {/* Vertical Timeline Spine Rail */}
            <div
              className="absolute left-5 top-5 bottom-8 w-0.5 bg-gradient-to-b from-[#0c1527] via-[#46b1e1] to-emerald-500 rounded-full"
              aria-hidden="true"
            />

            {selectedContentType.tasks.map((task, idx) => {
              const totalStages = selectedContentType.tasks.length;
              const cohortOffset = Math.max(1, totalStages - idx);
              const isFirst = idx === 0;
              const isLast = idx === totalStages - 1;
              const resolvedSetup = getResolvedSetup(task);
              const StageIcon = getStageIconComponent(task.icon || suggestStageIcon(task.name));
              const leadTimeLabel =
                cohortOffset === 1
                  ? '1 wk before publish'
                  : `${cohortOffset} wks before publish`;

              return (
                <div key={task.id} className="relative">
                  {/* Circular Stage Icon Node on Timeline Spine */}
                  <button
                    type="button"
                    onClick={() =>
                      setIconPickerTaskId(iconPickerTaskId === task.id ? null : task.id)
                    }
                    title="Click to change circular stage icon"
                    className="absolute -left-14 top-4 w-10 h-10 rounded-full bg-[#0c1527] hover:bg-slate-800 text-[#46b1e1] border-4 border-white shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-110 z-10"
                  >
                    <StageIcon className="w-4 h-4" />
                  </button>

                  {/* Stage Card (2-Row Streamlined Layout) */}
                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition shadow-sm space-y-3">
                    {/* ROW 1: Stage #, Name, Cohort Badge, Duration Stepper, Batching Group, Controls */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
                      {/* Left: Order + Editable Name + Cohort Pill */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                        <span className="text-[11px] font-[900] text-slate-400 tabular-nums select-none shrink-0">
                          {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => handleStageNameChange(task, e.target.value)}
                          className="text-sm font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-[#46b1e1] focus:outline-none px-1 py-0.5 bg-transparent cursor-text min-w-[140px] flex-1 max-w-[260px]"
                          placeholder="Stage name..."
                        />

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-900 border border-sky-200/60 shrink-0 select-none">
                          <Tag className="w-3 h-3 text-[#46b1e1]" />
                          <span>Week N-{cohortOffset}</span>
                          <span className="text-[10px] text-sky-600 font-medium hidden xl:inline">
                            ({leadTimeLabel})
                          </span>
                        </span>
                      </div>

                      {/* Right: Work Duration (5m) + Batching Group + Move/Delete */}
                      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                        {/* Work Duration Stepper */}
                        <div className="inline-flex items-center gap-1 bg-slate-50 px-1.5 py-1 rounded-xl border border-slate-200/80">
                          <span className="text-[10px] font-bold text-slate-400 uppercase px-1 select-none">
                            Work
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateTaskInContentType(selectedContentType.id, task.id, {
                                durationMins: Math.max(5, task.durationMins - 5),
                              })
                            }
                            className="w-6 h-6 rounded-lg bg-white border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer select-none text-xs"
                            title="Decrease duration by 5 mins"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            readOnly
                            value={formatDuration(task.durationMins)}
                            onKeyDown={(e) => e.preventDefault()}
                            className="w-14 text-center font-[900] text-slate-900 bg-transparent focus:outline-none tabular-nums cursor-default caret-transparent select-none text-xs"
                            title={`${task.durationMins} minutes`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateTaskInContentType(selectedContentType.id, task.id, {
                                durationMins: task.durationMins + 5,
                              })
                            }
                            className="w-6 h-6 rounded-lg bg-white border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer select-none text-xs"
                            title="Increase duration by 5 mins"
                          >
                            +
                          </button>
                        </div>

                        {/* Batching Group Selector + Auto-Match Indicator */}
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200/80">
                          <Zap className="w-3 h-3 text-[#46b1e1] shrink-0" />
                          <select
                            value={task.batchGroupId || 'bg-none'}
                            onChange={(e) => handleBatchGroupSelect(task, e.target.value)}
                            className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[165px]"
                            title="Select Batching Group (Setup Rig)"
                          >
                            {batchingGroups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name} ({g.setupBufferMins}m)
                              </option>
                            ))}
                          </select>
                          {autoMatchedTaskIds[task.id] && !task.batchGroupLocked && (
                            <span
                              className="px-1.5 py-0.2 rounded-md bg-sky-100 text-[#0c1527] text-[9px] font-extrabold select-none"
                              title="Auto-matched from stage name"
                            >
                              Auto
                            </span>
                          )}
                        </div>

                        {/* Stage Reorder & Delete */}
                        <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleMoveStage(idx, 'UP')}
                            disabled={isFirst}
                            className={`p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer ${
                              isFirst ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title="Move Stage Earlier"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStage(idx, 'DOWN')}
                            disabled={isLast}
                            className={`p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer ${
                              isLast ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title="Move Stage Later"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          {totalStages > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                deleteTaskFromContentType(selectedContentType.id, task.id)
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer"
                              title="Delete stage"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ROW 2: Eligible Zones + Resistance Pill + Inline Splittable Toggle */}
                    <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      {/* Left: Eligible Zones */}
                      {zoneMode === 'SIMPLE' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200/70 text-[11px] font-bold text-sky-900">
                          <span className="w-2 h-2 rounded-full bg-[#46b1e1]" />
                          <span>General Zone (Simple Mode)</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 select-none">
                            Zones:
                          </span>
                          {zones.map((zone) => {
                            const isEligible = task.eligibleZoneIds.includes(zone.id);
                            return (
                              <button
                                key={zone.id}
                                type="button"
                                onClick={() => toggleTaskZone(task.id, zone.id)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer select-none ${
                                  isEligible
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: zone.color }}
                                />
                                <span>{zone.name}</span>
                                {isEligible && <Check className="w-3 h-3 text-[#46b1e1]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Right: Resistance & Inline Splittable Control */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Resistance Segmented Control */}
                        <div className="inline-flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-slate-200/80">
                          <span className="text-[9px] font-bold uppercase text-slate-400 px-1.5 select-none">
                            Friction
                          </span>
                          {RESISTANCE_OPTIONS.map((opt) => {
                            const isSelected = task.resistance === opt.level;
                            return (
                              <button
                                key={opt.level}
                                type="button"
                                onClick={() =>
                                  updateTaskInContentType(selectedContentType.id, task.id, {
                                    resistance: opt.level,
                                  })
                                }
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer select-none ${
                                  isSelected
                                    ? 'bg-[#0c1527] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title={`Batch weight ${opt.mult}`}
                              >
                                {opt.label} ({opt.mult})
                              </button>
                            );
                          })}
                        </div>

                        {/* Inline Splittable Pill + 5m Chunk Stepper */}
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200/80">
                          <button
                            type="button"
                            onClick={() =>
                              updateTaskInContentType(selectedContentType.id, task.id, {
                                isSplittable: !task.isSplittable,
                                minSplitChunkMins: task.minSplitChunkMins || 15,
                              })
                            }
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg transition cursor-pointer select-none ${
                              task.isSplittable
                                ? 'bg-[#46b1e1] text-white'
                                : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800'
                            }`}
                            title="Toggle whether a single unit can be split across multiple slots"
                          >
                            {task.isSplittable ? (
                              <>
                                <Scissors className="w-3 h-3" />
                                <span>Split</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Continuous</span>
                              </>
                            )}
                          </button>

                          {task.isSplittable && (
                            <div className="inline-flex items-center gap-1 pl-1 border-l border-slate-200">
                              <button
                                type="button"
                                onClick={() =>
                                  updateTaskInContentType(selectedContentType.id, task.id, {
                                    minSplitChunkMins: Math.max(5, task.minSplitChunkMins - 5),
                                  })
                                }
                                className="w-5 h-5 rounded bg-white border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer select-none text-[11px]"
                                title="Decrease min chunk by 5m"
                              >
                                -
                              </button>
                              <input
                                type="text"
                                readOnly
                                value={`${task.minSplitChunkMins}m`}
                                onKeyDown={(e) => e.preventDefault()}
                                className="w-9 text-center font-bold text-slate-900 bg-transparent focus:outline-none tabular-nums cursor-default caret-transparent select-none text-[11px]"
                                title="Minimum chunk size"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateTaskInContentType(selectedContentType.id, task.id, {
                                    minSplitChunkMins: task.minSplitChunkMins + 5,
                                  })
                                }
                                className="w-5 h-5 rounded bg-white border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer select-none text-[11px]"
                                title="Increase min chunk by 5m"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Final Publish Anchor Node at Bottom of Timeline Spine */}
            <div className="relative pt-1">
              <div className="absolute -left-14 top-1 w-10 h-10 rounded-full bg-emerald-500 text-white border-4 border-white shadow-md flex items-center justify-center z-10">
                <Send className="w-4 h-4" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 inline-flex items-center gap-2 text-xs font-bold text-emerald-900 select-none">
                <span>Week N: Publish Ready</span>
                <span className="text-[11px] font-medium text-emerald-700">
                  — All {selectedContentType.tasks.length} stages maintain 1-week minimum lead times
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 1-CLICK QUICK STAGE TEMPLATES & ADD BAR                      */}
          {/* ============================================================ */}
          <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 select-none">
                Quick Add Stage:
              </span>
              {QUICK_STAGE_TEMPLATES.map((tpl) => {
                const TplIcon = getStageIconComponent(tpl.icon);
                return (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => handleAddStage(tpl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-sky-50 border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#0c1527] transition cursor-pointer shadow-xs select-none"
                  >
                    <TplIcon className="w-3 h-3 text-[#46b1e1]" />
                    <span>+ {tpl.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleAddStage()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0c1527] hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs select-none"
            >
              <Plus className="w-3.5 h-3.5 text-[#46b1e1]" />
              <span>Custom Stage</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CIRCULAR STAGE ICON PICKER MODAL / POPOVER                     */}
      {/* ============================================================== */}
      {iconPickerTaskId && selectedContentType && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setIconPickerTaskId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl sm:max-w-md w-full p-5 pb-7 sm:pb-5 space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-[900] text-slate-900">
                  Choose Stage Icon (Circular)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Relevant creator task icons organized by production phase
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIconPickerTaskId(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {STAGE_ICON_CATEGORIES.map((group) => (
                <div key={group.category} className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.category}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {group.icons.map((item) => {
                      const IconComp = item.icon;
                      const currentTask = selectedContentType.tasks.find(
                        (t) => t.id === iconPickerTaskId
                      );
                      const isSelected = currentTask?.icon === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleSelectStageIcon(iconPickerTaskId, item.name)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#0c1527] text-white border-[#0c1527] shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-200'
                          }`}
                          title={item.label}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#46b1e1]/20 text-[#46b1e1]'
                                : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-semibold truncate w-full text-center">
                            {item.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
