/**
 * What the desktop app (apps/desktop, Electron) gives the web app, as
 * `window.duckbord`. It does not exist in a browser.
 *
 * Boards travel as plain objects: the web validates them with BoardSchema,
 * like everything it reads from storage.
 */
export interface DesktopBridge {
  /** Operating system: 'win32', 'darwin' or 'linux'. */
  platform: string;
  /** Boards in the local SQLite database. */
  boards: {
    /** Most recently updated first. */
    list(): Promise<unknown[]>;
    get(id: string): Promise<unknown | null>;
    save(board: unknown): Promise<void>;
    remove(id: string): Promise<void>;
  };
  /** Yjs documents (team boards and whiteboards), stored next to the boards. */
  docs: {
    get(key: string): Promise<Uint8Array | null>;
    put(key: string, state: Uint8Array): Promise<void>;
    remove(key: string): Promise<void>;
  };
  /** The app's language: the menus and the spellchecker follow it. */
  setLocale(locale: string): void;
  /** Writes to DuckBord's error log (the `logs` folder in the user's data). */
  log(level: 'error' | 'warn' | 'info', message: string, detail?: string): void;
}
