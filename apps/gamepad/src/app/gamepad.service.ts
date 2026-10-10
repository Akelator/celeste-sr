import { computed, inject, Injectable, NgZone, OnDestroy, signal } from '@angular/core';
import { GAMEPAD_POLL_INTERVAL_MS } from './app.constants';

const XBOX_BUTTON_NAMES = [
  'A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu',
  'LS', 'RS', '↑', '↓', '←', '→', 'Xbox',
];

export interface ButtonState {
  index: number;
  name: string;
  pressed: boolean;
  value: number;
}

export interface ControllerState {
  index: number;
  id: string;
  mapping: string;
  buttons: ButtonState[];
  axes: number[];
}

@Injectable({ providedIn: 'root' })
export class GamepadService implements OnDestroy {
  private readonly zone = inject(NgZone);
  readonly controllers = signal<ControllerState[]>([]);
  readonly selectedIndex = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly controller = computed(() => this.controllers().find(pad => pad.index === this.selectedIndex()) ?? null);
  readonly buttons = computed(() => {
    const pad = this.controller();
    return pad?.buttons.filter(button => pad.mapping !== 'standard' || (button.index !== 6 && button.index !== 7)) ?? [];
  });
  readonly triggers = computed(() => {
    const pad = this.controller();
    return pad?.mapping === 'standard' ? pad.buttons.filter(button => button.index === 6 || button.index === 7) : [];
  });
  readonly sticks = computed(() => {
    const pad = this.controller();
    if (!pad || pad.mapping !== 'standard' || pad.axes.length < 4) return [];
    return [
      { name: 'Stick izquierdo', x: pad.axes[0], y: pad.axes[1] },
      { name: 'Stick derecho', x: pad.axes[2], y: pad.axes[3] },
    ];
  });
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private previousState = '';
  private readonly onConnectionChange = () => this.read();

  start(): void {
    if (this.running) return;
    if (typeof navigator.getGamepads !== 'function') {
      this.error.set('La Gamepad API no está disponible en esta ventana.');
      return;
    }
    this.running = true;
    window.addEventListener('gamepadconnected', this.onConnectionChange);
    window.addEventListener('gamepaddisconnected', this.onConnectionChange);
    this.zone.runOutsideAngular(() => this.poll());
  }

  select(index: number): void {
    if (this.controllers().some(pad => pad.index === index)) this.selectedIndex.set(index);
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    window.removeEventListener('gamepadconnected', this.onConnectionChange);
    window.removeEventListener('gamepaddisconnected', this.onConnectionChange);
  }

  private poll(): void {
    if (!this.running) return;
    this.read();
    this.timer = setTimeout(() => this.poll(), GAMEPAD_POLL_INTERVAL_MS);
  }

  private read(): void {
    try {
      // Read fresh objects on every tick; connection events alone do not stream inputs.
      const controllers = Array.from(navigator.getGamepads())
        .filter((pad): pad is Gamepad => pad !== null && pad.connected)
        .map(pad => ({
          index: pad.index, id: pad.id, mapping: pad.mapping,
          buttons: pad.buttons.map((button, index) => ({
            index,
            name: pad.mapping === 'standard' ? XBOX_BUTTON_NAMES[index] ?? `Botón ${index}` : `Botón ${index}`,
            pressed: button.pressed, value: button.value,
          })),
          axes: [...pad.axes],
        }));
      const serialized = JSON.stringify(controllers);
      if (serialized !== this.previousState) {
        this.previousState = serialized;
        this.controllers.set(controllers);
        if (!controllers.some(pad => pad.index === this.selectedIndex())) {
          this.selectedIndex.set(controllers[0]?.index ?? null);
        }
      }
      this.error.set(null);
    } catch {
      this.previousState = '';
      this.controllers.set([]);
      this.selectedIndex.set(null);
      this.error.set('No se puede acceder al mando. Abre la app en localhost o en Electron y dale el foco para activar la detección.');
    }
  }

  ngOnDestroy(): void { this.stop(); }
}
