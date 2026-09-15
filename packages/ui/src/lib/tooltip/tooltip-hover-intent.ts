import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AndesOverlayPrimitive } from '@andes-ng/primitives';

import { AndesTooltipGroup } from './tooltip-group';

/** Timing knobs `AndesTooltip` re-applies via {@link AndesTooltipHoverIntent.configure} as its inputs change. */
export interface AndesTooltipHoverIntentConfig {
  /** Delay, in ms, before the tooltip opens after hover/focus. */
  readonly openDelay: number;
  /** Delay, in ms, before the tooltip closes after mouse-leave/blur. */
  readonly closeDelay: number;
  /** Grouping window, in ms, for the cross-tooltip "instant reopen" pattern. */
  readonly instantReopenWindow: number;
  /** When `true`, the tooltip never opens and closes immediately if already open. */
  readonly disabled: boolean;
}

/** The actual open/close actions, bound once by `AndesTooltip` in its constructor. */
export interface AndesTooltipHoverIntentHandlers {
  readonly open: () => void;
  readonly close: () => void;
}

const DEFAULT_CONFIG: AndesTooltipHoverIntentConfig = {
  openDelay: 600,
  closeDelay: 0,
  instantReopenWindow: 400,
  disabled: false,
};

/**
 * Hover/focus-intent timing for one `<andes-tooltip>`: open-delay,
 * close-delay, and the cross-tooltip "instant reopen" grouping window.
 * `@andes-ng/primitives`'s `AndesOverlayPrimitive` has no notion of any of
 * this - waiting before opening is specific to hover-triggered UI (Popover
 * and Dropdown Menu are click-triggered and don't need it), so it lives here,
 * at the `@andes-ng/ui` level, instead of in the shared primitive.
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

  private openTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private closeTimeoutId: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // The overlay can also close itself (Escape, outside-click, host
    // destruction) without either request method below ever running. Whatever
    // the reason, the grouping clock still has to start and any timer left
    // over from before still has to die, so both are driven from here rather
    // than duplicated at every call site that can close the overlay.
    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      this.group.notifyClosed();
      this.clearTimers();
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

  /**
   * Requests the tooltip open: after `openDelay`, or instantly if the group's
   * grouping window is still active. Called by `AndesTooltipTrigger` on
   * mouse-hover (not touch) and on focus.
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
   * Called by `AndesTooltipTrigger` on mouse-leave (not touch) and on blur.
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

  private clearOpenTimer(): void {
    clearTimeout(this.openTimeoutId);
    this.openTimeoutId = undefined;
  }

  private clearCloseTimer(): void {
    clearTimeout(this.closeTimeoutId);
    this.closeTimeoutId = undefined;
  }

  private clearTimers(): void {
    this.clearOpenTimer();
    this.clearCloseTimer();
  }
}
