import { describe, expect, it } from 'vitest';
import { checkWord, matchCase, type SpellPack } from './engine';
import { pack as en } from './en';
import { pack as es } from './es';
import { pack as ko } from './ko';

/** Types `text` followed by `boundary` and applies the fix, like the field does. */
function typed(text: string, pack: SpellPack, boundary = ' ', skip = new Set<string>()) {
  const { edit, hint } = checkWord(text, text.length, boundary, pack, skip);
  const out = edit ? text.slice(0, edit.start) + edit.text + text.slice(edit.end) : text;
  return { text: out + boundary, hint };
}
const write = (text: string, pack: SpellPack, boundary = ' ') => typed(text, pack, boundary).text;

describe('autocorrect: Spanish', () => {
  it('adds the tilde when there is only one right spelling, in the case typed', () => {
    expect(write('Lo hago tambien', es)).toBe('Lo hago también ');
    expect(write('TAMBIEN', es)).toBe('TAMBIÉN ');
    expect(write('Despues', es, ',')).toBe('Después,');
  });

  it('fixes whole families: -ción, -sión, -logía', () => {
    expect(write('La configuracion', es)).toBe('La configuración ');
    expect(write('Nueva version', es)).toBe('Nueva versión ');
    expect(write('tecnologia', es)).toBe('Tecnología ');
    // English spelling of a word is not a missing tilde.
    expect(write('Ok session', es)).toBe('Ok session ');
  });

  it('puts the tilde on question words after ¿ and ¡', () => {
    expect(write('¿que', es)).toBe('¿Qué ');
    expect(write('Dime ¿como', es)).toBe('Dime ¿cómo ');
    expect(write('¿Por que', es)).toBe('¿Por qué ');
    // Without ¿ it can be "que" or "qué": left alone.
    expect(write('Creo que', es)).toBe('Creo que ');
  });

  it('starts each sentence with a capital letter, except after abbreviations', () => {
    expect(write('hola', es)).toBe('Hola ');
    expect(write('Listo. ahora', es)).toBe('Listo. Ahora ');
    expect(write('Listo!\notra', es, '\n')).toBe('Listo!\nOtra\n');
    expect(write('Tareas, etc. luego', es)).toBe('Tareas, etc. luego ');
    expect(write('- comprar', es)).toBe('- Comprar ');
  });

  it('fixes tWO initial capitals but not plural acronyms', () => {
    expect(write('La TArea', es)).toBe('La Tarea ');
    expect(write('Los IDs', es)).toBe('Los IDs ');
  });

  it('never touches code, links, numbers or names written with inner capitals', () => {
    expect(write('Ver `npm run tambien', es)).toBe('Ver `npm run tambien ');
    expect(write('Abrir https://x.com/tambien', es)).toBe('Abrir https://x.com/tambien ');
    expect(write('Es v2 tambien2', es)).toBe('Es v2 tambien2 ');
    expect(write('Usar GitHub', es)).toBe('Usar GitHub ');
  });

  it('skips the words the person asked to leave alone', () => {
    expect(typed('tambien', es, ' ', new Set(['tambien'])).text).toBe('tambien ');
  });

  it('asks instead of changing words whose meaning depends on the tilde', () => {
    const { text, hint } = typed('Quiero mas', es);
    expect(text).toBe('Quiero mas ');
    expect(hint).toMatchObject({ start: 7, end: 10, word: 'mas' });
    expect(hint!.readings.map((r) => r.text)).toEqual(['más', 'mas']);
    // In the case written.
    expect(typed('Mas', es).hint!.readings[0]!.text).toBe('Más');
  });

  it('asks about short words only where the tilde is likely', () => {
    expect(typed('Es para el', es, '.').hint?.readings[0]?.text).toBe('él');
    expect(typed('Mueve el', es).hint).toBeNull();
    expect(typed('No se', es, '.').hint?.readings[0]?.text).toBe('sé');
    expect(typed('Un te', es).hint?.readings[0]?.text).toBe('té');
    expect(typed('La tarea esta', es, '.').hint?.word).toBe('esta');
  });

  it('asks about the previous word once the next one shows the meaning', () => {
    // "tu no": a noun never follows "tú", so it is the person.
    const { hint } = typed('Pero tu no', es);
    expect(hint).toMatchObject({ start: 5, end: 7, word: 'tu' });
    expect(hint!.readings[0]!.text).toBe('tú');
    expect(typed('Esta lista', es).hint).toMatchObject({ start: 0, word: 'Esta' });
    expect(typed('Esta tarea', es).hint).toBeNull();
    // Punctuation in between breaks the link.
    expect(typed('Pero tu, no', es).hint).toBeNull();
  });

  it('offers the three spellings of nouns that are also verbs', () => {
    expect(typed('El numero', es).hint!.readings.map((r) => r.text)).toEqual([
      'número',
      'numero',
      'numeró',
    ]);
  });
});

describe('autocorrect: English', () => {
  it('fixes typos, apostrophes, "i" and the days', () => {
    expect(write('teh', en)).toBe('The ');
    expect(write('It dont', en)).toBe("It don't ");
    expect(write('Then i', en)).toBe('Then I ');
    expect(write('See you monday', en, '.')).toBe('See you Monday.');
    expect(write('Use e.g. this', en)).toBe('Use e.g. this ');
  });
});

describe('autocorrect: Korean', () => {
  it('fixes frequent mistakes, with the endings glued to the word', () => {
    expect(write('안되요', ko)).toBe('안돼요 ');
    expect(write('내일 할께요', ko)).toBe('내일 할게요 ');
    expect(write('몇일이', ko)).toBe('며칠이 ');
    expect(write('않해요', ko)).toBe('안 해요 ');
  });

  it('leaves right words that look alike', () => {
    expect(write('선생님께요', ko)).toBe('선생님께요 ');
    expect(write('어떻게', ko)).toBe('어떻게 ');
  });
});

describe('matchCase', () => {
  it('copies the case of what was typed', () => {
    expect(matchCase('tambien', 'también')).toBe('también');
    expect(matchCase('Tambien', 'también')).toBe('También');
    expect(matchCase('TAMBIEN', 'también')).toBe('TAMBIÉN');
    expect(matchCase('i', 'I')).toBe('I');
  });
});
