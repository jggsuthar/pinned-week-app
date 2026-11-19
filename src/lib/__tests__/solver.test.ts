import { describe, it, expect } from 'vitest';
import { solvePinnedWeek } from '../solver';
import {
  BatchingGroup,
  CalendarSlot,
  ContentType,
  SandboxSettings,
  Zone,
} from '../../types/pws';
import { CREATOR_DEMO_PRESET } from '../../store/usePwsStore';

describe('PWS Deterministic Solver Engine', () => {
  const defaultSettings: SandboxSettings = {
    batchingPreference: 80,
    cohortProximityBias: 50,
    surplusMode: 'KEEP_SLACK',
  };

  it('correctly amortizes setup buffer for contiguously batched units (Section 5.1)', () => {
    // 1 Zone with a 300-minute slot
    const zones: Zone[] = [{ id: 'z1', name: 'Studio', color: '#46b1e1' }];
    const slots: CalendarSlot[] = [
      { id: 's1', day: 'MON', startMinute: 540, endMinute: 840, zoneId: 'z1' }, // 300 mins (09:00 - 14:00)
    ];

    // Task with 60m duration and 20m setup buffer
    // 3 units unbatched would cost: 3 * (60 + 20) = 240m.
    // 3 units batched contiguously cost: 20 + 3 * 60 = 200m.
    // Savings = 40m.
    const contentTypes: ContentType[] = [
      {
        id: 'c1',
        name: 'Shorts',
        color: '#46b1e1',
        priorityRank: 1,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 3,
        tasks: [
          {
            id: 't-shoot',
            name: 'Shoot Shorts',
            stageOrder: 1,
            durationMins: 60,
            setupBufferMins: 20,
            isSplittable: false,
            minSplitChunkMins: 60,
            resistance: 'MEDIUM',
            eligibleZoneIds: ['z1'],
          },
        ],
      },
    ];

    const result = solvePinnedWeek(zones, slots, contentTypes, defaultSettings);

    expect(result.status).toBe('OPTIMAL_FIT');
    expect(result.unscheduledTasks.length).toBe(0);
    expect(result.scheduledBlocks.length).toBe(1);

    const block = result.scheduledBlocks[0];
    expect(block.durationMins).toBe(180); // 3 * 60
    expect(block.setupBufferMins).toBe(20); // Charged ONCE
    expect(block.totalBlockMins).toBe(200); // 20 + 180
    expect(block.unitCount).toBe(3);
    expect(block.isContiguousBatch).toBe(true);

    // Verify batching savings
    expect(result.batchingMetrics.totalSetupMinutesSaved).toBe(40);
    expect(result.batchingMetrics.batchingScorePercent).toBe(100);
  });

  it('performs 1-hop Augmenting-Path Eviction (Smart Swap) when single-zone task needs space (Section 5.2)', () => {
    // 2 Zones: Zone A (Studio, 120m) and Zone B (Desk, 120m)
    const zones: Zone[] = [
      { id: 'zone-a', name: 'Studio', color: '#ef4444' },
      { id: 'zone-b', name: 'Desk', color: '#3b82f6' },
    ];

    const slots: CalendarSlot[] = [
      { id: 'slot-a', day: 'MON', startMinute: 540, endMinute: 660, zoneId: 'zone-a' }, // 120m
      { id: 'slot-b', day: 'MON', startMinute: 540, endMinute: 660, zoneId: 'zone-b' }, // 120m
    ];

    // Task 1: Can go in either Zone A or Zone B (100m work, 0m setup)
    // Task 2: Can ONLY go in Zone A (100m work, 0m setup)
    // If Task 1 is evaluated first and placed in Zone A, Zone A has only 20m free.
    // When Task 2 arrives, direct placement in Zone A fails.
    // The solver must evict Task 1 to Zone B and place Task 2 into Zone A!
    const contentTypes: ContentType[] = [
      {
        id: 'ct-1',
        name: 'Flexible Series',
        color: '#10b981',
        priorityRank: 1,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 1,
        tasks: [
          {
            id: 'task-flex',
            name: 'Flexible Task',
            stageOrder: 1,
            durationMins: 100,
            setupBufferMins: 0,
            isSplittable: false,
            minSplitChunkMins: 100,
            resistance: 'LOW',
            eligibleZoneIds: ['zone-a', 'zone-b'],
          },
        ],
      },
      {
        id: 'ct-2',
        name: 'Constrained Series',
        color: '#ef4444',
        priorityRank: 2,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 1,
        tasks: [
          {
            id: 'task-locked',
            name: 'Studio Only Task',
            stageOrder: 1,
            durationMins: 100,
            setupBufferMins: 0,
            isSplittable: false,
            minSplitChunkMins: 100,
            resistance: 'HIGH',
            eligibleZoneIds: ['zone-a'], // Only Zone A
          },
        ],
      },
    ];

    const result = solvePinnedWeek(zones, slots, contentTypes, defaultSettings);

    // Both tasks must be successfully scheduled!
    expect(result.unscheduledTasks.length).toBe(0);
    expect(result.scheduledBlocks.length).toBe(2);

    const lockedBlock = result.scheduledBlocks.find((b) => b.taskId === 'task-locked');
    const flexBlock = result.scheduledBlocks.find((b) => b.taskId === 'task-flex');

    expect(lockedBlock).toBeDefined();
    expect(lockedBlock?.zoneId).toBe('zone-a');

    expect(flexBlock).toBeDefined();
    // Due to MRV or swap, flexBlock must be in zone-b or swapped to zone-b
    expect(flexBlock?.zoneId).toBe('zone-b');
  });

  it('performs 2-hop Augmenting-Path Eviction (X -> Y -> Z)', () => {
    // 3 Zones: Zone X (100m), Zone Y (100m), Zone Z (100m)
    const zones: Zone[] = [
      { id: 'zone-x', name: 'Zone X', color: '#ef4444' },
      { id: 'zone-y', name: 'Zone Y', color: '#3b82f6' },
      { id: 'zone-z', name: 'Zone Z', color: '#10b981' },
    ];

    const slots: CalendarSlot[] = [
      { id: 'slot-x', day: 'MON', startMinute: 540, endMinute: 640, zoneId: 'zone-x' }, // 100m
      { id: 'slot-y', day: 'MON', startMinute: 540, endMinute: 640, zoneId: 'zone-y' }, // 100m
      { id: 'slot-z', day: 'MON', startMinute: 540, endMinute: 640, zoneId: 'zone-z' }, // 100m
    ];

    // Force tasks where:
    // Task A occupies Zone X, can go to Zone Y
    // Task B occupies Zone Y, can go to Zone Z
    // Task C strictly needs Zone X
    const contentTypes: ContentType[] = [
      {
        id: 'ct-all',
        name: 'Chained Pipeline',
        color: '#8b5cf6',
        priorityRank: 1,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 1,
        tasks: [
          {
            id: 'task-a',
            name: 'Task A',
            stageOrder: 1,
            durationMins: 90,
            setupBufferMins: 0,
            isSplittable: false,
            minSplitChunkMins: 90,
            resistance: 'LOW',
            eligibleZoneIds: ['zone-x', 'zone-y'],
          },
          {
            id: 'task-b',
            name: 'Task B',
            stageOrder: 2,
            durationMins: 90,
            setupBufferMins: 0,
            isSplittable: false,
            minSplitChunkMins: 90,
            resistance: 'LOW',
            eligibleZoneIds: ['zone-y', 'zone-z'],
          },
          {
            id: 'task-c',
            name: 'Task C',
            stageOrder: 3,
            durationMins: 90,
            setupBufferMins: 0,
            isSplittable: false,
            minSplitChunkMins: 90,
            resistance: 'HIGH',
            eligibleZoneIds: ['zone-x'],
          },
        ],
      },
    ];

    const result = solvePinnedWeek(zones, slots, contentTypes, defaultSettings);

    expect(result.unscheduledTasks.length).toBe(0);
    expect(result.scheduledBlocks.length).toBe(3);

    const blockC = result.scheduledBlocks.find((b) => b.taskId === 'task-c');
    expect(blockC?.zoneId).toBe('zone-x');
  });

  it('applies Soft Cohort Proximity Scoring favoring earlier days for closer-to-publish stages', () => {
    // 7 identical slots from Monday to Sunday in the same zone
    const zones: Zone[] = [{ id: 'z-desk', name: 'Desk', color: '#6366f1' }];
    const slots: CalendarSlot[] = [
      { id: 's-mon', day: 'MON', startMinute: 540, endMinute: 660, zoneId: 'z-desk' },
      { id: 's-tue', day: 'TUE', startMinute: 540, endMinute: 660, zoneId: 'z-desk' },
      { id: 's-wed', day: 'WED', startMinute: 540, endMinute: 660, zoneId: 'z-desk' },
      { id: 's-thu', day: 'THU', startMinute: 540, endMinute: 660, zoneId: 'z-desk' },
      { id: 's-fri', day: 'FRI', startMinute: 540, endMinute: 660, zoneId: 'z-desk' },
    ];

    // Pipeline with Stage 4 (Cohort N+1, closest to publish)
    const contentTypes: ContentType[] = [
      {
        id: 'ct-prox',
        name: 'Proximity Test',
        color: '#6366f1',
        priorityRank: 1,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 1,
        tasks: [
          {
            id: 'task-final-stage',
            name: 'Publish & Schedule',
            stageOrder: 4, // s = 4 out of 4 -> W_prox = 1.0
            durationMins: 60,
            setupBufferMins: 0,
            isSplittable: false,
            minSplitChunkMins: 60,
            resistance: 'LOW',
            eligibleZoneIds: ['z-desk'],
          },
        ],
      },
    ];

    const settingsWithHighProximity: SandboxSettings = {
      batchingPreference: 50,
      cohortProximityBias: 100, // Maximum proximity bias
      surplusMode: 'KEEP_SLACK',
    };

    const result = solvePinnedWeek(zones, slots, contentTypes, settingsWithHighProximity);

    expect(result.unscheduledTasks.length).toBe(0);
    expect(result.scheduledBlocks.length).toBe(1);
    // Highest proximity score on Monday
    expect(result.scheduledBlocks[0].day).toBe('MON');
  });

  it('detects True Bottlenecks and flags capacity exceeded when commitments cannot fit', () => {
    const zones: Zone[] = [
      { id: 'z-small', name: 'Constrained Studio', color: '#ef4444' },
    ];
    // Only 60 minutes available
    const slots: CalendarSlot[] = [
      { id: 's1', day: 'MON', startMinute: 540, endMinute: 600, zoneId: 'z-small' },
    ];

    // Task requires 120 minutes
    const contentTypes: ContentType[] = [
      {
        id: 'ct-over',
        name: 'Overloaded Content',
        color: '#ef4444',
        priorityRank: 1,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 1,
        tasks: [
          {
            id: 't-huge',
            name: 'Big Shoot',
            stageOrder: 1,
            durationMins: 120,
            setupBufferMins: 20,
            isSplittable: false,
            minSplitChunkMins: 60,
            resistance: 'HIGH',
            eligibleZoneIds: ['z-small'],
          },
        ],
      },
    ];

    const result = solvePinnedWeek(zones, slots, contentTypes, defaultSettings);

    expect(result.status).toBe('CAPACITY_EXCEEDED');
    expect(result.unscheduledTasks.length).toBeGreaterThan(0);
    expect(result.bottleneckZoneIds).toContain('z-small');

    const bottleneckZone = result.zoneUtilizations.find((u) => u.zoneId === 'z-small');
    expect(bottleneckZone?.isBottleneck).toBe(true);
  });

  it('runs the full Creator Demo Preset with 100% feasibility and execution time < 15ms', () => {
    const startTime = performance.now();
    const result = solvePinnedWeek(
      CREATOR_DEMO_PRESET.zones,
      CREATOR_DEMO_PRESET.calendarSlots,
      CREATOR_DEMO_PRESET.contentTypes,
      CREATOR_DEMO_PRESET.sandboxSettings,
      CREATOR_DEMO_PRESET.batchingGroups
    );
    const elapsed = performance.now() - startTime;

    // Must be < 15ms
    expect(elapsed).toBeLessThan(15);
    expect(result.solveDurationMs).toBeLessThan(15);

    // Full Creator Preset must fit completely with 0 unscheduled tasks
    expect(result.unscheduledTasks.length).toBe(0);
    expect(result.status).not.toBe('CAPACITY_EXCEEDED');
    expect(result.scheduledBlocks.length).toBeGreaterThan(5);

    // Check that batching savings occurred (Shorts shoot batched)
    expect(result.batchingMetrics.totalSetupMinutesSaved).toBeGreaterThan(0);

    // Check that surplus options were computed
    expect(result.surplusOptions.length).toBe(CREATOR_DEMO_PRESET.contentTypes.length);
    expect(result.totalSlackMinutes).toBeGreaterThan(0);
  });

  it('correctly splits tasks into 5-minute chunks when isSplittable is true', () => {
    const zones: Zone[] = [{ id: 'z1', name: 'Studio', color: '#46b1e1' }];
    const slots: CalendarSlot[] = [
      { id: 's1', day: 'MON', startMinute: 540, endMinute: 550, zoneId: 'z1' }, // 10 mins
      { id: 's2', day: 'MON', startMinute: 600, endMinute: 615, zoneId: 'z1' }, // 15 mins
    ];

    const contentTypes: ContentType[] = [
      {
        id: 'c-split',
        name: 'Quick Tasks',
        color: '#46b1e1',
        priorityRank: 1,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 1,
        tasks: [
          {
            id: 't-split',
            name: 'Micro Task',
            stageOrder: 1,
            durationMins: 25,
            setupBufferMins: 0,
            isSplittable: true,
            minSplitChunkMins: 5,
            resistance: 'LOW',
            eligibleZoneIds: ['z1'],
          },
        ],
      },
    ];

    const result = solvePinnedWeek(zones, slots, contentTypes, defaultSettings);
    expect(result.status).toBe('OPTIMAL_FIT');
    expect(result.unscheduledTasks.length).toBe(0);
    const totalDuration = result.scheduledBlocks.reduce((acc, b) => acc + b.durationMins, 0);
    expect(totalDuration).toBe(25);
  });

  it('batches tasks across different content pipelines via shared BatchingGroup and amortizes setup penalty', () => {
    const batchingGroups: BatchingGroup[] = [
      { id: 'bg-camera', name: 'Studio Camera Rig', setupBufferMins: 30, color: '#46b1e1' },
    ];
    const zones: Zone[] = [{ id: 'z-studio', name: 'Studio', color: '#46b1e1' }];
    // Total slot = 130 mins.
    // Unbatched: (30 + 60) + (30 + 40) = 160m -> WOULD NOT FIT!
    // Batched across pipelines: 30 + 60 + 40 = 130m -> FITS EXACTLY!
    const slots: CalendarSlot[] = [
      { id: 's-studio', day: 'MON', startMinute: 540, endMinute: 670, zoneId: 'z-studio' },
    ];

    const contentTypes: ContentType[] = [
      {
        id: 'ct-long',
        name: 'Long-Form',
        color: '#ef4444',
        priorityRank: 1,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 1,
        tasks: [
          {
            id: 't-shoot-long',
            name: 'Shoot Long-Form',
            stageOrder: 1,
            durationMins: 60,
            batchGroupId: 'bg-camera',
            setupBufferMins: 30,
            isSplittable: false,
            minSplitChunkMins: 30,
            resistance: 'HIGH',
            eligibleZoneIds: ['z-studio'],
          },
        ],
      },
      {
        id: 'ct-short',
        name: 'Shorts',
        color: '#46b1e1',
        priorityRank: 2,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 1,
        tasks: [
          {
            id: 't-shoot-short',
            name: 'Shoot Short',
            stageOrder: 1,
            durationMins: 40,
            batchGroupId: 'bg-camera',
            setupBufferMins: 30,
            isSplittable: false,
            minSplitChunkMins: 20,
            resistance: 'MEDIUM',
            eligibleZoneIds: ['z-studio'],
          },
        ],
      },
    ];

    const result = solvePinnedWeek(zones, slots, contentTypes, defaultSettings, batchingGroups);

    expect(result.status).toBe('OPTIMAL_FIT');
    expect(result.unscheduledTasks.length).toBe(0);
    // Kept as 2 distinct cards (preserving each pipeline's color & cohort) placed back-to-back
    expect(result.scheduledBlocks.length).toBe(2);

    const firstBlock = result.scheduledBlocks[0];
    const secondBlock = result.scheduledBlocks[1];

    expect(firstBlock.endMinute).toBe(secondBlock.startMinute);
    expect(firstBlock.setupBufferMins).toBe(30);
    expect(secondBlock.setupBufferMins).toBe(0);
    expect(secondBlock.isSharedGroupContinuation).toBe(true);
    expect(firstBlock.isContiguousBatch).toBe(true);
    expect(secondBlock.isContiguousBatch).toBe(true);

    // 30m saved by sharing the Camera Rig setup across pipelines
    expect(result.batchingMetrics.totalSetupMinutesIncurred).toBe(30);
    expect(result.batchingMetrics.totalSetupMinutesSaved).toBe(30);
    expect(result.batchingMetrics.batchingScorePercent).toBe(100);
  });

  it('caps surplus additionalUnits to 0 with limitingReason when schedule is at or over capacity', () => {
    const zones: Zone[] = [{ id: 'z1', name: 'Studio', color: '#46b1e1' }];
    const slots: CalendarSlot[] = [
      { id: 's1', day: 'MON', startMinute: 540, endMinute: 660, zoneId: 'z1' }, // 120 mins
    ];
    const baseCt: ContentType[] = [
      {
        id: 'ct1',
        name: 'Long-Form',
        color: '#ef4444',
        priorityRank: 1,
        minWeeklyUnits: 1,
        targetWeeklyUnits: 1,
        tasks: [
          {
            id: 't1',
            name: 'Shoot Video',
            stageOrder: 1,
            durationMins: 90,
            setupBufferMins: 15,
            isSplittable: false,
            minSplitChunkMins: 60,
            resistance: 'HIGH',
            eligibleZoneIds: ['z1'],
          },
        ],
      },
    ];

    // At 1 unit: 15 + 90 = 105m <= 120m (15m free -> cannot fit a 2nd 90m unit)
    const fullAtOne = solvePinnedWeek(zones, slots, baseCt, defaultSettings);
    expect(fullAtOne.status).toBe('OPTIMAL_FIT');
    expect(fullAtOne.surplusOptions[0].additionalUnits).toBe(0);
    expect(fullAtOne.surplusOptions[0].limitingZoneId).toBe('z1');
    expect(fullAtOne.surplusOptions[0].limitingReason).toContain('Studio');

    // Over capacity at 2 units: additionalUnits must strictly stay 0
    const overCt = [{ ...baseCt[0], targetWeeklyUnits: 2 }];
    const exceeded = solvePinnedWeek(zones, slots, overCt, defaultSettings);
    expect(exceeded.status).toBe('CAPACITY_EXCEEDED');
    expect(exceeded.surplusOptions[0].additionalUnits).toBe(0);
    expect(exceeded.surplusOptions[0].limitingReason).toContain('Studio');
  });
});
