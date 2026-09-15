import { LiveAnnouncer, type AriaLivePoliteness } from '@angular/cdk/a11y';
import { computed, inject, Injectable, signal } from '@angular/core';

import {
  ANDES_TOAST_DEFAULT_DURATION,
  ANDES_TOAST_DEFAULT_MAX_VISIBLE,
  type AndesToast,
  type AndesToastConfig,
} from './toast.types';

let nextToastId = 0;

/** Per-toast auto-dismiss timer bookkeeping, kept out of the signal graph on purpose. */
interface AndesToastTimer {
  handle: ReturnType<typeof setTimeout> | null;
  /** Milliseconds left to run - the full duration until the timer first starts. */
  remaining: number;
  /** `Date.now()` when `handle` was last (re)started, so `pause()` can compute elapsed time. */
  startedAt: number | null;
  /**
   * Reference count of active pause sources (pointer hover, keyboard focus-within - see
   * `AndesToastViewport`'s `mouseenter`/`focusin` and `mouseleave`/`focusout` wiring). Kept as
   * a count rather than a boolean so overlapping sources don't fight each other: e.g. a mouse
   * still hovering a toast when keyboard focus leaves it (or vice versa) must not resume the
   * countdown while the other source is still "in" - only the matching number of `resume()`
   * calls, back to zero, actually restarts the timer.
   */
  pauseCount: number;
}

/**
 * Imperative toast/notification queue. Injectable anywhere (`providedIn: 'root'`) to enqueue
 * toasts; `AndesToastViewport` reads `visibleToasts` to render the current stack.
 *
 * State lives in a single signal holding every toast, oldest first. `AndesToastViewport`
 * renders only the first `maxVisible` of them - the rest wait in a FIFO queue and are
 * promoted (and get a *fresh* auto-dismiss timer, not one already ticking down since they
 * were created) as visible slots free up. This mirrors Ant Design's Notification
 * `maxCount`, except overflow queues instead of dropping the oldest, per this component's
 * andes-ng brief.
 *
 * Auto-dismiss timers are plain `setTimeout`s tracked in a private `Map`, not signals -
 * a running `setTimeout` handle isn't meaningful state to expose or diff, and keeping it out
 * of the signal graph avoids scheduling change detection on every tick for no reason. Only
 * the toasts themselves (add/remove) are signals, which is all `AndesToastViewport` needs to
 * re-render.
 */
@Injectable({ providedIn: 'root' })
export class AndesToastService {
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  private readonly _toasts = signal<readonly AndesToast[]>([]);
  private readonly _maxVisible = signal(ANDES_TOAST_DEFAULT_MAX_VISIBLE);
  private readonly timers = new Map<string, AndesToastTimer>();

  /** Every queued + visible toast, oldest first. */
  readonly toasts = this._toasts.asReadonly();
  /** The subset `AndesToastViewport` should render - the first `maxVisible` toasts. */
  readonly visibleToasts = computed(() =>
    this._toasts().slice(0, this._maxVisible()),
  );
  /** How many toasts are waiting in the queue for a visible slot to free up. */
  readonly queuedCount = computed(() =>
    Math.max(0, this._toasts().length - this._maxVisible()),
  );
  /** The current maximum-visible-count. */
  readonly maxVisible = this._maxVisible.asReadonly();

  /**
   * Sets how many toasts can be visible at once; anything beyond that queues. Default 5.
   * A toast that falls out of the visible window because this shrank has its timer reset
   * (it starts fresh with its full duration if and when it re-enters, rather than resuming
   * mid-count) - a deliberate simplification, since reconfiguring this at runtime is rare.
   */
  configureMaxVisible(max: number): void {
    this._maxVisible.set(Math.max(1, Math.floor(max)));
    this.syncTimers();
  }

  /** Enqueues a toast and returns its id (for later `dismiss()`). */
  show(config: AndesToastConfig): string {
    const id = `andes-toast-${nextToastId++}`;
    const toast: AndesToast = {
      id,
      title: config.title,
      message: config.message,
      severity: config.severity ?? 'neutral',
      duration:
        config.duration === undefined
          ? ANDES_TOAST_DEFAULT_DURATION
          : config.duration,
      action: config.action,
      dismissible: config.dismissible ?? true,
      createdAt: Date.now(),
    };

    this._toasts.update((current) => [...current, toast]);
    this.announce(toast);
    this.syncTimers();
    return id;
  }

  /** Shortcut for `show({ ...config, message, severity: 'success' })`. */
  success(
    message: string,
    config: Omit<AndesToastConfig, 'message' | 'severity'> = {},
  ): string {
    return this.show({ ...config, message, severity: 'success' });
  }

  /** Shortcut for `show({ ...config, message, severity: 'error' })`. */
  error(
    message: string,
    config: Omit<AndesToastConfig, 'message' | 'severity'> = {},
  ): string {
    return this.show({ ...config, message, severity: 'error' });
  }

  /** Shortcut for `show({ ...config, message, severity: 'warning' })`. */
  warning(
    message: string,
    config: Omit<AndesToastConfig, 'message' | 'severity'> = {},
  ): string {
    return this.show({ ...config, message, severity: 'warning' });
  }

  /** Shortcut for `show({ ...config, message, severity: 'info' })`. */
  info(
    message: string,
    config: Omit<AndesToastConfig, 'message' | 'severity'> = {},
  ): string {
    return this.show({ ...config, message, severity: 'info' });
  }

  /** Dismisses one toast by id, queued or visible. A no-op if the id is unknown. */
  dismiss(id: string): void {
    if (!this._toasts().some((toast) => toast.id === id)) {
      return;
    }
    this.clearTimer(id);
    this._toasts.update((current) =>
      current.filter((toast) => toast.id !== id),
    );
    this.syncTimers();
  }

  /** Dismisses every toast, queued or visible. */
  dismissAll(): void {
    for (const id of [...this.timers.keys()]) {
      this.clearTimer(id);
    }
    this._toasts.set([]);
  }

  /**
   * Pauses a visible toast's auto-dismiss countdown, preserving whatever time is left.
   * `AndesToastViewport` calls this on `mouseenter` (pointer hover) and `focusin` (keyboard
   * focus anywhere within the toast, e.g. Tab-ing to its action button) - both are equally
   * valid reasons a user needs the countdown to hold still, per WCAG 2.2.1. Reentrant: calling
   * this while already paused just increments the pause count instead of stopping an
   * already-stopped timer, so hover and focus overlapping doesn't desync from `resume()`.
   * A no-op for a toast with no running timer and no existing pause (queued or
   * `duration: false`).
   */
  pause(id: string): void {
    const state = this.timers.get(id);
    if (!state) {
      return;
    }
    state.pauseCount++;
    if (state.pauseCount > 1) {
      // Already paused by another source (hover and focus overlapping) - nothing to stop.
      return;
    }
    if (state.handle !== null && state.startedAt !== null) {
      clearTimeout(state.handle);
      const elapsed = Date.now() - state.startedAt;
      state.remaining = Math.max(0, state.remaining - elapsed);
    }
    state.handle = null;
    state.startedAt = null;
  }

  /**
   * Balances one `pause()` call, continuing with whatever time remained once every pause
   * source has cleared. `AndesToastViewport` calls this on `mouseleave` and `focusout`. Only
   * actually resumes the timer once the pause count reaches zero - if hover ends while focus
   * is still within the toast (or vice versa), the countdown correctly stays paused.
   */
  resume(id: string): void {
    const state = this.timers.get(id);
    if (!state || state.pauseCount === 0) {
      return;
    }
    state.pauseCount--;
    if (state.pauseCount > 0) {
      // Still paused by another source - stay stopped.
      return;
    }
    if (state.remaining <= 0) {
      // The countdown had already reached zero while paused - dismiss right away instead
      // of scheduling a zero/negative-delay timer.
      this.dismiss(id);
      return;
    }
    this.startTimer(id, state);
  }

  /**
   * Routes the toast's text through Angular CDK's `LiveAnnouncer` - the *only* live-region
   * mechanism a shown toast gets. `AndesToastItem` itself renders no `role`/`aria-live` (see
   * its doc comment): an aria-live region whose content and presence appear in the DOM in the
   * same update is not reliably announced by every browser/screen-reader pairing (this is
   * exactly the open question shadcn's own docs punt to Base UI's reference on, and the
   * decoupled-announcer requirement called out in this component's research doc), whereas
   * `LiveAnnouncer` mutates a persistent, already-live hidden node - the same mechanism
   * Angular Material relies on - which is the reliable half of the two. Having both fire would
   * double-announce every toast, so this must stay the single source of truth. Errors get
   * `'assertive'` (interrupting), everything else `'polite'` (announced once the screen reader
   * is idle), matching the severity's visual urgency.
   */
  private announce(toast: AndesToast): void {
    const politeness: AriaLivePoliteness =
      toast.severity === 'error' ? 'assertive' : 'polite';
    const text = toast.title
      ? `${toast.title}. ${toast.message}`
      : toast.message;
    void this.liveAnnouncer.announce(text, politeness);
  }

  /**
   * Reconciles `timers` with the current visible set after any change to `_toasts` or
   * `_maxVisible`: drops timers for toasts that are gone or no longer visible, and starts a
   * fresh one for any newly-visible toast that doesn't have one yet. Never touches a timer
   * that's already tracked and still visible, so a running countdown or a hover-pause isn't
   * disturbed by unrelated show()/dismiss() calls elsewhere in the queue.
   */
  private syncTimers(): void {
    const visible = this.visibleToasts();
    const visibleIds = new Set(visible.map((toast) => toast.id));

    for (const id of [...this.timers.keys()]) {
      if (!visibleIds.has(id)) {
        this.clearTimer(id);
      }
    }

    for (const toast of visible) {
      if (
        toast.duration === false ||
        toast.duration <= 0 ||
        this.timers.has(toast.id)
      ) {
        continue;
      }
      const state: AndesToastTimer = {
        handle: null,
        remaining: toast.duration,
        startedAt: null,
        pauseCount: 0,
      };
      this.timers.set(toast.id, state);
      this.startTimer(toast.id, state);
    }
  }

  private startTimer(id: string, state: AndesToastTimer): void {
    state.startedAt = Date.now();
    state.handle = setTimeout(() => this.dismiss(id), state.remaining);
  }

  private clearTimer(id: string): void {
    const state = this.timers.get(id);
    if (state?.handle !== null && state?.handle !== undefined) {
      clearTimeout(state.handle);
    }
    this.timers.delete(id);
  }
}
