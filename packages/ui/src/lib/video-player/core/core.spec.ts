import {
  ariaKeyShortcuts,
  hotkeyHint,
  isKeyOwnedByTarget,
  matchesKey,
  mergeKeyMap,
  resolveHotkey,
  ANDES_PLAYER_DEFAULT_KEY_MAP,
} from './player-hotkeys';
import {
  ANDES_PLAYER_DEFAULT_LABELS,
  mergeAndesPlayerLabels,
  provideAndesPlayerLabels,
  ANDES_PLAYER_LABELS,
} from './player-labels';
import {
  AndesNativeMediaAdapter,
  isHlsType,
  pickSource,
  provideAndesMediaAdapters,
  resolveMimeType,
  ANDES_MEDIA_ADAPTERS,
} from './media-adapter';
import {
  createPlayerError,
  errorCodeFromMediaError,
  playerErrorFromMedia,
} from './player-errors';
import {
  readPlayerPreferences,
  writePlayerPreferences,
} from './player-preferences';
import {
  formatClock,
  formatRate,
  formatSpokenTime,
  formatTimeText,
} from './time-format';
import {
  chaptersFromCues,
  findTimed,
  parseVtt,
  parseVttTimestamp,
  resolveUrl,
  thumbnailsFromGrid,
  thumbnailsFromVtt,
} from './vtt';
import {
  readTimeRanges,
  safeMatches,
  videoFullscreen,
  nativeAudioTracks,
  lockOrientation,
  unlockOrientation,
  showPlaybackTargetPicker,
  hasPlaybackTargetPicker,
} from './browser';
import {
  provideAndesRemotePlayback,
  ANDES_REMOTE_PLAYBACK_HANDLER,
} from './remote-playback';
import { signal } from '@angular/core';

const key = (init: KeyboardEventInit, target?: Element) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, ...init });
  if (target) {
    Object.defineProperty(event, 'target', { value: target });
  }
  return event;
};

describe('time formatting', () => {
  it('formats clock times with and without hours', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(200)).toBe('3:20');
    expect(formatClock(3723)).toBe('1:02:03');
    expect(formatClock(59, true)).toBe('0:00:59');
    expect(formatClock(12.9)).toBe('0:12');
  });

  it('formats negative and non-finite clock times', () => {
    expect(formatClock(-32)).toBe('-0:32');
    expect(formatClock(-0.2)).toBe('0:00');
    expect(formatClock(Number.NaN)).toBe('0:00');
    expect(formatClock(Number.POSITIVE_INFINITY, true)).toBe('0:00:00');
  });

  it('spells times out for assistive tech with plurals', () => {
    const labels = ANDES_PLAYER_DEFAULT_LABELS;
    expect(formatSpokenTime(3723, labels)).toBe('1 hour 2 minutes 3 seconds');
    expect(formatSpokenTime(7260, labels)).toBe('2 hours 1 minute');
    expect(formatSpokenTime(1, labels)).toBe('1 second');
    expect(formatSpokenTime(0, labels)).toBe('0 seconds');
    expect(formatSpokenTime(Number.NaN, labels)).toBe('0 seconds');
  });

  it('returns both forms together and rounds rates', () => {
    expect(formatTimeText(65, ANDES_PLAYER_DEFAULT_LABELS)).toEqual({
      clock: '1:05',
      spoken: '1 minute 5 seconds',
    });
    expect(formatRate(1.2500001)).toBe('1.25');
    expect(formatRate(1)).toBe('1');
  });
});

describe('labels', () => {
  it('merges overrides over the defaults, errors per code', () => {
    const merged = mergeAndesPlayerLabels(
      { play: 'Reproducir', errors: { network: 'Red' } as never },
      null,
      { pause: 'Pausar' },
    );
    expect(merged.play).toBe('Reproducir');
    expect(merged.pause).toBe('Pausar');
    expect(merged.errors.network).toBe('Red');
    expect(merged.errors.decode).toBe(
      ANDES_PLAYER_DEFAULT_LABELS.errors.decode,
    );
  });

  it('provides overrides through the token', () => {
    expect(provideAndesPlayerLabels({ play: 'x' })).toEqual({
      provide: ANDES_PLAYER_LABELS,
      useValue: { play: 'x' },
    });
  });

  it('builds English default sentences', () => {
    const l = ANDES_PLAYER_DEFAULT_LABELS;
    const t = formatTimeText(65, l);
    const d = formatTimeText(200, l);
    expect(l.seekValueText(t, d)).toBe(
      '1 minute 5 seconds of 3 minutes 20 seconds',
    );
    expect(l.liveSeekValueText(t, true)).toBe('Live');
    expect(l.liveSeekValueText(t, false)).toBe(
      '1 minute 5 seconds behind live',
    );
    expect(l.seekForward(10)).toBe('Forward 10 seconds');
    expect(l.seekBackward(1)).toBe('Back 1 second');
    expect(l.seekOffset(-10)).toBe('-10s');
    expect(l.seekOffset(5)).toBe('+5s');
    expect(l.behindLive(t)).toBe('-1:05');
    expect(l.announceCaptions(null)).toBe('Captions off');
    expect(l.announceCaptions('English')).toBe('Captions on, English');
    expect(l.announceFullscreen(true)).toBe('Entered full screen');
    expect(l.announceFullscreen(false)).toBe('Exited full screen');
    expect(l.announcePictureInPicture(true)).toContain('Entered');
    expect(l.announcePictureInPicture(false)).toContain('Exited');
    expect(l.announceVolume(40)).toBe('Volume 40%');
    expect(l.announceRate('1.5×')).toBe('Speed 1.5×');
    expect(l.announceQuality('720p')).toBe('Quality 720p');
    expect(l.announceAudioTrack('English')).toBe('Audio English');
    expect(l.announceSeek(t)).toBe('Moved to 1 minute 5 seconds');
    expect(l.announceError('x')).toBe('Error. x');
    expect(l.qualityAutoWith('720p')).toBe('Auto (720p)');
    expect(l.rateValue('2')).toBe('2×');
    expect(l.volumeValueText(30)).toBe('30%');
  });
});

describe('hotkeys', () => {
  it('matches keys with modifiers, case-insensitive letters and Space', () => {
    expect(matchesKey(key({ key: 'k' }), 'k')).toBe(true);
    expect(matchesKey(key({ key: 'K', shiftKey: true }), 'k')).toBe(false);
    expect(matchesKey(key({ key: 'K' }), 'k')).toBe(true);
    expect(matchesKey(key({ key: ' ' }), 'Space')).toBe(true);
    expect(
      matchesKey(key({ key: 'ArrowLeft', shiftKey: true }), 'Shift+ArrowLeft'),
    ).toBe(true);
    expect(
      matchesKey(key({ key: 'ArrowLeft', shiftKey: true }), 'ArrowLeft'),
    ).toBe(false);
    expect(matchesKey(key({ key: '<', shiftKey: true }), '<')).toBe(true);
    expect(matchesKey(key({ key: 'k', ctrlKey: true }), 'k')).toBe(false);
    expect(matchesKey(key({ key: 'k', ctrlKey: true }), 'Control+k')).toBe(
      true,
    );
    expect(matchesKey(key({ key: 'k', metaKey: true }), 'Meta+k')).toBe(true);
    expect(matchesKey(key({ key: '+' }), '+')).toBe(true);
  });

  it('resolves actions from the default map, including digits', () => {
    expect(
      resolveHotkey(key({ key: ' ' }), ANDES_PLAYER_DEFAULT_KEY_MAP),
    ).toEqual({
      action: 'togglePlay',
      key: ' ',
    });
    expect(
      resolveHotkey(key({ key: '7' }), ANDES_PLAYER_DEFAULT_KEY_MAP),
    ).toEqual({
      action: 'seekToPercent',
      key: '7',
    });
    expect(
      resolveHotkey(key({ key: 'x' }), ANDES_PLAYER_DEFAULT_KEY_MAP),
    ).toBeNull();
  });

  it('merges custom maps and turns actions off with empty lists', () => {
    const map = mergeKeyMap({ toggleMute: [], togglePlay: ['p'] });
    expect(resolveHotkey(key({ key: 'm' }), map)).toBeNull();
    expect(resolveHotkey(key({ key: 'p' }), map)?.action).toBe('togglePlay');
    expect(mergeKeyMap(null)).toEqual(ANDES_PLAYER_DEFAULT_KEY_MAP);
  });

  it('publishes ARIA shortcuts and visible hints', () => {
    expect(ariaKeyShortcuts(ANDES_PLAYER_DEFAULT_KEY_MAP, 'togglePlay')).toBe(
      'Space K',
    );
    expect(
      ariaKeyShortcuts(ANDES_PLAYER_DEFAULT_KEY_MAP, 'seekBackwardLarge'),
    ).toBe('J Shift+ArrowLeft');
    expect(
      ariaKeyShortcuts(mergeKeyMap({ toggleMute: ['Ctrl+m'] }), 'toggleMute'),
    ).toBe('Control+M');
    expect(
      ariaKeyShortcuts(mergeKeyMap({ toggleMute: [] }), 'toggleMute'),
    ).toBeNull();
    expect(hotkeyHint(ANDES_PLAYER_DEFAULT_KEY_MAP, 'togglePlay')).toBe('K');
    expect(
      hotkeyHint(mergeKeyMap({ togglePlay: ['Space'] }), 'togglePlay'),
    ).toBe('Space');
    expect(
      hotkeyHint(mergeKeyMap({ togglePlay: ['Enter'] }), 'togglePlay'),
    ).toBe('Enter');
    expect(
      hotkeyHint(mergeKeyMap({ togglePlay: [] }), 'togglePlay'),
    ).toBeNull();
  });

  it('leaves keys to text fields, menus, sliders and buttons', () => {
    const input = document.createElement('input');
    const slider = document.createElement('div');
    slider.setAttribute('role', 'slider');
    const button = document.createElement('button');
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const plain = document.createElement('div');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');

    expect(isKeyOwnedByTarget(key({ key: 'k' }, input))).toBe(true);
    expect(isKeyOwnedByTarget(key({ key: 'k' }, menu))).toBe(true);
    expect(isKeyOwnedByTarget(key({ key: 'k' }, editable))).toBe(true);
    expect(isKeyOwnedByTarget(key({ key: 'ArrowLeft' }, slider))).toBe(true);
    expect(isKeyOwnedByTarget(key({ key: 'PageUp' }, slider))).toBe(true);
    expect(isKeyOwnedByTarget(key({ key: 'k' }, slider))).toBe(false);
    expect(isKeyOwnedByTarget(key({ key: ' ' }, button))).toBe(true);
    expect(isKeyOwnedByTarget(key({ key: 'Enter' }, button))).toBe(true);
    expect(isKeyOwnedByTarget(key({ key: 'm' }, button))).toBe(false);
    expect(isKeyOwnedByTarget(key({ key: ' ' }, plain))).toBe(false);
    expect(isKeyOwnedByTarget(new KeyboardEvent('keydown', { key: 'k' }))).toBe(
      false,
    );
  });
});

describe('adapters and sources', () => {
  it('resolves MIME types from extensions', () => {
    expect(resolveMimeType('a/b/clip.mp4')).toBe('video/mp4');
    expect(resolveMimeType('clip.MP4?token=1#t=3')).toBe('video/mp4');
    expect(resolveMimeType('clip.webm')).toBe('video/webm');
    expect(resolveMimeType('live.m3u8')).toBe('application/vnd.apple.mpegurl');
    expect(resolveMimeType('stream.mpd')).toBe('application/dash+xml');
    expect(resolveMimeType('song.mp3')).toBe('audio/mpeg');
    expect(resolveMimeType('voice.m4a')).toBe('audio/mp4');
    expect(resolveMimeType('clip.ogg', true)).toBe('audio/ogg');
    expect(resolveMimeType('clip.webm', true)).toBe('audio/webm');
    expect(resolveMimeType('clip.mov', true)).toBe('video/quicktime');
    expect(resolveMimeType('noextension')).toBeUndefined();
    expect(resolveMimeType('file.xyz')).toBeUndefined();
  });

  it('recognises HLS types', () => {
    expect(isHlsType('application/vnd.apple.mpegurl')).toBe(true);
    expect(isHlsType('application/x-mpegurl')).toBe(true);
    expect(isHlsType('audio/mpegurl')).toBe(true);
    expect(isHlsType('video/mp4')).toBe(false);
    expect(isHlsType(undefined)).toBe(false);
  });

  it('filters sources by their media query', () => {
    const sources = [
      { src: 'small.mp4', media: '(max-width: 600px)' },
      { src: 'large.mp4' },
    ];
    expect(pickSource(sources, () => false).map((s) => s.src)).toEqual([
      'large.mp4',
    ]);
    expect(pickSource(sources, () => true).map((s) => s.src)).toEqual([
      'small.mp4',
      'large.mp4',
    ]);
  });

  it('native adapter: plays what the element can, unknown types optimistically', () => {
    const adapter = new AndesNativeMediaAdapter();
    const probe = vi
      .spyOn(HTMLMediaElement.prototype, 'canPlayType')
      .mockImplementation((type: string) =>
        type === 'video/mp4' ? 'probably' : '',
      );
    expect(adapter.canPlay({ src: 'a.mp4' })).toBe(true);
    expect(adapter.canPlay({ src: 'a.m3u8' })).toBe(false);
    expect(adapter.canPlay({ src: 'a.unknown' })).toBe(true);
    probe.mockRestore();
  });

  it('native adapter: attaches by setting src and detaches by clearing it', () => {
    const adapter = new AndesNativeMediaAdapter();
    const media = document.createElement('video');
    const load = vi.fn();
    media.load = load;
    adapter.attach(media, { src: 'clip.mp4' });
    expect(media.getAttribute('src')).toBe('clip.mp4');
    expect(load).toHaveBeenCalledTimes(1);
    adapter.detach();
    expect(media.hasAttribute('src')).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
    adapter.detach();
    media.load = () => {
      throw new Error('no pipeline');
    };
    expect(() => adapter.attach(media, { src: 'x.mp4' })).not.toThrow();
    expect(() => adapter.detach()).not.toThrow();
  });

  it('provides adapter factories and remote handlers through tokens', () => {
    const factory = () => new AndesNativeMediaAdapter();
    expect(provideAndesMediaAdapters(factory)).toEqual({
      provide: ANDES_MEDIA_ADAPTERS,
      useValue: [factory],
    });
    const handler = {
      available: signal(true),
      state: signal('disconnected' as const),
      prompt: () => undefined,
    };
    expect(provideAndesRemotePlayback(handler)).toEqual({
      provide: ANDES_REMOTE_PLAYBACK_HANDLER,
      useValue: handler,
    });
  });
});

describe('errors', () => {
  it('maps MediaError codes to friendly codes', () => {
    expect(errorCodeFromMediaError(1)).toBe('aborted');
    expect(errorCodeFromMediaError(2)).toBe('network');
    expect(errorCodeFromMediaError(3)).toBe('decode');
    expect(errorCodeFromMediaError(4)).toBe('unsupported');
    expect(errorCodeFromMediaError(undefined)).toBe('unknown');
    expect(errorCodeFromMediaError(9)).toBe('unknown');
  });

  it('builds errors with the label message and the media detail', () => {
    expect(createPlayerError('network', ANDES_PLAYER_DEFAULT_LABELS)).toEqual({
      code: 'network',
      message: ANDES_PLAYER_DEFAULT_LABELS.errors.network,
    });
    const media = {
      error: { code: 3, message: 'bad frame' },
    } as unknown as HTMLMediaElement;
    const error = playerErrorFromMedia(media, ANDES_PLAYER_DEFAULT_LABELS);
    expect(error.code).toBe('decode');
    expect(error.detail).toBe('bad frame');
    expect(error.mediaErrorCode).toBe(3);
    const empty = playerErrorFromMedia(
      { error: null } as unknown as HTMLMediaElement,
      ANDES_PLAYER_DEFAULT_LABELS,
    );
    expect(empty.code).toBe('unknown');
  });
});

describe('preferences', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('round-trips valid preferences and drops invalid fields', () => {
    expect(
      writePlayerPreferences('demo', {
        volume: 0.4,
        muted: true,
        playbackRate: 1.5,
        captionLanguage: 'es',
      }),
    ).toBe(true);
    expect(readPlayerPreferences('demo')).toEqual({
      volume: 0.4,
      muted: true,
      playbackRate: 1.5,
      captionLanguage: 'es',
    });
    localStorage.setItem(
      'andes-player:bad',
      JSON.stringify({
        volume: 7,
        muted: 'yes',
        playbackRate: -1,
        captionLanguage: 3,
      }),
    );
    expect(readPlayerPreferences('bad')).toEqual({});
    localStorage.setItem(
      'andes-player:off',
      JSON.stringify({ captionLanguage: null }),
    );
    expect(readPlayerPreferences('off')).toEqual({ captionLanguage: null });
    localStorage.setItem('andes-player:junk', '{not json');
    expect(readPlayerPreferences('junk')).toEqual({});
    expect(readPlayerPreferences('missing')).toEqual({});
  });

  it('survives storage that throws on access, read and write', () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    expect(readPlayerPreferences('demo')).toEqual({});
    expect(writePlayerPreferences('demo', { volume: 1 })).toBe(false);
    getItem.mockRestore();
    setItem.mockRestore();

    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    try {
      expect(readPlayerPreferences('demo')).toEqual({});
      expect(writePlayerPreferences('demo', { volume: 1 })).toBe(false);
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'localStorage', descriptor);
      }
    }
  });
});

describe('WebVTT metadata', () => {
  const VTT = `WEBVTT

1
00:00:00.000 --> 00:00:04.000 align:start
Opening

00:04.000 --> 00:08.500
sprite.jpg#xywh=160,0,160,90

bad --> line
ignored

NOTE a comment`;

  it('parses timestamps', () => {
    expect(parseVttTimestamp('00:01:02.500')).toBe(62.5);
    expect(parseVttTimestamp('01:02.5')).toBe(62.5);
    expect(parseVttTimestamp('1:00:00')).toBe(3600);
    expect(parseVttTimestamp('nope')).toBeNaN();
  });

  it('parses cues and skips malformed blocks', () => {
    const cues = parseVtt(VTT.replace(/\n/g, '\r\n'));
    expect(cues).toEqual([
      { start: 0, end: 4, text: 'Opening' },
      { start: 4, end: 8.5, text: 'sprite.jpg#xywh=160,0,160,90' },
    ]);
  });

  it('turns storyboard cues into thumbnails resolved against the VTT url', () => {
    const thumbs = thumbnailsFromVtt(
      [
        { start: 0, end: 1, text: 'sprite.jpg#xywh=160,90,160,90' },
        { start: 1, end: 2, text: 'frame2.jpg' },
        { start: 2, end: 3, text: '' },
      ],
      'http://cdn.test/media/thumbs.vtt',
    );
    expect(thumbs).toEqual([
      {
        start: 0,
        end: 1,
        src: 'http://cdn.test/media/sprite.jpg',
        x: 160,
        y: 90,
        width: 160,
        height: 90,
      },
      {
        start: 1,
        end: 2,
        src: 'http://cdn.test/media/frame2.jpg',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    ]);
    expect(resolveUrl('a.jpg', 'media/thumbs.vtt')).toMatch(/\/media\/a\.jpg$/);
    expect(resolveUrl('a.jpg', 'http://[bad')).toBe('a.jpg');
  });

  it('cuts sprite grids', () => {
    const grid = thumbnailsFromGrid(
      { src: 's.jpg', width: 100, height: 50, columns: 2, interval: 5 },
      12,
    );
    expect(grid.map((t) => [t.start, t.x, t.y])).toEqual([
      [0, 0, 0],
      [5, 100, 0],
      [10, 0, 50],
    ]);
    expect(
      thumbnailsFromGrid(
        { src: 's', width: 1, height: 1, columns: 1, interval: 1 },
        Number.NaN,
      ),
    ).toEqual([]);
    expect(
      thumbnailsFromGrid(
        { src: 's', width: 1, height: 1, columns: 1, interval: 1, count: 2 },
        0,
      ),
    ).toHaveLength(2);
  });

  it('finds timed entries and builds chapters', () => {
    const chapters = chaptersFromCues([
      { start: 4, end: 8, text: ' Middle ' },
      { start: 0, end: 4, text: 'Opening' },
      { start: 8, end: 9, text: '  ' },
    ]);
    expect(chapters).toEqual([
      { start: 0, end: 4, title: 'Opening' },
      { start: 4, end: 8, title: 'Middle' },
    ]);
    expect(findTimed(chapters, 5)?.title).toBe('Middle');
    expect(findTimed(chapters, 0)?.title).toBe('Opening');
    expect(findTimed(chapters, 8)).toBeNull();
    expect(findTimed([], 1)).toBeNull();
  });
});

describe('browser helpers', () => {
  it('reads TimeRanges and guards selectors', () => {
    expect(readTimeRanges(null)).toEqual([]);
    expect(
      readTimeRanges({ length: 1, start: () => 1, end: () => 2 } as TimeRanges),
    ).toEqual([{ start: 1, end: 2 }]);
    const element = document.createElement('div');
    expect(safeMatches(element, 'div')).toBe(true);
    expect(safeMatches(element, ':::bad')).toBe(false);
  });

  it('wraps phone fullscreen, playback targets and audio tracks', () => {
    expect(videoFullscreen(null).supported).toBe(false);
    const enter = vi.fn();
    const exit = vi.fn();
    const video = Object.assign(document.createElement('video'), {
      webkitEnterFullscreen: enter,
      webkitExitFullscreen: exit,
      webkitDisplayingFullscreen: true,
      webkitShowPlaybackTargetPicker: vi.fn(),
    });
    const phone = videoFullscreen(video);
    expect(phone.supported).toBe(true);
    expect(phone.active).toBe(true);
    phone.enter();
    phone.exit();
    expect(enter).toHaveBeenCalled();
    expect(exit).toHaveBeenCalled();
    expect(hasPlaybackTargetPicker(video)).toBe(true);
    expect(showPlaybackTargetPicker(video)).toBe(true);
    expect(showPlaybackTargetPicker(document.createElement('video'))).toBe(
      false,
    );
    expect(
      nativeAudioTracks(document.createElement('video'))?.length ?? 0,
    ).toBe(0);
    expect(nativeAudioTracks({} as HTMLMediaElement)).toBeNull();
  });

  it('locks and unlocks orientation where possible', async () => {
    expect(await lockOrientation(null, 'landscape')).toBe(false);
    const lock = vi.fn().mockResolvedValue(undefined);
    const view = {
      screen: { orientation: { lock, unlock: vi.fn() } },
    } as unknown as Window;
    expect(await lockOrientation(view, 'landscape')).toBe(true);
    lock.mockRejectedValueOnce(new Error('not in fullscreen'));
    expect(await lockOrientation(view, 'landscape')).toBe(false);
    expect(() => unlockOrientation(view)).not.toThrow();
    const throwing = {
      screen: {
        orientation: {
          unlock: () => {
            throw new Error('x');
          },
        },
      },
    } as unknown as Window;
    expect(() => unlockOrientation(throwing)).not.toThrow();
  });
});
