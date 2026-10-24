import type { AndesImageTransform } from './image-types';

/** Fit-to-viewport, no rotation, no flip, no pan. */
export const ANDES_IMAGE_IDENTITY_TRANSFORM: AndesImageTransform = {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 1,
  flipX: false,
  flipY: false,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The CSS `transform` for an image: pan, then mirror and zoom on screen axes, then rotate.
 * Applied right to left, so a mirror stays a screen-axis mirror however far it is rotated.
 */
export function imageTransformCss(transform: AndesImageTransform): string {
  const sx = transform.flipX ? -transform.scale : transform.scale;
  const sy = transform.flipY ? -transform.scale : transform.scale;
  return (
    `translate3d(${transform.x}px, ${transform.y}px, 0) ` +
    `scale3d(${sx}, ${sy}, 1) rotate(${transform.rotate}deg)`
  );
}

/**
 * Changes the zoom to `nextScale` (clamped), keeping the point under `focal` fixed on
 * screen. `focal` is measured from the viewport's centre; omit it to zoom about the centre.
 */
export function zoomTransform(
  transform: AndesImageTransform,
  nextScale: number,
  min: number,
  max: number,
  focal: { readonly x: number; readonly y: number } = { x: 0, y: 0 },
): AndesImageTransform {
  const scale = clamp(nextScale, min, max);
  if (scale === transform.scale) {
    return transform;
  }
  const ratio = scale / transform.scale;
  return {
    ...transform,
    scale,
    x: focal.x - (focal.x - transform.x) * ratio,
    y: focal.y - (focal.y - transform.y) * ratio,
  };
}

/** A size in px. */
export interface AndesImageSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Pulls the pan back so the image never strays off the viewport: an image smaller than the
 * viewport on an axis is centred on it, a larger one keeps covering both edges.
 *
 * `image` is the laid-out (unrotated, unscaled) size; a quarter turn swaps its axes.
 * Returns the same object when nothing needs to move, and when a size is unknown (zero).
 */
export function reboundTransform(
  transform: AndesImageTransform,
  viewport: AndesImageSize,
  image: AndesImageSize,
): AndesImageTransform {
  if (!viewport.width || !viewport.height || !image.width || !image.height) {
    return transform;
  }
  const quarter = Math.abs(Math.round(transform.rotate / 90)) % 2 === 1;
  const width = (quarter ? image.height : image.width) * transform.scale;
  const height = (quarter ? image.width : image.height) * transform.scale;
  const maxX = Math.max(0, (width - viewport.width) / 2);
  const maxY = Math.max(0, (height - viewport.height) / 2);
  // `+ 0` folds a negative zero (from clamping into a zero-width range) into plain zero.
  const x = clamp(transform.x, -maxX, maxX) + 0;
  const y = clamp(transform.y, -maxY, maxY) + 0;
  return x === transform.x && y === transform.y
    ? transform
    : { ...transform, x, y };
}

/** True when the image is zoomed beyond the fit size. */
export function isZoomed(transform: AndesImageTransform): boolean {
  return transform.scale > 1.0001;
}

/** True when nothing differs from the fit-to-viewport state. */
export function isIdentityTransform(transform: AndesImageTransform): boolean {
  const identity = ANDES_IMAGE_IDENTITY_TRANSFORM;
  return (
    transform.x === identity.x &&
    transform.y === identity.y &&
    transform.rotate % 360 === 0 &&
    transform.scale === identity.scale &&
    transform.flipX === identity.flipX &&
    transform.flipY === identity.flipY
  );
}
