import { describe, it, expect } from 'vitest';
import { matchBatchingGroup, suggestStageIcon } from '../creatorIcons';
import type { BatchingGroup } from '../../types/pws';

describe('Smart BatchingGroup Auto-Recognition & Icon Suggestions', () => {
  const groups: BatchingGroup[] = [
    { id: 'bg-none', name: 'Instant / No Setup', setupBufferMins: 0 },
    { id: 'bg-shoot', name: 'Shooting', setupBufferMins: 30 },
    { id: 'bg-edit', name: 'Editing & Post Suite', setupBufferMins: 20 },
    { id: 'bg-write', name: 'Deep Writing Flow', setupBufferMins: 15 },
  ];

  it('auto-matches exact and stemmed task names (e.g. "Shoot" -> "Shooting")', () => {
    expect(matchBatchingGroup('Shoot', groups)?.id).toBe('bg-shoot');
    expect(matchBatchingGroup('Shooting', groups)?.id).toBe('bg-shoot');
    expect(matchBatchingGroup('Batch Shoot Shorts', groups)?.id).toBe('bg-shoot');
    expect(matchBatchingGroup('Rough Editing', groups)?.id).toBe('bg-edit');
    expect(matchBatchingGroup('Write Script', groups)?.id).toBe('bg-write');
  });

  it('falls back to creator synonym clusters when direct stems differ', () => {
    const rigGroups: BatchingGroup[] = [
      { id: 'bg-none', name: 'Instant / No Setup', setupBufferMins: 0 },
      { id: 'bg-camera', name: 'Studio Camera Rig', setupBufferMins: 30 },
      { id: 'bg-audio', name: 'Audio Mix Suite', setupBufferMins: 20 },
    ];

    expect(matchBatchingGroup('Film A-Roll', rigGroups)?.id).toBe('bg-camera');
    expect(matchBatchingGroup('Voiceover Polish', rigGroups)?.id).toBe('bg-audio');
  });

  it('never falsely matches bg-none and returns null when no relevant group exists', () => {
    expect(matchBatchingGroup('Instant Coffee Break', groups)).toBeNull();
    expect(matchBatchingGroup('Setup Walking', groups)).toBeNull();
    expect(matchBatchingGroup('', groups)).toBeNull();
  });

  it('suggests relevant circular icons for creator task names', () => {
    expect(suggestStageIcon('Shoot Video')).toBe('Camera');
    expect(suggestStageIcon('Rough Cut & Edit')).toBe('Scissors');
    expect(suggestStageIcon('Script & Outline')).toBe('PenTool');
    expect(suggestStageIcon('Thumbnail & Packaging')).toBe('Wand2');
    expect(suggestStageIcon('Schedule Publish')).toBe('Calendar');
  });
});
