import {
  Component,
  PLATFORM_ID,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readFileSync } from 'node:fs';

import {
  AndesMasonry,
  type AndesMasonryItemConfig,
  type AndesMasonryLayoutItem,
  type AndesMasonryResponsive,
  type AndesMasonryGutter,
} from './masonry';
import { AndesMasonryItem } from './masonry-item';
import {
  andesMasonryBreakpoint,
  andesMasonryGutterPair,
  andesMasonryLayout,
  andesMasonryResolve,
} from './masonry-layout';

@Component({
  imports: [AndesMasonry, AndesMasonryItem],
  template: `
    <div [attr.dir]="dir()">
      <andes-masonry
        [columns]="columns()"
        [gutter]="gutter()"
        [items]="items()"
        [itemTemplate]="card()"
        [fresh]="fresh()"
        (layoutChanged)="reports.push($event)"
      >
        @if (projected()) {
          <andes-masonry-item id="p1" [height]="70">One</andes-masonry-item>
          <andes-masonry-item id="p2" [column]="2">Two</andes-masonry-item>
          <andes-masonry-item id="p3" itemKey="third">Three</andes-masonry-item>
        }
      </andes-masonry>
      <ng-template #cardTpl let-item let-index="index">
        <article>{{ index }}:{{ item.key }}</article>
      </ng-template>
    </div>
  `,
})
class HostComponent {
  readonly columns = signal<AndesMasonryResponsive<number>>(2);
  readonly gutter = signal<AndesMasonryResponsive<AndesMasonryGutter>>(10);
  readonly fresh = signal(false);
  readonly dir = signal<string | null>(null);
  readonly projected = signal(false);
  readonly items = signal<AndesMasonryItemConfig[]>([
    { key: 'a' },
    { key: 'b' },
    { key: 'c' },
    { key: 'd' },
  ]);
  readonly card = viewChild.required<TemplateRef<never>>('cardTpl');
  readonly reports: AndesMasonryLayoutItem[][] = [];
}

/** Rendered height per item, by `data-key` or `id`; jsdom does no layout. */
let heights: Record<string, number> = {};
let hostWidth = 1000;
let frames: FrameRequestCallback[] = [];
let resizeCallbacks: ResizeObserverCallback[] = [];
let observed: Element[] = [];
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
  const host = root.querySelector('andes-masonry') as HTMLElement;
  const masonry = fixture.debugElement.query(By.directive(AndesMasonry))
    .componentInstance as AndesMasonry;
  const item = (key: string) =>
    (root.querySelector(`[data-key="${key}"]`) ??
      root.querySelector(`#${key}`)) as HTMLElement;
  const children = () => Array.from(host.children) as HTMLElement[];
  const refresh = () => {
    masonry.relayout();
    fixture.detectChanges();
  };
  return {
    fixture,
    component: fixture.componentInstance,
    root,
    host,
    masonry,
    item,
    children,
    refresh,
  };
}

function translation(el: HTMLElement): [number, number] {
  const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(
    el.style.transform,
  );
  return [Number(match?.[1]), Number(match?.[2])];
}

describe('AndesMasonry', () => {
  beforeEach(() => {
    heights = { a: 100, b: 200, c: 50, d: 80 };
    hostWidth = 1000;
    frames = [];
    resizeCallbacks = [];
    observed = [];
    reducedMotion = false;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallbacks.push(callback);
        }
        observe(el: Element) {
          observed.push(el);
        }
        unobserve(el: Element) {
          observed = observed.filter((o) => o !== el);
        }
        disconnect() {
          observed = [];
        }
      },
    );
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.localName === 'andes-masonry' ? hostWidth : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return heights[this.getAttribute('data-key') ?? this.id] ?? 0;
      },
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) =>
        ({
          matches: query.includes('reduce') && reducedMotion,
          media: query,
        }) as MediaQueryList,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
    Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
    Reflect.deleteProperty(window, 'matchMedia');
    Reflect.deleteProperty(window, 'innerWidth');
  });

  describe('placement', () => {
    it('puts each item in the shortest column, leftmost on a tie', () => {
      const { item, host } = setup();

      // Two columns of (1000 - 10) / 2 = 495px, 10px apart.
      expect(translation(item('a'))).toEqual([0, 0]);
      expect(translation(item('b'))).toEqual([505, 0]);
      expect(translation(item('c'))).toEqual([0, 110]);
      expect(translation(item('d'))).toEqual([0, 170]);
      expect(item('a').style.width).toBe('495px');
      // Left column: 100 + 50 + 80 plus the two gutters between them.
      expect(host.style.height).toBe('250px');
    });

    it('keeps the items in source order in the DOM', () => {
      const { children } = setup();

      expect(children().map((el) => el.getAttribute('data-key'))).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
    });

    it('is a list of list items', () => {
      const { host, children } = setup();

      expect(host.getAttribute('role')).toBe('list');
      expect(
        children().every((el) => el.getAttribute('role') === 'listitem'),
      ).toBe(true);
    });

    it('renders the item template with the item and its index', () => {
      const { item } = setup();

      expect(item('c').textContent?.trim()).toBe('2:c');
    });

    it('switches from the CSS-columns fallback once measured', () => {
      const { host } = setup();

      expect(host.getAttribute('data-layout')).toBe('js');
    });

    it('stays on the fallback while the container has no width', () => {
      hostWidth = 0;
      const { host, item } = setup();

      expect(host.getAttribute('data-layout')).toBe('css');
      expect(item('a').style.transform).toBe('');
    });

    it('falls back to CSS columns on the server', () => {
      TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });

      const { host, item } = setup();

      expect(host.getAttribute('data-layout')).toBe('css');
      expect(item('a').style.position).toBe('');
    });

    it('mirrors horizontally in right-to-left layouts', () => {
      const { item } = setup((h) => h.dir.set('rtl'));

      expect(translation(item('b'))[0]).toBe(-505);
    });

    it('uses an estimated height until the item can be measured', () => {
      heights = {};
      const { item } = setup((h) =>
        h.items.set([
          { key: 'a', height: 100 },
          { key: 'b', height: 40 },
          { key: 'c', height: 40 },
        ]),
      );

      expect(translation(item('c'))).toEqual([505, 50]);
    });

    it('honours a pinned column', () => {
      const { item } = setup((h) =>
        h.items.set([
          { key: 'a', column: 1 },
          { key: 'b', column: 1 },
          { key: 'c', column: 9 },
        ]),
      );

      expect(translation(item('a'))[0]).toBe(505);
      expect(translation(item('b'))).toEqual([505, 110]);
      // Out-of-range pins are clamped to the last column.
      expect(translation(item('c'))[0]).toBe(505);
    });
  });

  describe('responsive columns and gutter', () => {
    it('resolves the column count for the viewport width', () => {
      const { host, fixture } = setup((h) =>
        h.columns.set({ xs: 1, md: 2, xl: 4 }),
      );
      expect(host.getAttribute('data-columns')).toBe('2');

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 500,
      });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
      expect(host.getAttribute('data-columns')).toBe('1');

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 1300,
      });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
      expect(host.getAttribute('data-columns')).toBe('4');
    });

    it('re-places the items when the column count changes', () => {
      const { item, fixture } = setup((h) => h.columns.set({ xs: 1, lg: 2 }));
      expect(translation(item('b'))[0]).toBe(505);

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 400,
      });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
      flushFrames();

      expect(translation(item('b'))).toEqual([0, 110]);
      expect(item('b').style.width).toBe('1000px');
    });

    it('accepts a horizontal and vertical gutter', () => {
      const { item } = setup((h) => h.gutter.set([20, 4]));

      // (1000 - 20) / 2 = 490 wide columns, 20px apart; 4px between rows.
      expect(item('b').style.width).toBe('490px');
      expect(translation(item('b'))[0]).toBe(510);
      expect(translation(item('c'))).toEqual([0, 104]);
    });

    it('accepts a gutter per breakpoint', () => {
      const { item } = setup((h) => h.gutter.set({ xs: 4, lg: 30 }));

      expect(translation(item('b'))[0]).toBe(485 + 30);
    });

    it('describes every breakpoint to the CSS fallback', () => {
      const { host } = setup((h) => {
        h.columns.set({ xs: 1, md: 2, xl: 4 });
        h.gutter.set({ xs: 8, lg: [24, 12] });
      });

      const read = (name: string) => host.style.getPropertyValue(name);
      expect(read('--andes-masonry-columns-xs')).toBe('1');
      expect(read('--andes-masonry-columns-sm')).toBe('1');
      expect(read('--andes-masonry-columns-md')).toBe('2');
      expect(read('--andes-masonry-columns-lg')).toBe('2');
      expect(read('--andes-masonry-columns-xxl')).toBe('4');
      expect(read('--andes-masonry-gutter-x-md')).toBe('8px');
      expect(read('--andes-masonry-gutter-x-lg')).toBe('24px');
      expect(read('--andes-masonry-gutter-y-lg')).toBe('12px');
    });
  });

  describe('stable and fresh placement', () => {
    const taller = { a: 500, b: 200, c: 50, d: 80 };

    it('keeps items in their columns when a height changes', () => {
      const { item, refresh } = setup();
      heights = { ...taller };

      refresh();

      expect(translation(item('c'))).toEqual([0, 510]);
      expect(translation(item('d'))).toEqual([0, 570]);
    });

    it('re-packs from scratch with fresh', () => {
      const { item, refresh } = setup((h) => h.fresh.set(true));
      heights = { ...taller };

      refresh();

      expect(translation(item('c'))).toEqual([505, 210]);
    });

    it('places an appended item in the shortest column without moving the rest', () => {
      const { item, component, fixture, masonry } = setup();
      const before = ['a', 'b', 'c', 'd'].map((k) => translation(item(k)));
      heights['e'] = 60;

      component.items.update((items) => [...items, { key: 'e' }]);
      fixture.detectChanges();
      masonry.relayout();

      expect(['a', 'b', 'c', 'd'].map((k) => translation(item(k)))).toEqual(
        before,
      );
      // Left column is 250px tall, right is 210px.
      expect(translation(item('e'))).toEqual([505, 210]);
    });
  });

  describe('projected items', () => {
    it('positions projected items alongside data-driven ones', () => {
      heights['p1'] = 30;
      heights['p2'] = 30;
      heights['p3'] = 30;
      const { item, children } = setup((h) => {
        h.projected.set(true);
        h.items.set([]);
        h.columns.set(3);
      });

      expect(children().map((el) => el.id)).toEqual(['p1', 'p2', 'p3']);
      expect(item('p1').getAttribute('role')).toBe('listitem');
      // p2 is pinned to the third column.
      expect(translation(item('p2'))[0]).toBeGreaterThan(
        translation(item('p3'))[0],
      );
      expect(item('p1').getAttribute('data-layout')).toBe('js');
    });

    it('uses the height estimate of an item that cannot be measured yet', () => {
      heights = {};
      const { item } = setup((h) => {
        h.projected.set(true);
        h.items.set([]);
        h.columns.set(1);
        h.gutter.set(0);
      });

      expect(translation(item('p2'))[1]).toBe(70);
    });
  });

  describe('relayout scheduling', () => {
    it('merges requests made in one frame', () => {
      const { masonry } = setup();
      frames = [];

      masonry.requestLayout();
      masonry.requestLayout();
      masonry.requestLayout();

      expect(frames).toHaveLength(1);
    });

    it('relayouts after an item resizes', () => {
      const { item } = setup();
      heights['a'] = 300;
      frames = [];

      resizeCallbacks.forEach((cb) => cb([], {} as ResizeObserver));
      expect(frames).toHaveLength(1);
      flushFrames();

      // Stable placement: c stays in the left column, now below the taller first item.
      expect(translation(item('c'))).toEqual([0, 310]);
    });

    it('observes the items and drops removed ones', () => {
      const { component, fixture, masonry, item } = setup();
      const removed = item('d');
      expect(observed).toContain(removed);

      component.items.update((items) => items.slice(0, 3));
      fixture.detectChanges();
      masonry.relayout();

      expect(observed).not.toContain(removed);
    });

    it('stops observing when destroyed', () => {
      const { fixture } = setup();

      fixture.destroy();

      expect(observed).toEqual([]);
    });
  });

  describe('reporting', () => {
    it('reports the column of every data-driven item', () => {
      const { component } = setup();

      expect(component.reports.at(-1)).toEqual([
        { key: 'a', column: 0 },
        { key: 'b', column: 1 },
        { key: 'c', column: 0 },
        { key: 'd', column: 0 },
      ]);
    });

    it('only reports when something moved', () => {
      const { component, refresh } = setup();
      const count = component.reports.length;

      refresh();
      refresh();

      expect(component.reports).toHaveLength(count);
    });
  });

  describe('motion', () => {
    it('jumps into place the first time and slides afterwards', () => {
      const { item, refresh } = setup();
      expect(item('c').style.transition).toBe('none');

      heights['a'] = 300;
      refresh();

      expect(item('c').style.transition).toContain('transform');
      expect(item('c').style.transition).toContain('200ms');
    });

    it('does not slide a newly added item in from the corner', () => {
      const { item, component, fixture, masonry } = setup();
      heights['e'] = 40;

      component.items.update((items) => [...items, { key: 'e' }]);
      fixture.detectChanges();
      masonry.relayout();

      expect(item('e').style.transition).toBe('none');
    });

    it('never animates under reduced motion', () => {
      reducedMotion = true;
      const { item, refresh } = setup();
      heights['a'] = 300;

      refresh();

      expect(item('c').style.transition).toBe('none');
    });
  });

  describe('layout maths', () => {
    it('breaks the viewport into the five breakpoints', () => {
      expect(
        [0, 575, 576, 767, 768, 991, 992, 1199, 1200, 1599, 1600].map(
          andesMasonryBreakpoint,
        ),
      ).toEqual([
        'xs',
        'xs',
        'sm',
        'sm',
        'md',
        'md',
        'lg',
        'lg',
        'xl',
        'xl',
        'xxl',
      ]);
    });

    it('resolves a map to the nearest smaller entry, then the nearest larger one', () => {
      expect(andesMasonryResolve({ md: 2, xl: 4 }, 'lg')).toBe(2);
      expect(andesMasonryResolve({ md: 2, xl: 4 }, 'xs')).toBe(2);
      expect(andesMasonryResolve({ md: 2, xl: 4 }, 'xxl')).toBe(4);
      expect(andesMasonryResolve(3, 'md')).toBe(3);
    });

    it('turns a gutter into a pair', () => {
      expect(andesMasonryGutterPair(8)).toEqual([8, 8]);
      expect(andesMasonryGutterPair([4, 12])).toEqual([4, 12]);
      expect(andesMasonryGutterPair(undefined)).toEqual([0, 0]);
      expect(andesMasonryGutterPair(-5)).toEqual([0, 0]);
    });

    it('returns an empty layout for no entries', () => {
      expect(
        andesMasonryLayout({
          entries: [],
          columns: 3,
          width: 300,
          gutterX: 10,
          gutterY: 10,
        }),
      ).toEqual({ placements: [], height: 0, assignments: new Map() });
    });

    it('breaks ties towards the first column and treats less than a pixel as a tie', () => {
      const result = andesMasonryLayout({
        entries: [
          { id: 1, height: 100 },
          { id: 2, height: 100.005 },
          { id: 3, height: 10 },
        ],
        columns: 2,
        width: 200,
        gutterX: 0,
        gutterY: 0,
      });

      expect(result.placements.map((p) => p.column)).toEqual([0, 1, 0]);
    });

    it('forgets a remembered column that no longer exists', () => {
      const result = andesMasonryLayout({
        entries: [{ id: 'x', height: 10 }],
        columns: 2,
        width: 200,
        gutterX: 0,
        gutterY: 0,
        previous: new Map([['x', 5]]),
      });

      expect(result.placements[0].column).toBe(0);
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync('packages/ui/src/lib/masonry/masonry.css', 'utf8');

    it('falls back to CSS columns with the five breakpoints', () => {
      expect(css).toContain('column-count: var(--andes-masonry-columns-xs');
      for (const px of [576, 768, 992, 1200, 1600]) {
        expect(css).toContain(`@media (min-width: ${px}px)`);
      }
    });

    it('drops the columns once positioned', () => {
      expect(css).toMatch(
        /:host\(\[data-layout='js'\]\)\s*\{[^}]*column-count: auto/,
      );
    });

    it('never lets a selector continue on a line that starts with a combinator', () => {
      expect(css).not.toMatch(/^\s*[>+~]/m);
    });

    it('has a reduced-motion rule', () => {
      expect(css).toContain('prefers-reduced-motion: reduce');
    });
  });
});
