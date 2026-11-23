/**
 * BoardRepository for the desktop app (story 27): boards live in the local
 * SQLite database of apps/desktop, reached through `window.duckbord`.
 *
 * Like IndexedDB, what comes back is validated with the shared schema: a
 * damaged record is skipped (and logged) instead of breaking the app.
 */
import { BoardSchema, type Board, type DesktopBridge } from '@devbord/shared';
import type { BoardRepository } from './BoardRepository';

const parse = (raw: unknown): Board | null => {
  const result = BoardSchema.safeParse(raw);
  if (!result.success) {
    // Goes to the desktop error log too (console warnings are recorded).
    console.warn('[devbord] Skipping invalid board record', result.error.issues);
    return null;
  }
  return result.data;
};

export class DesktopBoardRepository implements BoardRepository {
  constructor(private readonly bridge: DesktopBridge) {}

  async list(): Promise<Board[]> {
    return (await this.bridge.boards.list()).map(parse).filter((b): b is Board => b !== null);
  }

  async get(id: string): Promise<Board | null> {
    const raw = await this.bridge.boards.get(id);
    return raw ? parse(raw) : null;
  }

  save(board: Board): Promise<void> {
    return this.bridge.boards.save(board);
  }

  remove(id: string): Promise<void> {
    return this.bridge.boards.remove(id);
  }
}
