/** Pure geometry for the affix, kept free of the DOM so the rules can be tested directly. */

export interface AndesAffixRect {
  top: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

/** The visible span (in viewport coordinates) the content is pinned inside. */
export interface AndesAffixViewport {
  top: number;
  bottom: number;
}

export type AndesAffixPosition = 'top' | 'bottom' | null;

const TOLERANCE = 0.5;

/**
 * Fixed strategy: where would the content naturally sit? Once its natural top has scrolled
 * above the top offset it pins to the top; once its natural bottom is below the bottom offset
 * line it pins to the bottom.
 */
export function andesAffixPosition(
  natural: AndesAffixRect,
  viewport: AndesAffixViewport,
  offsetTop: number | undefined,
  offsetBottom: number | undefined,
): AndesAffixPosition {
  if (
    offsetTop !== undefined &&
    natural.top < viewport.top + offsetTop - TOLERANCE
  ) {
    return 'top';
  }
  if (
    offsetBottom !== undefined &&
    natural.bottom > viewport.bottom - offsetBottom + TOLERANCE
  ) {
    return 'bottom';
  }
  return null;
}

/**
 * Sticky strategy: the browser does the pinning, so "affixed" simply means the box currently
 * rests exactly on one of the offset lines.
 */
export function andesAffixStuckPosition(
  box: AndesAffixRect,
  viewport: AndesAffixViewport,
  offsetTop: number | undefined,
  offsetBottom: number | undefined,
): AndesAffixPosition {
  if (
    offsetTop !== undefined &&
    Math.abs(box.top - (viewport.top + offsetTop)) < 1
  ) {
    return 'top';
  }
  if (
    offsetBottom !== undefined &&
    Math.abs(box.bottom - (viewport.bottom - offsetBottom)) < 1
  ) {
    return 'bottom';
  }
  return null;
}

/** The part of `target` that is actually on screen, in viewport coordinates. */
export function andesAffixViewport(
  target: AndesAffixViewport | null,
  windowHeight: number,
): AndesAffixViewport {
  if (!target) {
    return { top: 0, bottom: windowHeight };
  }
  return {
    top: Math.max(0, target.top),
    bottom: Math.min(windowHeight, target.bottom),
  };
}
