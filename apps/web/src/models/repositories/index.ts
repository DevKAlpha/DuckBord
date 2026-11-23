/**
 * Composition root for persistence.
 *
 * - Desktop app (apps/desktop): boards go to its local SQLite database.
 * - No `VITE_API_URL` (GitHub Pages): boards live in the browser (IndexedDB).
 * - `VITE_API_URL` set (Docker / Dokploy with apps/api): boards go to the API.
 *
 * Controllers and views never know which implementation is active.
 */
import { desktop } from '../desktop';
import type { BoardRepository } from './BoardRepository';
import { DesktopBoardRepository } from './DesktopBoardRepository';
import { HttpBoardRepository } from './HttpBoardRepository';
import { IndexedDbBoardRepository } from './IndexedDbBoardRepository';

export type { BoardRepository } from './BoardRepository';
export { IndexedDbBoardRepository } from './IndexedDbBoardRepository';
export { HttpBoardRepository } from './HttpBoardRepository';
export { DesktopBoardRepository } from './DesktopBoardRepository';

const apiUrl: string | undefined = import.meta.env.VITE_API_URL;

export const boardRepository: BoardRepository = desktop
  ? new DesktopBoardRepository(desktop)
  : apiUrl
    ? new HttpBoardRepository(apiUrl)
    : new IndexedDbBoardRepository();
