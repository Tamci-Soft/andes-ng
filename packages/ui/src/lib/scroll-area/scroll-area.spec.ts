import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import {
  AndesScrollArea,
  AndesScrollAreaOrientation,
  AndesScrollAreaType,
  AndesScrollPosition,
} from './scroll-area';

@Component({
  imports: [AndesScrollArea],
  template: `<andes-scroll-area
    aria-label="Activity"
    [type]="type()"
    [orientation]="orientation()"
    [hideDelay]="hideDelay()"
    [edgeShadow]="edgeShadow()"
    [focusable]="focusable()"
    [minThumbSize]="24"
    scrollbarClass="my-bar"
    thumbClass="my-thumb"
    viewportClass="my-viewport"
    contentClass="my-content"
    (scrolled)="positions.push($event)"
    ><p id="content">Content</p></andes-scroll-area
  >`,
})
class HostComponent {
  readonly area = viewChild.required(AndesScrollArea);
  readonly type = signal<AndesScrollAreaType>('auto');
  readonly orientation = signal<AndesScrollAreaOrientation>('vertical');
  readonly hideDelay = signal(600);
  readonly edgeShadow = signal(false);
  readonly focusable = signal(true);
  readonly positions: AndesScrollPosition[] = [];
}

interface Geometry {
  clientHeight?: number;
  scrollHeight?: number;
  scrollTop?: number;
  clientWidth?: number;
  scrollWidth?: number;
  scrollLeft?: number;
}

/** jsdom has no layout: give an element the measurements a browser would report. */
function stub(element: HTMLElement, values: Record<string, number>) {
  const state = { ...values };
  for (const key of Object.keys(state)) {
    Object.defineProperty(element, key, {
      configurable: true,
      get: () => state[key],
      set: (value: number) => {
        state[key] = value;
      },
    });
  }
  return state;
}

function setScrollTo(element: HTMLElement, value: unknown) {
  Object.defineProperty(element, 'scrollTo', { configurable: true, value });
}

function pointer(type: string, init: PointerEventInit = {}) {
  return new PointerEvent(type, {
    bubbles: true,
    button: 0,
    pointerId: 1,
    ...init,
  });
}

describe('AndesScrollArea', () => {
  async function setup(geometry: Geometry = {}) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const host = root.querySelector('andes-scroll-area') as HTMLElement;
    const viewport = host.querySelector(
      '.andes-scroll-area__viewport',
    ) as HTMLElement;
    const g = stub(viewport, {
      clientHeight: 200,
      scrollHeight: 1000,
      scrollTop: 0,
      clientWidth: 300,
      scrollWidth: 300,
      scrollLeft: 0,
      ...geometry,
    } as Record<string, number>);
    const bar = (orientation: string) =>
      host.querySelector(
        `[data-orientation="${orientation}"].andes-scroll-area__scrollbar`,
      ) as HTMLElement | null;
    const stubBars = () => {
      const v = bar('vertical');
      const h = bar('horizontal');
      if (v) stub(v, { clientHeight: 200 });
      if (h) stub(h, { clientWidth: 300 });
    };
    stubBars();
    fixture.componentInstance.area().update();
    fixture.detectChanges();
    return {
      fixture,
      host,
      viewport,
      g,
      area: fixture.componentInstance.area(),
      page: fixture.componentInstance,
      bar,
      stubBars,
      thumb: (orientation: string) =>
        bar(orientation)?.querySelector(
          '.andes-scroll-area__thumb',
        ) as HTMLElement,
    };
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('structure and accessibility', () => {
    it('wraps the content in a focusable, labelled native scroller', async () => {
      const { viewport, host } = await setup();
      expect(viewport.getAttribute('tabindex')).toBe('0');
      expect(viewport.getAttribute('role')).toBe('region');
      expect(viewport.getAttribute('aria-label')).toBe('Activity');
      expect(viewport.querySelector('#content')).not.toBeNull();
      expect(host.getAttribute('data-slot')).toBe('scroll-area');
    });

    it('can opt out of the tab stop', async () => {
      const { fixture, viewport } = await setup();
      fixture.componentInstance.focusable.set(false);
      fixture.detectChanges();
      expect(viewport.hasAttribute('tabindex')).toBe(false);
    });

    it('hides the scrollbars from assistive technology', async () => {
      const { bar } = await setup();
      expect(bar('vertical')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('passes the class hooks through', async () => {
      const { host, viewport } = await setup();
      expect(viewport.classList).toContain('my-viewport');
      expect(
        host.querySelector('.andes-scroll-area__content')?.classList,
      ).toContain('my-content');
      expect(
        host.querySelector('.andes-scroll-area__scrollbar')?.classList,
      ).toContain('my-bar');
      expect(
        host.querySelector('.andes-scroll-area__thumb')?.classList,
      ).toContain('my-thumb');
    });

    it('draws only the bars the orientation asks for', async () => {
      const { fixture, bar, host } = await setup();
      expect(bar('vertical')).not.toBeNull();
      expect(bar('horizontal')).toBeNull();

      fixture.componentInstance.orientation.set('horizontal');
      fixture.detectChanges();
      expect(
        host.querySelector(
          '[data-orientation="vertical"].andes-scroll-area__scrollbar',
        ),
      ).toBeNull();
      expect(bar('horizontal')).not.toBeNull();

      fixture.componentInstance.orientation.set('both');
      fixture.detectChanges();
      expect(bar('vertical')).not.toBeNull();
      expect(bar('horizontal')).not.toBeNull();
      expect(
        host.querySelector('[data-slot="scroll-area-corner"]'),
      ).not.toBeNull();
    });
  });

  describe('thumb geometry', () => {
    it('sizes the thumb by the visible fraction', async () => {
      const { thumb } = await setup();
      // 200 / 1000 of a 200px track = 40px
      expect(thumb('vertical').style.height).toBe('40px');
      expect(thumb('vertical').style.transform).toBe('translateY(0px)');
    });

    it('moves the thumb with the scroll position', async () => {
      const { fixture, viewport, g, thumb } = await setup();
      g['scrollTop'] = 400; // half of the 800px range
      viewport.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      // travel = 200 - 40 = 160, half = 80
      expect(thumb('vertical').style.transform).toBe('translateY(80px)');
    });

    it('keeps a minimum thumb size for very long content', async () => {
      const { area, fixture, g, thumb } = await setup();
      g['scrollHeight'] = 100000;
      area.update();
      fixture.detectChanges();
      expect(thumb('vertical').style.height).toBe('24px');
    });

    it('measures the horizontal axis too', async () => {
      const { fixture, page, stubBars, g, area, thumb } = await setup({
        scrollWidth: 900,
      });
      page.orientation.set('both');
      fixture.detectChanges();
      stubBars();
      area.update();
      fixture.detectChanges();
      // 300 / 900 of a 300px track = 100px
      expect(thumb('horizontal').style.width).toBe('100px');
      g['scrollLeft'] = 300; // half of the 600px range; travel 200
      area.update();
      fixture.detectChanges();
      expect(thumb('horizontal').style.transform).toBe('translateX(100px)');
    });

    it('mirrors the horizontal thumb in right-to-left layouts', async () => {
      vi.stubGlobal('getComputedStyle', () => ({ direction: 'rtl' }));
      const { fixture, page, stubBars, g, area, thumb, host } = await setup({
        scrollWidth: 900,
      });
      page.orientation.set('horizontal');
      fixture.detectChanges();
      stubBars();
      g['scrollLeft'] = -300;
      area.update();
      fixture.detectChanges();
      expect(thumb('horizontal').style.transform).toBe('translateX(-100px)');
      expect(host.hasAttribute('data-rtl')).toBe(true);
    });
  });

  describe('visibility types', () => {
    it('auto: visible while the content overflows', async () => {
      const { fixture, g, area, bar } = await setup();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('visible');
      g['scrollHeight'] = 100;
      area.update();
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('hidden');
    });

    it('always: visible even without overflow, with no thumb', async () => {
      const { fixture, page, g, area, bar, thumb } = await setup();
      page.type.set('always');
      g['scrollHeight'] = 100;
      area.update();
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('visible');
      expect(thumb('vertical').style.display).toBe('none');
    });

    it('hover: shows while the pointer is over the area and hides after the delay', async () => {
      vi.useFakeTimers();
      const { fixture, page, host, bar } = await setup();
      page.type.set('hover');
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('hidden');

      host.dispatchEvent(pointer('pointerenter'));
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('visible');

      host.dispatchEvent(pointer('pointerleave'));
      vi.advanceTimersByTime(599);
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('visible');
      vi.advanceTimersByTime(2);
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('hidden');
    });

    it('scroll: shows while scrolling and hides 600ms after it stops', async () => {
      vi.useFakeTimers();
      const { fixture, page, viewport, bar } = await setup();
      page.type.set('scroll');
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('hidden');

      viewport.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('visible');

      vi.advanceTimersByTime(601);
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('hidden');
    });

    it('honours a custom hide delay', async () => {
      vi.useFakeTimers();
      const { fixture, page, viewport, bar } = await setup();
      page.type.set('scroll');
      page.hideDelay.set(100);
      fixture.detectChanges();
      viewport.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(101);
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('hidden');
    });
  });

  describe('pointer interaction', () => {
    it('drags the thumb with pointer capture and scrolls proportionally', async () => {
      const { fixture, g, thumb } = await setup();
      const element = thumb('vertical');
      const capture = vi.fn();
      element.setPointerCapture = capture;
      element.releasePointerCapture = vi.fn();

      element.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      fixture.detectChanges();
      expect(capture).toHaveBeenCalledWith(1);

      // 80px of travel out of 160 = half of the 800px range
      element.dispatchEvent(pointer('pointermove', { clientY: 90 }));
      expect(g['scrollTop']).toBe(400);

      // beyond the end clamps to the range
      element.dispatchEvent(pointer('pointermove', { clientY: 500 }));
      expect(g['scrollTop']).toBe(800);

      element.dispatchEvent(pointer('pointerup', { clientY: 500 }));
      fixture.detectChanges();
      expect(element.hasAttribute('data-dragging')).toBe(false);
    });

    it('ignores moves when not dragging and non-primary buttons', async () => {
      const { g, thumb } = await setup();
      const element = thumb('vertical');
      element.dispatchEvent(pointer('pointermove', { clientY: 90 }));
      expect(g['scrollTop']).toBe(0);
      element.dispatchEvent(pointer('pointerdown', { button: 2 }));
      element.dispatchEvent(pointer('pointermove', { clientY: 90 }));
      expect(g['scrollTop']).toBe(0);
    });

    it('keeps the bar visible while dragging in scroll mode', async () => {
      vi.useFakeTimers();
      const { fixture, page, thumb, bar } = await setup();
      page.type.set('scroll');
      fixture.detectChanges();
      thumb('vertical').dispatchEvent(pointer('pointerdown', { clientY: 0 }));
      fixture.detectChanges();
      expect(bar('vertical')?.getAttribute('data-state')).toBe('visible');
    });

    it('pages towards a click on the empty track', async () => {
      const { viewport, bar, g } = await setup();
      const scrollTo = vi.fn((options: ScrollToOptions) => {
        g['scrollTop'] = options.top ?? 0;
      });
      setScrollTo(viewport, scrollTo);
      const track = bar('vertical') as HTMLElement;
      track.getBoundingClientRect = () =>
        ({ top: 0, left: 0, right: 10, bottom: 200 }) as DOMRect;

      // thumb occupies 0-40px; a press at 120px is below it
      track.dispatchEvent(pointer('pointerdown', { clientY: 120 }));
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo.mock.calls[0][0].top).toBe(200);

      // a press on the thumb itself is not a page
      track.dispatchEvent(pointer('pointerdown', { clientY: 20 }));
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });
  });

  describe('API and events', () => {
    it('emits the scroll position', async () => {
      const { viewport, g, page } = await setup();
      g['scrollTop'] = 800;
      viewport.dispatchEvent(new Event('scroll'));
      const last = page.positions.at(-1);
      expect(last).toMatchObject({
        top: 800,
        scrollHeight: 1000,
        clientHeight: 200,
        atTop: false,
        atBottom: true,
      });
    });

    it('scrollTo, scrollToTop and scrollToBottom use the native scroller', async () => {
      const { viewport, area, g } = await setup();
      const scrollTo = vi.fn((options: ScrollToOptions) => {
        g['scrollTop'] = options.top ?? g['scrollTop'];
      });
      setScrollTo(viewport, scrollTo);

      area.scrollToBottom();
      expect(g['scrollTop']).toBe(1000);
      area.scrollToTop();
      expect(g['scrollTop']).toBe(0);
      area.scrollTo({ top: 120 });
      expect(g['scrollTop']).toBe(120);
      area.scrollBy({ top: 30 });
      expect(g['scrollTop']).toBe(150);
    });

    it('falls back to assigning scroll offsets without scrollTo', async () => {
      const { area, g, viewport } = await setup();
      setScrollTo(viewport, undefined);
      area.scrollTo({ top: 50 });
      expect(g['scrollTop']).toBe(50);
    });

    it('drops smooth scrolling under reduced motion', async () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      const { area, viewport } = await setup();
      const scrollTo = vi.fn();
      setScrollTo(viewport, scrollTo);
      area.scrollToTop('smooth');
      expect(scrollTo.mock.calls[0][0].behavior).toBe('auto');
    });

    it('exposes the native viewport element', async () => {
      const { area, viewport } = await setup();
      expect(area.viewport).toBe(viewport);
    });
  });

  describe('edge shadows', () => {
    it('shows the edge that still has content beyond it', async () => {
      const { fixture, page, host, g, area } = await setup();
      page.edgeShadow.set(true);
      fixture.detectChanges();
      const visible = () =>
        Array.from(
          host.querySelectorAll('.andes-scroll-area__shadow[data-visible]'),
        ).map((e) => e.getAttribute('data-edge'));
      expect(visible()).toEqual(['bottom']);

      g['scrollTop'] = 300;
      area.update();
      fixture.detectChanges();
      expect(visible()).toEqual(['top', 'bottom']);

      g['scrollTop'] = 800;
      area.update();
      fixture.detectChanges();
      expect(visible()).toEqual(['top']);
    });

    it('renders no shadows by default', async () => {
      const { host } = await setup();
      expect(host.querySelector('.andes-scroll-area__shadow')).toBeNull();
    });
  });
});

describe('scroll area stylesheet contract', () => {
  const css = readFileSync(
    'packages/ui/src/lib/scroll-area/scroll-area.css',
    'utf8',
  );

  it('hides only the native scrollbar and keeps native scrolling', () => {
    expect(css).toContain('scrollbar-width: none');
    expect(css).toContain('::-webkit-scrollbar');
    expect(css).toContain('overflow: scroll');
  });

  it('overlays the bars without taking layout space', () => {
    expect(css).toMatch(
      /\.andes-scroll-area__scrollbar\s*\{[^}]*position: absolute/,
    );
  });

  it('uses logical properties so the bars mirror in right-to-left layouts', () => {
    expect(css).toContain('inset-inline-end: 0');
    expect(css).toContain('inset-block-end: 0');
    expect(css).not.toMatch(/\bright:|\bleft:/);
  });

  it('draws the thumb from tokens with a pill radius', () => {
    expect(css).toContain('--andes-color-foreground');
    expect(css).toContain('--andes-radius-full');
  });

  it('shows an inset focus ring on the scroller', () => {
    expect(css).toContain('.andes-scroll-area__viewport:focus-visible');
    expect(css).toContain('--andes-color-focus-ring');
    expect(css).toContain('outline-offset: -2px');
  });

  it('fades in 150ms and has no motion under reduced motion', () => {
    expect(css).toContain('transition: opacity 150ms ease');
    expect(css.slice(css.indexOf('prefers-reduced-motion'))).toContain(
      'transition: none',
    );
  });
});
