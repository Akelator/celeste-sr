import { DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { GamepadService } from './gamepad.service';
import { CrossInputComponent } from './components/cross-input/cross-input.component';

const BUTTON_INDEX = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  START: 9,
  LEFT_TRIGGER: 6,
  RIGHT_TRIGGER: 7,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
} as const;

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, PercentPipe, CrossInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  readonly gamepads = inject(GamepadService);

  get aPressed(): boolean {
    return this.isPressed('A');
  }
  get bPressed(): boolean {
    return this.isPressed('B');
  }
  get xPressed(): boolean {
    return this.isPressed('X');
  }
  get yPressed(): boolean {
    return this.isPressed('Y');
  }
  get lbPressed(): boolean {
    return this.isPressed('LB');
  }
  get rbPressed(): boolean {
    return this.isPressed('RB');
  }
  get leftStickPressed(): boolean {
    return this.isPressed('LEFT_TRIGGER');
  }
  get rightStickPressed(): boolean {
    return this.isPressed('RIGHT_TRIGGER');
  }
  get upPressed(): boolean {
    return this.isPressed('UP');
  }
  get rightPressed(): boolean {
    return this.isPressed('RIGHT');
  }
  get downPressed(): boolean {
    return this.isPressed('DOWN');
  }
  get leftPressed(): boolean {
    return this.isPressed('LEFT');
  }
  get startPressed(): boolean {
    return this.isPressed('START');
  }

  private isPressed(button: keyof typeof BUTTON_INDEX): boolean {
    const pad = this.gamepads.controller();
    return pad?.mapping === 'standard' && (pad.buttons[BUTTON_INDEX[button]]?.pressed ?? false);
  }

  ngOnInit(): void {
    this.gamepads.start();
  }
  ngOnDestroy(): void {
    this.gamepads.stop();
  }

  selectController(event: Event): void {
    this.gamepads.select(Number((event.target as HTMLSelectElement).value));
  }
}
