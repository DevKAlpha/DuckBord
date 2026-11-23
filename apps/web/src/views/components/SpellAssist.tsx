/**
 * Autocorrect in every text field of the app (story 26), with one listener:
 * fields need nothing special.
 *
 * - When a word ends (space, punctuation, Enter) it is checked once. A sure
 *   fix replaces it like typing would, so Ctrl+Z undoes it; undoing a fix
 *   means "leave this word alone" from then on, as in Word.
 * - A word whose meaning depends on the tilde shows a small suggestion under
 *   it: click a spelling, or Esc to close.
 * - Left alone: fields marked spellCheck={false} (names, links, keys),
 *   read-only ones, and anything that is not free text. Touch-only devices
 *   too: the phone keyboard already corrects.
 */
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useSpelling, type ShownHint } from '../../controllers/spellingController';
import { PixelIcon } from '../../design';
import { useLocale, useT } from '../../i18n';
import { checkWord, loadSpellPack, WORD_END, type SpellPack } from '../../i18n/spelling';
import { caretPoint } from './caretPoint';

type TextField = HTMLInputElement | HTMLTextAreaElement;

const isTextField = (el: EventTarget | null): el is TextField =>
  (el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && (el.type === 'text' || el.type === 'search'))) &&
  !el.readOnly &&
  !el.disabled &&
  el.getAttribute('spellcheck') !== 'false';

/** Our own edits fire input events too: those are not typing. */
let applying = false;

/** Replaces part of a field the way typing does: the browser's Ctrl+Z undoes it and React sees it. */
function replace(field: TextField, start: number, end: number, text: string, caret: number) {
  applying = true;
  try {
    field.setSelectionRange(start, end);
    // execCommand is the only edit that joins the native undo history.
    const done =
      document.activeElement === field && document.execCommand?.('insertText', false, text);
    if (!done) {
      field.setRangeText(text, start, end, 'end');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    field.setSelectionRange(caret, caret);
  } finally {
    applying = false;
  }
}

/** Puts the chosen spelling in place of the suggested word. */
function applyHint(hint: ShownHint, text: string) {
  const { field, start, end, word } = hint;
  if (field.value.slice(start, end) === word) {
    const caret = field.selectionStart ?? field.value.length;
    replace(field, start, end, text, caret >= end ? caret + text.length - word.length : caret);
  }
  useSpelling.getState().showHint(null);
}

/** Phones and tablets correct in their own keyboard. */
const hasKeyboardAndMouse = () =>
  typeof matchMedia !== 'function' || matchMedia('(any-pointer: fine)').matches;

export function SpellAssist() {
  const enabled = useSpelling((s) => s.enabled);
  const hint = useSpelling((s) => s.hint);
  const locale = useLocale((s) => s.locale);

  useEffect(() => {
    if (!enabled || !hasKeyboardAndMouse()) return;
    let pack: SpellPack | null = null;
    let alive = true;
    loadSpellPack(locale)
      .then((p) => {
        if (alive) pack = p;
      })
      .catch(() => {
        /* offline: no autocorrect until the list can be fetched */
      });
    /** The last fix, to notice when the person undoes it. */
    let last: { field: TextField; start: number; typed: string } | null = null;

    const check = (
      field: TextField,
      end: number,
      boundary: string,
      caret: number,
      ask: boolean,
    ) => {
      if (!pack) return;
      const { skip, hint: shown, showHint } = useSpelling.getState();
      const { edit, hint: found } = checkWord(field.value, end, boundary, pack, skip);
      if (edit) {
        last = { field, start: edit.start, typed: field.value.slice(edit.start, edit.end) };
        replace(
          field,
          edit.start,
          edit.end,
          edit.text,
          caret + edit.text.length - (edit.end - edit.start),
        );
      }
      if (!ask) return;
      if (found) showHint({ ...found, field, age: 0 });
      // An unanswered suggestion goes away by itself a few words later.
      else if (shown?.field === field)
        showHint(shown.age >= 3 ? null : { ...shown, age: shown.age + 1 });
    };

    const onInput = (e: Event) => {
      if (applying || !(e instanceof InputEvent) || !isTextField(e.target)) return;
      const field = e.target;
      const { hint: shown, showHint, skipWord } = useSpelling.getState();
      if (e.inputType === 'historyUndo') {
        // Ctrl+Z right after a fix: the person wants that word as typed.
        if (last?.field === field && field.value.startsWith(last.typed, last.start))
          skipWord(last.typed);
        last = null;
        return;
      }
      if (shown?.field === field && field.value.slice(shown.start, shown.end) !== shown.word)
        showHint(null);
      if (e.isComposing) return;
      const boundary =
        e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph'
          ? '\n'
          : e.inputType === 'insertText'
            ? (e.data ?? '').slice(-1)
            : '';
      if (!boundary || !WORD_END.test(boundary)) return;
      const caret = field.selectionStart ?? field.value.length;
      if (caret !== field.selectionEnd) return;
      // After React has handled this keystroke, before the next one.
      queueMicrotask(() => check(field, caret - 1, boundary, caret, true));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const shown = useSpelling.getState().hint;
      if (e.key === 'Escape' && shown && e.target === shown.field) {
        // Esc closes the suggestion first, not the note, the card or the dialog.
        e.preventDefault();
        e.stopPropagation();
        useSpelling.getState().showHint(null);
        return;
      }
      // One-line fields send on Enter: fix the last word before the form reads it.
      if (e.key !== 'Enter' || e.isComposing || !(e.target instanceof HTMLInputElement)) return;
      const field = e.target;
      if (!isTextField(field) || field.selectionStart !== field.selectionEnd) return;
      const caret = field.selectionStart ?? field.value.length;
      check(field, caret, '\n', caret, false);
    };

    const onFocusOut = (e: FocusEvent) => {
      if (useSpelling.getState().hint?.field === e.target) useSpelling.getState().showHint(null);
    };

    document.addEventListener('input', onInput, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusout', onFocusOut, true);
    return () => {
      alive = false;
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusout', onFocusOut, true);
      useSpelling.getState().showHint(null);
    };
  }, [enabled, locale]);

  return hint ? <SpellHint key={`${hint.start}:${hint.word}`} hint={hint} /> : null;
}

/** Keeps the focus in the field while clicking the suggestion. */
const keepFocus = (e: PointerEvent) => e.preventDefault();

/**
 * The suggestion under an ambiguous word. It lives in the top layer (Popover
 * API), inside the open dialog if there is one, so it shows above modals and
 * stays clickable.
 */
function SpellHint({ hint }: { hint: ShownHint }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      if (!el.matches(':popover-open')) el.showPopover?.();
    } catch {
      /* no Popover API: shown in place */
    }
    const place = () => {
      const at = caretPoint(hint.field, hint.start);
      const { width, height } = el.getBoundingClientRect();
      const below = at.top + at.height + 6;
      setPos({
        left: Math.max(8, Math.min(at.left - 10, innerWidth - width - 8)),
        top: below + height > innerHeight - 8 ? Math.max(8, at.top - height - 6) : below,
      });
    };
    place();
    addEventListener('resize', place);
    addEventListener('scroll', place, true);
    return () => {
      removeEventListener('resize', place);
      removeEventListener('scroll', place, true);
    };
  }, [hint]);

  return createPortal(
    <div
      ref={ref}
      popover="manual"
      role="group"
      aria-label={t('spell.aria')}
      aria-live="polite"
      className="m-0 w-max max-w-[min(20rem,calc(100vw-16px))] animate-pixel-pop rounded-lg border border-line bg-card p-1.5 text-sm text-ink shadow-pixel"
      style={{ position: 'fixed', inset: 'auto', left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
    >
      <div className="flex items-center justify-between gap-3 pl-2">
        <p className="text-xs text-muted">{t('spell.title', { word: hint.word })}</p>
        <button
          type="button"
          aria-label={t('spell.close')}
          className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-ink"
          onPointerDown={keepFocus}
          onClick={() => useSpelling.getState().showHint(null)}
        >
          <PixelIcon name="close" size={12} />
        </button>
      </div>
      <ul className="flex flex-col">
        {hint.readings.map((r) => (
          <li key={r.text}>
            <button
              type="button"
              className="flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-3"
              onPointerDown={keepFocus}
              onClick={() => applyHint(hint, r.text)}
            >
              <strong className="font-semibold">{r.text}</strong>
              <span className="text-xs text-muted">{r.gloss}</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-1 w-full rounded-md border-t border-line-soft px-2 pt-1.5 pb-1 text-left text-xs text-muted hover:text-ink"
        onPointerDown={keepFocus}
        onClick={() => {
          useSpelling.getState().skipWord(hint.word);
          useSpelling.getState().showHint(null);
        }}
      >
        {t('spell.ignore')}
      </button>
    </div>,
    hint.field.closest('dialog') ?? document.body,
  );
}
