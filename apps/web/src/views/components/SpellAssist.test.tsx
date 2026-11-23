import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSpelling } from '../../controllers/spellingController';
import { loadSpellPack } from '../../i18n/spelling';
import { SpellAssist } from './SpellAssist';

function Fields() {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  return (
    <>
      <SpellAssist />
      <textarea aria-label="texto" value={text} onChange={(e) => setText(e.target.value)} />
      <input
        aria-label="nombre"
        spellCheck={false}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </>
  );
}

describe('SpellAssist', () => {
  beforeEach(async () => {
    localStorage.clear();
    useSpelling.setState({ enabled: true, skip: new Set(), hint: null });
    await loadSpellPack('es');
  });

  it('corrects each word as it ends, in a controlled field', async () => {
    render(<Fields />);
    await userEvent.type(screen.getByLabelText('texto'), 'hola, tambien la configuracion.');
    expect(screen.getByLabelText<HTMLTextAreaElement>('texto').value).toBe(
      'Hola, también la configuración.',
    );
  });

  it('leaves fields marked spellCheck={false} alone', async () => {
    render(<Fields />);
    await userEvent.type(screen.getByLabelText('nombre'), 'tambien ');
    expect(screen.getByLabelText<HTMLInputElement>('nombre').value).toBe('tambien ');
  });

  it('suggests both spellings of an ambiguous word and applies the chosen one', async () => {
    render(<Fields />);
    const field = screen.getByLabelText<HTMLTextAreaElement>('texto');
    await userEvent.type(field, 'Quiero mas ');
    expect(field.value).toBe('Quiero mas ');
    // jsdom has no Popover API, so the suggestion counts as hidden there.
    await userEvent.click(screen.getByRole('button', { name: /más/, hidden: true }));
    expect(field.value).toBe('Quiero más ');
    expect(useSpelling.getState().hint).toBeNull();
  });

  it('does nothing when autocorrect is off', async () => {
    useSpelling.setState({ enabled: false });
    render(<Fields />);
    await userEvent.type(screen.getByLabelText('texto'), 'tambien ');
    expect(screen.getByLabelText<HTMLTextAreaElement>('texto').value).toBe('tambien ');
  });
});
