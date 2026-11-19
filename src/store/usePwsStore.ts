import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import {
  BatchingGroup,
  CalendarSlot,
  ContentType,
  DayOfWeek,
  SandboxSettings,
  SolverResult,
  WorkflowTaskConfig,
  Zone,
} from '../types/pws';
import { solvePinnedWeek } from '../lib/solver';

export const GENERAL_ZONE: Zone = {
  id: 'zone-general',
  name: 'General Zone',
  color: '#46b1e1',
  icon: 'Clock',
};

// Default Creator Demo Preset Configuration
export const CREATOR_DEMO_PRESET = {
  batchingGroups: [
    {
      id: 'bg-none',
      name: 'Instant / No Setup',
      setupBufferMins: 0,
    },
    {
      id: 'bg-camera',
      name: 'Studio Camera Rig',
      setupBufferMins: 30,
    },
    {
      id: 'bg-edit',
      name: 'Editing & Post Suite',
      setupBufferMins: 20,
    },
    {
      id: 'bg-write',
      name: 'Deep Writing Flow',
      setupBufferMins: 15,
    },
    {
      id: 'bg-publish',
      name: 'Packaging & Admin',
      setupBufferMins: 10,
    },
  ] as BatchingGroup[],

  zones: [
    {
      id: 'zone-studio',
      name: 'Studio / Filming',
      color: '#46b1e1',
      icon: 'Camera',
    },
    {
      id: 'zone-desk',
      name: 'Deep Focus Desk',
      color: '#8b5cf6',
      icon: 'Laptop',
    },
    {
      id: 'zone-mobile',
      name: 'Commute / Cafe',
      color: '#f59e0b',
      icon: 'Coffee',
    },
    {
      id: 'zone-admin',
      name: 'Evening Admin & Chill',
      color: '#10b981',
      icon: 'CheckSquare',
    },
  ] as Zone[],

  calendarSlots: [
    // Monday
    { id: 'slot-mon-1', day: 'MON', startMinute: 540, endMinute: 720, zoneId: 'zone-desk' },     // 09:00 - 12:00 (180m)
    { id: 'slot-mon-2', day: 'MON', startMinute: 780, endMinute: 960, zoneId: 'zone-studio' },   // 13:00 - 16:00 (180m)
    { id: 'slot-mon-3', day: 'MON', startMinute: 990, endMinute: 1110, zoneId: 'zone-mobile' },  // 16:30 - 18:30 (120m)

    // Tuesday
    { id: 'slot-tue-1', day: 'TUE', startMinute: 540, endMinute: 780, zoneId: 'zone-desk' },     // 09:00 - 13:00 (240m)
    { id: 'slot-tue-2', day: 'TUE', startMinute: 840, endMinute: 1020, zoneId: 'zone-studio' },  // 14:00 - 17:00 (180m)

    // Wednesday
    { id: 'slot-wed-1', day: 'WED', startMinute: 540, endMinute: 780, zoneId: 'zone-desk' },     // 09:00 - 13:00 (240m)
    { id: 'slot-wed-2', day: 'WED', startMinute: 840, endMinute: 1020, zoneId: 'zone-mobile' },  // 14:00 - 17:00 (180m)

    // Thursday
    { id: 'slot-thu-1', day: 'THU', startMinute: 540, endMinute: 750, zoneId: 'zone-desk' },     // 09:00 - 12:30 (210m)
    { id: 'slot-thu-2', day: 'THU', startMinute: 810, endMinute: 990, zoneId: 'zone-studio' },   // 13:30 - 16:30 (180m)

    // Friday
    { id: 'slot-fri-1', day: 'FRI', startMinute: 540, endMinute: 750, zoneId: 'zone-desk' },     // 09:00 - 12:30 (210m)
    { id: 'slot-fri-2', day: 'FRI', startMinute: 810, endMinute: 930, zoneId: 'zone-admin' },    // 13:30 - 15:30 (120m)

    // Saturday
    { id: 'slot-sat-1', day: 'SAT', startMinute: 600, endMinute: 750, zoneId: 'zone-mobile' },   // 10:00 - 12:30 (150m)
  ] as CalendarSlot[],

  contentTypes: [
    {
      id: 'ct-longform',
      name: 'Long-Form YouTube',
      color: '#ef4444',
      icon: 'MonitorPlay',
      priorityRank: 1,
      minWeeklyUnits: 1,
      targetWeeklyUnits: 1,
      tasks: [
        {
          id: 'task-lf-1',
          name: 'Script & Structure',
          icon: 'PenTool',
          stageOrder: 1,
          durationMins: 120,
          batchGroupId: 'bg-write',
          setupBufferMins: 15,
          isSplittable: true,
          minSplitChunkMins: 60,
          resistance: 'HIGH',
          eligibleZoneIds: ['zone-desk', 'zone-mobile'],
        },
        {
          id: 'task-lf-2',
          name: 'Studio Production & A-Roll',
          icon: 'Camera',
          stageOrder: 2,
          durationMins: 120,
          batchGroupId: 'bg-camera',
          setupBufferMins: 30,
          isSplittable: false,
          minSplitChunkMins: 60,
          resistance: 'HIGH',
          eligibleZoneIds: ['zone-studio'],
        },
        {
          id: 'task-lf-3',
          name: 'Rough Cut & Sound Design',
          icon: 'Scissors',
          stageOrder: 3,
          durationMins: 180,
          batchGroupId: 'bg-edit',
          setupBufferMins: 20,
          isSplittable: true,
          minSplitChunkMins: 60,
          resistance: 'MEDIUM',
          eligibleZoneIds: ['zone-desk'],
        },
        {
          id: 'task-lf-4',
          name: 'Packaging, Thumbnail & Schedule',
          icon: 'Wand2',
          stageOrder: 4,
          durationMins: 60,
          batchGroupId: 'bg-publish',
          setupBufferMins: 10,
          isSplittable: false,
          minSplitChunkMins: 30,
          resistance: 'LOW',
          eligibleZoneIds: ['zone-desk', 'zone-mobile', 'zone-admin'],
        },
      ],
    },
    {
      id: 'ct-shorts',
      name: 'Vertical Shorts / Reels',
      color: '#46b1e1',
      icon: 'Smartphone',
      priorityRank: 2,
      minWeeklyUnits: 2,
      targetWeeklyUnits: 3,
      tasks: [
        {
          id: 'task-vs-1',
          name: 'Hook Writing & Formats',
          icon: 'Lightbulb',
          stageOrder: 1,
          durationMins: 30,
          batchGroupId: 'bg-write',
          setupBufferMins: 15,
          isSplittable: false,
          minSplitChunkMins: 20,
          resistance: 'LOW',
          eligibleZoneIds: ['zone-mobile', 'zone-desk'],
        },
        {
          id: 'task-vs-2',
          name: 'Batch Record Shorts',
          icon: 'Clapperboard',
          stageOrder: 2,
          durationMins: 40,
          batchGroupId: 'bg-camera',
          setupBufferMins: 30,
          isSplittable: false,
          minSplitChunkMins: 30,
          resistance: 'MEDIUM',
          eligibleZoneIds: ['zone-studio'],
        },
        {
          id: 'task-vs-3',
          name: 'Captions & Quick Polish',
          icon: 'Sliders',
          stageOrder: 3,
          durationMins: 40,
          batchGroupId: 'bg-edit',
          setupBufferMins: 20,
          isSplittable: true,
          minSplitChunkMins: 20,
          resistance: 'LOW',
          eligibleZoneIds: ['zone-desk', 'zone-admin'],
        },
      ],
    },
    {
      id: 'ct-podcast',
      name: 'Weekly Podcast & Newsletter',
      color: '#10b981',
      icon: 'Mic',
      priorityRank: 3,
      minWeeklyUnits: 1,
      targetWeeklyUnits: 1,
      tasks: [
        {
          id: 'task-pod-1',
          name: 'Topic Deep-Dive & Outline',
          icon: 'Search',
          stageOrder: 1,
          durationMins: 60,
          batchGroupId: 'bg-write',
          setupBufferMins: 15,
          isSplittable: false,
          minSplitChunkMins: 30,
          resistance: 'MEDIUM',
          eligibleZoneIds: ['zone-desk', 'zone-mobile'],
        },
        {
          id: 'task-pod-2',
          name: 'Record Episode & Interview',
          icon: 'Mic',
          stageOrder: 2,
          durationMins: 60,
          batchGroupId: 'bg-camera',
          setupBufferMins: 30,
          isSplittable: false,
          minSplitChunkMins: 30,
          resistance: 'HIGH',
          eligibleZoneIds: ['zone-studio'],
        },
        {
          id: 'task-pod-3',
          name: 'Audio Polish & Newsletter Writeup',
          icon: 'Send',
          stageOrder: 3,
          durationMins: 50,
          batchGroupId: 'bg-edit',
          setupBufferMins: 20,
          isSplittable: false,
          minSplitChunkMins: 30,
          resistance: 'LOW',
          eligibleZoneIds: ['zone-desk', 'zone-admin'],
        },
      ],
    },
  ] as ContentType[],

  sandboxSettings: {
    batchingPreference: 100,
    cohortProximityBias: 60,
    surplusMode: 'KEEP_SLACK',
  } as SandboxSettings,
};

// Custom IndexedDB StateStorage implementation with SSR safety fallback
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const val = await get(name);
      return val || null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await set(name, value);
    } catch {
      // Fallback or ignore in restricted iframe/private storage
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await del(name);
    } catch {
      // Ignore
    }
  },
};

export interface PwsState {
  zoneMode: 'SIMPLE' | 'CUSTOM';
  batchingGroups: BatchingGroup[];
  zones: Zone[];
  calendarSlots: CalendarSlot[];
  contentTypes: ContentType[];
  sandboxSettings: SandboxSettings;
  solverResult: SolverResult;
  isHydrated: boolean;
  currentStep: number;

  // Actions
  setCurrentStep: (step: number) => void;
  setZoneMode: (mode: 'SIMPLE' | 'CUSTOM') => void;
  runSolver: () => void;
  setTargetWeeklyUnits: (contentTypeId: string, units: number) => void;
  setMinWeeklyUnits: (contentTypeId: string, units: number) => void;
  setBatchingPreference: (value: number) => void;
  setCohortProximityBias: (value: number) => void;
  setSurplusMode: (mode: 'KEEP_SLACK' | 'AUTO_SUGGEST_ONLY') => void;

  // Batching Group Management
  addBatchingGroup: (group: BatchingGroup) => void;
  updateBatchingGroup: (groupId: string, partial: Partial<BatchingGroup>) => void;
  deleteBatchingGroup: (groupId: string) => void;

  // Zone Management
  addZone: (zone: Zone) => void;
  updateZone: (zoneId: string, partial: Partial<Zone>) => void;
  deleteZone: (zoneId: string) => void;

  // Calendar Slot Management
  addCalendarSlot: (slot: CalendarSlot) => void;
  addContinuousBlock: (days: DayOfWeek[], zoneId: string, durationMins: number) => void;
  resizeCalendarSlot: (slotId: string, newDurationMins: number, newZoneId?: string) => void;
  mergeCalendarSlots: (slotIdA: string, slotIdB: string) => void;
  updateCalendarSlot: (slotId: string, partial: Partial<CalendarSlot>) => void;
  deleteCalendarSlot: (slotId: string) => void;
  clearAllCalendarSlots: () => void;

  // Content Type & Workflow Management
  addContentType: (contentType: ContentType) => void;
  updateContentType: (contentTypeId: string, partial: Partial<ContentType>) => void;
  deleteContentType: (contentTypeId: string) => void;
  addTaskToContentType: (contentTypeId: string, task: WorkflowTaskConfig) => void;
  updateTaskInContentType: (contentTypeId: string, taskId: string, partial: Partial<WorkflowTaskConfig>) => void;
  deleteTaskFromContentType: (contentTypeId: string, taskId: string) => void;

  // Presets & Persistence
  startFromScratch: () => void;
  loadCreatorDemoPreset: () => void;
  resetToMinConstraints: () => void;
  exportStateToJson: () => string;
  importStateFromJson: (jsonStr: string) => boolean;
  setHydrated: (hydrated: boolean) => void;
}

// Initial default run with preset
const initialSolverResult = solvePinnedWeek(
  CREATOR_DEMO_PRESET.zones,
  CREATOR_DEMO_PRESET.calendarSlots,
  CREATOR_DEMO_PRESET.contentTypes,
  CREATOR_DEMO_PRESET.sandboxSettings,
  CREATOR_DEMO_PRESET.batchingGroups
);

export const usePwsStore = create<PwsState>()(
  persist(
    (set, get) => ({
      zoneMode: 'CUSTOM',
      batchingGroups: CREATOR_DEMO_PRESET.batchingGroups,
      zones: CREATOR_DEMO_PRESET.zones,
      calendarSlots: CREATOR_DEMO_PRESET.calendarSlots,
      contentTypes: CREATOR_DEMO_PRESET.contentTypes,
      sandboxSettings: CREATOR_DEMO_PRESET.sandboxSettings,
      solverResult: initialSolverResult,
      isHydrated: false,
      currentStep: 0,

      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),
      setCurrentStep: (step: number) => set({ currentStep: Math.max(0, Math.min(4, step)) }),

      setZoneMode: (mode: 'SIMPLE' | 'CUSTOM') => {
        set((state) => {
          if (state.zoneMode === mode) return state;

          if (mode === 'SIMPLE') {
            return {
              zoneMode: 'SIMPLE',
              zones: [GENERAL_ZONE],
              calendarSlots: state.calendarSlots.map((s) => ({
                ...s,
                zoneId: GENERAL_ZONE.id,
              })),
              contentTypes: state.contentTypes.map((ct) => ({
                ...ct,
                tasks: ct.tasks.map((t) => ({
                  ...t,
                  eligibleZoneIds: [GENERAL_ZONE.id],
                })),
              })),
            };
          }

          // Switching to CUSTOM mode: if only General Zone exists, start custom zones clean
          const onlyGeneral =
            state.zones.length === 1 && state.zones[0].id === GENERAL_ZONE.id;
          return {
            zoneMode: 'CUSTOM',
            zones: onlyGeneral ? [] : state.zones,
            calendarSlots: onlyGeneral ? [] : state.calendarSlots,
            contentTypes: onlyGeneral
              ? state.contentTypes.map((ct) => ({
                  ...ct,
                  tasks: ct.tasks.map((t) => ({
                    ...t,
                    eligibleZoneIds: [],
                  })),
                }))
              : state.contentTypes,
          };
        });
        get().runSolver();
      },

      runSolver: () => {
        const { zones, calendarSlots, contentTypes, sandboxSettings, batchingGroups } = get();
        const result = solvePinnedWeek(
          zones,
          calendarSlots,
          contentTypes,
          sandboxSettings,
          batchingGroups
        );
        set({ solverResult: result });
      },

      addBatchingGroup: (group: BatchingGroup) => {
        set((state) => ({ batchingGroups: [...state.batchingGroups, group] }));
        get().runSolver();
      },

      updateBatchingGroup: (groupId: string, partial: Partial<BatchingGroup>) => {
        set((state) => {
          const updatedGroups = state.batchingGroups.map((g) =>
            g.id === groupId ? { ...g, ...partial } : g
          );
          const updatedGroup = updatedGroups.find((g) => g.id === groupId);

          // Sync setupBufferMins across all tasks belonging to this BatchingGroup
          const updatedContentTypes =
            updatedGroup && partial.setupBufferMins !== undefined
              ? state.contentTypes.map((ct) => ({
                  ...ct,
                  tasks: ct.tasks.map((t) =>
                    t.batchGroupId === groupId
                      ? { ...t, setupBufferMins: updatedGroup.setupBufferMins }
                      : t
                  ),
                }))
              : state.contentTypes;

          return {
            batchingGroups: updatedGroups,
            contentTypes: updatedContentTypes,
          };
        });
        get().runSolver();
      },

      deleteBatchingGroup: (groupId: string) => {
        if (groupId === 'bg-none') return;
        set((state) => ({
          batchingGroups: state.batchingGroups.filter((g) => g.id !== groupId),
          contentTypes: state.contentTypes.map((ct) => ({
            ...ct,
            tasks: ct.tasks.map((t) =>
              t.batchGroupId === groupId
                ? { ...t, batchGroupId: 'bg-none', setupBufferMins: 0 }
                : t
            ),
          })),
        }));
        get().runSolver();
      },

      setTargetWeeklyUnits: (contentTypeId: string, units: number) => {
        const nextUnits = Math.max(0, units);
        const { contentTypes } = get();
        const updated = contentTypes.map((ct) =>
          ct.id === contentTypeId ? { ...ct, targetWeeklyUnits: nextUnits } : ct
        );
        set({ contentTypes: updated });
        get().runSolver();
      },

      setMinWeeklyUnits: (contentTypeId: string, units: number) => {
        const nextMin = Math.max(0, units);
        const { contentTypes } = get();
        const updated = contentTypes.map((ct) =>
          ct.id === contentTypeId
            ? {
                ...ct,
                minWeeklyUnits: nextMin,
                targetWeeklyUnits: Math.max(ct.targetWeeklyUnits, nextMin),
              }
            : ct
        );
        set({ contentTypes: updated });
        get().runSolver();
      },

      setBatchingPreference: (value: number) => {
        const clamped = Math.min(100, Math.max(0, value));
        set((state) => ({
          sandboxSettings: { ...state.sandboxSettings, batchingPreference: clamped },
        }));
        get().runSolver();
      },

      setCohortProximityBias: (value: number) => {
        const clamped = Math.min(100, Math.max(0, value));
        set((state) => ({
          sandboxSettings: { ...state.sandboxSettings, cohortProximityBias: clamped },
        }));
        get().runSolver();
      },

      setSurplusMode: (mode: 'KEEP_SLACK' | 'AUTO_SUGGEST_ONLY') => {
        set((state) => ({
          sandboxSettings: { ...state.sandboxSettings, surplusMode: mode },
        }));
        get().runSolver();
      },

      addZone: (zone: Zone) => {
        set((state) => ({ zones: [...state.zones, zone] }));
        get().runSolver();
      },

      updateZone: (zoneId: string, partial: Partial<Zone>) => {
        set((state) => ({
          zones: state.zones.map((z) => (z.id === zoneId ? { ...z, ...partial } : z)),
        }));
        get().runSolver();
      },

      deleteZone: (zoneId: string) => {
        set((state) => ({
          zones: state.zones.filter((z) => z.id !== zoneId),
          calendarSlots: state.calendarSlots.filter((s) => s.zoneId !== zoneId),
          contentTypes: state.contentTypes.map((ct) => ({
            ...ct,
            tasks: ct.tasks.map((t) => ({
              ...t,
              eligibleZoneIds: t.eligibleZoneIds.filter((id) => id !== zoneId),
            })),
          })),
        }));
        get().runSolver();
      },

      addCalendarSlot: (slot: CalendarSlot) => {
        set((state) => ({ calendarSlots: [...state.calendarSlots, slot] }));
        get().runSolver();
      },

      addContinuousBlock: (days: DayOfWeek[], zoneId: string, durationMins: number) => {
        const safeDuration = Math.max(15, Math.round(durationMins / 15) * 15);
        set((state) => {
          const nextSlots = [...state.calendarSlots];
          for (const day of days) {
            const daySlots = nextSlots.filter((s) => s.day === day);
            const nextStart =
              daySlots.length > 0 ? Math.max(...daySlots.map((s) => s.endMinute)) : 0;
            nextSlots.push({
              id: `slot-${day}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              day,
              startMinute: nextStart,
              endMinute: nextStart + safeDuration,
              zoneId,
            });
          }
          return { calendarSlots: nextSlots };
        });
        get().runSolver();
      },

      resizeCalendarSlot: (slotId: string, newDurationMins: number, newZoneId?: string) => {
        const safeDuration = Math.max(15, Math.round(newDurationMins / 15) * 15);
        set((state) => {
          const target = state.calendarSlots.find((s) => s.id === slotId);
          if (!target) return state;

          // Repack all slots on target.day sequentially so durations never collide
          const daySlots = state.calendarSlots
            .filter((s) => s.day === target.day)
            .sort((a, b) => a.startMinute - b.startMinute);

          let cursor = 0;
          const repackedMap = new Map<string, CalendarSlot>();
          for (const s of daySlots) {
            const dur = s.id === slotId ? safeDuration : Math.max(15, s.endMinute - s.startMinute);
            repackedMap.set(s.id, {
              ...s,
              startMinute: cursor,
              endMinute: cursor + dur,
              zoneId: s.id === slotId && newZoneId ? newZoneId : s.zoneId,
            });
            cursor += dur;
          }

          return {
            calendarSlots: state.calendarSlots.map((s) => repackedMap.get(s.id) || s),
          };
        });
        get().runSolver();
      },

      mergeCalendarSlots: (slotIdA: string, slotIdB: string) => {
        set((state) => {
          const slotA = state.calendarSlots.find((s) => s.id === slotIdA);
          const slotB = state.calendarSlots.find((s) => s.id === slotIdB);
          if (!slotA || !slotB || slotA.day !== slotB.day) return state;

          const durA = slotA.endMinute - slotA.startMinute;
          const durB = slotB.endMinute - slotB.startMinute;
          const combinedDur = durA + durB;

          const remaining = state.calendarSlots.filter((s) => s.id !== slotIdB);
          const daySlots = remaining
            .filter((s) => s.day === slotA.day)
            .sort((a, b) => a.startMinute - b.startMinute);

          let cursor = 0;
          const repackedMap = new Map<string, CalendarSlot>();
          for (const s of daySlots) {
            const dur = s.id === slotIdA ? combinedDur : Math.max(15, s.endMinute - s.startMinute);
            repackedMap.set(s.id, {
              ...s,
              startMinute: cursor,
              endMinute: cursor + dur,
            });
            cursor += dur;
          }

          return {
            calendarSlots: remaining.map((s) => repackedMap.get(s.id) || s),
          };
        });
        get().runSolver();
      },

      updateCalendarSlot: (slotId: string, partial: Partial<CalendarSlot>) => {
        set((state) => ({
          calendarSlots: state.calendarSlots.map((s) =>
            s.id === slotId ? { ...s, ...partial } : s
          ),
        }));
        get().runSolver();
      },

      deleteCalendarSlot: (slotId: string) => {
        set((state) => ({
          calendarSlots: state.calendarSlots.filter((s) => s.id !== slotId),
        }));
        get().runSolver();
      },

      clearAllCalendarSlots: () => {
        set({ calendarSlots: [] });
        get().runSolver();
      },

      addContentType: (contentType: ContentType) => {
        set((state) => ({ contentTypes: [...state.contentTypes, contentType] }));
        get().runSolver();
      },

      updateContentType: (contentTypeId: string, partial: Partial<ContentType>) => {
        set((state) => ({
          contentTypes: state.contentTypes.map((ct) =>
            ct.id === contentTypeId ? { ...ct, ...partial } : ct
          ),
        }));
        get().runSolver();
      },

      deleteContentType: (contentTypeId: string) => {
        set((state) => ({
          contentTypes: state.contentTypes.filter((ct) => ct.id !== contentTypeId),
        }));
        get().runSolver();
      },

      addTaskToContentType: (contentTypeId: string, task: WorkflowTaskConfig) => {
        set((state) => {
          const group = task.batchGroupId
            ? state.batchingGroups.find((g) => g.id === task.batchGroupId)
            : undefined;
          const syncedTask = group
            ? { ...task, setupBufferMins: group.setupBufferMins }
            : task;
          return {
            contentTypes: state.contentTypes.map((ct) =>
              ct.id === contentTypeId
                ? {
                    ...ct,
                    tasks: [...ct.tasks, syncedTask].sort((a, b) => a.stageOrder - b.stageOrder),
                  }
                : ct
            ),
          };
        });
        get().runSolver();
      },

      updateTaskInContentType: (
        contentTypeId: string,
        taskId: string,
        partial: Partial<WorkflowTaskConfig>
      ) => {
        set((state) => {
          let nextPartial = { ...partial };
          if (partial.batchGroupId !== undefined) {
            const group = state.batchingGroups.find((g) => g.id === partial.batchGroupId);
            if (group) {
              nextPartial.setupBufferMins = group.setupBufferMins;
            }
          }
          return {
            contentTypes: state.contentTypes.map((ct) =>
              ct.id === contentTypeId
                ? {
                    ...ct,
                    tasks: ct.tasks
                      .map((t) => (t.id === taskId ? { ...t, ...nextPartial } : t))
                      .sort((a, b) => a.stageOrder - b.stageOrder),
                  }
                : ct
            ),
          };
        });
        get().runSolver();
      },

      deleteTaskFromContentType: (contentTypeId: string, taskId: string) => {
        set((state) => ({
          contentTypes: state.contentTypes.map((ct) => {
            if (ct.id !== contentTypeId) return ct;
            const remaining = ct.tasks
              .filter((t) => t.id !== taskId)
              .sort((a, b) => a.stageOrder - b.stageOrder)
              .map((t, idx) => ({ ...t, stageOrder: idx + 1 }));
            return { ...ct, tasks: remaining };
          }),
        }));
        get().runSolver();
      },

      startFromScratch: () => {
        set({
          zoneMode: 'CUSTOM',
          batchingGroups: [CREATOR_DEMO_PRESET.batchingGroups[0]],
          zones: [],
          calendarSlots: [],
          contentTypes: [],
          sandboxSettings: {
            batchingPreference: 100,
            cohortProximityBias: 60,
            surplusMode: 'KEEP_SLACK',
          },
        });
        get().runSolver();
      },

      loadCreatorDemoPreset: () => {
        set({
          zoneMode: 'CUSTOM',
          batchingGroups: CREATOR_DEMO_PRESET.batchingGroups,
          zones: CREATOR_DEMO_PRESET.zones,
          calendarSlots: CREATOR_DEMO_PRESET.calendarSlots,
          contentTypes: CREATOR_DEMO_PRESET.contentTypes,
          sandboxSettings: CREATOR_DEMO_PRESET.sandboxSettings,
        });
        get().runSolver();
      },

      resetToMinConstraints: () => {
        set((state) => ({
          contentTypes: state.contentTypes.map((ct) => ({
            ...ct,
            targetWeeklyUnits: ct.minWeeklyUnits,
          })),
        }));
        get().runSolver();
      },

      exportStateToJson: () => {
        const { batchingGroups, zones, calendarSlots, contentTypes, sandboxSettings } = get();
        return JSON.stringify(
          {
            version: '1.1.0',
            exportedAt: new Date().toISOString(),
            data: { batchingGroups, zones, calendarSlots, contentTypes, sandboxSettings },
          },
          null,
          2
        );
      },

      importStateFromJson: (jsonStr: string) => {
        try {
          const parsed = JSON.parse(jsonStr);
          const data = parsed.data || parsed;
          if (
            Array.isArray(data.zones) &&
            Array.isArray(data.calendarSlots) &&
            Array.isArray(data.contentTypes)
          ) {
            set({
              batchingGroups:
                Array.isArray(data.batchingGroups) && data.batchingGroups.length > 0
                  ? data.batchingGroups
                  : CREATOR_DEMO_PRESET.batchingGroups,
              zones: data.zones,
              calendarSlots: data.calendarSlots,
              contentTypes: data.contentTypes,
              sandboxSettings: data.sandboxSettings || CREATOR_DEMO_PRESET.sandboxSettings,
            });
            get().runSolver();
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'pws-store-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        zoneMode: state.zoneMode,
        batchingGroups: state.batchingGroups,
        zones: state.zones,
        calendarSlots: state.calendarSlots,
        contentTypes: state.contentTypes,
        sandboxSettings: state.sandboxSettings,
        currentStep: state.currentStep,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!Array.isArray(state.batchingGroups) || state.batchingGroups.length === 0) {
            state.batchingGroups = CREATOR_DEMO_PRESET.batchingGroups;
          }
          state.setHydrated(true);
          state.runSolver();
        }
      },
    }
  )
);
