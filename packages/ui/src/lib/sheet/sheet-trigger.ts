import {
  AndesOverlayPrimitive,
  AndesOverlayTriggerPrimitive,
} from '@andes-ng/primitives';
import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

import { AndesSheet } from './sheet';

/** Matches the elements a browser will actually move focus to. */
const FOCUSABLE_SELECTOR =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Marks an element as the sheet's trigger. Composes
 * `AndesOverlayTriggerPrimitive` (positioning anchor + ARIA `aria-expanded`/
 * `aria-controls`/`aria-haspopup`) and toggles the sheet on click.
 *
 * ```html
 * <andes-sheet>
 *   <button andesSheetTrigger>Open</button>
 *   …
 * </andes-sheet>
 * ```
 */
@Directive({
  selector: '[andesSheetTrigger]',
  hostDirectives: [AndesOverlayTriggerPrimitive],
  host: {
    '(click)': 'onClick()',
  },
})
export class AndesSheetTrigger {
  private readonly sheet = inject(AndesSheet);
  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // `AndesOverlayTriggerPrimitive` registers *this* host as the element focus
    // returns to on close. That is right for `<button andesSheetTrigger>`, but
    // the directive is just as legitimately composed onto a wrapper component -
    // `<andes-button andesSheetTrigger>` - whose host element is a non-focusable
    // custom element with the real `<button>` inside its template. `focus()` on
    // such a host silently no-ops, so closing the sheet would strand focus on
    // `<body>` instead of returning it to the trigger. Re-anchor to the inner
    // focusable element once the wrapper has rendered its content.
    afterNextRender(() => {
      const host = this.elementRef.nativeElement;
      if (host.tabIndex >= 0) {
        return;
      }
      const focusable = host.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable) {
        this.overlay.registerAnchor(focusable);
      }
    });
  }

  protected onClick(): void {
    this.sheet.toggle();
  }
}
