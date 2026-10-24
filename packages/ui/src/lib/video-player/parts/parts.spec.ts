import { TestBed } from '@angular/core/testing';

import type {
  AndesMediaAdapter,
  AndesMediaAdapterHooks,
} from '../core/media-adapter';
import { Component } from '@angular/core';

import { AndesPlayerMenu } from '../menus/player-menu';
import {
  fakeOf,
  FakeAudioTrackList,
  installFakeMedia,
} from '../testing/fake-media';
import { AndesVideoPlayer } from '../video-player';
import {
  keydown,
  mockRect,
  pointer,
  renderPlayer,
  req,
  settle,
} from '../testing/player-harness';

@Component({
  imports: [AndesVideoPlayer, AndesPlayerMenu],
  template: `
    <andes-video-player
      src="media/a.mp4"
      controls="none"
      [playbackRates]="[0.5, 1, 2]"
    >
      <div slot="controls">
        <andes-player-menu type="playback-rate" />
        <andes-player-menu type="captions" />
        <andes-player-menu type="quality" />
        <andes-player-menu type="audio" />
      </div>
    </andes-video-player>
  `,
})
class MenusHost {}

let uninstall: () => void;

beforeEach(() => {
  uninstall = installFakeMedia();
});

afterEach(() => {
  vi.useRealTimers();
  uninstall();
  document.body.innerHTML = '';
});

function attached(inputs: Parameters<typeof renderPlayer>[0] = {}) {
  const p = renderPlayer(inputs);
  document.body.appendChild(p.fixture.nativeElement);
  return p;
}

describe('time slider', () => {
  function slider() {
    const p = attached();
    p.ready(200);
    const element = req(p.q('[data-slot=time-slider]'));
    const track = req(element.querySelector('.andes-player-slider__track'));
    mockRect(track, { left: 100, width: 400 });
    return { p, element, track };
  }

  it('follows the WAI-ARIA slider pattern with spoken value text', () => {
    const { p, element } = slider();
    p.fake().advance(65);
    p.render();
    expect(element.getAttribute('role')).toBe('slider');
    expect(element.getAttribute('tabindex')).toBe('0');
    expect(element.getAttribute('aria-label')).toBe('Seek');
    expect(element.getAttribute('aria-valuemin')).toBe('0');
    expect(element.getAttribute('aria-valuemax')).toBe('200');
    expect(element.getAttribute('aria-valuenow')).toBe('65');
    expect(element.getAttribute('aria-valuetext')).toBe(
      '1 minute 5 seconds of 3 minutes 20 seconds',
    );
    expect(element.getAttribute('aria-orientation')).toBe('horizontal');
    expect(element.getAttribute('dir')).toBe('ltr');
  });

  it('moves with arrows, Shift+arrows, PageUp/PageDown and Home/End', () => {
    const { p, element } = slider();
    keydown(element, 'ArrowRight');
    expect(p.media().currentTime).toBe(5);
    keydown(element, 'ArrowUp', { shiftKey: true });
    expect(p.media().currentTime).toBe(15);
    keydown(element, 'ArrowLeft');
    expect(p.media().currentTime).toBe(10);
    keydown(element, 'ArrowDown', { shiftKey: true });
    expect(p.media().currentTime).toBe(0);
    keydown(element, 'PageUp');
    expect(p.media().currentTime).toBe(20);
    keydown(element, 'PageDown');
    expect(p.media().currentTime).toBe(0);
    keydown(element, 'End');
    expect(p.media().currentTime).toBe(200);
    keydown(element, 'Home');
    expect(p.media().currentTime).toBe(0);
    expect(keydown(element, 'x').defaultPrevented).toBe(false);
    expect(
      keydown(element, 'ArrowLeft', { ctrlKey: true }).defaultPrevented,
    ).toBe(false);
  });

  it('does not announce its own changes (the value text is read instead)', () => {
    vi.useFakeTimers();
    const { p, element } = slider();
    keydown(element, 'ArrowRight');
    vi.advanceTimersByTime(1000);
    p.render();
    expect(p.q('[data-slot=announcer]')?.textContent?.trim()).toBe('');
  });

  it('drags with pointer capture, scrubs, pauses and resumes', async () => {
    const { p, element } = slider();
    await p.store.play();
    element.setPointerCapture = vi.fn();
    element.hasPointerCapture = vi.fn(() => true);
    element.releasePointerCapture = vi.fn();
    pointer(element, 'pointerdown', { clientX: 200, pointerId: 7 });
    p.render();
    expect(element.setPointerCapture).toHaveBeenCalledWith(7);
    expect(p.store.scrubbing()).toBe(true);
    expect(p.store.scrubTime()).toBe(50);
    expect(p.media().paused).toBe(true);
    expect(element.hasAttribute('data-dragging')).toBe(true);
    expect(p.q('[data-slot=time-preview]')?.textContent).toContain('0:50');
    expect(document.activeElement).toBe(element);
    // The thumb follows every move; the preview moves with it.
    pointer(element, 'pointermove', { clientX: 300, pointerId: 7 });
    p.render();
    expect(p.store.displayTime()).toBe(100);
    expect(p.q('andes-player-time [data-slot=time-current]')?.textContent).toBe(
      '1:40',
    );
    // Moves from another pointer are ignored.
    pointer(element, 'pointermove', { clientX: 450, pointerId: 9 });
    expect(p.store.scrubTime()).toBe(100);
    pointer(element, 'pointerup', { clientX: 400, pointerId: 7 });
    p.render();
    await settle();
    expect(p.media().currentTime).toBe(150);
    expect(p.store.scrubbing()).toBe(false);
    expect(element.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(p.media().paused).toBe(false);
  });

  it('a cancelled drag keeps the last committed position and ends the scrub', () => {
    const { p, element } = slider();
    pointer(element, 'pointerdown', { clientX: 300, pointerType: 'touch' });
    pointer(element, 'pointercancel', { clientX: 500, pointerType: 'touch' });
    expect(p.store.scrubbing()).toBe(false);
    expect(p.media().currentTime).toBe(100);
  });

  it('ignores secondary mouse buttons and previews time on hover only for mice', () => {
    const { p, element } = slider();
    pointer(element, 'pointerdown', { clientX: 300, button: 2 });
    expect(p.store.scrubbing()).toBe(false);
    pointer(element, 'pointermove', { clientX: 140 });
    p.render();
    expect(p.q('[data-slot=time-preview]')?.textContent).toContain('0:20');
    pointer(element, 'pointerleave');
    p.render();
    expect(p.q('[data-slot=time-preview]')).toBeNull();
    pointer(element, 'pointermove', { clientX: 140, pointerType: 'touch' });
    p.render();
    expect(p.q('[data-slot=time-preview]')).toBeNull();
  });

  it('shows buffered ranges, chapter titles and storyboard thumbnails in the preview', () => {
    const p = attached({
      chapters: [
        { start: 0, end: 100, title: 'Part one' },
        { start: 100, end: 200, title: 'Part two' },
      ],
      thumbnails: {
        src: 'sprite.jpg',
        width: 160,
        height: 90,
        columns: 5,
        interval: 10,
      },
    });
    p.ready(200);
    const element = req(p.q('[data-slot=time-slider]'));
    mockRect(req(element.querySelector('.andes-player-slider__track')), {
      width: 200,
    });
    p.fake().buffer([[0, 50]]);
    p.render();
    expect(
      element.style.getPropertyValue('--andes-player-slider-buffered'),
    ).toBe('25%');
    pointer(element, 'pointermove', { clientX: 150 });
    p.render();
    const preview = req(p.q('[data-slot=time-preview]'));
    expect(preview.textContent).toContain('Part two');
    expect(preview.textContent).toContain('2:30');
    const thumb = req(
      preview.querySelector<HTMLElement>('.andes-player-preview__thumbnail'),
    );
    expect(thumb.style.width).toBe('160px');
    expect(thumb.style.backgroundPosition).toBe('0px -270px');
    expect(p.qa('.andes-player-slider__marker')).toHaveLength(1);
  });

  it('loads storyboard thumbnails from a WebVTT file', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () =>
        'WEBVTT\n\n00:00.000 --> 00:10.000\nsheet.jpg#xywh=0,0,80,45\n',
    }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const p = attached({ thumbnails: { src: 'http://cdn.test/thumbs.vtt' } });
      p.ready(20);
      await settle();
      expect(fetchMock).toHaveBeenCalled();
      expect(p.store.thumbnails()[0]).toMatchObject({
        src: 'http://cdn.test/sheet.jpg',
        width: 80,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('is disabled until there is a timeline', () => {
    const p = attached();
    const element = req(p.q('[data-slot=time-slider]'));
    expect(element.getAttribute('aria-disabled')).toBe('true');
    expect(element.getAttribute('tabindex')).toBe('-1');
    keydown(element, 'ArrowRight');
    pointer(element, 'pointerdown', { clientX: 10 });
    expect(p.store.scrubbing()).toBe(false);
  });

  it('works over the DVR window of a live stream', async () => {
    const p = attached();
    p.fake().goLive(1000, 1600);
    await p.store.play();
    p.fake().advance(1595);
    p.render();
    const element = req(p.q('[data-slot=time-slider]'));
    expect(element.getAttribute('aria-valuemin')).toBe('1000');
    expect(element.getAttribute('aria-valuemax')).toBe('1600');
    expect(element.getAttribute('aria-valuetext')).toBe('Live');
    keydown(element, 'Home');
    p.render();
    expect(p.media().currentTime).toBe(1000);
    expect(element.getAttribute('aria-valuetext')).toBe(
      '10 minutes behind live',
    );
    keydown(element, 'End');
    expect(p.media().currentTime).toBe(1597);
    mockRect(req(element.querySelector('.andes-player-slider__track')), {
      width: 600,
    });
    pointer(element, 'pointermove', { clientX: 300 });
    p.render();
    expect(p.q('[data-slot=time-preview]')?.textContent).toContain('-5:00');
  });
});

describe('volume slider', () => {
  it('is a 0-100 slider with keys, pointer drag and the wheel', () => {
    const p = attached();
    const element = req(p.q('[data-slot=volume-slider]'));
    mockRect(req(element.querySelector('.andes-player-slider__track')), {
      width: 100,
    });
    expect(element.getAttribute('aria-valuenow')).toBe('100');
    expect(element.getAttribute('aria-valuetext')).toBe('100%');
    keydown(element, 'ArrowDown');
    expect(p.media().volume).toBe(0.95);
    keydown(element, 'ArrowDown', { shiftKey: true });
    expect(p.media().volume).toBe(0.85);
    keydown(element, 'PageDown');
    expect(p.media().volume).toBe(0.75);
    keydown(element, 'PageUp');
    expect(p.media().volume).toBe(0.85);
    keydown(element, 'Home');
    p.render();
    expect(p.media().volume).toBe(0);
    expect(p.q('[data-slot=mute-button]')?.getAttribute('aria-label')).toBe(
      'Unmute',
    );
    keydown(element, 'End');
    expect(p.media().volume).toBe(1);
    expect(keydown(element, 'q').defaultPrevented).toBe(false);
    pointer(element, 'pointerdown', { clientX: 30 });
    expect(p.media().volume).toBe(0.3);
    pointer(element, 'pointermove', { clientX: 60 });
    expect(p.media().volume).toBe(0.6);
    pointer(element, 'pointerup', { clientX: 70 });
    expect(p.media().volume).toBe(0.7);
    const wheel = new WheelEvent('wheel', {
      deltaY: -100,
      cancelable: true,
      bubbles: true,
    });
    element.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(p.media().volume).toBe(0.75);
    element.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 100, bubbles: true }),
    );
    expect(p.media().volume).toBe(0.7);
    element.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 0, bubbles: true }),
    );
    expect(p.media().volume).toBe(0.7);
  });

  it('hides where the page cannot set the volume', () => {
    const p = attached();
    p.store.volumeSupported.set(false);
    p.render();
    expect(p.q('andes-player-volume-slider')?.hasAttribute('hidden')).toBe(
      true,
    );
    expect(keydown(p.el, 'ArrowUp').defaultPrevented).toBe(false);
  });
});

describe('buttons', () => {
  it('play button follows the state and publishes its shortcut', async () => {
    const p = attached();
    p.ready(10);
    const button = req(p.q<HTMLButtonElement>('[data-slot=play-button]'));
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Space K');
    expect(
      button.querySelector('andes-player-icon')?.getAttribute('data-icon'),
    ).toBe('play');
    button.click();
    await settle();
    p.render();
    expect(button.getAttribute('aria-label')).toBe('Pause');
    expect(button.getAttribute('data-state')).toBe('playing');
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Playing');
    button.click();
    p.render();
    expect(button.getAttribute('aria-label')).toBe('Play');
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Paused');
  });

  it('mute button toggles and shows the level icon', () => {
    const p = attached();
    const button = req(p.q<HTMLButtonElement>('[data-slot=mute-button]'));
    expect(button.getAttribute('aria-keyshortcuts')).toBe('M');
    p.store.setVolume(0.3);
    p.render();
    expect(
      button.querySelector('andes-player-icon')?.getAttribute('data-icon'),
    ).toBe('volume-low');
    button.click();
    p.render();
    expect(p.media().muted).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Unmute');
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Muted');
    button.click();
    expect(p.media().muted).toBe(false);
    // Unmuting at volume 0 restores an audible level.
    p.store.setVolume(0);
    p.store.setMuted(false);
    expect(p.media().volume).toBe(0.5);
  });

  it('seek buttons move by their seconds and hide without a timeline', () => {
    const p = attached();
    expect(p.q('andes-player-seek-button')?.hasAttribute('hidden')).toBe(true);
    p.ready(60);
    p.store.seek(30);
    const [back, forward] = p.qa<HTMLButtonElement>('[data-slot=seek-button]');
    expect(back.getAttribute('aria-label')).toBe('Back 10 seconds');
    expect(forward.getAttribute('aria-label')).toBe('Forward 10 seconds');
    expect(back.querySelector('text')?.textContent?.trim()).toBe('10');
    back.click();
    expect(p.media().currentTime).toBe(20);
    forward.click();
    forward.click();
    expect(p.media().currentTime).toBe(40);
  });

  it('captions button is a pressed toggle, hidden without tracks', () => {
    const p = attached();
    expect(p.q('andes-player-captions-button')?.hasAttribute('hidden')).toBe(
      true,
    );
    p.fake().addTextTrack({
      kind: 'subtitles',
      label: 'English',
      language: 'en',
    });
    p.render();
    const button = req(p.q<HTMLButtonElement>('[data-slot=captions-button]'));
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Captions');
    button.click();
    p.render();
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('big play button plays, and offers replay once ended', async () => {
    const p = attached();
    p.ready(10);
    const big = req(p.q<HTMLButtonElement>('[data-slot=big-play-button]'));
    expect(big.getAttribute('aria-label')).toBe('Play');
    big.click();
    await settle();
    p.render();
    expect(p.q('andes-player-big-play-button')?.hasAttribute('hidden')).toBe(
      true,
    );
    p.fake().finish();
    p.render();
    expect(big.getAttribute('aria-label')).toBe('Replay');
  });
});

describe('time display', () => {
  it('shows current/duration, remaining, hours and live behind', async () => {
    const p = attached();
    p.ready(3725);
    p.fake().advance(65);
    p.render();
    const time = req(p.q('andes-player-time'));
    expect(time.querySelector('[data-slot=time-current]')?.textContent).toBe(
      '0:01:05',
    );
    expect(time.querySelector('[data-slot=time-duration]')?.textContent).toBe(
      '1:02:05',
    );
    expect(time.textContent).toContain('Current time');
    expect(time.textContent).toContain('Duration');
  });

  it('remaining type counts down', () => {
    const p = attached({ controls: 'minimal' });
    p.ready(200);
    p.fake().advance(65);
    p.render();
    expect(p.q('[data-slot=time-remaining]')?.textContent).toBe('-2:15');
  });
});

describe('menus', () => {
  function withEverything() {
    const adapter: AndesMediaAdapter & {
      hooks?: AndesMediaAdapterHooks;
      picked: string[];
    } = {
      name: 'menus',
      picked: [],
      canPlay: () => true,
      attach(_m, _s, hooks) {
        this.hooks = hooks;
      },
      detach: () => undefined,
      selectQuality(id) {
        this.picked.push(id);
      },
      selectAudioTrack(id) {
        this.picked.push(`audio:${id}`);
      },
    };
    const p = attached({ adapters: [() => adapter] });
    req(adapter.hooks).setQualities([
      { id: 'low', height: 360 },
      { id: 'high', height: 1080 },
    ]);
    req(adapter.hooks).setActiveQuality('high', true);
    req(adapter.hooks).setAudioTracks([
      { id: 'en', label: 'English', language: 'en' },
      { id: 'es', label: 'Español', language: 'es' },
    ]);
    req(adapter.hooks).setActiveAudioTrack('en');
    p.fake().addTextTrack({
      kind: 'subtitles',
      label: 'English',
      language: 'en',
    });
    p.ready(60);
    const trigger = req(
      p.q<HTMLButtonElement>('andes-player-menu [data-slot=menu-trigger]'),
    );
    return { p, adapter, trigger };
  }

  const panel = (p: ReturnType<typeof attached>) => p.q('[data-slot=menu]');

  it('opens a settings menu with one entry per available page', () => {
    const { p, trigger } = withEverything();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Settings');
    trigger.click();
    p.render();
    const menu = req(panel(p));
    expect(menu.getAttribute('role')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    const entries = p.qa('[data-slot=menu-entry]');
    expect(entries.map((e) => e.getAttribute('data-page'))).toEqual([
      'quality',
      'audio',
      'captions',
      'caption-style',
      'playback-rate',
      'repeat',
    ]);
    expect(entries[0].textContent).toContain('Auto (1080p)');
    expect(entries[3].textContent).toContain('Default');
    expect(entries[4].textContent).toContain('Normal');
    expect(entries[5].textContent).toContain('Loop');
    expect(entries[5].textContent).toContain('Off');
    expect(document.activeElement).toBe(entries[0]);
    expect(p.store.menuOpen()).toBe(true);
  });

  it('navigates into a page, picks a radio item and comes back', () => {
    const { p, trigger, adapter } = withEverything();
    trigger.click();
    p.render();
    const menu = req(panel(p));
    keydown(menu, 'ArrowDown');
    expect(document.activeElement?.getAttribute('data-page')).toBe('audio');
    keydown(menu, 'ArrowRight');
    p.render();
    const options = p.qa('[data-slot=menu-option]');
    expect(options.map((o) => o.getAttribute('role'))).toEqual([
      'menuitemradio',
      'menuitemradio',
    ]);
    expect(options[0].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(options[0]);
    expect(p.q('[data-slot=menu-back]')?.getAttribute('aria-label')).toBe(
      'Back, Audio',
    );
    (options[1] as HTMLButtonElement).click();
    p.render();
    expect(adapter.picked).toContain('audio:es');
    // Back on the main page, focus on the entry it came from.
    expect(menu.getAttribute('data-page')).toBe('settings');
    expect(document.activeElement?.getAttribute('data-page')).toBe('audio');
    // Into quality, then back with the inline-start arrow and with Escape.
    p.qa<HTMLButtonElement>('[data-slot=menu-entry]')[0].click();
    p.render();
    expect(
      p.qa('[data-slot=menu-option]').map((o) => o.textContent?.trim()),
    ).toEqual(['Auto (1080p)', '1080p', '360p']);
    keydown(menu, 'ArrowLeft');
    p.render();
    expect(menu.getAttribute('data-page')).toBe('settings');
    p.qa<HTMLButtonElement>('[data-slot=menu-entry]')[3].click();
    p.render();
    keydown(menu, 'Escape');
    p.render();
    expect(menu.getAttribute('data-page')).toBe('settings');
    keydown(menu, 'Escape');
    p.render();
    expect(panel(p)).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(p.store.menuOpen()).toBe(false);
  });

  it('back item returns to the main page', () => {
    const { p, trigger } = withEverything();
    trigger.click();
    p.render();
    p.qa<HTMLButtonElement>('[data-slot=menu-entry]')[2].click();
    p.render();
    req(p.q<HTMLButtonElement>('[data-slot=menu-back]')).click();
    p.render();
    expect(panel(p)?.getAttribute('data-page')).toBe('settings');
  });

  it('closes on Tab, on an outside click and when toggled', () => {
    const { p, trigger } = withEverything();
    trigger.click();
    p.render();
    keydown(req(panel(p)), 'Tab');
    p.render();
    expect(panel(p)).toBeNull();
    trigger.click();
    p.render();
    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    p.render();
    expect(panel(p)).toBeNull();
    trigger.click();
    p.render();
    trigger.click();
    p.render();
    expect(panel(p)).toBeNull();
  });

  it('opens from the keyboard with ArrowDown/ArrowUp on the button', () => {
    const { p, trigger } = withEverything();
    keydown(trigger, 'ArrowDown');
    p.render();
    expect(panel(p)).not.toBeNull();
  });

  it('single-list menus choose and close, and hide with nothing to offer', () => {
    const fixture = TestBed.createComponent(MenusHost);
    fixture.detectChanges();
    TestBed.tick();
    document.body.appendChild(fixture.nativeElement);
    const root = fixture.nativeElement as HTMLElement;
    const media = req(root.querySelector('video'));
    const fake = fakeOf(media);
    fake.addTextTrack({ kind: 'subtitles', label: 'English', language: 'en' });
    fake.loadMetadata(60);
    fixture.detectChanges();
    TestBed.tick();
    const [rate, captions, quality, audio] = Array.from(
      root.querySelectorAll<HTMLElement>('andes-player-menu'),
    );
    expect(quality.hasAttribute('hidden')).toBe(true);
    expect(audio.hasAttribute('hidden')).toBe(true);
    const rateTrigger = req(
      rate.querySelector<HTMLButtonElement>('[data-slot=menu-trigger]'),
    );
    expect(rateTrigger.getAttribute('aria-label')).toBe('Speed');
    rateTrigger.click();
    fixture.detectChanges();
    TestBed.tick();
    const options = Array.from(
      rate.querySelectorAll<HTMLButtonElement>('[data-slot=menu-option]'),
    );
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      '0.5×',
      'Normal',
      '2×',
    ]);
    expect(document.activeElement).toBe(options[1]);
    options[2].click();
    fixture.detectChanges();
    TestBed.tick();
    expect(media.playbackRate).toBe(2);
    expect(rate.querySelector('[data-slot=menu]')).toBeNull();
    expect(document.activeElement).toBe(rateTrigger);
    const captionsTrigger = req(
      captions.querySelector<HTMLButtonElement>('[data-slot=menu-trigger]'),
    );
    captionsTrigger.click();
    fixture.detectChanges();
    TestBed.tick();
    const captionOptions = Array.from(
      captions.querySelectorAll<HTMLButtonElement>('[data-slot=menu-option]'),
    );
    expect(captionOptions.map((o) => o.textContent?.trim())).toEqual([
      'Off',
      'English',
    ]);
    expect(captionOptions[0].getAttribute('aria-checked')).toBe('true');
    captionOptions[1].click();
    fixture.detectChanges();
    expect(fake.textTracks[0].mode).toBe('hidden');
  });

  it('reads native audio tracks and switches them', () => {
    const p = attached();
    const list = new FakeAudioTrackList();
    list.set([
      { id: 'main', label: 'Main', language: 'en', enabled: true },
      { id: '', label: '', language: 'de', enabled: false },
    ]);
    p.fake().audioTracks = list;
    p.ready(60);
    expect(p.store.audioTracks().map((t) => [t.id, t.label])).toEqual([
      ['main', 'Main'],
      ['audio-1', 'de'],
    ]);
    expect(p.store.activeAudioTrackId()).toBe('main');
    p.store.selectAudioTrack('audio-1', 'control');
    expect(list[0].enabled).toBe(false);
    expect(list[1].enabled).toBe(true);
    expect(p.store.activeAudioTrackId()).toBe('audio-1');
  });

  it('hides a menu with nothing to choose', () => {
    const p = attached({ rates: [1], src: null });
    expect(
      p.q('andes-player-menu[data-type=settings]')?.hasAttribute('hidden'),
    ).toBe(true);
    p.host.src.set('media/clip.mp4');
    p.render();
    p.ready(60);
    // Settings still offers Loop once a source plays; the playlist menu has nothing.
    expect(
      p.q('andes-player-menu[data-type=settings]')?.hasAttribute('hidden'),
    ).toBe(false);
    expect(
      p.q('andes-player-menu[data-type=playlist]')?.hasAttribute('hidden'),
    ).toBe(true);
  });
});

describe('tooltip', () => {
  it('shows on hover after a delay and on keyboard focus, aligned inside the player', () => {
    vi.useFakeTimers();
    const p = attached();
    mockRect(p.el, { left: 0, width: 600, height: 340 });
    const button = req(p.q<HTMLButtonElement>('[data-slot=play-button]'));
    mockRect(button, { left: 8, width: 40 });
    pointer(button, 'pointerenter');
    vi.advanceTimersByTime(400);
    const bubble = req(button.querySelector('.andes-player-tooltip'));
    expect(bubble.getAttribute('aria-hidden')).toBe('true');
    expect(bubble.getAttribute('data-state')).toBe('open');
    expect(bubble.getAttribute('data-align')).toBe('left');
    expect(bubble.textContent).toBe('PlayK');
    expect(bubble.querySelector('kbd')?.textContent).toBe('K');
    pointer(button, 'pointerleave');
    expect(bubble.getAttribute('data-state')).toBe('closed');
    pointer(button, 'pointerenter', { pointerType: 'touch' });
    vi.advanceTimersByTime(400);
    expect(bubble.getAttribute('data-state')).toBe('closed');
    const fullscreen = req(p.q<HTMLButtonElement>('[data-slot=mute-button]'));
    mockRect(fullscreen, { left: 560, width: 40 });
    pointer(fullscreen, 'pointerenter');
    vi.advanceTimersByTime(400);
    expect(
      fullscreen
        .querySelector('.andes-player-tooltip')
        ?.getAttribute('data-align'),
    ).toBe('right');
    keydown(fullscreen, 'Escape');
    expect(
      fullscreen
        .querySelector('.andes-player-tooltip')
        ?.getAttribute('data-state'),
    ).toBe('closed');
  });

  it('hides when the controls hide', async () => {
    vi.useFakeTimers();
    const p = attached({ autohide: 1000 });
    p.ready(10);
    await p.store.play();
    const button = req(p.q<HTMLButtonElement>('[data-slot=mute-button]'));
    pointer(button, 'pointerenter');
    vi.advanceTimersByTime(400);
    expect(
      button.querySelector('.andes-player-tooltip')?.getAttribute('data-state'),
    ).toBe('open');
    p.store.hideControls();
    p.render();
    expect(
      button.querySelector('.andes-player-tooltip')?.getAttribute('data-state'),
    ).toBe('closed');
  });
});

describe('store actions', () => {
  it('steps playback rates, clamps volume and validates input', () => {
    const p = attached({ rates: [0.5, 1, 2] });
    p.ready(60);
    p.store.stepPlaybackRate(1);
    expect(p.media().playbackRate).toBe(2);
    p.store.stepPlaybackRate(1);
    expect(p.media().playbackRate).toBe(2);
    expect(p.store.feedback()?.text).toBe('2×');
    p.store.setPlaybackRate(-1);
    p.store.setPlaybackRate(Number.NaN);
    expect(p.media().playbackRate).toBe(2);
    p.store.setVolume(5);
    expect(p.media().volume).toBe(1);
    p.store.setVolume(-1);
    expect(p.media().volume).toBe(0);
    p.store.setVolume(Number.NaN);
    expect(p.media().volume).toBe(0);
    p.store.changeVolumeBy(0.2);
    expect(p.media().volume).toBe(0.2);
    p.store.seek(Number.NaN);
    p.store.seekToFraction(0.5);
    expect(p.media().currentTime).toBe(30);
    p.store.seekToFraction(2);
    expect(p.media().currentTime).toBe(60);
    expect(p.store.rateLabel(1)).toBe('Normal');
    expect(p.store.volumeText()).toBe('20%');
    p.store.toggleMuted();
    expect(p.store.volumeText()).toBe('0%');
  });

  it('remembers a seek requested before metadata', () => {
    const p = attached();
    p.store.seek(12);
    expect(p.media().currentTime).toBe(0);
    p.ready(60);
    expect(p.media().currentTime).toBe(12);
  });

  it('announces only user-driven changes, not media or API ones', async () => {
    const p = attached();
    p.ready(60);
    await p.store.play('api');
    p.render();
    expect(p.q('[data-slot=announcer]')?.textContent?.trim()).toBe('');
    p.store.pause('hotkey');
    p.render();
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Paused');
    p.store.setPlaybackRate(1.5, 'control');
    p.render();
    expect(p.q('[data-slot=announcer]')?.textContent).toContain('Speed 1.5×');
    p.store.announce('');
    expect(p.store.announcement()?.text).toContain('Speed');
  });

  it('captures a frame through a canvas', async () => {
    const p = attached();
    p.ready(10);
    const blob = new Blob(['x']);
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback: BlobCallback) => callback(blob));
    expect(await p.player.captureFrame('image/jpeg', 0.8)).toBe(blob);
    getContext.mockReturnValue(null);
    expect(await p.player.captureFrame()).toBeNull();
    getContext.mockImplementation(() => {
      throw new Error('tainted');
    });
    expect(await p.player.captureFrame()).toBeNull();
    getContext.mockRestore();
    toBlob.mockRestore();
  });
});
