/**
 * FakeMedia: a minimal `HTMLMediaElement` for jsdom, which has no media pipeline. Installing it
 * patches the prototype so every `<video>`/`<audio>` a component renders behaves like a media
 * element whose network and decoder the test drives by hand: set the duration, move the time,
 * report buffered ranges, fail with a `MediaError`, refuse `play()` like an autoplay policy...
 *
 * Property writes fire the same events a browser would (`volumechange`, `ratechange`,
 * `seeking`/`seeked`/`timeupdate`), synchronously, so a test can assert right after acting.
 *
 * Test-only: never imported by library code.
 */

/** How `play()` answers, like a browser autoplay policy. */
export type FakePlayPolicy = 'allow' | 'muted-only' | 'deny' | 'abort';

export interface FakeTextTrackInit {
  readonly kind: TextTrackKind;
  readonly label?: string;
  readonly language?: string;
  readonly cues?: readonly { start: number; end: number; text: string }[];
}

/** A `TextTrack` with settable cues and `cuechange` dispatch. */
export class FakeTextTrack extends EventTarget {
  mode: TextTrackMode = 'disabled';
  readonly kind: TextTrackKind;
  readonly label: string;
  readonly language: string;
  readonly id = '';
  private allCues: { startTime: number; endTime: number; text: string }[];
  activeCues: { startTime: number; endTime: number; text: string }[] = [];

  constructor(init: FakeTextTrackInit) {
    super();
    this.kind = init.kind;
    this.label = init.label ?? '';
    this.language = init.language ?? '';
    this.allCues = (init.cues ?? []).map((cue) => ({
      startTime: cue.start,
      endTime: cue.end,
      text: cue.text,
    }));
  }

  get cues(): ArrayLike<{
    startTime: number;
    endTime: number;
    text: string;
  }> | null {
    return this.mode === 'disabled' ? null : this.allCues;
  }

  /** Makes the cues covering `time` active and fires `cuechange`. */
  activateAt(time: number): void {
    this.activeCues = this.allCues.filter(
      (cue) => time >= cue.startTime && time < cue.endTime,
    );
    this.dispatchEvent(new Event('cuechange'));
  }
}

/** A `TextTrackList`: indexed, with `addtrack`/`removetrack` events. */
export class FakeTextTrackList extends EventTarget {
  private readonly tracks: FakeTextTrack[] = [];
  [index: number]: FakeTextTrack;

  get length(): number {
    return this.tracks.length;
  }

  add(track: FakeTextTrack): void {
    this[this.tracks.length] = track;
    this.tracks.push(track);
    this.dispatchEvent(new Event('addtrack'));
  }

  clear(): void {
    for (let index = 0; index < this.tracks.length; index++) {
      delete this[index];
    }
    this.tracks.length = 0;
    this.dispatchEvent(new Event('removetrack'));
  }
}

/** An `AudioTrackList` like the one some browsers expose. */
export class FakeAudioTrackList extends EventTarget {
  [index: number]: {
    id: string;
    kind: string;
    label: string;
    language: string;
    enabled: boolean;
  };
  length = 0;

  set(
    tracks: { id: string; label: string; language: string; enabled: boolean }[],
  ): void {
    tracks.forEach((track, index) => {
      this[index] = { kind: 'main', ...track };
    });
    this.length = tracks.length;
    this.dispatchEvent(new Event('addtrack'));
  }
}

function timeRanges(ranges: readonly [number, number][]): TimeRanges {
  return {
    length: ranges.length,
    start: (index: number) => ranges[index][0],
    end: (index: number) => ranges[index][1],
  };
}

/** The state behind one fake element, plus the controls a test uses. */
export class FakeMedia {
  paused = true;
  ended = false;
  time = 0;
  duration = Number.NaN;
  volume = 1;
  muted = false;
  playbackRate = 1;
  defaultPlaybackRate = 1;
  readyState = 0;
  networkState = 0;
  error: { code: number; message: string } | null = null;
  bufferedRanges: [number, number][] = [];
  seekableRanges: [number, number][] = [];
  videoWidth = 0;
  videoHeight = 0;
  policy: FakePlayPolicy = 'allow';
  preservesPitch = true;
  readonly textTracks = new FakeTextTrackList();
  audioTracks: FakeAudioTrackList | undefined;
  readonly calls = { play: 0, pause: 0, load: 0 };

  constructor(readonly element: HTMLMediaElement) {}

  emit(type: string): void {
    this.element.dispatchEvent(new Event(type));
  }

  /** Metadata arrives: duration, size, readiness. */
  loadMetadata(duration: number, width = 640, height = 360): void {
    this.duration = duration;
    this.videoWidth = width;
    this.videoHeight = height;
    this.readyState = 1;
    if (Number.isFinite(duration)) {
      this.seekableRanges = [[0, duration]];
    }
    this.emit('durationchange');
    this.emit('loadedmetadata');
  }

  /** Enough data to play. */
  canPlay(): void {
    this.readyState = 4;
    this.emit('loadeddata');
    this.emit('canplay');
  }

  /** Playback advanced to `time` (fires `timeupdate`). */
  advance(time: number): void {
    this.time = time;
    for (let index = 0; index < this.textTracks.length; index++) {
      const track = this.textTracks[index];
      if (track.mode !== 'disabled') {
        track.activateAt(time);
      }
    }
    this.emit('timeupdate');
  }

  buffer(ranges: [number, number][]): void {
    this.bufferedRanges = ranges;
    this.emit('progress');
  }

  /** A live stream: infinite duration and a moving seekable window. */
  goLive(windowStart: number, windowEnd: number): void {
    this.duration = Number.POSITIVE_INFINITY;
    this.seekableRanges = [[windowStart, windowEnd]];
    this.readyState = 1;
    this.emit('durationchange');
    this.emit('loadedmetadata');
  }

  waiting(): void {
    this.readyState = 2;
    this.emit('waiting');
  }

  finish(): void {
    this.time = Number.isFinite(this.duration) ? this.duration : this.time;
    this.paused = true;
    this.ended = true;
    this.emit('pause');
    this.emit('ended');
  }

  /** The element fails with a `MediaError` code (1-4). */
  fail(code: number, message = 'fake failure'): void {
    this.error = { code, message };
    this.emit('error');
  }

  addTextTrack(init: FakeTextTrackInit): FakeTextTrack {
    const track = new FakeTextTrack(init);
    this.textTracks.add(track);
    return track;
  }

  play(): Promise<void> {
    this.calls.play++;
    const refuse = (name: string) => {
      const error = new Error(`play() refused: ${name}`);
      error.name = name;
      return Promise.reject(error);
    };
    if (
      this.policy === 'deny' ||
      (this.policy === 'muted-only' && !this.muted)
    ) {
      return refuse('NotAllowedError');
    }
    if (this.policy === 'abort') {
      return refuse('AbortError');
    }
    if (this.ended) {
      this.time = 0;
      this.ended = false;
    }
    if (this.paused) {
      this.paused = false;
      this.emit('play');
      this.emit('playing');
    }
    return Promise.resolve();
  }

  pause(): void {
    this.calls.pause++;
    if (!this.paused) {
      this.paused = true;
      this.emit('pause');
    }
  }

  load(): void {
    this.calls.load++;
    this.time = 0;
    this.paused = true;
    this.ended = false;
    this.error = null;
    this.readyState = 0;
    this.duration = Number.NaN;
    this.bufferedRanges = [];
    this.seekableRanges = [];
    this.emit('emptied');
  }
}

const instances = new WeakMap<HTMLMediaElement, FakeMedia>();
const created: FakeMedia[] = [];

/** The fake behind an element (created on first touch). */
export function fakeOf(element: HTMLMediaElement): FakeMedia {
  let fake = instances.get(element);
  if (!fake) {
    fake = new FakeMedia(element);
    instances.set(element, fake);
    created.push(fake);
  }
  return fake;
}

/** Every fake created since the harness was installed, oldest first. */
export function allFakes(): readonly FakeMedia[] {
  return created;
}

type Accessor = {
  get: (fake: FakeMedia) => unknown;
  set?: (fake: FakeMedia, value: unknown) => void;
};

const ACCESSORS: Record<string, Accessor> = {
  paused: { get: (f) => f.paused },
  ended: { get: (f) => f.ended },
  duration: { get: (f) => f.duration },
  readyState: { get: (f) => f.readyState },
  networkState: { get: (f) => f.networkState },
  error: { get: (f) => f.error },
  videoWidth: { get: (f) => f.videoWidth },
  videoHeight: { get: (f) => f.videoHeight },
  buffered: { get: (f) => timeRanges(f.bufferedRanges) },
  seekable: { get: (f) => timeRanges(f.seekableRanges) },
  textTracks: { get: (f) => f.textTracks },
  audioTracks: { get: (f) => f.audioTracks },
  currentSrc: { get: (f) => f.element.getAttribute('src') ?? '' },
  currentTime: {
    get: (f) => f.time,
    set: (f, value) => {
      f.time = Number(value);
      f.ended = Number.isFinite(f.duration) && f.time >= f.duration;
      f.emit('seeking');
      f.emit('seeked');
      f.emit('timeupdate');
    },
  },
  volume: {
    get: (f) => f.volume,
    set: (f, value) => {
      const volume = Number(value);
      if (!(volume >= 0 && volume <= 1)) {
        throw new RangeError('volume out of range');
      }
      f.volume = volume;
      f.emit('volumechange');
    },
  },
  muted: {
    get: (f) => f.muted,
    set: (f, value) => {
      f.muted = Boolean(value);
      f.emit('volumechange');
    },
  },
  playbackRate: {
    get: (f) => f.playbackRate,
    set: (f, value) => {
      f.playbackRate = Number(value);
      f.emit('ratechange');
    },
  },
  defaultPlaybackRate: {
    get: (f) => f.defaultPlaybackRate,
    set: (f, value) => {
      f.defaultPlaybackRate = Number(value);
    },
  },
  preservesPitch: {
    get: (f) => f.preservesPitch,
    set: (f, value) => {
      f.preservesPitch = Boolean(value);
    },
  },
  src: {
    get: (f) => f.element.getAttribute('src') ?? '',
    set: (f, value) => f.element.setAttribute('src', String(value)),
  },
};

const METHODS: Record<
  string,
  (fake: FakeMedia, ...args: unknown[]) => unknown
> = {
  play: (f) => f.play(),
  pause: (f) => f.pause(),
  load: (f) => f.load(),
  canPlayType: (_f, type) =>
    /mp4|webm|ogg|mpeg|wav|aac/.test(String(type)) ? 'probably' : '',
};

/**
 * Patches `HTMLMediaElement.prototype` (and `HTMLVideoElement.prototype`'s size getters) so every
 * media element is a FakeMedia. Returns the function that restores the originals.
 */
export function installFakeMedia(): () => void {
  const targets: [object, string][] = [];
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const proto = HTMLMediaElement.prototype;
  const videoProto = HTMLVideoElement.prototype;

  for (const [name, accessor] of Object.entries(ACCESSORS)) {
    const target =
      name === 'videoWidth' || name === 'videoHeight' ? videoProto : proto;
    saved.set(
      `${target === videoProto ? 'v' : 'm'}:${name}`,
      Object.getOwnPropertyDescriptor(target, name),
    );
    targets.push([target, name]);
    Object.defineProperty(target, name, {
      configurable: true,
      get(this: HTMLMediaElement) {
        return accessor.get(fakeOf(this));
      },
      set(this: HTMLMediaElement, value: unknown) {
        accessor.set?.(fakeOf(this), value);
      },
    });
  }
  for (const [name, method] of Object.entries(METHODS)) {
    saved.set(`m:${name}`, Object.getOwnPropertyDescriptor(proto, name));
    targets.push([proto, name]);
    Object.defineProperty(proto, name, {
      configurable: true,
      writable: true,
      value(this: HTMLMediaElement, ...args: unknown[]) {
        return method(fakeOf(this), ...args);
      },
    });
  }
  created.length = 0;

  return () => {
    for (const [target, name] of targets) {
      const key = `${target === videoProto ? 'v' : 'm'}:${name}`;
      const descriptor = saved.get(key);
      if (descriptor) {
        Object.defineProperty(target, name, descriptor);
      } else {
        delete (target as Record<string, unknown>)[name];
      }
    }
    created.length = 0;
  };
}
