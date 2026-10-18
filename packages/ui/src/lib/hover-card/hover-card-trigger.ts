import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  untracked,
} from '@angular/core';

import {
  andesHoverCardIsFocusVisible,
  AndesHoverCardIntent,
} from './hover-card-intent';

/**
 * What counts as the focusable element inside a non-focusable custom-element trigger, such
 * as the `<a>` or `<button>` a wrapper component renders.
 */
const FOCUSABLE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

function addIdToken(element: HTMLElement, attr: string, id: string): void {
  const tokens = (element.getAttribute(attr) ?? '')
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.includes(id)) {
    element.setAttribute(attr, [...tokens, id].join(' '));
  }
}

function removeIdToken(element: HTMLElement, attr: string, id: string): void {
  const tokens = (element.getAttribute(attr) ?? '')
    .split(/\s+/)
    .filter((token) => token && token !== id);
  if (tokens.length) {
    element.setAttribute(attr, tokens.join(' '));
  } else {
    element.removeAttribute(attr);
  }
}

/**
 * Marks an element as a hover card's trigger: the thing the pointer rests on or keyboard focus
 * reaches to preview something.
 *
 * It registers the element as the card's positioning anchor and, while the card is open, adds
 * the card's id to the element's `aria-describedby` - a hover card is a preview of what the
 * trigger already is, so it is announced as a description (the same relationship a tooltip
 * has), not as a dialog the trigger opens. The id is added as a token, so a description the
 * trigger already has survives.
 *
 * Keyboard: focus (the kind that shows a ring) opens the card after `openDelay`; `Escape`
 * closes it; `Alt+ArrowDown` opens it at once and moves focus to its first interactive element
 * (`Tab` keeps its normal meaning and moves on, past the card). A custom-element trigger
 * delegates focus and the description to its first focusable descendant.
 */
@Directive({
  selector: '[andesHoverCardTrigger]',
  exportAs: 'andesHoverCardTrigger',
  host: {
    '[attr.data-state]': 'overlay.isOpen() ? "open" : "closed"',
    '(pointerenter)': 'intent.triggerPointerEnter($event)',
    '(pointerleave)': 'intent.triggerPointerLeave($event)',
    '(pointerdown)': 'intent.triggerPointerDown($event)',
    '(click)': 'onClick($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AndesHoverCardTrigger {
  protected readonly overlay = inject(AndesOverlayPrimitive);
  protected readonly intent = inject(AndesHoverCardIntent);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.overlay.registerAnchor(this.elementRef);
    this.intent.registerTrigger({
      target: () => this.target(),
      host: () => this.elementRef.nativeElement,
    });

    let describedElement: HTMLElement | null = null;
    effect(() => {
      const open = this.overlay.isOpen();
      untracked(() => {
        const id = this.overlay.contentId;
        if (describedElement) {
          removeIdToken(describedElement, 'aria-describedby', id);
          describedElement = null;
        }
        if (open) {
          describedElement = this.target();
          addIdToken(describedElement, 'aria-describedby', id);
        }
      });
    });

    inject(DestroyRef).onDestroy(() => {
      if (describedElement) {
        removeIdToken(
          describedElement,
          'aria-describedby',
          this.overlay.contentId,
        );
      }
      this.intent.registerTrigger(null);
    });
  }

  /**
   * The element that receives focus and `aria-describedby`: the host itself, unless it is a
   * non-focusable custom element wrapping a focusable one.
   */
  target(): HTMLElement {
    const host = this.elementRef.nativeElement;
    if (!host.tagName.includes('-') || host.hasAttribute('tabindex')) {
      return host;
    }
    return host.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? host;
  }

  protected onClick(event: MouseEvent): void {
    if (this.intent.triggerClick()) {
      event.preventDefault();
    }
  }

  protected onFocusIn(event: FocusEvent): void {
    const target = event.target as Element | null;
    this.intent.triggerFocusIn(
      !!target && andesHoverCardIsFocusVisible(target),
    );
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    // Focus moving between elements of the trigger is not leaving it.
    if (next && this.elementRef.nativeElement.contains(next)) {
      return;
    }
    this.intent.triggerFocusOut(next);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' || !event.altKey || event.isComposing) {
      return;
    }
    event.preventDefault();
    this.intent.requestHandoff();
  }
}
