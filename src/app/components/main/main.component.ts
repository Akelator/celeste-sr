import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { LiveSplitWsService } from '../../livesplit/livesplit-ws.service';
import { RunService } from '../../livesplit/run.service';
import { formatTime } from '../../livesplit/run.model';

@Component({
  selector: 'app-main',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit, OnDestroy {
  readonly ws = inject(LiveSplitWsService);
  readonly runs = inject(RunService);
  readonly formatTime = formatTime;
  readonly phases = { NotRunning: 'Esperando run', Running: 'En curso', Paused: 'En pausa', Ended: 'Completada' };
  readonly statuses = { connecting: 'Conectando…', connected: 'Conectado', disconnected: 'Desconectado' };
  ngOnInit(): void { this.ws.connect(); }
  ngOnDestroy(): void { this.ws.disconnect(); }
}
