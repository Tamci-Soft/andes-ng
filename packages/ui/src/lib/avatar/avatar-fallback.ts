import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { AndesAvatarState } from './avatar-state';

@Component({
  selector: 'andes-avatar-fallback',
  imports: [],
  templateUrl: './avatar-fallback.html',
  styleUrl: './avatar-fallback.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': "'avatar-fallback'",
    '[hidden]': '!visible()',
  },
})
export class AndesAvatarFallback {
  // Falls back to a standalone instance if used outside `AndesAvatar` so the
  // fallback always renders rather than crashing.
  private readonly state =
    inject(AndesAvatarState, { optional: true }) ?? new AndesAvatarState();

  /**
   * Delay (ms) before the fallback appears while the image is still loading -
   * avoids a flash of initials for a fast-loading image. Does not delay the
   * `error` case: a broken image should fall back immediately.
   */
  readonly delayMs = input(0);

  private readonly loadingDelayElapsed = signal(true);
  private delayTimeoutId: ReturnType<typeof setTimeout> | undefined;

  protected readonly visible = computed(() => {
    const status = this.state.status();
    if (status === 'loaded') {
      return false;
    }
    if (status === 'error') {
      return true;
    }
    return this.loadingDelayElapsed();
  });

  constructor() {
    effect((onCleanup) => {
      const status = this.state.status();
      const delay = this.delayMs();
      clearTimeout(this.delayTimeoutId);

      if (status !== 'loading' || delay <= 0) {
        this.loadingDelayElapsed.set(status === 'loading');
        return;
      }

      this.loadingDelayElapsed.set(false);
      this.delayTimeoutId = setTimeout(
        () => this.loadingDelayElapsed.set(true),
        delay,
      );
      onCleanup(() => clearTimeout(this.delayTimeoutId));
    });
  }
}
