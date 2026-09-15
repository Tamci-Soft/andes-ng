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
  /** True while paused for a reason other than "not visible yet" (i.e. pointer hover). */
  hoverPaused: boolean;
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
   * `AndesToastViewport` calls this on `mouseenter`. A no-op for a toast with no running
   * timer (already paused, queued, or `duration: false`).
   */
  pause(id: string): void {
    const state = this.timers.get(id);
    if (!state || state.hoverPaused) {
      return;
    }
    if (state.handle !== null && state.startedAt !== null) {
      clearTimeout(state.handle);
      const elapsed = Date.now() - state.startedAt;
      state.remaining = Math.max(0, state.remaining - elapsed);
    }
    state.handle = null;
    state.startedAt = null;
    state.hoverPaused = true;
  }

  /**
   * Resumes a toast paused by `pause()`, continuing with whatever time remained.
   * `AndesToastViewport` calls this on `mouseleave`.
   */
  resume(id: string): void {
    const state = this.timers.get(id);
    if (!state || !state.hoverPaused) {
      return;
    }
    state.hoverPaused = false;
    if (state.remaining <= 0) {
      // The countdown had already reached zero while paused - dismiss right away instead
      // of scheduling a zero/negative-delay timer.
      this.dismiss(id);
      return;
    }
    this.startTimer(id, state);
  }

  /**
   * Routes the toast's text through Angular CDK's `LiveAnnouncer` in addition to the
   * `role`/`aria-live` markup `AndesToastItem` renders on the toast itself. Belt-and-braces
   * on purpose: an aria-live region whose content and presence appear in the DOM in the same
   * update is not reliably announced by every browser/screen-reader pairing (this is exactly
   * the open question shadcn's own docs punt to Base UI's reference on), whereas
   * `LiveAnnouncer` mutates a persistent, already-live hidden node - the same mechanism
   * Angular Material relies on - which is the reliable half of the two. Errors get
   * `'assertive'` (interrupting), everything else `'polite'` (announced once the screen
   * reader is idle), matching the `role="alert"` vs `role="status"` split on the visible node.
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
        hoverPaused: false,
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
