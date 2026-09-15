import { Injectable, signal } from '@angular/core';

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

  setLoading(): void {
    this._status.set('loading');
  }

  setLoaded(): void {
    this._status.set('loaded');
  }

  setError(): void {
    this._status.set('error');
  }
}
