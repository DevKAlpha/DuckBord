import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLog } from './log';

const dirs: string[] = [];
const tmp = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'duckbord-log-'));
  dirs.push(dir);
  return path.join(dir, 'logs');
};
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('error log', () => {
  it('writes one line per entry, with the details indented below', () => {
    const log = createLog(tmp());
    log.write('error', 'page', 'Cannot read x', 'TypeError: x\n  at f (app.js:1:2)');
    log.write('info', 'app', 'started');
    const lines = fs.readFileSync(log.file, 'utf8').trimEnd().split('\n');
    expect(lines[0]).toMatch(/^\d{4}-\d\d-\d\dT.+Z ERROR \[page\] Cannot read x$/);
    expect(lines[1]).toBe('    TypeError: x');
    expect(lines[2]).toBe('      at f (app.js:1:2)');
    expect(lines[3]).toMatch(/INFO {2}\[app\] started$/);
  });

  it('moves a full file aside and keeps only a few old ones', () => {
    const log = createLog(tmp(), { maxBytes: 200, keep: 2 });
    for (let i = 0; i < 30; i++) log.write('warn', 'test', `entry ${i} ${'x'.repeat(40)}`);
    const files = fs.readdirSync(log.dir).sort();
    expect(files).toEqual(['duckbord.1.log', 'duckbord.2.log', 'duckbord.log']);
    expect(fs.readFileSync(log.file, 'utf8')).toContain('entry 29');
  });

  it('never throws, even when the folder cannot be written', () => {
    const blocked = tmp();
    fs.mkdirSync(path.dirname(blocked), { recursive: true });
    fs.writeFileSync(blocked, 'a file where the folder should be');
    expect(() => createLog(blocked).write('error', 'x', 'y')).not.toThrow();
  });
});
