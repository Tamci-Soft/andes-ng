import { AndesOverlayClosePrimitive } from '@andes-ng/primitives';
import { Directive } from '@angular/core';

/**
 * Closes the enclosing sheet when activated. Compose onto any element inside the
 * sheet's content, typically a footer "Cancel" button - the panel already renders
 * its own close-icon button in the corner, this is for consumer-authored ones.
 *
 * ```html
 * <andes-sheet-footer>
 *   <button andesSheetClose>Cancel</button>
 * </andes-sheet-footer>
 * ```
 */
@Directive({
  selector: '[andesSheetClose]',
  hostDirectives: [AndesOverlayClosePrimitive],
})
export class AndesSheetClose {}
