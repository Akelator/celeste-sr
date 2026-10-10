import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { CELESTE_SEGMENTS, LiveSplitSnapshot, parseTime, TimerPhase, TimingMethod } from './run.model';

@Injectable({ providedIn: 'root' })
export class LiveSplitWsService implements OnDestroy {
  readonly status = signal<'connecting' | 'connected' | 'disconnected'>('disconnected');
  readonly error = signal<string | null>(null);
  readonly compatibility = signal<string | null>(null);
  readonly snapshots = new Subject<LiveSplitSnapshot>();
  readonly resets = new Subject<void>();
  private socket: WebSocket | null = null;
  private pending: { resolve: (value: string) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private endpoint = 'ws://localhost:16834/livesplit';
  private stopped = true;
  private names: string[] = [];
  private minimal = false;
  private serverAttemptsAvailable = false;
  private localAttempt = 0;
  private previousPhase: TimerPhase = 'NotRunning';
  private previousGameTimeMs: number | null = null;
  private previousAttempt: number | null = null;
  private resetRevision = 0;

  reset(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send('reset');
    // Discard any snapshot that was being read before the manual reset.
    this.resetRevision++;
    this.previousPhase = 'NotRunning';
    this.previousGameTimeMs = null;
    this.previousAttempt = null;
    this.resets.next();
  }

  connect(endpoint = this.endpoint): void {
    this.disconnect();
    this.endpoint = endpoint;
    this.minimal = false;
    this.serverAttemptsAvailable = false;
    this.compatibility.set(null);
    this.stopped = false;
    this.open();
  }

  disconnect(): void {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.failPending();
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.status.set('disconnected');
  }

  private open(): void {
    this.status.set('connecting');
    this.error.set(null);
    this.names = [];
    this.localAttempt++;
    this.previousPhase = 'NotRunning';
    this.previousGameTimeMs = null;
    this.previousAttempt = null;
    let socket: WebSocket;
    try { socket = new WebSocket(this.endpoint); }
    catch { this.error.set('Dirección WebSocket inválida.'); this.status.set('disconnected'); return; }
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.status.set('connected');
      void this.poll(socket);
    };
    socket.onmessage = event => {
      if (this.socket !== socket || !this.pending) return;
      const value = String(event.data).replace(/[\r\n]+$/, '');
      // Some server versions send an additional empty frame after the response.
      if (!value) return;
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      pending.resolve(value);
    };
    socket.onerror = () => {
      if (this.socket === socket) this.error.set('No se puede conectar con LiveSplit. Comprueba el servidor WebSocket.');
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.failPending();
      this.status.set('disconnected');
      this.error.set('Conexión perdida. Reintentando…');
      if (!this.stopped) this.retry = setTimeout(() => this.open(), 2000);
    };
  }

  private failPending(reason = 'Conexión interrumpida'): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    this.pending.reject(new Error(reason));
    this.pending = null;
  }

  /** The protocol has no request IDs: only one request may be in flight. */
  private request(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.pending) {
        reject(new Error('WebSocket no disponible')); return;
      }
      const timer = setTimeout(() => {
        this.failPending(`Sin respuesta a ${command}`);
        // Discard this connection: a late response must not answer the next request.
        this.socket?.close();
      }, 2500);
      this.pending = { resolve, reject, timer };
      this.socket.send(command);
    });
  }

  private async poll(socket: WebSocket): Promise<void> {
    const revision = this.resetRevision;
    const read = (command: string) => this.request(command);
    try {
      const phase = await read('getcurrenttimerphase') as TimerPhase;
      const splitIndex = Number(await read('getsplitindex'));
      if (this.minimal && this.previousPhase === 'NotRunning' && phase !== 'NotRunning') this.localAttempt++;
      // An unsupported metadata command must not discard a supported attempt
      // counter: it distinguishes resets from game-clock corrections.
      const useServerAttempts = !this.minimal || this.serverAttemptsAvailable;
      const attempt = useServerAttempts ? Number(await read('getattemptcount')) : this.localAttempt;
      if (useServerAttempts) this.serverAttemptsAvailable = true;
      const timingMethod = this.minimal ? 'SelectedTime' : await read('gettimingmethod') as TimingMethod;
      const count = this.minimal ? CELESTE_SEGMENTS.length : Number(await read('getsplitcount'));
      if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Número de segmentos inválido');
      if (this.minimal) this.names = [...CELESTE_SEGMENTS];
      else if (this.names.length !== count || phase === 'NotRunning') {
        const names: string[] = [];
        for (let index = 0; index < count; index++) names.push(await read(`getsplitname ${index}`));
        this.names = names;
      }
      const game = this.minimal ? 'Celeste' : await read('getgamename');
      const category = this.minimal ? 'All Chapters' : await read('getcategoryname');
      const offsetMs = this.minimal ? 0 : parseTime(await read('getoffset'));
      const gameTimeMs = parseTime(await read('getcurrentgametime'));
      const currentTimeMs = timingMethod === 'GameTime' ? gameTimeMs : parseTime(await read('getcurrenttime'));
      const lastSplitTimeMs = parseTime(await read('getlastsplittime'));
      const finalIndex = Number(await read('getsplitindex'));
      const finalPhase = await read('getcurrenttimerphase');
      const finalAttempt = useServerAttempts ? Number(await read('getattemptcount')) : attempt;
      const finalMethod = this.minimal ? timingMethod : await read('gettimingmethod');
      if (!['NotRunning', 'Running', 'Paused', 'Ended'].includes(phase)
        || !['GameTime', 'RealTime', 'SelectedTime'].includes(timingMethod)
        || !Number.isInteger(splitIndex) || splitIndex < -1 || splitIndex > count
        || !Number.isInteger(attempt)) throw new Error('Estado de LiveSplit inválido');
      if (this.socket === socket && revision === this.resetRevision && phase === finalPhase && splitIndex === finalIndex && attempt === finalAttempt && timingMethod === finalMethod) {
        this.error.set(null);
        // Celeste's accumulated file time drops to near zero for a new file.
        // Do not infer this from individual segment durations or a steady zero.
        const newFile = phase !== 'NotRunning' && this.previousPhase !== 'NotRunning'
          && gameTimeMs !== null && gameTimeMs >= 0 && gameTimeMs <= 1000
          && this.previousGameTimeMs !== null && this.previousGameTimeMs - gameTimeMs > 1000
          && this.previousAttempt === attempt;
        this.previousGameTimeMs = gameTimeMs;
        this.previousAttempt = attempt;
        if (newFile) {
          // Control commands have no response. Reset the real timer's segment
          // index, then start the new run; publish no data from the old index.
          this.reset();
          socket.send('starttimer');
        } else {
          this.previousPhase = phase;
          this.snapshots.next({ phase, splitIndex, attempt, timingMethod, currentTimeMs, lastSplitTimeMs,
            offsetMs, names: [...this.names], game, category });
        }
      }
    } catch (error) {
      if (this.socket !== socket) return;
      if (!this.minimal && error instanceof Error && /^Sin respuesta a (getattemptcount|gettimingmethod|getsplitcount|getsplitname|getgamename|getcategoryname|getoffset)/.test(error.message)) {
        this.minimal = true;
        this.compatibility.set('Servidor con API reducida: se usan los 8 segmentos y offset 0 del .lss de ejemplo. El reloj sigue el método seleccionado en LiveSplit; selecciona Game Time y mantén ese método durante la run.');
      }
      this.error.set(error instanceof Error ? error.message : 'Error leyendo LiveSplit');
      socket.close();
      return;
    }
    if (this.socket === socket && !this.stopped) this.pollTimer = setTimeout(() => void this.poll(socket), 100);
  }

  ngOnDestroy(): void { this.disconnect(); this.snapshots.complete(); this.resets.complete(); }
}
