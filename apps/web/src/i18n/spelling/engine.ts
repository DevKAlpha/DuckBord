/**
 * Autocorrect as you type (story 26), the way Word does it: each word is
 * checked once, when it ends (space, punctuation or Enter).
 *
 * - Sure fixes are applied by themselves: typos, missing tildes that leave no
 *   other valid word ("tambien" -> "también"), "¿que" -> "¿qué", tWO initial
 *   capitals, and a capital letter at the start of each sentence.
 * - Words whose meaning changes with the tilde ("mas" / "más") are never
 *   changed: they come back as a hint, so the person picks.
 *
 * Pure functions over plain text (no DOM): the view applies the result.
 */

/** Replace [start, end) of the text with `text`. */
export interface Edit {
  start: number;
  end: number;
  text: string;
}

/** One way to write an ambiguous word, and what it means written that way. */
export interface Reading {
  text: string;
  gloss: string;
}

/** A word that may need a tilde depending on what it means: the person picks. */
export interface Hint {
  start: number;
  end: number;
  /** The word as it is written now. */
  word: string;
  /** In the order to offer them (the likely one first), in the word's case. */
  readings: Reading[];
}

/**
 * When an ambiguous word is worth asking about. All the fields of one
 * condition must hold; any condition of the list is enough.
 */
export interface When {
  /** Punctuation or a line break right after the word. */
  end?: boolean;
  /** The word before is one of these (lower case). */
  prev?: readonly string[];
  /** The word after is one of these (lower case). */
  next?: readonly string[];
}

export interface AmbiguousWord {
  readings: readonly (readonly [text: string, gloss: string])[];
  /** Omitted: ask every time the word is written. */
  when?: readonly When[];
}

/** Everything autocorrect knows about one language. */
export interface SpellPack {
  /** Misspelled word (lower case) -> its right spelling. */
  fixes: Readonly<Record<string, string>>;
  /** Rules on the lower-case word for whole families ("-cion" -> "-ción"). */
  patterns?: readonly (readonly [
    RegExp,
    string | ((match: string, ...groups: string[]) => string),
  ])[];
  /** Words that take a tilde when they open a question or an exclamation (¿qué?). */
  questions?: Readonly<Record<string, string>>;
  /** Words whose meaning depends on the tilde: offered, never changed. */
  ambiguous?: Readonly<Record<string, AmbiguousWord>>;
  /** Capital letter at the start of each sentence (not for Korean). */
  sentenceCase: boolean;
  /** Abbreviations (lower case, without the final dot) that do not end a sentence. */
  abbreviations?: readonly string[];
}

export interface Check {
  edit: Edit | null;
  hint: Hint | null;
}

const NONE: Check = { edit: null, hint: null };

/** Characters that end a word. An apostrophe does not (don't). */
export const WORD_END = /[\s.,;:!?)\]}"»…]/;
const PUNCTUATION = /[.,;:!?)\]}"»…\n]/;
/** Opening marks allowed before a word: ¿Qué, (nota, «texto». */
const OPENING = /^[¿¡("«“‘'[{]*/;
/** Only letters, with apostrophes inside (don't). Digits or symbols = technical. */
const PLAIN_WORD = /^[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*$/u;
/** camelCase or a brand written with inner capitals (GitHub, iPhone): leave it. */
const INNER_CAPITAL = /\p{Ll}\p{Lu}/u;
/** TWo INitial CApitals, but not plural acronyms (IDs, PRs). */
const TWO_CAPITALS = /^\p{Lu}{2}\p{Ll}+$/u;
const PLURAL_ACRONYM = /^\p{Lu}{2}s$/u;

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Writes `fixed` with the case of what was typed: TAMBIEN -> TAMBIÉN, Tambien -> También. */
export function matchCase(typed: string, fixed: string): string {
  const letters = typed.replace(/[^\p{L}]/gu, '');
  if (letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase())
    return fixed.toUpperCase();
  if (typed.charAt(0) !== typed.charAt(0).toLowerCase()) return upperFirst(fixed);
  return fixed;
}

interface Prev {
  /** As written, with its opening marks (¿por). */
  raw: string;
  /** Without opening marks, from `start`. */
  word: string;
  start: number;
  /** Lower case, without marks: what conditions compare. */
  key: string;
}

/** The previous word on the same line, or null. */
function wordBefore(text: string, index: number): Prev | null {
  const m = /(\S+)[ \t]+$/.exec(text.slice(0, index));
  if (!m) return null;
  const raw = m[1]!;
  const lead = OPENING.exec(raw)![0];
  const word = raw.slice(lead.length);
  return {
    raw,
    word,
    start: index - m[0].length + lead.length,
    key: word.replace(/[.,;:!?)\]}"»…]+$/, '').toLowerCase(),
  };
}

/** True when the text before `index` ends a sentence (or there is no text yet). */
function startsSentence(text: string, index: number, pack: SpellPack): boolean {
  const before = text.slice(0, index).replace(/[ \t]+$/, '');
  if (before === '' || before.endsWith('\n')) return true;
  // A list item: "- tarea", "* item".
  if (/(^|\n)[ \t]*[-*•]$/.test(before)) return true;
  if (/[!?…]$/.test(before)) return true;
  if (!before.endsWith('.')) return false;
  const last = /(\S+)\.$/.exec(before)?.[1]?.toLowerCase() ?? '';
  return !pack.abbreviations?.includes(last.replace(OPENING, ''));
}

/** Inside `inline code` or a ``` block: never touched. */
function inCode(text: string, index: number): boolean {
  const before = text.slice(0, index);
  if ((before.match(/```/g)?.length ?? 0) % 2 === 1) return true;
  const line = before.slice(before.lastIndexOf('\n') + 1);
  return (line.match(/`/g)?.length ?? 0) % 2 === 1;
}

function matches(when: When, ctx: { end: boolean; prev: string; next?: string }): boolean {
  if (when.end && !ctx.end) return false;
  if (when.prev && !when.prev.includes(ctx.prev)) return false;
  if (when.next && (ctx.next === undefined || !when.next.includes(ctx.next))) return false;
  return true;
}

function hintFor(
  pack: SpellPack,
  word: string,
  start: number,
  ctx: { end: boolean; prev: string; next?: string },
): Hint | null {
  const entry = pack.ambiguous?.[word.toLowerCase()];
  if (!entry) return null;
  // The word after is only known when checking the previous word, and the
  // other way round: each check looks at the conditions it can answer.
  const usable = entry.when?.filter((w) => (ctx.next === undefined ? !w.next : w.next));
  if (entry.when && !usable?.some((w) => matches(w, ctx))) return null;
  if (!entry.when && ctx.next !== undefined) return null;
  return {
    start,
    end: start + word.length,
    word,
    readings: entry.readings.map(([text, gloss]) => ({ text: matchCase(word, text), gloss })),
  };
}

/**
 * Checks the word that ends at `end`, just before `boundary` (the character
 * typed after it, or '\n' for Enter). `skip` holds words (lower case) the
 * person asked to leave alone.
 */
export function checkWord(
  text: string,
  end: number,
  boundary: string,
  pack: SpellPack,
  skip: ReadonlySet<string> = new Set(),
): Check {
  if (!WORD_END.test(boundary) || inCode(text, end)) return NONE;
  const lineStart = text.lastIndexOf('\n', end - 1) + 1;
  const token = /\S+$/.exec(text.slice(lineStart, end))?.[0];
  if (!token) return NONE;
  const lead = OPENING.exec(token)![0];
  const word = token.slice(lead.length);
  if (!PLAIN_WORD.test(word) || INNER_CAPITAL.test(word)) return NONE;

  const start = end - word.length;
  const tokenStart = start - lead.length;
  const lower = word.toLowerCase();
  const prev = wordBefore(text, tokenStart);

  // The previous word, now that the one after it is known ("tu no" -> "tú no").
  // Only when nothing separates them: "el, no" is not "él no".
  const prevHint =
    prev && !skip.has(prev.key) && PLAIN_WORD.test(prev.word)
      ? hintFor(pack, prev.word, prev.start, {
          end: false,
          prev: wordBefore(text, prev.start - (prev.raw.length - prev.word.length))?.key ?? '',
          next: lower,
        })
      : null;
  if (skip.has(lower)) return { edit: null, hint: prevHint };

  let fixed: string | null = null;
  const opensQuestion =
    /[¿¡]$/.test(lead) || (/^[¿¡]por$/i.test(prev?.raw ?? '') && lower === 'que');
  if (opensQuestion && pack.questions?.[lower]) fixed = pack.questions[lower]!;
  else if (pack.fixes[lower]) fixed = pack.fixes[lower]!;
  else {
    for (const [re, to] of pack.patterns ?? []) {
      const out = typeof to === 'string' ? lower.replace(re, to) : lower.replace(re, to);
      if (out !== lower) {
        fixed = out;
        break;
      }
    }
  }
  let result = fixed ? matchCase(word, fixed) : word;
  if (!fixed && TWO_CAPITALS.test(word) && !PLURAL_ACRONYM.test(word))
    result = word.charAt(0) + word.slice(1).toLowerCase();
  if (pack.sentenceCase && startsSentence(text, tokenStart, pack) && /^\p{Ll}/u.test(result))
    result = upperFirst(result);

  const edit = result !== word ? { start, end, text: result } : null;
  // A word just fixed is settled; one only capitalized can still be ambiguous.
  const ownHint =
    fixed === null
      ? hintFor(pack, result, start, { end: PUNCTUATION.test(boundary), prev: prev?.key ?? '' })
      : null;
  return { edit, hint: ownHint ?? prevHint };
}
