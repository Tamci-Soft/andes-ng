import type { AndesOverlayAlign, AndesOverlaySide } from '@andes-ng/primitives';

/**
 * The twelve named placements, a shorthand over the `side` + `align` pair:
 * `topLeft` is `side="top" align="start"`, `leftBottom` is `side="left" align="end"`.
 * `start`/`end` are logical, so under `dir="rtl"` `topLeft` hugs the trigger's right edge.
 */
export type AndesHoverCardPlacement =
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'
  | 'left'
  | 'leftTop'
  | 'leftBottom'
  | 'right'
  | 'rightTop'
  | 'rightBottom';

/** The `side`/`align` pair a placement name resolves to. */
export interface AndesHoverCardSideAlign {
  readonly side: AndesOverlaySide;
  readonly align: AndesOverlayAlign;
}

const PLACEMENTS: Readonly<
  Record<AndesHoverCardPlacement, AndesHoverCardSideAlign>
> = {
  top: { side: 'top', align: 'center' },
  topLeft: { side: 'top', align: 'start' },
  topRight: { side: 'top', align: 'end' },
  bottom: { side: 'bottom', align: 'center' },
  bottomLeft: { side: 'bottom', align: 'start' },
  bottomRight: { side: 'bottom', align: 'end' },
  left: { side: 'left', align: 'center' },
  leftTop: { side: 'left', align: 'start' },
  leftBottom: { side: 'left', align: 'end' },
  right: { side: 'right', align: 'center' },
  rightTop: { side: 'right', align: 'start' },
  rightBottom: { side: 'right', align: 'end' },
};

/** Every placement name. */
export const ANDES_HOVER_CARD_PLACEMENTS = Object.keys(
  PLACEMENTS,
) as readonly AndesHoverCardPlacement[];

/** Translates a named placement into `side` and `align`. */
export function andesHoverCardPlacementToSideAlign(
  placement: AndesHoverCardPlacement,
): AndesHoverCardSideAlign {
  return PLACEMENTS[placement];
}

/** How far the arrow protrudes from the card edge, in px. */
export const ANDES_HOVER_CARD_ARROW_SIZE = 6;

/** Keeps the arrow clear of the card's rounded corners, in px. */
const ARROW_EDGE_MIN = 14;

/** The subset of `DOMRect` the geometry helpers need - easy to fake in tests. */
export interface AndesHoverCardRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

function isHorizontal(side: AndesOverlaySide): boolean {
  return side === 'top' || side === 'bottom';
}

/**
 * Which side of the trigger the card actually rendered on. The overlay may flip it (or move
 * it to a perpendicular side) when the preferred one does not fit, and does not say which, so
 * this reads it back from the geometry. The requested side wins whenever its condition holds,
 * and an unmeasurable card (jsdom, not laid out yet) keeps the requested side.
 */
export function andesHoverCardResolveSide(
  anchor: AndesHoverCardRect,
  panel: AndesHoverCardRect,
  requested: AndesOverlaySide,
): AndesOverlaySide {
  if (panel.width === 0 && panel.height === 0) {
    return requested;
  }
  const epsilon = 1;
  const fits: Record<AndesOverlaySide, boolean> = {
    top: panel.top + panel.height <= anchor.top + epsilon,
    bottom: panel.top >= anchor.top + anchor.height - epsilon,
    left: panel.left + panel.width <= anchor.left + epsilon,
    right: panel.left >= anchor.left + anchor.width - epsilon,
  };
  if (fits[requested]) {
    return requested;
  }
  const order: readonly AndesOverlaySide[] = ['top', 'bottom', 'left', 'right'];
  return order.find((side) => fits[side]) ?? requested;
}

/**
 * Where, in px from the card's leading edge along the cross axis, the arrow's centre goes so
 * it points at the middle of the trigger - even after the overlay shifted the card to keep it
 * on screen. Clamped so the arrow never leaves the card or touches a rounded corner.
 */
export function andesHoverCardArrowOffset(
  side: AndesOverlaySide,
  anchor: AndesHoverCardRect,
  panel: AndesHoverCardRect,
): number {
  const horizontal = isHorizontal(side);
  const anchorCenter = horizontal
    ? anchor.left + anchor.width / 2
    : anchor.top + anchor.height / 2;
  const panelStart = horizontal ? panel.left : panel.top;
  const panelSize = horizontal ? panel.width : panel.height;

  const min = ARROW_EDGE_MIN;
  const max = panelSize - ARROW_EDGE_MIN;
  if (max < min) {
    return panelSize / 2;
  }
  return Math.min(Math.max(anchorCenter - panelStart, min), max);
}
