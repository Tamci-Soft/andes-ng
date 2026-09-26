import type { AndesOverlayAlign, AndesOverlaySide } from '@andes-ng/primitives';

/**
 * Ant Design's 12 named placements. A convenience shorthand over the
 * `side` + `align` pair the rest of andes-ng's overlays speak: `topLeft` is
 * `side="top" align="start"`, `leftBottom` is `side="left" align="end"`, and so
 * on. `start`/`end` follow the CDK's logical alignment, so under `dir="rtl"`
 * `topLeft` hugs the trigger's *right* edge - the same way `align="start"` does.
 */
export type AndesTooltipPlacement =
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

/** The `side`/`align` pair an {@link AndesTooltipPlacement} resolves to. */
export interface AndesTooltipSideAlign {
  readonly side: AndesOverlaySide;
  readonly align: AndesOverlayAlign;
}

const PLACEMENTS: Readonly<
  Record<AndesTooltipPlacement, AndesTooltipSideAlign>
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

/** Every placement name, in Ant Design's documentation order. */
export const ANDES_TOOLTIP_PLACEMENTS = Object.keys(
  PLACEMENTS,
) as readonly AndesTooltipPlacement[];

/** Translates an Ant-style placement name into andes-ng's `side`/`align`. */
export function andesTooltipPlacementToSideAlign(
  placement: AndesTooltipPlacement,
): AndesTooltipSideAlign {
  return PLACEMENTS[placement];
}

/**
 * Arrow configuration, normalized. `pointAtCenter` makes an edge-aligned
 * tooltip (`topLeft`, `rightBottom`, ...) shift itself so its arrow lands on
 * the trigger's center instead of just inside the trigger's edge - Ant's
 * `arrow={{ pointAtCenter: true }}`.
 */
export interface AndesTooltipArrowConfig {
  readonly pointAtCenter: boolean;
}

/** What the `arrow` input accepts before {@link andesTooltipArrowAttribute} normalizes it. */
export type AndesTooltipArrowInput =
  boolean | AndesTooltipArrowConfig | '' | 'true' | 'false' | null | undefined;

/**
 * Input transform for `arrow`: `false`/`'false'`/`null` hide the arrow; a bare
 * attribute (`''`), `true` or `'true'` show a plain arrow; an object is kept.
 */
export function andesTooltipArrowAttribute(
  value: AndesTooltipArrowInput,
): AndesTooltipArrowConfig | false {
  if (value === false || value === 'false' || value == null) {
    return false;
  }
  if (typeof value === 'object') {
    return { pointAtCenter: !!value.pointAtCenter };
  }
  return { pointAtCenter: false };
}

/**
 * Arrow geometry, in px. The arrow is a `ARROW_WIDTH` x `ARROW_HEIGHT`
 * triangle; `ARROW_INSET` is how far from an edge-aligned tooltip's edge its
 * center sits (Ant's `topLeft` arrow is likewise "just inside" the corner);
 * `ARROW_EDGE_MIN` keeps it clear of the rounded corner when clamping.
 */
export const ANDES_TOOLTIP_ARROW_HEIGHT = 6;
export const ANDES_TOOLTIP_ARROW_WIDTH = 12;
export const ANDES_TOOLTIP_ARROW_INSET = 12;
const ARROW_EDGE_MIN = 10;

/** The subset of `DOMRect` the geometry helpers need - easy to fake in tests. */
export interface AndesTooltipRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

function isHorizontalSide(side: AndesOverlaySide): boolean {
  return side === 'top' || side === 'bottom';
}

/**
 * Extra `alignOffset` that makes a `pointAtCenter` arrow land on the trigger's
 * center for an edge-aligned placement. The arrow sits `ARROW_INSET` from the
 * tooltip's aligned edge, so the tooltip has to move by the distance between
 * that point and the trigger's center - towards the center for `start`, away
 * from it (negative) for `end`. Zero for centered placements, where the arrow
 * already points at the center.
 */
export function andesTooltipPointAtCenterOffset(
  side: AndesOverlaySide,
  align: AndesOverlayAlign,
  anchor: Pick<AndesTooltipRect, 'width' | 'height'>,
): number {
  if (align === 'center') {
    return 0;
  }
  const size = isHorizontalSide(side) ? anchor.width : anchor.height;
  const shift = size / 2 - ANDES_TOOLTIP_ARROW_INSET;
  return align === 'start' ? shift : -shift;
}

/**
 * Which side of the anchor the tooltip actually rendered on. The CDK may flip
 * to the opposite (or a perpendicular) side when the preferred one does not
 * fit, and it does not tell the primitive which one it picked, so this reads
 * it back from the rendered geometry. The requested side wins whenever its
 * condition holds (e.g. a corner-aligned tooltip touches two edges), and an
 * unmeasurable panel (jsdom, a not-yet-laid-out pane) falls back to it too.
 */
export function andesTooltipResolveSide(
  anchor: AndesTooltipRect,
  panel: AndesTooltipRect,
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
 * Where, in px from the tooltip's own leading edge along the cross axis, the
 * arrow's center goes so it points at the trigger - even after the CDK has
 * shifted the tooltip to keep it on screen. Centered (or `pointAtCenter`)
 * placements aim at the trigger's center; edge-aligned ones aim just inside
 * whichever trigger edge the tooltip is lined up with, or at the center of a
 * trigger too small to have an "inside". The result is clamped so the arrow
 * never leaves the tooltip or overlaps its rounded corners.
 */
export function andesTooltipArrowOffset(
  side: AndesOverlaySide,
  align: AndesOverlayAlign,
  pointAtCenter: boolean,
  anchor: AndesTooltipRect,
  panel: AndesTooltipRect,
): number {
  const horizontal = isHorizontalSide(side);
  const anchorStart = horizontal ? anchor.left : anchor.top;
  const anchorSize = horizontal ? anchor.width : anchor.height;
  const panelStart = horizontal ? panel.left : panel.top;
  const panelSize = horizontal ? panel.width : panel.height;

  const inset = Math.min(ANDES_TOOLTIP_ARROW_INSET, anchorSize / 2);
  let target = anchorStart + anchorSize / 2;
  if (!pointAtCenter && align !== 'center') {
    // Physical edge the panel is lined up with - robust to RTL, where the
    // CDK maps `start` onto the right edge.
    const leadingGap = Math.abs(panelStart - anchorStart);
    const trailingGap = Math.abs(
      panelStart + panelSize - (anchorStart + anchorSize),
    );
    target =
      leadingGap <= trailingGap
        ? anchorStart + inset
        : anchorStart + anchorSize - inset;
  }

  const min = ARROW_EDGE_MIN;
  const max = panelSize - ARROW_EDGE_MIN;
  if (max < min) {
    return panelSize / 2;
  }
  return Math.min(Math.max(target - panelStart, min), max);
}
