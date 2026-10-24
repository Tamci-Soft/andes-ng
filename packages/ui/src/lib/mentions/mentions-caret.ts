/**
 * Computed styles that decide where text wraps and how tall a line is. A hidden copy of the
 * field carrying them lays the text out exactly as the field does.
 */
const MIRRORED_PROPERTIES = [
  'direction',
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
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
] as const;

/** A caret position, in px from the field's border box top-left corner. */
export interface AndesMentionsCaretPosition {
  readonly top: number;
  readonly left: number;
  /** Height of the line the caret is on. */
  readonly height: number;
}

/**
 * Measures where the character at `position` sits inside a text field.
 *
 * A text field exposes no geometry for its caret, so this lays the text before `position` out in
 * a hidden element that copies the field's text styles, then reads the offset of a marker placed
 * right after it. The result already accounts for the field's own scroll, and the mirror is
 * removed again before returning.
 */
export function andesMentionsCaretPosition(
  field: HTMLTextAreaElement | HTMLInputElement,
  position: number,
): AndesMentionsCaretPosition {
  const document = field.ownerDocument;
  const view = document.defaultView;
  const computed = view?.getComputedStyle(field);
  const isInput = field instanceof HTMLInputElement;

  const mirror = document.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');
  const style = mirror.style;
  style.position = 'absolute';
  style.visibility = 'hidden';
  style.top = '0';
  style.left = '-9999px';
  style.whiteSpace = isInput ? 'nowrap' : 'pre-wrap';
  style.overflowWrap = 'break-word';

  if (computed) {
    for (const property of MIRRORED_PROPERTIES) {
      style[property] = computed[property];
    }
  }
  // The mirror is never scrolled; the field's own scroll is subtracted below.
  style.overflow = 'hidden';
  if (isInput) {
    style.height = 'auto';
  }

  const text = field.value;
  const before = text.slice(0, position);
  mirror.textContent = isInput ? before.replace(/\s/g, ' ') : before;

  const marker = document.createElement('span');
  // A character after the caret keeps the marker (and the line) from collapsing at the end.
  marker.textContent = text.slice(position) || '.';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const border = (value: string | undefined) =>
    Number.parseFloat(value ?? '') || 0;
  const lineHeight = Number.parseFloat(computed?.lineHeight ?? '');
  const result: AndesMentionsCaretPosition = {
    top: marker.offsetTop + border(computed?.borderTopWidth) - field.scrollTop,
    left:
      marker.offsetLeft + border(computed?.borderLeftWidth) - field.scrollLeft,
    height: Number.isFinite(lineHeight) ? lineHeight : marker.offsetHeight,
  };

  document.body.removeChild(mirror);
  return result;
}

/**
 * Which side of the caret marker the list rendered on. The overlay may flip it and does not say
 * so, so it is read back from the geometry; an unmeasurable list (not laid out yet, jsdom)
 * keeps the requested side.
 */
export function andesMentionsResolveSide(
  anchor: { top: number; height: number },
  panel: { top: number; height: number; width?: number },
  requested: 'top' | 'bottom',
): 'top' | 'bottom' {
  if (panel.height === 0 && !panel.width) {
    return requested;
  }
  const above = panel.top + panel.height <= anchor.top + 1;
  const below = panel.top >= anchor.top + anchor.height - 1;
  if (requested === 'top' ? above : below) {
    return requested;
  }
  if (above) {
    return 'top';
  }
  return below ? 'bottom' : requested;
}
