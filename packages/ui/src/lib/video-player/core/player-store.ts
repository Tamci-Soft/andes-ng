import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  type Signal,
  signal,
  untracked,
} from '@angular/core';
import { andesPrefersReducedMotion } from '@andes-ng/primitives';
import { Subject } from 'rxjs';

import {
  exitDocumentFullscreen,
  fullscreenElement,
  fullscreenEnabled,
  hasPlaybackTargetPicker,
  lockOrientation,
  nativeAudioTracks,
  readTimeRanges,
  requestElementFullscreen,
  showPlaybackTargetPicker,
  unlockOrientation,
  videoFullscreen,
} from './browser';
import {
  ANDES_MEDIA_ADAPTERS,
  type AndesAdapterError,
  type AndesLiveInfo,
  type AndesMediaAdapter,
  type AndesMediaAdapterFactory,
  type AndesMediaAdapterHooks,
  AndesNativeMediaAdapter,
  pickSource,
} from './media-adapter';
import { createPlayerError, playerErrorFromMedia } from './player-errors';
import {
  type AndesPlayerHotkeyAction,
  type AndesPlayerKeyMap,
  ANDES_PLAYER_DEFAULT_KEY_MAP,
  isKeyOwnedByTarget,
  resolveHotkey,
} from './player-hotkeys';
import {
  ANDES_PLAYER_LABELS,
  type AndesPlayerLabels,
  mergeAndesPlayerLabels,
} from './player-labels';
import {
  type AndesPlayerPreferences,
  readPlayerPreferences,
  writePlayerPreferences,
} from './player-preferences';
import type {
  AndesAudioTrackInfo,
  AndesCaptionsRenderer,
  AndesChapter,
  AndesMediaSource,
  AndesPlayerChangeOrigin,
  AndesPlayerControls,
  AndesPlayerError,
  AndesPlayerFeedback,
  AndesPlayerFeedbackKind,
  AndesPlayerMetadata,
  AndesQualityRendition,
  AndesRemotePlaybackState,
  AndesStreamType,
  AndesTextTrackInfo,
  AndesThumbnail,
  AndesThumbnailsConfig,
  AndesTimeRange,
} from './player-types';
import { ANDES_REMOTE_PLAYBACK_HANDLER } from './remote-playback';
import { formatRate, formatTimeText } from './time-format';
import {
  chaptersFromCues,
  findTimed,
  parseVtt,
  thumbnailsFromGrid,
  thumbnailsFromVtt,
} from './vtt';

/** Everything the root component configures on its store. */
export interface AndesPlayerConfig {
  readonly labels: Partial<AndesPlayerLabels> | null;
  readonly keyMap: AndesPlayerKeyMap;
  /** Arrow-key and hotkey seek step, seconds. */
  readonly seekStep: number;
  /** Shift+arrow, J/L and double-tap seek step, seconds. */
  readonly seekStepLarge: number;
  readonly playbackRates: readonly number[];
  /** Milliseconds of inactivity before the controls hide; `0` keeps them visible. */
  readonly autohide: number;
  readonly controls: AndesPlayerControls;
  readonly audioOnly: boolean;
  readonly background: boolean;
  readonly autoplay: boolean;
  readonly startTime: number;
  readonly streamType: AndesStreamType | 'auto';
  readonly liveEdgeTolerance: number;
  readonly captionsRenderer: AndesCaptionsRenderer;
  readonly persistKey: string | null;
  readonly title: string | null;
  /** Poster image (video) or cover art (audio). */
  readonly poster: string | null;
  readonly metadata: AndesPlayerMetadata | null;
  readonly mediaSession: boolean;
  readonly skipControls: boolean;
  readonly thumbnails: AndesThumbnailsConfig | null;
  readonly chapters: readonly AndesChapter[] | null;
  readonly adapters: readonly AndesMediaAdapterFactory[] | null;
  readonly loopRange: readonly [number, number] | null;
  readonly orientationLock: boolean;
}

export const ANDES_PLAYER_DEFAULT_CONFIG: AndesPlayerConfig = {
  labels: null,
  keyMap: ANDES_PLAYER_DEFAULT_KEY_MAP,
  seekStep: 5,
  seekStepLarge: 10,
  playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
  autohide: 3000,
  controls: 'default',
  audioOnly: false,
  background: false,
  autoplay: false,
  startTime: 0,
  streamType: 'auto',
  liveEdgeTolerance: 10,
  captionsRenderer: 'overlay',
  persistKey: null,
  title: null,
  poster: null,
  metadata: null,
  mediaSession: true,
  skipControls: false,
  thumbnails: null,
  chapters: null,
  adapters: null,
  loopRange: null,
  orientationLock: true,
};

/** A message for the live region; `id` changes on every announcement. */
export interface AndesPlayerAnnouncement {
  readonly text: string;
  readonly id: number;
}

/** A seekable window shorter than this (seconds) is a plain live stream, not a DVR window. */
const DVR_MIN_WINDOW = 60;
const FEEDBACK_MS = 700;
const ANNOUNCE_DEBOUNCE_MS = 400;
const ANNOUNCED_ORIGINS: ReadonlySet<AndesPlayerChangeOrigin> = new Set([
  'control',
  'hotkey',
  'gesture',
]);

type PlayAttempt = 'played' | 'not-allowed' | 'aborted' | 'failed';
type OriginKind =
  'play' | 'pause' | 'volume' | 'mute' | 'rate' | 'fullscreen' | 'pip' | 'seek';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sameList<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function sameRanges(
  a: readonly AndesTimeRange[],
  b: readonly AndesTimeRange[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (range, index) =>
        range.start === b[index].start && range.end === b[index].end,
    )
  );
}

/**
 * The signal store behind one player. The root component provides it and attaches its media
 * element; every control part injects it, reads its signals and calls its actions, so the
 * built-in bar and an app's own controls drive the player the same way.
 *
 * State mirrors the media element (updated from its events, never polled) plus what the player
 * adds on top: live/DVR detection, caption and track selection, renditions from an adapter,
 * user activity for auto-hiding, transient feedback and live-region announcements.
 *
 * Every action is safe to call at any time - before a media element exists, on the server, or
 * with an API the browser lacks - and none of them throws.
 */
@Injectable()
export class AndesPlayerStore {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly registeredAdapters =
    inject(ANDES_MEDIA_ADAPTERS, { optional: true }) ?? [];
  private readonly providedLabels = inject(ANDES_PLAYER_LABELS, {
    optional: true,
  });
  private readonly remoteHandler = inject(ANDES_REMOTE_PLAYBACK_HANDLER, {
    optional: true,
  });

  // ---- configuration -------------------------------------------------------------------------

  private readonly configSource = signal<Signal<AndesPlayerConfig> | null>(
    null,
  );
  /** The root's current configuration. */
  readonly config = computed(
    () => this.configSource()?.() ?? ANDES_PLAYER_DEFAULT_CONFIG,
  );
  readonly labels = computed<AndesPlayerLabels>(() =>
    mergeAndesPlayerLabels(this.providedLabels, this.config().labels),
  );
  readonly keyMap = computed(() => this.config().keyMap);
  readonly playbackRates = computed(() => this.config().playbackRates);
  readonly audioOnly = computed(() => this.config().audioOnly);
  readonly background = computed(() => this.config().background);
  readonly title = computed(
    () => this.config().title ?? this.config().metadata?.title ?? null,
  );
  /** Whether the user asked the system for less motion. */
  readonly reducedMotion = andesPrefersReducedMotion();

  // ---- elements ------------------------------------------------------------------------------

  private readonly _media = signal<HTMLMediaElement | null>(null);
  /** The native media element, once the root has rendered it. */
  readonly media = this._media.asReadonly();
  private readonly _container = signal<HTMLElement | null>(null);
  /** The element that goes fullscreen (the player root). */
  readonly container = this._container.asReadonly();
  /** The player's rendered height in pixels, set by the root (menus size against it). */
  readonly containerHeight = signal(0);
  readonly containerWidth = signal(0);

  // ---- media state ---------------------------------------------------------------------------

  private readonly _paused = signal(true);
  private readonly _ended = signal(false);
  private readonly _currentTime = signal(0);
  private readonly _duration = signal(Number.NaN);
  private readonly _buffered = signal<readonly AndesTimeRange[]>([], {
    equal: sameRanges,
  });
  private readonly _seekable = signal<readonly AndesTimeRange[]>([], {
    equal: sameRanges,
  });
  private readonly _playbackRate = signal(1);
  private readonly _volume = signal(1);
  private readonly _muted = signal(false);
  private readonly _readyState = signal(0);
  private readonly _waiting = signal(false);
  private readonly _stalled = signal(false);
  private readonly _seeking = signal(false);
  private readonly _error = signal<AndesPlayerError | null>(null);
  private readonly _started = signal(false);
  private readonly _metadataLoaded = signal(false);
  private readonly _videoWidth = signal(0);
  private readonly _videoHeight = signal(0);
  private readonly _source = signal<AndesMediaSource | null>(null);
  private readonly _adapterName = signal<string | null>(null);

  readonly paused = this._paused.asReadonly();
  readonly ended = this._ended.asReadonly();
  readonly currentTime = this._currentTime.asReadonly();
  /** `NaN` until known; `Infinity` for a live stream. */
  readonly duration = this._duration.asReadonly();
  readonly buffered = this._buffered.asReadonly();
  readonly seekable = this._seekable.asReadonly();
  readonly playbackRate = this._playbackRate.asReadonly();
  readonly volume = this._volume.asReadonly();
  readonly muted = this._muted.asReadonly();
  readonly readyState = this._readyState.asReadonly();
  /** The element is waiting for data it needs to continue. */
  readonly waiting = this._waiting.asReadonly();
  /** The network stopped delivering data for a while. */
  readonly stalled = this._stalled.asReadonly();
  readonly seeking = this._seeking.asReadonly();
  readonly error = this._error.asReadonly();
  /** Playback has started at least once for the current source (the poster hides). */
  readonly started = this._started.asReadonly();
  readonly metadataLoaded = this._metadataLoaded.asReadonly();
  readonly videoWidth = this._videoWidth.asReadonly();
  readonly videoHeight = this._videoHeight.asReadonly();
  /** The source being played. */
  readonly source = this._source.asReadonly();
  /** Name of the adapter playing the current source. */
  readonly adapterName = this._adapterName.asReadonly();

  /** Waiting for data while playback should be running (show a spinner after a short delay). */
  readonly buffering = computed(
    () =>
      !this._error() &&
      ((this._waiting() && !this._paused()) ||
        (this._seeking() && this._readyState() < 3)),
  );
  /** Volume 0 counts as muted for icons and labels. */
  readonly effectivelyMuted = computed(
    () => this._muted() || this._volume() === 0,
  );
  /** Whether this browser lets the page change the volume (some phones only use hardware keys). */
  readonly volumeSupported = signal(true);

  // ---- display modes -------------------------------------------------------------------------

  private readonly _fullscreen = signal(false);
  private readonly _pictureInPicture = signal(false);
  readonly fullscreen = this._fullscreen.asReadonly();
  readonly pictureInPicture = this._pictureInPicture.asReadonly();

  /** Browser capabilities, probed when an element attaches and on every load. */
  private readonly capabilities = signal({
    fullscreen: false,
    pictureInPicture: false,
  });
  readonly fullscreenSupported = computed(
    () => this.capabilities().fullscreen && !this.audioOnly(),
  );
  readonly pictureInPictureSupported = computed(
    () => this.capabilities().pictureInPicture && !this.audioOnly(),
  );

  private readonly _remoteAvailable = signal(false);
  private readonly _remoteState =
    signal<AndesRemotePlaybackState>('disconnected');
  /** A remote playback device can be picked. */
  readonly remotePlaybackAvailable = computed(() =>
    this.remoteHandler
      ? this.remoteHandler.available()
      : this._remoteAvailable(),
  );
  readonly remotePlaybackState = computed(() =>
    this.remoteHandler ? this.remoteHandler.state() : this._remoteState(),
  );

  // ---- tracks and renditions -----------------------------------------------------------------

  private readonly _nativeTextTracks = signal<readonly AndesTextTrackInfo[]>(
    [],
  );
  private readonly _adapterTextTracks = signal<readonly AndesTextTrackInfo[]>(
    [],
  );
  private readonly _activeTextTrackId = signal<string | null>(null);
  private readonly _activeCues = signal<readonly TextTrackCue[]>([]);
  private readonly _nativeAudioTracks = signal<readonly AndesAudioTrackInfo[]>(
    [],
  );
  private readonly _adapterAudioTracks = signal<readonly AndesAudioTrackInfo[]>(
    [],
  );
  private readonly _activeAudioTrackId = signal<string | null>(null);
  private readonly _qualities = signal<readonly AndesQualityRendition[]>([]);
  private readonly _activeQualityId = signal<string | null>(null);
  private readonly _autoQuality = signal(true);
  private readonly _trackChapters = signal<readonly AndesChapter[]>([]);
  private readonly _fetchedThumbnails = signal<readonly AndesThumbnail[]>([]);
  private readonly _live = signal<AndesLiveInfo | null>(null);

  /** Subtitle and caption tracks: `<track>` elements plus those an adapter reports. */
  readonly textTracks = computed<readonly AndesTextTrackInfo[]>(() => [
    ...this._nativeTextTracks(),
    ...this._adapterTextTracks(),
  ]);
  readonly activeTextTrackId = this._activeTextTrackId.asReadonly();
  readonly activeTextTrack = computed(
    () =>
      this.textTracks().find(
        (track) => track.id === this._activeTextTrackId(),
      ) ?? null,
  );
  readonly captionsEnabled = computed(() => this.activeTextTrack() !== null);
  /** Cues to draw in the captions overlay. */
  readonly activeCues = this._activeCues.asReadonly();

  readonly audioTracks = computed<readonly AndesAudioTrackInfo[]>(() =>
    this._adapterAudioTracks().length > 0
      ? this._adapterAudioTracks()
      : this._nativeAudioTracks(),
  );
  readonly activeAudioTrackId = this._activeAudioTrackId.asReadonly();

  readonly qualities = this._qualities.asReadonly();
  /** The rendition playing (also while the engine chooses automatically). */
  readonly activeQualityId = this._activeQualityId.asReadonly();
  readonly autoQuality = this._autoQuality.asReadonly();
  readonly activeQuality = computed(
    () =>
      this._qualities().find((q) => q.id === this._activeQualityId()) ?? null,
  );

  readonly chapters = computed<readonly AndesChapter[]>(
    () => this.config().chapters ?? this._trackChapters(),
  );
  readonly currentChapter = computed(() =>
    findTimed(this.chapters(), this.displayTime()),
  );

  readonly thumbnails = computed<readonly AndesThumbnail[]>(() => {
    const config = this.config().thumbnails;
    if (config && 'columns' in config) {
      return thumbnailsFromGrid(config, this._duration());
    }
    return this._fetchedThumbnails();
  });

  // ---- live ------------------------------------------------------------------------------------

  readonly streamType = computed<AndesStreamType>(() => {
    const override = this.config().streamType;
    if (override !== 'auto') {
      return override;
    }
    const adapterType = this._live()?.streamType;
    if (adapterType && adapterType !== 'unknown') {
      return adapterType;
    }
    const duration = this._duration();
    if (duration === Number.POSITIVE_INFINITY) {
      const window = this.seekableEnd() - this.seekableStart();
      return window >= DVR_MIN_WINDOW ? 'live-dvr' : 'live';
    }
    return Number.isFinite(duration) ? 'on-demand' : 'unknown';
  });
  readonly isLive = computed(() => {
    const type = this.streamType();
    return type === 'live' || type === 'live-dvr';
  });
  readonly seekableStart = computed(() => this._seekable()[0]?.start ?? 0);
  readonly seekableEnd = computed(() => {
    const ranges = this._seekable();
    return ranges.length > 0 ? ranges[ranges.length - 1].end : 0;
  });
  /** The latest playable position of a live stream. */
  readonly liveEdge = computed(
    () => this._live()?.liveEdge ?? this.seekableEnd(),
  );
  readonly liveEdgeTolerance = computed(
    () => this._live()?.liveEdgeTolerance ?? this.config().liveEdgeTolerance,
  );
  /** Seconds behind the live edge (0 when not live). */
  readonly behindLive = computed(() =>
    this.isLive() ? Math.max(0, this.liveEdge() - this._currentTime()) : 0,
  );
  readonly atLiveEdge = computed(
    () =>
      this.isLive() &&
      !this._paused() &&
      this.behindLive() <= this.liveEdgeTolerance(),
  );

  /** The seek slider's range: the file, or the DVR window of a live stream. */
  readonly timelineStart = computed(() =>
    this.streamType() === 'live-dvr' ? this.seekableStart() : 0,
  );
  readonly timelineEnd = computed(() => {
    if (this.streamType() === 'live-dvr') {
      return this.liveEdge();
    }
    const duration = this._duration();
    return Number.isFinite(duration) ? duration : 0;
  });
  /** Whether seeking makes sense right now. */
  readonly canSeek = computed(
    () =>
      this.streamType() !== 'live' && this.timelineEnd() > this.timelineStart(),
  );

  // ---- scrubbing and display time ------------------------------------------------------------

  private readonly _scrubTime = signal<number | null>(null);
  /** The time under the seek slider thumb while the viewer drags it. */
  readonly scrubTime = this._scrubTime.asReadonly();
  readonly scrubbing = computed(() => this._scrubTime() !== null);
  /** The time the controls show: the drag position while scrubbing, else the playback time. */
  readonly displayTime = computed(
    () => this._scrubTime() ?? this._currentTime(),
  );
  readonly bufferedEnd = computed(() => {
    const time = this._currentTime();
    const range = this._buffered().find(
      (entry) => entry.start <= time + 0.5 && entry.end >= time,
    );
    return range?.end ?? 0;
  });

  // ---- autoplay -------------------------------------------------------------------------------

  private readonly _autoplayMuted = signal(false);
  private readonly _autoplayBlocked = signal(false);
  /** Autoplay only worked muted: show the "tap to unmute" affordance. */
  readonly autoplayMuted = this._autoplayMuted.asReadonly();
  /** Autoplay was refused altogether: the big play button invites a tap. */
  readonly autoplayBlocked = this._autoplayBlocked.asReadonly();

  // ---- user activity and chrome ----------------------------------------------------------------

  private readonly _userActive = signal(true);
  private readonly _openMenus = signal(0);
  /** The pointer is over the control bar (keeps it visible). */
  readonly pointerOverControls = signal(false);
  /** Keyboard focus is on a control (keeps the bar visible). */
  readonly keyboardFocusInside = signal(false);
  readonly userActive = this._userActive.asReadonly();
  readonly menuOpen = computed(() => this._openMenus() > 0);

  /**
   * Whether the chrome (the built-in bar, or an app's own `slot="controls"` parts) is shown.
   * Hidden chrome stays focusable and reappears on focus.
   */
  readonly controlsVisible = computed(() => {
    const config = this.config();
    if (config.background) {
      return false;
    }
    if (config.audioOnly || config.autohide <= 0) {
      return true;
    }
    return (
      !this._started() ||
      this._paused() ||
      this._ended() ||
      this._error() !== null ||
      this._userActive() ||
      this.menuOpen() ||
      this.pointerOverControls() ||
      this.keyboardFocusInside()
    );
  });

  private readonly _feedback = signal<AndesPlayerFeedback | null>(null);
  /** The transient indicator to show (play/pause flash, volume level, seek ripple). */
  readonly feedback = this._feedback.asReadonly();
  private readonly _announcement = signal<AndesPlayerAnnouncement | null>(null);
  /** Previous (`-1`) / next (`1`) requests from the system media controls (`skipControls`). */
  readonly skipRequests = new Subject<-1 | 1>();
  /** The latest live-region message. */
  readonly announcement = this._announcement.asReadonly();

  // ---- internals -------------------------------------------------------------------------------

  private readonly nativeAdapter = new AndesNativeMediaAdapter();
  private readonly adapterInstances = new Map<
    AndesMediaAdapterFactory,
    AndesMediaAdapter
  >();
  private adapter: AndesMediaAdapter | null = null;
  private sources: readonly AndesMediaSource[] = [];
  private mediaCleanup: (() => void)[] = [];
  private captionTrackCleanup: (() => void) | null = null;
  private pendingStartTime: number | null = null;
  /** Volume/mute/speed set before a media element exists, applied on attach. */
  private pendingMedia: { volume?: number; muted?: boolean; rate?: number } =
    {};
  /** `play()` was called before there was anything to play. */
  private pendingPlay = false;
  private loadToken = 0;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly announceTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly origins = new Map<OriginKind, AndesPlayerChangeOrigin>();
  private feedbackId = 0;
  private announcementId = 0;
  /** `undefined` = no choice yet; `null` = the viewer turned captions off. */
  private captionPreference: string | null | undefined = undefined;
  /** The last language the viewer turned on, for the captions toggle. */
  private lastCaptionLanguage: string | null = null;
  private preferences: AndesPlayerPreferences = {};
  private preferencesKey: string | null = null;
  private lastPersisted = '';
  private mediaSessionOwned = false;
  private lastPositionUpdate = 0;
  private orientationLocked = false;
  private destroyed = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.destroy());

    if (!this.isBrowser) {
      return;
    }

    // Persisted preferences: read once per key, written whenever a remembered value changes.
    effect(() => {
      const key = this.config().persistKey;
      untracked(() => this.loadPreferences(key));
    });
    effect(() => {
      const key = this.config().persistKey;
      const snapshot: AndesPlayerPreferences = {
        volume: this._volume(),
        muted: this._muted(),
        playbackRate: this._playbackRate(),
        captionLanguage: this.activeTextTrack()?.language ?? null,
      };
      if (!key || key !== this.preferencesKey) {
        return;
      }
      if (this.captionPreference === undefined) {
        // Do not record "off" before the viewer ever chose anything.
        delete snapshot.captionLanguage;
      }
      const serialized = JSON.stringify(snapshot);
      if (serialized !== this.lastPersisted) {
        this.lastPersisted = serialized;
        writePlayerPreferences(key, snapshot);
      }
    });

    // Storyboard thumbnails from a WebVTT file.
    effect((onCleanup) => {
      const config = this.config().thumbnails;
      untracked(() => this._fetchedThumbnails.set([]));
      if (!config || 'columns' in config) {
        return;
      }
      const controller =
        typeof AbortController === 'function' ? new AbortController() : null;
      onCleanup(() => controller?.abort());
      void this.fetchThumbnails(config.src, controller?.signal);
    });

    // Background mode under reduced motion: decorative video holds still.
    effect(() => {
      if (this.background() && this.reducedMotion()) {
        untracked(() => this.pause('media'));
      }
    });

    // Media Session metadata follows whichever player is playing.
    effect(() => {
      const playing = !this._paused();
      const config = this.config();
      this.title();
      untracked(() => this.syncMediaSession(playing, config));
    });
  }

  /** Called by the root: hands over its configuration signal. */
  connect(config: Signal<AndesPlayerConfig>): void {
    this.configSource.set(config);
  }

  // ---- element lifecycle -----------------------------------------------------------------------

  /** Attaches the native media element and the fullscreen container. */
  attach(media: HTMLMediaElement, container: HTMLElement): void {
    if (!this.isBrowser || this.destroyed) {
      return;
    }
    if (this._media() === media) {
      this._container.set(container);
      return;
    }
    this.detachMedia();
    this._media.set(media);
    this._container.set(container);
    this.volumeSupported.set(this.probeVolumeSupport());
    this.probeCapabilities(media);
    this.applyPendingMedia(media);
    this.applyPreferences(media);
    this.listen(media);
    this.syncFromMedia(media);
    this.watchRemotePlayback(media);
  }

  /**
   * Loads a list of sources (the first one that matches its `media` query and that an adapter
   * or the browser can play). Changing sources resets the playback state, not the viewer's
   * volume, speed or caption choice.
   */
  load(sources: readonly AndesMediaSource[]): void {
    this.sources = sources;
    const media = this._media();
    const token = ++this.loadToken;
    this.detachAdapter();
    this.resetPlaybackState();
    if (!media || sources.length === 0) {
      return;
    }
    this.probeCapabilities(media);

    const startTime = this.config().startTime;
    this.pendingStartTime =
      this.pendingStartTime ?? (startTime > 0 ? startTime : null);

    const choice = this.chooseAdapter(sources);
    if (!choice) {
      this._error.set(createPlayerError('unsupported', this.labels()));
      return;
    }
    const { adapter, source } = choice;
    this.adapter = adapter;
    this._adapterName.set(adapter.name);
    this._source.set(source);

    try {
      const result = adapter.attach(media, source, this.createHooks(token));
      if (result && typeof result.then === 'function') {
        result.then(
          () => this.afterAttach(token),
          (cause: unknown) => {
            if (token === this.loadToken) {
              this.reportAdapterError({ code: 'adapter', cause });
            }
          },
        );
        return;
      }
    } catch (cause) {
      this.reportAdapterError({ code: 'adapter', cause });
      return;
    }
    this.afterAttach(token);
  }

  /** Loads the current sources again. */
  reload(): void {
    this.load(this.sources);
  }

  /** Clears an error and reloads, resuming from where playback was. */
  retry(): void {
    const resumeAt =
      this.streamType() === 'on-demand' && this._currentTime() > 0
        ? this._currentTime()
        : null;
    const resume = this._started() && !this._ended();
    this.pendingStartTime = resumeAt;
    this.load(this.sources);
    if (resume && !this.config().autoplay) {
      void this.play('control');
    }
  }

  // ---- playback actions -------------------------------------------------------------------------

  /** Starts playback. Resolves `true` when it plays, `false` when the browser refused; never rejects. */
  async play(origin: AndesPlayerChangeOrigin = 'api'): Promise<boolean> {
    const media = this._media();
    if (!media || !this._source()) {
      // Nothing loaded yet: play as soon as a source is attached.
      this.pendingPlay = true;
      return false;
    }
    this.origins.set('play', origin);
    this._autoplayBlocked.set(false);
    const attempt = await this.tryPlay(media);
    if (attempt !== 'played') {
      this.origins.delete('play');
      if (attempt === 'not-allowed') {
        this._autoplayBlocked.set(true);
      }
    }
    return attempt === 'played';
  }

  pause(origin: AndesPlayerChangeOrigin = 'api'): void {
    this.pendingPlay = false;
    const media = this._media();
    if (!media || media.paused) {
      return;
    }
    this.origins.set('pause', origin);
    try {
      media.pause();
    } catch {
      this.origins.delete('pause');
    }
  }

  togglePaused(origin: AndesPlayerChangeOrigin = 'api'): void {
    if (this._paused() || this._ended()) {
      void this.play(origin);
    } else {
      this.pause(origin);
    }
  }

  /** Seeks to a time in seconds, clamped to the timeline. */
  seek(time: number, origin: AndesPlayerChangeOrigin = 'api'): void {
    const media = this._media();
    if (!Number.isFinite(time)) {
      return;
    }
    if (!media) {
      this.pendingStartTime = Math.max(0, time);
      return;
    }
    const start = this.timelineStart();
    const end = this.timelineEnd();
    const target = end > start ? clamp(time, start, end) : Math.max(0, time);
    if (!this._metadataLoaded() && this._readyState() < 1) {
      // Too early to seek: remember it and apply it once metadata arrives.
      this.pendingStartTime = target;
      return;
    }
    this.origins.set('seek', origin);
    try {
      media.currentTime = target;
    } catch {
      this.origins.delete('seek');
      return;
    }
    this._currentTime.set(target);
    if (target < end) {
      this._ended.set(false);
    }
    if (ANNOUNCED_ORIGINS.has(origin)) {
      this.announceDebounced('seek', () =>
        this.labels().announceSeek(
          formatTimeText(this._currentTime(), this.labels()),
        ),
      );
    }
  }

  /** Seeks relative to the current time. */
  seekBy(delta: number, origin: AndesPlayerChangeOrigin = 'api'): void {
    this.seek(this._currentTime() + delta, origin);
  }

  /** Seeks to a fraction (0-1) of the timeline. */
  seekToFraction(
    fraction: number,
    origin: AndesPlayerChangeOrigin = 'api',
  ): void {
    const start = this.timelineStart();
    this.seek(
      start + clamp(fraction, 0, 1) * (this.timelineEnd() - start),
      origin,
    );
  }

  /** Jumps to the live edge (and plays) on a live stream. */
  seekToLive(origin: AndesPlayerChangeOrigin = 'api'): void {
    const media = this._media();
    if (!media || !this.isLive()) {
      return;
    }
    try {
      // Just behind the edge: at the very end of the seekable range playback would stall.
      const offset = Math.min(this.liveEdgeTolerance() / 2, 3);
      media.currentTime = Math.max(
        this.seekableStart(),
        this.liveEdge() - offset,
      );
    } catch {
      // Not seekable yet; playing still moves to the edge in most engines.
    }
    void this.play(origin === 'api' ? 'api' : 'media');
    if (ANNOUNCED_ORIGINS.has(origin)) {
      this.announce(this.labels().announceLive);
    }
  }

  /** Sets the volume (0-1). Raising it above 0 also unmutes. */
  setVolume(volume: number, origin: AndesPlayerChangeOrigin = 'api'): void {
    if (!Number.isFinite(volume)) {
      return;
    }
    const media = this._media();
    const next = clamp(Math.round(volume * 100) / 100, 0, 1);
    if (!media) {
      this.pendingMedia.volume = next;
      this._volume.set(next);
      return;
    }
    this.origins.set('volume', origin);
    try {
      media.volume = next;
      if (next > 0 && media.muted) {
        media.muted = false;
      }
    } catch {
      this.origins.delete('volume');
    }
  }

  changeVolumeBy(delta: number, origin: AndesPlayerChangeOrigin = 'api'): void {
    const base = this._muted() ? 0 : this._volume();
    this.setVolume(base + delta, origin);
  }

  setMuted(muted: boolean, origin: AndesPlayerChangeOrigin = 'api'): void {
    const media = this._media();
    if (!media) {
      this.pendingMedia.muted = muted;
      this._muted.set(muted);
      return;
    }
    this.origins.set('mute', origin);
    media.muted = muted;
    if (!muted) {
      this._autoplayMuted.set(false);
      if (media.volume === 0) {
        media.volume = 0.5;
      }
    }
  }

  toggleMuted(origin: AndesPlayerChangeOrigin = 'api'): void {
    this.setMuted(!this.effectivelyMuted(), origin);
  }

  setPlaybackRate(rate: number, origin: AndesPlayerChangeOrigin = 'api'): void {
    if (!Number.isFinite(rate) || rate <= 0) {
      return;
    }
    const media = this._media();
    if (!media) {
      this.pendingMedia.rate = rate;
      this._playbackRate.set(rate);
      return;
    }
    this.origins.set('rate', origin);
    try {
      media.playbackRate = rate;
      media.defaultPlaybackRate = rate;
    } catch {
      this.origins.delete('rate');
    }
  }

  /** Moves to the next faster (`1`) or slower (`-1`) entry of the rate list. */
  stepPlaybackRate(
    direction: 1 | -1,
    origin: AndesPlayerChangeOrigin = 'api',
  ): void {
    const rates = [...this.playbackRates()].sort((a, b) => a - b);
    const current = this._playbackRate();
    const next =
      direction > 0
        ? rates.find((rate) => rate > current + 1e-6)
        : [...rates].reverse().find((rate) => rate < current - 1e-6);
    if (next !== undefined) {
      this.setPlaybackRate(next, origin);
      this.showFeedback('rate', this.rateLabel(next));
    }
  }

  /** The visible name of a rate (`Normal`, `1.5×`). */
  rateLabel(rate: number): string {
    const labels = this.labels();
    return Math.abs(rate - 1) < 1e-6
      ? labels.normalRate
      : labels.rateValue(formatRate(rate));
  }

  // ---- fullscreen, picture in picture, remote ----------------------------------------------------

  async enterFullscreen(
    origin: AndesPlayerChangeOrigin = 'api',
  ): Promise<boolean> {
    const container = this._container();
    const media = this._media();
    if (!this.isBrowser || !container || this._fullscreen()) {
      return false;
    }
    this.origins.set('fullscreen', origin);
    try {
      if (fullscreenEnabled(this.document)) {
        if (!(await requestElementFullscreen(container))) {
          throw new Error('fullscreen unavailable');
        }
        await this.lockLandscape();
        return true;
      }
      const phone = videoFullscreen(media);
      if (phone.supported) {
        phone.enter();
        return true;
      }
    } catch {
      // Refused (no user gesture, permissions policy): the state simply stays as it was.
    }
    this.origins.delete('fullscreen');
    return false;
  }

  async exitFullscreen(origin: AndesPlayerChangeOrigin = 'api'): Promise<void> {
    if (!this.isBrowser || !this._fullscreen()) {
      return;
    }
    this.origins.set('fullscreen', origin);
    try {
      if (fullscreenElement(this.document)) {
        await exitDocumentFullscreen(this.document);
      } else {
        videoFullscreen(this._media()).exit();
      }
    } catch {
      this.origins.delete('fullscreen');
    }
  }

  toggleFullscreen(origin: AndesPlayerChangeOrigin = 'api'): Promise<unknown> {
    return this._fullscreen()
      ? this.exitFullscreen(origin)
      : this.enterFullscreen(origin);
  }

  async enterPictureInPicture(
    origin: AndesPlayerChangeOrigin = 'api',
  ): Promise<boolean> {
    const media = this._media() as HTMLVideoElement | null;
    if (!media || !this.pictureInPictureSupported()) {
      return false;
    }
    this.origins.set('pip', origin);
    try {
      await media.requestPictureInPicture();
      return true;
    } catch {
      this.origins.delete('pip');
      return false;
    }
  }

  async exitPictureInPicture(
    origin: AndesPlayerChangeOrigin = 'api',
  ): Promise<void> {
    if (!this.isBrowser || !this._pictureInPicture()) {
      return;
    }
    this.origins.set('pip', origin);
    try {
      await this.document.exitPictureInPicture();
    } catch {
      this.origins.delete('pip');
    }
  }

  togglePictureInPicture(
    origin: AndesPlayerChangeOrigin = 'api',
  ): Promise<unknown> {
    return this._pictureInPicture()
      ? this.exitPictureInPicture(origin)
      : this.enterPictureInPicture(origin);
  }

  /** Opens the remote playback device picker. */
  async requestRemotePlayback(): Promise<void> {
    const media = this._media();
    if (!media) {
      return;
    }
    try {
      if (this.remoteHandler) {
        await this.remoteHandler.prompt(media);
        return;
      }
      if (media.remote && typeof media.remote.prompt === 'function') {
        await media.remote.prompt();
        return;
      }
      showPlaybackTargetPicker(media);
    } catch {
      // The viewer dismissed the picker, or no device answered.
    }
  }

  // ---- tracks and renditions ---------------------------------------------------------------------

  /** Turns on a subtitle/caption track by id, or captions off with `null`. Remembers the choice. */
  selectTextTrack(
    id: string | null,
    origin: AndesPlayerChangeOrigin = 'api',
  ): void {
    const track =
      id === null ? null : this.textTracks().find((t) => t.id === id);
    if (id !== null && !track) {
      return;
    }
    this.captionPreference = track ? track.language || track.label : null;
    if (this.captionPreference) {
      this.lastCaptionLanguage = this.captionPreference;
    }
    this.applyTextTrack(track?.id ?? null);
    if (ANNOUNCED_ORIGINS.has(origin)) {
      this.announce(this.labels().announceCaptions(track?.label ?? null));
    }
  }

  /** Captions on (the remembered or default track) or off. */
  toggleCaptions(origin: AndesPlayerChangeOrigin = 'api'): void {
    if (this.captionsEnabled()) {
      this.selectTextTrack(null, origin);
      this.showFeedback('captions', this.labels().captionsOff);
      return;
    }
    const tracks = this.textTracks();
    const language =
      typeof this.captionPreference === 'string'
        ? this.captionPreference
        : this.lastCaptionLanguage;
    const remembered = language ? this.findTrackByLanguage(language) : null;
    const track =
      remembered ?? tracks.find((t) => t.default) ?? tracks[0] ?? null;
    if (track) {
      this.selectTextTrack(track.id, origin);
      this.showFeedback('captions', track.label);
    }
  }

  selectAudioTrack(id: string, origin: AndesPlayerChangeOrigin = 'api'): void {
    const track = this.audioTracks().find((t) => t.id === id);
    const media = this._media();
    if (!track || !media) {
      return;
    }
    if (this._adapterAudioTracks().length > 0) {
      this.adapter?.selectAudioTrack?.(id);
      this._activeAudioTrackId.set(id);
    } else {
      const list = nativeAudioTracks(media);
      if (list) {
        for (let index = 0; index < list.length; index++) {
          list[index].enabled = this.nativeAudioId(list[index], index) === id;
        }
      }
      this._activeAudioTrackId.set(id);
    }
    if (ANNOUNCED_ORIGINS.has(origin)) {
      this.announce(this.labels().announceAudioTrack(track.label));
    }
  }

  /** Picks a rendition, or `'auto'` to let the adapter choose. */
  selectQuality(
    id: string | 'auto',
    origin: AndesPlayerChangeOrigin = 'api',
  ): void {
    if (!this.adapter?.selectQuality) {
      return;
    }
    if (id !== 'auto' && !this._qualities().some((q) => q.id === id)) {
      return;
    }
    this.adapter.selectQuality(id);
    this._autoQuality.set(id === 'auto');
    if (id !== 'auto') {
      this._activeQualityId.set(id);
    }
    if (ANNOUNCED_ORIGINS.has(origin)) {
      this.announce(this.labels().announceQuality(this.qualityLabel(id)));
    }
  }

  /** The visible name of a rendition id (or `auto`). */
  qualityLabel(id: string | 'auto' | null): string {
    const labels = this.labels();
    if (id === 'auto' || id === null) {
      const current = this.activeQuality();
      return current
        ? labels.qualityAutoWith(this.renditionLabel(current))
        : labels.qualityAuto;
    }
    const rendition = this._qualities().find((q) => q.id === id);
    return rendition ? this.renditionLabel(rendition) : id;
  }

  renditionLabel(rendition: AndesQualityRendition): string {
    return (
      rendition.label ??
      (rendition.height ? `${rendition.height}p` : rendition.id)
    );
  }

  // ---- hotkeys --------------------------------------------------------------------------------

  /**
   * Runs the hotkey for a key event, if any, and reports whether it handled it (the caller then
   * prevents the default). Keys that belong to a text field, menu, slider or button are skipped.
   */
  handleKeydown(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || isKeyOwnedByTarget(event)) {
      return false;
    }
    const hit = resolveHotkey(event, this.keyMap());
    if (!hit) {
      return false;
    }
    const handled = this.runHotkey(hit.action, hit.key);
    if (handled) {
      this.notifyActivity();
    }
    return handled;
  }

  /** Performs a hotkey action. Returns `false` when it does not apply right now. */
  runHotkey(action: AndesPlayerHotkeyAction, key = ''): boolean {
    const config = this.config();
    const origin: AndesPlayerChangeOrigin = 'hotkey';
    switch (action) {
      case 'togglePlay': {
        // Feedback shows the requested state; the media events confirm it a moment later.
        const willPlay = this._paused() || this._ended();
        this.togglePaused(origin);
        this.showFeedback(willPlay ? 'play' : 'pause');
        return true;
      }
      case 'toggleMute': {
        const willMute = !this.effectivelyMuted();
        this.toggleMuted(origin);
        this.showFeedback(
          willMute ? 'mute' : 'volume',
          willMute
            ? undefined
            : this.percentText(Math.max(this._volume(), 0.5)),
        );
        return true;
      }
      case 'toggleFullscreen':
        if (!this.fullscreenSupported()) {
          return false;
        }
        void this.toggleFullscreen(origin);
        return true;
      case 'exitFullscreen':
        if (!this._fullscreen()) {
          return false;
        }
        void this.exitFullscreen(origin);
        return true;
      case 'seekBackward':
      case 'seekForward':
      case 'seekBackwardLarge':
      case 'seekForwardLarge': {
        if (!this.canSeek()) {
          return false;
        }
        const large = action.endsWith('Large');
        const step = large ? config.seekStepLarge : config.seekStep;
        const sign = action.startsWith('seekForward') ? 1 : -1;
        this.seekBy(sign * step, origin);
        this.showFeedback(
          sign > 0 ? 'seek-forward' : 'seek-backward',
          this.labels().seekOffset(sign * step),
          sign > 0 ? 'end' : 'start',
        );
        return true;
      }
      case 'seekToStart':
      case 'seekToEnd':
        if (!this.canSeek()) {
          return false;
        }
        if (action === 'seekToEnd' && this.isLive()) {
          this.seekToLive(origin);
        } else {
          this.seekToFraction(action === 'seekToStart' ? 0 : 1, origin);
        }
        return true;
      case 'seekToPercent': {
        const digit = Number(key);
        if (!this.canSeek() || !Number.isInteger(digit)) {
          return false;
        }
        this.seekToFraction(digit / 10, origin);
        return true;
      }
      case 'volumeUp':
      case 'volumeDown':
        if (!this.volumeSupported()) {
          return false;
        }
        {
          const delta = action === 'volumeUp' ? 0.05 : -0.05;
          const base = this.effectivelyMuted() ? 0 : this._volume();
          const target = clamp(base + delta, 0, 1);
          this.changeVolumeBy(delta, origin);
          this.showFeedback(
            target === 0 ? 'mute' : 'volume',
            this.percentText(target),
          );
          return true;
        }
      case 'slower':
      case 'faster':
        this.stepPlaybackRate(action === 'faster' ? 1 : -1, origin);
        return true;
      case 'toggleCaptions':
        if (this.textTracks().length === 0) {
          return false;
        }
        this.toggleCaptions(origin);
        return true;
      case 'togglePictureInPicture':
        if (!this.pictureInPictureSupported()) {
          return false;
        }
        void this.togglePictureInPicture(origin);
        return true;
    }
  }

  // ---- activity, menus, feedback, announcements ---------------------------------------------------

  /** Pointer, touch or keyboard activity: show the controls and restart the hide timer. */
  notifyActivity(): void {
    this._userActive.set(true);
    this.clearActivityTimer();
    const delay = this.config().autohide;
    if (delay > 0 && this.isBrowser) {
      this.activityTimer = setTimeout(() => {
        this.activityTimer = null;
        this._userActive.set(false);
      }, delay);
    }
  }

  /** Hides the controls now (a tap on visible controls, or the pointer leaving the player). */
  hideControls(): void {
    this.clearActivityTimer();
    this._userActive.set(false);
  }

  /** Called by menus while they are open; an open menu keeps the controls visible. */
  setMenuOpen(open: boolean): void {
    this._openMenus.update((count) => Math.max(0, count + (open ? 1 : -1)));
    if (!open) {
      this.notifyActivity();
    }
  }

  /** Called by the seek slider while dragging (`null` when the drag ends). */
  setScrubTime(time: number | null): void {
    this._scrubTime.set(time);
  }

  showFeedback(
    kind: AndesPlayerFeedbackKind,
    text?: string,
    side?: 'start' | 'end',
  ): void {
    this._feedback.set({ kind, text, side, id: ++this.feedbackId });
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    if (this.isBrowser) {
      this.feedbackTimer = setTimeout(() => {
        this.feedbackTimer = null;
        this._feedback.set(null);
      }, FEEDBACK_MS);
    }
  }

  /** Puts a message in the player's live region. */
  announce(text: string): void {
    if (text) {
      this._announcement.set({ text, id: ++this.announcementId });
    }
  }

  /** The volume as a percentage text (`60%`). */
  volumeText(): string {
    return this.percentText(this._muted() ? 0 : this._volume());
  }

  private percentText(volume: number): string {
    return `${Math.round(volume * 100)}%`;
  }

  /** A video frame as an image blob (`null` when unavailable or the video is cross-origin). */
  async captureFrame(
    type = 'image/png',
    quality?: number,
  ): Promise<Blob | null> {
    const video = this._media() as HTMLVideoElement | null;
    if (!video || !this.isBrowser || !video.videoWidth) {
      return null;
    }
    try {
      const canvas = this.document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        return null;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), type, quality),
      );
    } catch {
      return null;
    }
  }

  // ---- internals: loading ---------------------------------------------------------------------

  private chooseAdapter(
    sources: readonly AndesMediaSource[],
  ): { adapter: AndesMediaAdapter; source: AndesMediaSource } | null {
    const view = this.document.defaultView;
    const candidates = pickSource(sources, (query) => {
      try {
        return view?.matchMedia?.(query).matches ?? true;
      } catch {
        return true;
      }
    });
    const factories = this.config().adapters ?? this.registeredAdapters;
    for (const source of candidates) {
      for (const factory of factories) {
        const adapter = this.adapterFor(factory);
        if (adapter && this.safeCanPlay(adapter, source)) {
          return { adapter, source };
        }
      }
      if (this.safeCanPlay(this.nativeAdapter, source)) {
        return { adapter: this.nativeAdapter, source };
      }
    }
    // Nothing claims it: let the browser try the first one and report its own error.
    return candidates[0]
      ? { adapter: this.nativeAdapter, source: candidates[0] }
      : null;
  }

  private adapterFor(
    factory: AndesMediaAdapterFactory,
  ): AndesMediaAdapter | null {
    let adapter = this.adapterInstances.get(factory);
    if (!adapter) {
      try {
        adapter = factory();
      } catch {
        return null;
      }
      this.adapterInstances.set(factory, adapter);
    }
    return adapter;
  }

  private safeCanPlay(
    adapter: AndesMediaAdapter,
    source: AndesMediaSource,
  ): boolean {
    try {
      return adapter.canPlay(source);
    } catch {
      return false;
    }
  }

  private afterAttach(token: number): void {
    if (token !== this.loadToken) {
      return;
    }
    const media = this._media();
    if (media) {
      this.syncFromMedia(media);
    }
    const config = this.config();
    const wanted = config.autoplay || this.pendingPlay;
    this.pendingPlay = false;
    if (wanted && !(config.background && this.reducedMotion())) {
      void this.attemptAutoplay(token);
    }
  }

  private async attemptAutoplay(token: number): Promise<void> {
    const media = this._media();
    if (!media) {
      return;
    }
    this.origins.set('play', 'media');
    const first = await this.tryPlay(media);
    if (token !== this.loadToken || first === 'played') {
      return;
    }
    if (first === 'not-allowed' && !media.muted) {
      // Sound was refused: try again muted and offer an unmute affordance.
      this.origins.set('mute', 'media');
      media.muted = true;
      const second = await this.tryPlay(media);
      if (token !== this.loadToken) {
        return;
      }
      if (second === 'played') {
        this._autoplayMuted.set(true);
        return;
      }
      media.muted = false;
    }
    this.origins.delete('play');
    if (first !== 'aborted') {
      this._autoplayBlocked.set(true);
    }
  }

  private async tryPlay(media: HTMLMediaElement): Promise<PlayAttempt> {
    try {
      const result = media.play() as Promise<void> | undefined;
      if (result && typeof result.then === 'function') {
        await result;
      }
      return 'played';
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      if (name === 'NotAllowedError') {
        return 'not-allowed';
      }
      return name === 'AbortError' ? 'aborted' : 'failed';
    }
  }

  private createHooks(token: number): AndesMediaAdapterHooks {
    const current = () => token === this.loadToken && !this.destroyed;
    return {
      setQualities: (renditions) =>
        current() && this._qualities.set([...renditions]),
      setActiveQuality: (id, auto) => {
        if (current()) {
          this._activeQualityId.set(id);
          this._autoQuality.set(auto);
        }
      },
      setAudioTracks: (tracks) =>
        current() && this._adapterAudioTracks.set([...tracks]),
      setActiveAudioTrack: (id) =>
        current() && this._activeAudioTrackId.set(id),
      setTextTracks: (tracks) => {
        if (current()) {
          this._adapterTextTracks.set([...tracks]);
          this.restoreCaptionChoice();
        }
      },
      setActiveTextTrack: (id) => current() && this._activeTextTrackId.set(id),
      setLive: (info) => current() && this._live.set(info),
      reportError: (error) => current() && this.reportAdapterError(error),
    };
  }

  private reportAdapterError(error: AndesAdapterError): void {
    if (error.fatal === false) {
      return;
    }
    const detail =
      error.detail ??
      (error.cause instanceof Error ? error.cause.message : undefined);
    this._error.set(
      createPlayerError(error.code ?? 'adapter', this.labels(), {
        detail,
        cause: error.cause,
      }),
    );
    this._waiting.set(false);
    this.announce(this.labels().announceError(this._error()?.message ?? ''));
  }

  private detachAdapter(): void {
    const adapter = this.adapter;
    this.adapter = null;
    if (!adapter) {
      return;
    }
    try {
      adapter.detach();
    } catch {
      // A failing teardown must not keep the next source from loading.
    }
    if (adapter !== this.nativeAdapter) {
      const media = this._media();
      media?.removeAttribute('src');
    }
  }

  private resetPlaybackState(): void {
    this._paused.set(true);
    this._ended.set(false);
    this._currentTime.set(0);
    this._duration.set(Number.NaN);
    this._buffered.set([]);
    this._seekable.set([]);
    this._readyState.set(0);
    this._waiting.set(false);
    this._stalled.set(false);
    this._seeking.set(false);
    this._error.set(null);
    this._started.set(false);
    this._metadataLoaded.set(false);
    this._videoWidth.set(0);
    this._videoHeight.set(0);
    this._source.set(null);
    this._adapterName.set(null);
    this._qualities.set([]);
    this._activeQualityId.set(null);
    this._autoQuality.set(true);
    this._adapterAudioTracks.set([]);
    this._adapterTextTracks.set([]);
    this._live.set(null);
    this._autoplayMuted.set(false);
    this._autoplayBlocked.set(false);
    this._scrubTime.set(null);
    this.origins.clear();
  }

  // ---- internals: media events -----------------------------------------------------------------

  private listen(media: HTMLMediaElement): void {
    const on = (
      target: EventTarget,
      type: string,
      handler: (event: Event) => void,
      capture = false,
    ) => {
      target.addEventListener(type, handler, capture);
      this.mediaCleanup.push(() =>
        target.removeEventListener(type, handler, capture),
      );
    };

    on(media, 'play', () => {
      this._paused.set(false);
      this._ended.set(false);
      this._started.set(true);
      this._autoplayBlocked.set(false);
      this.announceOrigin('play', () => this.labels().announcePlaying);
    });
    on(media, 'playing', () => {
      this._paused.set(false);
      this._waiting.set(false);
      this._stalled.set(false);
      this._started.set(true);
    });
    on(media, 'pause', () => {
      this._paused.set(true);
      if (!media.ended) {
        this.announceOrigin('pause', () => this.labels().announcePaused);
      }
    });
    on(media, 'ended', () => {
      this._ended.set(true);
      this._paused.set(true);
      this._waiting.set(false);
      this.announce(this.labels().announceEnded);
    });
    on(media, 'waiting', () => this._waiting.set(true));
    on(media, 'stalled', () => this._stalled.set(true));
    on(media, 'seeking', () => this._seeking.set(true));
    on(media, 'seeked', () => {
      this._seeking.set(false);
      this.origins.delete('seek');
      this.syncTime(media);
    });
    on(media, 'timeupdate', () => this.onTimeUpdate(media));
    on(media, 'durationchange', () => this.syncDuration(media));
    on(media, 'loadedmetadata', () => this.onLoadedMetadata(media));
    on(media, 'loadeddata', () => this._readyState.set(media.readyState));
    on(media, 'canplay', () => {
      this._readyState.set(media.readyState);
      this._waiting.set(false);
    });
    on(media, 'canplaythrough', () => this._readyState.set(media.readyState));
    on(media, 'progress', () => this.syncRanges(media));
    on(media, 'volumechange', () => this.onVolumeChange(media));
    on(media, 'ratechange', () => {
      this._playbackRate.set(media.playbackRate);
      const origin = this.consumeOrigin('rate');
      if (ANNOUNCED_ORIGINS.has(origin)) {
        this.announce(
          this.labels().announceRate(this.rateLabel(media.playbackRate)),
        );
      }
    });
    on(media, 'error', () => this.onMediaError(media));
    on(media, 'emptied', () => {
      this._readyState.set(media.readyState);
      this.syncRanges(media);
    });
    on(media, 'enterpictureinpicture', () => this.setPictureInPicture(true));
    on(media, 'leavepictureinpicture', () => this.setPictureInPicture(false));
    on(media, 'webkitbeginfullscreen', () => this.setFullscreen(true));
    on(media, 'webkitendfullscreen', () => this.setFullscreen(false));
    // `<track>` load events do not bubble; catch them on the way down.
    on(media, 'load', () => this.readTextTracks(media), true);

    const textTracks = media.textTracks;
    if (textTracks && typeof textTracks.addEventListener === 'function') {
      on(textTracks, 'addtrack', () => this.readTextTracks(media));
      on(textTracks, 'removetrack', () => this.readTextTracks(media));
    }
    const audioTracks = nativeAudioTracks(media);
    if (audioTracks && typeof audioTracks.addEventListener === 'function') {
      on(audioTracks, 'addtrack', () => this.readAudioTracks(media));
      on(audioTracks, 'removetrack', () => this.readAudioTracks(media));
      on(audioTracks, 'change', () => this.readAudioTracks(media));
    }
    on(this.document, 'fullscreenchange', () => this.syncDocumentFullscreen());
    on(this.document, 'webkitfullscreenchange', () =>
      this.syncDocumentFullscreen(),
    );
  }

  private syncFromMedia(media: HTMLMediaElement): void {
    this._paused.set(media.paused);
    this._ended.set(media.ended);
    this._volume.set(media.volume);
    this._muted.set(media.muted);
    this._playbackRate.set(media.playbackRate);
    this._readyState.set(media.readyState);
    this.syncTime(media);
    this.syncDuration(media);
    this.syncRanges(media);
    this.readTextTracks(media);
    this.readAudioTracks(media);
  }

  private syncTime(media: HTMLMediaElement): void {
    const time = media.currentTime;
    this._currentTime.set(Number.isFinite(time) ? time : 0);
    // Seeking to the end while paused ends the media without an `ended` event.
    this._ended.set(Boolean(media.ended));
  }

  private syncDuration(media: HTMLMediaElement): void {
    this._duration.set(media.duration);
    this.syncRanges(media);
  }

  private syncRanges(media: HTMLMediaElement): void {
    this._buffered.set(readTimeRanges(media.buffered));
    this._seekable.set(readTimeRanges(media.seekable));
  }

  private onTimeUpdate(media: HTMLMediaElement): void {
    this.syncTime(media);
    this.syncRanges(media);
    const loop = this.config().loopRange;
    if (loop && loop[1] > loop[0] && media.currentTime >= loop[1]) {
      try {
        media.currentTime = loop[0];
      } catch {
        // Not seekable yet.
      }
    }
    this.updatePositionState(media);
  }

  private onLoadedMetadata(media: HTMLMediaElement): void {
    this._metadataLoaded.set(true);
    this._readyState.set(media.readyState);
    const video = media as HTMLVideoElement;
    this._videoWidth.set(video.videoWidth ?? 0);
    this._videoHeight.set(video.videoHeight ?? 0);
    this.syncDuration(media);
    this.readTextTracks(media);
    this.readAudioTracks(media);
    const start = this.pendingStartTime;
    this.pendingStartTime = null;
    if (start !== null && start > 0) {
      try {
        media.currentTime = start;
        this._currentTime.set(start);
      } catch {
        // Not seekable: start from the beginning.
      }
    }
  }

  private onVolumeChange(media: HTMLMediaElement): void {
    const wasMuted = this._muted();
    this._volume.set(media.volume);
    this._muted.set(media.muted);
    if (!media.muted) {
      this._autoplayMuted.set(false);
    }
    const muteOrigin =
      wasMuted !== media.muted ? this.consumeOrigin('mute') : null;
    const volumeOrigin = this.consumeOrigin('volume');
    const labels = this.labels();
    if (muteOrigin && ANNOUNCED_ORIGINS.has(muteOrigin)) {
      this.announce(
        media.muted ? labels.announceMuted : labels.announceUnmuted,
      );
    } else if (ANNOUNCED_ORIGINS.has(volumeOrigin)) {
      this.announceDebounced('volume', () =>
        labels.announceVolume(
          Math.round((this._muted() ? 0 : this._volume()) * 100),
        ),
      );
    }
  }

  private onMediaError(media: HTMLMediaElement): void {
    // Errors from an emptied element (no source) or from a `<track>` are not playback errors.
    if (!media.error || !this._source()) {
      return;
    }
    this._error.set(playerErrorFromMedia(media, this.labels()));
    this._waiting.set(false);
    this.announce(this.labels().announceError(this._error()?.message ?? ''));
  }

  // ---- internals: text and audio tracks -------------------------------------------------------

  private readTextTracks(media: HTMLMediaElement): void {
    const list = media.textTracks;
    if (!list) {
      return;
    }
    const tracks: AndesTextTrackInfo[] = [];
    const chapterTracks: TextTrack[] = [];
    for (let index = 0; index < list.length; index++) {
      const track = list[index];
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        const element = media.querySelectorAll?.('track')?.[index] as
          HTMLTrackElement | undefined;
        tracks.push({
          id: `track-${index}`,
          kind: track.kind,
          label: track.label || track.language || `${index + 1}`,
          language: track.language,
          default: element?.default ?? false,
        });
      } else if (track.kind === 'chapters') {
        chapterTracks.push(track);
      }
    }
    const previous = this._nativeTextTracks();
    const changed =
      previous.length !== tracks.length ||
      previous.some(
        (track, index) =>
          track.id !== tracks[index].id ||
          track.language !== tracks[index].language ||
          track.label !== tracks[index].label,
      );
    if (changed) {
      this._nativeTextTracks.set(tracks);
    }
    this.readChapters(chapterTracks);
    if (changed || this._activeTextTrackId() === null) {
      this.restoreCaptionChoice();
    } else {
      this.applyTextTrack(this._activeTextTrackId());
    }
  }

  private readChapters(tracks: readonly TextTrack[]): void {
    const chapters: AndesChapter[] = [];
    for (const track of tracks) {
      if (track.mode === 'disabled') {
        // Cues only load once the track is at least hidden.
        track.mode = 'hidden';
      }
      const cues = track.cues;
      if (!cues) {
        continue;
      }
      const list: { start: number; end: number; text: string }[] = [];
      for (let index = 0; index < cues.length; index++) {
        const cue = cues[index] as TextTrackCue & { text?: string };
        list.push({
          start: cue.startTime,
          end: cue.endTime,
          text: cue.text ?? '',
        });
      }
      chapters.push(...chaptersFromCues(list));
    }
    if (
      !sameList(
        chapters.map((c) => `${c.start}:${c.title}`),
        this._trackChapters().map((c) => `${c.start}:${c.title}`),
      )
    ) {
      this._trackChapters.set(chapters);
    }
  }

  private findTrackByLanguage(language: string): AndesTextTrackInfo | null {
    const tracks = this.textTracks();
    const lower = language.toLowerCase();
    return (
      tracks.find((t) => t.language.toLowerCase() === lower) ??
      tracks.find((t) => t.label === language) ??
      tracks.find(
        (t) => t.language.toLowerCase().split('-')[0] === lower.split('-')[0],
      ) ??
      null
    );
  }

  /** After the track list changes: the remembered choice, else the default track, else off. */
  private restoreCaptionChoice(): void {
    const preference = this.captionPreference;
    let track: AndesTextTrackInfo | null = null;
    if (typeof preference === 'string') {
      track = this.findTrackByLanguage(preference);
    } else if (preference === undefined) {
      track = this.textTracks().find((t) => t.default) ?? null;
    }
    this.applyTextTrack(track?.id ?? null);
  }

  private applyTextTrack(id: string | null): void {
    this._activeTextTrackId.set(id);
    const media = this._media();
    const adapterTrack = this._adapterTextTracks().some((t) => t.id === id);
    if (this._adapterTextTracks().length > 0) {
      this.adapter?.selectTextTrack?.(adapterTrack ? id : null);
    }
    this.captionTrackCleanup?.();
    this.captionTrackCleanup = null;
    this._activeCues.set([]);
    const list = media?.textTracks;
    if (!list) {
      return;
    }
    const renderer = this.config().captionsRenderer;
    for (let index = 0; index < list.length; index++) {
      const track = list[index];
      if (track.kind !== 'subtitles' && track.kind !== 'captions') {
        continue;
      }
      const active = !adapterTrack && `track-${index}` === id;
      const mode: TextTrackMode = active
        ? renderer === 'native'
          ? 'showing'
          : 'hidden'
        : 'disabled';
      if (track.mode !== mode) {
        track.mode = mode;
      }
      if (active && renderer === 'overlay') {
        const update = () => {
          const cues = track.activeCues;
          const next: TextTrackCue[] = [];
          for (let cue = 0; cues && cue < cues.length; cue++) {
            next.push(cues[cue]);
          }
          this._activeCues.set(next);
        };
        track.addEventListener?.('cuechange', update);
        this.captionTrackCleanup = () =>
          track.removeEventListener?.('cuechange', update);
        update();
      }
    }
  }

  private nativeAudioId(track: { id: string }, index: number): string {
    return track.id || `audio-${index}`;
  }

  private readAudioTracks(media: HTMLMediaElement): void {
    const list = nativeAudioTracks(media);
    if (!list) {
      return;
    }
    const tracks: AndesAudioTrackInfo[] = [];
    let active: string | null = null;
    for (let index = 0; index < list.length; index++) {
      const track = list[index];
      const id = this.nativeAudioId(track, index);
      tracks.push({
        id,
        label: track.label || track.language || `${index + 1}`,
        language: track.language,
        kind: track.kind,
      });
      if (track.enabled) {
        active = id;
      }
    }
    this._nativeAudioTracks.set(tracks);
    if (this._adapterAudioTracks().length === 0) {
      this._activeAudioTrackId.set(active);
    }
  }

  // ---- internals: display modes ---------------------------------------------------------------

  private syncDocumentFullscreen(): void {
    const element = fullscreenElement(this.document);
    const container = this._container();
    this.setFullscreen(Boolean(element && container && element === container));
  }

  private setFullscreen(active: boolean): void {
    if (this._fullscreen() === active) {
      return;
    }
    this._fullscreen.set(active);
    if (!active && this.orientationLocked) {
      this.orientationLocked = false;
      unlockOrientation(this.document.defaultView);
    }
    const origin = this.consumeOrigin('fullscreen');
    if (ANNOUNCED_ORIGINS.has(origin)) {
      this.announce(this.labels().announceFullscreen(active));
    }
  }

  private setPictureInPicture(active: boolean): void {
    this._pictureInPicture.set(active);
    const origin = this.consumeOrigin('pip');
    if (ANNOUNCED_ORIGINS.has(origin)) {
      this.announce(this.labels().announcePictureInPicture(active));
    }
  }

  private async lockLandscape(): Promise<void> {
    if (!this.config().orientationLock) {
      return;
    }
    const view = this.document.defaultView;
    const touch = view?.matchMedia?.('(pointer: coarse)').matches ?? false;
    const landscape = this._videoWidth() >= this._videoHeight();
    if (touch && landscape) {
      this.orientationLocked = await lockOrientation(view, 'landscape');
    }
  }

  private watchRemotePlayback(media: HTMLMediaElement): void {
    if (this.remoteHandler) {
      return;
    }
    const remote = media.remote;
    if (remote && typeof remote.watchAvailability === 'function') {
      remote
        .watchAvailability((available) => this._remoteAvailable.set(available))
        .then((id) => {
          this.mediaCleanup.push(() => {
            remote.cancelWatchAvailability?.(id)?.catch?.(() => undefined);
          });
        })
        .catch(() => this._remoteAvailable.set(false));
      const syncState = () =>
        this._remoteState.set(remote.state as AndesRemotePlaybackState);
      for (const type of ['connecting', 'connect', 'disconnect']) {
        remote.addEventListener?.(type, syncState);
        this.mediaCleanup.push(() =>
          remote.removeEventListener?.(type, syncState),
        );
      }
      return;
    }
    if (hasPlaybackTargetPicker(media)) {
      const onAvailability = (event: Event) =>
        this._remoteAvailable.set(
          (event as Event & { availability?: string }).availability ===
            'available',
        );
      media.addEventListener(
        'webkitplaybacktargetavailabilitychanged',
        onAvailability,
      );
      this.mediaCleanup.push(() =>
        media.removeEventListener(
          'webkitplaybacktargetavailabilitychanged',
          onAvailability,
        ),
      );
    }
  }

  // ---- internals: preferences ------------------------------------------------------------------

  private loadPreferences(key: string | null): void {
    this.preferencesKey = key;
    this.preferences = key ? readPlayerPreferences(key) : {};
    this.lastPersisted = '';
    if (this.preferences.captionLanguage !== undefined) {
      this.captionPreference = this.preferences.captionLanguage;
      this.lastCaptionLanguage =
        this.preferences.captionLanguage ?? this.lastCaptionLanguage;
    }
    const media = this._media();
    if (media) {
      this.applyPreferences(media);
      this.restoreCaptionChoice();
    }
  }

  private applyPendingMedia(media: HTMLMediaElement): void {
    const pending = this.pendingMedia;
    this.pendingMedia = {};
    try {
      if (pending.volume !== undefined) {
        media.volume = pending.volume;
      }
      if (pending.muted !== undefined) {
        media.muted = pending.muted;
      }
      if (pending.rate !== undefined) {
        media.playbackRate = pending.rate;
        media.defaultPlaybackRate = pending.rate;
      }
    } catch {
      // A value the element rejects keeps the element's own.
    }
  }

  private applyPreferences(media: HTMLMediaElement): void {
    const preferences = this.preferences;
    try {
      if (preferences.volume !== undefined) {
        media.volume = preferences.volume;
      }
      if (preferences.muted !== undefined && !this.background()) {
        media.muted = preferences.muted;
      }
      if (preferences.playbackRate !== undefined) {
        media.playbackRate = preferences.playbackRate;
        media.defaultPlaybackRate = preferences.playbackRate;
      }
    } catch {
      // A value the element rejects is simply not restored.
    }
  }

  private probeCapabilities(media: HTMLMediaElement): void {
    const video = media as HTMLVideoElement;
    this.capabilities.set({
      fullscreen:
        fullscreenEnabled(this.document) || videoFullscreen(media).supported,
      pictureInPicture:
        Boolean(this.document.pictureInPictureEnabled) &&
        typeof video.requestPictureInPicture === 'function' &&
        !video.disablePictureInPicture,
    });
  }

  private probeVolumeSupport(): boolean {
    try {
      const probe = this.document.createElement('audio');
      probe.volume = 0.5;
      return Math.abs(probe.volume - 0.5) < 0.01;
    } catch {
      return false;
    }
  }

  private async fetchThumbnails(
    src: string,
    signal?: AbortSignal,
  ): Promise<void> {
    if (typeof fetch !== 'function') {
      return;
    }
    try {
      const response = await fetch(src, { signal });
      if (!response.ok) {
        return;
      }
      const text = await response.text();
      if (!signal?.aborted) {
        this._fetchedThumbnails.set(thumbnailsFromVtt(parseVtt(text), src));
      }
    } catch {
      // No previews: the seek tooltip still shows the time.
    }
  }

  // ---- internals: Media Session -------------------------------------------------------------------

  private syncMediaSession(playing: boolean, config: AndesPlayerConfig): void {
    const session = this.mediaSession();
    if (!session || !config.mediaSession || !playing) {
      return;
    }
    this.mediaSessionOwned = true;
    const metadata = config.metadata ?? {};
    try {
      if (typeof MediaMetadata === 'function') {
        session.metadata = new MediaMetadata({
          title: metadata.title ?? config.title ?? '',
          artist: metadata.artist ?? '',
          album: metadata.album ?? '',
          artwork: (metadata.artwork ?? []).map((art) => ({ ...art })),
        });
      }
    } catch {
      // Metadata is a nicety; a browser that rejects it still plays.
    }
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ['play', () => void this.play('api')],
      ['pause', () => this.pause('api')],
      [
        'seekbackward',
        (d) => this.seekBy(-(d.seekOffset ?? config.seekStepLarge)),
      ],
      ['seekforward', (d) => this.seekBy(d.seekOffset ?? config.seekStepLarge)],
      ['seekto', (d) => d.seekTime !== undefined && this.seek(d.seekTime)],
      [
        'previoustrack',
        config.skipControls ? () => this.skipRequests.next(-1) : null,
      ],
      [
        'nexttrack',
        config.skipControls ? () => this.skipRequests.next(1) : null,
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Unsupported action in this browser.
      }
    }
  }

  private updatePositionState(media: HTMLMediaElement): void {
    const session = this.mediaSession();
    if (!session || !this.mediaSessionOwned) {
      return;
    }
    const now = Date.now();
    if (now - this.lastPositionUpdate < 1000) {
      return;
    }
    this.lastPositionUpdate = now;
    const duration = media.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }
    try {
      session.setPositionState?.({
        duration,
        playbackRate: media.playbackRate || 1,
        position: clamp(media.currentTime, 0, duration),
      });
    } catch {
      // Inconsistent values are rejected; the next update corrects them.
    }
  }

  private mediaSession(): MediaSession | null {
    if (!this.isBrowser) {
      return null;
    }
    const navigatorRef = this.document.defaultView?.navigator;
    return navigatorRef && 'mediaSession' in navigatorRef
      ? navigatorRef.mediaSession
      : null;
  }

  // ---- internals: misc -------------------------------------------------------------------------

  private consumeOrigin(kind: OriginKind): AndesPlayerChangeOrigin {
    const origin = this.origins.get(kind) ?? 'media';
    this.origins.delete(kind);
    return origin;
  }

  private announceOrigin(kind: OriginKind, message: () => string): void {
    if (ANNOUNCED_ORIGINS.has(this.consumeOrigin(kind))) {
      this.announce(message());
    }
  }

  private announceDebounced(key: string, message: () => string): void {
    const pending = this.announceTimers.get(key);
    if (pending) {
      clearTimeout(pending);
    }
    if (!this.isBrowser) {
      return;
    }
    this.announceTimers.set(
      key,
      setTimeout(() => {
        this.announceTimers.delete(key);
        this.announce(message());
      }, ANNOUNCE_DEBOUNCE_MS),
    );
  }

  private clearActivityTimer(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
  }

  private detachMedia(): void {
    this.mediaCleanup.forEach((cleanup) => cleanup());
    this.mediaCleanup = [];
    this.captionTrackCleanup?.();
    this.captionTrackCleanup = null;
  }

  private destroy(): void {
    this.destroyed = true;
    this.loadToken++;
    this.detachAdapter();
    this.detachMedia();
    this.clearActivityTimer();
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.announceTimers.forEach((timer) => clearTimeout(timer));
    this.announceTimers.clear();
    if (this.orientationLocked) {
      unlockOrientation(this.document.defaultView);
    }
    if (this.mediaSessionOwned) {
      const session = this.mediaSession();
      try {
        if (session) {
          session.metadata = null;
        }
      } catch {
        // Nothing to clean up.
      }
    }
    this.skipRequests.complete();
  }
}
