import { AndesOverlayTriggerPrimitive } from '@andes-ng/primitives';
import { Directive, inject } from '@angular/core';

import { AndesDropdownMenu } from './dropdown-menu';

/**
 * Marks an element as a dropdown menu's trigger. Apply it to whatever should open
 * the menu - a plain `<button>`, an `AndesButton`, an icon button - it renders
 * nothing of its own and does not care what tag it is on.
 *
 * `aria-haspopup`/`aria-expanded`/`aria-controls` and `data-state` come for free
 * from the composed `AndesOverlayTriggerPrimitive`.
 *
 * ```html
 * <button type="button" andesDropdownMenuTrigger>Options</button>
 * ```
 */
@Directive({
  selector: '[andesDropdownMenuTrigger]',
  hostDirectives: [AndesOverlayTriggerPrimitive],
  host: {
    // The overlay anchors the panel to THIS element's border box. When the trigger is
    // a wrapper component whose own host element has no `display` of its own -
    // `<andes-button>` is the common case, since `.andes-button` lives on the real
    // `<button>` inside its template - that box is the inline line-box (18px tall for
    // a 40px-tall button), not the control the user sees. The panel then opens
    // *over* the bottom of its own trigger instead of the preset's 4px below it.
    // `inline-flex` makes the trigger's box wrap exactly what it renders, which is
    // what the positioning already assumes; it is a no-op on a plain `<button>`,
    // which is inline-flex-shaped already, and a consumer's own `[style.display]`
    // still wins over a static host style.
    style: 'display: inline-flex',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AndesDropdownMenuTrigger {
  private readonly menu = inject(AndesDropdownMenu);

  protected onClick(): void {
    this.menu.toggle();
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.menu.open();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.menu.openFocusingLast();
        break;
      default:
        break;
    }
  }
}
