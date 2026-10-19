import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ANDES_CAPTION_STYLE_DEFAULT,
  captionStyleVariables,
  isCustomCaptionStyle,
  readCaptionStyle,
} from './core/caption-style';
import type {
  AndesMediaAdapter,
  AndesMediaAdapterHooks,
} from './core/media-adapter';
import {
  ANDES_PLAYER_DEFAULT_KEY_MAP,
  displayKey,
} from './core/player-hotkeys';
import {
  ANDES_PLAYER_LABEL_SETS,
  ANDES_PLAYER_LABELS_FR,
  andesPlayerLabelsFor,
  provideAndesPlayerLocale,
} from './core/player-label-sets';
import {
  ANDES_PLAYER_DEFAULT_LABELS,
  ANDES_PLAYER_LABELS,
} from './core/player-labels';
import {
  ANDES_PLAYER_MAX_POSITIONS,
  readPlayerPreferences,
  withPosition,
} from './core/player-preferences';
import type { AndesPlaylistItem } from './core/player-types';
import {
  playlistItemKey,
  playlistItemSources,
  shuffledOrder,
  stepPlaylist,
} from './core/playlist';
import { installFakeMedia } from './testing/fake-media';
import {
  keydown,
  pointer,
  renderPlayer,
  req,
  settle,
} from './testing/player-harness';
import { AndesVideoPlayer } from './video-player';

let uninstall: () => void;

beforeEach(() => {
  uninstall = installFakeMedia();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  uninstall();
  localStorage.clear();
  document.body.replaceChildren();
});

function attached(inputs: Parameters<typeof renderPlayer>[0] = {}) {
  const p = renderPlayer(inputs);
  document.body.appendChild(p.fixture.nativeElement);
  return p;
}

const PLAYLIST: AndesPlaylistItem[] = [
  { title: 'One', src: 'media/one.mp4', poster: 'one.jpg', duration: 65 },
  {
    title: 'Two',
    sources: [{ src: 'media/two.webm', type: 'video/webm' }],
    tracks: [
      { kind: 'subtitles', src: 'two.en.vtt', srclang: 'en', label: 'EN' },
    ],
  },
  { id: 'three', src: 'media/three.mp4', metadata: { title: 'Three' } },
];

describe('host title and tooltips over the picture', () => {
  @Component({
    imports: [AndesVideoPlayer],
    template: `<andes-video-player src="media/a.mp4" title="Lecture" />`,
  })
  class StaticTitleHost {}

  it('never leaves a native title on the host (its browser tooltip would float over the video)', () => {
    const fixture = TestBed.createComponent(StaticTitleHost);
    fixture.detectChanges();
    TestBed.tick();
    const host = fixture.nativeElement.querySelector(
      'andes-video-player',
    ) as HTMLElement;
    expect(host.hasAttribute('title')).toBe(false);
    expect(host.getAttribute('aria-label')).toBe('Video player: Lecture');
    expect(host.querySelector('[title]')).toBeNull();
    expect(host.querySelector('[data-slot=title]')?.textContent).toBe(
      'Lecture',
    );
  });

  it('closes a control tooltip when the controls auto-hide, and keeps it closed while hidden', async () => {
    vi.useFakeTimers();
    const p = attached({ autohide: 1000 });
    p.ready(30);
    await p.store.play();
    p.store.notifyActivity();
    const button = req(p.q<HTMLButtonElement>('[data-slot=mute-button]'));
    pointer(button, 'pointerenter');
    vi.advanceTimersByTime(400);
    const bubble = req(button.querySelector('.andes-player-tooltip'));
    expect(bubble.getAttribute('data-state')).toBe('open');
    // No movement: the activity timer hides the chrome, and the tooltip with it.
    vi.advanceTimersByTime(1100);
    p.render();
    expect(p.el.hasAttribute('data-controls-visible')).toBe(false);
    expect(bubble.getAttribute('data-state')).toBe('closed');
    // A hover that lands while the chrome is hidden does not reopen it.
    pointer(button, 'pointerleave');
    pointer(button, 'pointerenter');
    vi.advanceTimersByTime(400);
    expect(bubble.getAttribute('data-state')).toBe('closed');
  });

  it('closes on page scroll and on Escape', () => {
    vi.useFakeTimers();
    const p = attached();
    p.ready(30);
    const button = req(p.q<HTMLButtonElement>('[data-slot=play-button]'));
    pointer(button, 'pointerenter');
    vi.advanceTimersByTime(400);
    const bubble = req(button.querySelector('.andes-player-tooltip'));
    expect(bubble.getAttribute('data-state')).toBe('open');
    document.dispatchEvent(new Event('scroll'));
    expect(bubble.getAttribute('data-state')).toBe('closed');
    pointer(button, 'pointerleave');
    pointer(button, 'pointerenter');
    vi.advanceTimersByTime(400);
    expect(bubble.getAttribute('data-state')).toBe('open');
    keydown(button, 'Escape');
    expect(bubble.getAttribute('data-state')).toBe('closed');
  });
});

describe('playlist', () => {
  it('plays each entry with its own source, title, poster and tracks', () => {
    const p = renderPlayer({ src: null, playlist: PLAYLIST, poster: 'p.jpg' });
    expect(p.media().getAttribute('src')).toBe('media/one.mp4');
    expect(p.q('[data-slot=title]')?.textContent).toBe('One');
    expect(p.q('andes-player-poster img')?.getAttribute('src')).toBe('one.jpg');
    expect(p.q('[data-slot=previous-button]')).not.toBeNull();
    expect(p.q('[data-slot=next-button]')?.getAttribute('aria-label')).toBe(
      'Next: Two',
    );
    p.host.playlistIndex.set(1);
    p.render();
    expect(p.media().getAttribute('src')).toBe('media/two.webm');
    expect(p.qa('track')).toHaveLength(1);
    // Missing fields fall back to the player's own inputs.
    expect(p.q('andes-player-poster img')?.getAttribute('src')).toBe('p.jpg');
    p.host.playlistIndex.set(2);
    p.render();
    expect(p.q('[data-slot=title]')?.textContent).toBe('Three');
    expect(p.q('[data-slot=next-button]')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
  });

  it('moves on with next/previous, restarts within the first seconds rule, and keeps the index two-way', async () => {
    const p = renderPlayer({ src: null, playlist: PLAYLIST });
    p.ready(60);
    expect(p.player.next()).toBe(true);
    p.render();
    await settle();
    expect(p.host.playlistIndex()).toBe(1);
    expect(p.media().getAttribute('src')).toBe('media/two.webm');
    // The step plays the new entry as soon as it attaches.
    expect(p.media().paused).toBe(false);
    p.ready(60);
    p.fake().advance(20);
    expect(p.player.previous()).toBe(true);
    // A few seconds in, "previous" restarts the entry.
    expect(p.host.playlistIndex()).toBe(1);
    expect(p.media().currentTime).toBe(0);
    expect(p.player.previous()).toBe(true);
    p.render();
    expect(p.host.playlistIndex()).toBe(0);
    p.player.selectItem(2);
    p.render();
    expect(p.host.playlistIndex()).toBe(2);
    expect(p.player.next()).toBe(false);
    // Picking the entry that plays restarts it.
    p.ready(60);
    p.fake().advance(30);
    p.store.selectItem(2, 'control');
    expect(p.media().currentTime).toBe(0);
    p.store.selectItem(9);
    expect(p.host.playlistIndex()).toBe(2);
  });

  it('counts down on the up-next card, then plays the next entry', async () => {
    vi.useFakeTimers();
    const p = attached({ src: null, playlist: PLAYLIST, upNextDelay: 3 });
    p.ready(60);
    await p.store.play();
    p.fake().finish();
    p.render();
    const card = req(p.q('[data-slot=up-next]'));
    expect(card.getAttribute('role')).toBe('group');
    expect(card.textContent).toContain('Two');
    expect(card.textContent).toContain('Next in 3');
    expect(p.q('andes-player-big-play-button')?.hasAttribute('hidden')).toBe(
      true,
    );
    expect(p.q('[data-slot=announcer]')?.textContent).toContain(
      'Up next: Two, in 3 seconds',
    );
    vi.advanceTimersByTime(1000);
    p.render();
    expect(p.q('[data-slot=up-next]')?.textContent).toContain('Next in 2');
    vi.advanceTimersByTime(2000);
    p.render();
    expect(p.host.playlistIndex()).toBe(1);
    expect(p.q('[data-slot=up-next]')).toBeNull();
  });

  it('cancel keeps the entry; play now skips the countdown; delay 0 moves on at once', async () => {
    vi.useFakeTimers();
    const p = attached({ src: null, playlist: PLAYLIST });
    p.ready(60);
    await p.store.play();
    p.fake().finish();
    p.render();
    req(p.q<HTMLButtonElement>('[data-slot=up-next-cancel]')).click();
    p.render();
    vi.advanceTimersByTime(10_000);
    expect(p.host.playlistIndex()).toBe(0);
    expect(p.q('[data-slot=up-next]')).toBeNull();
    p.fake().finish();
    p.render();
    req(p.q<HTMLButtonElement>('[data-slot=up-next-play]')).click();
    p.render();
    expect(p.host.playlistIndex()).toBe(1);
    p.host.upNextDelay.set(0);
    p.render();
    p.ready(60);
    p.fake().finish();
    p.render();
    expect(p.host.playlistIndex()).toBe(2);
    // The last entry ends: nothing follows, the playlist completed.
    p.ready(60);
    p.fake().finish();
    p.render();
    expect(p.q('[data-slot=up-next]')).toBeNull();
    expect(p.host.events).toContain('playlist-completed');
  });

  it('wraps with repeat all, loops the media with repeat one, and maps loop to repeat one', () => {
    const p = renderPlayer({ src: null, playlist: PLAYLIST, playlistIndex: 2 });
    expect(p.store.hasNext()).toBe(false);
    p.host.repeat.set('all');
    p.render();
    expect(p.store.nextIndex()).toBe(0);
    p.store.setRepeat('one', 'control');
    p.render();
    expect(p.host.repeat()).toBe('one');
    expect((p.media() as HTMLVideoElement).loop).toBe(true);
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Repeat One');
    p.store.setRepeat('off');
    p.render();
    expect((p.media() as HTMLVideoElement).loop).toBe(false);
    p.host.loop.set(true);
    p.render();
    expect(p.store.repeat()).toBe('one');
    p.host.loop.set(false);
    p.render();
    expect(p.store.repeat()).toBe('off');
    // Without a playlist the page reads "Loop" with Off / On.
    expect(p.store.repeatLabel('one')).toBe('One');
    p.host.playlist.set([]);
    p.host.src.set('media/clip.mp4');
    p.render();
    expect(p.store.repeatLabel('one')).toBe('On');
    expect(p.store.next()).toBe(false);
    expect(p.store.previous()).toBe(false);
  });

  it('shuffles from the entry that plays, two-way', () => {
    const p = renderPlayer({ src: null, playlist: PLAYLIST, playlistIndex: 1 });
    p.store.setShuffle(true, 'control');
    p.render();
    expect(p.host.shuffle()).toBe(true);
    const order = p.store.playOrder();
    expect(order[0]).toBe(1);
    expect([...order].sort()).toEqual([0, 1, 2]);
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Shuffle on');
    p.host.shuffle.set(false);
    p.render();
    expect(p.store.playOrder()).toEqual([0, 1, 2]);
  });

  it('offers the playlist menu, repeat and shuffle pages, and Shift+N / Shift+P', () => {
    const p = attached({ src: null, playlist: PLAYLIST });
    p.ready(60);
    const playlistMenu = req(p.q('andes-player-menu[data-type=playlist]'));
    expect(playlistMenu.hasAttribute('hidden')).toBe(false);
    req(playlistMenu.querySelector<HTMLButtonElement>('button')).click();
    p.render();
    const options = p.qa('[data-slot=menu-option]');
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      'One1:05',
      'Two',
      'Three',
    ]);
    expect(options[0].getAttribute('aria-checked')).toBe('true');
    options[2].click();
    p.render();
    expect(p.host.playlistIndex()).toBe(2);
    expect(p.q('[data-slot=announcer]')?.textContent).toContain(
      'Now playing Three, 3 of 3',
    );
    // Settings: Repeat with Off / All / One, and Shuffle.
    const settings = req(p.q('andes-player-menu[data-type=settings]'));
    req(settings.querySelector<HTMLButtonElement>('button')).click();
    p.render();
    const pages = p
      .qa('[data-slot=menu-entry]')
      .map((e) => e.getAttribute('data-page'));
    expect(pages).toContain('repeat');
    expect(pages).toContain('shuffle');
    req(
      p.q<HTMLButtonElement>('[data-slot=menu-entry][data-page=repeat]'),
    ).click();
    p.render();
    expect(
      p.qa('[data-slot=menu-option]').map((o) => o.textContent?.trim()),
    ).toEqual(['Off', 'All', 'One']);
    req(
      p.q<HTMLButtonElement>('[data-slot=menu-option][data-key=all]'),
    ).click();
    p.render();
    expect(p.host.repeat()).toBe('all');
    // Hotkeys.
    keydown(p.el, 'N', { shiftKey: true });
    p.render();
    expect(p.host.playlistIndex()).toBe(0);
    keydown(p.el, 'P', { shiftKey: true });
    p.render();
    expect(p.host.playlistIndex()).toBe(2);
  });

  it('answers the system previous/next track buttons inside the playlist', () => {
    const handlers = new Map<string, ((details: object) => void) | null>();
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        metadata: null,
        setActionHandler: (
          action: string,
          handler: ((d: object) => void) | null,
        ) => handlers.set(action, handler),
      },
    });
    try {
      const p = renderPlayer({ src: null, playlist: PLAYLIST });
      p.ready(60);
      void p.store.play();
      p.render();
      handlers.get('nexttrack')?.({});
      p.render();
      expect(p.host.playlistIndex()).toBe(1);
      handlers.get('previoustrack')?.({});
      p.render();
      expect(p.host.playlistIndex()).toBe(0);
      expect(p.host.events).not.toContain('next');
    } finally {
      delete (navigator as unknown as Record<string, unknown>)['mediaSession'];
    }
  });

  it('helpers: sources, keys, play order and stepping', () => {
    expect(playlistItemSources({ src: 'a.mp3' }, true)).toEqual([
      { src: 'a.mp3', type: 'audio/mpeg' },
    ]);
    expect(playlistItemSources({})).toEqual([]);
    expect(playlistItemKey({ id: 'x', src: 'a' }, 0)).toBe('x');
    expect(playlistItemKey({ sources: [{ src: 's' }] }, 0)).toBe('s');
    expect(playlistItemKey({}, 4)).toBe('item-4');
    expect(shuffledOrder(4, 2, () => 0)).toEqual([2, 1, 3, 0]);
    expect(shuffledOrder(3, -1, () => 0.99)).toEqual([0, 1, 2]);
    expect(stepPlaylist([], 0, 1, 'all')).toBeNull();
    expect(stepPlaylist([0, 1], 1, 1, 'off')).toBeNull();
    expect(stepPlaylist([0, 1], 1, 1, 'all')).toBe(0);
    expect(stepPlaylist([0, 1], 0, -1, 'all')).toBe(1);
    expect(stepPlaylist([2, 0, 1], 7, 1, 'off')).toBe(0);
  });
});

describe('caption appearance', () => {
  const tracks = [
    {
      kind: 'subtitles' as const,
      src: 'en.vtt',
      srclang: 'en',
      label: 'English',
    },
    {
      kind: 'subtitles' as const,
      src: 'es.vtt',
      srclang: 'es',
      label: 'Español',
    },
  ];

  function withTracks(inputs: Parameters<typeof renderPlayer>[0] = {}) {
    const p = attached({ tracks, ...inputs });
    p.fake().addTextTrack({
      kind: 'subtitles',
      label: 'English',
      language: 'en',
    });
    p.fake().addTextTrack({
      kind: 'subtitles',
      label: 'Español',
      language: 'es',
    });
    p.ready(60);
    return p;
  }

  it('applies the viewer style as caption variables, two-way and only for chosen fields', () => {
    const p = withTracks();
    expect(p.el.style.getPropertyValue('--andes-video-captions-color')).toBe(
      '',
    );
    p.store.setCaptionStyle({ color: 'yellow', size: 150, edge: 'outline' });
    p.render();
    expect(p.el.style.getPropertyValue('--andes-video-captions-color')).toBe(
      '#ffff00',
    );
    expect(p.el.style.getPropertyValue('--andes-video-captions-scale')).toBe(
      '1.5',
    );
    expect(
      p.el.style.getPropertyValue('--andes-video-captions-text-shadow'),
    ).toContain('#000');
    expect(p.host.captionStyle().color).toBe('yellow');
    p.host.captionStyle.set({
      ...ANDES_CAPTION_STYLE_DEFAULT,
      background: 'blue',
      backgroundOpacity: 50,
      font: 'serif',
    });
    p.render();
    expect(
      p.el.style.getPropertyValue('--andes-video-captions-background'),
    ).toBe('color-mix(in srgb, #0000ff 50%, transparent)');
    expect(
      p.el.style.getPropertyValue('--andes-video-captions-font-family'),
    ).toContain('serif');
  });

  it('edits it from Settings → Caption style, one page per field, with a reset', () => {
    const p = withTracks();
    req(p.q<HTMLButtonElement>('[data-slot=menu-trigger]')).click();
    p.render();
    req(
      p.q<HTMLButtonElement>('[data-slot=menu-entry][data-page=caption-style]'),
    ).click();
    p.render();
    const fields = p.qa('[data-slot=menu-entry]');
    expect(fields.map((f) => f.getAttribute('data-page'))).toEqual([
      'caption-style.size',
      'caption-style.color',
      'caption-style.background',
      'caption-style.backgroundOpacity',
      'caption-style.edge',
      'caption-style.font',
    ]);
    expect(fields[0].textContent).toContain('Default');
    keydown(req(p.q('[data-slot=menu]')), 'ArrowDown');
    keydown(req(p.q('[data-slot=menu]')), 'ArrowDown');
    keydown(req(p.q('[data-slot=menu]')), 'ArrowRight');
    p.render();
    expect(p.q('[data-slot=menu]')?.getAttribute('aria-label')).toBe(
      'Text colour',
    );
    const colours = p.qa('[data-slot=menu-option]');
    expect(colours[0].textContent).toContain('Default');
    expect(colours).toHaveLength(9);
    expect(
      colours[2]
        .querySelector('.andes-player-menu__swatch')
        ?.getAttribute('style'),
    ).toContain('background-color');
    colours[2].click();
    p.render();
    // Back on the caption style page, showing the choice.
    expect(p.q('[data-slot=menu]')?.getAttribute('data-page')).toBe(
      'caption-style',
    );
    expect(p.store.captionStyle().color).toBe('yellow');
    expect(
      p.q('[data-slot=menu-entry][data-page="caption-style.color"]')
        ?.textContent,
    ).toContain('Yellow');
    for (const field of ['size', 'backgroundOpacity', 'edge', 'font']) {
      req(
        p.q<HTMLButtonElement>(
          `[data-slot=menu-entry][data-page="caption-style.${field}"]`,
        ),
      ).click();
      p.render();
      p.qa<HTMLButtonElement>('[data-slot=menu-option]')[1].click();
      p.render();
    }
    expect(p.store.captionStyle()).toEqual({
      size: 50,
      color: 'yellow',
      background: null,
      backgroundOpacity: 0,
      edge: 'none',
      font: 'default',
    });
    req(
      p.q<HTMLButtonElement>('[data-slot=menu-action][data-key=reset]'),
    ).click();
    p.render();
    expect(isCustomCaptionStyle(p.store.captionStyle())).toBe(false);
    // Escape walks back one page at a time.
    keydown(req(p.q('[data-slot=menu]')), 'Escape');
    p.render();
    expect(p.q('[data-slot=menu]')?.getAttribute('data-page')).toBe('settings');
  });

  it('remembers the style with persistKey and ignores invalid stored values', () => {
    localStorage.setItem(
      'andes-player:style',
      JSON.stringify({ captionStyle: { color: 'cyan', size: 999, edge: 'x' } }),
    );
    const p = withTracks({ persistKey: 'style' });
    expect(p.store.captionStyle()).toEqual({
      ...ANDES_CAPTION_STYLE_DEFAULT,
      color: 'cyan',
    });
    p.store.setCaptionStyle({ size: 200 });
    p.render();
    const saved = JSON.parse(
      localStorage.getItem('andes-player:style') ?? '{}',
    );
    expect(saved.captionStyle).toEqual({
      ...ANDES_CAPTION_STYLE_DEFAULT,
      color: 'cyan',
      size: 200,
    });
    expect(readCaptionStyle('nope')).toBeNull();
  });

  it('turns captions on in the viewer language when nothing was chosen', () => {
    const languages = vi
      .spyOn(navigator, 'languages', 'get')
      .mockReturnValue(['fr-FR', 'es-PE']);
    try {
      const p = withTracks();
      expect(p.store.captionsEnabled()).toBe(false);
      p.store.toggleCaptions('control');
      expect(p.store.activeTextTrack()?.language).toBe('es');
    } finally {
      languages.mockRestore();
    }
  });

  it('builds variables for every field', () => {
    expect(captionStyleVariables(ANDES_CAPTION_STYLE_DEFAULT)).toEqual({
      '--andes-video-captions-scale': null,
      '--andes-video-captions-color': null,
      '--andes-video-captions-background': null,
      '--andes-video-captions-text-shadow': null,
      '--andes-video-captions-font-family': null,
    });
    const vars = captionStyleVariables({
      ...ANDES_CAPTION_STYLE_DEFAULT,
      backgroundOpacity: 100,
      font: 'default',
    });
    expect(vars['--andes-video-captions-background']).toBe('#000000');
    expect(vars['--andes-video-captions-font-family']).toBeNull();
  });
});

describe('resume where the viewer left off', () => {
  function seed(time: number, src = 'media/clip.mp4') {
    localStorage.setItem(
      'andes-player:resume',
      JSON.stringify({ positions: { [src]: time } }),
    );
  }

  it('offers the saved position, and resumes from it', async () => {
    seed(42);
    const p = attached({ persistKey: 'resume' });
    p.ready(120);
    const card = req(p.q('[data-slot=resume]'));
    expect(card.getAttribute('role')).toBe('group');
    expect(card.textContent).toContain('Continue watching?');
    expect(card.textContent).toContain('Resume from 0:42');
    req(p.q<HTMLButtonElement>('[data-slot=resume-accept]')).click();
    await settle();
    p.render();
    expect(p.media().currentTime).toBe(42);
    expect(p.media().paused).toBe(false);
    expect(p.q('[data-slot=resume]')).toBeNull();
  });

  it('starts over on request and forgets the position', async () => {
    seed(42);
    const p = attached({ persistKey: 'resume' });
    p.ready(120);
    req(p.q<HTMLButtonElement>('[data-slot=resume-decline]')).click();
    await settle();
    p.render();
    expect(p.media().currentTime).toBe(0);
    expect(p.media().paused).toBe(false);
    expect(readPlayerPreferences('resume').positions ?? {}).toEqual({});
  });

  it('continues silently with resume="auto", never with "off" or near the ends', () => {
    seed(42);
    const auto = renderPlayer({ persistKey: 'resume', resume: 'auto' });
    auto.ready(120);
    expect(auto.media().currentTime).toBe(42);
    expect(auto.q('[data-slot=resume]')).toBeNull();
    const off = renderPlayer({ persistKey: 'resume', resume: 'off' });
    off.ready(120);
    expect(off.media().currentTime).toBe(0);
    seed(118);
    const nearEnd = renderPlayer({ persistKey: 'resume' });
    nearEnd.ready(120);
    expect(nearEnd.store.resumeOffer()).toBeNull();
  });

  it('saves the position while playing (throttled) and on pause, and drops it at the end', async () => {
    vi.useFakeTimers();
    const p = renderPlayer({ persistKey: 'resume' });
    p.ready(120);
    await p.store.play();
    p.fake().advance(30);
    expect(readPlayerPreferences('resume').positions).toEqual({
      'media/clip.mp4': 30,
    });
    p.fake().advance(31);
    expect(readPlayerPreferences('resume').positions?.['media/clip.mp4']).toBe(
      30,
    );
    p.store.pause();
    expect(readPlayerPreferences('resume').positions?.['media/clip.mp4']).toBe(
      31,
    );
    p.fake().finish();
    expect(readPlayerPreferences('resume').positions ?? {}).toEqual({});
  });

  it('keeps only the newest positions', () => {
    let positions: Record<string, number> = {};
    for (let index = 0; index < ANDES_PLAYER_MAX_POSITIONS + 5; index++) {
      positions = withPosition(positions, `s${index}`, index + 0.04);
    }
    const keys = Object.keys(positions);
    expect(keys).toHaveLength(ANDES_PLAYER_MAX_POSITIONS);
    expect(keys[0]).toBe('s5');
    expect(positions['s24']).toBe(24);
    expect(withPosition(positions, 's24', null)['s24']).toBeUndefined();
    localStorage.setItem(
      'andes-player:bad',
      JSON.stringify({ positions: { a: -1, b: 'x', c: 3 } }),
    );
    expect(readPlayerPreferences('bad').positions).toEqual({ c: 3 });
    localStorage.setItem(
      'andes-player:bad',
      JSON.stringify({ positions: [1] }),
    );
    expect(readPlayerPreferences('bad').positions).toBeUndefined();
  });
});

describe('network recovery', () => {
  it('retries a network failure with a growing wait, then plays on from the same point', async () => {
    vi.useFakeTimers();
    const p = renderPlayer();
    p.ready(120);
    p.fake().advance(50);
    const loads = p.fake().calls.load;
    p.fake().fail(2);
    p.render();
    expect(p.store.error()).toBeNull();
    expect(p.store.reconnecting()).toBe(true);
    expect(p.store.buffering()).toBe(true);
    expect(p.q('[data-slot=announcer]')?.textContent).toContain(
      'Reconnecting…',
    );
    vi.advanceTimersByTime(600);
    p.render();
    expect(p.q('[data-slot=network-status]')?.textContent).toContain(
      'Reconnecting…',
    );
    expect(p.fake().calls.load).toBe(loads);
    vi.advanceTimersByTime(500);
    expect(p.fake().calls.load).toBeGreaterThan(loads);
    // The reload fails again: the next wait is twice as long.
    p.fake().fail(2);
    const second = p.fake().calls.load;
    vi.advanceTimersByTime(1500);
    expect(p.fake().calls.load).toBe(second);
    vi.advanceTimersByTime(600);
    expect(p.fake().calls.load).toBeGreaterThan(second);
    // Recovered: the saved position comes back and the series ends.
    p.ready(120);
    expect(p.media().currentTime).toBe(50);
    expect(p.store.reconnecting()).toBe(false);
    p.render();
    expect(p.q('[data-slot=network-status]')).toBeNull();
  });

  it('shows the error once the attempts are used up', () => {
    vi.useFakeTimers();
    const p = renderPlayer({ retryAttempts: 1 });
    p.ready(60);
    p.fake().fail(2);
    expect(p.store.reconnecting()).toBe(true);
    vi.advanceTimersByTime(1000);
    p.fake().fail(2);
    p.render();
    expect(p.store.reconnecting()).toBe(false);
    expect(p.store.error()?.code).toBe('network');
  });

  it('reconnects at once when the browser comes back online', () => {
    vi.useFakeTimers();
    const p = renderPlayer();
    p.ready(60);
    p.fake().fail(2);
    const loads = p.fake().calls.load;
    window.dispatchEvent(new Event('online'));
    expect(p.fake().calls.load).toBeGreaterThan(loads);
  });

  it('treats an adapter network error the same way', () => {
    vi.useFakeTimers();
    let hooks: AndesMediaAdapterHooks | null = null;
    const adapter: AndesMediaAdapter = {
      name: 'flaky',
      canPlay: () => true,
      attach: (_media, _source, h) => {
        hooks = h;
      },
      detach: () => undefined,
    };
    const p = renderPlayer({ adapters: [() => adapter] });
    req(hooks as AndesMediaAdapterHooks | null).reportError({
      code: 'network',
      fatal: true,
    });
    expect(p.store.reconnecting()).toBe(true);
    p.player.retry();
    expect(p.store.reconnecting()).toBe(false);
  });

  it('says when the network stalls during buffering', async () => {
    const p = renderPlayer();
    p.ready(60);
    await p.store.play();
    p.fake().waiting();
    p.fake().emit('stalled');
    expect(p.store.networkSlow()).toBe(true);
    vi.useFakeTimers();
    p.store.notifyActivity();
  });
});

describe('keyboard help, frame stepping and chapters', () => {
  it('opens with ?, lists the live key map, closes with Escape and returns focus', () => {
    const p = attached({ chapters: [{ start: 0, end: 5, title: 'A' }] });
    p.ready(60);
    p.el.focus();
    keydown(p.el, '?');
    p.render();
    const dialog = req(p.q('[data-slot=shortcuts]'));
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(document.activeElement?.getAttribute('data-slot')).toBe(
      'shortcuts-close',
    );
    const text = dialog.textContent ?? '';
    expect(text).toContain('Play or pause');
    expect(text).toContain('Next chapter');
    expect(text).toContain('PgDn');
    expect(text).toContain('0–9');
    // No playlist: its rows are left out.
    expect(text).not.toContain('Next in playlist');
    keydown(req(document.activeElement), 'Escape');
    p.render();
    expect(p.q('[data-slot=shortcuts]')).toBeNull();
    expect(document.activeElement).toBe(p.el);
  });

  it('closes when focus leaves it and from its close button', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const p = attached();
    p.player.showShortcuts();
    p.render();
    const dialog = req(p.q('[data-slot=shortcuts]'));
    dialog.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
    );
    p.render();
    expect(p.store.shortcutsOpen()).toBe(false);
    p.store.openShortcuts();
    p.render();
    req(p.q<HTMLButtonElement>('[data-slot=shortcuts-close]')).click();
    p.render();
    expect(p.store.shortcutsOpen()).toBe(false);
  });

  it('steps frames while paused and jumps between chapters', async () => {
    const p = renderPlayer({
      frameRate: 25,
      chapters: [
        { start: 0, end: 10, title: 'Intro' },
        { start: 10, end: 30, title: 'Body' },
        { start: 30, end: 60, title: 'End' },
      ],
    });
    p.ready(60);
    await p.store.play();
    p.fake().advance(12);
    keydown(p.el, '.');
    expect(p.media().paused).toBe(true);
    expect(p.media().currentTime).toBeCloseTo(12.04, 5);
    keydown(p.el, ',');
    expect(p.media().currentTime).toBeCloseTo(12, 5);
    expect(p.store.feedback()?.kind).toBe('frame');
    keydown(p.el, 'PageDown');
    expect(p.media().currentTime).toBe(30);
    expect(p.store.feedback()?.text).toBe('End');
    keydown(p.el, 'PageDown');
    expect(p.media().currentTime).toBe(30);
    keydown(p.el, 'PageUp');
    expect(p.media().currentTime).toBe(10);
    // Within two seconds of a chapter's start, PageUp goes to the one before.
    p.fake().advance(11);
    keydown(p.el, 'PageUp');
    expect(p.media().currentTime).toBe(0);
    const plain = renderPlayer();
    expect(plain.store.runHotkey('nextChapter')).toBe(false);
    expect(plain.store.runHotkey('nextFrame')).toBe(false);
    expect(plain.store.runHotkey('nextItem')).toBe(false);
  });

  it('formats keys for display', () => {
    expect(displayKey(' ')).toBe('Space');
    expect(displayKey('Shift+n')).toBe('Shift+N');
    expect(displayKey('ArrowLeft')).toBe('←');
    expect(displayKey('control+k')).toBe('Control+K');
    expect(displayKey('+')).toBe('+');
    expect(ANDES_PLAYER_DEFAULT_KEY_MAP.showShortcuts).toEqual(['?']);
  });
});

describe('context menu', () => {
  it('opens at the pointer with loop, copy and the keyboard help, and lets a second right click through', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    try {
      const p = attached();
      p.ready(90);
      p.fake().advance(42.6);
      const surface = req(p.q('[data-slot=gesture-surface]'));
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 80,
      });
      surface.dispatchEvent(event);
      p.render();
      expect(event.defaultPrevented).toBe(true);
      const menu = req(p.q('[data-slot=context-menu]'));
      expect(menu.getAttribute('role')).toBe('menu');
      expect(menu.style.left).toBe('120px');
      expect(p.store.menuOpen()).toBe(true);
      const items = p.qa('[data-slot=context-menu-item]');
      expect(items.map((i) => i.getAttribute('data-key'))).toEqual([
        'loop',
        'copy-link',
        'copy-link-time',
        'shortcuts',
      ]);
      expect(items[0].getAttribute('role')).toBe('menuitemcheckbox');
      expect(items[0].getAttribute('aria-checked')).toBe('false');
      expect(document.activeElement).toBe(items[0]);
      items[0].click();
      p.render();
      expect(p.store.repeat()).toBe('one');
      expect(p.q('[data-slot=context-menu]')).toBeNull();
      // Copy the address at the current time.
      surface.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      );
      p.render();
      req(
        p.q<HTMLButtonElement>(
          '[data-slot=context-menu-item][data-key=copy-link-time]',
        ),
      ).click();
      await settle();
      p.render();
      expect(writeText).toHaveBeenCalledWith(
        expect.stringMatching(/media\/clip\.mp4#t=42$/),
      );
      expect(p.q('[data-slot=announcer]')?.textContent).toContain(
        'Address copied',
      );
      // Open, then a second right click: the browser's own menu.
      surface.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      );
      p.render();
      const second = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      surface.dispatchEvent(second);
      p.render();
      expect(second.defaultPrevented).toBe(false);
      expect(p.q('[data-slot=context-menu]')).toBeNull();
    } finally {
      delete (navigator as unknown as Record<string, unknown>)['clipboard'];
    }
  });

  it('opens from Shift+F10, closes on Escape, outside presses and scroll, and can be turned off', () => {
    const p = attached();
    p.ready(60);
    p.el.focus();
    keydown(p.el, 'F10', { shiftKey: true });
    p.render();
    expect(p.q('[data-slot=context-menu]')).not.toBeNull();
    keydown(req(p.q('[data-slot=context-menu]')), 'Escape');
    p.render();
    expect(p.q('[data-slot=context-menu]')).toBeNull();
    expect(document.activeElement).toBe(p.el);
    keydown(p.el, 'ContextMenu');
    p.render();
    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    p.render();
    expect(p.q('[data-slot=context-menu]')).toBeNull();
    // The press that closed a menu is not also a click on the picture.
    expect(Date.now() - p.store.menuClosedAt).toBeLessThan(50);
    keydown(p.el, 'ContextMenu');
    p.render();
    document.dispatchEvent(new Event('scroll'));
    p.render();
    expect(p.q('[data-slot=context-menu]')).toBeNull();
    keydown(p.el, 'ContextMenu');
    p.render();
    req(
      p.q<HTMLButtonElement>(
        '[data-slot=context-menu-item][data-key=shortcuts]',
      ),
    ).click();
    p.render();
    expect(p.store.shortcutsOpen()).toBe(true);
    p.store.closeShortcuts();
    p.host.contextMenu.set(false);
    p.render();
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    req(p.q('[data-slot=gesture-surface]')).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('copying fails quietly without a clipboard', async () => {
    const p = renderPlayer();
    expect(await p.store.copyLink()).toBe(false);
    p.host.src.set(null);
    p.render();
    expect(p.store.mediaLink()).toBeNull();
  });
});

describe('mini player', () => {
  class FakeIntersectionObserver {
    static last: FakeIntersectionObserver | null = null;
    disconnected = false;
    constructor(
      private readonly callback: (
        entries: { isIntersecting: boolean; intersectionRatio: number }[],
      ) => void,
    ) {
      FakeIntersectionObserver.last = this;
    }
    observe(): void {
      // The test reports visibility itself.
    }
    disconnect(): void {
      this.disconnected = true;
    }
    report(ratio: number): void {
      this.callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    }
  }

  it('floats while it plays out of view, with its own buttons, and docks when back', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    const p = attached({ miniPlayer: true });
    p.ready(60);
    const observer = req(FakeIntersectionObserver.last);
    observer.report(0);
    p.render();
    // Paused out of view: stays in place.
    expect(p.el.hasAttribute('data-mini')).toBe(false);
    await p.store.play();
    p.render();
    expect(p.el.hasAttribute('data-mini')).toBe(true);
    expect(p.q('[data-slot=mini-placeholder]')?.textContent).toContain(
      'Playing in the mini player',
    );
    const viewport = req(p.q('[data-slot=viewport]'));
    expect(viewport.getAttribute('role')).toBe('region');
    expect(viewport.getAttribute('aria-label')).toBe('Mini player');
    expect(p.q('[data-slot=announcer]')?.textContent).toContain(
      'Playing in the mini player',
    );
    // Pausing in the corner keeps it there.
    p.store.pause();
    p.render();
    expect(p.el.hasAttribute('data-mini')).toBe(true);
    p.el.scrollIntoView = vi.fn();
    req(p.q<HTMLButtonElement>('[data-slot=mini-return]')).click();
    expect(p.el.scrollIntoView).toHaveBeenCalled();
    observer.report(0.6);
    p.render();
    expect(p.el.hasAttribute('data-mini')).toBe(false);
    expect(viewport.getAttribute('role')).toBeNull();
    p.host.miniPlayer.set(false);
    p.render();
    expect(observer.disconnected).toBe(true);
  });

  it('closing pauses and docks until the player is seen again', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    const p = attached({ miniPlayer: true });
    p.ready(60);
    const observer = req(FakeIntersectionObserver.last);
    await p.store.play();
    observer.report(0.1);
    p.render();
    expect(p.store.miniPlayerActive()).toBe(true);
    req(p.q<HTMLButtonElement>('[data-slot=mini-close]')).click();
    p.render();
    expect(p.media().paused).toBe(true);
    expect(p.store.miniPlayerActive()).toBe(false);
    await p.store.play();
    p.render();
    expect(p.store.miniPlayerActive()).toBe(false);
    observer.report(1);
    p.render();
    observer.report(0);
    p.render();
    expect(p.store.miniPlayerActive()).toBe(true);
  });
});

describe('playback details', () => {
  it('keeps (or drops) pitch correction', () => {
    const p = renderPlayer();
    expect(p.fake().preservesPitch).toBe(true);
    p.host.preservesPitch.set(false);
    p.render();
    expect(p.fake().preservesPitch).toBe(false);
  });

  it('waits for a possible double click before toggling playback with the mouse', async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    });
    try {
      const p = renderPlayer();
      p.ready(60);
      p.el.requestFullscreen = vi.fn(async () => undefined);
      const surface = req(p.q('[data-slot=gesture-surface]'));
      pointer(surface, 'pointerdown');
      pointer(surface, 'pointerup');
      expect(p.media().paused).toBe(true);
      vi.advanceTimersByTime(250);
      await vi.advanceTimersByTimeAsync(0);
      expect(p.media().paused).toBe(false);
      // A double click goes full screen without touching playback.
      pointer(surface, 'pointerdown');
      pointer(surface, 'pointerup');
      pointer(surface, 'pointerdown');
      pointer(surface, 'pointerup');
      surface.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      vi.advanceTimersByTime(300);
      await vi.advanceTimersByTimeAsync(0);
      expect(p.media().paused).toBe(false);
      expect(p.el.requestFullscreen).toHaveBeenCalled();
    } finally {
      delete (document as unknown as Record<string, unknown>)[
        'fullscreenEnabled'
      ];
    }
  });
});

describe('built-in label sets', () => {
  const keysOf = (value: object) => Object.keys(value).sort();

  it('ships complete sets for es, pt, fr, de and it', () => {
    const reference = ANDES_PLAYER_DEFAULT_LABELS as unknown as Record<
      string,
      unknown
    >;
    for (const [language, set] of Object.entries(ANDES_PLAYER_LABEL_SETS)) {
      const labels = set as unknown as Record<string, unknown>;
      expect(keysOf(labels), language).toEqual(keysOf(reference));
      for (const nested of [
        'errors',
        'colors',
        'edges',
        'fonts',
        'hotkeyActions',
      ]) {
        expect(
          keysOf(labels[nested] as object),
          `${language}.${nested}`,
        ).toEqual(keysOf(reference[nested] as object));
      }
      for (const [key, value] of Object.entries(labels)) {
        if (typeof value === 'string') {
          expect(value.length, `${language}.${key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('picks a set from a language tag and counts in each language', () => {
    expect(andesPlayerLabelsFor('es-PE').play).toBe('Reproducir');
    expect(andesPlayerLabelsFor('pt_BR').play).toBe('Reproduzir');
    expect(andesPlayerLabelsFor('de').minutes(2)).toBe('2 Minuten');
    expect(andesPlayerLabelsFor('it').seconds(1)).toBe('1 secondo');
    expect(andesPlayerLabelsFor('ja')).toBe(ANDES_PLAYER_DEFAULT_LABELS);
    // French counts zero as singular.
    expect(ANDES_PLAYER_LABELS_FR.seconds(0)).toBe('0 seconde');
    expect(ANDES_PLAYER_LABELS_FR.seconds(2)).toBe('2 secondes');
    for (const set of Object.values(ANDES_PLAYER_LABEL_SETS)) {
      expect(set.seekForward(1)).toBeTruthy();
      expect(set.seekBackward(10)).toBeTruthy();
      expect(set.seekOffset(-5)).toContain('5');
      expect(set.rateValue('1.5')).toContain('1');
      expect(set.announceUpNext('X', 5)).toContain('X');
      expect(set.announceShuffle(true)).not.toBe(set.announceShuffle(false));
      expect(set.announceFullscreen(true)).toBeTruthy();
      expect(set.announcePictureInPicture(false)).toBeTruthy();
      expect(set.announceCaptions(null)).not.toBe(set.announceCaptions('A'));
      expect(set.qualityAutoWith('720p')).toContain('720p');
      expect(set.playlistPosition(1, 3)).toContain('3');
      expect(set.upNextIn(4)).toContain('4');
      expect(set.percent(50)).toContain('50');
      expect(set.volumeValueText(50)).toContain('50');
      expect(set.announceVolume(40)).toContain('40');
      expect(set.announceRate('2×')).toContain('2');
      expect(set.announceAudioTrack('A')).toContain('A');
      expect(set.announceQuality('HD')).toContain('HD');
      expect(set.announceRepeat('X')).toContain('X');
      expect(set.announceItem('T', '1 / 2')).toContain('T');
      expect(set.announceError('m')).toContain('m');
      const time = { clock: '1:05', spoken: '1 x 5 y' };
      expect(set.seekValueText(time, time)).toContain('1 x 5 y');
      expect(set.liveSeekValueText(time, true)).toBeTruthy();
      expect(set.liveSeekValueText(time, false)).toContain('1 x 5 y');
      expect(set.behindLive(time)).toContain('1:05');
      expect(set.announceSeek(time)).toContain('1 x 5 y');
      expect(set.resumeFrom(time)).toContain('1:05');
      expect(set.hours(1)).not.toBe(set.hours(2).replace('2', '1'));
    }
  });

  it('provides a set app-wide with overrides on top', () => {
    const provider = provideAndesPlayerLocale('fr', {
      play: 'Jouer',
      errors: { network: 'Réseau' },
    }) as { provide: unknown; useValue: Record<string, unknown> };
    expect(provider.provide).toBe(ANDES_PLAYER_LABELS);
    expect(provider.useValue['play']).toBe('Jouer');
    expect(provider.useValue['pause']).toBe('Pause');
    expect(
      (provider.useValue['errors'] as Record<string, string>)['network'],
    ).toBe('Réseau');
    expect(
      (provider.useValue['errors'] as Record<string, string>)['decode'],
    ).toContain('navigateur');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provider] });
    uninstall();
    uninstall = installFakeMedia();
    const p = renderPlayer();
    expect(p.q('[data-slot=play-button]')?.getAttribute('aria-label')).toBe(
      'Jouer',
    );
  });
});

describe('more paths of the new parts', () => {
  it('previous/next buttons, the shuffle page and the up-next poster', async () => {
    vi.useFakeTimers();
    const items: AndesPlaylistItem[] = [
      { title: 'A', src: 'media/a.mp4' },
      { title: 'B', src: 'media/b.mp4', poster: 'b.jpg' },
      { title: 'C', src: 'media/c.mp4' },
    ];
    const p = attached({ src: null, playlist: items });
    p.ready(60);
    req(p.q<HTMLButtonElement>('[data-slot=next-button]')).click();
    p.render();
    expect(p.host.playlistIndex()).toBe(1);
    req(p.q<HTMLButtonElement>('[data-slot=previous-button]')).click();
    p.render();
    expect(p.host.playlistIndex()).toBe(0);
    const settings = req(p.q('andes-player-menu[data-type=settings]'));
    req(settings.querySelector<HTMLButtonElement>('button')).click();
    p.render();
    req(
      p.q<HTMLButtonElement>('[data-slot=menu-entry][data-page=shuffle]'),
    ).click();
    p.render();
    expect(p.q('[data-slot=menu]')?.getAttribute('aria-label')).toBe('Shuffle');
    req(p.q<HTMLButtonElement>('[data-slot=menu-option][data-key=on]')).click();
    p.render();
    expect(p.store.shuffle()).toBe(true);
    keydown(req(p.q('[data-slot=menu]')), 'ArrowLeft');
    p.render();
    expect(p.q('[data-slot=menu]')?.getAttribute('data-page')).toBe('settings');
    p.store.setShuffle(false);
    p.ready(60);
    await p.store.play();
    p.fake().finish();
    p.render();
    expect(p.q('.andes-player-up-next__poster')?.getAttribute('src')).toBe(
      'b.jpg',
    );
  });

  it('context menu: copy address, picture-in-picture item and tabbing out', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      configurable: true,
      value: true,
    });
    try {
      const p = attached();
      (p.media() as HTMLVideoElement).requestPictureInPicture = vi.fn(
        async () => ({}) as PictureInPictureWindow,
      );
      p.host.src.set('media/other.mp4');
      p.render();
      p.ready(60);
      keydown(p.el, 'ContextMenu');
      p.render();
      req(
        p.q<HTMLButtonElement>('[data-slot=context-menu-item][data-key=pip]'),
      ).click();
      expect(
        (p.media() as HTMLVideoElement).requestPictureInPicture,
      ).toHaveBeenCalled();
      keydown(p.el, 'ContextMenu');
      p.render();
      req(
        p.q<HTMLButtonElement>(
          '[data-slot=context-menu-item][data-key=copy-link]',
        ),
      ).click();
      await settle();
      expect(writeText).toHaveBeenCalledWith(
        expect.stringMatching(/media\/other\.mp4$/),
      );
      keydown(p.el, 'ContextMenu');
      p.render();
      keydown(req(p.q('[data-slot=context-menu]')), 'Tab');
      p.render();
      expect(p.q('[data-slot=context-menu]')).toBeNull();
    } finally {
      delete (navigator as unknown as Record<string, unknown>)['clipboard'];
      delete (document as unknown as Record<string, unknown>)[
        'pictureInPictureEnabled'
      ];
    }
  });
});
