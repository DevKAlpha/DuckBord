/**
 * The desktop app (apps/desktop, story 27) runs this same web app and adds
 * `window.duckbord`: boards in a local SQLite database, an error log, and the
 * menus and spellchecker in the app's language. Null in a browser.
 */
import type { DesktopBridge } from '@devbord/shared';

export const desktop: DesktopBridge | null =
  (globalThis as { duckbord?: DesktopBridge }).duckbord ?? null;

/**
 * Sends uncaught errors of the page, with their stack, to the desktop error
 * log (Help > Open error log). Does nothing in a browser.
 */
export function logErrorsToDesktop(): void {
  if (!desktop) return;
  const bridge = desktop;
  const send = (reason: unknown, fallback: string) => {
    if (reason instanceof Error) bridge.log('error', reason.message, reason.stack);
    else bridge.log('error', reason === undefined ? fallback : String(reason));
  };
  addEventListener('error', (e) => send(e.error, `${e.message} (${e.filename}:${e.lineno})`));
  addEventListener('unhandledrejection', (e) => send(e.reason, 'Unhandled rejection'));
}
