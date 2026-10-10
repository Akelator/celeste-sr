export type TimerPhase = 'NotRunning' | 'Running' | 'Paused' | 'Ended';
export type TimingMethod = 'GameTime' | 'RealTime' | 'SelectedTime';

export const CELESTE_SEGMENTS = [
  'Prólogo', 'Ciudad Olvidad', 'Ruinas', 'Celetial Resort',
  'Risco Dorado', 'Templo del espejo', 'Reflexión', 'La Cumbre',
];

export interface LiveSplitSnapshot {
  phase: TimerPhase;
  splitIndex: number;
  attempt: number;
  timingMethod: TimingMethod;
  currentTimeMs: number | null;
  lastSplitTimeMs: number | null;
  offsetMs: number | null;
  names: string[];
  game: string;
  category: string;
}

export interface SegmentResult {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'unavailable';
  cumulativeTimeMs: number | null;
  durationMs: number | null;
}

export interface RunRecord {
  id: string;
  attempt: number;
  game: string;
  category: string;
  timingMethod: TimingMethod;
  startedAt: string;
  finishedAt: string | null;
  outcome: 'active' | 'completed' | 'reset' | 'interrupted';
  phase: TimerPhase;
  splitIndex: number;
  offsetMs: number | null;
  currentTimeMs: number | null;
  segments: SegmentResult[];
}

export function emptySegments(names = CELESTE_SEGMENTS): SegmentResult[] {
  return names.map(name => ({ name, status: 'pending', cumulativeTimeMs: null, durationMs: null }));
}

export function parseTime(value: string): number | null {
  const match = /^(-)?(?:(\d+)\.)?(?:(\d+):)?(\d+):(\d{2})(?:[.,](\d+))?$/.exec(value.trim());
  if (!match) return null;
  const [, sign, days, hours, minutes, seconds, fraction] = match;
  if (Number(seconds) >= 60 || (hours !== undefined && Number(minutes) >= 60)) return null;
  return (sign ? -1 : 1) * Math.round(
    (Number(days ?? 0) * 86400 + Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(`0.${fraction ?? 0}`)) * 1000,
  );
}

export function formatTime(ms: number | null): string {
  if (ms === null) return '—';
  const absolute = Math.abs(Math.round(ms));
  const hours = Math.floor(absolute / 3600000);
  const minutes = Math.floor(absolute / 60000) % 60;
  const seconds = Math.floor(absolute / 1000) % 60;
  return `${ms < 0 ? '-' : ''}${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(absolute % 1000).padStart(3, '0')}`;
}

export function belongsToRun(run: RunRecord, state: LiveSplitSnapshot): boolean {
  return run.attempt === state.attempt && run.game === state.game && run.category === state.category
    && run.timingMethod === state.timingMethod && run.offsetMs === state.offsetMs
    && run.segments.map(s => s.name).join('\u0000') === state.names.join('\u0000');
}

/** Only observed split boundaries are authoritative. Never estimate missing boundaries. */
export function updateRun(run: RunRecord, state: LiveSplitSnapshot): RunRecord {
  const segments = run.segments.map(segment => ({ ...segment }));
  const index = state.phase === 'Ended' ? segments.length : state.splitIndex;
  for (let i = index; i < segments.length; i++) {
    segments[i] = { ...segments[i], cumulativeTimeMs: null, durationMs: null, status: i === index ? 'active' : 'pending' };
  }
  if (index > 0) segments[index - 1].cumulativeTimeMs = state.lastSplitTimeMs;
  for (let i = 0; i < index; i++) {
    const previous = i === 0 ? state.offsetMs : segments[i - 1].cumulativeTimeMs;
    const end = segments[i].cumulativeTimeMs;
    segments[i].durationMs = end !== null && previous !== null && end >= previous ? end - previous : null;
    segments[i].status = end === null ? 'unavailable' : 'completed';
  }
  return { ...run, phase: state.phase, splitIndex: index, offsetMs: state.offsetMs, currentTimeMs: state.currentTimeMs,
    segments, outcome: state.phase === 'Ended' ? 'completed' : 'active',
    finishedAt: state.phase === 'Ended' ? run.finishedAt ?? new Date().toISOString() : null };
}

export function liveSegmentTime(run: RunRecord, index: number): number | null {
  const segment = run.segments[index];
  if (segment.status !== 'active') return segment.durationMs;
  const start = index === 0 ? run.offsetMs : run.segments[index - 1].cumulativeTimeMs;
  return start !== null && run.currentTimeMs !== null && run.currentTimeMs >= start ? run.currentTimeMs - start : null;
}
