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
  AndesToastRef,
} from './toast.types';

type AndesMessageShortcutConfig = Omit<AndesMessageConfig, 'content' | 'type'>;

/**
 * Compact, single-line status messages pinned to the top-center of the screen - the Angular
 * analogue of Ant Design's `message` static API, for lightweight operation feedback
 * ("Saved", "Copied to clipboard"). Rendered by the same `AndesToastViewport` as
 * notifications (mount it once), in its own top-center region.
 *
 * ```ts
 * const messages = inject(AndesMessageService);
 * messages.loading('Uploading...', { key: 'upload', duration: false });
 * messages.success('Uploaded.', { key: 'upload' }); // replaces the loading message
 * await messages.info('Heads up').afterClosed;       // Ant's `.then(afterClose)`
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
