import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AndesOverlayPrimitive } from '@andes-ng/primitives';

import {
  andesHoverCardNextTabbable,
  andesHoverCardTabbables,
} from './hover-card-focus';

/** Default delay, in ms, between the pointer or focus arriving and the card opening. */
export const ANDES_HOVER_CARD_DEFAULT_OPEN_DELAY = 600;

/**
 * Default delay, in ms, between the pointer or focus leaving and the card closing. It is also
 * the time the pointer has to cross the gap between the trigger and the card.
 */
export const ANDES_HOVER_CARD_DEFAULT_CLOSE_DELAY = 300;

/** How long, in ms, after a touch a focus event or a click is still considered touch-caused. */
const TOUCH_WINDOW = 1000;

/** Timing knobs `AndesHoverCard` re-applies as its inputs change. */
export interface AndesHoverCardIntentConfig {
  readonly openDelay: number;
  readonly closeDelay: number;
  readonly disabled: boolean;
}

/** The actions the intent drives, bound once by `AndesHoverCard`. */
export interface AndesHoverCardIntentHandlers {
  readonly open: () => void;
  readonly close: () => void;
  /** Whether a node is inside the rendered card. */
  readonly cardContains: (node: Node | null) => boolean;
  /** Moves keyboard focus into the open card; `false` when it has nothing to focus. */
  readonly enterCard: () => boolean;
}

/** What the trigger directive registers. */
export interface AndesHoverCardTriggerRef {
  /** The element that receives focus and `aria-describedby`. */
  readonly target: () => HTMLElement;
  /** The trigger host. */
  readonly host: () => HTMLElement;
}

/**
 * Whether the focus on an element came from the keyboard (or is otherwise the kind of focus
 * that shows a ring). A mouse press on a button or link focuses it too, but that is not an
 * intent to read its card: the pointer already asked for it, and the card must be able to go
 * away when the pointer does.
 */
export function andesHoverCardIsFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/**
 * Interaction handling for one hover card: when it opens and closes, and for how long the
 * different things that can keep it open (the pointer over the trigger or the card, keyboard
 * focus on either, a touch tap, a held pointer button) are honoured.
 *
 * The rule is a single predicate: the card is wanted while ANY of those holds is active.
 * Leaving one of them schedules a close after `closeDelay`, re-checked when it fires, so
 * moving across the gap from the trigger to the card (or from a link to a button inside it)
 * never closes it.
 *
 * Provided once per `<andes-hover-card>` so the trigger directive, applied to a projected
 * element, injects the same instance the card configured.
 */
@Injectable()
export class AndesHoverCardIntent {
  private readonly overlay = inject(AndesOverlayPrimitive);

  private config: AndesHoverCardIntentConfig = {
    openDelay: ANDES_HOVER_CARD_DEFAULT_OPEN_DELAY,
    closeDelay: ANDES_HOVER_CARD_DEFAULT_CLOSE_DELAY,
    disabled: false,
  };
  private handlers: AndesHoverCardIntentHandlers | null = null;
  private trigger: AndesHoverCardTriggerRef | null = null;

  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  private triggerHover = false;
  private triggerFocus = false;
  private cardHover = false;
  private cardFocus = false;
  /** A pointer button went down on the card (selecting text, say) and is still down. */
  private pressHeld = false;
  /** The card was opened by a touch tap, which only a tap elsewhere or Escape undoes. */
  private touchOpened = false;
  /** Escape closed the card; hover or focus that is still going on must not reopen it. */
  private dismissed = false;
  private lastTouchAt = -Infinity;
  private releaseListener: (() => void) | null = null;

  constructor() {
    this.overlay.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key === 'Escape') {
        this.dismissed = true;
        this.clearTimers();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.clearTimers();
      this.removeReleaseListener();
    });
  }

  /** Called once by `AndesHoverCard` to wire the open/close actions. */
  bind(handlers: AndesHoverCardIntentHandlers): void {
    this.handlers = handlers;
  }

  /** Called by `AndesHoverCard` as its inputs change. */
  configure(config: AndesHoverCardIntentConfig): void {
    this.config = config;
    if (config.disabled) {
      this.clearTimers();
      if (this.overlay.isOpen()) {
        this.handlers?.close();
      }
    }
  }

  /** Called by the trigger directive. */
  registerTrigger(trigger: AndesHoverCardTriggerRef | null): void {
    this.trigger = trigger;
  }

  triggerTarget(): HTMLElement | null {
    return this.trigger?.target() ?? null;
  }

  triggerHost(): HTMLElement | null {
    return this.trigger?.host() ?? null;
  }

  /** Whether the card is currently held open by anything but a pending timer. */
  private holding(): boolean {
    return (
      this.triggerHover ||
      this.triggerFocus ||
      this.cardHover ||
      this.cardFocus ||
      this.pressHeld ||
      this.touchOpened
    );
  }

  // Trigger events ------------------------------------------------------------------------

  triggerPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.triggerHover = true;
    this.requestOpen();
  }

  triggerPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.triggerHover = false;
    this.dismissed = false;
    this.requestClose();
  }

  triggerPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.lastTouchAt = Date.now();
    }
  }

  /**
   * A click that follows a touch toggles the card instead of acting on the trigger: the first
   * tap shows it (and, returning `true`, asks the caller to cancel the click's default action
   * so a link is not followed), the next one hides it. Mouse and keyboard clicks are left
   * alone.
   */
  triggerClick(): boolean {
    if (this.config.disabled || Date.now() - this.lastTouchAt > TOUCH_WINDOW) {
      return false;
    }
    if (this.overlay.isOpen()) {
      this.clearTimers();
      this.touchOpened = false;
      this.handlers?.close();
      return false;
    }
    this.clearTimers();
    this.touchOpened = true;
    this.handlers?.open();
    return true;
  }

  triggerFocusIn(focusVisible: boolean): void {
    // Focus that a touch just caused is not a request to read the card.
    if (Date.now() - this.lastTouchAt < TOUCH_WINDOW || !focusVisible) {
      return;
    }
    this.triggerFocus = true;
    this.requestOpen();
  }

  triggerFocusOut(relatedTarget: Node | null): void {
    this.triggerFocus = false;
    this.dismissed = false;
    // Focus handed to the card: it holds the card open from here.
    if (relatedTarget && this.handlers?.cardContains(relatedTarget)) {
      return;
    }
    this.requestClose();
  }

  // Card events ---------------------------------------------------------------------------

  cardPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.cardHover = true;
    this.clearCloseTimer();
  }

  cardPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.cardHover = false;
    this.requestClose();
  }

  /**
   * A primary button went down on the card. Selecting its text means dragging, and the pointer
   * routinely strays out of the card while doing so - that must not close it, so the card is
   * held until the button is released.
   */
  cardPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch' || event.button !== 0) {
      return;
    }
    this.pressHeld = true;
    this.removeReleaseListener();
    const view = this.triggerHost()?.ownerDocument.defaultView;
    if (!view) {
      return;
    }
    const release = () => {
      this.removeReleaseListener();
      this.pressHeld = false;
      this.requestClose();
    };
    view.addEventListener('pointerup', release);
    view.addEventListener('pointercancel', release);
    this.releaseListener = () => {
      view.removeEventListener('pointerup', release);
      view.removeEventListener('pointercancel', release);
    };
  }

  cardFocusIn(focusVisible: boolean): void {
    this.clearCloseTimer();
    if (focusVisible) {
      this.cardFocus = true;
    }
  }

  cardFocusOut(relatedTarget: Node | null): void {
    this.cardFocus = false;
    const host = this.triggerHost();
    const target = this.triggerTarget();
    if (
      relatedTarget &&
      ((host && host.contains(relatedTarget)) ||
        (target && target.contains(relatedTarget)) ||
        this.handlers?.cardContains(relatedTarget))
    ) {
      return;
    }
    this.requestClose();
  }

  /**
   * Keys inside the card. `Escape` is closed by the overlay itself, but focus inside the card
   * would be lost with it, so it goes back to the trigger first. `Tab` past either end of the
   * card does not wander off to wherever the portalled card sits in the document: forwards it
   * goes where it would have gone from the trigger, backwards to the trigger, and the card is
   * closed behind it or kept open respectively.
   */
  cardKeydown(event: KeyboardEvent): void {
    const document = this.triggerHost()?.ownerDocument;
    const active = document?.activeElement;
    const activeElement = active instanceof HTMLElement ? active : null;
    const panel = this.overlay.panelElement();

    if (event.key === 'Escape') {
      if (activeElement && panel?.contains(activeElement)) {
        this.returnFocusToTrigger(true);
      }
      return;
    }
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const content = this.overlay.contentElement();
    if (!content) {
      return;
    }
    const tabbables = andesHoverCardTabbables(content);
    const first = tabbables[0];
    const last = tabbables.at(-1);

    if (event.shiftKey) {
      if (!first || activeElement === first || activeElement === content) {
        event.preventDefault();
        this.returnFocusToTrigger(false);
      }
      return;
    }

    if (!last || activeElement === last) {
      event.preventDefault();
      const host = this.triggerHost();
      const next = host ? andesHoverCardNextTabbable(host, panel) : null;
      this.closeNow();
      if (next) {
        next.focus();
      } else {
        activeElement?.blur();
      }
    }
  }

  // Requests ------------------------------------------------------------------------------

  /** Opens after `openDelay`, or at once when the delay is zero. */
  requestOpen(): void {
    if (this.config.disabled) {
      return;
    }
    if (this.overlay.isOpen()) {
      this.clearCloseTimer();
      return;
    }
    if (this.dismissed || this.openTimer !== undefined) {
      return;
    }
    const delay = this.config.openDelay;
    if (delay <= 0) {
      this.handlers?.open();
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      if (this.holding() && !this.config.disabled && !this.dismissed) {
        this.handlers?.open();
      }
    }, delay);
  }

  /**
   * Closes after `closeDelay` unless something still holds the card. The check is repeated
   * when the timer fires, so a pointer that reached the card in the meantime wins.
   */
  requestClose(): void {
    if (this.holding()) {
      return;
    }
    this.clearOpenTimer();
    if (!this.overlay.isOpen()) {
      return;
    }
    this.clearCloseTimer();
    const delay = this.config.closeDelay;
    if (delay <= 0) {
      this.handlers?.close();
      return;
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      if (!this.holding()) {
        this.handlers?.close();
      }
    }, delay);
  }

  /** Opens at once, as an explicit keyboard request (`Alt+ArrowDown`) or `show()` does. */
  openNow(): void {
    this.clearTimers();
    this.dismissed = false;
    if (!this.config.disabled && !this.overlay.isOpen()) {
      this.handlers?.open();
    }
  }

  /** Closes at once and forgets every hold. */
  closeNow(): void {
    this.clearTimers();
    if (this.overlay.isOpen()) {
      this.handlers?.close();
    }
  }

  /**
   * Explicit keyboard activation (`Alt+ArrowDown` on the trigger): shows the card at once and
   * hands focus to its first interactive element, if it has one.
   */
  requestHandoff(): void {
    this.openNow();
    this.handlers?.enterCard();
  }

  /**
   * Moves focus from inside the card back to the trigger, keeping the card open for as long as
   * the trigger is focused. With `dismiss` the card is also being closed (Escape), so the focus
   * that lands on the trigger must not reopen it.
   */
  returnFocusToTrigger(dismiss: boolean): void {
    const target = this.triggerTarget();
    if (!target) {
      return;
    }
    this.dismissed = dismiss;
    this.cardFocus = false;
    target.focus();
    this.triggerFocus = true;
  }

  /**
   * The card closed (or was asked to): its pointer and focus holds go with its element, which
   * will never report a `pointerleave` or `focusout`.
   */
  cardClosed(): void {
    this.cardHover = false;
    this.cardFocus = false;
    this.pressHeld = false;
    this.touchOpened = false;
    this.removeReleaseListener();
    this.clearTimers();
  }

  private clearOpenTimer(): void {
    clearTimeout(this.openTimer);
    this.openTimer = undefined;
  }

  private clearCloseTimer(): void {
    clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
  }

  private clearTimers(): void {
    this.clearOpenTimer();
    this.clearCloseTimer();
  }

  private removeReleaseListener(): void {
    this.releaseListener?.();
    this.releaseListener = null;
  }
}
