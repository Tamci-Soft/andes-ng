import { InjectionToken, type Signal } from '@angular/core';

import type {
  AndesCarouselEffect,
  AndesCarouselLabels,
} from './carousel-types';

/** What `andes-carousel` offers the slides inside it. */
export interface AndesCarouselContext {
  readonly slideCount: Signal<number>;
  /**
   * Where the slides are headed, in slide units: the slide at this coordinate sits at the
   * start edge of the view. Unbounded when looping.
   */
  readonly position: Signal<number>;
  /** Slides shown at once (may be fractional). */
  readonly perView: Signal<number>;
  /** Whether slides loop seamlessly past the ends. */
  readonly wraps: Signal<boolean>;
  /** First slot a looping slide may occupy, relative to the start edge. */
  readonly windowStart: Signal<number>;
  readonly effect: Signal<AndesCarouselEffect>;
  readonly isVertical: Signal<boolean>;
  /** Slides stretch to the viewport's height (set by an aspect ratio or a slide height). */
  readonly fill: Signal<boolean>;
  /** Slides kept rendered on each side of the visible ones. */
  readonly preload: Signal<number>;
  readonly resolvedLabels: Signal<Required<AndesCarouselLabels>>;
  indexOf(slide: object): number;
}

export const ANDES_CAROUSEL = new InjectionToken<AndesCarouselContext>(
  'ANDES_CAROUSEL',
);
