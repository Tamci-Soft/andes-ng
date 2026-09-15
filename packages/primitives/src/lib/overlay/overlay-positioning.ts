import type { Injector } from '@angular/core';
import {
  createFlexibleConnectedPositionStrategy,
  createGlobalPositionStrategy,
  type ConnectedPosition,
  type GlobalPositionStrategy,
  type PositionStrategy,
} from '@angular/cdk/overlay';

import {
  type AndesOverlayAlign,
  type AndesOverlayConfig,
  type AndesOverlayEdge,
  type AndesOverlayPositioning,
  type AndesOverlaySide,
} from './overlay-config';

const OPPOSITE_SIDE: Readonly<Record<AndesOverlaySide, AndesOverlaySide>> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const CROSS_SIDES: Readonly<
  Record<AndesOverlaySide, readonly AndesOverlaySide[]>
> = {
  top: ['right', 'left'],
  bottom: ['right', 'left'],
  left: ['bottom', 'top'],
  right: ['bottom', 'top'],
};

/**
 * Translates one andes-ng `side`/`align` pair into a CDK `ConnectedPosition`.
 *
 * `sideOffset` always pushes the overlay *away* from the anchor, so its sign
 * depends on the side; `alignOffset` shifts along the perpendicular axis.
 */
export function andesConnectedPosition(
  side: AndesOverlaySide,
  align: AndesOverlayAlign,
  sideOffset: number,
  alignOffset: number,
): ConnectedPosition {
  const alignToX = { start: 'start', center: 'center', end: 'end' } as const;
  const alignToY = { start: 'top', center: 'center', end: 'bottom' } as const;

  switch (side) {
    case 'bottom':
      return {
        originX: alignToX[align],
        originY: 'bottom',
        overlayX: alignToX[align],
        overlayY: 'top',
        offsetX: alignOffset,
        offsetY: sideOffset,
      };
    case 'top':
      return {
        originX: alignToX[align],
        originY: 'top',
        overlayX: alignToX[align],
        overlayY: 'bottom',
        offsetX: alignOffset,
        offsetY: -sideOffset,
      };
    case 'right':
      return {
        originX: 'end',
        originY: alignToY[align],
        overlayX: 'start',
        overlayY: alignToY[align],
        offsetX: sideOffset,
        offsetY: alignOffset,
      };
    case 'left':
      return {
        originX: 'start',
        originY: alignToY[align],
        overlayX: 'end',
        overlayY: alignToY[align],
        offsetX: -sideOffset,
        offsetY: alignOffset,
      };
  }
}

/**
 * The preferred position first, then the fallbacks CDK walks when it does not fit:
 * the opposite side (a flip), then the two perpendicular sides (a last resort before
 * CDK falls back to pushing the overlay into view).
 */
export function andesConnectedPositions(
  side: AndesOverlaySide,
  align: AndesOverlayAlign,
  sideOffset: number,
  alignOffset: number,
  flip: boolean,
): ConnectedPosition[] {
  const build = (candidate: AndesOverlaySide) =>
    andesConnectedPosition(candidate, align, sideOffset, alignOffset);

  if (!flip) {
    return [build(side)];
  }

  return [
    build(side),
    build(OPPOSITE_SIDE[side]),
    ...CROSS_SIDES[side].map(build),
  ];
}

function applyEdge(
  strategy: GlobalPositionStrategy,
  edge: AndesOverlayEdge,
): GlobalPositionStrategy {
  switch (edge) {
    case 'left':
      return strategy.top('0').left('0');
    case 'right':
      return strategy.top('0').right('0');
    case 'top':
      return strategy.top('0').left('0');
    case 'bottom':
      return strategy.bottom('0').left('0');
  }
}

/**
 * Builds the CDK position strategy for a config. Anchored positioning needs the
 * anchor element; without one it degrades to centered rather than throwing, so a
 * Popover whose trigger has not attached yet still renders somewhere sane.
 */
export function createAndesPositionStrategy(
  injector: Injector,
  positioning: AndesOverlayPositioning,
  anchor: HTMLElement | null,
): PositionStrategy {
  if (positioning.kind === 'anchored' && anchor) {
    const {
      side = 'bottom',
      align = 'center',
      sideOffset = 0,
      alignOffset = 0,
      flip = true,
      shift = true,
      viewportMargin = 8,
      lockPosition = false,
    } = positioning;

    return createFlexibleConnectedPositionStrategy(injector, anchor)
      .withPositions(
        andesConnectedPositions(side, align, sideOffset, alignOffset, flip),
      )
      .withPush(shift)
      .withViewportMargin(viewportMargin)
      .withFlexibleDimensions(false)
      .withGrowAfterOpen(false)
      .withLockedPosition(lockPosition);
  }

  const strategy = createGlobalPositionStrategy(injector);

  if (positioning.kind === 'edge') {
    return applyEdge(strategy, positioning.edge ?? 'right');
  }

  return strategy.centerHorizontally().centerVertically();
}

/**
 * Sizing implied by the positioning, before the consumer's explicit `size` wins.
 * An edge-anchored panel spans the edge it is pinned to; nothing else implies a size.
 */
export function andesImpliedSize(
  positioning: AndesOverlayPositioning,
): Pick<AndesOverlayConfig['size'], 'width' | 'height'> {
  if (positioning.kind !== 'edge') {
    return {};
  }

  const edge = positioning.edge ?? 'right';
  return edge === 'left' || edge === 'right'
    ? { height: '100%' }
    : { width: '100%' };
}
