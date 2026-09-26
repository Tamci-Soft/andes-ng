import { computed, Injectable, signal } from '@angular/core';

/**
 * Internal image-load state machine shared between `AndesAvatarImage` and
 * `AndesAvatarFallback` within one `AndesAvatar`. Not part of the public API -
 * consumers never inject or import this directly.
 *
 * `loading` is the initial state. It transitions to `loaded` or `error` only in
 * response to the native `<img>` `(load)`/`(error)` events - never inferred from
 * `src` being set, since a broken URL must still resolve to `error` once the
 * browser actually fails to fetch it.
 */
export type AndesAvatarImageStatus = 'loading' | 'loaded' | 'error';

@Injectable()
export class AndesAvatarState {
  private readonly _status = signal<AndesAvatarImageStatus>('loading');
  readonly status = this._status.asReadonly();

  /**
   * Set when an `AndesAvatarImage` `(loadError)` handler called
   * `preventFallback()`. The status still
   * reads `error` (it's the truth, and `data-status` exposes it), but the
   * `<img>` stays rendered - showing the browser's broken-image/`alt`
   * rendering - and the fallback stays hidden.
   */
  private readonly _keepImageOnError = signal(false);

  /** Whether the `<img>` should be displayed rather than the fallback. */
  readonly showsImage = computed(
    () =>
      this._status() === 'loaded' ||
      (this._status() === 'error' && this._keepImageOnError()),
  );

  setLoading(): void {
    this._keepImageOnError.set(false);
    this._status.set('loading');
  }

  setLoaded(): void {
    this._keepImageOnError.set(false);
    this._status.set('loaded');
  }

  setError(keepImage = false): void {
    this._keepImageOnError.set(keepImage);
    this._status.set('error');
  }
}
