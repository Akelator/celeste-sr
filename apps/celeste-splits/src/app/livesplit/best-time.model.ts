export type BestTimeId = `chapter-${string}-${'seg' | 'acc'}` | 'run-total';

/** Chapter 00 is the prologue; chapters 01–07 follow the split order. */
export function chapterBestTimeId(index: number, kind: 'seg' | 'acc'): BestTimeId {
  return `chapter-${String(index).padStart(2, '0')}-${kind}`;
}

export class BestTime {
  constructor(readonly id: BestTimeId, public timeMs: number | null = null) {}

  improve(candidateMs: number | null): boolean {
    if (candidateMs === null || !Number.isFinite(candidateMs) || candidateMs < 0
      || (this.timeMs !== null && candidateMs >= this.timeMs)) return false;
    this.timeMs = candidateMs;
    return true;
  }
}
