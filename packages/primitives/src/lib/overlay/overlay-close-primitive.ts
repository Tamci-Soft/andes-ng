import { Directive, inject } from '@angular/core';

import { AndesOverlayPrimitive } from './overlay-primitive';

/**
 * Closes the overlay when activated. Every modal overlay should render one of
 * these inside its content: Escape and outside-click are not reachable for touch
 * screen-reader users, so an in-content dismiss affordance is an accessibility
 * requirement, not a convenience.
 */
@Directive({
  selector: '[andesOverlayClose]',
  exportAs: 'andesOverlayClose',
  host: {
    '(click)': 'close()',
  },
})
export class AndesOverlayClosePrimitive {
  /** The overlay this control closes. */
  readonly overlay = inject(AndesOverlayPrimitive);

  protected close(): void {
    this.overlay.close('close-button');
  }
}
