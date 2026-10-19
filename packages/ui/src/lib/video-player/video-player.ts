import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  PLATFORM_ID,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { andesElementSize } from '@andes-ng/primitives';

import {
  AndesPlayerControlBar,
  type AndesPlayerBarLayout,
} from './control-bar';
import { safeMatches } from './core/browser';
import type { AndesMediaAdapterFactory } from './core/media-adapter';
import { resolveMimeType } from './core/media-adapter';
import {
  type AndesPlayerKeyMap,
  mergeKeyMap,
  ariaKeyShortcuts,
} from './core/player-hotkeys';
import type { AndesPlayerLabels } from './core/player-labels';
import {
  ANDES_PLAYER_DEFAULT_CONFIG,
  type AndesPlayerConfig,
  AndesPlayerStore,
} from './core/player-store';
import type {
  AndesCaptionsRenderer,
  AndesChapter,
  AndesMediaSource,
  AndesMediaTrack,
  AndesPlayerAspectRatio,
  AndesPlayerControls,
  AndesPlayerError,
  AndesPlayerHotkeysMode,
  AndesPlayerMetadata,
  AndesPlayerObjectFit,
  AndesPlayerSize,
  AndesPlayerSkin,
  AndesQualityRendition,
  AndesStreamType,
  AndesTextTrackInfo,
  AndesThumbnailsConfig,
} from './core/player-types';
import {
  AndesPlayerBigPlayButton,
  AndesPlayerPlayButton,
  AndesPlayerUnmuteButton,
} from './parts/buttons';
import {
  AndesPlayerAnnouncer,
  AndesPlayerBufferingIndicator,
  AndesPlayerCaptionsDisplay,
  AndesPlayerErrorPanel,
  AndesPlayerFeedbackIndicator,
  AndesPlayerPoster,
  AndesPlayerTitle,
} from './parts/displays';

/** What `metadataLoaded` reports. */
export interface AndesPlayerMetadataEvent {
  readonly duration: number;
  readonly videoWidth: number;
  readonly videoHeight: number;
}

const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 12;
const CHROME_SELECTOR = '.andes-video-player__chrome, andes-player-control-bar';

function parseAspectRatio(value: string): string | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*[/:x]\s*(\d+(?:\.\d+)?)\s*$/.exec(value);
  return match ? `${match[1]} / ${match[2]}` : null;
}

function sameSources(
  a: readonly AndesMediaSource[],
  b: readonly AndesMediaSource[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (source, index) =>
        source.src === b[index].src &&
        source.type === b[index].type &&
        source.media === b[index].media,
    )
  );
}

/**
 * A complete, accessible media player for video and audio, on demand and live.
 *
 * One element gives a working player: native `<video>`/`<audio>` underneath, a poster and big
 * play button, an auto-hiding control bar (seek bar with buffered ranges, chapters and
 * thumbnails; volume; time; captions; a settings menu with speed, captions, audio track and
 * quality; picture-in-picture; casting; fullscreen), keyboard shortcuts, touch gestures and a
 * polite live region. Every control is also a standalone part (`andes-player-*`) that reads
 * the player's `AndesPlayerStore`: set `controls="none"` and project your own arrangement.
 *
 * Adaptive streams play through an adapter (see `AndesMediaAdapter`); without one the player
 * plays what the browser plays natively. The look is driven only by `--andes-video-*` custom
 * properties and the Andes tokens.
 */
@Component({
  selector: 'andes-video-player',
  imports: [
    AndesPlayerControlBar,
    AndesPlayerPoster,
    AndesPlayerCaptionsDisplay,
    AndesPlayerBufferingIndicator,
    AndesPlayerFeedbackIndicator,
    AndesPlayerBigPlayButton,
    AndesPlayerUnmuteButton,
    AndesPlayerPlayButton,
    AndesPlayerTitle,
    AndesPlayerErrorPanel,
    AndesPlayerAnnouncer,
  ],
  templateUrl: './video-player.html',
  styleUrls: [
    './video-player.css',
    './player-controls.css',
    './player-overlays.css',
  ],
  // The parts render in this component's tree and in apps' own templates (custom control
  // layouts), so the stylesheet is global and every selector is scoped under an
  // `andes-video-player` / `andes-player-` class instead.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AndesPlayerStore],
  host: {
    class: 'andes-video-player',
    '[attr.role]': 'decorative() ? null : "region"',
    '[attr.aria-label]': 'decorative() ? null : regionLabel()',
    '[attr.aria-hidden]': 'decorative() ? "true" : null',
    '[attr.aria-busy]': 'store.buffering() ? "true" : null',
    '[attr.aria-keyshortcuts]': 'keyShortcuts()',
    // `title` is an input: a static `title="..."` would also stay on the element as a native
    // attribute, and the browser's own tooltip would float over the picture (and linger after
    // the controls hide). The title is shown in the title bar and named in `aria-label`.
    '[attr.title]': 'null',
    '[style.--andes-video-bar-block-size.px]': 'barSize.height()',
    '[attr.tabindex]': 'focusable() ? 0 : null',
    '[attr.data-state]': 'playbackState()',
    '[attr.data-layout]': 'layoutMode()',
    '[attr.data-controls]': 'controls()',
    '[attr.data-controls-visible]': 'store.controlsVisible() ? "" : null',
    '[attr.data-idle]': 'idle() ? "" : null',
    '[attr.data-size]': 'size()',
    '[attr.data-density]': 'compact() ? "compact" : "default"',
    '[attr.data-skin]': 'skin()',
    '[attr.data-fullscreen]': 'store.fullscreen() ? "" : null',
    '[attr.data-stream]': 'store.streamType()',
    '[attr.data-started]': 'store.started() ? "" : null',
    '[attr.data-captions]': 'store.activeCues().length > 0 ? "" : null',
    '[attr.data-error]': 'store.error() ? "" : null',
    '[style.aspect-ratio]': 'resolvedAspectRatio()',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class AndesVideoPlayer {
  /** The player's state and actions; parts and apps drive the player through it. */
  readonly store = inject(AndesPlayerStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ---- source ----------------------------------------------------------------------------------

  /** One media URL (its type is inferred from the extension). Ignored when `sources` is set. */
  readonly src = input<string | null>(null);
  /** Alternative sources; the first one that matches its `media` query and can play wins. */
  readonly sources = input<readonly AndesMediaSource[]>([]);
  /** `<track>` elements: subtitles, captions, chapters. */
  readonly tracks = input<readonly AndesMediaTrack[]>([]);
  /** Poster image, or cover art in audio-only mode. */
  readonly poster = input<string | null>(null);
  readonly title = input<string | null>(null);
  /** Media Session metadata (artist, album, artwork); `title` falls back to `title`. */
  readonly metadata = input<AndesPlayerMetadata | null>(null);
  readonly autoplay = input(false, { transform: booleanAttribute });
  readonly loop = input(false, { transform: booleanAttribute });
  readonly preload = input<'none' | 'metadata' | 'auto'>('metadata');
  readonly crossOrigin = input<'anonymous' | 'use-credentials' | null>(null);
  readonly playsInline = input(true, { transform: booleanAttribute });
  /** Where playback starts, seconds. */
  readonly startTime = input(0, { transform: numberAttribute });
  /** Adapter factories for this player, tried before the native adapter. */
  readonly adapters = input<readonly AndesMediaAdapterFactory[] | null>(null);
  /** `auto` detects on-demand / live / live with DVR; set it when the stream says otherwise. */
  readonly streamType = input<AndesStreamType | 'auto'>('auto');
  /** How close to the live edge counts as live, seconds. */
  readonly liveEdgeTolerance = input(10, { transform: numberAttribute });

  // ---- two-way state -------------------------------------------------------------------------

  readonly currentTime = model(0);
  readonly volume = model(1);
  readonly muted = model(false);
  readonly paused = model(true);
  readonly playbackRate = model(1);

  // ---- presentation --------------------------------------------------------------------------

  /** `default` bar, `minimal` one-row bar, or `none` (compose your own parts). */
  readonly controls = input<AndesPlayerControls>('default');
  /** Milliseconds of inactivity before the controls hide; `0` keeps them up. */
  readonly autohide = input(3000, { transform: numberAttribute });
  readonly size = input<AndesPlayerSize>('md');
  /** Smaller controls for tight spaces (24/32px). */
  readonly compact = input(false, { transform: booleanAttribute });
  /** Frosted overlay (`glass`) or opaque (`solid`) controls. */
  readonly skin = input<AndesPlayerSkin>('glass');
  /** `16/9`, `4/3`, `1/1`, `9/16`... or `auto` (the video's own ratio once known). */
  readonly aspectRatio = input<AndesPlayerAspectRatio>('16/9');
  readonly objectFit = input<AndesPlayerObjectFit>('contain');
  /** An `<audio>` element and a compact bar, with the poster as cover art. */
  readonly audioOnly = input(false, { transform: booleanAttribute });
  /**
   * Decorative ambient video: muted, looping, autoplaying, no chrome and hidden from assistive
   * tech (unless `controls` is not `none`, which adds a pause toggle). Holds still under
   * reduced motion.
   */
  readonly background = input(false, { transform: booleanAttribute });
  readonly captionsRenderer = input<AndesCaptionsRenderer>('overlay');
  /** Storyboard previews for the seek bar. */
  readonly thumbnails = input<AndesThumbnailsConfig | null>(null);
  /** Chapters given as data (otherwise read from a `chapters` track). */
  readonly chapters = input<readonly AndesChapter[] | null>(null);
  readonly playbackRates = input<readonly number[]>(
    ANDES_PLAYER_DEFAULT_CONFIG.playbackRates,
  );
  readonly seekStep = input(5, { transform: numberAttribute });
  readonly seekStepLarge = input(10, { transform: numberAttribute });
  /** Replays `[start, end]` seconds in a loop. */
  readonly loopRange = input<readonly [number, number] | null>(null);

  // ---- behaviour -----------------------------------------------------------------------------

  /** Hotkeys while focus is in the player (`focus`), page-wide (`global`), or `off`. */
  readonly hotkeys = input<AndesPlayerHotkeysMode>('focus');
  /** Overrides for the hotkey map (an empty list turns an action off). */
  readonly keyMap = input<Partial<AndesPlayerKeyMap> | null>(null);
  /** Click/tap/double-tap gestures on the picture. */
  readonly gestures = input(true, { transform: booleanAttribute });
  /** Overrides for the visible and accessible strings. */
  readonly labels = input<Partial<AndesPlayerLabels> | null>(null);
  /** Remembers volume, mute, speed and caption language under this key (opt-in). */
  readonly persistKey = input<string | null>(null);
  readonly mediaSession = input(true, { transform: booleanAttribute });
  /** Offers previous/next in the system media controls (see the `previousRequested` outputs). */
  readonly skipControls = input(false, { transform: booleanAttribute });
  readonly remotePlayback = input(true, { transform: booleanAttribute });
  readonly pictureInPicture = input(true, { transform: booleanAttribute });
  /** Locks phones to landscape in fullscreen for landscape video. */
  readonly orientationLock = input(true, { transform: booleanAttribute });

  // ---- outputs (named apart from the native media events) -------------------------------------

  readonly played = output<void>();
  readonly completed = output<void>();
  readonly failed = output<AndesPlayerError>();
  readonly metadataLoaded = output<AndesPlayerMetadataEvent>();
  readonly bufferingChanged = output<boolean>();
  readonly fullscreenChanged = output<boolean>();
  readonly pictureInPictureChanged = output<boolean>();
  readonly captionsChanged = output<AndesTextTrackInfo | null>();
  readonly qualityChanged = output<AndesQualityRendition | null>();
  readonly previousRequested = output<void>();
  readonly nextRequested = output<void>();

  private readonly mediaRef = viewChild<ElementRef<HTMLMediaElement>>('media');
  private readonly bottomRef = viewChild<ElementRef<HTMLElement>>('bottom');
  /** Height of the control bar area (the solid skin centres the big play above it). */
  protected readonly barSize = andesElementSize(this.bottomRef, {
    box: 'border-box',
  });

  private readonly resolvedSources = computed<readonly AndesMediaSource[]>(
    () => {
      const sources = this.sources();
      if (sources.length > 0) {
        return sources;
      }
      const src = this.src();
      return src ? [{ src, type: resolveMimeType(src, this.audioOnly()) }] : [];
    },
    { equal: sameSources },
  );

  private readonly config = computed<AndesPlayerConfig>(() => {
    const background = this.background();
    return {
      labels: this.labels(),
      keyMap: mergeKeyMap(this.keyMap()),
      seekStep: this.seekStep(),
      seekStepLarge: this.seekStepLarge(),
      playbackRates: this.playbackRates(),
      autohide: this.autohide(),
      controls:
        background && this.controls() === 'default' ? 'none' : this.controls(),
      audioOnly: this.audioOnly(),
      background,
      autoplay: this.autoplay() || background,
      startTime: this.startTime(),
      streamType: this.streamType(),
      liveEdgeTolerance: this.liveEdgeTolerance(),
      captionsRenderer: this.captionsRenderer(),
      persistKey: this.persistKey(),
      title: this.title(),
      poster: this.poster(),
      metadata: this.metadata(),
      mediaSession: this.mediaSession() && !background,
      skipControls: this.skipControls(),
      thumbnails: this.thumbnails(),
      chapters: this.chapters(),
      adapters: this.adapters(),
      loopRange: this.loopRange(),
      orientationLock: this.orientationLock(),
    };
  });

  /** Background mode with no controls is decoration only. */
  protected readonly decorative = computed(
    () => this.background() && this.controls() !== 'minimal',
  );
  protected readonly layoutMode = computed(() =>
    this.background() ? 'background' : this.audioOnly() ? 'audio' : 'video',
  );
  protected readonly barLayout = computed<AndesPlayerBarLayout | null>(() => {
    if (this.background() || this.controls() === 'none') {
      return null;
    }
    if (this.audioOnly()) {
      return 'audio';
    }
    return this.controls() === 'minimal' ? 'minimal' : 'default';
  });
  protected readonly regionLabel = computed(() => {
    const labels = this.store.labels();
    const name = this.audioOnly() ? labels.audioPlayer : labels.videoPlayer;
    const title = this.store.title();
    return title ? `${name}: ${title}` : name;
  });
  protected readonly focusable = computed(
    () => !this.decorative() && this.hotkeys() === 'focus',
  );
  protected readonly keyShortcuts = computed(() => {
    if (this.decorative() || this.hotkeys() === 'off') {
      return null;
    }
    const keyMap = this.store.keyMap();
    const actions = [
      'togglePlay',
      'toggleMute',
      'toggleFullscreen',
      'toggleCaptions',
    ] as const;
    const value = actions
      .map((action) => ariaKeyShortcuts(keyMap, action))
      .filter(Boolean)
      .join(' ');
    return value || null;
  });
  protected readonly playbackState = computed(() => {
    if (this.store.error()) {
      return 'error';
    }
    if (this.store.ended()) {
      return 'ended';
    }
    return this.store.paused() ? 'paused' : 'playing';
  });
  /** Playing with the chrome hidden: the cursor hides too. */
  protected readonly idle = computed(
    () =>
      !this.store.controlsVisible() &&
      !this.store.paused() &&
      !this.audioOnly(),
  );
  /** Background video fills its box unless an object fit was chosen explicitly. */
  protected readonly resolvedObjectFit = computed(() =>
    this.background() && this.objectFit() === 'contain'
      ? 'cover'
      : this.objectFit(),
  );
  protected readonly resolvedAspectRatio = computed(() => {
    if (this.audioOnly() || this.store.fullscreen()) {
      return null;
    }
    const ratio = this.aspectRatio();
    if (ratio === 'auto') {
      const width = this.store.videoWidth();
      const height = this.store.videoHeight();
      return width > 0 && height > 0 ? `${width} / ${height}` : '16 / 9';
    }
    return parseAspectRatio(ratio);
  });

  private readonly modelWrites = new Map<string, unknown>();
  private lastTap: { time: number; zone: 'start' | 'center' | 'end' } | null =
    null;
  private tapStart: {
    x: number;
    y: number;
    time: number;
    type: string;
  } | null = null;
  private lastPointerType = 'mouse';
  private controlsBeforeTap: boolean | null = null;

  constructor() {
    this.store.connect(this.config);

    const size = andesElementSize(this.host, { box: 'border-box' });
    effect(() => {
      this.store.containerHeight.set(size.height());
      this.store.containerWidth.set(size.width());
    });

    // The rendered media element (it changes between <video> and <audio>).
    effect(() => {
      const media = this.mediaRef()?.nativeElement;
      if (media && this.isBrowser) {
        untracked(() => this.store.attach(media, this.host.nativeElement));
      }
    });

    // (Re)load whenever the sources or the element change.
    effect(() => {
      const sources = this.resolvedSources();
      const media = this.store.media();
      if (media) {
        untracked(() => this.store.load(sources));
      }
    });

    // Background mode is always muted.
    effect(() => {
      if (this.background()) {
        untracked(() => this.store.setMuted(true));
      }
    });

    this.syncModel(
      'currentTime',
      this.currentTime,
      this.store.currentTime,
      (time) => this.store.seek(time),
      // Playback moves the time on its own; only a real jump from the app is a seek.
      (a, b) => Math.abs(a - b) < 0.5,
    );
    this.syncModel('volume', this.volume, this.store.volume, (value) =>
      this.store.setVolume(value),
    );
    this.syncModel('muted', this.muted, this.store.muted, (value) => {
      // Background video stays muted whatever the binding says.
      if (!this.background()) {
        this.store.setMuted(value);
      }
    });
    this.syncModel('paused', this.paused, this.store.paused, (value) =>
      value ? this.store.pause() : void this.store.play(),
    );
    this.syncModel(
      'playbackRate',
      this.playbackRate,
      this.store.playbackRate,
      (value) => this.store.setPlaybackRate(value),
    );

    this.emitOnChange(this.store.paused, (paused) => {
      if (!paused) {
        this.played.emit();
      }
    });
    this.emitOnChange(this.store.ended, (ended) => {
      if (ended) {
        this.completed.emit();
      }
    });
    this.emitOnChange(this.store.error, (error) => {
      if (error) {
        this.failed.emit(error);
      }
    });
    this.emitOnChange(this.store.metadataLoaded, (loaded) => {
      if (loaded) {
        this.metadataLoaded.emit({
          duration: this.store.duration(),
          videoWidth: this.store.videoWidth(),
          videoHeight: this.store.videoHeight(),
        });
      }
    });
    this.emitOnChange(this.store.buffering, (busy) =>
      this.bufferingChanged.emit(busy),
    );
    this.emitOnChange(this.store.fullscreen, (on) =>
      this.fullscreenChanged.emit(on),
    );
    this.emitOnChange(this.store.pictureInPicture, (on) =>
      this.pictureInPictureChanged.emit(on),
    );
    this.emitOnChange(this.store.activeTextTrack, (track) =>
      this.captionsChanged.emit(track),
    );
    this.emitOnChange(
      computed(() =>
        this.store.autoQuality() ? null : this.store.activeQuality(),
      ),
      (quality) => this.qualityChanged.emit(quality),
    );
    this.store.skipRequests.subscribe((direction) =>
      direction < 0 ? this.previousRequested.emit() : this.nextRequested.emit(),
    );

    // Page-wide hotkeys (opt-in).
    effect((onCleanup) => {
      if (this.hotkeys() !== 'global' || !this.isBrowser || this.decorative()) {
        return;
      }
      const onKeydown = (event: KeyboardEvent) => {
        const target = event.target as Element | null;
        const owner = target?.closest?.('andes-video-player');
        if (owner && owner !== this.host.nativeElement) {
          return;
        }
        if (this.store.handleKeydown(event)) {
          event.preventDefault();
        }
      };
      this.document.addEventListener('keydown', onKeydown);
      onCleanup(() => this.document.removeEventListener('keydown', onKeydown));
    });
  }

  // ---- imperative API --------------------------------------------------------------------------

  /** Starts playback; resolves `false` when the browser refused. */
  play(): Promise<boolean> {
    return this.store.play('api');
  }

  pause(): void {
    this.store.pause('api');
  }

  togglePlay(): void {
    this.store.togglePaused('api');
  }

  /** Reloads the current source. */
  load(): void {
    this.store.reload();
  }

  seek(time: number): void {
    this.store.seek(time, 'api');
  }

  seekBy(seconds: number): void {
    this.store.seekBy(seconds, 'api');
  }

  /** Clears an error and reloads where playback left off. */
  retry(): void {
    this.store.retry();
  }

  enterFullscreen(): Promise<boolean> {
    return this.store.enterFullscreen('api');
  }

  exitFullscreen(): Promise<void> {
    return this.store.exitFullscreen('api');
  }

  enterPictureInPicture(): Promise<boolean> {
    return this.store.enterPictureInPicture('api');
  }

  exitPictureInPicture(): Promise<void> {
    return this.store.exitPictureInPicture('api');
  }

  /** The current video frame as an image (`null` for cross-origin video without CORS). */
  captureFrame(type?: string, quality?: number): Promise<Blob | null> {
    return this.store.captureFrame(type, quality);
  }

  /** Moves focus to the player (its hotkeys then apply). */
  focus(): void {
    this.host.nativeElement.focus();
  }

  // ---- events --------------------------------------------------------------------------------

  protected onPointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.store.notifyActivity();
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && !this.store.paused()) {
      this.store.hideControls();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.decorative()) {
      return;
    }
    this.store.notifyActivity();
    if (this.hotkeys() === 'focus' && this.store.handleKeydown(event)) {
      event.preventDefault();
    }
  }

  protected onFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || target === this.host.nativeElement) {
      return;
    }
    const inChrome = Boolean(target.closest?.(CHROME_SELECTOR));
    this.store.keyboardFocusInside.set(
      inChrome && safeMatches(target, ':focus-visible'),
    );
    this.store.notifyActivity();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.nativeElement.contains(next)) {
      this.store.keyboardFocusInside.set(false);
    }
  }

  /** Gesture surface: taps, clicks and double taps on the picture itself. */
  protected onSurfacePointerDown(event: PointerEvent): void {
    this.lastPointerType = event.pointerType || 'mouse';
    this.tapStart = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      type: this.lastPointerType,
    };
  }

  protected onSurfacePointerUp(event: PointerEvent): void {
    const start = this.tapStart;
    this.tapStart = null;
    if (
      !start ||
      !this.gestures() ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > TAP_SLOP_PX || Date.now() - start.time > 600) {
      return;
    }
    if (start.type === 'touch') {
      this.onTap(event);
    } else {
      this.togglePlayWithFeedback();
    }
  }

  protected onSurfaceDoubleClick(): void {
    if (
      !this.gestures() ||
      this.lastPointerType === 'touch' ||
      this.audioOnly()
    ) {
      return;
    }
    void this.store.toggleFullscreen('gesture');
  }

  private onTap(event: PointerEvent): void {
    const surface = event.currentTarget as HTMLElement | null;
    const rect = surface?.getBoundingClientRect();
    const fraction =
      rect && rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0.5;
    // Zones follow the time axis (left = back) in every writing direction.
    const zone =
      fraction < 1 / 3 ? 'start' : fraction > 2 / 3 ? 'end' : 'center';
    const now = Date.now();
    const previous = this.lastTap;

    if (
      previous &&
      now - previous.time < DOUBLE_TAP_MS &&
      previous.zone === zone
    ) {
      this.lastTap = { time: now, zone };
      if (this.controlsBeforeTap !== null) {
        // Undo the first tap's show/hide: a double tap is a seek (or play/pause), not a toggle.
        if (this.controlsBeforeTap) {
          this.store.notifyActivity();
        } else {
          this.store.hideControls();
        }
      }
      this.doubleTap(zone);
      return;
    }

    this.lastTap = { time: now, zone };
    this.controlsBeforeTap = this.store.controlsVisible();
    if (
      this.store.controlsVisible() &&
      this.store.started() &&
      !this.store.paused()
    ) {
      this.store.hideControls();
    } else {
      this.store.notifyActivity();
    }
  }

  private doubleTap(zone: 'start' | 'center' | 'end'): void {
    if (zone === 'center' || !this.store.canSeek()) {
      this.togglePlayWithFeedback();
      return;
    }
    const step = this.seekStepLarge() * (zone === 'end' ? 1 : -1);
    this.store.seekBy(step, 'gesture');
    this.store.showFeedback(
      zone === 'end' ? 'seek-forward' : 'seek-backward',
      this.store.labels().seekOffset(step),
      zone,
    );
  }

  // ---- helpers -------------------------------------------------------------------------------

  private togglePlayWithFeedback(): void {
    const willPlay = this.store.paused() || this.store.ended();
    this.store.togglePaused('gesture');
    this.store.showFeedback(willPlay ? 'play' : 'pause');
  }

  /** Keeps a two-way `model()` and its store signal in step without echoing writes back. */
  private syncModel<T>(
    key: string,
    value: { (): T; set(next: T): void },
    source: () => T,
    write: (next: T) => void,
    equal: (a: T, b: T) => boolean = Object.is,
  ): void {
    let first = true;
    effect(() => {
      const next = source();
      untracked(() => {
        // The first run would overwrite the app's initial binding with the store's default.
        if (first) {
          first = false;
          return;
        }
        if (!Object.is(value(), next)) {
          this.modelWrites.set(key, next);
          value.set(next);
        }
      });
    });
    effect(() => {
      const next = value();
      untracked(() => {
        if (
          this.modelWrites.has(key) &&
          Object.is(this.modelWrites.get(key), next)
        ) {
          return;
        }
        this.modelWrites.delete(key);
        if (!equal(next, source())) {
          write(next);
        }
      });
    });
  }

  /** Emits after the first change of a signal (never for its initial value). */
  private emitOnChange<T>(source: () => T, emit: (value: T) => void): void {
    let initialized = false;
    let previous: T;
    effect(() => {
      const value = source();
      untracked(() => {
        if (initialized && !Object.is(previous, value)) {
          emit(value);
        }
        initialized = true;
        previous = value;
      });
    });
  }
}
