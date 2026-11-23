/**
 * Autocorrect state (story 26): on or off, the words the person wants left
 * alone, and the suggestion on screen for an ambiguous word.
 *
 * On by default. The choice and the skipped words are saved in localStorage
 * (`devbord:spell`, `devbord:spell-skip`): preferences, not board data.
 */
import { create } from 'zustand';
import type { Hint } from '../i18n/spelling';

const KEY = 'devbord:spell';
const SKIP_KEY = 'devbord:spell-skip';
/** Enough for a personal list; the oldest go first. */
const SKIP_MAX = 300;

/** The suggestion shown under a word, tied to the field it is in. */
export interface ShownHint extends Hint {
  field: HTMLInputElement | HTMLTextAreaElement;
  /** Words typed since it appeared: it fades out after a few. */
  age: number;
}

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: lasts for this visit */
  }
};

interface SpellingState {
  enabled: boolean;
  /** Lower-case words never corrected nor suggested again. */
  skip: ReadonlySet<string>;
  hint: ShownHint | null;
  toggle: () => void;
  /** Leave a word alone from now on (after undoing its fix, or "don't suggest"). */
  skipWord: (word: string) => void;
  showHint: (hint: ShownHint | null) => void;
}

export const useSpelling = create<SpellingState>((set, get) => ({
  enabled: read<unknown>(KEY, true) !== false,
  skip: new Set(read<string[]>(SKIP_KEY, []).filter((w) => typeof w === 'string')),
  hint: null,

  toggle: () => {
    const enabled = !get().enabled;
    write(KEY, enabled);
    set({ enabled, hint: null });
  },

  skipWord: (word) => {
    const key = word.toLowerCase();
    if (get().skip.has(key)) return;
    const list = [...get().skip, key].slice(-SKIP_MAX);
    write(SKIP_KEY, list);
    set({ skip: new Set(list) });
  },

  showHint: (hint) => set({ hint }),
}));
