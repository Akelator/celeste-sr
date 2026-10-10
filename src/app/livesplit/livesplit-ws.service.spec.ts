import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveSplitWsService } from './livesplit-ws.service';

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  static replies: Record<string, string> = {};
  static sent: string[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { FakeSocket.instances.push(this); queueMicrotask(() => this.onopen?.()); }
  send(command: string): void {
    FakeSocket.sent.push(command);
    if (command in FakeSocket.replies) queueMicrotask(() => this.onmessage?.({ data: FakeSocket.replies[command] }));
  }
  close(): void { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.(); }
}

describe('LiveSplit request/response transport', () => {
  let service: LiveSplitWsService;
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.instances = [];
    FakeSocket.sent = [];
    FakeSocket.replies = { getcurrenttimerphase: 'Running', getsplitindex: '0', getattemptcount: '1',
      gettimingmethod: 'GameTime', getsplitcount: '1', 'getsplitname 0': 'Prólogo',
      getgamename: 'Celeste', getcategoryname: 'Test', getoffset: '00:00:00',
      getcurrenttime: '00:00:02.1234567', getlastsplittime: '-' };
    vi.stubGlobal('WebSocket', FakeSocket);
    service = TestBed.inject(LiveSplitWsService);
  });
  afterEach(() => { service.ngOnDestroy(); vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('maps unlabelled responses to their sequential requests and emits a coherent snapshot', async () => {
    const listener = vi.fn();
    service.snapshots.subscribe(listener);
    service.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0]).toMatchObject({ names: ['Prólogo'], currentTimeMs: 2123, lastSplitTimeMs: null });
    expect(FakeSocket.sent.every(command => !command.includes('\n'))).toBe(true);
  });
  it('discards snapshots spanning a split change', async () => {
    const listener = vi.fn();
    service.snapshots.subscribe(listener);
    let reads = 0;
    Object.defineProperty(FakeSocket.replies, 'getsplitindex', { get: () => String(reads++), configurable: true });
    service.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).not.toHaveBeenCalled();
  });
  it('ignores additional empty frames instead of shifting request correlation', async () => {
    const originalSend = FakeSocket.prototype.send;
    vi.spyOn(FakeSocket.prototype, 'send').mockImplementation(function (this: FakeSocket, command: string) {
      originalSend.call(this, command);
      queueMicrotask(() => this.onmessage?.({ data: '' }));
    });
    const listener = vi.fn();
    service.snapshots.subscribe(listener);
    service.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
  it('falls back to the supplied Celeste profile when metadata commands are unsupported', async () => {
    delete FakeSocket.replies['getattemptcount'];
    const listener = vi.fn();
    service.snapshots.subscribe(listener);
    service.connect();
    await vi.advanceTimersByTimeAsync(4500);
    expect(service.compatibility()).not.toBeNull();
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0]).toMatchObject({ timingMethod: 'SelectedTime', offsetMs: 0 });
    expect(listener.mock.calls[0][0].names).toHaveLength(8);
  });
  it('closes on timeout, reconnects, and ignores late responses from the old connection', async () => {
    delete FakeSocket.replies['getcurrenttimerphase'];
    service.connect();
    await vi.advanceTimersByTimeAsync(2500);
    const old = FakeSocket.instances[0];
    expect(old.readyState).toBe(3);
    FakeSocket.replies['getcurrenttimerphase'] = 'Running';
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeSocket.instances).toHaveLength(2);
    old.onmessage?.({ data: 'unexpected' });
    expect(service.status()).toBe('connected');
  });
});
