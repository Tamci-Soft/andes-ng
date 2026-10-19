import { InjectionToken, type Provider, type Signal } from '@angular/core';

import type { AndesRemotePlaybackState } from './player-types';

/**
 * Extension point for casting. By default the remote playback button uses the browser's
 * Remote Playback API (and the WebKit playback-target picker where that is what exists). An app
 * that ships its own casting SDK provides a handler instead: the button then reads `available`
 * and `state` from it and calls `prompt()`.
 */
export interface AndesRemotePlaybackHandler {
  readonly available: Signal<boolean>;
  readonly state: Signal<AndesRemotePlaybackState>;
  /** Opens the device picker (or disconnects when already connected). */
  prompt(media: HTMLMediaElement): Promise<void> | void;
}

export const ANDES_REMOTE_PLAYBACK_HANDLER =
  new InjectionToken<AndesRemotePlaybackHandler>(
    'ANDES_REMOTE_PLAYBACK_HANDLER',
  );

/** Provides a custom casting handler for every player below this injector. */
export function provideAndesRemotePlayback(
  handler: AndesRemotePlaybackHandler,
): Provider {
  return { provide: ANDES_REMOTE_PLAYBACK_HANDLER, useValue: handler };
}
