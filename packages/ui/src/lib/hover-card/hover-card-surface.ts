import { Directive, inject } from '@angular/core';

import {
  andesHoverCardIsFocusVisible,
  AndesHoverCardIntent,
} from './hover-card-intent';

/**
 * Wires the card's surface element to its interaction handling: the pointer over it, a button
 * pressed on it, focus entering or leaving it and the keys pressed inside it. Applied by
 * `AndesHoverCard` to the element it renders in the overlay.
 */
@Directive({
  selector: '[andesHoverCardSurface]',
  host: {
    '(pointerenter)': 'intent.cardPointerEnter($event)',
    '(pointerleave)': 'intent.cardPointerLeave($event)',
    '(pointerdown)': 'intent.cardPointerDown($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown)': 'intent.cardKeydown($event)',
  },
})
export class AndesHoverCardSurface {
  protected readonly intent = inject(AndesHoverCardIntent);

  protected onFocusOut(event: FocusEvent): void {
    this.intent.cardFocusOut(event.relatedTarget as Node | null);
  }

  protected onFocusIn(event: FocusEvent): void {
    const target = event.target as Element | null;
    this.intent.cardFocusIn(!!target && andesHoverCardIsFocusVisible(target));
  }
}
