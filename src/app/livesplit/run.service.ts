import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { LiveSplitWsService } from './livesplit-ws.service';
import { BestTimesService } from './best-times.service';
import { chapterBestTimeId } from './best-time.model';
import {
  belongsToRun,
  CELESTE_SEGMENTS,
  emptySegments,
  LiveSplitSnapshot,
  liveSegmentTime,
  RunRecord,
  updateRun,
  SegmentResult,
} from './run.model';

const STORAGE_KEY = 'celeste-runs:v1';

@Injectable({ providedIn: 'root' })
export class RunService implements OnDestroy {
  private readonly ws = inject(LiveSplitWsService);
  readonly bestTimes = inject(BestTimesService);
  readonly run = signal<RunRecord | null>(null);
  readonly names = signal(CELESTE_SEGMENTS);
  readonly phase = signal<LiveSplitSnapshot['phase']>('NotRunning');
  readonly storageError = signal<string | null>(null);
  readonly history = signal<RunRecord[]>(this.load());
  private readonly comparisonTimes = signal<
    { segment: number | null; cumulative: number | null }[]
  >([]);
  readonly rows = computed(() => {
    const run = this.run();
    const rows = run
      ? run.segments.map((segment: SegmentResult, index) => ({
          ...segment,
          timeMs: liveSegmentTime(run, index),
          runTime: segment.status === 'active' ? run.currentTimeMs : segment.runTime,
        }))
      : emptySegments(this.names()).map((segment) => ({ ...segment, timeMs: null }));
    return rows.map((row, index) => {
      const bestSegmentTimeMs = this.bestTimes.get(chapterBestTimeId(index, 'seg'));
      const bestrunTime = this.bestTimes.get(chapterBestTimeId(index, 'acc'));
      const reference = this.comparisonTimes()[index];
      return {
        ...row,
        bestSegmentTimeMs,
        bestrunTime,
        segmentDelta:
          row.timeMs !== null && bestSegmentTimeMs !== null && reference?.segment != null
            ? row.timeMs - reference.segment
            : null,
        runDelta:
          row.runTime !== null && bestrunTime !== null && reference?.cumulative != null
            ? row.runTime - reference.cumulative
            : null,
      };
    });
  });
  private readonly subscription = this.ws.snapshots.subscribe((snapshot) => this.accept(snapshot));
  private readonly resetSubscription = this.ws.resets.subscribe(() => this.resetCurrentRun());

  private resetCurrentRun(): void {
    const run = this.run();
    if (run && run.outcome === 'active')
      this.save({ ...run, outcome: 'reset', finishedAt: new Date().toISOString() });
    this.run.set(null);
    this.comparisonTimes.set([]);
    this.phase.set('NotRunning');
  }

  private accept(snapshot: LiveSplitSnapshot): void {
    this.names.set(snapshot.names);
    this.phase.set(snapshot.phase);
    let run = this.run();
    if (snapshot.phase === 'NotRunning') {
      // The transport resets LiveSplit after finishing. Keep the final results
      // visible until a new run arrives, or the user explicitly presses reset.
      if (run?.outcome === 'completed') return;
      this.resetCurrentRun();
      return;
    }
    if (run && !belongsToRun(run, snapshot)) {
      if (run.outcome === 'active')
        this.save({ ...run, outcome: 'interrupted', finishedAt: new Date().toISOString() });
      run = null;
    }
    if (!run) {
      // Keep the previous best as the reference so saving a new record does not
      // turn an improvement into a zero delta at the finish.
      this.comparisonTimes.set(
        snapshot.names.map((_, index) => ({
          segment: this.bestTimes.get(chapterBestTimeId(index, 'seg')),
          cumulative: this.bestTimes.get(chapterBestTimeId(index, 'acc')),
        })),
      );
      run = {
        id: crypto.randomUUID(),
        attempt: snapshot.attempt,
        game: snapshot.game,
        category: snapshot.category,
        timingMethod: snapshot.timingMethod,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        outcome: 'active',
        phase: snapshot.phase,
        splitIndex: snapshot.splitIndex,
        offsetMs: snapshot.offsetMs,
        currentTimeMs: snapshot.currentTimeMs,
        segments: emptySegments(snapshot.names),
      };
    }
    const next = updateRun(run, snapshot);
    this.run.set(next);
    // Persist boundaries and revisions, not every clock tick. IDs make undo/re-split an update.
    if (
      JSON.stringify(run.segments) !== JSON.stringify(next.segments) ||
      run.outcome !== next.outcome
    ) {
      this.save(next);
      this.bestTimes.recordRun(next);
    }
  }

  private save(run: RunRecord): void {
    const history = [...this.history().filter((record) => record.id !== run.id), run];
    this.history.set(history);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, runs: history }));
      this.storageError.set(null);
    } catch {
      this.storageError.set(
        'No se pudo guardar el historial local. Los tiempos siguen disponibles en esta sesión.',
      );
    }
  }

  private load(): RunRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (
        data.version !== 1 ||
        !Array.isArray(data.runs) ||
        !data.runs.every(
          (run: RunRecord) => typeof run.id === 'string' && Array.isArray(run.segments),
        )
      )
        throw new Error('Historial inválido');
      return data.runs;
    } catch {
      this.storageError.set('No se pudo leer el historial local.');
      return [];
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.resetSubscription.unsubscribe();
  }
}
