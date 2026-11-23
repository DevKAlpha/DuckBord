/**
 * DuckBord's internal log (story 27): errors of the app, the database and the
 * page, written to `logs/duckbord.log` in the user's data folder, so a problem
 * can be checked after it happened. Help > Open error log opens it.
 *
 * Plain text, one entry per line (details indented below). When the file
 * passes `maxBytes` it moves to duckbord.1.log, and so on up to `keep` old
 * files: the log never grows without limit.
 */
import fs from 'node:fs';
import path from 'node:path';

export type Level = 'error' | 'warn' | 'info';

const MESSAGE_MAX = 4_000;
const DETAIL_MAX = 8_000;

export function createLog(dir: string, { maxBytes = 1_000_000, keep = 3 } = {}) {
  const file = path.join(dir, 'duckbord.log');
  const old = (n: number) => path.join(dir, `duckbord.${n}.log`);

  const rotate = () => {
    try {
      if (fs.statSync(file).size < maxBytes) return;
    } catch {
      return; // no file yet
    }
    for (let n = keep; n >= 1; n--) {
      const from = n === 1 ? file : old(n - 1);
      if (fs.existsSync(from)) fs.renameSync(from, old(n));
    }
  };

  return {
    dir,
    file,

    /** Never throws: a log that cannot be written must not break the app. */
    write(level: Level, scope: string, message: string, detail?: string): void {
      const head = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${message.slice(0, MESSAGE_MAX)}`;
      const body = detail
        ? `\n${detail
            .slice(0, DETAIL_MAX)
            .split('\n')
            .map((line) => `    ${line}`)
            .join('\n')}`
        : '';
      try {
        fs.mkdirSync(dir, { recursive: true });
        rotate();
        // Synchronous on purpose: the last lines before a crash must reach the disk.
        fs.appendFileSync(file, `${head}${body}\n`, 'utf8');
      } catch {
        /* disk full or folder locked: nothing better to do */
      }
    },
  };
}

export type Log = ReturnType<typeof createLog>;

/** Message and stack of anything thrown. */
export const describe = (err: unknown): [string, string | undefined] =>
  err instanceof Error ? [err.message, err.stack] : [String(err), undefined];
