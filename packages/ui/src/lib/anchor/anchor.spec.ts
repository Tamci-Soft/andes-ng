import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readFileSync } from 'node:fs';

import {
  AndesAnchor,
  type AndesAnchorContainer,
  type AndesAnchorDirection,
  type AndesAnchorItem,
} from './anchor';
import { AndesAnchorLink } from './anchor-link';
import { andesAnchorActiveHref, andesAnchorTargetId } from './anchor-scroll';

const ITEMS: AndesAnchorItem[] = [
  { key: 'intro', href: '#intro', title: 'Introduction' },
  {
    key: 'api',
    href: '#api',
    title: 'API',
    children: [{ key: 'props', href: '#props', title: 'Properties' }],
  },
  { key: 'faq', href: '#faq', title: 'FAQ' },
];

@Component({
  imports: [AndesAnchor, AndesAnchorLink],
  template: `
    <div id="scroller">
      <andes-anchor
        [items]="items()"
        [(activeLink)]="active"
        [offsetTop]="offsetTop()"
        [bounds]="bounds()"
        [targetOffset]="targetOffset()"
        [direction]="direction()"
        [affix]="affix()"
        [updateHash]="updateHash()"
        [hashHistory]="hashHistory()"
        [container]="container()"
        [smooth]="smooth()"
        [focusTarget]="focusTarget()"
        (changed)="changes.push($event)"
        (clicked)="onClicked($event)"
      >
        @if (projected()) {
          <andes-anchor-link href="#intro" title="Introduction" />
          <andes-anchor-link href="#api" title="API">
            <andes-anchor-link href="#props" title="Properties" />
          </andes-anchor-link>
        }
      </andes-anchor>
      <section id="intro">Introduction</section>
      <section id="api">API</section>
      <section id="props">Properties</section>
      <section id="faq">FAQ</section>
      <a id="external" href="https://example.com/docs">External</a>
    </div>
  `,
})
class HostComponent {
  readonly items = signal<AndesAnchorItem[]>(ITEMS);
  readonly projected = signal(false);
  readonly active = signal<string | undefined>(undefined);
  readonly offsetTop = signal(0);
  readonly bounds = signal(5);
  readonly targetOffset = signal<number | undefined>(undefined);
  readonly direction = signal<AndesAnchorDirection>('vertical');
  readonly affix = signal(false);
  readonly updateHash = signal(false);
  readonly hashHistory = signal<'replace' | 'push'>('replace');
  readonly container = signal<AndesAnchorContainer>(undefined);
  readonly smooth = signal(true);
  readonly focusTarget = signal(false);
  readonly changes: (string | undefined)[] = [];
  readonly clicks: string[] = [];
  preventClick = false;

  onClicked(event: { event: MouseEvent; link: { href: string } }) {
    this.clicks.push(event.link.href);
    if (this.preventClick) {
      event.event.preventDefault();
    }
  }
}

/** Section tops, as `getBoundingClientRect().top` would report them. */
let tops: Record<string, number> = {};
let frames: FrameRequestCallback[] = [];
let reducedMotion = false;

function flushFrames() {
  const pending = frames;
  frames = [];
  pending.forEach((cb) => cb(0));
}

function setup(configure?: (host: HostComponent) => void) {
  const fixture = TestBed.createComponent(HostComponent);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  fixture.detectChanges();
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const anchor = fixture.debugElement.query(By.directive(AndesAnchor))
    .componentInstance as AndesAnchor;
  const links = () =>
    Array.from(root.querySelectorAll<HTMLAnchorElement>('nav a'));
  const link = (href: string) =>
    links().find((a) => a.getAttribute('href') === href) as HTMLAnchorElement;
  const settle = () => {
    flushFrames();
    fixture.detectChanges();
    fixture.detectChanges();
  };
  const scrollTo = (
    next: Record<string, number>,
    source: EventTarget = window,
  ) => {
    tops = next;
    source.dispatchEvent(new Event('scroll'));
    settle();
  };
  return {
    fixture,
    component: fixture.componentInstance,
    root,
    anchor,
    links,
    link,
    settle,
    scrollTo,
  };
}

describe('AndesAnchor', () => {
  let scrollSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tops = { intro: 0, api: 600, props: 900, faq: 1400 };
    frames = [];
    reducedMotion = false;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const top = tops[this.id] ?? 0;
        return {
          top,
          bottom: top + 100,
          left: 0,
          right: 100,
          width: 100,
          height: 100,
          x: 0,
          y: top,
          toJSON: () => ({}),
        } as DOMRect;
      },
    );
    scrollSpy = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) =>
        ({
          matches: query.includes('reduce') && reducedMotion,
          media: query,
        }) as MediaQueryList,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Reflect.deleteProperty(window, 'matchMedia');
    window.history.replaceState(null, '', '/');
  });

  describe('markup', () => {
    it('is a labelled navigation landmark', () => {
      const { root } = setup();

      const nav = root.querySelector('nav') as HTMLElement;
      expect(nav.getAttribute('aria-label')).toBe('On this page');
      expect(nav.getAttribute('data-slot')).toBe('anchor');
    });

    it('renders nested items as a nested list', () => {
      const { root, links } = setup();

      expect(links().map((a) => a.textContent?.trim())).toEqual([
        'Introduction',
        'API',
        'Properties',
        'FAQ',
      ]);
      expect(root.querySelectorAll('ul ul a')).toHaveLength(1);
    });

    it('flattens nested items in horizontal anchors', () => {
      const { root, links } = setup((h) => h.direction.set('horizontal'));

      expect(root.querySelectorAll('ul ul')).toHaveLength(0);
      expect(links()).toHaveLength(4);
      expect(root.querySelector('nav')?.getAttribute('data-direction')).toBe(
        'horizontal',
      );
    });

    it('renders projected links, nested ones included', () => {
      const { root, links } = setup((h) => {
        h.items.set([]);
        h.projected.set(true);
      });

      expect(links().map((a) => a.getAttribute('href'))).toEqual([
        '#intro',
        '#api',
        '#props',
      ]);
      expect(
        root.querySelectorAll('andes-anchor-link[role="listitem"]'),
      ).toHaveLength(3);
      expect(
        root.querySelectorAll('.andes-anchor__nested[role="list"]'),
      ).toHaveLength(1);
    });

    it('sticks in place when affixed', () => {
      const { root } = setup((h) => {
        h.affix.set(true);
        h.offsetTop.set(24);
      });

      const host = root.querySelector('andes-anchor') as HTMLElement;
      expect(host.hasAttribute('data-affix')).toBe(true);
      expect(host.style.getPropertyValue('--andes-anchor-offset-top')).toBe(
        '24px',
      );
    });
  });

  describe('scroll tracking', () => {
    it('highlights the last section whose top has reached the top', () => {
      const { link, scrollTo, component } = setup();
      expect(component.active()).toBe('#intro');

      scrollTo({ intro: -700, api: -100, props: 200, faq: 700 });

      expect(component.active()).toBe('#api');
      expect(link('#api').getAttribute('aria-current')).toBe('location');
      expect(link('#intro').hasAttribute('aria-current')).toBe(false);
    });

    it('highlights nothing while every section is still below', () => {
      const { component, link, scrollTo } = setup((h) => h.offsetTop.set(0));

      scrollTo({ intro: 300, api: 600, props: 900, faq: 1400 });

      expect(component.active()).toBeUndefined();
      expect(link('#intro').hasAttribute('aria-current')).toBe(false);
    });

    it('applies bounds as a tolerance', () => {
      const { component, scrollTo } = setup((h) => h.bounds.set(5));

      scrollTo({ intro: -500, api: 4, props: 300, faq: 800 });
      expect(component.active()).toBe('#api');

      scrollTo({ intro: -500, api: 6, props: 300, faq: 800 });
      expect(component.active()).toBe('#intro');
    });

    it('measures against offsetTop', () => {
      const { component, scrollTo } = setup((h) => h.offsetTop.set(80));

      scrollTo({ intro: -500, api: 70, props: 300, faq: 800 });

      expect(component.active()).toBe('#api');
    });

    it('measures against a scroll container instead of the window', () => {
      const { component, scrollTo } = setup((h) =>
        h.container.set(() => document.getElementById('scroller')),
      );
      const scroller = document.getElementById('scroller') as HTMLElement;

      scrollTo(
        { scroller: 100, intro: 90, api: 400, props: 700, faq: 1000 },
        scroller,
      );
      expect(component.active()).toBe('#intro');

      scrollTo(
        { scroller: 100, intro: -300, api: 98, props: 700, faq: 1000 },
        scroller,
      );
      expect(component.active()).toBe('#api');
    });

    it('selects the last section once the container is scrolled to its end', () => {
      const { component, scrollTo } = setup((h) =>
        h.container.set(() => document.getElementById('scroller')),
      );
      const scroller = document.getElementById('scroller') as HTMLElement;
      Object.defineProperty(scroller, 'scrollHeight', {
        configurable: true,
        value: 1000,
      });
      Object.defineProperty(scroller, 'clientHeight', {
        configurable: true,
        value: 300,
      });
      Object.defineProperty(scroller, 'scrollTop', {
        configurable: true,
        value: 700,
      });

      scrollTo(
        { scroller: 0, intro: -900, api: -600, props: -300, faq: 150 },
        scroller,
      );

      expect(component.active()).toBe('#faq');
    });

    it('emits changed only when the highlight moves', () => {
      const { component, scrollTo } = setup();
      component.changes.length = 0;

      scrollTo({ intro: -10, api: 500, props: 800, faq: 1300 });
      scrollTo({ intro: -20, api: 490, props: 790, faq: 1290 });
      scrollTo({ intro: -700, api: 0, props: 300, faq: 800 });

      expect(component.changes).toEqual(['#api']);
    });

    it('shows an externally set activeLink', () => {
      const { component, link, fixture } = setup((h) => {
        tops = { intro: 400, api: 800, props: 1100, faq: 1600 };
      });

      component.active.set('#faq');
      fixture.detectChanges();

      expect(link('#faq').getAttribute('aria-current')).toBe('location');
    });

    it('batches scroll events into one frame', () => {
      setup();
      frames = [];

      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));

      expect(frames).toHaveLength(1);
    });
  });

  describe('clicking a link', () => {
    it('scrolls the section into view smoothly and highlights the link', () => {
      const { link, component } = setup();
      tops = { intro: -300, api: 600, props: 900, faq: 1400 };
      component.changes.length = 0;
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      link('#api').dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(scrollSpy).toHaveBeenCalledWith({ top: 600, behavior: 'smooth' });
      expect(component.active()).toBe('#api');
      expect(component.changes).toEqual(['#api']);
      expect(component.clicks).toEqual(['#api']);
    });

    it('lands the section at targetOffset', () => {
      const { link } = setup((h) => h.targetOffset.set(64));
      tops = { intro: 0, api: 600, props: 900, faq: 1400 };

      link('#api').click();

      expect(scrollSpy).toHaveBeenCalledWith({ top: 536, behavior: 'smooth' });
    });

    it('lands at offsetTop when there is no targetOffset', () => {
      const { link } = setup((h) => h.offsetTop.set(40));

      link('#api').click();

      expect(scrollSpy).toHaveBeenCalledWith({ top: 560, behavior: 'smooth' });
    });

    it('scrolls instantly under reduced motion', () => {
      reducedMotion = true;
      const { link } = setup();

      link('#api').click();

      expect(scrollSpy).toHaveBeenCalledWith({ top: 600, behavior: 'instant' });
    });

    it('scrolls instantly when smooth scrolling is turned off', () => {
      const { link } = setup((h) => h.smooth.set(false));

      link('#api').click();

      expect(scrollSpy).toHaveBeenCalledWith({ top: 600, behavior: 'instant' });
    });

    it('scrolls a custom container', () => {
      const { link } = setup((h) =>
        h.container.set(() => document.getElementById('scroller')),
      );
      const scroller = document.getElementById('scroller') as HTMLElement;
      const scrollContainer = vi.fn();
      scroller.scrollTo = scrollContainer;
      Object.defineProperty(scroller, 'scrollTop', {
        configurable: true,
        value: 50,
      });
      tops['scroller'] = 100;
      tops['api'] = 500;

      link('#api').click();

      expect(scrollContainer).toHaveBeenCalledWith({
        top: 450,
        behavior: 'smooth',
      });
      expect(scrollSpy).not.toHaveBeenCalled();
    });

    it('does not let the scroll animation change the highlight on the way', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { link, component, scrollTo } = setup();
      link('#faq').click();

      scrollTo({ intro: -900, api: -300, props: 0, faq: 500 });
      expect(component.active()).toBe('#faq');

      vi.advanceTimersByTime(200);
      scrollTo({ intro: -900, api: -300, props: 0, faq: 500 });
      expect(component.active()).toBe('#props');
    });

    it('resumes tracking when the browser reports scrollend', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { link, component, settle } = setup();
      link('#faq').click();
      tops = { intro: -900, api: -300, props: 0, faq: 500 };

      window.dispatchEvent(new Event('scrollend'));
      settle();

      expect(component.active()).toBe('#props');
    });

    it('updates the address bar hash only when asked to', () => {
      const replace = vi.spyOn(window.history, 'replaceState');
      const push = vi.spyOn(window.history, 'pushState');
      const first = setup();

      first.link('#api').click();
      expect(replace).not.toHaveBeenCalled();
      first.fixture.destroy();

      const second = setup((h) => h.updateHash.set(true));
      second.link('#api').click();
      expect(replace).toHaveBeenCalledWith(null, '', '#api');
      expect(push).not.toHaveBeenCalled();
      second.fixture.destroy();

      const third = setup((h) => {
        h.updateHash.set(true);
        h.hashHistory.set('push');
      });
      third.link('#faq').click();
      expect(push).toHaveBeenCalledWith(null, '', '#faq');
    });

    it('moves focus to the section when focusTarget is on', () => {
      const { link } = setup((h) => h.focusTarget.set(true));
      const section = document.getElementById('api') as HTMLElement;

      link('#api').click();

      expect(document.activeElement).toBe(section);
      expect(section.getAttribute('tabindex')).toBe('-1');
      section.blur();
      expect(section.hasAttribute('tabindex')).toBe(false);
    });

    it('leaves modified clicks to the browser', () => {
      const { link } = setup();
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
      });

      link('#api').dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(scrollSpy).not.toHaveBeenCalled();
    });

    it('lets a clicked handler cancel the scrolling', () => {
      const { link, component } = setup((h) => (h.preventClick = true));

      link('#api').click();

      expect(scrollSpy).not.toHaveBeenCalled();
      expect(component.active()).not.toBe('#api');
    });

    it('does not intercept links that point elsewhere', () => {
      const { component, root } = setup((h) =>
        h.items.set([
          { key: 'ext', href: 'https://example.com/docs#top', title: 'Docs' },
        ]),
      );
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      root.querySelector('nav a')?.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(component.clicks).toEqual(['https://example.com/docs#top']);
    });

    it('works for projected links too', () => {
      const { link, component, fixture } = setup((h) => {
        h.items.set([]);
        h.projected.set(true);
      });

      link('#props').click();
      fixture.detectChanges();

      expect(scrollSpy).toHaveBeenCalled();
      expect(component.active()).toBe('#props');
      expect(link('#props').getAttribute('aria-current')).toBe('location');
    });

    it('offers scrollTo as an imperative API', () => {
      const { anchor, component } = setup();

      anchor.scrollTo('#faq');

      expect(scrollSpy).toHaveBeenCalledWith({ top: 1400, behavior: 'smooth' });
      expect(component.active()).toBe('#faq');
    });
  });

  describe('ink', () => {
    beforeEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
        configurable: true,
        get(this: HTMLElement) {
          return (
            { '#intro': 0, '#api': 30, '#props': 60, '#faq': 90 }[
              this.getAttribute('href') ?? ''
            ] ?? 0
          );
        },
      });
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get: () => 30,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(HTMLElement.prototype, 'offsetTop');
      Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
    });

    it('sits on the active link and slides to the next one', () => {
      const { root, scrollTo } = setup();
      const ink = root.querySelector('.andes-anchor__ink') as HTMLElement;
      expect(ink.style.transform).toBe('translateY(0px)');
      expect(ink.style.height).toBe('30px');
      expect(ink.hasAttribute('data-visible')).toBe(true);

      scrollTo({ intro: -700, api: -100, props: 200, faq: 700 });

      expect(ink.style.transform).toBe('translateY(30px)');
    });

    it('hides when no link is active', () => {
      tops = { intro: 300, api: 600, props: 900, faq: 1400 };
      const { root } = setup();

      expect(
        (root.querySelector('.andes-anchor__ink') as HTMLElement).hasAttribute(
          'data-visible',
        ),
      ).toBe(false);
    });

    it('slides sideways in horizontal anchors', () => {
      const { root } = setup((h) => {
        h.direction.set('horizontal');
        h.active.set('#api');
      });
      Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
        configurable: true,
        get: () => 120,
      });
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        get: () => 48,
      });
      const ink = root.querySelector('.andes-anchor__ink') as HTMLElement;

      expect(ink.getAttribute('data-visible')).not.toBeNull();
      Reflect.deleteProperty(HTMLElement.prototype, 'offsetLeft');
      Reflect.deleteProperty(HTMLElement.prototype, 'offsetWidth');
    });

    it('only starts animating after its first placement', () => {
      const { root } = setup();
      const ink = root.querySelector('.andes-anchor__ink') as HTMLElement;
      expect(ink.hasAttribute('data-ready')).toBe(false);

      flushFrames();

      expect(ink.hasAttribute('data-ready')).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('removes its listeners on destroy', () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      const { fixture } = setup();

      fixture.destroy();

      expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('does not touch the browser when rendered on the server', () => {
      TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
      const add = vi.spyOn(window, 'addEventListener');

      const { root } = setup();

      expect(root.querySelector('nav')).not.toBeNull();
      expect(add).not.toHaveBeenCalledWith(
        'scroll',
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('helpers', () => {
    it('picks by position, not by order', () => {
      expect(
        andesAnchorActiveHref(
          [
            { href: '#b', top: -10 },
            { href: '#a', top: -300 },
            { href: '#c', top: 200 },
          ],
          0,
        ),
      ).toBe('#b');
      expect(
        andesAnchorActiveHref([{ href: '#c', top: 200 }], 0),
      ).toBeUndefined();
    });

    it('chooses the lowest section at the end of the scroll range', () => {
      const sections = [
        { href: '#props', top: -40 },
        { href: '#faq', top: 300 },
      ];
      expect(andesAnchorActiveHref(sections, 5)).toBe('#props');
      expect(andesAnchorActiveHref(sections, 5, true)).toBe('#faq');
    });

    it.each([
      ['#intro', 'http://localhost/page', 'intro'],
      ['#a%20b', 'http://localhost/page', 'a b'],
      ['/page#intro', 'http://localhost/page', 'intro'],
      ['/other#intro', 'http://localhost/page', undefined],
      ['https://example.com/page#intro', 'http://localhost/page', undefined],
      ['#', 'http://localhost/page', undefined],
      ['/page', 'http://localhost/page', undefined],
    ])('reads the target id of %s on %s', (href, current, expected) => {
      expect(andesAnchorTargetId(href, current)).toBe(expected);
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync('packages/ui/src/lib/anchor/anchor.css', 'utf8');
    const linkCss = readFileSync(
      'packages/ui/src/lib/anchor/anchor-link.css',
      'utf8',
    );

    it('slides the ink in 150ms or less', () => {
      const durations = [
        ...css.matchAll(/(?:transform|width|height|opacity) (\d+)ms/g),
      ].map((m) => Number(m[1]));
      expect(durations.length).toBeGreaterThan(0);
      expect(Math.max(...durations)).toBeLessThanOrEqual(150);
    });

    it('drops the ink and link transitions for reduced motion', () => {
      expect(css).toMatch(
        /prefers-reduced-motion: reduce\)\s*\{[^}]*\{[^}]*transition: none/,
      );
      expect(linkCss).toMatch(
        /prefers-reduced-motion: reduce\)\s*\{[^}]*\{[^}]*transition: none/,
      );
    });

    it('shows a focus ring on keyboard focus', () => {
      expect(linkCss).toContain('.andes-anchor__link:focus-visible');
      expect(linkCss).toContain('var(--andes-color-focus-ring');
    });

    it('never lets a selector continue on a line that starts with a combinator', () => {
      expect(css).not.toMatch(/^\s*[>+~]/m);
      expect(linkCss).not.toMatch(/^\s*[>+~]/m);
    });
  });
});
