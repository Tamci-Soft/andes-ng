import { InjectionToken, type Provider } from '@angular/core';

import type { AndesPlayerErrorCode } from './player-types';
import type { AndesSpokenTimeUnits, AndesTimeText } from './time-format';

/**
 * Every visible string and accessible name of the player. English by default; override any
 * subset with `provideAndesPlayerLabels()` (app or route level) or the player's `labels` input
 * (one instance). Functions receive already formatted values so a translation controls the
 * word order and plural forms.
 */
export interface AndesPlayerLabels extends AndesSpokenTimeUnits {
  /** Accessible name of the player region. */
  readonly videoPlayer: string;
  readonly audioPlayer: string;

  readonly play: string;
  readonly pause: string;
  readonly replay: string;
  readonly mute: string;
  readonly unmute: string;
  readonly volume: string;
  /** The seek slider's name. */
  readonly seek: string;
  readonly currentTime: string;
  readonly duration: string;
  readonly remainingTime: string;
  seekForward(seconds: number): string;
  seekBackward(seconds: number): string;
  /** Short text inside the seek feedback (`+10s`). */
  seekOffset(seconds: number): string;
  /** `aria-valuetext` of the seek slider. */
  seekValueText(current: AndesTimeText, duration: AndesTimeText): string;
  /** `aria-valuetext` of the seek slider on a live stream with a DVR window. */
  liveSeekValueText(behind: AndesTimeText, atLiveEdge: boolean): string;
  /** `aria-valuetext` of the volume slider. */
  volumeValueText(percent: number): string;

  readonly playbackRate: string;
  /** Name of the `1×` speed. */
  readonly normalRate: string;
  rateValue(rate: string): string;

  readonly captions: string;
  readonly captionsOff: string;
  readonly captionsOn: string;
  readonly enableCaptions: string;
  readonly disableCaptions: string;
  readonly audioTrack: string;
  readonly quality: string;
  readonly qualityAuto: string;
  /** `Auto` with what the engine picked, e.g. `Auto (720p)`. */
  qualityAutoWith(current: string): string;
  readonly settings: string;
  readonly back: string;

  readonly enterFullscreen: string;
  readonly exitFullscreen: string;
  readonly enterPictureInPicture: string;
  readonly exitPictureInPicture: string;
  readonly remotePlayback: string;
  readonly remotePlaybackConnected: string;

  /** The live badge text. */
  readonly live: string;
  /** The live button's name while behind the live edge. */
  readonly goToLive: string;
  readonly atLiveEdge: string;
  /** How far behind live the viewer is, display form. */
  behindLive(behind: AndesTimeText): string;

  readonly tapToUnmute: string;
  readonly loading: string;
  readonly retry: string;
  readonly errorTitle: string;
  readonly errors: Readonly<Record<AndesPlayerErrorCode, string>>;
  readonly chapter: string;
  readonly preview: string;

  readonly announcePlaying: string;
  readonly announcePaused: string;
  readonly announceEnded: string;
  readonly announceMuted: string;
  readonly announceUnmuted: string;
  announceVolume(percent: number): string;
  announceRate(rate: string): string;
  /** `null` = captions turned off. */
  announceCaptions(label: string | null): string;
  announceAudioTrack(label: string): string;
  announceQuality(label: string): string;
  announceFullscreen(entered: boolean): string;
  announcePictureInPicture(entered: boolean): string;
  announceSeek(time: AndesTimeText): string;
  announceLive: string;
  announceError(message: string): string;
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export const ANDES_PLAYER_DEFAULT_LABELS: AndesPlayerLabels = {
  videoPlayer: 'Video player',
  audioPlayer: 'Audio player',
  play: 'Play',
  pause: 'Pause',
  replay: 'Replay',
  mute: 'Mute',
  unmute: 'Unmute',
  volume: 'Volume',
  seek: 'Seek',
  currentTime: 'Current time',
  duration: 'Duration',
  remainingTime: 'Remaining time',
  seekForward: (s) => `Forward ${plural(s, 'second', 'seconds')}`,
  seekBackward: (s) => `Back ${plural(s, 'second', 'seconds')}`,
  seekOffset: (s) => `${s > 0 ? '+' : '-'}${Math.abs(s)}s`,
  seekValueText: (current, duration) =>
    `${current.spoken} of ${duration.spoken}`,
  liveSeekValueText: (behind, atLiveEdge) =>
    atLiveEdge ? 'Live' : `${behind.spoken} behind live`,
  volumeValueText: (percent) => `${percent}%`,
  playbackRate: 'Speed',
  normalRate: 'Normal',
  rateValue: (rate) => `${rate}×`,
  captions: 'Captions',
  captionsOff: 'Off',
  captionsOn: 'On',
  enableCaptions: 'Turn on captions',
  disableCaptions: 'Turn off captions',
  audioTrack: 'Audio',
  quality: 'Quality',
  qualityAuto: 'Auto',
  qualityAutoWith: (current) => `Auto (${current})`,
  settings: 'Settings',
  back: 'Back',
  enterFullscreen: 'Full screen',
  exitFullscreen: 'Exit full screen',
  enterPictureInPicture: 'Picture in picture',
  exitPictureInPicture: 'Exit picture in picture',
  remotePlayback: 'Play on another device',
  remotePlaybackConnected: 'Playing on another device',
  live: 'Live',
  goToLive: 'Go to live',
  atLiveEdge: 'Watching live',
  behindLive: (behind) => `-${behind.clock}`,
  tapToUnmute: 'Tap to unmute',
  loading: 'Loading',
  retry: 'Try again',
  errorTitle: 'This media could not be played',
  errors: {
    aborted: 'Playback was stopped before the media finished loading.',
    network: 'A network problem interrupted the download.',
    decode: 'The media is damaged or uses a feature this browser lacks.',
    unsupported:
      'This format is not supported, or the file could not be found.',
    adapter: 'The streaming engine reported a problem.',
    unknown: 'Something went wrong while playing this media.',
  },
  chapter: 'Chapter',
  preview: 'Preview',
  hours: (n) => plural(n, 'hour', 'hours'),
  minutes: (n) => plural(n, 'minute', 'minutes'),
  seconds: (n) => plural(n, 'second', 'seconds'),
  announcePlaying: 'Playing',
  announcePaused: 'Paused',
  announceEnded: 'Ended',
  announceMuted: 'Muted',
  announceUnmuted: 'Unmuted',
  announceVolume: (percent) => `Volume ${percent}%`,
  announceRate: (rate) => `Speed ${rate}`,
  announceCaptions: (label) =>
    label === null ? 'Captions off' : `Captions on, ${label}`,
  announceAudioTrack: (label) => `Audio ${label}`,
  announceQuality: (label) => `Quality ${label}`,
  announceFullscreen: (entered) =>
    entered ? 'Entered full screen' : 'Exited full screen',
  announcePictureInPicture: (entered) =>
    entered ? 'Entered picture in picture' : 'Exited picture in picture',
  announceSeek: (time) => `Moved to ${time.spoken}`,
  announceLive: 'Jumped to live',
  announceError: (message) => `Error. ${message}`,
};

/** App- or route-level label overrides, merged over the English defaults. */
export const ANDES_PLAYER_LABELS = new InjectionToken<
  Partial<AndesPlayerLabels>
>('ANDES_PLAYER_LABELS');

/** Provides label overrides for every player below this injector. */
export function provideAndesPlayerLabels(
  labels: Partial<AndesPlayerLabels>,
): Provider {
  return { provide: ANDES_PLAYER_LABELS, useValue: labels };
}

/** Merges overrides over the defaults; `errors` merges per code. */
export function mergeAndesPlayerLabels(
  ...layers: (Partial<AndesPlayerLabels> | null | undefined)[]
): AndesPlayerLabels {
  let merged: AndesPlayerLabels = ANDES_PLAYER_DEFAULT_LABELS;
  for (const layer of layers) {
    if (!layer) {
      continue;
    }
    merged = {
      ...merged,
      ...layer,
      errors: { ...merged.errors, ...(layer.errors ?? {}) },
    };
  }
  return merged;
}
