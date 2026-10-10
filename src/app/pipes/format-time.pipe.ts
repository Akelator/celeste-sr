import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatTime', standalone: true, pure: true })
export class FormatTimePipe implements PipeTransform {
  transform(
    milliseconds: number | null | undefined,
    _sign: boolean = false,
    precision: 0 | 1 | 2 = 2,
  ): string {
    if (milliseconds == null) return '—';

    const absolute = Math.abs(Math.round(milliseconds));
    const hours = Math.floor(absolute / 3600000);
    const minutes = Math.floor(absolute / 60000) % 60;
    const seconds = Math.floor(absolute / 1000) % 60;
    const fraction = String(absolute % 1000)
      .padStart(3, '0')
      .slice(0, precision);
    const sign = !_sign || !milliseconds ? '' : milliseconds > 0 ? '+' : '-';
    const _frac = precision > 0 ? `.${fraction}` : '';
    if (hours > 0) {
      return `${sign}${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${_frac}`;
    }
    return `${sign}${minutes}:${String(seconds).padStart(2, '0')}${_frac}`;
  }
}
