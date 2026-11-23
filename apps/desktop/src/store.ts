/**
 * DuckBord's local database (story 27): one SQLite file in the user's data
 * folder, so boards live on the computer instead of in browser storage that
 * the browser may clear.
 *
 * Uses node:sqlite (built into Node, and into Electron): no native module to
 * compile for each system. Boards are stored as one JSON document each, the
 * same aggregate the web saves; the web validates them when it reads them.
 */
import { DatabaseSync } from 'node:sqlite';

/**
 * Each step upgrades the database by one version (PRAGMA user_version).
 * Never edit a step: add a new one at the end.
 */
const MIGRATIONS = [
  `CREATE TABLE boards (
     id TEXT PRIMARY KEY,
     data TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX boards_updated ON boards (updated_at);
   CREATE TABLE docs (
     key TEXT PRIMARY KEY,
     state BLOB NOT NULL
   );`,
];

/** A board bigger than this is surely broken (the biggest real ones are a few MB). */
const BOARD_MAX = 50 * 1024 * 1024;

export class StoreError extends Error {}

const text = (value: unknown, what: string): string => {
  if (typeof value !== 'string' || value === '' || value.length > 200)
    throw new StoreError(`Invalid ${what}`);
  return value;
};

/** Opens (and creates or upgrades) the database at `file`. */
export function openStore(file: string, onBroken: (id: string) => void = () => {}) {
  const db = new DatabaseSync(file);
  // WAL: readers never wait for writers, and a crash never leaves a half write.
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 3000;');
  const { user_version: version } = db.prepare('PRAGMA user_version').get() as {
    user_version: number;
  };
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]!);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const sql = {
    list: db.prepare('SELECT id, data FROM boards ORDER BY updated_at DESC'),
    get: db.prepare('SELECT id, data FROM boards WHERE id = ?'),
    save: db.prepare(
      `INSERT INTO boards (id, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    ),
    remove: db.prepare('DELETE FROM boards WHERE id = ?'),
    getDoc: db.prepare('SELECT state FROM docs WHERE key = ?'),
    putDoc: db.prepare(
      'INSERT INTO docs (key, state) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET state = excluded.state',
    ),
    removeDoc: db.prepare('DELETE FROM docs WHERE key = ?'),
  };

  /** A row whose JSON cannot be read is reported and skipped, never fatal. */
  const parse = (row: { id: string; data: string }): unknown => {
    try {
      return JSON.parse(row.data) as unknown;
    } catch {
      onBroken(row.id);
      return null;
    }
  };

  return {
    /** Where the database lives (shown in the log). */
    file,

    listBoards(): unknown[] {
      return (sql.list.all() as { id: string; data: string }[])
        .map(parse)
        .filter((b) => b !== null);
    },

    getBoard(id: unknown): unknown {
      const row = sql.get.get(text(id, 'board id')) as { id: string; data: string } | undefined;
      return row ? parse(row) : null;
    },

    saveBoard(board: unknown): void {
      const { id, updatedAt } = (board ?? {}) as { id?: unknown; updatedAt?: unknown };
      const data = JSON.stringify(board);
      if (data.length > BOARD_MAX) throw new StoreError('Board too large');
      sql.save.run(text(id, 'board id'), data, text(updatedAt, 'board date'));
    },

    removeBoard(id: unknown): void {
      sql.remove.run(text(id, 'board id'));
    },

    getDoc(key: unknown): Uint8Array | null {
      const row = sql.getDoc.get(text(key, 'document key')) as { state: Uint8Array } | undefined;
      return row ? row.state : null;
    },

    putDoc(key: unknown, state: unknown): void {
      if (!(state instanceof Uint8Array)) throw new StoreError('Invalid document');
      sql.putDoc.run(text(key, 'document key'), state);
    },

    removeDoc(key: unknown): void {
      sql.removeDoc.run(text(key, 'document key'));
    },

    close(): void {
      db.close();
    },
  };
}

export type Store = ReturnType<typeof openStore>;
