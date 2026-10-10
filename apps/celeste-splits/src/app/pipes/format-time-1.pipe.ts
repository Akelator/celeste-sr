import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatTime1', standalone: true, pure: true })
export class FormatTimePipe1 implements PipeTransform {
  transform(milliseconds: number | null | undefined, _sign: boolean = false): string {
    if (milliseconds == null) return '—';

    const absolute = Math.abs(Math.round(milliseconds));
    const hours = Math.floor(absolute / 3600000);
    const minutes = Math.floor(absolute / 60000) % 60;
    const seconds = Math.floor(absolute / 1000) % 60;
    const sign = !_sign || !milliseconds ? '' : milliseconds > 0 ? '+' : '-';
    if (hours > 0) {
      return `${sign}${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${sign}${minutes}:${String(seconds).padStart(2, '0')}`;
  }
}
