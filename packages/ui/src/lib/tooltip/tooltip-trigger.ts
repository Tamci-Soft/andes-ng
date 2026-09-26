import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import {
  afterNextRender,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  untracked,
} from '@angular/core';

import { AndesTooltipHoverIntent } from './tooltip-hover-intent';

/**
 * What counts as the "real" focusable element inside a non-focusable custom
 * element trigger, e.g. the `<button>` `<andes-button>` renders.
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
 * Marks an element as a tooltip's trigger. Registers it as the overlay's
 * positioning anchor and adds the tooltip content's id to its
 * `aria-describedby` while open - the WAI-ARIA "description" pattern,
 * distinct from `aria-labelledby`/`aria-haspopup`/`aria-expanded`, which
 * describe a widget the user *opens* (Popover, Dropdown Menu, Dialog). A
 * tooltip is not opened; it describes whatever the trigger already is.
 * `AndesOverlayTriggerPrimitive` (built around that "expanded" contract) is
 * intentionally not reused here - the two ARIA contracts differ enough that
 * composing it would mean fighting its defaults (`aria-haspopup`,
 * `aria-expanded`) rather than reusing them.
 *
 * The id is added as a token, not written over the attribute, so a trigger's
 * own `aria-describedby` (a hint paragraph, an error message) survives.
 *
 * ## Custom-element triggers
 *
 * A custom element that is not itself focusable - `<andes-button>`, whose
 * host has no box of its own and whose real `<button>` is inside - delegates
 * to its first focusable descendant: that is what the tooltip anchors to and
 * what gets `aria-describedby`. Focus is heard through `focusin`/`focusout`,
 * which bubble up from it.
 *
 * ## Disabled triggers
 *
 * Browsers do not reliably dispatch pointer events to a disabled form
 * control, so a tooltip explaining *why* a button is disabled would never
 * appear. Instead of wrapping such children in an extra `<span>`,
 * `<andes-tooltip>`'s own host becomes the wrapper: while the target
 * matches `:disabled`, it gets `pointer-events: none` (so the pointer lands on
 * the wrapper), the wrapper turns `inline-block` with a `not-allowed` cursor,
 * and hover/touch/click are handled there instead.
 *
 * Interaction itself (hover delay, focus, click, context menu, touch
 * long-press) is `AndesTooltipHoverIntent`'s job; Escape dismissal and the
 * anchored positioning are the shared `AndesOverlayPrimitive`'s.
 */
@Directive({
  selector: '[andesTooltipTrigger]',
  host: {
    '[attr.data-state]': 'overlay.isOpen() ? "open" : "closed"',
    '(pointerenter)': 'intent.pointerEnter($event, "trigger")',
    '(pointerleave)': 'intent.pointerLeave($event, "trigger")',
    '(pointerdown)': 'intent.pointerDown($event, "trigger")',
    '(pointerup)': 'intent.pointerUp($event)',
    '(pointercancel)': 'intent.pointerUp($event)',
    '(click)': 'intent.click("trigger")',
    '(contextmenu)': 'intent.contextMenu($event, "trigger")',
    '(focus)': 'intent.focusIn()',
    '(blur)': 'intent.focusOut()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class AndesTooltipTrigger {
  protected readonly overlay = inject(AndesOverlayPrimitive);
  protected readonly intent = inject(AndesTooltipHoverIntent);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The element `pointer-events: none` was applied to, and its prior inline value. */
  private inertTarget: { element: HTMLElement; previous: string } | null = null;

  constructor() {
    this.overlay.registerAnchor(this.elementRef);
    this.intent.registerTrigger({ target: () => this.target() });

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

    let observer: MutationObserver | null = null;
    afterNextRender(() => {
      this.syncDisabled();
      if (typeof MutationObserver === 'undefined') {
        return;
      }
      observer = new MutationObserver(() => this.syncDisabled());
      observer.observe(this.elementRef.nativeElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['disabled'],
      });
    });

    inject(DestroyRef).onDestroy(() => {
      observer?.disconnect();
      this.restorePointerEvents();
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
   * The element that receives focus and `aria-describedby`: the host itself,
   * unless it is a non-focusable custom element wrapping a focusable one.
   */
  target(): HTMLElement {
    const host = this.elementRef.nativeElement;
    if (!host.tagName.includes('-') || host.hasAttribute('tabindex')) {
      return host;
    }
    return host.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? host;
  }

  /** Focus moved onto a descendant (the `<button>` inside `<andes-button>`). */
  protected onFocusIn(event: FocusEvent): void {
    // The host's own focus is already handled by `(focus)`.
    if (event.target !== this.elementRef.nativeElement) {
      this.intent.focusIn();
    }
  }

  /** Focus left a descendant - and, unless it moved within the trigger, the trigger. */
  protected onFocusOut(event: FocusEvent): void {
    const host = this.elementRef.nativeElement;
    if (event.target === host) {
      return;
    }
    const next = event.relatedTarget as Node | null;
    if (next && host.contains(next)) {
      return;
    }
    this.intent.focusOut();
  }

  private syncDisabled(): void {
    const target = this.target();
    const disabled = target.matches(':disabled');

    if (
      this.inertTarget &&
      (!disabled || this.inertTarget.element !== target)
    ) {
      this.restorePointerEvents();
    }
    if (disabled && !this.inertTarget) {
      this.inertTarget = {
        element: target,
        previous: target.style.pointerEvents,
      };
      target.style.pointerEvents = 'none';
    }
    this.intent.setTriggerDisabled(disabled);
  }

  private restorePointerEvents(): void {
    if (this.inertTarget) {
      this.inertTarget.element.style.pointerEvents = this.inertTarget.previous;
      this.inertTarget = null;
    }
  }
}
