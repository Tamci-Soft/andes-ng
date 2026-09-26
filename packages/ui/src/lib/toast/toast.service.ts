import { inject, Injectable } from '@angular/core';

import {
  ANDES_TOAST_BUILTIN_DEFAULTS,
  ANDES_TOAST_CONFIG,
} from './toast.config';
import { AndesToastQueue } from './toast-queue';
import type { AndesToastConfig, AndesToastRef } from './toast.types';

type AndesToastShortcutConfig = Omit<AndesToastConfig, 'message' | 'severity'>;

/**
 * Imperative notification queue with a static-style API (title + message, corner
 * placements, actions, progress bar). Injectable anywhere (`providedIn: 'root'`) to show
 * toasts; `AndesToastViewport` renders them. For the compact single-line `message` flavor,
 * use `AndesMessageService`.
 *
 * Every show-style call returns an `AndesToastRef` (id, `close()`, `update()`,
 * `afterClosed` promise). Pass a `key` to update an open toast in place instead of stacking
 * a new one - e.g. a `loading` toast flipping to `success`:
 *
 * ```ts
 * this.toasts.loading('Saving...', { key: 'save', duration: false });
 * await save();
 * this.toasts.success('Saved.', { key: 'save' });
 * ```
 *
 * Defaults come from `provideAndesToastConfig()` and can be changed at runtime with
 * `config()`. The queue engine (timers, pause/resume, `maxCount` overflow, key updates,
 * announcements) lives in `AndesToastQueue`, shared with `AndesMessageService`.
 */
@Injectable({ providedIn: 'root' })
export class AndesToastService extends AndesToastQueue<AndesToastConfig> {
  constructor() {
    super('notification', {
      ...ANDES_TOAST_BUILTIN_DEFAULTS,
      ...inject(ANDES_TOAST_CONFIG, { optional: true }),
    });
  }

  /** Shows a toast (or updates the open one with the same `key`) and returns its handle. */
  show(config: AndesToastConfig): AndesToastRef {
    return this.enqueue(config);
  }

  /** An alias of `show()`, for callers that prefer `open()` naming. */
  open(config: AndesToastConfig): AndesToastRef {
    return this.enqueue(config);
  }

  /** Shortcut for `show({ ...config, message, severity: 'success' })`. */
  success(
    message: string,
    config: AndesToastShortcutConfig = {},
  ): AndesToastRef {
    return this.show({ ...config, message, severity: 'success' });
  }

  /** Shortcut for `show({ ...config, message, severity: 'error' })`. */
  error(message: string, config: AndesToastShortcutConfig = {}): AndesToastRef {
    return this.show({ ...config, message, severity: 'error' });
  }

  /** Shortcut for `show({ ...config, message, severity: 'warning' })`. */
  warning(
    message: string,
    config: AndesToastShortcutConfig = {},
  ): AndesToastRef {
    return this.show({ ...config, message, severity: 'warning' });
  }

  /** Shortcut for `show({ ...config, message, severity: 'info' })`. */
  info(message: string, config: AndesToastShortcutConfig = {}): AndesToastRef {
    return this.show({ ...config, message, severity: 'info' });
  }

  /**
   * Shortcut for `show({ ...config, message, severity: 'loading' })`. Usually paired with
   * `duration: false` and a later update via the same `key` or the returned ref.
   */
  loading(
    message: string,
    config: AndesToastShortcutConfig = {},
  ): AndesToastRef {
    return this.show({ ...config, message, severity: 'loading' });
  }

  protected toToastConfig(config: AndesToastConfig): AndesToastConfig {
    return config;
  }
}
