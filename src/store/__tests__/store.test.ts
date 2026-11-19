import { describe, it, expect, beforeEach } from 'vitest';
import { usePwsStore, CREATOR_DEMO_PRESET } from '../usePwsStore';

describe('usePwsStore Zustand & Preset State', () => {
  beforeEach(() => {
    usePwsStore.getState().loadCreatorDemoPreset();
  });

  it('initializes with the Creator Demo Preset', () => {
    const state = usePwsStore.getState();
    expect(state.zones.length).toBe(CREATOR_DEMO_PRESET.zones.length);
    expect(state.calendarSlots.length).toBe(CREATOR_DEMO_PRESET.calendarSlots.length);
    expect(state.contentTypes.length).toBe(CREATOR_DEMO_PRESET.contentTypes.length);
    expect(state.solverResult).toBeDefined();
    expect(state.solverResult.status).not.toBe('CAPACITY_EXCEEDED');
  });

  it('updates targetWeeklyUnits and re-runs solver live', () => {
    const store = usePwsStore.getState();
    const shortsCt = store.contentTypes.find((ct) => ct.id === 'ct-shorts')!;
    expect(shortsCt.targetWeeklyUnits).toBe(3);

    // Increase target to 4
    store.setTargetWeeklyUnits('ct-shorts', 4);
    const updated = usePwsStore.getState();
    const updatedShorts = updated.contentTypes.find((ct) => ct.id === 'ct-shorts')!;
    expect(updatedShorts.targetWeeklyUnits).toBe(4);
    expect(updated.solverResult).toBeDefined();
  });

  it('resets target units to minimum constraints correctly', () => {
    const store = usePwsStore.getState();
    store.setTargetWeeklyUnits('ct-shorts', 6);
    expect(usePwsStore.getState().contentTypes.find((c) => c.id === 'ct-shorts')?.targetWeeklyUnits).toBe(6);

    store.resetToMinConstraints();
    const resetCt = usePwsStore.getState().contentTypes.find((c) => c.id === 'ct-shorts');
    expect(resetCt?.targetWeeklyUnits).toBe(resetCt?.minWeeklyUnits);
  });

  it('exports and imports JSON configuration cleanly', () => {
    const store = usePwsStore.getState();
    const exportedJson = store.exportStateToJson();
    expect(typeof exportedJson).toBe('string');

    const parsed = JSON.parse(exportedJson);
    expect(parsed.version).toBe('1.1.0');
    expect(parsed.data.batchingGroups.length).toBe(store.batchingGroups.length);
    expect(parsed.data.zones.length).toBe(store.zones.length);

    // Modify state and re-import
    store.setBatchingPreference(10);
    expect(usePwsStore.getState().sandboxSettings.batchingPreference).toBe(10);

    const importedOk = store.importStateFromJson(exportedJson);
    expect(importedOk).toBe(true);
    expect(usePwsStore.getState().sandboxSettings.batchingPreference).toBe(
      CREATOR_DEMO_PRESET.sandboxSettings.batchingPreference
    );
  });

  it('manages wizard step transitions cleanly and clamps within bounds', () => {
    const store = usePwsStore.getState();
    store.setCurrentStep(0);
    expect(usePwsStore.getState().currentStep).toBe(0);

    store.setCurrentStep(1);
    expect(usePwsStore.getState().currentStep).toBe(1);

    store.setCurrentStep(4);
    expect(usePwsStore.getState().currentStep).toBe(4);

    // Clamps within [0, 4]
    store.setCurrentStep(99);
    expect(usePwsStore.getState().currentStep).toBe(4);

    store.setCurrentStep(-5);
    expect(usePwsStore.getState().currentStep).toBe(0);
  });

  it('clears all calendar timeslots while preserving configured zones', () => {
    const store = usePwsStore.getState();
    expect(store.calendarSlots.length).toBeGreaterThan(0);
    const initialZoneCount = store.zones.length;

    store.clearAllCalendarSlots();
    const updated = usePwsStore.getState();
    expect(updated.calendarSlots.length).toBe(0);
    expect(updated.zones.length).toBe(initialZoneCount);
    expect(updated.solverResult.scheduledBlocks.length).toBe(0);
  });

  it('supports merging adjacent timeslots cleanly in store', () => {
    const store = usePwsStore.getState();
    store.clearAllCalendarSlots();

    const zoneId = store.zones[0].id;
    store.addCalendarSlot({
      id: 'slot-1',
      day: 'MON',
      startMinute: 540, // 09:00
      endMinute: 660,   // 11:00
      zoneId,
    });
    store.addCalendarSlot({
      id: 'slot-2',
      day: 'MON',
      startMinute: 660, // 11:00 (adjacent)
      endMinute: 780,   // 13:00
      zoneId,
    });

    expect(usePwsStore.getState().calendarSlots.length).toBe(2);

    // Merge slot-1 and slot-2
    store.updateCalendarSlot('slot-1', { endMinute: 780 });
    store.deleteCalendarSlot('slot-2');

    const merged = usePwsStore.getState().calendarSlots;
    expect(merged.length).toBe(1);
    expect(merged[0].startMinute).toBe(540);
    expect(merged[0].endMinute).toBe(780);
    expect(merged[0].zoneId).toBe(zoneId);
  });

  it('syncs setupBufferMins across all pipelines when updating or deleting a BatchingGroup', () => {
    const store = usePwsStore.getState();
    store.addBatchingGroup({
      id: 'bg-custom',
      name: 'Lighting Rig',
      setupBufferMins: 25,
      color: '#46b1e1',
    });

    // Assign to a task
    store.updateTaskInContentType('ct-longform', 'task-lf-2', { batchGroupId: 'bg-custom' });
    let lfShoot = usePwsStore
      .getState()
      .contentTypes.find((c) => c.id === 'ct-longform')!
      .tasks.find((t) => t.id === 'task-lf-2')!;
    expect(lfShoot.setupBufferMins).toBe(25);

    // Update the BatchingGroup setup time -> task auto-syncs
    store.updateBatchingGroup('bg-custom', { setupBufferMins: 15 });
    lfShoot = usePwsStore
      .getState()
      .contentTypes.find((c) => c.id === 'ct-longform')!
      .tasks.find((t) => t.id === 'task-lf-2')!;
    expect(lfShoot.setupBufferMins).toBe(15);

    // Delete BatchingGroup -> task resets safely to bg-none (0m)
    store.deleteBatchingGroup('bg-custom');
    lfShoot = usePwsStore
      .getState()
      .contentTypes.find((c) => c.id === 'ct-longform')!
      .tasks.find((t) => t.id === 'task-lf-2')!;
    expect(lfShoot.batchGroupId).toBe('bg-none');
    expect(lfShoot.setupBufferMins).toBe(0);
  });

  it('adds, resizes in 15m chunks, and merges continuous work zone blocks without overlaps', () => {
    const store = usePwsStore.getState();
    store.clearAllCalendarSlots();

    const zoneA = store.zones[0].id;
    // Add two continuous blocks in 15m chunks on MON
    store.addContinuousBlock(['MON'], zoneA, 90);
    store.addContinuousBlock(['MON'], zoneA, 45);

    let monSlots = usePwsStore
      .getState()
      .calendarSlots.filter((s) => s.day === 'MON')
      .sort((a, b) => a.startMinute - b.startMinute);

    expect(monSlots.length).toBe(2);
    expect(monSlots[0].endMinute - monSlots[0].startMinute).toBe(90);
    expect(monSlots[1].endMinute - monSlots[1].startMinute).toBe(45);
    expect(monSlots[1].startMinute).toBeGreaterThanOrEqual(monSlots[0].endMinute);

    // Resize first block from 90m to 120m -> second block shifts cleanly without overlap
    store.resizeCalendarSlot(monSlots[0].id, 120);
    monSlots = usePwsStore
      .getState()
      .calendarSlots.filter((s) => s.day === 'MON')
      .sort((a, b) => a.startMinute - b.startMinute);

    expect(monSlots[0].endMinute - monSlots[0].startMinute).toBe(120);
    expect(monSlots[1].startMinute).toBe(monSlots[0].endMinute);
    expect(monSlots[1].endMinute - monSlots[1].startMinute).toBe(45);

    // Merge the two blocks into one 165m continuous block
    store.mergeCalendarSlots(monSlots[0].id, monSlots[1].id);
    monSlots = usePwsStore.getState().calendarSlots.filter((s) => s.day === 'MON');
    expect(monSlots.length).toBe(1);
    expect(monSlots[0].endMinute - monSlots[0].startMinute).toBe(165);
  });

  it('resets state cleanly from scratch when startFromScratch is invoked', () => {
    const store = usePwsStore.getState();
    expect(store.zones.length).toBeGreaterThan(0);
    expect(store.calendarSlots.length).toBeGreaterThan(0);
    expect(store.contentTypes.length).toBeGreaterThan(0);

    store.startFromScratch();
    const blank = usePwsStore.getState();
    expect(blank.zones.length).toBe(0);
    expect(blank.calendarSlots.length).toBe(0);
    expect(blank.contentTypes.length).toBe(0);
    expect(blank.batchingGroups.length).toBe(1);
    expect(blank.batchingGroups[0].id).toBe('bg-none');
    expect(blank.solverResult.scheduledBlocks.length).toBe(0);
  });

  it('switches cleanly between Simple Mode (General Zone) and Custom Zones Mode', () => {
    const store = usePwsStore.getState();
    store.setZoneMode('SIMPLE');
    let state = usePwsStore.getState();
    expect(state.zoneMode).toBe('SIMPLE');
    expect(state.zones.length).toBe(1);
    expect(state.zones[0].id).toBe('zone-general');
    expect(state.calendarSlots.every((s) => s.zoneId === 'zone-general')).toBe(true);
    expect(
      state.contentTypes.every((ct) =>
        ct.tasks.every((t) => t.eligibleZoneIds.length === 1 && t.eligibleZoneIds[0] === 'zone-general')
      )
    ).toBe(true);

    // Switching back to CUSTOM when only General Zone existed resets zones cleanly so user defines custom ones
    store.setZoneMode('CUSTOM');
    state = usePwsStore.getState();
    expect(state.zoneMode).toBe('CUSTOM');
    expect(state.zones.length).toBe(0);
  });
});
