import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AndesOverlayPrimitive } from '@andes-ng/primitives';

import { AndesTooltipGroup } from './tooltip-group';

/**
 * What opens a tooltip - Ant Design's `trigger` values. Combine them with an
 * array (`['hover', 'focus']` is the default).
 *
 * - `hover`: mouse/pen hover, after `openDelay`; closes on leave. On touch
 *   screens, where there is no hover, a long-press stands in for it.
 * - `focus`: keyboard (or programmatic) focus, after `openDelay`; closes on blur.
 * - `click`: toggles immediately on click (or Enter/Space on a button).
 * - `contextMenu`: opens immediately on right-click, suppressing the browser's
 *   own context menu.
 */
export type AndesTooltipTriggerAction =
  'hover' | 'focus' | 'click' | 'contextMenu';

/**
 * Where a pointer event was heard. Normally on the trigger itself; when the
 * trigger is a disabled form control - which browsers do not reliably
 * dispatch pointer events to - on the `<andes-tooltip>` host wrapping it
 * instead (see `AndesTooltipTrigger`).
 */
export type AndesTooltipPointerSource = 'trigger' | 'wrapper';

/** Timing and trigger knobs `AndesTooltip` re-applies via {@link AndesTooltipHoverIntent.configure} as its inputs change. */
export interface AndesTooltipHoverIntentConfig {
  /** Delay, in ms, before the tooltip opens after hover/focus. */
  readonly openDelay: number;
  /** Delay, in ms, before the tooltip closes after mouse-leave/blur. */
  readonly closeDelay: number;
  /** Grouping window, in ms, for the cross-tooltip "instant reopen" pattern. */
  readonly instantReopenWindow: number;
  /** When `true`, the tooltip never opens and closes immediately if already open. */
  readonly disabled: boolean;
  /** Which interactions open the tooltip. */
  readonly triggers: readonly AndesTooltipTriggerAction[];
}

/** The actual open/close actions, bound once by `AndesTooltip` in its constructor. */
export interface AndesTooltipHoverIntentHandlers {
  readonly open: () => void;
  readonly close: () => void;
}

/** What `AndesTooltipTrigger` registers so `AndesTooltip` can find the element to anchor to. */
export interface AndesTooltipTriggerRef {
  /** The element that actually receives focus and `aria-describedby`. */
  readonly target: () => HTMLElement;
}

/**
 * How long, in ms, a finger has to rest on a trigger before its tooltip
 * opens - the touch stand-in for hover. Matches the platform long-press
 * threshold closely enough to feel native without fighting it.
 */
export const ANDES_TOOLTIP_LONG_PRESS_DELAY = 500;

/**
 * How long, in ms, a long-press-opened tooltip stays up after the finger
 * lifts. There is no "pointer leave" to close it on touch, and closing the
 * instant the finger lifts would hide it before it could be read.
 */
export const ANDES_TOOLTIP_TOUCH_HIDE_DELAY = 1500;

/** How long, in ms, after a touch a focus event is still considered touch-caused. */
const ANDES_TOOLTIP_TOUCH_FOCUS_WINDOW = 1000;

const DEFAULT_CONFIG: AndesTooltipHoverIntentConfig = {
  openDelay: 600,
  closeDelay: 0,
  instantReopenWindow: 400,
  disabled: false,
  triggers: ['hover', 'focus'],
};

/**
 * Interaction handling for one `<andes-tooltip>`: which events open and
 * close it (`trigger`), the hover/focus open-delay and close-delay, the
 * cross-tooltip "instant reopen" grouping window, touch long-press, and the
 * disabled-trigger fallback. `@andes-ng/primitives`'s `AndesOverlayPrimitive`
 * has no notion of any of this - waiting before opening is specific to
 * hover-triggered UI (Popover and Dropdown Menu are click-triggered and don't
 * need it), so it lives here, at the `@andes-ng/ui` level, instead of in the
 * shared primitive.
 *
 * Provided once per `<andes-tooltip>` (see its `providers` array) so that
 * `AndesTooltipTrigger`, applied to a *projected* trigger element, can inject
 * the same instance the parent configured. This is the same DI shape
 * `AndesListNavigation` / `AndesListNavigationItem` use for tabs, menus and
 * listboxes: a plain injectable holds the shared behavior, and a directive
 * applied to arbitrary consumer markup injects it rather than the parent
 * component itself.
 */
@Injectable()
export class AndesTooltipHoverIntent {
  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly group = inject(AndesTooltipGroup);

  private config: AndesTooltipHoverIntentConfig = DEFAULT_CONFIG;
  private handlers: AndesTooltipHoverIntentHandlers | null = null;
  private trigger: AndesTooltipTriggerRef | null = null;

  private readonly _triggerDisabled = signal(false);
  /**
   * Whether the trigger is currently a disabled form control. While it is,
   * pointer events are heard on the `<andes-tooltip>` wrapper rather than on
   * the trigger, and the trigger's own pointer handlers stand down.
   */
  readonly triggerDisabled = this._triggerDisabled.asReadonly();

  private openTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private closeTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private longPressTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private longPressOpened = false;
  private lastTouchAt = -Infinity;

  constructor() {
    // The overlay can also close itself (Escape, outside-click, host
    // destruction) without either request method below ever running. Whatever
    // the reason, the grouping clock still has to start and any timer left
    // over from before still has to die, so both are driven from here rather
    // than duplicated at every call site that can close the overlay.
    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      this.group.notifyClosed();
      this.clearTimers();
      this.longPressOpened = false;
    });
    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  /** Called once by `AndesTooltip` to wire the actual open/close actions. */
  bind(handlers: AndesTooltipHoverIntentHandlers): void {
    this.handlers = handlers;
  }

  /** Called by `AndesTooltip` from a reactive `effect` as its inputs change. */
  configure(config: AndesTooltipHoverIntentConfig): void {
    this.config = config;
    if (config.disabled && this.overlay.isOpen()) {
      this.clearTimers();
      this.handlers?.close();
    }
  }

  /** Called by `AndesTooltipTrigger` on creation. */
  registerTrigger(trigger: AndesTooltipTriggerRef | null): void {
    this.trigger = trigger;
  }

  /** The registered trigger's focus/describedby target, if any. */
  triggerTarget(): HTMLElement | null {
    return this.trigger?.target() ?? null;
  }

  /** Called by `AndesTooltipTrigger` whenever its target's `disabled` state changes. */
  setTriggerDisabled(disabled: boolean): void {
    this._triggerDisabled.set(disabled);
  }

  /** `pointerenter` - hover-open for mouse and pen. Touch never "hovers". */
  pointerEnter(event: PointerEvent, source: AndesTooltipPointerSource): void {
    if (
      !this.accepts(source) ||
      event.pointerType === 'touch' ||
      !this.has('hover')
    ) {
      return;
    }
    this.requestOpen();
  }

  /** `pointerleave` - the matching hover-close. */
  pointerLeave(event: PointerEvent, source: AndesTooltipPointerSource): void {
    if (
      !this.accepts(source) ||
      event.pointerType === 'touch' ||
      !this.has('hover')
    ) {
      return;
    }
    this.requestClose();
  }

  /** `pointerdown` - starts the touch long-press that stands in for hover. */
  pointerDown(event: PointerEvent, source: AndesTooltipPointerSource): void {
    if (event.pointerType === 'touch') {
      this.lastTouchAt = Date.now();
    }
    if (
      !this.accepts(source) ||
      event.pointerType !== 'touch' ||
      !this.has('hover') ||
      this.config.disabled
    ) {
      return;
    }
    this.clearLongPressTimer();
    this.clearCloseTimer();
    this.longPressOpened = false;
    this.longPressTimeoutId = setTimeout(() => {
      this.longPressTimeoutId = undefined;
      this.longPressOpened = true;
      this.openNow();
    }, ANDES_TOOLTIP_LONG_PRESS_DELAY);
  }

  /**
   * `pointerup` / `pointercancel` - a lift before the long-press threshold (a
   * tap, or the browser taking over for a scroll) cancels it; a lift after it
   * leaves the tooltip up for {@link ANDES_TOOLTIP_TOUCH_HIDE_DELAY} ms.
   */
  pointerUp(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      return;
    }
    this.lastTouchAt = Date.now();
    this.clearLongPressTimer();
    if (!this.longPressOpened) {
      return;
    }
    this.longPressOpened = false;
    this.clearCloseTimer();
    this.closeTimeoutId = setTimeout(
      () => this.handlers?.close(),
      ANDES_TOOLTIP_TOUCH_HIDE_DELAY,
    );
  }

  /**
   * Focus entered the trigger. Focus that a touch just caused (tapping a
   * button focuses it on most mobile browsers) is ignored: on touch the
   * long-press is the way to ask for the hint, and a tap-focused tooltip
   * would otherwise stay up until something else took focus.
   */
  focusIn(): void {
    if (Date.now() - this.lastTouchAt < ANDES_TOOLTIP_TOUCH_FOCUS_WINDOW) {
      return;
    }
    if (this.has('focus')) {
      this.requestOpen();
    }
  }

  /** Focus left the trigger. */
  focusOut(): void {
    if (this.has('focus')) {
      this.requestClose();
    }
  }

  /** `click` - toggles, with no delay, when `click` is a trigger. */
  click(source: AndesTooltipPointerSource): void {
    if (!this.accepts(source) || !this.has('click') || this.config.disabled) {
      return;
    }
    if (this.overlay.isOpen()) {
      this.clearTimers();
      this.handlers?.close();
    } else {
      this.openNow();
    }
  }

  /** `contextmenu` - opens, with no delay, when `contextMenu` is a trigger. */
  contextMenu(event: MouseEvent, source: AndesTooltipPointerSource): void {
    if (
      !this.accepts(source) ||
      !this.has('contextMenu') ||
      this.config.disabled
    ) {
      return;
    }
    event.preventDefault();
    this.openNow();
  }

  /**
   * Requests the tooltip open: after `openDelay`, or instantly if the group's
   * grouping window is still active. Called on mouse-hover (not touch) and on
   * focus.
   */
  requestOpen(): void {
    if (this.config.disabled || this.overlay.isOpen()) {
      // Already open (or never allowed to be): a pending close - e.g. from a
      // blur immediately followed by a re-focus - is no longer wanted.
      this.clearCloseTimer();
      return;
    }
    this.clearTimers();

    if (this.group.wasRecentlyClosed(this.config.instantReopenWindow)) {
      this.handlers?.open();
      return;
    }

    const delay = this.config.openDelay;
    if (delay <= 0) {
      this.handlers?.open();
      return;
    }
    this.openTimeoutId = setTimeout(() => this.handlers?.open(), delay);
  }

  /**
   * Requests the tooltip close: after `closeDelay`, immediately by default.
   * Called on mouse-leave (not touch) and on blur.
   */
  requestClose(): void {
    // A close always cancels a still-pending open, whether or not the
    // tooltip ever actually opened.
    this.clearOpenTimer();
    if (!this.overlay.isOpen()) {
      return;
    }

    const delay = this.config.closeDelay;
    if (delay <= 0) {
      this.handlers?.close();
      return;
    }
    this.closeTimeoutId = setTimeout(() => this.handlers?.close(), delay);
  }

  /** Opens right away - click, context menu and long-press have no delay. */
  private openNow(): void {
    this.clearOpenTimer();
    this.clearCloseTimer();
    if (this.config.disabled || this.overlay.isOpen()) {
      return;
    }
    this.handlers?.open();
  }

  private has(action: AndesTooltipTriggerAction): boolean {
    return this.config.triggers.includes(action);
  }

  /**
   * Pointer events are handled from exactly one place at a time: the trigger
   * normally, the wrapper while the trigger is disabled. Both listen, because
   * `pointerenter`/`click` reach the wrapper too, and handling them twice
   * would, for instance, toggle a click tooltip open and straight back shut.
   */
  private accepts(source: AndesTooltipPointerSource): boolean {
    return source === 'wrapper'
      ? this._triggerDisabled()
      : !this._triggerDisabled();
  }

  private clearOpenTimer(): void {
    clearTimeout(this.openTimeoutId);
    this.openTimeoutId = undefined;
  }

  private clearCloseTimer(): void {
    clearTimeout(this.closeTimeoutId);
    this.closeTimeoutId = undefined;
  }

  private clearLongPressTimer(): void {
    clearTimeout(this.longPressTimeoutId);
    this.longPressTimeoutId = undefined;
  }

  private clearTimers(): void {
    this.clearOpenTimer();
    this.clearCloseTimer();
    this.clearLongPressTimer();
  }
}
