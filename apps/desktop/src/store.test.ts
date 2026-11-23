import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { openStore, type Store } from './store';

const dirs: string[] = [];
const open: Store[] = [];

function fresh(onBroken?: (id: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'duckbord-'));
  dirs.push(dir);
  const store = openStore(path.join(dir, 'duckbord.db'), onBroken);
  open.push(store);
  return { store, file: path.join(dir, 'duckbord.db') };
}

afterEach(() => {
  for (const s of open.splice(0)) s.close();
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const board = (id: string, updatedAt: string, title = id) => ({
  id,
  updatedAt,
  title,
  columns: [],
});

describe('local database', () => {
  it('saves, lists (newest first), replaces and removes boards', () => {
    const { store } = fresh();
    store.saveBoard(board('a', '2026-01-01T00:00:00.000Z'));
    store.saveBoard(board('b', '2026-02-01T00:00:00.000Z'));
    expect(store.listBoards().map((b) => (b as { id: string }).id)).toEqual(['b', 'a']);

    store.saveBoard(board('a', '2026-03-01T00:00:00.000Z', 'Renamed'));
    expect(store.getBoard('a')).toMatchObject({ title: 'Renamed' });
    expect(store.listBoards()).toHaveLength(2);

    store.removeBoard('a');
    expect(store.getBoard('a')).toBeNull();
  });

  it('keeps everything after closing and opening again', () => {
    const { store, file } = fresh();
    store.saveBoard(board('a', '2026-01-01T00:00:00.000Z'));
    store.putDoc('sketch:a', new Uint8Array([1, 2, 3]));
    store.close();
    open.splice(open.indexOf(store), 1);

    const again = openStore(file);
    open.push(again);
    expect(again.getBoard('a')).toMatchObject({ id: 'a' });
    expect([...again.getDoc('sketch:a')!]).toEqual([1, 2, 3]);
  });

  it('stores Yjs documents as bytes', () => {
    const { store } = fresh();
    store.putDoc('board-1', new Uint8Array([9]));
    store.putDoc('board-1', new Uint8Array([7, 8]));
    expect([...store.getDoc('board-1')!]).toEqual([7, 8]);
    store.removeDoc('board-1');
    expect(store.getDoc('board-1')).toBeNull();
  });

  it('refuses what is not a board or a document', () => {
    const { store } = fresh();
    expect(() => store.saveBoard({ title: 'no id' })).toThrow();
    expect(() => store.saveBoard(null)).toThrow();
    expect(() => store.getBoard(42)).toThrow();
    expect(() => store.putDoc('x', 'not bytes')).toThrow();
  });

  it('skips a broken row instead of failing the whole list', () => {
    const broken: string[] = [];
    const { store, file } = fresh((id) => broken.push(id));
    store.saveBoard(board('ok', '2026-01-01T00:00:00.000Z'));
    store.close();
    open.splice(open.indexOf(store), 1);
    // Damage one row by hand, as a disk problem could.
    const raw = new DatabaseSync(file);
    raw.prepare("INSERT INTO boards VALUES ('bad', '{not json', '2026-02-01')").run();
    raw.close();

    const again = openStore(file, (id) => broken.push(id));
    open.push(again);
    expect(again.listBoards()).toHaveLength(1);
    expect(broken).toEqual(['bad']);
  });
});
