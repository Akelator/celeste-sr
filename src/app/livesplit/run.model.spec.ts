import { describe, expect, it } from 'vitest';
import {
  emptySegments,
  LiveSplitSnapshot,
  liveSegmentTime,
  parseTime,
  RunRecord,
  updateRun,
} from './run.model';

const snapshot = (overrides: Partial<LiveSplitSnapshot> = {}): LiveSplitSnapshot => ({
  phase: 'Running',
  splitIndex: 0,
  attempt: 1,
  timingMethod: 'GameTime',
  currentTimeMs: 500,
  lastSplitTimeMs: null,
  offsetMs: 0,
  names: ['A', 'B', 'C'],
  game: 'Celeste',
  category: 'Test',
  ...overrides,
});
const initial = (): RunRecord => ({
  id: 'test',
  attempt: 1,
  game: 'Celeste',
  category: 'Test',
  timingMethod: 'GameTime',
  startedAt: '',
  finishedAt: null,
  outcome: 'active',
  phase: 'Running',
  splitIndex: 0,
  offsetMs: 0,
  currentTimeMs: 0,
  segments: emptySegments(['A', 'B', 'C']),
});

describe('run timing model', () => {
  it('reads LiveSplit TimeSpan including subsecond precision, negatives and days', () => {
    expect(parseTime('00:01:02.1234567')).toBe(62123);
    expect(parseTime('-00:00:02')).toBe(-2000);
    expect(parseTime('1.02:03:04.005')).toBe(93784005);
    expect(parseTime('-')).toBeNull();
    expect(parseTime('garbage')).toBeNull();
    expect(parseTime('00:61:00')).toBeNull();
  });
  it('keeps original cumulative boundaries and derives individual/live times', () => {
    let run = updateRun(
      initial(),
      snapshot({ splitIndex: 1, lastSplitTimeMs: 1000, currentTimeMs: 1500 }),
    );
    expect(run.segments[0].segmentTime).toBe(1000);
    expect(liveSegmentTime(run, 1)).toBe(500);
    run = updateRun(run, snapshot({ splitIndex: 2, lastSplitTimeMs: 3000, currentTimeMs: 3500 }));
    expect(run.segments[1].runTime).toBe(3000);
    expect(run.segments[1].segmentTime).toBe(2000);
    run = updateRun(
      run,
      snapshot({ phase: 'Ended', splitIndex: 3, lastSplitTimeMs: 4000, currentTimeMs: 4000 }),
    );
    expect(run.segments[2].segmentTime).toBe(1000);
    expect(run.outcome).toBe('completed');
    expect(run.segments.every((s) => s.status === 'completed')).toBe(true);
  });
  it('invalidates an undone split and accepts its corrected boundary', () => {
    let run = updateRun(initial(), snapshot({ splitIndex: 1, lastSplitTimeMs: 1000 }));
    run = updateRun(run, snapshot());
    expect(run.segments[0].runTime).toBeNull();
    run = updateRun(run, snapshot({ splitIndex: 1, lastSplitTimeMs: 1200 }));
    expect(run.segments[0].segmentTime).toBe(1200);
  });
  it('does not invent times on late connection, skipped splits or multiple lost boundaries', () => {
    const run = updateRun(
      initial(),
      snapshot({ splitIndex: 2, lastSplitTimeMs: 3000, currentTimeMs: 3500 }),
    );
    expect(run.segments[0].status).toBe('unavailable');
    expect(run.segments[1].segmentTime).toBeNull();
    expect(liveSegmentTime(run, 2)).toBe(500);
    const skipped = updateRun(
      run,
      snapshot({ splitIndex: 3, phase: 'Ended', lastSplitTimeMs: null }),
    );
    expect(skipped.segments[2].segmentTime).toBeNull();
  });
  it('uses the run offset as the first boundary and freezes the supplied clock during pauses', () => {
    const run = updateRun(
      initial(),
      snapshot({ phase: 'Paused', offsetMs: -1000, currentTimeMs: 2000 }),
    );
    expect(liveSegmentTime(run, 0)).toBe(3000);
  });
});
