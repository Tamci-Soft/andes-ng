import { AndesOverlayClosePrimitive } from '@andes-ng/primitives';
import { Directive } from '@angular/core';

/**
 * Closes the enclosing drawer when activated. Compose onto any element inside the
 * drawer's content, typically a footer "Cancel" button - the panel already
 * renders its own close-icon button in the corner, this is for consumer-authored
 * ones.
 *
 * Note this is the *only* dismissal path besides Escape/backdrop/trigger - see
 * `AndesDrawer`'s class doc for why swipe-to-dismiss is not implemented here.
 *
 * ```html
 * <andes-drawer-footer>
 *   <button andesDrawerClose>Cancel</button>
 * </andes-drawer-footer>
 * ```
 */
@Directive({
  selector: '[andesDrawerClose]',
  hostDirectives: [AndesOverlayClosePrimitive],
})
export class AndesDrawerClose {}
