import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { LiveSplitWsService } from './livesplit-ws.service';
import { belongsToRun, CELESTE_SEGMENTS, emptySegments, LiveSplitSnapshot, liveSegmentTime, RunRecord, updateRun } from './run.model';

const STORAGE_KEY = 'celeste-runs:v1';

@Injectable({ providedIn: 'root' })
export class RunService implements OnDestroy {
  private readonly ws = inject(LiveSplitWsService);
  readonly run = signal<RunRecord | null>(null);
  readonly names = signal(CELESTE_SEGMENTS);
  readonly phase = signal<LiveSplitSnapshot['phase']>('NotRunning');
  readonly storageError = signal<string | null>(null);
  readonly history = signal<RunRecord[]>(this.load());
  readonly rows = computed(() => {
    const run = this.run();
    return run ? run.segments.map((segment, index) => ({ ...segment, timeMs: liveSegmentTime(run, index) }))
      : emptySegments(this.names()).map(segment => ({ ...segment, timeMs: null }));
  });
  private readonly subscription = this.ws.snapshots.subscribe(snapshot => this.accept(snapshot));
  private readonly resetSubscription = this.ws.resets.subscribe(() => this.resetCurrentRun());

  private resetCurrentRun(): void {
    const run = this.run();
    if (run && run.outcome === 'active') this.save({ ...run, outcome: 'reset', finishedAt: new Date().toISOString() });
    this.run.set(null);
    this.phase.set('NotRunning');
  }

  private accept(snapshot: LiveSplitSnapshot): void {
    this.names.set(snapshot.names);
    this.phase.set(snapshot.phase);
    let run = this.run();
    if (snapshot.phase === 'NotRunning') {
      this.resetCurrentRun();
      return;
    }
    if (run && !belongsToRun(run, snapshot)) {
      if (run.outcome === 'active') this.save({ ...run, outcome: 'interrupted', finishedAt: new Date().toISOString() });
      run = null;
    }
    if (!run) {
      run = { id: crypto.randomUUID(), attempt: snapshot.attempt, game: snapshot.game, category: snapshot.category,
        timingMethod: snapshot.timingMethod, startedAt: new Date().toISOString(), finishedAt: null,
        outcome: 'active', phase: snapshot.phase, splitIndex: snapshot.splitIndex, offsetMs: snapshot.offsetMs,
        currentTimeMs: snapshot.currentTimeMs, segments: emptySegments(snapshot.names) };
    }
    const next = updateRun(run, snapshot);
    this.run.set(next);
    // Persist boundaries and revisions, not every clock tick. IDs make undo/re-split an update.
    if (JSON.stringify(run.segments) !== JSON.stringify(next.segments) || run.outcome !== next.outcome) this.save(next);
  }

  private save(run: RunRecord): void {
    const history = [...this.history().filter(record => record.id !== run.id), run];
    this.history.set(history);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, runs: history }));
      this.storageError.set(null);
    } catch { this.storageError.set('No se pudo guardar el historial local. Los tiempos siguen disponibles en esta sesión.'); }
  }

  private load(): RunRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.runs) || !data.runs.every((run: RunRecord) =>
        typeof run.id === 'string' && Array.isArray(run.segments))) throw new Error('Historial inválido');
      return data.runs;
    } catch { this.storageError.set('No se pudo leer el historial local.'); return []; }
  }

  ngOnDestroy(): void { this.subscription.unsubscribe(); this.resetSubscription.unsubscribe(); }
}
