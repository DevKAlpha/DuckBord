/**
 * The bridge between the page and the desktop app: `window.duckbord`.
 * The page never touches Node or Electron; it can only make these calls,
 * and the main process checks each one.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '@devbord/shared';

const bridge: DesktopBridge = {
  platform: process.platform,
  boards: {
    list: () => ipcRenderer.invoke('boards:list'),
    get: (id) => ipcRenderer.invoke('boards:get', id),
    save: (board) => ipcRenderer.invoke('boards:save', board),
    remove: (id) => ipcRenderer.invoke('boards:remove', id),
  },
  docs: {
    get: (key) => ipcRenderer.invoke('docs:get', key),
    put: (key, state) => ipcRenderer.invoke('docs:put', key, state),
    remove: (key) => ipcRenderer.invoke('docs:remove', key),
  },
  setLocale: (locale) => ipcRenderer.send('app:locale', locale),
  log: (level, message, detail) => ipcRenderer.send('app:log', level, message, detail),
};

contextBridge.exposeInMainWorld('duckbord', bridge);
