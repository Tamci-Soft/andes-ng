import { AndesOverlayTriggerPrimitive } from '@andes-ng/primitives';
import { Directive, inject } from '@angular/core';

import { AndesSheet } from './sheet';

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

  protected onClick(): void {
    this.sheet.toggle();
  }
}
