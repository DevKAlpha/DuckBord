# DuckBord — guía para Claude Code

DuckBord es una app de tableros Kanban (tipo Trello o Jira) para usuarios **técnicos y no técnicos**. La entrada debe ser muy fácil: un onboarding por perfil y plantilla. La app debe sentirse bien de usar. Más adelante se integrará con agentes de IA, GitHub, suites de Google y Microsoft, y herramientas DevOps.

**Nombre**: el nombre oficial es **DuckBord** (repo `DevKAlpha/DuckBord`, web `https://devkalpha.github.io/DuckBord/`). Antes se llamaba Devbord. Los identificadores internos siguen como `devbord` a propósito y **no se renombran**:
- los paquetes `@devbord/*`;
- las claves `devbord:*` de localStorage y la base IndexedDB, porque cambiarlas pierde los tableros y preferencias guardados;
- el formato de archivo `devbord.board`, para que se sigan importando las exportaciones viejas;
- la sala del estanque y el canal OAuth `devbord-oauth`.

## Reglas de arquitectura (del usuario, no negociables)
1. Stack: **React + Node.js + Tailwind CSS + TypeScript**.
2. Acceso actual: **GitHub Pages** (solo estático). El backend Node no corre en Pages.
3. Patrón **MVC** en web y en API.
4. **Docker** para todo (preparado para Dokploy).
5. Usar las **skills** del proyecto (`.claude/skills`) y las que se añadan.
6. Estética **pixel art moderna con toques Apple**: minimalista y con colores que combinen.
7. Claude gestiona los commits. **Una rama por apartado**.
8. Código **comentado**, estructurado y mantenible.
9. Compatibilidad futura con las APIs de **GitHub, Google y Microsoft** (y sus suites).

## Estructura
```
apps/web        React SPA (Vite). Se publica en GitHub Pages.
apps/api        Node + Express. Corre en Docker/Dokploy, no en Pages.
apps/desktop    App de escritorio (Electron): la misma web con tableros en SQLite local.
packages/shared Tipos + schemas zod compartidos (fuente única del modelo de dominio).
docker/         Dockerfiles. docker-compose.yml en la raíz.
```

### MVC en `apps/web/src`
- `models/`: entidades y **repositorios**. `BoardRepository` es la interfaz. Hoy se usa `IndexedDbBoardRepository`. `HttpBoardRepository` reemplazará al anterior cuando la API esté desplegada (se cambia en `models/repositories/index.ts`).
- `controllers/`: stores Zustand y hooks. Toda la lógica de negocio va aquí.
- `views/`: componentes React **presentacionales**. Nunca importan repositorios ni Dexie.
- `design/`: tokens y componentes UI base (pixel + Apple).
- `templates/`: plantillas de tablero por perfil. El contenido se escribe por idioma (`templates/locales/{es,en,ko}.ts`) con la misma estructura; un test compara las formas.
- `i18n/`: idiomas (español, inglés y coreano). Ningún texto visible va escrito en el código: se usa `t('clave')` (en vistas, `const t = useT()`; fuera de React, `t` importado). El español (`i18n/locales/es.ts`) es la fuente; `en.ts` y `ko.ts` se tipan contra él, así que una clave que falte no compila. Plurales con `_one`/`_other` y `t.n(clave, n)`. Fechas con `dateFormat()`. Inglés y coreano se cargan bajo demanda (junto con sus plantillas). Primera visita: idioma del navegador (es, ko; si no, en); el selector de la barra superior guarda la elección en `devbord:lang`. El coreano usa la fuente pixel Galmuri11 (`design/tokens.css`, solo se descarga si hay Hangul en pantalla).
- **Autocorrección** (historia 26), como Word: `views/components/SpellAssist` escucha todos los campos de texto con un solo listener; cada palabra se revisa una vez al terminar (espacio, puntuación o Enter). Las reglas son puras (`i18n/spelling/engine.ts`) y cada idioma tiene su lista (`i18n/spelling/{es,en,ko}.ts`, se cargan bajo demanda). Lo seguro se corrige solo con `execCommand('insertText')`, para que Ctrl+Z lo deshaga; deshacer una corrección deja esa palabra en paz (`devbord:spell-skip`). Las palabras cuyo sentido cambia con la tilde (más/mas, él/el, está/esta…) nunca se cambian solas: muestran una sugerencia (Popover API, dentro del `<dialog>` abierto). Un campo queda fuera con `spellCheck={false}` (nombres, enlaces, claves). Se apaga con el botón de la barra superior (`controllers/spellingController`, `devbord:spell`) y no corre en dispositivos solo táctiles (ya corrige el teclado del móvil). Nunca toca código entre comillas invertidas, enlaces, palabras con números ni nombres con mayúsculas internas (GitHub).
- `integrations/`: conexiones con suites de trabajo (Google, Microsoft, Slack). Cada conexión declara **herramientas con forma MCP** (`connections.ts`: nombre, descripción, JSON Schema, `run`), para que un agente o un servidor MCP en `apps/api` las use después. Las cuentas de Google y Microsoft usan OAuth en popup (`accounts.ts`: token para Google, PKCE para Microsoft; vuelve por `public/oauth.html`). El token va en `sessionStorage`, nunca en el tablero. Los Client ID salen de `VITE_GOOGLE_CLIENT_ID` y `VITE_MS_CLIENT_ID` (guía en `docs/integraciones.md`). Slack usa un webhook por tablero, guardado solo en `localStorage`. Los enlaces adjuntos (`Card.links`, solo http(s)) se reconocen por URL sin conectar nada. El estado vive en `controllers/connectionsController.ts` y las vistas en `views/connections/`.
- `views/cursor/`: cursor pixel. Los sprites son **cursores nativos** (`cursor: url(data:svg)`, generados con los colores y el sombrero del tema): los dibuja el sistema, sin retraso ni JS por movimiento. Solo se marca con `data-pc` el control bajo el puntero y el resto hereda (`cursor.css`): no usar selectores de descendientes por elemento, triplican el recálculo de estilo. Una capa encima pone la selección (esquinas de dos tonos), las pistas y las chispas. Su estado vive en `controllers/cursorController.ts`. Se monta siempre con puntero fino: no se puede apagar (es parte de la marca).
- `models/collab/`: tiempo real de los tableros de **equipo**. `CollabTransport` es la interfaz; hoy usa `P2PTransport` (WebRTC con Trystero, sin servidor, funciona en Pages). El tablero vive en un CRDT de Yjs (`yBoard.ts`) que fusiona ediciones simultáneas. Para el servidor propio: implementar un transporte WebSocket en `apps/api` y elegirlo en `models/collab/index.ts` (`VITE_COLLAB_URL`). Yjs y Trystero se cargan solo al abrir un tablero de equipo.
- **Apariencia**: modo **oscuro por defecto** con botón claro/oscuro en la barra superior (`themeController.toggleMode`, guarda en `devbord:theme`; index.html lo aplica antes de pintar). El botón se oculta en temas de temporada. Los tableros pueden llevar un **tema de temporada** (`Board.skin`: halloween, christmas) con aspecto fijo, sin claro/oscuro: `controllers/themeController` pone `data-skin`, `design/skins.css` cambia tokens, columnas (`.kb-col`), tarjetas (`.kb-card`) y cursor, `views/board/SkinBackdrop` dibuja el fondo y los sprites son rejillas de texto en `design/skinSprites.ts`. El botón de la barra superior reduce animaciones (`controllers/motionController`, guarda la elección).
- **Estanque de patitos** (inicio): `views/components/DuckPond` + `pondPhysics` (agua con ondas y patitos que chocan). Un patito por persona o agente en línea: `controllers/lobbyController` entra en una sala pública del mismo transporte P2P y solo anuncia `kind` (user/agent), nunca nombres ni datos.
- `views/team/`: presencia (avatares, estado, Invitar), cursores remotos y petición de nombre.
- `views/sketch/` + `models/sketch/` + `controllers/sketchController.ts`: **pizarra** superpuesta al tablero (trazos, formas, texto y notas adhesivas). Vive en un documento Yjs: local para tableros individuales (`docStore`, clave `sketch:<id>`) y dentro del documento de colaboración para los de equipo, así se sincroniza en vivo por la misma sesión. Deshacer con `Y.UndoManager` (solo lo propio). Se carga bajo demanda. Aspecto de Excalidraw (historia 24): los trazos se dibujan a mano (`views/sketch/render.ts`: rough.js para formas, iconos y pasos, con una semilla por trazo para que se vean igual en todas las pantallas; perfect-freehand para lápiz y marcador), papel de puntos y texto con fuente a mano (Shantell Sans, Gaegu para coreano, se pide al abrir la pizarra). Herramientas: seleccionar (mover, redimensionar por las esquinas, cambiar estilo, duplicar, borrar), lápiz, marcador, línea, flecha, rectángulo, rombo, círculo, texto, nota, iconos propios de DuckBord (`views/sketch/icons.ts`), pasos numerados, borrador y láser. Panel de estilo (`StylePanel`): color, grosor, línea, trazo a mano y relleno; con selección cambia lo seleccionado. Atajos como Excalidraw (V, P, L, A, R, D, O, T, K…). Los tableros individuales tienen **varias pizarras** (`SketchBook`, lista en `sketch.sheets` del mismo documento) con selector; los de equipo comparten **una sola** pizarra a propósito (sin selector, para no desorientar al equipo). En equipo, la presencia lleva el puntero de la pizarra (`pen`, con `laser`) y la nota que cada uno edita (`editingNote`).
- **Escritorio** (historia 27, `apps/desktop`, guía en `docs/escritorio.md`): Electron carga la web compilada (`npm run web -w @devbord/desktop` la copia a `apps/desktop/web`) desde el esquema propio `duckbord://app` (origen real: localStorage, módulos y fetch funcionan como en la web). El preload expone `window.duckbord` (`DesktopBridge` en shared): `models/desktop.ts` lo detecta, y entonces `DesktopBoardRepository` y `docStore` guardan en SQLite (`apps/desktop/src/store.ts`, `node:sqlite`, sin módulos nativos; migraciones con `PRAGMA user_version`, solo se añaden pasos). Datos en la carpeta del usuario (`%APPDATA%\DuckBord`), nunca en la del programa. Registro de errores en `logs/duckbord.log` (`src/log.ts`: errores del proceso principal, de la base, de la página con su stack y avisos de consola; rota al pasar 1 MB). Menús y corrector nativo siguen el idioma de la web (`setLocale`). Ventana con `contextIsolation` + `sandbox`; los enlaces se abren en el navegador. Instalador de Windows por defecto en `Program Files (x86)\DuckBord` (`resources/installer.nsh`), por pedido del usuario. Electron va fijado a una versión exacta (electron-builder lo exige). La versión pública es `displayVersion` en `apps/desktop/package.json` (0.1A: nombres de los instaladores, etiqueta, Release y Acerca de); `version` sigue numérica (0.1.0) porque npm y el instalador de Windows lo exigen. Configuración del instalador en `apps/desktop/electron-builder.ts`. Instaladores de los 3 sistemas con `.github/workflows/desktop.yml`; una etiqueta `v*` los publica en GitHub Releases.
- Tableros **individuales** y **de equipo** se eligen al crear (`Board.mode`) y nunca se mezclan: se listan por separado.

### MVC en `apps/api/src`
`routes → controllers → services → models`. La validación usa los schemas de `@devbord/shared`.

### GitHub Projects (estilo Zenhub)
- Un tablero con `Board.github` es **espejo de un Project v2**, y GitHub es la fuente de verdad. Los ids se reutilizan: `Column.id` = opción de Status (`none` = sin estado), `Card.id` = item del Project, `Label.id` = etiqueta del repo.
- API (`apps/api/src/github`):
  - Inicia sesión con la GitHub App (OAuth de usuario). La web solo guarda un id de sesión opaco; los tokens se guardan cifrados en SQLite (`node:sqlite`, `DATA_DIR`).
  - `ProjectMapper` convierte el Project en un Board.
  - `ProjectOps` valida las ops con zod y las escribe por GraphQL como el usuario.
  - `LiveHub` avisa por SSE. Lo disparan los webhooks firmados y un sondeo de los Projects abiertos.
  - `GITHUB_FAKE=1` levanta un GitHub en memoria para tests y pruebas locales.
- Web:
  - `controllers/githubController` hace el sign-in en popup, encola las ops en orden y aplica los snapshots con `mergeSnapshot` (shared), que conserva lo que solo existe en DuckBord.
  - `boardController` le pasa las ops de cada intent mediante `setGithubSink`. Solo manda los campos que cambiaron.
  - Las columnas de un tablero vinculado no se editan en DuckBord (son el campo Status y se editan en GitHub).
- Guía de configuración (GitHub App, variables, despliegue): `docs/github.md`.

## Git
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`).
- **Ramas por apartado** (permanentes, una por área de la app). Todo cambio se hace en la rama de su área y **se hace push a esa rama directamente**, sin preguntar:
  | Rama | Apartado |
  |---|---|
  | `area/shared` | `packages/shared`: modelo de dominio, schemas, operaciones puras |
  | `area/design` | `apps/web/src/design` + `views/cursor`: tokens, componentes base, animaciones, cursor pixel |
  | `area/board` | `views/board`, `controllers/boardController`: tablero, columnas, tarjetas, DnD, estados |
  | `area/boards` | `views/pages`, `views/components`, `templates`, `models/boardFile`: inicio, onboarding, plantillas, importar/exportar |
  | `area/collab` | `models/collab`, `views/team`, `controllers/collab*`, `controllers/identity*`: tableros de equipo en tiempo real |
  | `area/sketch` | `views/sketch`, `models/sketch`, `controllers/sketchController`: pizarra y notas adhesivas |
  | `area/integrations` | `integrations/`, `controllers/connections*`, `views/connections`: Google, Microsoft, Slack |
  | `area/api` | `apps/api` (incluye el módulo GitHub `apps/api/src/github`) |
  | `area/desktop` | `apps/desktop`, `models/desktop.ts`, `models/repositories/DesktopBoardRepository.ts`: app de escritorio e instaladores |
  | `area/infra` | Docker, CI/CD, configuración, documentación |
- Un cambio que toca varias áreas va en la rama del área principal y se menciona en el commit.
- Flujo: `area/*` (push directo) → merge `--no-ff` a **`develop`** (integración; el CI corre en cada push) → **`main` = producción**.
- Antes de empezar en un área: `git switch area/<x> && git merge develop`, para partir de lo último integrado.
- **`main` solo se actualiza con aprobación explícita del usuario**, después de validar en `develop` (lint, typecheck, tests, build y prueba en el navegador). Cada push a `main` despliega GitHub Pages.
- Las ramas `feat/*` y `fix/*` antiguas son historial; no se usan para trabajo nuevo.
- **Sin atribución de IA**: nunca añadir `Co-Authored-By` ni "Generated with Claude Code" en commits o PRs. El único autor es la cuenta del usuario (DevKAlpha).

## Código
- TypeScript `strict`. Nada de `any` salvo con un comentario que lo justifique.
- JSDoc en los exports públicos. Los comentarios explican el **por qué**, no el qué.
- Accesibilidad: todo lo arrastrable también se opera con teclado (dnd-kit KeyboardSensor). Usar labels y foco visible.
- Mobile-first.
- Animaciones: usar los helpers de `design/motion.ts` (`animateIn/Out/Land/Flash/Shake`, `flip`). Solo `transform`/`opacity`/`clip-path` y `steps()`. **Todo efecto queda dentro de la caja de su elemento** (las listas hacen scroll y recortan): nada de escalar hacia fuera, brillos ni sombras difusas; para chispas o destellos usar `pixelBurst`/`animateFlash`, que dibujan en una capa recortada a la tarjeta. Sombras pixel duras (`shadow-pixel`, `shadow-lift`). Respetar `html[data-motion="lite"]` (solo hardware modesto; el ajuste "reducir movimiento" del SO no las apaga, decisión de producto): nada de bucles decorativos ni filtros en lite. Lite se activa solo para la sesión si se miden menos de ~40 fps (`watchMotion` en `controllers/motionController`). Los bucles decorativos se pausan con la Web Animations API cuando no se ven: detrás de un modal y al arrastrar (`holdLoops`), y en columnas fuera de pantalla (`pauseLoopsOffscreen`). Medir antes de optimizar: coste de main thread con Edge headless y CDP (`Performance.getMetrics`).
- **Recorrido** (botón en el tablero): cada tarjeta guarda las columnas por las que pasa (`Card.trail`, últimas 50; `cardTrail` en shared rellena las antiguas). `views/board/journey.ts` calcula los movimientos (puro, con tests) y `JourneyModal` dibuja el diagrama pixel (adelante arriba, atrás abajo) y el recorrido de cada tarjeta.
- **Favicon por tema**: `themeController` pone el pato con sombrero del tema (`duckFaviconUri` en `design/duck.ts`) y vuelve a `favicon.svg` en el tema por defecto.
- Estados de tarjeta (telaraña, caliente, congelada): lógica pura en `views/board/cardMood.ts`, sprites en `MoodDecor.tsx`.

## Comandos
```
npm install
npm run dev        # web en http://localhost:5173
npm run dev:api    # api en http://localhost:3000
npm run lint && npm run typecheck && npm test
npm run build
docker compose up --build   # web :8080, api :3000
npm run start -w @devbord/desktop   # app de escritorio (Electron)
npm run dist -w @devbord/desktop    # instalador del sistema actual (apps/desktop/release)
```

## Skills / MCP en uso
- `ponytail`: cambio mínimo, sin sobre-ingeniería.
- `graphify`: grafo de conocimiento del código (`graphify-out/`, ignorado en git).
- `caveman`: estilo de respuesta en chat. No afecta al código ni a los commits.
- `code-review`, `simplify`: antes de mergear ramas grandes.
- MCP: Claude Docs, Google Drive (disponibles). _Añadir aquí los nuevos con su propósito._
