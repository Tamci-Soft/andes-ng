import { InjectionToken, type Provider } from '@angular/core';

import type { AndesPlayerHotkeyAction } from './player-hotkeys';
import type {
  AndesCaptionColor,
  AndesCaptionEdge,
  AndesCaptionFont,
  AndesPlayerErrorCode,
} from './player-types';
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

  /** Generic switch states (shuffle, loop). */
  readonly on: string;
  readonly off: string;

  // Playlist
  readonly previous: string;
  readonly next: string;
  readonly playlist: string;
  /** Where the entry sits, e.g. `2 of 5` (playlist menu value, announcements). */
  playlistPosition(position: number, total: number): string;
  readonly upNext: string;
  /** The visible countdown of the up-next card. */
  upNextIn(seconds: number): string;
  readonly playNow: string;
  readonly cancel: string;
  readonly repeat: string;
  readonly repeatAll: string;
  readonly repeatOne: string;
  /** The repeat page's name when there is no playlist (Off / On loops the media). */
  readonly loop: string;
  readonly shuffle: string;
  announceItem(title: string, position: string): string;
  announceUpNext(title: string, seconds: number): string;
  announceRepeat(mode: string): string;
  announceShuffle(on: boolean): string;

  // Caption appearance
  readonly captionStyle: string;
  readonly captionSize: string;
  readonly captionColor: string;
  readonly captionBackground: string;
  readonly captionOpacity: string;
  readonly captionEdge: string;
  readonly captionFont: string;
  /** The choice that keeps the theme's own value. */
  readonly captionDefault: string;
  readonly resetCaptionStyle: string;
  readonly colors: Readonly<Record<AndesCaptionColor, string>>;
  readonly edges: Readonly<Record<AndesCaptionEdge, string>>;
  readonly fonts: Readonly<Record<AndesCaptionFont, string>>;
  /** A percentage (`150%`). */
  percent(value: number): string;

  // Resume
  readonly resumeTitle: string;
  resumeFrom(time: AndesTimeText): string;
  readonly startOver: string;

  // Network
  readonly reconnecting: string;
  /** Shown under the spinner when the network stops delivering data. */
  readonly slowNetwork: string;

  // Keyboard help, context menu, mini player
  readonly keyboardShortcuts: string;
  readonly close: string;
  /** What each hotkey does, for the keyboard help. */
  readonly hotkeyActions: Readonly<Record<AndesPlayerHotkeyAction, string>>;
  /** The context menu's name. */
  readonly playerOptions: string;
  readonly copyLink: string;
  readonly copyLinkAtTime: string;
  readonly linkCopied: string;
  readonly miniPlayer: string;
  readonly closeMiniPlayer: string;
  readonly returnToPlayer: string;
  readonly playingInMiniPlayer: string;
}

/** The maps inside the labels, which overrides may give in part. */
type NestedLabelKey = 'errors' | 'colors' | 'edges' | 'fonts' | 'hotkeyActions';

/**
 * Overrides for some labels. The nested maps (`errors`, `colors`, `edges`, `fonts`,
 * `hotkeyActions`) may be partial too: they merge entry by entry over the defaults.
 */
export type AndesPlayerLabelOverrides = Partial<
  Omit<AndesPlayerLabels, NestedLabelKey>
> & {
  readonly [K in NestedLabelKey]?: Partial<AndesPlayerLabels[K]>;
};

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
  on: 'On',
  off: 'Off',
  previous: 'Previous',
  next: 'Next',
  playlist: 'Playlist',
  playlistPosition: (position, total) => `${position} of ${total}`,
  upNext: 'Up next',
  upNextIn: (seconds) => `Next in ${seconds}`,
  playNow: 'Play now',
  cancel: 'Cancel',
  repeat: 'Repeat',
  repeatAll: 'All',
  repeatOne: 'One',
  loop: 'Loop',
  shuffle: 'Shuffle',
  announceItem: (title, position) => `Now playing ${title}, ${position}`,
  announceUpNext: (title, seconds) =>
    `Up next: ${title}, in ${plural(seconds, 'second', 'seconds')}`,
  announceRepeat: (mode) => `Repeat ${mode}`,
  announceShuffle: (on) => (on ? 'Shuffle on' : 'Shuffle off'),
  captionStyle: 'Caption style',
  captionSize: 'Text size',
  captionColor: 'Text colour',
  captionBackground: 'Background',
  captionOpacity: 'Background opacity',
  captionEdge: 'Text edges',
  captionFont: 'Font',
  captionDefault: 'Default',
  resetCaptionStyle: 'Reset to default',
  colors: {
    white: 'White',
    yellow: 'Yellow',
    green: 'Green',
    cyan: 'Cyan',
    blue: 'Blue',
    magenta: 'Magenta',
    red: 'Red',
    black: 'Black',
  },
  edges: {
    none: 'None',
    shadow: 'Drop shadow',
    raised: 'Raised',
    depressed: 'Depressed',
    outline: 'Outline',
  },
  fonts: {
    default: 'Player font',
    'sans-serif': 'Sans serif',
    serif: 'Serif',
    monospace: 'Monospace',
  },
  percent: (value) => `${value}%`,
  resumeTitle: 'Continue watching?',
  resumeFrom: (time) => `Resume from ${time.clock}`,
  startOver: 'Start over',
  reconnecting: 'Reconnecting…',
  slowNetwork: 'Waiting for the network…',
  keyboardShortcuts: 'Keyboard shortcuts',
  close: 'Close',
  hotkeyActions: {
    togglePlay: 'Play or pause',
    toggleMute: 'Mute or unmute',
    toggleFullscreen: 'Full screen',
    exitFullscreen: 'Leave full screen',
    seekBackward: 'Back a little',
    seekForward: 'Forward a little',
    seekBackwardLarge: 'Back further',
    seekForwardLarge: 'Forward further',
    seekToStart: 'Go to the start',
    seekToEnd: 'Go to the end or to live',
    seekToPercent: 'Jump to 0% to 90%',
    volumeUp: 'Volume up',
    volumeDown: 'Volume down',
    slower: 'Slower',
    faster: 'Faster',
    toggleCaptions: 'Captions on or off',
    togglePictureInPicture: 'Picture in picture',
    previousFrame: 'Previous frame (paused)',
    nextFrame: 'Next frame (paused)',
    previousChapter: 'Previous chapter',
    nextChapter: 'Next chapter',
    previousItem: 'Previous in playlist',
    nextItem: 'Next in playlist',
    showShortcuts: 'Show keyboard shortcuts',
  },
  playerOptions: 'Player options',
  copyLink: 'Copy video address',
  copyLinkAtTime: 'Copy address at current time',
  linkCopied: 'Address copied',
  miniPlayer: 'Mini player',
  closeMiniPlayer: 'Close mini player',
  returnToPlayer: 'Back to the player',
  playingInMiniPlayer: 'Playing in the mini player',
};

/** App- or route-level label overrides, merged over the English defaults. */
export const ANDES_PLAYER_LABELS =
  new InjectionToken<AndesPlayerLabelOverrides>('ANDES_PLAYER_LABELS');

/** Provides label overrides for every player below this injector. */
export function provideAndesPlayerLabels(
  labels: AndesPlayerLabelOverrides,
): Provider {
  return { provide: ANDES_PLAYER_LABELS, useValue: labels };
}

/**
 * Merges overrides over the defaults; the nested maps (`errors`, `colors`, `edges`, `fonts`,
 * `hotkeyActions`) merge per key, so a translation can override one entry.
 */
export function mergeAndesPlayerLabels(
  ...layers: (AndesPlayerLabelOverrides | null | undefined)[]
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
      colors: { ...merged.colors, ...(layer.colors ?? {}) },
      edges: { ...merged.edges, ...(layer.edges ?? {}) },
      fonts: { ...merged.fonts, ...(layer.fonts ?? {}) },
      hotkeyActions: {
        ...merged.hotkeyActions,
        ...(layer.hotkeyActions ?? {}),
      },
    };
  }
  return merged;
}
