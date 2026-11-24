/**
 * DuckBord for the desktop (story 27): the same web app, in its own window,
 * with what a browser cannot give it.
 *
 * - Boards and whiteboards in a SQLite file in the user's data folder
 *   (store.ts), never cleared like browser storage.
 * - An error log (log.ts) with errors of the app, the database and the page.
 * - Native spellchecker in the app's language, with suggestions on right click.
 *
 * The app files are served from a private scheme (duckbord://app) instead of
 * file://: a real origin keeps localStorage, modules and fetch working as on
 * the web. Nothing else is loaded in the window: links open in the browser.
 */
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  session,
  shell,
  type ContextMenuParams,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  type MenuItemConstructorOptions,
} from 'electron';
import path from 'node:path';
// Bundled by esbuild: the public version (0.1A), not the numeric one npm needs.
import pkg from '../package.json';
import { pathToFileURL } from 'node:url';
import { createLog, describe, type Level } from './log';
import { openStore, type Store } from './store';
import { fill, langOf, SPELL_LANGUAGES, TEXTS, type Lang, type Texts } from './texts';

const SCHEME = 'duckbord';
const ORIGIN = `${SCHEME}://app`;
const WEBSITE = 'https://devkalpha.github.io/DuckBord/';
const isMac = process.platform === 'darwin';

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// %APPDATA%\DuckBord on Windows, ~/Library/Application Support/DuckBord on
// macOS, ~/.config/DuckBord on Linux. The program folder is read-only.
const dataDir = app.getPath('userData');
const log = createLog(path.join(dataDir, 'logs'));
const webRoot = path.join(__dirname, '..', 'web');

let store: Store | null = null;
let win: BrowserWindow | null = null;
let lang: Lang = langOf(app.getLocale());
const texts = (): Texts => TEXTS[lang];

process.on('uncaughtException', (err) => log.write('error', 'main', ...describe(err)));
process.on('unhandledRejection', (err) => log.write('error', 'main', ...describe(err)));

/** Serves the built web app (apps/desktop/web), never a file outside it. */
function serveApp() {
  protocol.handle(SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    const file = path.resolve(
      webRoot,
      decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html',
    );
    if (!file.startsWith(webRoot + path.sep)) return new Response('Not found', { status: 404 });
    try {
      return await net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

/** Only our own page may use the bridge. */
const fromApp = (event: IpcMainEvent | IpcMainInvokeEvent) =>
  event.senderFrame?.url.startsWith(`${ORIGIN}/`) === true;

/** A database call from the page: errors are logged, then reported back to it. */
function handle(channel: string, run: (db: Store, ...args: unknown[]) => unknown) {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    if (!fromApp(event) || !store) throw new Error('Not available');
    try {
      return run(store, ...args);
    } catch (err) {
      log.write('error', 'database', `${channel}: ${describe(err)[0]}`, describe(err)[1]);
      throw err;
    }
  });
}

function bridge() {
  handle('boards:list', (db) => db.listBoards());
  handle('boards:get', (db, id) => db.getBoard(id));
  handle('boards:save', (db, board) => db.saveBoard(board));
  handle('boards:remove', (db, id) => db.removeBoard(id));
  handle('docs:get', (db, key) => db.getDoc(key));
  handle('docs:put', (db, key, state) => db.putDoc(key, state));
  handle('docs:remove', (db, key) => db.removeDoc(key));
  ipcMain.on('app:locale', (event, locale: unknown) => {
    if (fromApp(event) && typeof locale === 'string') applyLanguage(langOf(locale));
  });
  ipcMain.on('app:log', (event, level: unknown, message: unknown, detail: unknown) => {
    if (!fromApp(event)) return;
    const safe: Level = level === 'error' || level === 'warn' ? level : 'info';
    log.write(safe, 'page', String(message), typeof detail === 'string' ? detail : undefined);
  });
}

/** Menus and spellchecker in the app's language. */
function applyLanguage(next: Lang) {
  lang = next;
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu()));
  if (isMac) return; // macOS uses its own spellchecker, in the system's languages
  const ses = session.defaultSession;
  const available = new Set(ses.availableSpellCheckerLanguages);
  const pick = (l: Lang) => SPELL_LANGUAGES[l].find((code) => available.has(code));
  // English too: technical words (deploy, backlog) are common in any language.
  const codes = [pick(next), next === 'en' ? undefined : pick('en')].filter(Boolean) as string[];
  if (codes.length) ses.setSpellCheckerLanguages(codes);
}

function showAbout() {
  const t = texts();
  void dialog.showMessageBox({
    type: 'info',
    title: t.about,
    message: 'DuckBord',
    detail: fill(t.aboutDetail, { version: pkg.displayVersion, data: dataDir }),
    icon: path.join(__dirname, '..', 'resources', 'icon.png'),
  });
}

function menu(): MenuItemConstructorOptions[] {
  const t = texts();
  // On Windows and Linux the page handles Ctrl+Z, Ctrl+C… itself (the
  // whiteboard has its own undo): the menu only shows the shortcuts.
  const edit = (
    role: MenuItemConstructorOptions['role'],
    label: string,
  ): MenuItemConstructorOptions => ({
    role,
    label,
    registerAccelerator: isMac,
  });
  return [
    ...(isMac
      ? [
          {
            label: 'DuckBord',
            submenu: [
              { label: t.about, click: showAbout },
              { type: 'separator' },
              { role: 'hide', label: t.hide },
              { role: 'hideOthers', label: t.hideOthers },
              { role: 'unhide', label: t.showAll },
              { type: 'separator' },
              { role: 'quit', label: t.quit },
            ],
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: t.file,
      submenu: [isMac ? { role: 'close', label: t.close } : { role: 'quit', label: t.quit }],
    },
    {
      label: t.edit,
      submenu: [
        edit('undo', t.undo),
        edit('redo', t.redo),
        { type: 'separator' },
        edit('cut', t.cut),
        edit('copy', t.copy),
        edit('paste', t.paste),
        edit('selectAll', t.selectAll),
      ],
    },
    {
      label: t.view,
      submenu: [
        { role: 'reload', label: t.reload },
        { role: 'toggleDevTools', label: t.devTools },
        { type: 'separator' },
        { role: 'resetZoom', label: t.resetZoom },
        { role: 'zoomIn', label: t.zoomIn },
        { role: 'zoomOut', label: t.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t.fullScreen },
      ],
    },
    ...(isMac
      ? [
          {
            label: t.window,
            submenu: [
              { role: 'minimize', label: t.minimize },
              { role: 'close', label: t.close },
            ],
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: t.help,
      submenu: [
        { label: t.openLog, click: () => void shell.openPath(log.file) },
        { label: t.openData, click: () => void shell.openPath(dataDir) },
        { type: 'separator' },
        { label: t.website, click: () => void shell.openExternal(WEBSITE) },
        ...(isMac ? [] : [{ label: t.about, click: showAbout }]),
      ],
    },
  ];
}

/** Right click: spelling suggestions, and cut, copy and paste. */
function contextMenu(target: BrowserWindow, p: ContextMenuParams) {
  const t = texts();
  const items: MenuItemConstructorOptions[] = [];
  if (p.misspelledWord) {
    for (const word of p.dictionarySuggestions.slice(0, 6))
      items.push({ label: word, click: () => target.webContents.replaceMisspelling(word) });
    if (!p.dictionarySuggestions.length) items.push({ label: t.noSuggestions, enabled: false });
    items.push(
      {
        label: t.addToDictionary,
        click: () => target.webContents.session.addWordToSpellCheckerDictionary(p.misspelledWord),
      },
      { type: 'separator' },
    );
  }
  if (p.isEditable) {
    items.push(
      { role: 'cut', label: t.cut, enabled: p.editFlags.canCut },
      { role: 'copy', label: t.copy, enabled: p.editFlags.canCopy },
      { role: 'paste', label: t.paste, enabled: p.editFlags.canPaste },
      { type: 'separator' },
      { role: 'selectAll', label: t.selectAll },
    );
  } else if (p.selectionText.trim()) {
    items.push({ role: 'copy', label: t.copy });
  }
  if (/^https?:/.test(p.linkURL)) {
    if (items.length) items.push({ type: 'separator' });
    items.push(
      { label: t.openLink, click: () => void shell.openExternal(p.linkURL) },
      { label: t.copyLink, click: () => clipboard.writeText(p.linkURL) },
    );
  }
  if (items.length) Menu.buildFromTemplate(items).popup({ window: target });
}

function openExternal(url: string) {
  if (/^https?:\/\//.test(url)) void shell.openExternal(url);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 480,
    title: 'DuckBord',
    // Dark by default, like the app: no white flash while it loads.
    backgroundColor: '#161618',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '..', 'resources', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  const contents = win.webContents;
  win.once('ready-to-show', () => win?.show());
  // Links and popups go to the browser; the window only shows DuckBord.
  contents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${ORIGIN}/`)) return;
    event.preventDefault();
    openExternal(url);
  });
  contents.on('context-menu', (_event, params) => contextMenu(win!, params));
  contents.on('console-message', (event) => {
    if (event.level !== 'error' && event.level !== 'warning') return;
    // Uncaught errors arrive with their stack through the bridge (app:log).
    if (event.message.startsWith('Uncaught')) return;
    log.write(
      event.level === 'error' ? 'error' : 'warn',
      'page',
      event.message,
      `${event.sourceId}:${event.lineNumber}`,
    );
  });
  contents.on('did-fail-load', (_event, code, description, url) => {
    // -3 (ERR_ABORTED): the load was replaced or the window closed, not a failure.
    if (code !== -3) log.write('error', 'load', `${description} (${code})`, url);
  });
  contents.on('preload-error', (_event, _path, err) =>
    log.write('error', 'preload', ...describe(err)),
  );
  win.on('unresponsive', () => log.write('warn', 'window', 'The window stopped responding'));
  win.on('closed', () => (win = null));
  void contents.loadURL(`${ORIGIN}/index.html`);
}

// One DuckBord at a time: a second launch brings the open window forward.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.on('render-process-gone', (_event, _contents, details) =>
    log.write(
      'error',
      'page',
      `The page stopped: ${details.reason}`,
      `exit code ${details.exitCode}`,
    ),
  );
  app.on('child-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit')
      log.write(
        'error',
        'process',
        `${details.type} stopped: ${details.reason}`,
        `exit code ${details.exitCode}`,
      );
  });

  void app.whenReady().then(() => {
    log.write(
      'info',
      'app',
      `DuckBord ${pkg.displayVersion} starting`,
      `Electron ${process.versions.electron} · ${process.platform} ${process.arch}`,
    );
    try {
      store = openStore(path.join(dataDir, 'duckbord.db'), (id) =>
        log.write('warn', 'database', `Board ${id} could not be read and was skipped`),
      );
    } catch (err) {
      log.write('error', 'database', ...describe(err));
      dialog.showErrorBox(texts().dbError, fill(texts().dbErrorDetail, { log: log.file }));
      app.quit();
      return;
    }
    // Only what DuckBord uses: copying to the clipboard. Camera, location… denied.
    session.defaultSession.setPermissionRequestHandler((_contents, permission, allow) =>
      allow(permission === 'clipboard-sanitized-write' || permission === 'fullscreen'),
    );
    serveApp();
    bridge();
    applyLanguage(lang);
    createWindow();
    app.on('activate', () => {
      if (!win) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });
  app.on('will-quit', () => {
    store?.close();
    log.write('info', 'app', 'DuckBord closed');
  });
}
