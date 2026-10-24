import type { AndesTourGap, AndesTourPlacement } from './tour-types';

/** A box in viewport coordinates. */
export interface AndesTourRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface AndesTourSize {
  readonly width: number;
  readonly height: number;
}

export type AndesTourSide = 'top' | 'bottom' | 'left' | 'right';

/** Distance from the spotlight to the card, with and without an arrow. */
const DISTANCE_WITH_ARROW = 12;
const DISTANCE_WITHOUT_ARROW = 8;
/** Closest the card may come to the viewport edge. */
const VIEWPORT_MARGIN = 8;
/** Closest the arrow may come to the corner of the card. */
const ARROW_INSET = 16;

const AUTO_ORDER: readonly AndesTourSide[] = ['bottom', 'top', 'right', 'left'];

const OPPOSITE: Readonly<Record<AndesTourSide, AndesTourSide>> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

type Align = 'start' | 'center' | 'end';

/** Splits a placement into the side it sits on and how it aligns along that side. */
export function parsePlacement(
  placement: AndesTourPlacement,
): { side: AndesTourSide; align: Align } | null {
  switch (placement) {
    case 'top':
    case 'bottom':
    case 'left':
    case 'right':
      return { side: placement, align: 'center' };
    case 'topLeft':
      return { side: 'top', align: 'start' };
    case 'topRight':
      return { side: 'top', align: 'end' };
    case 'bottomLeft':
      return { side: 'bottom', align: 'start' };
    case 'bottomRight':
      return { side: 'bottom', align: 'end' };
    case 'leftTop':
      return { side: 'left', align: 'start' };
    case 'leftBottom':
      return { side: 'left', align: 'end' };
    case 'rightTop':
      return { side: 'right', align: 'start' };
    case 'rightBottom':
      return { side: 'right', align: 'end' };
    default:
      return null;
  }
}

/** The target's box grown by the gap offset. */
export function expandRect(
  rect: AndesTourRect,
  gap: AndesTourGap | null | undefined,
): AndesTourRect {
  const offset = gap?.offset ?? 6;
  const [x, y] = typeof offset === 'number' ? [offset, offset] : offset;
  return {
    left: rect.left - x,
    top: rect.top - y,
    width: rect.width + x * 2,
    height: rect.height + y * 2,
  };
}

export interface AndesTourLayoutInput {
  /** The spotlight box, or `null` for a card centred on the page. */
  readonly spot: AndesTourRect | null;
  readonly card: AndesTourSize;
  readonly viewport: AndesTourSize;
  readonly placement: AndesTourPlacement;
  readonly arrow: boolean;
}

export interface AndesTourLayout {
  readonly left: number;
  readonly top: number;
  /** The side of the spotlight the card ended up on, or `center`. */
  readonly side: AndesTourSide | 'center';
  /** Where along the card's edge the arrow sits, in px; `null` without an arrow. */
  readonly arrowOffset: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Room on each side of the spotlight, after the distance the card keeps from it. */
function room(
  spot: AndesTourRect,
  viewport: AndesTourSize,
  distance: number,
): Record<AndesTourSide, number> {
  return {
    top: spot.top - distance - VIEWPORT_MARGIN,
    bottom:
      viewport.height - (spot.top + spot.height) - distance - VIEWPORT_MARGIN,
    left: spot.left - distance - VIEWPORT_MARGIN,
    right:
      viewport.width - (spot.left + spot.width) - distance - VIEWPORT_MARGIN,
  };
}

/**
 * Places the step card. With a spotlight it goes on the requested side, moving to the
 * opposite (or the first side that fits) when it would not fit, and is nudged along the
 * edge to stay on screen with the arrow still pointing at the spotlight's centre. With no
 * spotlight it sits in the middle of the viewport.
 */
export function computeTourLayout(
  input: AndesTourLayoutInput,
): AndesTourLayout {
  const { spot, card, viewport, placement } = input;
  if (!spot || placement === 'center') {
    return {
      left: Math.round((viewport.width - card.width) / 2),
      top: Math.round((viewport.height - card.height) / 2),
      side: 'center',
      arrowOffset: null,
    };
  }

  const distance = input.arrow ? DISTANCE_WITH_ARROW : DISTANCE_WITHOUT_ARROW;
  const available = room(spot, viewport, distance);
  const needs = (side: AndesTourSide) =>
    side === 'top' || side === 'bottom' ? card.height : card.width;
  const fits = (side: AndesTourSide) => available[side] >= needs(side);

  const requested = parsePlacement(placement);
  let side: AndesTourSide;
  if (requested && fits(requested.side)) {
    side = requested.side;
  } else if (requested && fits(OPPOSITE[requested.side])) {
    side = OPPOSITE[requested.side];
  } else {
    side =
      AUTO_ORDER.find(fits) ??
      AUTO_ORDER.reduce((best, candidate) =>
        available[candidate] > available[best] ? candidate : best,
      );
  }
  const align = requested?.align ?? 'center';

  const spotRight = spot.left + spot.width;
  const spotBottom = spot.top + spot.height;
  let left: number;
  let top: number;
  if (side === 'top' || side === 'bottom') {
    left =
      align === 'start'
        ? spot.left
        : align === 'end'
          ? spotRight - card.width
          : spot.left + spot.width / 2 - card.width / 2;
    top =
      side === 'top'
        ? spot.top - distance - card.height
        : spotBottom + distance;
  } else {
    top =
      align === 'start'
        ? spot.top
        : align === 'end'
          ? spotBottom - card.height
          : spot.top + spot.height / 2 - card.height / 2;
    left =
      side === 'left'
        ? spot.left - distance - card.width
        : spotRight + distance;
  }

  left = clamp(
    left,
    VIEWPORT_MARGIN,
    viewport.width - card.width - VIEWPORT_MARGIN,
  );
  top = clamp(
    top,
    VIEWPORT_MARGIN,
    viewport.height - card.height - VIEWPORT_MARGIN,
  );

  let arrowOffset: number | null = null;
  if (input.arrow) {
    arrowOffset =
      side === 'top' || side === 'bottom'
        ? clamp(
            spot.left + spot.width / 2 - left,
            ARROW_INSET,
            card.width - ARROW_INSET,
          )
        : clamp(
            spot.top + spot.height / 2 - top,
            ARROW_INSET,
            card.height - ARROW_INSET,
          );
  }

  return { left: Math.round(left), top: Math.round(top), side, arrowOffset };
}
