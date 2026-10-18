import { InjectionToken, type Signal } from '@angular/core';

import type {
  AndesCarouselEffect,
  AndesCarouselLabels,
} from './carousel-types';

/** What `andes-carousel` offers the slides inside it. */
export interface AndesCarouselContext {
  readonly count: Signal<number>;
  /** Index of the first visible slide. */
  readonly index: Signal<number>;
  /** How many slides are visible at once (rounded up). */
  readonly visibleCount: Signal<number>;
  /** Whether slides loop seamlessly past the ends. */
  readonly wraps: Signal<boolean>;
  readonly effect: Signal<AndesCarouselEffect>;
  readonly isVertical: Signal<boolean>;
  /** Slides kept rendered on each side of the visible ones. */
  readonly preload: Signal<number>;
  readonly resolvedLabels: Signal<Required<AndesCarouselLabels>>;
  indexOf(slide: object): number;
}

export const ANDES_CAROUSEL = new InjectionToken<AndesCarouselContext>(
  'ANDES_CAROUSEL',
);
