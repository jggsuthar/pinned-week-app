export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type ResistanceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const DAYS_OF_WEEK: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const RESISTANCE_MULTIPLIERS: Record<ResistanceLevel, number> = {
  LOW: 1.0,
  MEDIUM: 2.0,
  HIGH: 3.5,
};

export interface Zone {
  id: string;
  name: string;        // e.g., "Studio / filming", "Deep Focus Desk", "Commute / Cafe", "Evening Chill"
  color: string;       // Hex or Tailwind accent palette
  icon?: string;
}

export interface CalendarSlot {
  id: string;
  day: DayOfWeek;
  startMinute: number; // Minutes from 00:00 (must be a multiple of 10, e.g., 540 = 09:00)
  endMinute: number;   // Minutes from 00:00 (must be a multiple of 10, e.g., 720 = 12:00)
  zoneId: string;
}

export interface BatchingGroup {
  id: string;
  name: string;        // e.g., "Studio Camera Rig", "Editing Suite", "Deep Writing Flow"
  setupBufferMins: number; // Setup/context-switch penalty in 5-min increments
  color?: string;
}

export interface WorkflowTaskConfig {
  id: string;
  name: string;                  // e.g., "Script", "Shoot", "Edit", "Thumbnail & Schedule"
  icon?: string;                 // Lucide icon name from Creator Stage Icon Library
  stageOrder: number;            // 1-indexed order in the content workflow (1 = earliest, K = closest to publish)
  durationMins: number;          // Multiple of 5 (e.g., 25, 30, 60 mins per unit)
  batchGroupId?: string;         // Shared Setup Family / Batching Group ID for cross-pipeline batching
  batchGroupLocked?: boolean;    // True if user manually chose the Batching Group (prevents auto-overwrite)
  setupBufferMins: number;       // Context-switching / setup penalty in 5-min increments (synced from BatchingGroup if assigned)
  isSplittable: boolean;         // Can a single unit's duration be split across non-contiguous slots?
  minSplitChunkMins: number;     // Minimum chunk size if split (multiple of 5, e.g., 5, 10, 15, 20 mins)
  resistance: ResistanceLevel;   // LOW = 1.0x batch weight, MEDIUM = 2.0x, HIGH = 3.5x
  eligibleZoneIds: string[];     // Multi-zone support: task can be placed in ANY of these zones
}

export interface ContentType {
  id: string;
  name: string;                  // e.g., "Long-Form YouTube", "Vertical Shorts", "Podcast"
  color: string;
  icon?: string;                 // Lucide icon name for rounded-square pipeline badge
  priorityRank: number;          // 1 = highest priority for surplus auto-fill
  minWeeklyUnits: number;        // Hard minimum constraint (e.g., min 1 Long-Form/week)
  targetWeeklyUnits: number;     // Dynamic sandbox slider value (user plays with this in real time)
  tasks: WorkflowTaskConfig[];   // Ordered workflow stages
}

export interface SandboxSettings {
  batchingPreference: number;    // 0 to 100 slider (Soft weight for grouping identical tasks together)
  cohortProximityBias: number;   // 0 to 100 slider (Soft weight preferring earlier days for N+1 tasks)
  surplusMode: 'KEEP_SLACK' | 'AUTO_SUGGEST_ONLY';
}

// ==========================================
// SOLVER OUTPUT & TIMETABLE SCHEDULING TYPES
// ==========================================

export interface ScheduledTaskBlock {
  id: string;
  calendarSlotId: string;
  day: DayOfWeek;
  startMinute: number;
  endMinute: number;
  durationMins: number; // Task work duration (excluding setup buffer)
  setupBufferMins: number; // Charged setup buffer for this block (0 if amortized in continuation)
  totalBlockMins: number; // durationMins + setupBufferMins
  zoneId: string;
  
  // Pipeline metadata
  contentTypeId: string;
  contentTypeName: string;
  contentTypeColor: string;
  taskId: string;
  taskName: string;
  stageOrder: number;
  totalStages: number;
  cohortOffset: number; // Offset from publishing: K - stageOrder + 1 (e.g., 4 for Week N-4)
  cohortLabel: string;  // e.g. "Week N-4"
  
  // Batching info
  batchGroupId?: string;
  batchGroupName?: string;
  unitCount: number;    // How many units of this task are bundled here
  isContiguousBatch: boolean;
  isSharedGroupContinuation?: boolean; // True if setup was amortized by chaining onto another task in the same BatchingGroup
  isPartialChunk: boolean;
  unitIndices: number[]; // e.g. [0, 1] meaning units #1 and #2 of this task
}

export interface UnscheduledTask {
  contentTypeId: string;
  contentTypeName: string;
  taskId: string;
  taskName: string;
  stageOrder: number;
  unitIndex: number;
  missingMinutes: number;
  reason: string;
}

export interface SwapLogEntry {
  displacedTaskId: string;
  displacedTaskName: string;
  fromZoneId: string;
  toZoneId: string;
  slotId: string;
  minutesVacated: number;
  hopCount: number; // 1 for direct X->Y, 2 for X->Y->Z
  reason: string;
}

export interface ZoneUtilization {
  zoneId: string;
  zoneName: string;
  totalAvailableMinutes: number;
  taskDurationMinutes: number;
  setupBufferMinutes: number;
  totalAllocatedMinutes: number; // taskDurationMinutes + setupBufferMinutes
  remainingFreeMinutes: number;
  shiftableMinutes: number;      // Minutes currently in this zone that can relocate to another zone
  utilizationPercent: number;    // (totalAllocatedMinutes / totalAvailableMinutes) * 100
  isBottleneck: boolean;         // True if this zone is the limiting constraint
}

export interface BatchingMetrics {
  batchingScorePercent: number;  // (actual contiguous groupings / max possible groupings) * 100
  actualBatches: number;
  singleUnitCount: number;
  totalSetupMinutesSaved: number; // Minutes saved by amortizing setupBuffer
  totalSetupMinutesIncurred: number;
}

export interface SurplusSimulationOption {
  contentTypeId: string;
  contentTypeName: string;
  color: string;
  additionalUnits: number; // How many more complete units of this content type can fit
  limitingZoneId?: string;
  limitingZoneName?: string;
  limitingReason?: string;
}

export interface SolverResult {
  status: 'OPTIMAL_FIT' | 'SWAP_APPLIED' | 'CAPACITY_EXCEEDED';
  statusMessage: string;
  scheduledBlocks: ScheduledTaskBlock[];
  unscheduledTasks: UnscheduledTask[];
  zoneUtilizations: ZoneUtilization[];
  bottleneckZoneIds: string[];
  batchingMetrics: BatchingMetrics;
  swapsExecuted: SwapLogEntry[];
  surplusOptions: SurplusSimulationOption[];
  totalSlackMinutes: number;
  solveDurationMs: number;
}
