import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { AndesMediaAdapterFactory } from '../core/media-adapter';
import type { AndesPlayerKeyMap } from '../core/player-hotkeys';
import type { AndesPlayerLabelOverrides } from '../core/player-labels';
import type { AndesPlayerStore } from '../core/player-store';
import { ANDES_CAPTION_STYLE_DEFAULT } from '../core/caption-style';
import type {
  AndesCaptionStyle,
  AndesCaptionsRenderer,
  AndesChapter,
  AndesMediaSource,
  AndesMediaTrack,
  AndesPlayerControls,
  AndesPlayerError,
  AndesPlayerHotkeysMode,
  AndesPlayerRepeat,
  AndesPlayerResume,
  AndesPlaylistItem,
  AndesQualityRendition,
  AndesStreamType,
  AndesTextTrackInfo,
  AndesThumbnailsConfig,
} from '../core/player-types';
import { AndesVideoPlayer } from '../video-player';
import { fakeOf, type FakeMedia } from './fake-media';

/** A host that binds every input the specs touch to a signal, and records every output. */
@Component({
  imports: [AndesVideoPlayer],
  template: `
    <andes-video-player
      [src]="src()"
      [sources]="sources()"
      [tracks]="tracks()"
      [poster]="poster()"
      [title]="title()"
      [autoplay]="autoplay()"
      [controls]="controls()"
      [autohide]="autohide()"
      [audioOnly]="audioOnly()"
      [background]="background()"
      [hotkeys]="hotkeys()"
      [keyMap]="keyMap()"
      [labels]="labels()"
      [persistKey]="persistKey()"
      [adapters]="adapters()"
      [thumbnails]="thumbnails()"
      [chapters]="chapters()"
      [startTime]="startTime()"
      [aspectRatio]="aspectRatio()"
      [streamType]="streamType()"
      [loopRange]="loopRange()"
      [captionsRenderer]="captionsRenderer()"
      [gestures]="gestures()"
      [playbackRates]="rates()"
      [skipControls]="skipControls()"
      [compact]="compact()"
      [playlist]="playlist()"
      [autoAdvance]="autoAdvance()"
      [upNextDelay]="upNextDelay()"
      [resume]="resume()"
      [retryAttempts]="retryAttempts()"
      [frameRate]="frameRate()"
      [preservesPitch]="preservesPitch()"
      [miniPlayer]="miniPlayer()"
      [contextMenu]="contextMenu()"
      [loop]="loop()"
      [(playlistIndex)]="playlistIndex"
      [(repeat)]="repeat"
      [(shuffle)]="shuffle"
      [(captionStyle)]="captionStyle"
      [(currentTime)]="currentTime"
      [(volume)]="volume"
      [(muted)]="muted"
      [(paused)]="paused"
      [(playbackRate)]="rate"
      (played)="events.push('played')"
      (completed)="events.push('completed')"
      (failed)="errors.push($event)"
      (metadataLoaded)="events.push('metadata:' + $event.duration)"
      (bufferingChanged)="events.push('buffering:' + $event)"
      (fullscreenChanged)="events.push('fullscreen:' + $event)"
      (pictureInPictureChanged)="events.push('pip:' + $event)"
      (captionsChanged)="captions.push($event)"
      (qualityChanged)="qualities.push($event)"
      (previousRequested)="events.push('previous')"
      (nextRequested)="events.push('next')"
      (playlistCompleted)="events.push('playlist-completed')"
    >
      @if (customControls()) {
        <div slot="controls" class="custom-controls">custom</div>
      }
    </andes-video-player>
  `,
})
export class PlayerHost {
  readonly src = signal<string | null>('media/clip.mp4');
  readonly sources = signal<readonly AndesMediaSource[]>([]);
  readonly tracks = signal<readonly AndesMediaTrack[]>([]);
  readonly poster = signal<string | null>(null);
  readonly title = signal<string | null>('Test clip');
  readonly autoplay = signal(false);
  readonly controls = signal<AndesPlayerControls>('default');
  readonly autohide = signal(3000);
  readonly audioOnly = signal(false);
  readonly background = signal(false);
  readonly hotkeys = signal<AndesPlayerHotkeysMode>('focus');
  readonly keyMap = signal<Partial<AndesPlayerKeyMap> | null>(null);
  readonly labels = signal<AndesPlayerLabelOverrides | null>(null);
  readonly persistKey = signal<string | null>(null);
  readonly adapters = signal<readonly AndesMediaAdapterFactory[] | null>(null);
  readonly thumbnails = signal<AndesThumbnailsConfig | null>(null);
  readonly chapters = signal<readonly AndesChapter[] | null>(null);
  readonly startTime = signal(0);
  readonly aspectRatio = signal('16/9');
  readonly streamType = signal<AndesStreamType | 'auto'>('auto');
  readonly loopRange = signal<readonly [number, number] | null>(null);
  readonly captionsRenderer = signal<AndesCaptionsRenderer>('overlay');
  readonly gestures = signal(true);
  readonly rates = signal<readonly number[]>([0.5, 1, 1.5, 2]);
  readonly skipControls = signal(false);
  readonly compact = signal(false);
  readonly customControls = signal(false);
  readonly playlist = signal<readonly AndesPlaylistItem[]>([]);
  readonly autoAdvance = signal(true);
  readonly upNextDelay = signal(5);
  readonly resume = signal<AndesPlayerResume>('prompt');
  readonly retryAttempts = signal(3);
  readonly frameRate = signal(30);
  readonly preservesPitch = signal(true);
  readonly miniPlayer = signal(false);
  readonly contextMenu = signal(true);
  readonly loop = signal(false);
  readonly playlistIndex = signal(0);
  readonly repeat = signal<AndesPlayerRepeat>('off');
  readonly shuffle = signal(false);
  readonly captionStyle = signal<AndesCaptionStyle>(
    ANDES_CAPTION_STYLE_DEFAULT,
  );
  readonly currentTime = signal(0);
  readonly volume = signal(1);
  readonly muted = signal(false);
  readonly paused = signal(true);
  readonly rate = signal(1);
  readonly events: string[] = [];
  readonly errors: AndesPlayerError[] = [];
  readonly captions: (AndesTextTrackInfo | null)[] = [];
  readonly qualities: (AndesQualityRendition | null)[] = [];
}

type HostInputs = {
  [K in keyof PlayerHost]?: PlayerHost[K] extends { set(value: infer V): void }
    ? V
    : never;
};

export interface RenderedPlayer {
  readonly fixture: ReturnType<typeof TestBed.createComponent<PlayerHost>>;
  readonly host: PlayerHost;
  readonly player: AndesVideoPlayer;
  readonly store: AndesPlayerStore;
  readonly el: HTMLElement;
  /** The current media element and its fake. */
  media(): HTMLMediaElement;
  fake(): FakeMedia;
  /** Change detection plus effects and render hooks. */
  render(): void;
  q(selector: string): HTMLElement | null;
  q<T extends Element>(selector: string): T | null;
  qa(selector: string): HTMLElement[];
  qa<T extends Element>(selector: string): T[];
  /** Metadata + can-play on the current fake, then a render. */
  ready(duration?: number): void;
}

/** Renders the player inside {@link PlayerHost} with the given inputs. */
export function renderPlayer(inputs: HostInputs = {}): RenderedPlayer {
  const fixture = TestBed.createComponent(PlayerHost);
  const host = fixture.componentInstance;
  for (const [name, value] of Object.entries(inputs)) {
    (host[name as keyof PlayerHost] as { set(v: unknown): void }).set(value);
  }
  const render = () => {
    fixture.detectChanges();
    TestBed.tick();
  };
  render();
  const debug = fixture.debugElement.query(
    (node) => node.componentInstance instanceof AndesVideoPlayer,
  );
  const player = debug.componentInstance as AndesVideoPlayer;
  const el = debug.nativeElement as HTMLElement;
  const media = () => el.querySelector('video, audio') as HTMLMediaElement;
  return {
    fixture,
    host,
    player,
    store: player.store,
    el,
    media,
    fake: () => fakeOf(media()),
    render,
    q: <T extends Element>(selector: string) =>
      el.querySelector(selector) as T | null,
    qa: <T extends Element>(selector: string) =>
      Array.from(el.querySelectorAll(selector)) as T[],
    ready(duration = 120) {
      const fake = fakeOf(media());
      fake.loadMetadata(duration);
      fake.canPlay();
      render();
    },
  };
}

/** The value, or a test failure when it is missing (instead of a non-null assertion). */
export function req<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
}

/** Lets pending promise callbacks run (works under fake timers too). */
export async function settle(rounds = 12): Promise<void> {
  for (let index = 0; index < rounds; index++) {
    await Promise.resolve();
  }
}

/** A keydown that also carries the legacy `keyCode` the CDK key managers read. */
export function keydown(
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const codes: Record<string, number> = {
    ArrowUp: 38,
    ArrowDown: 40,
    ArrowLeft: 37,
    ArrowRight: 39,
    Home: 36,
    End: 35,
    PageUp: 33,
    PageDown: 34,
    Enter: 13,
    Escape: 27,
    Tab: 9,
    ' ': 32,
  };
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, 'keyCode', {
    value: codes[key] ?? key.toUpperCase().charCodeAt(0),
  });
  target.dispatchEvent(event);
  return event;
}

/** Dispatches a pointer event (jsdom lacks the PointerEvent constructor in some versions). */
export function pointer(
  target: EventTarget,
  type: string,
  init: {
    clientX?: number;
    clientY?: number;
    pointerType?: string;
    pointerId?: number;
    button?: number;
  } = {},
): Event {
  const event = new MouseEvent(type, {
    // Like the real events, enter/leave do not bubble.
    bubbles: type !== 'pointerenter' && type !== 'pointerleave',
    cancelable: true,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    button: init.button ?? 0,
  });
  Object.defineProperty(event, 'pointerType', {
    value: init.pointerType ?? 'mouse',
  });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  target.dispatchEvent(event);
  return event;
}

/** Gives an element a layout box for pointer maths. */
export function mockRect(
  element: Element,
  rect: { left?: number; top?: number; width: number; height?: number },
): void {
  const left = rect.left ?? 0;
  const top = rect.top ?? 0;
  const height = rect.height ?? 20;
  element.getBoundingClientRect = () =>
    ({
      left,
      top,
      width: rect.width,
      height,
      right: left + rect.width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** A `matchMedia` stub answering the given queries as matching. */
export function stubMatchMedia(matching: readonly string[]): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: matching.some((entry) => query.includes(entry)),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}
