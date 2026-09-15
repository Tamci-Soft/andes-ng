import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import { computed, Directive, ElementRef, inject } from '@angular/core';

import { AndesTooltipHoverIntent } from './tooltip-hover-intent';

/**
 * Marks an element as a tooltip's trigger. Registers it as the overlay's
 * positioning anchor and wires `aria-describedby` to the tooltip content's id
 * once open - the WAI-ARIA "description" pattern, distinct from
 * `aria-labelledby`/`aria-haspopup`/`aria-expanded`, which describe a widget
 * the user *opens* (Popover, Dropdown Menu, Dialog). A tooltip is not opened;
 * it describes whatever the trigger already is. `AndesOverlayTriggerPrimitive`
 * (built around that "expanded" contract) is intentionally not reused here -
 * the two ARIA contracts differ enough that composing it would mean fighting
 * its defaults (`aria-haspopup`, `aria-expanded`) rather than reusing them, so
 * this directive owns its handful of host bindings directly.
 *
 * Opens on real mouse hover and on keyboard focus; closes on mouse-leave and
 * blur. Touch input never opens it - a tooltip is a hover/focus affordance a
 * touch user cannot trigger by accident, and Base UI documents the same
 * exclusion. Escape dismissal and the anchored positioning itself are handled
 * by the shared `AndesOverlayPrimitive`; only the hover-intent *timing*
 * (open-delay, close-delay, instant-reopen grouping) is this component's own,
 * via `AndesTooltipHoverIntent`.
 */
@Directive({
  selector: '[andesTooltipTrigger]',
  host: {
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-state]': 'overlay.isOpen() ? "open" : "closed"',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focus)': 'hoverIntent.requestOpen()',
    '(blur)': 'hoverIntent.requestClose()',
  },
})
export class AndesTooltipTrigger {
  protected readonly overlay = inject(AndesOverlayPrimitive);
  protected readonly hoverIntent = inject(AndesTooltipHoverIntent);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Only set while the tooltip is open, per the ARIA tooltip pattern. */
  protected readonly describedBy = computed(() =>
    this.overlay.isOpen() ? this.overlay.contentId : null,
  );

  constructor() {
    this.overlay.registerAnchor(this.elementRef);
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.hoverIntent.requestOpen();
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.hoverIntent.requestClose();
  }
}
