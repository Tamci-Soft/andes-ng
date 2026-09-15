import { AndesOverlayTriggerPrimitive } from '@andes-ng/primitives';
import { Directive, inject } from '@angular/core';

import { AndesDrawer } from './drawer';

/**
 * Marks an element as the drawer's trigger. Composes
 * `AndesOverlayTriggerPrimitive` (positioning anchor + ARIA `aria-expanded`/
 * `aria-controls`/`aria-haspopup`) and toggles the drawer on click.
 *
 * ```html
 * <andes-drawer>
 *   <button andesDrawerTrigger>Open</button>
 *   …
 * </andes-drawer>
 * ```
 */
@Directive({
  selector: '[andesDrawerTrigger]',
  hostDirectives: [AndesOverlayTriggerPrimitive],
  host: {
    '(click)': 'onClick()',
  },
})
export class AndesDrawerTrigger {
  private readonly drawer = inject(AndesDrawer);

  protected onClick(): void {
    this.drawer.toggle();
  }
}
