/**
 * Persists each team board's Yjs document (binary state) in IndexedDB, or in
 * the local SQLite database in the desktop app.
 *
 * The CRDT history must survive reloads: rebuilding a document from the plain
 * board snapshot would create a *different* history, and merging it with a
 * teammate's copy would duplicate cards. So the document itself is stored.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { DesktopBridge } from '@devbord/shared';
import { desktop } from '../desktop';

interface DocRow {
  boardId: string;
  state: Uint8Array;
}

class CollabDb extends Dexie {
  docs!: EntityTable<DocRow, 'boardId'>;
  constructor() {
    super('devbord-collab');
    this.version(1).stores({ docs: 'boardId' });
  }
}

let db: CollabDb | null = null;
const getDb = () => (db ??= new CollabDb());

const browserStore = {
  async get(boardId: string): Promise<Uint8Array | null> {
    return (await getDb().docs.get(boardId))?.state ?? null;
  },
  async put(boardId: string, state: Uint8Array): Promise<void> {
    await getDb().docs.put({ boardId, state });
  },
  async remove(boardId: string): Promise<void> {
    await getDb().docs.delete(boardId);
  },
};

export const docStore: DesktopBridge['docs'] = desktop ? desktop.docs : browserStore;
