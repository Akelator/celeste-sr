import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';

import { LiveSplitWsService } from '../../livesplit/livesplit-ws.service';
import { segmentCompare, SegmentResult } from '../../livesplit/run.model';
import { RunService } from '../../livesplit/run.service';
import { TimeComponent } from '../time/time.component';

@Component({
  selector: 'app-main',
  imports: [NgClass, TimeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit, OnDestroy {
  readonly ws = inject(LiveSplitWsService);
  readonly runs = inject(RunService);
  readonly segmentIcons = ['00', '01', '02', '03', '04', '05', '06', '07'].map(
    (chapter) => `assets/icons/${chapter}.png`,
  );
  readonly phases = {
    NotRunning: 'Esperando run',
    Running: 'En curso',
    Paused: 'En pausa',
    Ended: 'Completada',
  };
  readonly statuses = {
    connecting: 'Conectando…',
    connected: 'Conectado',
    disconnected: 'Desconectado',
  };
  ngOnInit(): void {
    this.ws.connect();
  }
  ngOnDestroy(): void {
    this.ws.disconnect();
  }

  get bestTotal(): number | null {
    return this.runs.bestTimes.get('run-total') ?? null;
  }
  get total(): number | null {
    return this.runs.run() ? this.runs.run()!.currentTimeMs : 0;
  }

  onClear(): void {
    this.runs.bestTimes.clear();
  }

  segmentCompleted(row: SegmentResult): boolean {
    return row.status === 'completed';
  }

  segmentActive(row: SegmentResult): boolean {
    return row.status === 'active';
  }

  segmentEnabled(row: SegmentResult): boolean {
    return row.status === 'active' || row.status === 'completed';
  }

  rowColor(row: SegmentResult): segmentCompare {
    if (!this.segmentEnabled(row)) return 'none';
    let compare: segmentCompare = 'none';
    if (this.segmentCompleted(row)) {
      if (!!row.runDelta && !!row.segmentDelta) {
        const improveTotal = row.runDelta < 0;
        const improveSegment = row.segmentDelta < 0;
        if (improveTotal != improveSegment) compare = 'ambiguous';
        if (!improveTotal && !improveSegment) compare = 'worse';
        if (improveTotal && improveSegment) compare = 'better';
      }
    }
    if (this.segmentActive(row)) {
      if (!!row.runDelta) {
        const improveTotal = row.runDelta < 0;
        if (!improveTotal) compare = 'worse';
        if (improveTotal) compare = 'better';
      }
    }
    return compare;
  }

  aheadOrBehind(value: number | null): 'ahead' | 'behind' | '' {
    if (value === null) return '';
    if (value < 0) return 'ahead';
    if (value > 0) return 'behind';
    return '';
  }

  aheadOrBehindCompleted(
    value: number | null,
    status: 'pending' | 'active' | 'completed' | 'unavailable',
  ): 'ahead' | 'behind' | '' {
    if (status !== 'completed' || value === null) return '';
    if (value < 0) return 'ahead';
    if (value > 0) return 'behind';
    return '';
  }
}
