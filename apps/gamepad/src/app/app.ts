import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <p class="app-name">Gamepad Inputs</p>
      <h1>Hello world!</h1>
      <p>La nueva app está lista para empezar.</p>
    </main>
  `,
  styles: `
    :host { display: grid; min-height: 100vh; place-items: center; }
    main { padding: 32px; text-align: center; }
    .app-name { color: #8db9ef; font-size: 14px; }
    h1 { margin: 12px 0; font-size: 42px; }
    p { color: #b5bfd3; }
  `,
})
export class App {}
