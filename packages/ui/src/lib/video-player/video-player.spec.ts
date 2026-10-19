import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  provideAndesMediaAdapters,
  type AndesMediaAdapter,
  type AndesMediaAdapterHooks,
} from './core/media-adapter';
import { provideAndesPlayerLabels } from './core/player-labels';
import { provideAndesRemotePlayback } from './core/remote-playback';
import { allFakes, installFakeMedia } from './testing/fake-media';
import {
  keydown,
  pointer,
  renderPlayer,
  req,
  settle,
  stubMatchMedia,
} from './testing/player-harness';

let uninstall: () => void;

beforeEach(() => {
  uninstall = installFakeMedia();
});

afterEach(() => {
  vi.useRealTimers();
  uninstall();
  localStorage.clear();
});

/** A recording adapter with renditions, audio tracks, text tracks and live info. */
class FakeAdapter implements AndesMediaAdapter {
  readonly name = 'fake-stream';
  hooks: AndesMediaAdapterHooks | null = null;
  attached: string[] = [];
  detached = 0;
  selected: string[] = [];
  audio: string[] = [];
  text: (string | null)[] = [];
  canPlay(source: { src: string }): boolean {
    return source.src.endsWith('.m3u8');
  }
  attach(
    media: HTMLMediaElement,
    source: { src: string },
    hooks: AndesMediaAdapterHooks,
  ): void {
    this.attached.push(source.src);
    this.hooks = hooks;
    media.setAttribute('src', 'blob:fake');
  }
  detach(): void {
    this.detached++;
  }
  selectQuality(id: string): void {
    this.selected.push(id);
  }
  selectAudioTrack(id: string): void {
    this.audio.push(id);
  }
  selectTextTrack(id: string | null): void {
    this.text.push(id);
  }
}

describe('AndesVideoPlayer: rendering and ARIA', () => {
  it('renders a native video in a labelled region with the default bar', () => {
    const p = renderPlayer();
    expect(p.media().tagName).toBe('VIDEO');
    expect(p.el.getAttribute('role')).toBe('region');
    expect(p.el.getAttribute('aria-label')).toBe('Video player: Test clip');
    expect(p.el.getAttribute('tabindex')).toBe('0');
    expect(p.el.getAttribute('aria-keyshortcuts')).toContain('Space K');
    expect(p.q('andes-player-control-bar')?.getAttribute('data-layout')).toBe(
      'default',
    );
    expect(p.q('[data-slot=play-button]')?.getAttribute('aria-label')).toBe(
      'Play',
    );
    expect(p.q('[data-slot=time-slider]')?.getAttribute('role')).toBe('slider');
    expect(p.q('[data-slot=announcer]')?.getAttribute('aria-live')).toBe(
      'polite',
    );
    expect(p.media().getAttribute('src')).toBe('media/clip.mp4');
    expect(p.store.adapterName()).toBe('native');
  });

  it('applies the aspect ratio, auto ratio from the video and object fit', () => {
    const p = renderPlayer({ aspectRatio: '4/3' });
    expect(p.el.style.aspectRatio).toBe('4 / 3');
    p.host.aspectRatio.set('auto');
    p.render();
    expect(p.el.style.aspectRatio).toBe('16 / 9');
    p.fake().loadMetadata(10, 1080, 1920);
    p.render();
    expect(p.el.style.aspectRatio).toBe('1080 / 1920');
    p.host.aspectRatio.set('nonsense');
    p.render();
    expect(p.el.style.aspectRatio).toBe('');
  });

  it('exposes state hooks as data attributes', () => {
    const p = renderPlayer({ compact: true });
    expect(p.el.dataset['state']).toBe('paused');
    expect(p.el.dataset['layout']).toBe('video');
    expect(p.el.dataset['density']).toBe('compact');
    expect(p.el.dataset['size']).toBe('md');
    expect(p.el.dataset['skin']).toBe('glass');
    expect(p.el.hasAttribute('data-controls-visible')).toBe(true);
  });

  it('renders tracks as <track> elements', () => {
    const p = renderPlayer({
      tracks: [
        {
          kind: 'subtitles',
          src: 'en.vtt',
          srclang: 'en',
          label: 'English',
          default: true,
        },
        { kind: 'chapters', src: 'ch.vtt' },
      ],
    });
    const tracks = p.qa<HTMLTrackElement>('track');
    expect(tracks).toHaveLength(2);
    expect(tracks[0].getAttribute('srclang')).toBe('en');
    expect(tracks[0].hasAttribute('default')).toBe(true);
    expect(tracks[1].getAttribute('kind')).toBe('chapters');
  });

  it('switches to an <audio> element and an audio bar in audio-only mode', () => {
    const p = renderPlayer({
      audioOnly: true,
      src: 'media/song.m4a',
      poster: 'cover.jpg',
    });
    expect(p.media().tagName).toBe('AUDIO');
    expect(p.el.getAttribute('aria-label')).toBe('Audio player: Test clip');
    expect(p.el.dataset['layout']).toBe('audio');
    expect(p.q('andes-player-control-bar')?.getAttribute('data-layout')).toBe(
      'audio',
    );
    expect(p.q('andes-player-big-play-button')).toBeNull();
    expect(p.q('andes-player-poster img')?.getAttribute('src')).toBe(
      'cover.jpg',
    );
    expect(p.q('andes-player-fullscreen-button')).toBeNull();
    expect(p.store.fullscreenSupported()).toBe(false);
    expect(p.el.style.aspectRatio).toBe('');
    // The cover stays after playback starts.
    p.store.play();
    p.ready(6);
    expect(p.q('andes-player-poster')?.hasAttribute('hidden')).toBe(false);
  });

  it('renders the minimal bar and no bar for controls="none"', () => {
    const p = renderPlayer({ controls: 'minimal' });
    expect(p.q('andes-player-control-bar')?.getAttribute('data-layout')).toBe(
      'minimal',
    );
    p.host.controls.set('none');
    p.host.customControls.set(true);
    p.render();
    expect(p.q('andes-player-control-bar')).toBeNull();
    expect(p.q('andes-player-big-play-button')).toBeNull();
    expect(
      p.q('.andes-video-player__bottom .custom-controls')?.textContent,
    ).toBe('custom');
  });

  it('hides the poster once playback starts', async () => {
    const p = renderPlayer({ poster: 'poster.jpg' });
    expect(p.q('andes-player-poster')?.hasAttribute('hidden')).toBe(false);
    p.ready();
    await p.store.play();
    p.render();
    expect(p.q('andes-player-poster')?.hasAttribute('hidden')).toBe(true);
  });

  it('is decorative in background mode: hidden from AT, muted, looping, autoplaying', async () => {
    const p = renderPlayer({ background: true });
    await settle();
    p.render();
    expect(p.el.getAttribute('aria-hidden')).toBe('true');
    expect(p.el.hasAttribute('role')).toBe(false);
    expect(p.el.hasAttribute('tabindex')).toBe(false);
    expect(p.media().muted).toBe(true);
    expect(p.media().loop).toBe(true);
    expect(p.media().style.objectFit).toBe('cover');
    expect(p.fake().calls.play).toBeGreaterThan(0);
    expect(p.q('andes-player-control-bar')).toBeNull();
    expect(p.q('[data-slot=announcer]')).toBeNull();
    expect(p.store.controlsVisible()).toBe(false);
    // With controls it keeps a pause toggle and stays in the accessibility tree.
    p.host.controls.set('minimal');
    p.render();
    expect(p.el.getAttribute('aria-hidden')).toBeNull();
    expect(
      p.q('.andes-video-player__ambient [data-slot=play-button]'),
    ).not.toBeNull();
  });
});

describe('AndesVideoPlayer: playback state and two-way models', () => {
  it('mirrors media events into the store and the models', async () => {
    const p = renderPlayer();
    p.ready(200);
    expect(p.store.duration()).toBe(200);
    expect(p.host.events).toContain('metadata:200');
    await p.store.play();
    p.render();
    expect(p.store.paused()).toBe(false);
    expect(p.host.paused()).toBe(false);
    expect(p.host.events).toContain('played');
    expect(p.el.dataset['state']).toBe('playing');
    p.fake().advance(42);
    p.render();
    expect(p.store.currentTime()).toBe(42);
    expect(p.host.currentTime()).toBe(42);
    p.fake().buffer([[0, 60]]);
    expect(p.store.bufferedEnd()).toBe(60);
    p.fake().finish();
    p.render();
    expect(p.store.ended()).toBe(true);
    expect(p.host.events).toContain('completed');
    expect(p.q('[data-slot=play-button]')?.getAttribute('aria-label')).toBe(
      'Replay',
    );
  });

  it('applies model writes from the app: time, volume, mute, pause, rate', async () => {
    const p = renderPlayer();
    p.ready(100);
    p.host.currentTime.set(30);
    p.render();
    expect(p.media().currentTime).toBe(30);
    p.host.volume.set(0.25);
    p.render();
    expect(p.media().volume).toBe(0.25);
    p.host.muted.set(true);
    p.render();
    expect(p.media().muted).toBe(true);
    p.host.rate.set(1.5);
    p.render();
    expect(p.media().playbackRate).toBe(1.5);
    p.host.paused.set(false);
    p.render();
    await settle();
    expect(p.media().paused).toBe(false);
    p.host.paused.set(true);
    p.render();
    expect(p.media().paused).toBe(true);
  });

  it('applies values set before the element exists once it attaches', async () => {
    const p = renderPlayer({ volume: 0.3, muted: true, rate: 2 });
    expect(p.media().volume).toBe(0.3);
    expect(p.media().muted).toBe(true);
    expect(p.media().playbackRate).toBe(2);
  });

  it('reports ended after seeking to the end while paused', () => {
    const p = renderPlayer();
    p.ready(30);
    p.store.seek(30);
    p.render();
    expect(p.store.ended()).toBe(true);
    expect(p.q('[data-slot=play-button]')?.getAttribute('aria-label')).toBe(
      'Replay',
    );
    p.store.seek(10);
    expect(p.store.ended()).toBe(false);
  });

  it('starts at startTime once metadata arrives', () => {
    const p = renderPlayer({ startTime: 15 });
    p.ready(60);
    expect(p.media().currentTime).toBe(15);
    expect(p.store.currentTime()).toBe(15);
  });

  it('resets cleanly when the source changes, keeping volume and rate', async () => {
    const p = renderPlayer();
    p.ready(60);
    await p.store.play();
    p.store.setVolume(0.4);
    p.store.setPlaybackRate(1.5);
    p.fake().advance(20);
    p.host.src.set('media/other.webm');
    p.render();
    expect(p.media().getAttribute('src')).toBe('media/other.webm');
    expect(p.store.currentTime()).toBe(0);
    expect(p.store.started()).toBe(false);
    expect(p.store.duration()).toBeNaN();
    expect(p.store.volume()).toBe(0.4);
    expect(p.store.playbackRate()).toBe(1.5);
    expect(p.store.source()?.type).toBe('video/webm');
  });

  it('picks the first matching source from a list', () => {
    const restore = stubMatchMedia(['max-width: 600px']);
    const p = renderPlayer({
      src: null,
      sources: [
        { src: 'small.mp4', media: '(max-width: 600px)' },
        { src: 'big.mp4' },
      ],
    });
    expect(p.media().getAttribute('src')).toBe('small.mp4');
    restore();
  });

  it('exposes imperative methods', async () => {
    const p = renderPlayer();
    p.ready(100);
    expect(await p.player.play()).toBe(true);
    p.player.pause();
    expect(p.media().paused).toBe(true);
    p.player.togglePlay();
    await settle();
    expect(p.media().paused).toBe(false);
    p.player.seek(50);
    expect(p.media().currentTime).toBe(50);
    p.player.seekBy(-10);
    expect(p.media().currentTime).toBe(40);
    p.player.seek(1000);
    expect(p.media().currentTime).toBe(100);
    const loads = p.fake().calls.load;
    p.player.load();
    expect(p.fake().calls.load).toBeGreaterThan(loads);
    p.player.focus();
    expect(document.activeElement).toBe(p.el);
    expect(await p.player.enterFullscreen()).toBe(false);
    await p.player.exitFullscreen();
    expect(await p.player.enterPictureInPicture()).toBe(false);
    await p.player.exitPictureInPicture();
    expect(await p.player.captureFrame()).toBeNull();
  });

  it('loops a range', () => {
    const p = renderPlayer({ loopRange: [10, 20] });
    p.ready(60);
    p.fake().advance(20.1);
    expect(p.media().currentTime).toBe(10);
  });
});

describe('AndesVideoPlayer: autoplay policy', () => {
  it('plays with sound when allowed', async () => {
    const p = renderPlayer({ autoplay: true });
    await settle();
    p.render();
    expect(p.media().paused).toBe(false);
    expect(p.media().muted).toBe(false);
    expect(p.store.autoplayMuted()).toBe(false);
  });

  it('falls back to muted autoplay and offers tap to unmute', async () => {
    const p = renderPlayer();
    p.fake().policy = 'muted-only';
    p.host.autoplay.set(true);
    p.host.src.set('media/again.mp4');
    p.render();
    await settle();
    p.render();
    expect(p.media().paused).toBe(false);
    expect(p.media().muted).toBe(true);
    expect(p.store.autoplayMuted()).toBe(true);
    const unmute = p.q<HTMLButtonElement>('[data-slot=unmute-button]');
    expect(unmute?.textContent).toContain('Tap to unmute');
    expect(p.q('andes-player-unmute-button')?.hasAttribute('hidden')).toBe(
      false,
    );
    unmute?.click();
    p.render();
    expect(p.media().muted).toBe(false);
    expect(p.store.autoplayMuted()).toBe(false);
    expect(p.q('andes-player-unmute-button')?.hasAttribute('hidden')).toBe(
      true,
    );
  });

  it('waits for a tap when even muted autoplay is refused, and never throws', async () => {
    const p = renderPlayer();
    p.fake().policy = 'deny';
    p.host.autoplay.set(true);
    p.host.src.set('media/again.mp4');
    p.render();
    await settle();
    p.render();
    expect(p.media().paused).toBe(true);
    expect(p.media().muted).toBe(false);
    expect(p.store.autoplayBlocked()).toBe(true);
    expect(p.q('andes-player-big-play-button')?.hasAttribute('hidden')).toBe(
      false,
    );
    expect(await p.store.play()).toBe(false);
  });

  it('ignores an aborted play (a newer load interrupted it)', async () => {
    const p = renderPlayer();
    p.fake().policy = 'abort';
    p.host.autoplay.set(true);
    p.host.src.set('media/again.mp4');
    p.render();
    await settle();
    expect(p.store.autoplayBlocked()).toBe(false);
  });

  it('plays a play() made before any source once one attaches', async () => {
    const p = renderPlayer({ src: null });
    expect(await p.store.play()).toBe(false);
    p.host.src.set('media/late.mp4');
    p.render();
    await settle();
    expect(p.media().paused).toBe(false);
  });
});

describe('AndesVideoPlayer: errors and retry', () => {
  it('maps media errors, shows the panel, announces and emits', () => {
    const p = renderPlayer({ retryAttempts: 0 });
    p.ready(60);
    p.fake().fail(2, 'connection reset');
    p.render();
    expect(p.store.error()?.code).toBe('network');
    expect(p.store.error()?.detail).toBe('connection reset');
    expect(p.host.errors[0].code).toBe('network');
    expect(p.el.dataset['state']).toBe('error');
    const panel = p.q('[data-slot=error]');
    expect(panel?.getAttribute('role')).toBe('group');
    expect(panel?.textContent).toContain('This media could not be played');
    expect(panel?.textContent).toContain('A network problem');
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Error.');
    expect(p.q('andes-player-big-play-button')?.hasAttribute('hidden')).toBe(
      true,
    );
  });

  it('ignores errors without a MediaError or without a source', () => {
    const p = renderPlayer();
    p.fake().emit('error');
    expect(p.store.error()).toBeNull();
    p.host.src.set(null);
    p.render();
    p.fake().fail(4);
    expect(p.store.error()).toBeNull();
  });

  it('retries from where playback was', async () => {
    const p = renderPlayer();
    p.ready(100);
    await p.store.play();
    p.fake().advance(40);
    p.fake().fail(3);
    p.render();
    const loads = p.fake().calls.load;
    p.q<HTMLButtonElement>('[data-slot=retry]')?.click();
    p.render();
    expect(p.fake().calls.load).toBeGreaterThan(loads);
    expect(p.store.error()).toBeNull();
    p.ready(100);
    expect(p.media().currentTime).toBe(40);
    await settle();
    expect(p.media().paused).toBe(false);
  });

  it('reports unsupported when no source can be chosen', () => {
    const restore = stubMatchMedia([]);
    const p = renderPlayer({
      src: null,
      sources: [{ src: 'a.mp4', media: '(min-width: 9999px)' }],
    });
    expect(p.store.error()?.code).toBe('unsupported');
    restore();
  });
});

describe('AndesVideoPlayer: adapter contract', () => {
  it('uses a matching adapter, reports renditions, tracks and live state', () => {
    const adapter = new FakeAdapter();
    const p = renderPlayer({ src: 'live.m3u8', adapters: [() => adapter] });
    expect(adapter.attached).toEqual(['live.m3u8']);
    expect(p.store.adapterName()).toBe('fake-stream');
    const hooks = req(adapter.hooks);
    hooks.setQualities([
      { id: 'hd', height: 720 },
      { id: 'sd', height: 360, label: 'Low' },
    ]);
    hooks.setActiveQuality('hd', true);
    hooks.setAudioTracks([
      { id: 'a1', label: 'English', language: 'en' },
      { id: 'a2', label: 'Español', language: 'es' },
    ]);
    hooks.setActiveAudioTrack('a1');
    hooks.setTextTracks([
      { id: 't1', kind: 'subtitles', label: 'Inline', language: 'fr' },
    ]);
    p.render();
    expect(p.store.qualityLabel('auto')).toBe('Auto (720p)');
    expect(p.store.qualityLabel('sd')).toBe('Low');
    expect(p.store.qualityLabel('unknown')).toBe('unknown');
    p.store.selectQuality('sd', 'control');
    expect(adapter.selected).toEqual(['sd']);
    expect(p.store.autoQuality()).toBe(false);
    p.render();
    expect(p.host.qualities.at(-1)?.id).toBe('sd');
    p.store.selectQuality('nope');
    expect(adapter.selected).toEqual(['sd']);
    p.store.selectQuality('auto');
    expect(p.store.autoQuality()).toBe(true);
    p.store.selectAudioTrack('a2', 'control');
    expect(adapter.audio).toEqual(['a2']);
    expect(p.store.activeAudioTrackId()).toBe('a2');
    p.store.selectAudioTrack('missing');
    p.store.selectTextTrack('t1');
    expect(adapter.text.at(-1)).toBe('t1');
    hooks.setActiveTextTrack(null);
    expect(p.store.activeTextTrackId()).toBeNull();

    hooks.setLive({
      streamType: 'live-dvr',
      liveEdge: 300,
      liveEdgeTolerance: 5,
    });
    p.fake().goLive(100, 300);
    p.render();
    expect(p.store.isLive()).toBe(true);
    expect(p.store.streamType()).toBe('live-dvr');
    expect(p.store.timelineStart()).toBe(100);
    expect(p.store.timelineEnd()).toBe(300);
    expect(p.el.dataset['stream']).toBe('live-dvr');
  });

  it('detaches the previous adapter on source change and ignores stale hooks', () => {
    const adapter = new FakeAdapter();
    const p = renderPlayer({ src: 'one.m3u8', adapters: [() => adapter] });
    const stale = req(adapter.hooks);
    p.host.src.set('two.m3u8');
    p.render();
    expect(adapter.detached).toBe(1);
    stale.setQualities([{ id: 'x', height: 1 }]);
    expect(p.store.qualities()).toEqual([]);
    p.host.src.set('plain.mp4');
    p.render();
    expect(p.store.adapterName()).toBe('native');
    expect(adapter.detached).toBe(2);
  });

  it('turns adapter errors into player errors; non-fatal ones are ignored', () => {
    const adapter = new FakeAdapter();
    const p = renderPlayer({ src: 'one.m3u8', adapters: [() => adapter] });
    req(adapter.hooks).reportError({ fatal: false, detail: 'blip' });
    expect(p.store.error()).toBeNull();
    req(adapter.hooks).reportError({ cause: new Error('manifest 404') });
    expect(p.store.error()?.code).toBe('adapter');
    expect(p.store.error()?.detail).toBe('manifest 404');
  });

  it('reports a failing attach (sync or async) as an adapter error', async () => {
    const throwing: AndesMediaAdapter = {
      name: 'throwing',
      canPlay: () => true,
      attach: () => {
        throw new Error('boom');
      },
      detach: () => undefined,
    };
    const p = renderPlayer({ adapters: [() => throwing] });
    expect(p.store.error()?.code).toBe('adapter');

    const rejecting: AndesMediaAdapter = {
      name: 'rejecting',
      canPlay: () => true,
      attach: () => Promise.reject(new Error('no engine')),
      detach: () => {
        throw new Error('teardown');
      },
    };
    p.host.adapters.set([() => rejecting]);
    p.host.src.set('again.mp4');
    p.render();
    await settle();
    expect(p.store.error()?.detail).toBe('no engine');
    // A failing teardown never blocks the next source.
    p.host.adapters.set(null);
    p.host.src.set('third.mp4');
    p.render();
    expect(p.store.adapterName()).toBe('native');
  });

  it('autoplays after an async attach resolves', async () => {
    let resolve!: () => void;
    const slow: AndesMediaAdapter = {
      name: 'slow',
      canPlay: () => true,
      attach: () => new Promise<void>((done) => (resolve = done)),
      detach: () => undefined,
    };
    const p = renderPlayer({ adapters: [() => slow], autoplay: true });
    await settle();
    expect(p.media().paused).toBe(true);
    resolve();
    await settle();
    expect(p.media().paused).toBe(false);
  });

  it('skips adapters whose factory or canPlay throws, and reads injected adapters', () => {
    const adapter = new FakeAdapter();
    TestBed.configureTestingModule({
      providers: [provideAndesMediaAdapters(() => adapter)],
    });
    const p = renderPlayer({ src: 'x.m3u8' });
    expect(p.store.adapterName()).toBe('fake-stream');
    p.host.adapters.set([
      () => {
        throw new Error('factory');
      },
      () => ({
        name: 'bad',
        canPlay: () => {
          throw new Error('canPlay');
        },
        attach: () => undefined,
        detach: () => undefined,
      }),
    ]);
    p.host.src.set('y.mp4');
    p.render();
    expect(p.store.adapterName()).toBe('native');
  });
});

describe('AndesVideoPlayer: live detection without an adapter', () => {
  it('detects live, DVR and on-demand from the element', async () => {
    const p = renderPlayer();
    p.fake().goLive(0, 20);
    p.render();
    expect(p.store.streamType()).toBe('live');
    expect(p.store.canSeek()).toBe(false);
    expect(p.q('andes-player-time-slider')?.hasAttribute('hidden')).toBe(true);
    expect(p.q('andes-player-live-button')?.hasAttribute('hidden')).toBe(false);
    p.fake().goLive(0, 600);
    p.render();
    expect(p.store.streamType()).toBe('live-dvr');
    await p.store.play();
    p.fake().advance(500);
    p.render();
    expect(p.store.behindLive()).toBe(100);
    expect(p.store.atLiveEdge()).toBe(false);
    const live = req(p.q<HTMLButtonElement>('[data-slot=live-button]'));
    expect(live.getAttribute('aria-label')).toBe('Go to live');
    expect(p.q('[data-slot=time-behind]')?.textContent).toBe('-1:40');
    live.click();
    p.render();
    // Just behind the edge (half the tolerance, at most 3s), never past the playable end.
    expect(p.media().currentTime).toBe(597);
    expect(p.store.atLiveEdge()).toBe(true);
    expect(live.getAttribute('aria-disabled')).toBe('true');
    expect(p.q('andes-player-time')?.hasAttribute('hidden')).toBe(true);
    live.click();
    expect(p.media().currentTime).toBe(597);
    p.host.streamType.set('on-demand');
    p.render();
    expect(p.store.isLive()).toBe(false);
  });
});

describe('AndesVideoPlayer: hotkeys', () => {
  function focused() {
    const p = renderPlayer();
    p.ready(100);
    document.body.appendChild(p.fixture.nativeElement);
    p.el.focus();
    return p;
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('runs the default map while the player has focus', async () => {
    const p = focused();
    expect(keydown(p.el, ' ').defaultPrevented).toBe(true);
    await settle();
    expect(p.media().paused).toBe(false);
    keydown(p.el, 'k');
    expect(p.media().paused).toBe(true);
    keydown(p.el, 'm');
    expect(p.media().muted).toBe(true);
    keydown(p.el, 'm');
    keydown(p.el, 'ArrowRight');
    expect(p.media().currentTime).toBe(5);
    keydown(p.el, 'l');
    expect(p.media().currentTime).toBe(15);
    keydown(p.el, 'ArrowLeft', { shiftKey: true });
    expect(p.media().currentTime).toBe(5);
    keydown(p.el, 'j');
    expect(p.media().currentTime).toBe(0);
    keydown(p.el, '5');
    expect(p.media().currentTime).toBe(50);
    keydown(p.el, 'End');
    expect(p.media().currentTime).toBe(100);
    keydown(p.el, 'Home');
    expect(p.media().currentTime).toBe(0);
    p.store.setVolume(0.5);
    keydown(p.el, 'ArrowUp');
    expect(p.media().volume).toBe(0.55);
    keydown(p.el, 'ArrowDown');
    keydown(p.el, 'ArrowDown');
    expect(p.media().volume).toBe(0.45);
    keydown(p.el, '>', { shiftKey: true });
    expect(p.media().playbackRate).toBe(1.5);
    keydown(p.el, '<', { shiftKey: true });
    keydown(p.el, '<', { shiftKey: true });
    expect(p.media().playbackRate).toBe(0.5);
    keydown(p.el, '<', { shiftKey: true });
    expect(p.media().playbackRate).toBe(0.5);
    expect(keydown(p.el, 'x').defaultPrevented).toBe(false);
    // Not applicable right now: not handled, default not prevented.
    expect(keydown(p.el, 'c').defaultPrevented).toBe(false);
    expect(keydown(p.el, 'f').defaultPrevented).toBe(false);
    expect(keydown(p.el, 'i').defaultPrevented).toBe(false);
    expect(keydown(p.el, 'Escape').defaultPrevented).toBe(false);
  });

  it('shows feedback and announces hotkey changes (debounced for volume and seek)', () => {
    vi.useFakeTimers();
    const p = focused();
    keydown(p.el, 'm');
    p.render();
    expect(p.store.feedback()?.kind).toBe('mute');
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Muted');
    keydown(p.el, 'ArrowUp');
    keydown(p.el, 'ArrowUp');
    vi.advanceTimersByTime(500);
    p.render();
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Volume 10%');
    keydown(p.el, 'ArrowRight');
    keydown(p.el, 'ArrowRight');
    vi.advanceTimersByTime(500);
    p.render();
    expect(p.q('[data-slot=announcer]')?.textContent).toContain(
      'Moved to 10 seconds',
    );
    expect(p.store.feedback()?.kind).toBe('seek-forward');
    vi.advanceTimersByTime(800);
    expect(p.store.feedback()).toBeNull();
  });

  it('never steals keys from text fields, sliders, buttons or menus', () => {
    const p = focused();
    const input = document.createElement('input');
    p.el.appendChild(input);
    keydown(input, 'k');
    expect(p.media().paused).toBe(true);
    const slider = req(p.q('[data-slot=volume-slider]'));
    p.store.setVolume(0.5);
    keydown(slider, 'm');
    expect(p.media().muted).toBe(true);
    // The slider owns its arrows: from muted (0%) one step up unmutes at 5%.
    keydown(slider, 'ArrowUp');
    expect(p.media().volume).toBe(0.05);
    expect(p.media().muted).toBe(false);
    const button = req(p.q<HTMLButtonElement>('[data-slot=mute-button]'));
    expect(keydown(button, ' ').defaultPrevented).toBe(false);
  });

  it('uses a custom key map and publishes it in aria-keyshortcuts', () => {
    const p = renderPlayer({ keyMap: { togglePlay: ['p'], toggleMute: [] } });
    p.ready(10);
    keydown(p.el, 'k');
    expect(p.media().paused).toBe(true);
    keydown(p.el, 'm');
    expect(p.media().muted).toBe(false);
    expect(
      p.q('[data-slot=play-button]')?.getAttribute('aria-keyshortcuts'),
    ).toBe('P');
    expect(
      p.q('[data-slot=mute-button]')?.hasAttribute('aria-keyshortcuts'),
    ).toBe(false);
  });

  it('only listens page-wide in global mode, and not at all when off', async () => {
    const p = renderPlayer({ hotkeys: 'global' });
    p.ready(10);
    document.body.appendChild(p.fixture.nativeElement);
    expect(p.el.hasAttribute('tabindex')).toBe(false);
    keydown(document.body, 'k');
    await settle();
    expect(p.media().paused).toBe(false);
    // A key inside another player belongs to that player.
    const other = document.createElement('andes-video-player');
    const inner = document.createElement('div');
    other.appendChild(inner);
    document.body.appendChild(other);
    keydown(inner, 'k');
    expect(p.media().paused).toBe(false);
    p.host.hotkeys.set('off');
    p.render();
    keydown(document.body, 'k');
    keydown(p.el, 'k');
    expect(p.media().paused).toBe(false);
    expect(p.el.hasAttribute('aria-keyshortcuts')).toBe(false);
  });
});

describe('AndesVideoPlayer: auto-hiding controls', () => {
  it('hides after the timeout while playing and shows again on activity', async () => {
    vi.useFakeTimers();
    const p = renderPlayer({ autohide: 2000 });
    p.ready(60);
    await p.store.play();
    p.render();
    pointer(p.el, 'pointermove');
    p.render();
    expect(p.el.hasAttribute('data-controls-visible')).toBe(true);
    vi.advanceTimersByTime(1999);
    p.render();
    expect(p.el.hasAttribute('data-controls-visible')).toBe(true);
    vi.advanceTimersByTime(2);
    p.render();
    expect(p.el.hasAttribute('data-controls-visible')).toBe(false);
    expect(p.el.hasAttribute('data-idle')).toBe(true);
    keydown(p.el, 'x');
    p.render();
    expect(p.el.hasAttribute('data-controls-visible')).toBe(true);
  });

  it('stays visible while paused, with a menu open, or with the pointer over the bar', async () => {
    vi.useFakeTimers();
    const p = renderPlayer({ autohide: 1000 });
    p.ready(60);
    p.store.notifyActivity();
    vi.advanceTimersByTime(1500);
    expect(p.store.controlsVisible()).toBe(true);
    await p.store.play();
    vi.advanceTimersByTime(1500);
    expect(p.store.controlsVisible()).toBe(false);
    p.store.setMenuOpen(true);
    expect(p.store.controlsVisible()).toBe(true);
    p.store.setMenuOpen(false);
    vi.advanceTimersByTime(1500);
    expect(p.store.controlsVisible()).toBe(false);
    pointer(req(p.q('andes-player-control-bar')), 'pointerenter', {
      pointerType: 'mouse',
    });
    expect(p.store.controlsVisible()).toBe(true);
    pointer(req(p.q('andes-player-control-bar')), 'pointerleave');
    pointer(req(p.q('andes-player-control-bar')), 'pointerenter', {
      pointerType: 'touch',
    });
    expect(p.store.pointerOverControls()).toBe(false);
  });

  it('hides when the mouse leaves while playing; autohide 0 keeps them up', async () => {
    const p = renderPlayer({ autohide: 0 });
    p.ready(60);
    await p.store.play();
    pointer(p.el, 'pointerleave', { pointerType: 'mouse' });
    expect(p.store.controlsVisible()).toBe(true);
    p.host.autohide.set(3000);
    p.render();
    pointer(p.el, 'pointerleave', { pointerType: 'mouse' });
    expect(p.store.controlsVisible()).toBe(false);
  });

  it('shows on keyboard focus inside the chrome and tracks focus leaving', async () => {
    const p = renderPlayer();
    p.ready(60);
    document.body.appendChild(p.fixture.nativeElement);
    await p.store.play();
    p.store.hideControls();
    const button = req(p.q<HTMLButtonElement>('[data-slot=mute-button]'));
    button.focus();
    expect(p.store.controlsVisible()).toBe(true);
    button.blur();
    expect(p.store.keyboardFocusInside()).toBe(false);
    document.body.innerHTML = '';
  });
});

describe('AndesVideoPlayer: gestures', () => {
  function surface(p: ReturnType<typeof renderPlayer>) {
    const element = req(p.q('[data-slot=gesture-surface]'));
    element.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 300,
        height: 170,
        right: 300,
        bottom: 170,
      }) as DOMRect;
    return element;
  }

  it('click toggles play with feedback; double-click toggles fullscreen', async () => {
    const p = renderPlayer();
    p.ready(60);
    const target = surface(p);
    pointer(target, 'pointerdown', { clientX: 150 });
    pointer(target, 'pointerup', { clientX: 150 });
    await settle();
    expect(p.media().paused).toBe(false);
    expect(p.store.feedback()?.kind).toBe('play');
    const fullscreen = vi.spyOn(p.store, 'toggleFullscreen');
    target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(fullscreen).toHaveBeenCalledWith('gesture');
    // A drag is not a click; a right button is not a click.
    pointer(target, 'pointerdown', { clientX: 0 });
    pointer(target, 'pointerup', { clientX: 100 });
    pointer(target, 'pointerdown', { clientX: 10, button: 2 });
    pointer(target, 'pointerup', { clientX: 10, button: 2 });
    expect(p.media().paused).toBe(false);
  });

  it('tap toggles the controls; double-tap the sides seeks with a ripple', async () => {
    const p = renderPlayer();
    p.ready(60);
    await p.store.play();
    p.store.seek(30);
    const target = surface(p);
    const tap = (x: number) => {
      pointer(target, 'pointerdown', { clientX: x, pointerType: 'touch' });
      pointer(target, 'pointerup', { clientX: x, pointerType: 'touch' });
    };
    p.store.notifyActivity();
    tap(150);
    expect(p.store.controlsVisible()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 350));
    tap(150);
    expect(p.store.controlsVisible()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    tap(280);
    tap(280);
    expect(p.media().currentTime).toBe(40);
    expect(p.store.feedback()).toMatchObject({
      kind: 'seek-forward',
      side: 'end',
      text: '+10s',
    });
    expect(p.store.controlsVisible()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    tap(20);
    tap(20);
    expect(p.media().currentTime).toBe(30);
    expect(p.store.feedback()?.side).toBe('start');
    await new Promise((resolve) => setTimeout(resolve, 350));
    tap(150);
    tap(150);
    expect(p.media().paused).toBe(true);
    // Touch double taps never toggle fullscreen.
    const fullscreen = vi.spyOn(p.store, 'toggleFullscreen');
    target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(fullscreen).not.toHaveBeenCalled();
  });

  it('does nothing with gestures turned off', () => {
    const p = renderPlayer({ gestures: false });
    p.ready(60);
    const target = surface(p);
    pointer(target, 'pointerdown', { clientX: 150 });
    pointer(target, 'pointerup', { clientX: 150 });
    expect(p.media().paused).toBe(true);
  });
});

describe('AndesVideoPlayer: captions', () => {
  function withTracks() {
    const p = renderPlayer();
    const en = p.fake().addTextTrack({
      kind: 'subtitles',
      label: 'English',
      language: 'en',
      cues: [{ start: 0, end: 2, text: 'Hello' }],
    });
    const es = p.fake().addTextTrack({
      kind: 'subtitles',
      label: 'Español',
      language: 'es',
      cues: [{ start: 0, end: 2, text: 'Hola' }],
    });
    const chapters = p.fake().addTextTrack({
      kind: 'chapters',
      cues: [
        { start: 0, end: 30, text: 'Intro' },
        { start: 30, end: 60, text: 'Main' },
      ],
    });
    p.ready(60);
    return { p, en, es, chapters };
  }

  it('lists caption tracks, renders active cues in the overlay and toggles with C', () => {
    const { p, en, es } = withTracks();
    expect(p.store.textTracks().map((t) => t.label)).toEqual([
      'English',
      'Español',
    ]);
    expect(p.store.captionsEnabled()).toBe(false);
    p.store.selectTextTrack('track-1', 'control');
    p.render();
    expect(es.mode).toBe('hidden');
    expect(en.mode).toBe('disabled');
    p.fake().advance(1);
    p.render();
    expect(p.q('[data-slot=captions]')?.textContent).toBe('Hola');
    expect(p.el.hasAttribute('data-captions')).toBe(true);
    expect(p.host.captions.at(-1)?.language).toBe('es');
    expect(p.q('[data-slot=announcer]')?.textContent).toContain(
      'Captions on, Español',
    );
    keydown(p.el, 'c');
    p.render();
    expect(p.store.captionsEnabled()).toBe(false);
    expect(es.mode).toBe('disabled');
    expect(p.host.captions.at(-1)).toBeNull();
    // Turning them back on restores the remembered language.
    keydown(p.el, 'c');
    expect(p.store.activeTextTrack()?.language).toBe('es');
    p.store.selectTextTrack('missing');
    expect(p.store.activeTextTrack()?.language).toBe('es');
  });

  it('remembers the caption choice across sources', () => {
    const { p } = withTracks();
    p.store.selectTextTrack('track-1');
    p.host.src.set('media/next.mp4');
    p.render();
    p.fake().textTracks.clear();
    p.fake().addTextTrack({
      kind: 'subtitles',
      label: 'English',
      language: 'en',
    });
    p.fake().addTextTrack({
      kind: 'subtitles',
      label: 'Spanish',
      language: 'es-MX',
    });
    expect(p.store.activeTextTrack()?.language).toBe('es-MX');
  });

  it('uses the native renderer when asked', () => {
    const p = renderPlayer({ captionsRenderer: 'native' });
    const en = p
      .fake()
      .addTextTrack({ kind: 'captions', label: 'English', language: 'en' });
    p.store.selectTextTrack('track-0');
    expect(en.mode).toBe('showing');
    expect(p.q('andes-player-captions')).toBeNull();
  });

  it('reads chapters from a chapters track and shows the current one', () => {
    const { p, chapters } = withTracks();
    expect(chapters.mode).toBe('hidden');
    expect(p.store.chapters().map((c) => c.title)).toEqual(['Intro', 'Main']);
    p.fake().advance(40);
    p.render();
    expect(p.store.currentChapter()?.title).toBe('Main');
    expect(p.q('[data-slot=chapter-title]')?.textContent).toContain('Main');
    expect(p.qa('.andes-player-slider__marker')).toHaveLength(1);
  });

  it('prefers chapters given as data', () => {
    const p = renderPlayer({ chapters: [{ start: 0, end: 5, title: 'Data' }] });
    p.ready(10);
    expect(p.store.chapters()[0].title).toBe('Data');
  });
});

describe('AndesVideoPlayer: fullscreen, picture-in-picture and remote playback', () => {
  it('enters and leaves fullscreen on the player element and announces it', async () => {
    const doc = document as Document & { fullscreenElement: Element | null };
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    });
    let current: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => current,
    });
    const p = renderPlayer();
    p.ready(60);
    p.el.requestFullscreen = vi.fn(async () => {
      current = p.el;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    document.exitFullscreen = vi.fn(async () => {
      current = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    p.render();
    const button = req(p.q<HTMLButtonElement>('[data-slot=fullscreen-button]'));
    expect(p.q('andes-player-fullscreen-button')?.hasAttribute('hidden')).toBe(
      false,
    );
    button.click();
    await settle();
    p.render();
    expect(p.el.requestFullscreen).toHaveBeenCalled();
    expect(p.store.fullscreen()).toBe(true);
    expect(p.el.hasAttribute('data-fullscreen')).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Exit full screen');
    expect(p.host.events).toContain('fullscreen:true');
    expect(p.q('[data-slot=announcer]')?.textContent).toContain(
      'Entered full screen',
    );
    keydown(p.el, 'Escape');
    await settle();
    expect(doc.fullscreenElement).toBeNull();
    expect(p.store.fullscreen()).toBe(false);
    // A refused request leaves the state alone.
    p.el.requestFullscreen = vi.fn(async () => {
      throw new Error('denied');
    });
    expect(await p.store.enterFullscreen('control')).toBe(false);
    expect(p.store.fullscreen()).toBe(false);
    delete (document as unknown as Record<string, unknown>)[
      'fullscreenEnabled'
    ];
    delete (document as unknown as Record<string, unknown>)[
      'fullscreenElement'
    ];
  });

  it('falls back to the phone video fullscreen', async () => {
    const p = renderPlayer();
    const enter = vi.fn();
    Object.assign(p.media(), {
      webkitEnterFullscreen: enter,
      webkitExitFullscreen: vi.fn(),
      webkitSupportsFullscreen: true,
    });
    p.host.src.set('media/b.mp4');
    p.render();
    // `fullscreenSupported` is computed from the element when it attaches.
    expect(await p.store.enterFullscreen()).toBe(true);
    expect(enter).toHaveBeenCalled();
    p.fake().emit('webkitbeginfullscreen');
    expect(p.store.fullscreen()).toBe(true);
    await p.store.exitFullscreen();
    p.fake().emit('webkitendfullscreen');
    expect(p.store.fullscreen()).toBe(false);
  });

  it('enters picture-in-picture when supported', async () => {
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      configurable: true,
      value: true,
    });
    HTMLVideoElement.prototype.requestPictureInPicture = vi.fn(async function (
      this: HTMLVideoElement,
    ) {
      this.dispatchEvent(new Event('enterpictureinpicture'));
      return {} as PictureInPictureWindow;
    });
    document.exitPictureInPicture = vi.fn(async () => undefined);
    try {
      const p = renderPlayer();
      p.ready(60);
      const button = req(p.q<HTMLButtonElement>('[data-slot=pip-button]'));
      expect(p.q('andes-player-pip-button')?.hasAttribute('hidden')).toBe(
        false,
      );
      button.click();
      await settle();
      p.render();
      expect(p.store.pictureInPicture()).toBe(true);
      expect(button.getAttribute('aria-label')).toBe('Exit picture in picture');
      expect(p.host.events).toContain('pip:true');
      keydown(p.el, 'i');
      await settle();
      expect(document.exitPictureInPicture).toHaveBeenCalled();
      p.fake().emit('leavepictureinpicture');
      expect(p.store.pictureInPicture()).toBe(false);
    } finally {
      delete (document as unknown as Record<string, unknown>)[
        'pictureInPictureEnabled'
      ];
      delete (HTMLVideoElement.prototype as unknown as Record<string, unknown>)[
        'requestPictureInPicture'
      ];
    }
  });

  it('uses the Remote Playback API for availability and the picker', async () => {
    let notify: (available: boolean) => void = () => undefined;
    const remote = Object.assign(new EventTarget(), {
      state: 'disconnected',
      watchAvailability: vi.fn(async (callback: (a: boolean) => void) => {
        notify = callback;
        return 1;
      }),
      cancelWatchAvailability: vi.fn(async () => undefined),
      prompt: vi.fn(async () => undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'remote', {
      configurable: true,
      get: () => remote,
    });
    try {
      const p = renderPlayer();
      await settle();
      expect(p.q('andes-player-remote-button')?.hasAttribute('hidden')).toBe(
        true,
      );
      notify(true);
      p.render();
      expect(p.q('andes-player-remote-button')?.hasAttribute('hidden')).toBe(
        false,
      );
      req(p.q<HTMLButtonElement>('[data-slot=remote-button]')).click();
      await settle();
      expect(remote.prompt).toHaveBeenCalled();
      remote.state = 'connected';
      remote.dispatchEvent(new Event('connect'));
      p.render();
      expect(p.q('[data-slot=remote-button]')?.getAttribute('aria-label')).toBe(
        'Playing on another device',
      );
      p.fixture.destroy();
      expect(remote.cancelWatchAvailability).toHaveBeenCalledWith(1);
    } finally {
      delete (HTMLMediaElement.prototype as unknown as Record<string, unknown>)[
        'remote'
      ];
    }
  });

  it('delegates casting to a provided handler', async () => {
    const prompt = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideAndesRemotePlayback({
          available: signal(true),
          state: signal('connecting'),
          prompt,
        }),
      ],
    });
    const p = renderPlayer();
    expect(p.store.remotePlaybackAvailable()).toBe(true);
    expect(p.store.remotePlaybackState()).toBe('connecting');
    await p.store.requestRemotePlayback();
    expect(prompt).toHaveBeenCalledWith(p.media());
  });

  it('falls back to the WebKit playback-target picker', async () => {
    const picker = vi.fn();
    (HTMLMediaElement.prototype as unknown as Record<string, unknown>)[
      'webkitShowPlaybackTargetPicker'
    ] = picker;
    try {
      const p = renderPlayer();
      const event = Object.assign(
        new Event('webkitplaybacktargetavailabilitychanged'),
        {
          availability: 'available',
        },
      );
      p.media().dispatchEvent(event);
      expect(p.store.remotePlaybackAvailable()).toBe(true);
      await p.store.requestRemotePlayback();
      expect(picker).toHaveBeenCalled();
    } finally {
      delete (HTMLMediaElement.prototype as unknown as Record<string, unknown>)[
        'webkitShowPlaybackTargetPicker'
      ];
    }
  });
});

describe('AndesVideoPlayer: i18n', () => {
  it('uses the labels input over provided labels over defaults', () => {
    TestBed.configureTestingModule({
      providers: [provideAndesPlayerLabels({ play: 'Lire', mute: 'Couper' })],
    });
    const p = renderPlayer({
      labels: {
        play: 'Reproducir',
        videoPlayer: 'Reproductor',
        seconds: (n) => `${n} s`,
      },
    });
    p.ready(65);
    expect(p.q('[data-slot=play-button]')?.getAttribute('aria-label')).toBe(
      'Reproducir',
    );
    expect(p.q('[data-slot=mute-button]')?.getAttribute('aria-label')).toBe(
      'Couper',
    );
    expect(p.el.getAttribute('aria-label')).toBe('Reproductor: Test clip');
    expect(p.q('[data-slot=time-slider]')?.getAttribute('aria-valuetext')).toBe(
      '0 s of 1 minute 5 s',
    );
  });
});

describe('AndesVideoPlayer: persistence', () => {
  it('restores and saves volume, mute, speed and caption language', () => {
    localStorage.setItem(
      'andes-player:demo',
      JSON.stringify({
        volume: 0.3,
        muted: true,
        playbackRate: 1.5,
        captionLanguage: 'es',
      }),
    );
    const p = renderPlayer({ persistKey: 'demo' });
    expect(p.media().volume).toBe(0.3);
    expect(p.media().muted).toBe(true);
    expect(p.media().playbackRate).toBe(1.5);
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
    expect(p.store.activeTextTrack()?.language).toBe('es');
    p.store.setVolume(0.8);
    p.store.selectTextTrack(null);
    p.render();
    expect(JSON.parse(req(localStorage.getItem('andes-player:demo')))).toEqual({
      volume: 0.8,
      muted: false,
      playbackRate: 1.5,
      captionLanguage: null,
    });
  });

  it('keeps working when storage is blocked', () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
    const p = renderPlayer({ persistKey: 'demo' });
    p.store.setVolume(0.5);
    p.render();
    expect(p.media().volume).toBe(0.5);
    expect(setItem).toHaveBeenCalled();
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('does not record "captions off" before the viewer chose', () => {
    const p = renderPlayer({ persistKey: 'fresh' });
    p.store.setVolume(0.6);
    p.render();
    expect(
      JSON.parse(req(localStorage.getItem('andes-player:fresh'))),
    ).not.toHaveProperty('captionLanguage');
  });
});

describe('AndesVideoPlayer: buffering and outputs', () => {
  it('shows the spinner only after a delay and reports aria-busy', async () => {
    vi.useFakeTimers();
    const p = renderPlayer();
    p.ready(60);
    await p.store.play();
    p.fake().waiting();
    p.render();
    expect(p.el.getAttribute('aria-busy')).toBe('true');
    expect(p.host.events).toContain('buffering:true');
    expect(p.q('andes-player-buffering')?.hasAttribute('hidden')).toBe(true);
    vi.advanceTimersByTime(499);
    p.render();
    expect(p.q('andes-player-buffering')?.hasAttribute('hidden')).toBe(true);
    vi.advanceTimersByTime(2);
    p.render();
    expect(p.q('andes-player-buffering')?.hasAttribute('hidden')).toBe(false);
    p.fake().emit('playing');
    p.render();
    expect(p.q('andes-player-buffering')?.hasAttribute('hidden')).toBe(true);
    expect(p.el.hasAttribute('aria-busy')).toBe(false);
  });

  it('emits skip requests from the system media controls', () => {
    const handlers = new Map<string, ((details: object) => void) | null>();
    const session = {
      metadata: null as unknown,
      setActionHandler: (
        action: string,
        handler: ((d: object) => void) | null,
      ) => handlers.set(action, handler),
      setPositionState: vi.fn(),
    };
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: session,
    });
    const MetadataStub = vi.fn(function (this: object, init: object) {
      Object.assign(this, init);
    });
    vi.stubGlobal('MediaMetadata', MetadataStub);
    try {
      const p = renderPlayer({ skipControls: true });
      p.ready(60);
      void p.store.play();
      p.render();
      expect(MetadataStub).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test clip' }),
      );
      handlers.get('nexttrack')?.({});
      handlers.get('previoustrack')?.({});
      expect(p.host.events).toContain('next');
      expect(p.host.events).toContain('previous');
      handlers.get('seekto')?.({ seekTime: 12 });
      expect(p.media().currentTime).toBe(12);
      handlers.get('seekforward')?.({});
      expect(p.media().currentTime).toBe(22);
      handlers.get('seekbackward')?.({ seekOffset: 2 });
      expect(p.media().currentTime).toBe(20);
      handlers.get('pause')?.({});
      expect(p.media().paused).toBe(true);
      p.fixture.destroy();
      expect(session.metadata).toBeNull();
    } finally {
      delete (navigator as unknown as Record<string, unknown>)['mediaSession'];
      vi.unstubAllGlobals();
    }
  });
});

describe('AndesVideoPlayer: reduced motion and SSR', () => {
  it('holds background video still under reduced motion', async () => {
    const restore = stubMatchMedia(['prefers-reduced-motion: reduce']);
    try {
      const p = renderPlayer({ background: true });
      await settle();
      expect(p.store.reducedMotion()).toBe(true);
      expect(p.fake().calls.play).toBe(0);
      expect(p.media().paused).toBe(true);
    } finally {
      restore();
    }
  });

  it('renders on the server without touching media APIs', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const p = renderPlayer({ autoplay: true, persistKey: 'ssr' });
    expect(p.store.media()).toBeNull();
    expect(allFakes().some((fake) => fake.calls.play > 0)).toBe(false);
    expect(p.store.fullscreenSupported()).toBe(false);
    expect(p.store.pictureInPictureSupported()).toBe(false);
    expect(p.el.getAttribute('role')).toBe('region');
    // Actions are harmless without an element.
    p.store.notifyActivity();
    p.store.showFeedback('play');
    p.store.seek(10);
    p.store.seekToLive();
    p.store.selectAudioTrack('x');
    p.store.requestRemotePlayback();
    expect(p.store.feedback()?.kind).toBe('play');
  });
});
