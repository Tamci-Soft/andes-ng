import { LiveAnnouncer, type AriaLivePoliteness } from '@angular/cdk/a11y';
import { computed, inject, signal } from '@angular/core';

import { ANDES_TOAST_BUILTIN_DEFAULTS } from './toast.config';
import type {
  AndesToast,
  AndesToastCloseReason,
  AndesToastConfig,
  AndesToastFlavor,
  AndesToastGlobalConfig,
  AndesToastRef,
} from './toast.types';

let nextToastId = 0;

/** Per-toast auto-dismiss timer bookkeeping, kept out of the signal graph on purpose. */
interface AndesToastTimer {
  handle: ReturnType<typeof setTimeout> | null;
  /**
   * Milliseconds left to run - the full duration until the timer first starts, or
   * `Infinity` for a persistent toast. Persistent toasts still get a timer record so a
   * hover/focus pause that starts while they're persistent stays balanced if a key-based
   * update later gives them a finite duration (e.g. `loading` -> `success`).
   */
  remaining: number;
  /** `Date.now()` when `handle` was last (re)started, so `pause()` can compute elapsed time. */
  startedAt: number | null;
  /**
   * Reference count of active pause sources (pointer hover, keyboard focus-within - see
   * `AndesToastRegion`'s `mouseenter`/`focusin` and `mouseleave`/`focusout` wiring). Kept as
   * a count rather than a boolean so overlapping sources don't fight each other: e.g. a mouse
   * still hovering a toast when keyboard focus leaves it (or vice versa) must not resume the
   * countdown while the other source is still "in" - only the matching number of `resume()`
   * calls, back to zero, actually restarts the timer.
   */
  pauseCount: number;
}

interface AndesToastEntry<TConfig> {
  raw: TConfig;
  readonly ref: AndesToastRef<TConfig>;
  readonly resolveClosed: (reason: AndesToastCloseReason) => void;
}

/**
 * The narrow surface `AndesToastRegion` drives - implemented by both toast flavors' services.
 * Internal to `@andes-ng/ui`.
 */
export interface AndesToastController {
  pause(id: string): void;
  resume(id: string): void;
  closeWithReason(id: string, reason: AndesToastCloseReason): void;
  refFor(id: string): AndesToastRef<unknown> | undefined;
}

function durationToMs(duration: number | false): number {
  return duration === false || duration <= 0
    ? Number.POSITIVE_INFINITY
    : duration;
}

/**
 * Shared queue engine behind `AndesToastService` (notifications) and `AndesMessageService`
 * (messages) - one instance per flavor, so each keeps its own `maxCount`, defaults and
 * stack, just like Ant's separate `notification`/`message` managers.
 *
 * State lives in a single signal holding every toast, oldest first. The viewport renders
 * only the first `maxCount` of them - with `overflow: 'queue'` (the default) the rest wait
 * in a FIFO queue and are promoted (and get a *fresh* auto-dismiss timer, not one already
 * ticking down since they were created) as visible slots free up; with
 * `overflow: 'dismiss-oldest'` the oldest open toast is closed instead, like Ant's `maxCount`.
 *
 * Auto-dismiss timers are plain `setTimeout`s tracked in a private `Map`, not signals -
 * a running `setTimeout` handle isn't meaningful state to expose or diff, and keeping it out
 * of the signal graph avoids scheduling change detection on every tick for no reason. Only
 * the toasts themselves (add/update/remove) are signals, which is all the viewport needs to
 * re-render.
 *
 * `TConfig` is the flavor's public per-call config shape; `toToastConfig()` maps it onto
 * the internal `AndesToastConfig`, and `ref.update()` patches are merged onto the raw
 * `TConfig` before mapping, so each flavor's handle speaks its own vocabulary.
 */
export abstract class AndesToastQueue<TConfig> implements AndesToastController {
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  private readonly _toasts = signal<readonly AndesToast[]>([]);
  private readonly _defaults = signal<AndesToastGlobalConfig>(
    ANDES_TOAST_BUILTIN_DEFAULTS,
  );
  private readonly timers = new Map<string, AndesToastTimer>();
  private readonly entries = new Map<string, AndesToastEntry<TConfig>>();

  /** Every queued + visible toast, oldest first. */
  readonly toasts = this._toasts.asReadonly();
  /** The current global defaults (built-ins, then the provided config, then `config()` calls). */
  readonly defaults = this._defaults.asReadonly();
  /** The current maximum number of toasts shown at once. */
  readonly maxVisible = computed(() =>
    Math.max(1, Math.floor(this._defaults().maxCount)),
  );
  /** The subset the viewport should render - the first `maxVisible` toasts. */
  readonly visibleToasts = computed(() =>
    this._toasts().slice(0, this.maxVisible()),
  );
  /** How many toasts are waiting in the queue for a visible slot to free up. */
  readonly queuedCount = computed(() =>
    Math.max(0, this._toasts().length - this.maxVisible()),
  );

  protected constructor(
    private readonly flavor: AndesToastFlavor,
    defaults: AndesToastGlobalConfig,
  ) {
    this._defaults.set(defaults);
  }

  /** Maps the flavor's public config onto the shared internal shape. */
  protected abstract toToastConfig(config: TConfig): AndesToastConfig;

  /**
   * Updates the global defaults at runtime (Ant's `notification.config()`/`message.config()`).
   * Only affects toasts shown afterwards, except `maxCount`/`overflow`/`stack`/offsets, which
   * apply immediately.
   */
  config(patch: Partial<AndesToastGlobalConfig>): void {
    this._defaults.update((current) => ({ ...current, ...patch }));
    this.enforceOverflow();
    this.syncTimers();
  }

  /**
   * Sets how many toasts can be visible at once; anything beyond that queues (or closes the
   * oldest, per `overflow`). Shorthand for `config({ maxCount })`. A toast that falls out of
   * the visible window because this shrank has its timer reset (it starts fresh with its full
   * duration if and when it re-enters, rather than resuming mid-count) - a deliberate
   * simplification, since reconfiguring this at runtime is rare.
   */
  configureMaxVisible(max: number): void {
    this.config({ maxCount: max });
  }

  /**
   * Closes one toast by id, key or ref, queued or visible (reason `'dismissed'`). A no-op if
   * nothing matches.
   */
  dismiss(idOrKey: string | AndesToastRef<unknown>): void {
    const id = this.findId(idOrKey);
    if (id !== undefined) {
      this.closeWithReason(id, 'dismissed');
    }
  }

  /** Closes every toast, queued or visible. */
  dismissAll(): void {
    const closing = this._toasts();
    for (const id of [...this.timers.keys()]) {
      this.clearTimer(id);
    }
    this._toasts.set([]);
    for (const toast of closing) {
      this.settle(toast, 'dismissed');
    }
  }

  /** Ant's `destroy(key?)`: closes the matching toast, or every toast when called without one. */
  destroy(idOrKey?: string | AndesToastRef<unknown>): void {
    if (idOrKey === undefined) {
      this.dismissAll();
    } else {
      this.dismiss(idOrKey);
    }
  }

  /**
   * Patches an open toast in place (same slot, fresh timer, re-announced). Equivalent to
   * re-showing it with the same `key`, except the patch is merged onto its current config
   * instead of replacing it. A no-op if nothing matches.
   */
  update(
    idOrKey: string | AndesToastRef<unknown>,
    patch: Partial<TConfig>,
  ): void {
    const id = this.findId(idOrKey);
    const entry = id === undefined ? undefined : this.entries.get(id);
    if (id === undefined || !entry) {
      return;
    }
    this.replace(id, { ...entry.raw, ...patch });
  }

  /** The handle for an open toast, e.g. to hand to an `onClick` callback. */
  refFor(id: string): AndesToastRef<TConfig> | undefined {
    return this.entries.get(id)?.ref;
  }

  /**
   * Pauses a visible toast's auto-dismiss countdown, preserving whatever time is left.
   * `AndesToastRegion` calls this on `mouseenter` (pointer hover, unless the toast opted out
   * with `pauseOnHover: false`) and `focusin` (keyboard focus anywhere within the toast, e.g.
   * Tab-ing to its action button) - both are valid reasons a user needs the countdown to hold
   * still, per WCAG 2.2.1; focus always pauses. Reentrant: calling this while already paused
   * just increments the pause count, so hover and focus overlapping doesn't desync from
   * `resume()`. A no-op for a queued toast.
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
    this.stopClock(state);
  }

  /**
   * Balances one `pause()` call, continuing with whatever time remained once every pause
   * source has cleared. Only actually resumes the timer once the pause count reaches zero -
   * if hover ends while focus is still within the toast (or vice versa), the countdown
   * correctly stays paused.
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
      this.closeWithReason(id, 'timeout');
      return;
    }
    this.startTimer(id, state);
  }

  /**
   * Closes a toast with an explicit reason - what the viewport uses for the close button
   * (`'close-button'`) and actions (`'action'`). Fires `onClose` and settles `afterClosed`
   * after the toast has left the signal state.
   */
  closeWithReason(id: string, reason: AndesToastCloseReason): void {
    const toast = this._toasts().find((candidate) => candidate.id === id);
    if (!toast) {
      return;
    }
    this.clearTimer(id);
    this._toasts.update((current) =>
      current.filter((candidate) => candidate.id !== id),
    );
    this.syncTimers();
    this.settle(toast, reason);
  }

  /**
   * Shows a toast, or - when `key` matches one still open - replaces it in place. Returns
   * the (stable, for key-based updates) handle.
   */
  protected enqueue(raw: TConfig): AndesToastRef<TConfig> {
    const key = this.toToastConfig(raw).key;
    const existingId =
      key === undefined
        ? undefined
        : this._toasts().find((toast) => toast.key === key)?.id;
    const existing =
      existingId === undefined ? undefined : this.entries.get(existingId);
    if (existingId !== undefined && existing) {
      this.replace(existingId, raw);
      // `replace` keeps the entry, so the handle is the one the first call returned.
      return existing.ref;
    }

    const id = `andes-${this.flavor === 'message' ? 'message' : 'toast'}-${nextToastId++}`;
    let resolveClosed!: (reason: AndesToastCloseReason) => void;
    const afterClosed = new Promise<AndesToastCloseReason>((resolve) => {
      resolveClosed = resolve;
    });
    const ref: AndesToastRef<TConfig> = {
      id,
      key,
      afterClosed,
      close: () => this.closeWithReason(id, 'dismissed'),
      update: (patch) => this.update(id, patch),
    };
    this.entries.set(id, { raw, ref, resolveClosed });

    const toast = this.resolve(id, raw, Date.now(), 0);
    this._toasts.update((current) => [...current, toast]);
    this.announce(toast);
    this.enforceOverflow();
    this.syncTimers();
    return ref;
  }

  private replace(id: string, raw: TConfig): void {
    const entry = this.entries.get(id);
    const previous = this._toasts().find((toast) => toast.id === id);
    if (!entry || !previous) {
      return;
    }
    entry.raw = raw;
    const next = this.resolve(
      id,
      raw,
      previous.createdAt,
      previous.revision + 1,
    );
    this._toasts.update((current) =>
      current.map((toast) => (toast.id === id ? next : toast)),
    );
    this.announce(next);

    // Restart the countdown with the new duration, but keep any active pause - the user is
    // still hovering/focused, so the fresh countdown waits for the matching resume().
    const state = this.timers.get(id);
    if (state) {
      if (state.handle !== null) {
        clearTimeout(state.handle);
      }
      state.handle = null;
      state.startedAt = null;
      state.remaining = durationToMs(next.duration);
      if (state.pauseCount === 0) {
        this.startTimer(id, state);
      }
    }
    this.syncTimers();
  }

  private resolve(
    id: string,
    raw: TConfig,
    createdAt: number,
    revision: number,
  ): AndesToast {
    const config = this.toToastConfig(raw);
    const defaults = this._defaults();
    const severity = config.severity ?? 'neutral';
    return {
      id,
      key: config.key,
      flavor: this.flavor,
      title: config.title,
      message: config.message,
      severity,
      duration:
        config.duration === undefined ? defaults.duration : config.duration,
      placement: config.placement,
      action: config.action,
      actions: config.actions ?? [],
      dismissible: config.dismissible ?? defaults.dismissible,
      icon: config.icon,
      closeIcon: config.closeIcon ?? defaults.closeIcon,
      pauseOnHover: config.pauseOnHover ?? defaults.pauseOnHover,
      showProgress: config.showProgress ?? defaults.showProgress,
      role: config.role ?? (severity === 'error' ? 'alert' : 'status'),
      className: config.className,
      onClick: config.onClick,
      onClose: config.onClose,
      createdAt,
      revision,
    };
  }

  private findId(idOrKey: string | AndesToastRef<unknown>): string | undefined {
    if (typeof idOrKey !== 'string') {
      return this.entries.has(idOrKey.id) ? idOrKey.id : undefined;
    }
    return this._toasts().find(
      (toast) => toast.id === idOrKey || toast.key === idOrKey,
    )?.id;
  }

  private settle(toast: AndesToast, reason: AndesToastCloseReason): void {
    const entry = this.entries.get(toast.id);
    this.entries.delete(toast.id);
    entry?.resolveClosed(reason);
    toast.onClose?.(reason);
  }

  private enforceOverflow(): void {
    if (this._defaults().overflow !== 'dismiss-oldest') {
      return;
    }
    const max = this.maxVisible();
    while (this._toasts().length > max) {
      this.closeWithReason(this._toasts()[0].id, 'overflow');
    }
  }

  /**
   * Routes the toast's text through Angular CDK's `LiveAnnouncer` - the *only* live-region
   * mechanism a shown toast gets. `AndesToastItem` itself renders no `role`/`aria-live` (see
   * its doc comment): an aria-live region whose content and presence appear in the DOM in the
   * same update is not reliably announced by every browser/screen-reader pairing (the
   * decoupled-announcer requirement called out in this component's research doc), whereas
   * `LiveAnnouncer` mutates a persistent, already-live hidden node - the same mechanism
   * Angular Material relies on. Having both fire would double-announce every toast, so this
   * must stay the single source of truth. `role: 'alert'` (the default for errors) maps to
   * `'assertive'` (interrupting), `'status'` to `'polite'`. A key-based update re-announces
   * the new text, so `loading` -> `success` is heard.
   */
  private announce(toast: AndesToast): void {
    const politeness: AriaLivePoliteness =
      toast.role === 'alert' ? 'assertive' : 'polite';
    const text = toast.title
      ? `${toast.title}. ${toast.message}`
      : toast.message;
    void this.liveAnnouncer.announce(text, politeness);
  }

  /**
   * Reconciles `timers` with the current visible set after any change: drops timers for
   * toasts that are gone or no longer visible, and starts a fresh one for any newly-visible
   * toast that doesn't have one yet. Never touches a timer that's already tracked and still
   * visible, so a running countdown or a hover-pause isn't disturbed by unrelated
   * show()/dismiss() calls elsewhere in the queue.
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
      if (this.timers.has(toast.id)) {
        continue;
      }
      const state: AndesToastTimer = {
        handle: null,
        remaining: durationToMs(toast.duration),
        startedAt: null,
        pauseCount: 0,
      };
      this.timers.set(toast.id, state);
      this.startTimer(toast.id, state);
    }
  }

  private startTimer(id: string, state: AndesToastTimer): void {
    if (!Number.isFinite(state.remaining)) {
      return;
    }
    state.startedAt = Date.now();
    state.handle = setTimeout(
      () => this.closeWithReason(id, 'timeout'),
      state.remaining,
    );
  }

  private stopClock(state: AndesToastTimer): void {
    if (state.handle !== null && state.startedAt !== null) {
      clearTimeout(state.handle);
      const elapsed = Date.now() - state.startedAt;
      state.remaining = Math.max(0, state.remaining - elapsed);
    }
    state.handle = null;
    state.startedAt = null;
  }

  private clearTimer(id: string): void {
    const state = this.timers.get(id);
    if (state?.handle !== null && state?.handle !== undefined) {
      clearTimeout(state.handle);
    }
    this.timers.delete(id);
  }
}
