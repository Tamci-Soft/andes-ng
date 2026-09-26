import { Directive, inject } from '@angular/core';

import { AndesDrawer } from './drawer';

/**
 * Closes the enclosing drawer when activated, with its slide-out animation.
 * Compose onto any element inside the drawer's content, typically a footer
 * "Cancel" button - the panel already renders its own close-icon button in the
 * corner (unless `closable` is off), this is for consumer-authored ones.
 *
 * Note this is the *only* dismissal path besides Escape/backdrop/trigger - see
 * `AndesDrawer`'s class doc for why swipe-to-dismiss is not implemented here.
 *
 * It deliberately does not compose `AndesOverlayClosePrimitive`: that closes the
 * overlay synchronously, skipping the slide-out.
 *
 * ```html
 * <andes-drawer-footer>
 *   <button andesDrawerClose>Cancel</button>
 * </andes-drawer-footer>
 * ```
 */
@Directive({
  selector: '[andesDrawerClose]',
  host: {
    '(click)': 'drawer.requestClose()',
  },
})
export class AndesDrawerClose {
  protected readonly drawer = inject(AndesDrawer);
}
