/**
 * Where a character of an <input> or <textarea> is on screen, to place a
 * suggestion under a word. Browsers do not expose it, so a hidden copy of the
 * field (same font, size, padding and wrapping) is measured instead.
 */
const COPIED = [
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'direction',
] as const;

/** Top-left of character `index` in viewport pixels, and the line height. */
export function caretPoint(
  field: HTMLInputElement | HTMLTextAreaElement,
  index: number,
): { left: number; top: number; height: number } {
  const style = getComputedStyle(field);
  const copy = document.createElement('div');
  for (const prop of COPIED) copy.style[prop] = style[prop];
  const single = field instanceof HTMLInputElement;
  Object.assign(copy.style, {
    position: 'absolute',
    visibility: 'hidden',
    top: '0',
    left: '-9999px',
    whiteSpace: single ? 'pre' : 'pre-wrap',
    overflowWrap: single ? 'normal' : 'break-word',
  });
  copy.textContent = field.value.slice(0, index);
  const mark = document.createElement('span');
  mark.textContent = field.value.slice(index) || '.';
  copy.append(mark);
  document.body.append(copy);
  const x = mark.offsetLeft + parseFloat(style.borderLeftWidth);
  const y = mark.offsetTop + parseFloat(style.borderTopWidth);
  const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.25;
  copy.remove();

  // The whiteboard draws its notes scaled: convert field pixels to screen pixels.
  const box = field.getBoundingClientRect();
  const sx = field.offsetWidth ? box.width / field.offsetWidth : 1;
  const sy = field.offsetHeight ? box.height / field.offsetHeight : 1;
  if (single)
    return { left: box.left + (x - field.scrollLeft) * sx, top: box.top, height: box.height };
  return {
    left: box.left + (x - field.scrollLeft) * sx,
    top: box.top + (y - field.scrollTop) * sy,
    height: line * sy,
  };
}
