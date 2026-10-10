# Leer inputs de un mando Xbox desde Electron

No necesitas PowerShell ni un WebSocket para empezar.

La opción más sencilla es la **Gamepad API**, accesible desde JavaScript en el renderer de Electron:

```ts
const gamepad = navigator.getGamepads().find(pad => pad !== null);

if (gamepad) {
  console.log(gamepad.buttons); // Botones y gatillos
  console.log(gamepad.axes);    // Sticks
}
```

Permite leer botones pulsados, presión de gatillos y posición de los sticks. Consultas el estado periódicamente —habitualmente con `requestAnimationFrame`— y actualizas tu dibujo del mando. [Documentación de Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API).

**Para tu caso, hay un detalle clave: necesitamos que funcione mientras el juego tenga el foco.** La detección inicial puede requerir pulsar un botón con nuestra ventana enfocada; además, habrá que cuidar el refresco en segundo plano, porque Electron tiene `backgroundThrottling` activado por defecto. [Documentación de Electron](https://www.electronjs.org/docs/latest/api/browser-window).

Si necesitamos una lectura independiente del renderer, la alternativa es **XInput**, la API nativa de Windows para mandos Xbox. Un pequeño módulo nativo o proceso auxiliar leería `XInputGetState` y enviaría los datos a Angular mediante IPC de Electron. Windows ofrece esa API, **no un servidor WS de inputs listo para conectar**. [Documentación de XInput](https://learn.microsoft.com/en-us/windows/win32/xinput/getting-started-with-xinput).

**Mi consejo:** empezar con Gamepad API y comprobar pronto el comportamiento con el juego enfocado. Si cumple, tendremos una app sencilla sin DLL propia ni procesos auxiliares. Si el segundo plano da problemas, pasamos a XInput manteniendo el mismo modelo de datos y la misma UI.
