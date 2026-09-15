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
