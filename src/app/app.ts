import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="app-shell">
      <router-outlet></router-outlet>
    </main>
  `,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('celeste-cr');
}
