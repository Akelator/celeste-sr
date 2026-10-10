import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'millis', standalone: true, pure: true })
export class MillisPipe implements PipeTransform {
  transform(milliseconds: number | null | undefined, precision: 0 | 1 | 2 = 2): string {
    if (milliseconds == null) return '';
    const absolute = Math.abs(Math.round(milliseconds));
    const fraction = String(absolute % 1000)
      .padStart(3, '0')
      .slice(0, precision);
    const _frac = precision > 0 ? `.${fraction}` : '';
    return _frac;
  }
}
