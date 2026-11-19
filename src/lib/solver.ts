/**
 * Pinned Week System (PWS) — Scheduling & Reallocation Engine
 * 
 * Features:
 * 1. 10-Minute Quantum Discrete Math.
 * 2. Setup Buffer Amortization: contiguously batched units pay setupBufferMins only ONCE.
 * 3. MRV (Minimum Remaining Values) Constrained-First Task Ordering.
 * 4. Multi-Zone Augmenting-Path Eviction Engine (1-hop and 2-hop smart swaps).
 * 5. Soft Cohort Proximity Scoring (earlier days for closer-to-publish stages).
 * 6. Capacity, True Bottleneck, and Surplus Simulation Engine.
 */

import {
  BatchingGroup,
  CalendarSlot,
  ContentType,
  DayOfWeek,
  DAYS_OF_WEEK,
  RESISTANCE_MULTIPLIERS,
  SandboxSettings,
  ScheduledTaskBlock,
  SolverResult,
  SwapLogEntry,
  UnscheduledTask,
  WorkflowTaskConfig,
  Zone,
  ZoneUtilization,
  BatchingMetrics,
  SurplusSimulationOption,
} from '../types/pws';

// Day index lookup for proximity math (0 = MON, 6 = SUN)
const DAY_INDEX: Record<DayOfWeek, number> = {
  MON: 0,
  TUE: 1,
  WED: 2,
  THU: 3,
  FRI: 4,
  SAT: 5,
  SUN: 6,
};

interface SlotAllocation {
  id: string;
  block: ScheduledTaskBlock;
}

interface MutableSlot {
  id: string;
  day: DayOfWeek;
  startMinute: number;
  endMinute: number;
  zoneId: string;
  totalMinutes: number;
  allocations: SlotAllocation[];
}

interface FreeInterval {
  startMinute: number;
  endMinute: number;
  duration: number;
}

interface TaskToSchedule {
  contentTypeId: string;
  contentTypeName: string;
  contentTypeColor: string;
  priorityRank: number;
  task: WorkflowTaskConfig;
  totalStages: number;
  totalUnits: number;
}

interface PlacementAttempt {
  slotId: string;
  startMinute: number;
  endMinute: number;
  durationMins: number;
  setupBufferMins: number;
  totalBlockMins: number;
  score: number;
  isMergeContinuation: boolean;
  isSharedGroupContinuation: boolean;
  adjacentPartnerId?: string;
}

/**
 * Checks whether a task and an already-placed block share the same setup context
 * (either identical taskId or identical non-trivial BatchingGroup).
 */
function sharesBatchContext(task: WorkflowTaskConfig, block: ScheduledTaskBlock): boolean {
  if (block.taskId === task.id) return true;
  if (
    task.batchGroupId &&
    task.batchGroupId !== 'bg-none' &&
    block.batchGroupId &&
    block.batchGroupId === task.batchGroupId
  ) {
    return true;
  }
  return false;
}

/**
 * Calculates free intervals in a slot
 */
function getFreeIntervals(slot: MutableSlot): FreeInterval[] {
  if (slot.allocations.length === 0) {
    return [
      {
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
        duration: slot.endMinute - slot.startMinute,
      },
    ];
  }

  // Sort allocations chronologically
  const sorted = [...slot.allocations].sort(
    (a, b) => a.block.startMinute - b.block.startMinute
  );

  const intervals: FreeInterval[] = [];
  let cursor = slot.startMinute;

  for (const alloc of sorted) {
    if (alloc.block.startMinute > cursor) {
      intervals.push({
        startMinute: cursor,
        endMinute: alloc.block.startMinute,
        duration: alloc.block.startMinute - cursor,
      });
    }
    cursor = Math.max(cursor, alloc.block.endMinute);
  }

  if (cursor < slot.endMinute) {
    intervals.push({
      startMinute: cursor,
      endMinute: slot.endMinute,
      duration: slot.endMinute - cursor,
    });
  }

  return intervals;
}

/**
 * Evaluates candidate placement with Soft Cohort Proximity and Batching Affinity
 */
function evaluatePlacement(
  slot: MutableSlot,
  interval: FreeInterval,
  requiredWorkMins: number,
  setupBufferMins: number,
  task: WorkflowTaskConfig,
  totalStages: number,
  settings: SandboxSettings
): PlacementAttempt | null {
  // Check if adjacent to an existing block of the same taskId OR shared BatchingGroup in this slot
  let isMergeContinuation = false;
  let isSharedGroupContinuation = false;
  let adjacentPartnerId: string | undefined;
  let effectiveSetup = setupBufferMins;
  let startMinute = interval.startMinute;

  const prevAlloc = slot.allocations.find(
    (a) => a.block.endMinute === interval.startMinute
  );
  const nextAlloc = slot.allocations.find(
    (a) => a.block.startMinute === interval.endMinute
  );

  if (prevAlloc && sharesBatchContext(task, prevAlloc.block) && interval.duration >= requiredWorkMins) {
    if (prevAlloc.block.taskId === task.id) {
      isMergeContinuation = true;
    } else if (setupBufferMins > 0) {
      isSharedGroupContinuation = true;
      adjacentPartnerId = prevAlloc.block.id;
    }
    effectiveSetup = 0; // Setup buffer amortized!
    startMinute = interval.startMinute;
  } else if (nextAlloc && sharesBatchContext(task, nextAlloc.block) && interval.duration >= requiredWorkMins) {
    if (nextAlloc.block.taskId === task.id) {
      isMergeContinuation = true;
    } else if (setupBufferMins > 0) {
      isSharedGroupContinuation = true;
      adjacentPartnerId = nextAlloc.block.id;
    }
    effectiveSetup = 0; // Setup buffer amortized by chaining directly before partner!
    startMinute = interval.endMinute - requiredWorkMins;
  }

  const totalRequired = requiredWorkMins + effectiveSetup;
  if (interval.duration < totalRequired) {
    return null;
  }

  // Proximity scoring: W_prox = stageOrder / totalStages
  // Stage s operates on cohort N + (K - s + 1). Closer to publish (s -> K) prefers earlier days (MON = 0).
  const s = task.stageOrder;
  const K = Math.max(1, totalStages);
  const wProx = s / K;
  const dayIdx = DAY_INDEX[slot.day];
  // Score bonus for earlier days: MON (dayIdx=0) gets +6, SUN (dayIdx=6) gets 0
  const proximityBonus = (6 - dayIdx) * wProx * (settings.cohortProximityBias / 100) * 15;

  // Batching bonus: merging with identical task or chaining onto shared BatchingGroup gets high priority
  const prefScale = settings.batchingPreference / 100;
  let mergeBonus = 0;
  if (isMergeContinuation) {
    mergeBonus = 600;
  } else if (isSharedGroupContinuation) {
    mergeBonus = 450 * prefScale;
  }

  // Resistance weight
  const resistanceWeight = RESISTANCE_MULTIPLIERS[task.resistance] || 1.0;
  const batchingPreferenceBonus = prefScale * resistanceWeight * 50;

  // Best-fit compactness bonus: leaving minimal leftover fragment or perfectly filling slot
  const leftover = interval.duration - totalRequired;
  const compactnessBonus = Math.max(0, 100 - leftover * 0.1);

  const score = proximityBonus + mergeBonus + batchingPreferenceBonus + compactnessBonus;

  return {
    slotId: slot.id,
    startMinute,
    endMinute: startMinute + totalRequired,
    durationMins: requiredWorkMins,
    setupBufferMins: effectiveSetup,
    totalBlockMins: totalRequired,
    score,
    isMergeContinuation,
    isSharedGroupContinuation,
    adjacentPartnerId,
  };
}

/**
 * Finds direct placement for a work batch in eligible zones
 */
function findDirectPlacement(
  slots: MutableSlot[],
  eligibleZoneIds: string[],
  requiredWorkMins: number,
  setupBufferMins: number,
  task: WorkflowTaskConfig,
  totalStages: number,
  settings: SandboxSettings
): PlacementAttempt | null {
  const candidates: PlacementAttempt[] = [];

  for (const slot of slots) {
    if (!eligibleZoneIds.includes(slot.zoneId)) continue;

    const intervals = getFreeIntervals(slot);
    for (const interval of intervals) {
      const placement = evaluatePlacement(
        slot,
        interval,
        requiredWorkMins,
        setupBufferMins,
        task,
        totalStages,
        settings
      );
      if (placement) {
        candidates.push(placement);
      }
    }
  }

  if (candidates.length === 0) return null;

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

/**
 * Resolves the authoritative setup buffer for a task (using BatchingGroup if assigned).
 */
function resolveSetupBuffer(
  task: WorkflowTaskConfig,
  batchGroupMap?: Map<string, BatchingGroup>
): number {
  if (task.batchGroupId && batchGroupMap) {
    const group = batchGroupMap.get(task.batchGroupId);
    if (group) return group.setupBufferMins;
  }
  return task.setupBufferMins;
}

/**
 * Checks whether relocating `alloc` would orphan an adjacent shared-group continuation block.
 */
function hasDependentChainPartner(slot: MutableSlot, alloc: SlotAllocation): boolean {
  if (alloc.block.setupBufferMins <= 0 || !alloc.block.batchGroupId || alloc.block.batchGroupId === 'bg-none') {
    return false;
  }
  return slot.allocations.some(
    (other) =>
      other.id !== alloc.id &&
      other.block.isSharedGroupContinuation &&
      other.block.batchGroupId === alloc.block.batchGroupId &&
      (other.block.startMinute === alloc.block.endMinute ||
        other.block.endMinute === alloc.block.startMinute)
  );
}

/**
 * Augmenting-Path Eviction Engine:
 * Attempts 1-hop (X -> Y) and 2-hop (X -> Y -> Z) smart swaps to vacate contiguous space in Zone X.
 */
function attemptAugmentingPathEviction(
  slots: MutableSlot[],
  targetZoneId: string,
  requiredWorkMins: number,
  setupBufferMins: number,
  task: WorkflowTaskConfig,
  totalStages: number,
  settings: SandboxSettings,
  taskMap: Map<string, WorkflowTaskConfig>,
  batchGroupMap?: Map<string, BatchingGroup>
): {
  success: boolean;
  swaps: SwapLogEntry[];
  placement: PlacementAttempt | null;
} {
  const targetSlots = slots.filter((s) => s.zoneId === targetZoneId);

  for (const slotX of targetSlots) {
    // Scan all existing allocations in this slot that could be relocated
    for (let i = 0; i < slotX.allocations.length; i++) {
      const allocA = slotX.allocations[i];
      if (hasDependentChainPartner(slotX, allocA)) continue;

      const taskA = taskMap.get(allocA.block.taskId);
      if (!taskA) continue;
      const setupA = resolveSetupBuffer(taskA, batchGroupMap);

      // Check alternative zones for taskA
      const altZonesA = taskA.eligibleZoneIds.filter((z) => z !== targetZoneId);
      if (altZonesA.length === 0) continue;

      // ---------------------------------------------------------
      // TRY 1-HOP SWAP: Move allocA directly to Zone Y
      // ---------------------------------------------------------
      for (const zoneY of altZonesA) {
        // Temporarily remove allocA from slotX
        slotX.allocations.splice(i, 1);

        // Can allocA fit into Zone Y?
        const altPlacementA = findDirectPlacement(
          slots,
          [zoneY],
          allocA.block.durationMins,
          setupA,
          taskA,
          allocA.block.totalStages,
          settings
        );

        if (altPlacementA) {
          // Does target task now fit in slotX?
          const intervalsX = getFreeIntervals(slotX);
          let targetPlacement: PlacementAttempt | null = null;

          for (const interval of intervalsX) {
            targetPlacement = evaluatePlacement(
              slotX,
              interval,
              requiredWorkMins,
              setupBufferMins,
              task,
              totalStages,
              settings
            );
            if (targetPlacement) break;
          }

          if (targetPlacement) {
            // Commit 1-hop swap!
            const slotY = slots.find((s) => s.id === altPlacementA.slotId)!;
            const relocatedBlockA: ScheduledTaskBlock = {
              ...allocA.block,
              calendarSlotId: slotY.id,
              day: slotY.day,
              startMinute: altPlacementA.startMinute,
              endMinute: altPlacementA.endMinute,
              zoneId: slotY.zoneId,
              setupBufferMins: altPlacementA.setupBufferMins,
              totalBlockMins: altPlacementA.totalBlockMins,
              isSharedGroupContinuation: altPlacementA.isSharedGroupContinuation,
              isContiguousBatch:
                allocA.block.unitCount > 1 ||
                altPlacementA.isMergeContinuation ||
                altPlacementA.isSharedGroupContinuation,
            };

            if (altPlacementA.adjacentPartnerId) {
              const partner = slotY.allocations.find((a) => a.block.id === altPlacementA.adjacentPartnerId);
              if (partner) partner.block.isContiguousBatch = true;
            }

            slotY.allocations.push({
              id: `relocated-${relocatedBlockA.id}`,
              block: relocatedBlockA,
            });

            const swapLog: SwapLogEntry = {
              displacedTaskId: taskA.id,
              displacedTaskName: taskA.name,
              fromZoneId: targetZoneId,
              toZoneId: zoneY,
              slotId: slotX.id,
              minutesVacated: allocA.block.totalBlockMins,
              hopCount: 1,
              reason: `Vacated ${allocA.block.totalBlockMins}m in ${slotX.zoneId} to fit ${task.name}`,
            };

            return {
              success: true,
              swaps: [swapLog],
              placement: targetPlacement,
            };
          }
        }

        // ---------------------------------------------------------
        // TRY 2-HOP SWAP: Move allocA to Zone Y by evicting allocB to Zone Z
        // ---------------------------------------------------------
        const slotsY = slots.filter((s) => s.zoneId === zoneY);
        for (const slotY of slotsY) {
          for (let j = 0; j < slotY.allocations.length; j++) {
            const allocB = slotY.allocations[j];
            if (hasDependentChainPartner(slotY, allocB)) continue;

            const taskB = taskMap.get(allocB.block.taskId);
            if (!taskB) continue;
            const setupB = resolveSetupBuffer(taskB, batchGroupMap);

            const altZonesB = taskB.eligibleZoneIds.filter(
              (z) => z !== zoneY && z !== targetZoneId
            );
            if (altZonesB.length === 0) continue;

            for (const zoneZ of altZonesB) {
              // Temporarily remove allocB from slotY
              slotY.allocations.splice(j, 1);

              const altPlacementB = findDirectPlacement(
                slots,
                [zoneZ],
                allocB.block.durationMins,
                setupB,
                taskB,
                allocB.block.totalStages,
                settings
              );

              if (altPlacementB) {
                // Now can allocA fit into slotY?
                const intervalsY = getFreeIntervals(slotY);
                let placementAInY: PlacementAttempt | null = null;
                for (const intervalY of intervalsY) {
                  placementAInY = evaluatePlacement(
                    slotY,
                    intervalY,
                    allocA.block.durationMins,
                    setupA,
                    taskA,
                    allocA.block.totalStages,
                    settings
                  );
                  if (placementAInY) break;
                }

                if (placementAInY) {
                  // Now can target task fit in slotX?
                  const intervalsX = getFreeIntervals(slotX);
                  let targetPlacement: PlacementAttempt | null = null;
                  for (const intervalX of intervalsX) {
                    targetPlacement = evaluatePlacement(
                      slotX,
                      intervalX,
                      requiredWorkMins,
                      setupBufferMins,
                      task,
                      totalStages,
                      settings
                    );
                    if (targetPlacement) break;
                  }

                  if (targetPlacement) {
                    // Commit 2-hop swap!
                    // 1. Move allocB to slotZ
                    const slotZ = slots.find((s) => s.id === altPlacementB.slotId)!;
                    const relocatedBlockB: ScheduledTaskBlock = {
                      ...allocB.block,
                      calendarSlotId: slotZ.id,
                      day: slotZ.day,
                      startMinute: altPlacementB.startMinute,
                      endMinute: altPlacementB.endMinute,
                      zoneId: slotZ.zoneId,
                      setupBufferMins: altPlacementB.setupBufferMins,
                      totalBlockMins: altPlacementB.totalBlockMins,
                      isSharedGroupContinuation: altPlacementB.isSharedGroupContinuation,
                      isContiguousBatch:
                        allocB.block.unitCount > 1 ||
                        altPlacementB.isMergeContinuation ||
                        altPlacementB.isSharedGroupContinuation,
                    };
                    if (altPlacementB.adjacentPartnerId) {
                      const partner = slotZ.allocations.find((a) => a.block.id === altPlacementB.adjacentPartnerId);
                      if (partner) partner.block.isContiguousBatch = true;
                    }
                    slotZ.allocations.push({
                      id: `relocated-${relocatedBlockB.id}`,
                      block: relocatedBlockB,
                    });

                    // 2. Move allocA to slotY
                    const relocatedBlockA: ScheduledTaskBlock = {
                      ...allocA.block,
                      calendarSlotId: slotY.id,
                      day: slotY.day,
                      startMinute: placementAInY.startMinute,
                      endMinute: placementAInY.endMinute,
                      zoneId: slotY.zoneId,
                      setupBufferMins: placementAInY.setupBufferMins,
                      totalBlockMins: placementAInY.totalBlockMins,
                      isSharedGroupContinuation: placementAInY.isSharedGroupContinuation,
                      isContiguousBatch:
                        allocA.block.unitCount > 1 ||
                        placementAInY.isMergeContinuation ||
                        placementAInY.isSharedGroupContinuation,
                    };
                    if (placementAInY.adjacentPartnerId) {
                      const partner = slotY.allocations.find((a) => a.block.id === placementAInY.adjacentPartnerId);
                      if (partner) partner.block.isContiguousBatch = true;
                    }
                    slotY.allocations.push({
                      id: `relocated-${relocatedBlockA.id}`,
                      block: relocatedBlockA,
                    });

                    const swapLogs: SwapLogEntry[] = [
                      {
                        displacedTaskId: taskB.id,
                        displacedTaskName: taskB.name,
                        fromZoneId: zoneY,
                        toZoneId: zoneZ,
                        slotId: slotY.id,
                        minutesVacated: allocB.block.totalBlockMins,
                        hopCount: 2,
                        reason: `2-hop relocation to ${zoneZ} to clear space for ${taskA.name}`,
                      },
                      {
                        displacedTaskId: taskA.id,
                        displacedTaskName: taskA.name,
                        fromZoneId: targetZoneId,
                        toZoneId: zoneY,
                        slotId: slotX.id,
                        minutesVacated: allocA.block.totalBlockMins,
                        hopCount: 1,
                        reason: `Vacated space in ${targetZoneId} to fit ${task.name}`,
                      },
                    ];

                    return {
                      success: true,
                      swaps: swapLogs,
                      placement: targetPlacement,
                    };
                  }
                }
              }

              // Rollback B
              slotY.allocations.splice(j, 0, allocB);
            }
          }
        }

        // Rollback A
        slotX.allocations.splice(i, 0, allocA);
      }
    }
  }

  return { success: false, swaps: [], placement: null };
}

/**
 * Places a block in a slot and handles contiguous merging
 */
function commitPlacement(
  slot: MutableSlot,
  placement: PlacementAttempt,
  blockMeta: {
    contentTypeId: string;
    contentTypeName: string;
    contentTypeColor: string;
    task: WorkflowTaskConfig;
    totalStages: number;
    unitCount: number;
    unitIndices: number[];
    isPartialChunk?: boolean;
    batchGroupMap?: Map<string, BatchingGroup>;
  }
): ScheduledTaskBlock {
  const K = Math.max(1, blockMeta.totalStages);
  const s = blockMeta.task.stageOrder;
  const cohortOffset = Math.max(1, K - s + 1);
  const cohortLabel = `Week N-${cohortOffset}`;
  const groupName =
    blockMeta.task.batchGroupId && blockMeta.batchGroupMap
      ? blockMeta.batchGroupMap.get(blockMeta.task.batchGroupId)?.name
      : undefined;

  const newBlock: ScheduledTaskBlock = {
    id: `block-${blockMeta.task.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    calendarSlotId: slot.id,
    day: slot.day,
    startMinute: placement.startMinute,
    endMinute: placement.endMinute,
    durationMins: placement.durationMins,
    setupBufferMins: placement.setupBufferMins,
    totalBlockMins: placement.totalBlockMins,
    zoneId: slot.zoneId,

    contentTypeId: blockMeta.contentTypeId,
    contentTypeName: blockMeta.contentTypeName,
    contentTypeColor: blockMeta.contentTypeColor,
    taskId: blockMeta.task.id,
    taskName: blockMeta.task.name,
    stageOrder: s,
    totalStages: K,
    cohortOffset,
    cohortLabel,

    batchGroupId: blockMeta.task.batchGroupId,
    batchGroupName: groupName,
    unitCount: blockMeta.unitCount,
    isContiguousBatch:
      blockMeta.unitCount > 1 ||
      placement.isMergeContinuation ||
      placement.isSharedGroupContinuation,
    isSharedGroupContinuation: placement.isSharedGroupContinuation,
    isPartialChunk: blockMeta.isPartialChunk ?? false,
    unitIndices: blockMeta.unitIndices,
  };

  // Check if we should merge with contiguous existing block of same task
  const adjacentExistingIndex = slot.allocations.findIndex(
    (a) =>
      a.block.taskId === blockMeta.task.id &&
      (a.block.endMinute === newBlock.startMinute || a.block.startMinute === newBlock.endMinute)
  );

  if (adjacentExistingIndex >= 0) {
    const existing = slot.allocations[adjacentExistingIndex].block;
    // Merge into one contiguous block
    const mergedStart = Math.min(existing.startMinute, newBlock.startMinute);
    const mergedEnd = Math.max(existing.endMinute, newBlock.endMinute);
    const mergedDuration = existing.durationMins + newBlock.durationMins;
    // Setup buffer is paid once for the entire merged block
    const mergedSetup = existing.setupBufferMins > 0 ? existing.setupBufferMins : newBlock.setupBufferMins;
    const mergedIndices = Array.from(new Set([...existing.unitIndices, ...newBlock.unitIndices])).sort();

    const mergedBlock: ScheduledTaskBlock = {
      ...existing,
      startMinute: mergedStart,
      endMinute: mergedEnd,
      durationMins: mergedDuration,
      setupBufferMins: mergedSetup,
      totalBlockMins: mergedDuration + mergedSetup,
      unitCount: existing.unitCount + newBlock.unitCount,
      isContiguousBatch: true,
      unitIndices: mergedIndices,
    };

    slot.allocations[adjacentExistingIndex].block = mergedBlock;
    return mergedBlock;
  }

  // If chaining onto a cross-pipeline partner sharing the BatchingGroup, flag the partner as part of a contiguous batch too
  if (placement.adjacentPartnerId) {
    const partner = slot.allocations.find((a) => a.block.id === placement.adjacentPartnerId);
    if (partner) {
      partner.block.isContiguousBatch = true;
    }
  }

  slot.allocations.push({
    id: newBlock.id,
    block: newBlock,
  });

  return newBlock;
}

/**
 * Schedules a batch of units for a single task using progressive bisection and Augmenting-Path eviction.
 */
function scheduleTaskUnits(
  taskItem: TaskToSchedule,
  unitIndices: number[],
  slots: MutableSlot[],
  settings: SandboxSettings,
  taskMap: Map<string, WorkflowTaskConfig>,
  swapsCollector: SwapLogEntry[],
  unscheduledCollector: UnscheduledTask[],
  batchGroupMap?: Map<string, BatchingGroup>
): void {
  const { task, contentTypeId, contentTypeName, contentTypeColor, totalStages } = taskItem;
  const unitCount = unitIndices.length;
  if (unitCount === 0) return;

  const workMins = unitCount * task.durationMins;
  const setupMins = resolveSetupBuffer(task, batchGroupMap);

  // 1. Try Direct Placement for the full batch in eligible zones
  let direct = findDirectPlacement(
    slots,
    task.eligibleZoneIds,
    workMins,
    setupMins,
    task,
    totalStages,
    settings
  );

  if (direct) {
    const targetSlot = slots.find((s) => s.id === direct!.slotId)!;
    commitPlacement(targetSlot, direct, {
      contentTypeId,
      contentTypeName,
      contentTypeColor,
      task,
      totalStages,
      unitCount,
      unitIndices,
      batchGroupMap,
    });
    return;
  }

  // 2. Try Augmenting-Path Eviction for the full batch
  for (const zoneId of task.eligibleZoneIds) {
    const eviction = attemptAugmentingPathEviction(
      slots,
      zoneId,
      workMins,
      setupMins,
      task,
      totalStages,
      settings,
      taskMap,
      batchGroupMap
    );

    if (eviction.success && eviction.placement) {
      swapsCollector.push(...eviction.swaps);
      const targetSlot = slots.find((s) => s.id === eviction.placement!.slotId)!;
      commitPlacement(targetSlot, eviction.placement, {
        contentTypeId,
        contentTypeName,
        contentTypeColor,
        task,
        totalStages,
        unitCount,
        unitIndices,
        batchGroupMap,
      });
      return;
    }
  }

  // 3. Progressive Bisection: if batch > 1 unit, divide and conquer
  if (unitCount > 1) {
    const half = Math.ceil(unitCount / 2);
    const firstHalf = unitIndices.slice(0, half);
    const secondHalf = unitIndices.slice(half);

    scheduleTaskUnits(
      taskItem,
      firstHalf,
      slots,
      settings,
      taskMap,
      swapsCollector,
      unscheduledCollector,
      batchGroupMap
    );
    scheduleTaskUnits(
      taskItem,
      secondHalf,
      slots,
      settings,
      taskMap,
      swapsCollector,
      unscheduledCollector,
      batchGroupMap
    );
    return;
  }

  // 4. Single Unit: Can we split this unit if splittable?
  const singleUnitIndex = unitIndices[0];
  if (task.isSplittable && task.minSplitChunkMins < task.durationMins) {
    const chunkMins = task.minSplitChunkMins;
    let remainingUnitMins = task.durationMins;
    let chunkSeq = 0;

    while (remainingUnitMins > 0) {
      const currentChunk = Math.min(
        remainingUnitMins,
        Math.max(chunkMins, remainingUnitMins >= chunkMins * 2 ? chunkMins : remainingUnitMins)
      );

      // Try direct placement for chunk
      let chunkPlacement = findDirectPlacement(
        slots,
        task.eligibleZoneIds,
        currentChunk,
        setupMins,
        task,
        totalStages,
        settings
      );

      // Try eviction if direct fails
      if (!chunkPlacement) {
        for (const zoneId of task.eligibleZoneIds) {
          const eviction = attemptAugmentingPathEviction(
            slots,
            zoneId,
            currentChunk,
            setupMins,
            task,
            totalStages,
            settings,
            taskMap,
            batchGroupMap
          );
          if (eviction.success && eviction.placement) {
            swapsCollector.push(...eviction.swaps);
            chunkPlacement = eviction.placement;
            break;
          }
        }
      }

      if (chunkPlacement) {
        const targetSlot = slots.find((s) => s.id === chunkPlacement!.slotId)!;
        commitPlacement(targetSlot, chunkPlacement, {
          contentTypeId,
          contentTypeName,
          contentTypeColor,
          task,
          totalStages,
          unitCount: 1,
          unitIndices: [singleUnitIndex],
          isPartialChunk: true,
          batchGroupMap,
        });
        remainingUnitMins -= currentChunk;
        chunkSeq++;
      } else {
        // Failed to place remaining chunk
        unscheduledCollector.push({
          contentTypeId,
          contentTypeName,
          taskId: task.id,
          taskName: task.name,
          stageOrder: task.stageOrder,
          unitIndex: singleUnitIndex,
          missingMinutes: remainingUnitMins,
          reason: `No eligible slot could fit ${remainingUnitMins}m chunk of ${task.name}`,
        });
        break;
      }
    }
    return;
  }

  // 5. Unsplittable single unit that failed to fit
  unscheduledCollector.push({
    contentTypeId,
    contentTypeName,
    taskId: task.id,
    taskName: task.name,
    stageOrder: task.stageOrder,
    unitIndex: singleUnitIndex,
    missingMinutes: task.durationMins,
    reason: `Insufficient capacity in eligible zones: ${task.eligibleZoneIds.join(', ')}`,
  });
}

/**
 * Calculates Zone Utilization, Shiftable minutes, and True Bottlenecks
 */
function calculateZoneAnalytics(
  zones: Zone[],
  slots: MutableSlot[],
  allTasks: WorkflowTaskConfig[],
  unscheduledTasks: UnscheduledTask[]
): {
  zoneUtilizations: ZoneUtilization[];
  bottleneckZoneIds: string[];
} {
  const taskMap = new Map<string, WorkflowTaskConfig>(allTasks.map((t) => [t.id, t]));
  const utilizations: ZoneUtilization[] = [];

  for (const zone of zones) {
    const zoneSlots = slots.filter((s) => s.zoneId === zone.id);
    const totalAvail = zoneSlots.reduce(
      (acc, s) => acc + (s.endMinute - s.startMinute),
      0
    );

    let taskDuration = 0;
    let setupBufferTotal = 0;
    let shiftableMinutes = 0;

    for (const slot of zoneSlots) {
      for (const alloc of slot.allocations) {
        taskDuration += alloc.block.durationMins;
        setupBufferTotal += alloc.block.setupBufferMins;

        // Check if shiftable to another zone
        const taskConfig = taskMap.get(alloc.block.taskId);
        if (taskConfig) {
          const otherEligible = taskConfig.eligibleZoneIds.filter((z) => z !== zone.id);
          if (otherEligible.length > 0) {
            // Check if any other eligible zone has free space >= block total time
            const canShift = otherEligible.some((otherZoneId) => {
              const otherSlots = slots.filter((s) => s.zoneId === otherZoneId);
              const otherFree = otherSlots.reduce((sum, s) => {
                const intervals = getFreeIntervals(s);
                return sum + intervals.reduce((iSum, i) => iSum + i.duration, 0);
              }, 0);
              return otherFree >= alloc.block.totalBlockMins;
            });
            if (canShift) {
              shiftableMinutes += alloc.block.totalBlockMins;
            }
          }
        }
      }
    }

    const totalAlloc = taskDuration + setupBufferTotal;
    const remainingFree = Math.max(0, totalAvail - totalAlloc);
    const utilPct = totalAvail > 0 ? (totalAlloc / totalAvail) * 100 : 0;

    utilizations.push({
      zoneId: zone.id,
      zoneName: zone.name,
      totalAvailableMinutes: totalAvail,
      taskDurationMinutes: taskDuration,
      setupBufferMinutes: setupBufferTotal,
      totalAllocatedMinutes: totalAlloc,
      remainingFreeMinutes: remainingFree,
      shiftableMinutes,
      utilizationPercent: Math.round(utilPct * 10) / 10,
      isBottleneck: false,
    });
  }

  // Detect True Bottlenecks
  const bottleneckZoneIds: string[] = [];

  // Zone is bottleneck if unscheduled tasks needed it and its effective free capacity was insufficient
  for (const unsch of unscheduledTasks) {
    const taskConfig = taskMap.get(unsch.taskId);
    if (taskConfig) {
      for (const zId of taskConfig.eligibleZoneIds) {
        const zUtil = utilizations.find((u) => u.zoneId === zId);
        if (zUtil) {
          const effectiveFree = zUtil.remainingFreeMinutes + zUtil.shiftableMinutes;
          if (effectiveFree < unsch.missingMinutes) {
            if (!bottleneckZoneIds.includes(zId)) {
              bottleneckZoneIds.push(zId);
              zUtil.isBottleneck = true;
            }
          }
        }
      }
    }
  }

  // If no unscheduled tasks, mark zone with lowest free headroom as potential bottleneck if > 85% full
  if (bottleneckZoneIds.length === 0) {
    const highUtil = [...utilizations]
      .filter((u) => u.totalAvailableMinutes > 0 && u.utilizationPercent >= 85)
      .sort((a, b) => a.remainingFreeMinutes - b.remainingFreeMinutes);
    if (highUtil.length > 0) {
      highUtil[0].isBottleneck = true;
      bottleneckZoneIds.push(highUtil[0].zoneId);
    }
  }

  return { zoneUtilizations: utilizations, bottleneckZoneIds };
}

/**
 * Calculates Batching Metrics and Setup Buffer Amortization Savings
 */
function calculateBatchingMetrics(
  scheduledBlocks: ScheduledTaskBlock[],
  contentTypes: ContentType[],
  batchGroupMap?: Map<string, BatchingGroup>
): BatchingMetrics {
  let totalBaselineSetup = 0;
  let totalIncurred = 0;
  let totalBatches = 0;
  let singleUnits = 0;

  // Group scheduled blocks by taskId
  const taskBlocksMap = new Map<string, ScheduledTaskBlock[]>();
  for (const b of scheduledBlocks) {
    const list = taskBlocksMap.get(b.taskId) || [];
    list.push(b);
    taskBlocksMap.set(b.taskId, list);
    totalIncurred += b.setupBufferMins;
  }

  for (const ct of contentTypes) {
    if (ct.targetWeeklyUnits <= 0) continue;

    for (const task of ct.tasks) {
      const blocks = taskBlocksMap.get(task.id) || [];
      const resolvedSetup = resolveSetupBuffer(task, batchGroupMap);
      const scheduledUnitSet = new Set<number>();

      for (const block of blocks) {
        for (const idx of block.unitIndices) {
          scheduledUnitSet.add(idx);
        }
        if (block.unitCount > 1 || block.isContiguousBatch || block.isSharedGroupContinuation) {
          totalBatches++;
        } else {
          singleUnits++;
        }
      }

      totalBaselineSetup += scheduledUnitSet.size * resolvedSetup;
    }
  }

  const totalSaved = Math.max(0, totalBaselineSetup - totalIncurred);
  const totalGroupings = totalBatches + singleUnits;
  const batchingScore = totalGroupings > 0 ? (totalBatches / totalGroupings) * 100 : 100;

  return {
    batchingScorePercent: Math.round(batchingScore),
    actualBatches: totalBatches,
    singleUnitCount: singleUnits,
    totalSetupMinutesSaved: totalSaved,
    totalSetupMinutesIncurred: totalIncurred,
  };
}

function formatShortDuration(mins: number): string {
  const mTotal = Math.max(0, Math.round(mins));
  const h = Math.floor(mTotal / 60);
  const m = mTotal % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Runs the core MRV + Batching + Augmenting-Path eviction scheduling pass
 */
function runCoreSchedulingPass(
  calendarSlots: CalendarSlot[],
  contentTypes: ContentType[],
  settings: SandboxSettings,
  batchGroupMap?: Map<string, BatchingGroup>
): {
  slots: MutableSlot[];
  allTasks: WorkflowTaskConfig[];
  swapsCollector: SwapLogEntry[];
  unscheduledCollector: UnscheduledTask[];
} {
  // Initialize mutable slots with discrete quantum bounds (5-min precision)
  const slots: MutableSlot[] = calendarSlots.map((slot) => ({
    id: slot.id,
    day: slot.day,
    startMinute: Math.round(slot.startMinute / 5) * 5,
    endMinute: Math.round(slot.endMinute / 5) * 5,
    zoneId: slot.zoneId,
    totalMinutes: slot.endMinute - slot.startMinute,
    allocations: [],
  }));

  // Build task config map
  const allTasks: WorkflowTaskConfig[] = [];
  const taskMap = new Map<string, WorkflowTaskConfig>();
  for (const ct of contentTypes) {
    for (const t of ct.tasks) {
      allTasks.push(t);
      taskMap.set(t.id, t);
    }
  }

  // 1. Minimum Remaining Values (MRV) Constrained-First Task Ordering
  const tasksToSchedule: TaskToSchedule[] = [];

  for (const ct of contentTypes) {
    const units = ct.targetWeeklyUnits;
    if (units <= 0) continue;

    const sortedTasks = [...ct.tasks].sort((a, b) => a.stageOrder - b.stageOrder);
    sortedTasks.forEach((rawTask, idx) => {
      const normalizedTask: WorkflowTaskConfig =
        rawTask.stageOrder === idx + 1 ? rawTask : { ...rawTask, stageOrder: idx + 1 };
      tasksToSchedule.push({
        contentTypeId: ct.id,
        contentTypeName: ct.name,
        contentTypeColor: ct.color,
        priorityRank: ct.priorityRank,
        task: normalizedTask,
        totalStages: sortedTasks.length,
        totalUnits: units,
      });
    });
  }

  // Sort tasks by:
  // 1) Zone Restrictiveness (eligibleZoneIds.length ascending: single-zone first)
  // 2) Resistance Level (HIGH -> MEDIUM -> LOW)
  // 3) Splittability (unsplittable first)
  // 4) Setup Buffer (larger setup first for amortization)
  // 5) Deterministic tie-breaker
  tasksToSchedule.sort((a, b) => {
    // 1. Zone Restrictiveness
    const zoneDiff = a.task.eligibleZoneIds.length - b.task.eligibleZoneIds.length;
    if (zoneDiff !== 0) return zoneDiff;

    // 2. Resistance Level
    const resA = RESISTANCE_MULTIPLIERS[a.task.resistance] || 1.0;
    const resB = RESISTANCE_MULTIPLIERS[b.task.resistance] || 1.0;
    if (resB !== resA) return resB - resA;

    // 3. Splittability (unsplittable first)
    if (a.task.isSplittable !== b.task.isSplittable) {
      return a.task.isSplittable ? 1 : -1;
    }

    // 4. Setup Buffer descending
    const setupA = resolveSetupBuffer(a.task, batchGroupMap);
    const setupB = resolveSetupBuffer(b.task, batchGroupMap);
    if (setupB !== setupA) {
      return setupB - setupA;
    }

    // 5. Priority rank ascending
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }

    // 6. Stage order
    if (a.task.stageOrder !== b.task.stageOrder) {
      return a.task.stageOrder - b.task.stageOrder;
    }

    return a.task.id.localeCompare(b.task.id);
  });

  // Execute scheduling pass
  const swapsCollector: SwapLogEntry[] = [];
  const unscheduledCollector: UnscheduledTask[] = [];

  for (const item of tasksToSchedule) {
    const unitIndices = Array.from({ length: item.totalUnits }, (_, i) => i);
    scheduleTaskUnits(
      item,
      unitIndices,
      slots,
      settings,
      taskMap,
      swapsCollector,
      unscheduledCollector,
      batchGroupMap
    );
  }

  return { slots, allTasks, swapsCollector, unscheduledCollector };
}

/**
 * Surplus Simulator:
 * Determines exactly how many additional complete units of each ContentType can fit
 * without causing capacity overflow, plus identifies the limiting zone when capped.
 */
function simulateSurplusCapacity(
  zones: Zone[],
  baseSlots: CalendarSlot[],
  scheduledBlocks: ScheduledTaskBlock[],
  unscheduledTasks: UnscheduledTask[],
  contentTypes: ContentType[],
  settings: SandboxSettings,
  batchGroupMap?: Map<string, BatchingGroup>
): SurplusSimulationOption[] {
  const options: SurplusSimulationOption[] = [];
  const zoneMap = new Map<string, Zone>(zones.map((z) => [z.id, z]));

  const buildLimitingInfo = (
    failedTask: WorkflowTaskConfig | undefined,
    slotsSnapshot: MutableSlot[]
  ): { limitingZoneId?: string; limitingZoneName?: string; limitingReason?: string } => {
    if (!failedTask) return {};
    if (failedTask.eligibleZoneIds.length === 0) {
      return { limitingReason: `${failedTask.name} has no assigned zone in Step 2` };
    }

    // Find the best (most free space) eligible zone to show why even it couldn't fit
    let bestZoneId = failedTask.eligibleZoneIds[0];
    let maxFreeInAnySlot = -1;
    let totalZoneFree = 0;

    for (const zId of failedTask.eligibleZoneIds) {
      const zSlots = slotsSnapshot.filter((s) => s.zoneId === zId);
      let largestFree = 0;
      let sumFree = 0;
      for (const s of zSlots) {
        const intervals = getFreeIntervals(s);
        for (const iv of intervals) {
          sumFree += iv.duration;
          if (iv.duration > largestFree) largestFree = iv.duration;
        }
      }
      if (largestFree > maxFreeInAnySlot || (largestFree === maxFreeInAnySlot && sumFree > totalZoneFree)) {
        maxFreeInAnySlot = largestFree;
        totalZoneFree = sumFree;
        bestZoneId = zId;
      }
    }

    const zName = zoneMap.get(bestZoneId)?.name || bestZoneId;
    const needed = failedTask.durationMins;
    if (totalZoneFree <= 0) {
      return {
        limitingZoneId: bestZoneId,
        limitingZoneName: zName,
        limitingReason: `${zName} is full (0m free)`,
      };
    }

    return {
      limitingZoneId: bestZoneId,
      limitingZoneName: zName,
      limitingReason: `Needs ${formatShortDuration(needed)} in ${zName} (${formatShortDuration(
        Math.max(0, maxFreeInAnySlot)
      )} free slot)`,
    };
  };

  for (const ct of contentTypes) {
    if (ct.tasks.length === 0) {
      options.push({
        contentTypeId: ct.id,
        contentTypeName: ct.name,
        color: ct.color,
        additionalUnits: 0,
        limitingReason: 'Add at least 1 workflow stage in Step 2',
      });
      continue;
    }

    // If current schedule already exceeds capacity, strictly block adding more units
    if (unscheduledTasks.length > 0) {
      const ownFailed = unscheduledTasks.find((u) => u.contentTypeId === ct.id) || unscheduledTasks[0];
      const ownTaskCfg =
        ct.tasks.find((t) => t.id === ownFailed.taskId) ||
        contentTypes.flatMap((c) => c.tasks).find((t) => t.id === ownFailed.taskId);
      const zId = ownTaskCfg?.eligibleZoneIds[0];
      const zName = zId ? zoneMap.get(zId)?.name : undefined;
      options.push({
        contentTypeId: ct.id,
        contentTypeName: ct.name,
        color: ct.color,
        additionalUnits: 0,
        limitingZoneId: zId,
        limitingZoneName: zName,
        limitingReason: zName
          ? `Overloaded in ${zName} — reduce units or add Step 1 hours`
          : 'Resolve current overload before adding more',
      });
      continue;
    }

    let additionalUnits = 0;
    let canFitMore = true;
    let failedTaskConfig: WorkflowTaskConfig | undefined;

    // Deep clone slots and current allocations
    let testSlots: MutableSlot[] = baseSlots.map((s) => ({
      ...s,
      totalMinutes: s.endMinute - s.startMinute,
      allocations: scheduledBlocks
        .filter((b) => b.calendarSlotId === s.id)
        .map((b) => ({ id: b.id, block: { ...b } })),
    }));

    const taskMap = new Map<string, WorkflowTaskConfig>(ct.tasks.map((t) => [t.id, t]));

    while (canFitMore && additionalUnits < 20) {
      const simulatedSwaps: SwapLogEntry[] = [];
      const simulatedUnscheduled: UnscheduledTask[] = [];

      // Try placing 1 additional unit of all stages for this ContentType
      const snapshotSlots = testSlots.map((s) => ({
        ...s,
        allocations: s.allocations.map((a) => ({ id: a.id, block: { ...a.block } })),
      }));

      let stepSucceeded = true;
      for (const task of ct.tasks) {
        const taskItem: TaskToSchedule = {
          contentTypeId: ct.id,
          contentTypeName: ct.name,
          contentTypeColor: ct.color,
          priorityRank: ct.priorityRank,
          task,
          totalStages: ct.tasks.length,
          totalUnits: 1,
        };

        scheduleTaskUnits(
          taskItem,
          [ct.targetWeeklyUnits + additionalUnits],
          testSlots,
          settings,
          taskMap,
          simulatedSwaps,
          simulatedUnscheduled,
          batchGroupMap
        );

        if (simulatedUnscheduled.length > 0) {
          stepSucceeded = false;
          failedTaskConfig = task;
          break;
        }
      }

      if (stepSucceeded) {
        additionalUnits++;
      } else {
        testSlots = snapshotSlots;
        canFitMore = false;
      }
    }

    // Truthfulness verification against a clean full pass for +1 unit:
    // Guarantees clicking "+1" in Step 3 never contradicts surplus prediction.
    if (additionalUnits > 0) {
      const plusOneCts = contentTypes.map((c) =>
        c.id === ct.id ? { ...c, targetWeeklyUnits: c.targetWeeklyUnits + 1 } : c
      );
      const verifyOne = runCoreSchedulingPass(baseSlots, plusOneCts, settings, batchGroupMap);
      if (verifyOne.unscheduledCollector.length > 0) {
        additionalUnits = 0;
        const firstUnsched = verifyOne.unscheduledCollector[0];
        failedTaskConfig =
          plusOneCts.flatMap((c) => c.tasks).find((t) => t.id === firstUnsched.taskId) ||
          failedTaskConfig;
        testSlots = verifyOne.slots;
      }
    } else {
      // Double-check whether a fresh pass with MRV/swaps unlocks +1 unit
      const plusOneCts = contentTypes.map((c) =>
        c.id === ct.id ? { ...c, targetWeeklyUnits: c.targetWeeklyUnits + 1 } : c
      );
      const verifyOne = runCoreSchedulingPass(baseSlots, plusOneCts, settings, batchGroupMap);
      if (verifyOne.unscheduledCollector.length === 0) {
        additionalUnits = 1;
        testSlots = verifyOne.slots;
      }
    }

    const limitingInfo =
      additionalUnits === 0 ? buildLimitingInfo(failedTaskConfig, testSlots) : {};

    options.push({
      contentTypeId: ct.id,
      contentTypeName: ct.name,
      color: ct.color,
      additionalUnits,
      ...limitingInfo,
    });
  }

  return options;
}

/**
 * Main Deterministic PWS Solver Entry Point
 */
export function solvePinnedWeek(
  zones: Zone[],
  calendarSlots: CalendarSlot[],
  contentTypes: ContentType[],
  settings: SandboxSettings,
  batchingGroups: BatchingGroup[] = []
): SolverResult {
  const startTime = performance.now();

  const batchGroupMap = new Map<string, BatchingGroup>(
    batchingGroups.map((g) => [g.id, g])
  );

  const { slots, allTasks, swapsCollector, unscheduledCollector } = runCoreSchedulingPass(
    calendarSlots,
    contentTypes,
    settings,
    batchGroupMap
  );

  // Extract all scheduled blocks sorted chronologically by day and start time
  const scheduledBlocks: ScheduledTaskBlock[] = [];
  for (const s of slots) {
    for (const alloc of s.allocations) {
      scheduledBlocks.push(alloc.block);
    }
  }

  scheduledBlocks.sort((a, b) => {
    const dayDiff = DAY_INDEX[a.day] - DAY_INDEX[b.day];
    if (dayDiff !== 0) return dayDiff;
    return a.startMinute - b.startMinute;
  });

  // Calculate Zone Utilization & Bottlenecks
  const { zoneUtilizations, bottleneckZoneIds } = calculateZoneAnalytics(
    zones,
    slots,
    allTasks,
    unscheduledCollector
  );

  // Calculate Batching Metrics
  const batchingMetrics = calculateBatchingMetrics(scheduledBlocks, contentTypes, batchGroupMap);

  // Calculate Total Free Slack Minutes
  const totalSlackMinutes = zoneUtilizations.reduce(
    (acc, z) => acc + z.remainingFreeMinutes,
    0
  );

  // Surplus Simulation Pass
  const surplusOptions = simulateSurplusCapacity(
    zones,
    calendarSlots,
    scheduledBlocks,
    unscheduledCollector,
    contentTypes,
    settings,
    batchGroupMap
  );

  // Overall Status & Message
  let status: 'OPTIMAL_FIT' | 'SWAP_APPLIED' | 'CAPACITY_EXCEEDED' = 'OPTIMAL_FIT';
  let statusMessage = 'Optimal Fit: All content commitments scheduled with full steady-state integrity.';

  if (unscheduledCollector.length > 0) {
    status = 'CAPACITY_EXCEEDED';
    const missingTotal = unscheduledCollector.reduce((s, u) => s + u.missingMinutes, 0);
    const bottleneckNames = bottleneckZoneIds
      .map((id) => zones.find((z) => z.id === id)?.name || id)
      .join(', ');
    statusMessage = `Capacity Exceeded: Missing ${missingTotal}m in required zones (${bottleneckNames || 'insufficient slots'}).`;
  } else if (swapsCollector.length > 0) {
    status = 'SWAP_APPLIED';
    const totalVacated = swapsCollector.reduce((s, sw) => s + sw.minutesVacated, 0);
    const uniqueFrom = Array.from(new Set(swapsCollector.map((sw) => sw.fromZoneId)))
      .map((id) => zones.find((z) => z.id === id)?.name || id)
      .join(', ');
    statusMessage = `Smart Zone Swap Applied: Relocated tasks to vacate ${totalVacated}m in ${uniqueFrom}.`;
  }

  const solveDurationMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    status,
    statusMessage,
    scheduledBlocks,
    unscheduledTasks: unscheduledCollector,
    zoneUtilizations,
    bottleneckZoneIds,
    batchingMetrics,
    swapsExecuted: swapsCollector,
    surplusOptions,
    totalSlackMinutes,
    solveDurationMs,
  };
}
