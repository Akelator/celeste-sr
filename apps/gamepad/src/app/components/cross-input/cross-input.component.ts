import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-cross-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cross-input.component.html',
  styleUrl: './cross-input.component.scss',
})
export class CrossInputComponent {
  @Input() upPressed = false;
  @Input() rightPressed = false;
  @Input() downPressed = false;
  @Input() leftPressed = false;
}
