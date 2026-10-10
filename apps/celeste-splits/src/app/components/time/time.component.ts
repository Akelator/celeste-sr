import { Component, Input } from '@angular/core';
import { FormatTimePipe1 } from '../../pipes/format-time-1.pipe';
import { MillisPipe } from '../../pipes/millis.pipe';
import { FormatTimePipe } from '../../pipes/format-time.pipe';

@Component({
  selector: 'app-time',
  imports: [FormatTimePipe1, MillisPipe, FormatTimePipe],
  templateUrl: './time.component.html',
  styleUrl: './time.component.scss',
})
export class TimeComponent {
  @Input() time: number | null = null;
  @Input() size: number = 30;
  @Input() sign: boolean = false;
  @Input() precision: 0 | 1 | 2 = 2;
}
