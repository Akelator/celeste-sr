import { Injectable, signal } from '@angular/core';
import { BestTime, BestTimeId, chapterBestTimeId } from './best-time.model';
import { RunRecord } from './run.model';

const STORAGE_KEY = 'celeste-best-times:v1';

const ANTIGUOS = {
  version: 1,
  records: [
    { id: 'chapter-00-seg', timeMs: 32130 },
    { id: 'chapter-00-acc', timeMs: 32130 },
    { id: 'chapter-01-seg', timeMs: 104023 },
    { id: 'chapter-01-acc', timeMs: 136153 },
    { id: 'chapter-02-seg', timeMs: 200804 },
    { id: 'chapter-02-acc', timeMs: 336957 },
    { id: 'chapter-03-seg', timeMs: 573308 },
    { id: 'chapter-03-acc', timeMs: 910265 },
    { id: 'chapter-04-seg', timeMs: 342652 },
    { id: 'chapter-04-acc', timeMs: 1252917 },
    { id: 'chapter-05-seg', timeMs: 599335 },
    { id: 'chapter-05-acc', timeMs: 1852252 },
    { id: 'chapter-06-seg', timeMs: 762841 },
    { id: 'chapter-06-acc', timeMs: 2615093 },
    { id: 'chapter-07-seg', timeMs: 938706 },
    { id: 'chapter-07-acc', timeMs: 3553799 },
    { id: 'run-total', timeMs: 3553799 },
  ],
};

@Injectable({ providedIn: 'root' })
export class BestTimesService {
  readonly storageError = signal<string | null>(null);
  private readonly records = signal<Partial<Record<BestTimeId, BestTime>>>(this.load());

  get(id: BestTimeId): number | null {
    return this.records()[id]?.timeMs ?? null;
  }

  clear(): void {
    try {
      const records: Partial<Record<BestTimeId, BestTime>> = {};
      for (const record of ANTIGUOS.records) {
        const best = new BestTime(record.id as BestTimeId, record.timeMs);
        records[best.id] = best;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ANTIGUOS));
      this.records.set(records);
      this.storageError.set(null);
    } catch {
      this.storageError.set('No se pudieron restaurar los tiempos de ANTIGUOS.');
    }
  }

  /** Consume finalized model data, never the live values projected for the UI. */
  recordRun(run: RunRecord): void {
    const records = { ...this.records() };
    let changed = false;
    const consider = (id: BestTimeId, milliseconds: number | null) => {
      const best = new BestTime(id, records[id]?.timeMs ?? null);
      if (best.improve(milliseconds)) {
        records[id] = best;
        changed = true;
      }
    };

    run.segments.forEach((segment, index) => {
      if (segment.status !== 'completed') return;
      consider(chapterBestTimeId(index, 'seg'), segment.segmentTime);
      consider(chapterBestTimeId(index, 'acc'), segment.runTime);
    });
    if (run.outcome === 'completed') {
      consider('run-total', run.segments.at(-1)?.runTime ?? null);
    }
    if (!changed) return;

    this.records.set(records);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, records: Object.values(records) }),
      );
      this.storageError.set(null);
    } catch {
      this.storageError.set(
        'No se pudieron guardar los mejores tiempos. Siguen disponibles en esta sesión.',
      );
    }
  }

  private load(): Partial<Record<BestTimeId, BestTime>> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.records)) throw new Error('Formato inválido');
      const records: Partial<Record<BestTimeId, BestTime>> = {};
      for (const record of data.records) {
        if (
          !record ||
          typeof record.id !== 'string' ||
          !/^(chapter-\d+-(seg|acc)|run-total)$/.test(record.id) ||
          typeof record.timeMs !== 'number' ||
          !Number.isFinite(record.timeMs) ||
          record.timeMs < 0
        ) {
          throw new Error('Récord inválido');
        }
        const best = new BestTime(
          record.id as BestTimeId,
          records[record.id as BestTimeId]?.timeMs ?? null,
        );
        best.improve(record.timeMs);
        records[best.id] = best;
      }
      return records;
    } catch {
      this.storageError.set('No se pudieron leer los mejores tiempos guardados.');
      return {};
    }
  }
}
