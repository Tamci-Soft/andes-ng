import { AndesOverlayTriggerPrimitive } from '@andes-ng/primitives';
import { Directive, inject } from '@angular/core';

import { AndesPopover } from './popover';

/**
 * Marks an element as the popover's trigger. Composes `AndesOverlayTriggerPrimitive`
 * for anchor registration and ARIA (`aria-haspopup`/`aria-expanded`/`aria-controls`,
 * plus `data-state`), and adds the one behavior that is Popover's own: a click
 * toggles it open/closed.
 *
 * Works on any host - a native `<button>`, an `andes-button`, an icon wrapper -
 * so consumers are not forced into a specific trigger element.
 */
@Directive({
  selector: '[andesPopoverTrigger]',
  hostDirectives: [
    { directive: AndesOverlayTriggerPrimitive, inputs: ['ariaAttachment'] },
  ],
  host: {
    '(click)': 'toggle()',
  },
})
export class AndesPopoverTrigger {
  private readonly popover = inject(AndesPopover);

  protected toggle(): void {
    this.popover.toggle();
  }
}
