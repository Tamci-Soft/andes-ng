import { Directive, inject } from '@angular/core';

import { AndesSheet } from './sheet';

/**
 * Closes the enclosing sheet when activated, with its slide-out animation.
 * Compose onto any element inside the sheet's content, typically a footer
 * "Cancel" button - the panel already renders its own close-icon button in the
 * corner (unless `closable` is off), this is for consumer-authored ones.
 *
 * It deliberately does not compose `AndesOverlayClosePrimitive`: that closes the
 * overlay synchronously, skipping the slide-out.
 *
 * ```html
 * <andes-sheet-footer>
 *   <button andesSheetClose>Cancel</button>
 * </andes-sheet-footer>
 * ```
 */
@Directive({
  selector: '[andesSheetClose]',
  host: {
    '(click)': 'sheet.requestClose()',
  },
})
export class AndesSheetClose {
  protected readonly sheet = inject(AndesSheet);
}
