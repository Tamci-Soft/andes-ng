import { inject, Injectable } from '@angular/core';

import {
  ANDES_MESSAGE_BUILTIN_DEFAULTS,
  ANDES_MESSAGE_CONFIG,
} from './toast.config';
import { AndesToastQueue } from './toast-queue';
import type {
  AndesMessageConfig,
  AndesToastConfig,
  AndesToastGlobalConfig,
  AndesToastPromiseMessages,
  AndesToastRef,
} from './toast.types';

type AndesMessageShortcutConfig = Omit<AndesMessageConfig, 'content' | 'type'>;

/**
 * Compact, single-line status messages pinned to the top-center of the screen, exposed as
 * a static-style API for lightweight operation feedback ("Saved", "Copied to clipboard"). Rendered by the same `AndesToastViewport` as
 * notifications (mount it once), in its own top-center region.
 *
 * ```ts
 * const messages = inject(AndesMessageService);
 * messages.loading('Uploading...', { key: 'upload', duration: false });
 * messages.success('Uploaded.', { key: 'upload' }); // replaces the loading message
 * await messages.info('Heads up').afterClosed;       // resolves once it closes
 * ```
 *
 * Messages have no title, actions, or close button by default (set `dismissible: true` to
 * add one), auto-dismiss after 3s, and are unlimited in number unless `maxCount` is set via
 * `provideAndesMessageConfig()`/`config()`. Same queue engine as `AndesToastService`.
 */
@Injectable({ providedIn: 'root' })
export class AndesMessageService extends AndesToastQueue<AndesMessageConfig> {
  constructor() {
    super('message', {
      ...ANDES_MESSAGE_BUILTIN_DEFAULTS,
      ...inject(ANDES_MESSAGE_CONFIG, { optional: true }),
      placement: 'top-center',
    });
  }

  /** Shows a message (or updates the open one with the same `key`) and returns its handle. */
  open(config: AndesMessageConfig): AndesToastRef<AndesMessageConfig> {
    return this.enqueue(config);
  }

  success(
    content: string,
    config: AndesMessageShortcutConfig = {},
  ): AndesToastRef<AndesMessageConfig> {
    return this.open({ ...config, content, type: 'success' });
  }

  error(
    content: string,
    config: AndesMessageShortcutConfig = {},
  ): AndesToastRef<AndesMessageConfig> {
    return this.open({ ...config, content, type: 'error' });
  }

  warning(
    content: string,
    config: AndesMessageShortcutConfig = {},
  ): AndesToastRef<AndesMessageConfig> {
    return this.open({ ...config, content, type: 'warning' });
  }

  info(
    content: string,
    config: AndesMessageShortcutConfig = {},
  ): AndesToastRef<AndesMessageConfig> {
    return this.open({ ...config, content, type: 'info' });
  }

  loading(
    content: string,
    config: AndesMessageShortcutConfig = {},
  ): AndesToastRef<AndesMessageConfig> {
    return this.open({ ...config, content, type: 'loading' });
  }

  /** `loading` -> `success`/`error` once `promise` settles - see `AndesToastService.promise()`. */
  promise<T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: AndesToastPromiseMessages<T>,
    config: AndesMessageShortcutConfig = {},
  ): AndesToastRef<AndesMessageConfig> {
    const ref = this.loading(messages.loading, { ...config, duration: false });
    const settle = (type: 'success' | 'error', content: string) =>
      ref.update({ type, content, duration: config.duration });
    (typeof promise === 'function' ? promise() : promise).then(
      (value) =>
        settle(
          'success',
          typeof messages.success === 'function'
            ? messages.success(value)
            : messages.success,
        ),
      (error: unknown) =>
        settle(
          'error',
          typeof messages.error === 'function'
            ? messages.error(error)
            : messages.error,
        ),
    );
    return ref;
  }

  /** Messages always render top-center; a `placement` in the patch is ignored. */
  override config(patch: Partial<AndesToastGlobalConfig>): void {
    super.config({ ...patch, placement: 'top-center' });
  }

  protected toToastConfig(config: AndesMessageConfig): AndesToastConfig {
    const { content, type, ...rest } = config;
    return {
      ...rest,
      message: content,
      severity: type ?? 'info',
      placement: 'top-center',
    };
  }
}
