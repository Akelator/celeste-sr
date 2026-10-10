# Celeste Tools — monorepo

Un único workspace Angular con dependencias compartidas en la raíz y dos aplicaciones independientes:

```text
apps/
  celeste-splits/    # Cliente LiveSplit existente
    src/
    public/
    electron/
    electron-builder.cjs
    package.json
  gamepad/           # Hello world; sin lectura de inputs todavía
    src/
    public/
    electron/
    electron-builder.cjs
    package.json
```

Instala las dependencias en la raíz. No hace falta instalar nada dentro de cada app.

| Acción desde la raíz | Celeste | Gamepad |
| --- | --- | --- |
| Serve Angular | `npm run start:celeste` | `npm run start:gamepad` |
| Build Angular | `npm run build:celeste` | `npm run build:gamepad` |
| Electron con Angular servido | `npm run electron:dev:celeste` | `npm run electron:dev:gamepad` |
| Electron con el build local | `npm run electron:start:celeste` | `npm run electron:start:gamepad` |
| Build e instalador de Windows | `npm run dist:win:celeste` | `npm run dist:win:gamepad` |

Para desarrollar, deja el serve abierto y ejecuta Electron en otra terminal. Los puertos son **4200 para Celeste** y **4201 para Gamepad**, por lo que pueden ejecutarse juntas. Para Electron con archivos locales, genera primero el build Angular de esa app.

Cada app también tiene sus propios scripts `start`, `electron:start`, `electron:dev` y `dist:win` en su `package.json`: puedes usarlos desde su carpeta o, por ejemplo, con `npm --prefix apps/gamepad start` desde la raíz.

Los builds web se generan en `apps/<app>/dist`; los instaladores en `release/celeste-splits` y `release/gamepad`. Cada instalador tiene su propia identidad y empaqueta solo su app. Se mantiene el nombre interno `celeste-cr` en Celeste para conservar la identidad de la aplicación existente.

Los scripts de la raíz identifican explícitamente la app; se han eliminado los alias antiguos y redundantes. Los scripts `build:celeste` y `build:gamepad` se conservan porque los instaladores necesitan generar primero el frontend Angular. El código, los PNG y el aspecto de Celeste se han trasladado a su carpeta sin cambios de funcionalidad.

## Celeste Splits

Cliente Angular + Electron para el WebSocket de LiveSplit.

1. En LiveSplit, carga `agent/celeste_minimun-splits-data.lss` y activa el autosplitter de Celeste.
2. Activa el servidor **WebSocket** de LiveSplit en el puerto **16834**.
3. Desde la raíz, ejecuta `npm run start:celeste` para la UI web. Para Electron en desarrollo, ejecuta también `npm run electron:dev:celeste` en otra terminal.
4. Para usar Electron con archivos locales: `npm run build:celeste` y después `npm run electron:start:celeste`.
5. `npm run dist:win:celeste` genera el instalador de Windows.

La conexión a `ws://localhost:16834/livesplit` es automática y reintenta tras desconexiones. La tabla muestra los ocho segmentos del ejemplo; al conectar usa los nombres y el número de segmentos de LiveSplit.

## Datos

La app detecta una nueva partida por una caída de más de un segundo del acumulado `getcurrentgametime` hasta el intervalo 0–1 s, mientras LiveSplit mantiene el mismo intento activo. Envía `reset` y `starttimer` para volver al primer segmento y cerrar el registro anterior. Un cero sostenido no dispara resets; si LiveSplit ya cambió el contador de intento, no se vuelve a resetear. Es una heurística del reloj, sin modificar la DLL de Celeste.

- `LiveSplitWsService`: consultas secuenciales sin identificadores ni saltos de línea; polling cada 100 ms después de cada lectura completa, timeout de 2,5 s y reconexión cada 2 s. Comprueba fase, índice, intento y método antes/después para descartar lecturas que atraviesan una transición.
- `RunService`: transforma lecturas en una run con límites acumulados y duraciones individuales; gestiona fin, reset y deshacer splits. Conserva intentos parciales y completos en `localStorage`, clave `celeste-runs:v1`, con versión de esquema, identidad de intento, juego, categoría, método temporal y segmentos.
- El reloj y los límites usan el método temporal seleccionado en LiveSplit (`getcurrenttime` y `getlastsplittime`). Para Celeste, selecciona **Game Time** en LiveSplit. No se consultan ni se modifican comparaciones.
- Las duraciones se calculan restando límites acumulados consecutivos (el primero usa el offset). El segmento activo se actualiza con el reloj recibido, sin interpolación local.
- `—` significa dato ausente. Si la app se conecta tarde, se pierde más de un split entre consultas o se omite un segmento, el WS no permite recuperar todos los límites: no se estiman tiempos individuales. El historial local queda disponible para futuras comparaciones; no se importa el historial del `.lss`.
- Al desconectar se mantiene la última lectura. Los cambios en splits se guardan con el mismo ID para que deshacer/repetir no duplique resultados. Un cambio de método temporal inicia un registro independiente para evitar mezclar relojes. Reiniciar la app conserva el historial, pero comienza una nueva observación de la run activa.
- Si el servidor no responde a consultas de metadatos, se activa automáticamente un modo compatible con el `.lss` suministrado (ocho segmentos y offset cero), indicado en la UI. Se conservan el reloj, la fase y los límites recibidos; el método se registra como `SelectedTime`, sin afirmar que sea Game Time. En ese modo mantén el método de LiveSplit durante toda la run. Tras una reconexión se crea una observación independiente porque no se puede verificar el número de intento; no se mezclan límites de posibles runs distintas.
- `node agent/check-livesplit.cjs` comprueba los comandos del servidor sin modificar su estado (requiere Node con WebSocket global).

Referencia del protocolo: [CommandServer.cs de LiveSplit](https://github.com/LiveSplit/LiveSplit/blob/master/src/LiveSplit.Core/Server/CommandServer.cs).
