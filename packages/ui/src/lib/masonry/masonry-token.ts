import { InjectionToken, type Signal } from '@angular/core';

/** What a projected masonry item needs from the masonry that contains it. */
export interface AndesMasonryHost {
  readonly layoutMode: Signal<'css' | 'js'>;
  /** Asks for a new layout pass (batched into one frame). */
  requestLayout(): void;
}

export const ANDES_MASONRY = new InjectionToken<AndesMasonryHost>(
  'ANDES_MASONRY',
);
