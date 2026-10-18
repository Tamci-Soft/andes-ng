import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PLATFORM_ID } from '@angular/core';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ANDES_BREAKPOINT_SSR_DEFAULT,
  ANDES_BREAKPOINTS,
  andesBreakpointForWidth,
  AndesBreakpoint,
  AndesBreakpointService,
  isAndesResponsiveMap,
} from './breakpoints';
import { AndesCol, andesColFlex, AndesColBreakpointSize } from './grid-col';
import { andesLength, andesResolveResponsive } from './grid-responsive';
import {
  AndesGutter,
  AndesRow,
  AndesRowAlign,
  AndesRowBreakpointSource,
} from './grid-row';

function minWidth(query: string): number {
  return Number(/(\d+)px/.exec(query)?.[1] ?? 0);
}

class FakeMediaQuery {
  matches = false;
  private listeners = new Set<() => void>();
  constructor(readonly query: string) {}
  addEventListener(_: string, listener: () => void) {
    this.listeners.add(listener);
  }
  removeEventListener(_: string, listener: () => void) {
    this.listeners.delete(listener);
  }
  emit(matches: boolean) {
    this.matches = matches;
    this.listeners.forEach((listener) => listener());
  }
}

/** A viewport whose width the test controls; every min-width query re-evaluates against it. */
function stubViewport(initialWidth: number) {
  const queries: FakeMediaQuery[] = [];
  let width = initialWidth;
  vi.stubGlobal('matchMedia', (query: string) => {
    const list = new FakeMediaQuery(query);
    list.matches = width >= minWidth(query);
    queries.push(list);
    return list;
  });
  return {
    queries,
    resize(next: number) {
      width = next;
      for (const list of queries) {
        const min = minWidth(list.query);
        if (list.matches !== width >= min) {
          list.emit(width >= min);
        }
      }
    },
  };
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  disconnected = false;
  observed: Element[] = [];
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element) {
    this.observed.push(target);
  }
  disconnect() {
    this.disconnected = true;
  }
  unobserve() {
    /* unused */
  }
  resize(width: number) {
    this.callback(
      [{ contentRect: { width } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

@Component({
  imports: [AndesRow, AndesCol],
  template: `
    <andes-row
      [gutter]="gutter()"
      [align]="align()"
      [justify]="justify()"
      [wrap]="wrap()"
      [breakpointSource]="source()"
      (breakpointChange)="changes.push($event)"
    >
      <andes-col
        id="a"
        [span]="span()"
        [offset]="offset()"
        [order]="order()"
        [push]="push()"
        [pull]="pull()"
        [flex]="flex()"
        [sm]="sm()"
        [md]="md()"
        [lg]="lg()"
        >A</andes-col
      >
      <andes-col id="b" span="8" offset="2">B</andes-col>
    </andes-row>
  `,
})
class Host {
  readonly gutter = signal<AndesGutter | undefined>(undefined);
  readonly align = signal<AndesRowAlign | undefined>(undefined);
  readonly justify = signal<'center' | undefined>(undefined);
  readonly wrap = signal(true);
  readonly source = signal<AndesRowBreakpointSource>('viewport');
  readonly span = signal<number | undefined>(undefined);
  readonly offset = signal<number | undefined>(undefined);
  readonly order = signal<number | undefined>(undefined);
  readonly push = signal<number | undefined>(undefined);
  readonly pull = signal<number | undefined>(undefined);
  readonly flex = signal<number | string | undefined>(undefined);
  readonly sm = signal<AndesColBreakpointSize | undefined>(undefined);
  readonly md = signal<AndesColBreakpointSize | undefined>(undefined);
  readonly lg = signal<AndesColBreakpointSize | undefined>(undefined);
  readonly changes: AndesBreakpoint[] = [];
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeResizeObserver.instances = [];
});

describe('breakpoints', () => {
  it('exports the thresholds', () => {
    expect(ANDES_BREAKPOINTS).toEqual({
      xs: 0,
      sm: 576,
      md: 768,
      lg: 992,
      xl: 1200,
      xxl: 1600,
    });
  });

  it.each([
    [0, 'xs'],
    [575, 'xs'],
    [576, 'sm'],
    [767, 'sm'],
    [768, 'md'],
    [991, 'md'],
    [992, 'lg'],
    [1199, 'lg'],
    [1200, 'xl'],
    [1599, 'xl'],
    [1600, 'xxl'],
    [5000, 'xxl'],
    [-5, 'xs'],
    [NaN, 'xs'],
  ])('maps a width of %d to %s', (width, expected) => {
    expect(andesBreakpointForWidth(width)).toBe(expected);
  });

  it('tells a responsive map from a value or a tuple', () => {
    expect(isAndesResponsiveMap({ md: 1 })).toBe(true);
    expect(isAndesResponsiveMap(4)).toBe(false);
    expect(isAndesResponsiveMap('4px')).toBe(false);
    expect(isAndesResponsiveMap([1, 2] as never)).toBe(false);
    expect(isAndesResponsiveMap(undefined)).toBe(false);
  });

  it('resolves a map to the largest breakpoint at or below the active one', () => {
    const map = { xs: 8, md: 16, xl: 32 };
    expect(andesResolveResponsive(map, 'xs')).toBe(8);
    expect(andesResolveResponsive(map, 'sm')).toBe(8);
    expect(andesResolveResponsive(map, 'md')).toBe(16);
    expect(andesResolveResponsive(map, 'lg')).toBe(16);
    expect(andesResolveResponsive(map, 'xxl')).toBe(32);
    expect(andesResolveResponsive({ lg: 1 }, 'sm')).toBeUndefined();
    expect(andesResolveResponsive(7, 'sm')).toBe(7);
  });

  it('converts gutter parts to lengths', () => {
    expect(andesLength(16)).toBe('16px');
    expect(andesLength('1rem')).toBe('1rem');
    expect(andesLength(-4)).toBeNull();
    expect(andesLength('  ')).toBeNull();
  });
});

describe('AndesBreakpointService', () => {
  it('follows the viewport and updates on change', () => {
    const viewport = stubViewport(800);
    const service = TestBed.inject(AndesBreakpointService);
    expect(service.current()).toBe('md');
    viewport.resize(1300);
    expect(service.current()).toBe('xl');
    viewport.resize(300);
    expect(service.current()).toBe('xs');
  });

  it('answers atLeast', () => {
    const viewport = stubViewport(800);
    const service = TestBed.inject(AndesBreakpointService);
    const desktop = service.atLeast('lg');
    expect(desktop()).toBe(false);
    expect(service.atLeast('sm')()).toBe(true);
    viewport.resize(1000);
    expect(desktop()).toBe(true);
  });

  it('stops listening when destroyed', () => {
    const viewport = stubViewport(800);
    TestBed.inject(AndesBreakpointService);
    TestBed.resetTestingModule();
    expect(viewport.queries.every((list) => list.matches !== undefined)).toBe(
      true,
    );
    // No listener may be left behind to run against a destroyed service.
    expect(() => viewport.resize(1700)).not.toThrow();
  });

  it('holds the server default and never changes on the server', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    expect(TestBed.inject(AndesBreakpointService).current()).toBe('lg');
  });

  it('lets the server default be configured', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: ANDES_BREAKPOINT_SSR_DEFAULT, useValue: 'xs' },
      ],
    });
    expect(TestBed.inject(AndesBreakpointService).current()).toBe('xs');
  });

  it('falls back to the default where matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(TestBed.inject(AndesBreakpointService).current()).toBe('lg');
  });
});

describe('andesColFlex', () => {
  it('turns a number into a proportional grow', () => {
    expect(andesColFlex(2)).toBe('2 2 auto');
  });
  it('treats a bare length as a fixed basis', () => {
    expect(andesColFlex('200px')).toBe('0 0 200px');
    expect(andesColFlex('30%')).toBe('0 0 30%');
  });
  it('passes other strings through', () => {
    expect(andesColFlex('1 1 200px')).toBe('1 1 200px');
    expect(andesColFlex('auto')).toBe('auto');
    expect(andesColFlex('none')).toBe('none');
  });
  it('ignores empty values', () => {
    expect(andesColFlex('')).toBeNull();
    expect(andesColFlex(NaN)).toBeNull();
  });
});

describe('AndesRow and AndesCol', () => {
  function create() {
    stubViewport(1000);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const q = (selector: string) =>
      fixture.nativeElement.querySelector(selector) as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      row: q('andes-row'),
      a: q('#a'),
      b: q('#b'),
    };
  }
  const v = (el: HTMLElement, name: string) => el.style.getPropertyValue(name);

  it('marks rows and columns', () => {
    const { row, a } = create();
    expect(row.getAttribute('data-slot')).toBe('row');
    expect(a.getAttribute('data-slot')).toBe('col');
    expect(row.getAttribute('data-breakpoint-source')).toBe('viewport');
  });

  it('writes nothing for a bare row and column', () => {
    const { row, a } = create();
    expect(row.getAttribute('style') ?? '').toBe('');
    expect(a.getAttribute('style') ?? '').toBe('');
  });

  it('accepts numeric attributes on columns', () => {
    const { b } = create();
    expect(v(b, '--andes-col-span')).toBe('8');
    expect(v(b, '--andes-col-offset')).toBe('2');
    expect(v(b, '--andes-col-display')).toBe('block');
  });

  describe('gutter', () => {
    it('a number is the horizontal gutter', () => {
      const { fixture, host, row } = create();
      host.gutter.set(16);
      fixture.detectChanges();
      expect(v(row, '--andes-row-gx')).toBe('16px');
      expect(v(row, '--andes-row-gy')).toBe('');
    });

    it('a pair sets both axes, and parts may be lengths', () => {
      const { fixture, host, row } = create();
      host.gutter.set([24, '1rem']);
      fixture.detectChanges();
      expect(v(row, '--andes-row-gx')).toBe('24px');
      expect(v(row, '--andes-row-gy')).toBe('1rem');
    });

    it('a map writes one variable per breakpoint', () => {
      const { fixture, host, row } = create();
      host.gutter.set({ xs: 8, md: 24 });
      fixture.detectChanges();
      expect(v(row, '--andes-row-gx-xs')).toBe('8px');
      expect(v(row, '--andes-row-gx-md')).toBe('24px');
      expect(v(row, '--andes-row-gx-lg')).toBe('');
      expect(v(row, '--andes-row-gx')).toBe('');
    });

    it('a pair may hold maps', () => {
      const { fixture, host, row } = create();
      host.gutter.set([{ xs: 8, lg: 32 }, { md: 16 }]);
      fixture.detectChanges();
      expect(v(row, '--andes-row-gx-lg')).toBe('32px');
      expect(v(row, '--andes-row-gy-md')).toBe('16px');
    });
  });

  it('maps align, justify and wrap', () => {
    const { fixture, host, row } = create();
    host.align.set('middle');
    host.justify.set('center');
    host.wrap.set(false);
    fixture.detectChanges();
    expect(v(row, '--andes-row-align')).toBe('center');
    expect(v(row, '--andes-row-justify')).toBe('center');
    expect(row.hasAttribute('data-nowrap')).toBe(true);
    host.align.set('bottom');
    fixture.detectChanges();
    expect(v(row, '--andes-row-align')).toBe('flex-end');
  });

  describe('column props', () => {
    it('writes span, offset, order, push and pull', () => {
      const { fixture, host, a } = create();
      host.span.set(6);
      host.offset.set(3);
      host.order.set(2);
      host.push.set(1);
      host.pull.set(4);
      fixture.detectChanges();
      expect(v(a, '--andes-col-span')).toBe('6');
      expect(v(a, '--andes-col-offset')).toBe('3');
      expect(v(a, '--andes-col-order')).toBe('2');
      expect(v(a, '--andes-col-push')).toBe('1');
      expect(v(a, '--andes-col-pull')).toBe('4');
    });

    it('keeps an order of 0', () => {
      const { fixture, host, a } = create();
      host.order.set(0);
      fixture.detectChanges();
      expect(v(a, '--andes-col-order')).toBe('0');
    });

    it('converts flex', () => {
      const { fixture, host, a } = create();
      host.flex.set(1);
      fixture.detectChanges();
      expect(v(a, '--andes-col-flex')).toBe('1 1 auto');
      host.flex.set('100px');
      fixture.detectChanges();
      expect(v(a, '--andes-col-flex')).toBe('0 0 100px');
    });

    it('takes a number as the span at a breakpoint', () => {
      const { fixture, host, a } = create();
      host.span.set(24);
      host.md.set(12);
      fixture.detectChanges();
      expect(v(a, '--andes-col-span')).toBe('24');
      expect(v(a, '--andes-col-span-md')).toBe('12');
    });

    it('takes an object at a breakpoint', () => {
      const { fixture, host, a } = create();
      host.lg.set({ span: 8, offset: 2, order: 1, flex: '1 1 0' });
      fixture.detectChanges();
      expect(v(a, '--andes-col-span-lg')).toBe('8');
      expect(v(a, '--andes-col-offset-lg')).toBe('2');
      expect(v(a, '--andes-col-order-lg')).toBe('1');
      expect(v(a, '--andes-col-flex-lg')).toBe('1 1 0');
    });

    it('hides the column where the span is 0', () => {
      const { fixture, host, a } = create();
      host.span.set(12);
      host.sm.set(0);
      fixture.detectChanges();
      expect(v(a, '--andes-col-display-sm')).toBe('none');
      expect(v(a, '--andes-col-display')).toBe('block');
    });
  });

  describe('breakpoint reporting', () => {
    it('exposes the viewport breakpoint and emits when it changes', () => {
      const viewport = stubViewport(1000);
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      const row = fixture.nativeElement.querySelector(
        'andes-row',
      ) as HTMLElement;
      expect(row.getAttribute('data-breakpoint')).toBe('lg');
      viewport.resize(700);
      fixture.detectChanges();
      expect(row.getAttribute('data-breakpoint')).toBe('sm');
      expect(fixture.componentInstance.changes).toEqual(['sm']);
    });
  });

  describe('container mode', () => {
    function createContainer() {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      stubViewport(1500);
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.source.set('container');
      fixture.componentInstance.gutter.set({ xs: 8, md: 24 });
      fixture.componentInstance.span.set(24);
      fixture.componentInstance.md.set(12);
      fixture.detectChanges();
      const q = (s: string) =>
        fixture.nativeElement.querySelector(s) as HTMLElement;
      return {
        fixture,
        host: fixture.componentInstance,
        row: q('andes-row'),
        a: q('#a'),
      };
    }

    it('observes the row and ignores the viewport', () => {
      const { row } = createContainer();
      const [observer] = FakeResizeObserver.instances;
      expect(observer.observed).toEqual([row]);
      expect(row.getAttribute('data-breakpoint')).toBe('xs');
    });

    it('resolves responsive props against the measured width, not the viewport', () => {
      const { fixture, host, row, a } = createContainer();
      const v = (el: HTMLElement, n: string) => el.style.getPropertyValue(n);
      const [observer] = FakeResizeObserver.instances;

      expect(v(row, '--andes-row-gx')).toBe('8px');
      expect(v(a, '--andes-col-span')).toBe('24');
      expect(v(a, '--andes-col-span-md')).toBe('');

      observer.resize(800);
      fixture.detectChanges();
      expect(row.getAttribute('data-breakpoint')).toBe('md');
      expect(v(row, '--andes-row-gx')).toBe('24px');
      expect(v(a, '--andes-col-span')).toBe('12');
      expect(host.changes).toEqual(['md']);

      observer.resize(300);
      fixture.detectChanges();
      expect(v(a, '--andes-col-span')).toBe('24');
      expect(host.changes).toEqual(['md', 'xs']);
    });

    it('disconnects when the mode changes back and when destroyed', () => {
      const { fixture, host } = createContainer();
      const [observer] = FakeResizeObserver.instances;
      host.source.set('viewport');
      fixture.detectChanges();
      expect(observer.disconnected).toBe(true);
      host.source.set('container');
      fixture.detectChanges();
      const second = FakeResizeObserver.instances[1];
      fixture.destroy();
      expect(second.disconnected).toBe(true);
    });

    it('works without ResizeObserver', () => {
      stubViewport(1500);
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.source.set('container');
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });

  describe('stylesheet contract', () => {
    const read = (file: string) =>
      readFileSync(
        join(process.cwd(), 'packages/ui/src/lib/grid', file),
        'utf8',
      );
    const flat = (css: string) =>
      css.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');

    it('rows are wrapping flex containers whose gutter is a gap, not a negative margin', () => {
      const css = flat(read('grid-row.css'));
      expect(css).toContain('flex-flow: row wrap;');
      expect(css).toContain('column-gap: var(--andes-grid-gutter-x, 0px)');
      expect(css).toContain('row-gap: var(--andes-grid-gutter-y, 0px)');
      expect(css).not.toMatch(/margin[^;]*-/);
    });

    it('the span formula accounts for the gutters', () => {
      const css = flat(read('grid-col.css'));
      expect(css).toContain(
        'calc((100% + var(--andes-grid-gutter-x, 0px)) * var(--_span) / 24 - var(--andes-grid-gutter-x, 0px))',
      );
    });

    it('offset, push and pull are logical so they flip in RTL', () => {
      const css = flat(read('grid-col.css'));
      expect(css).toContain('margin-inline-start: calc(');
      expect(css).toContain('inset-inline-start: calc(');
      expect(css).toContain('inset-inline-end: calc(');
      expect(css).not.toMatch(/margin-left|margin-right|[^-]left:|[^-]right:/);
    });

    it('defines a media query for every breakpoint above xs', () => {
      for (const file of ['grid-row.css', 'grid-col.css']) {
        const css = read(file);
        for (const width of [576, 768, 992, 1200, 1600]) {
          expect(css).toContain(`@media (min-width: ${width}px)`);
        }
      }
    });

    it('cascades each breakpoint down to the next smaller one and the plain value', () => {
      const css = flat(read('grid-col.css'));
      expect(css).toContain(
        '--_span: var(--andes-col-span-md, var(--andes-col-span-sm, var(--andes-col-span-xs, var(--andes-col-span))))',
      );
    });

    it('resets inputs so nested rows and columns do not inherit them', () => {
      expect(read('grid-col.css')).toContain('--andes-col-span: initial;');
      expect(read('grid-row.css')).toContain('--andes-row-gx-md: initial;');
    });

    it('never starts a line with a combinator', () => {
      for (const file of ['grid-row.css', 'grid-col.css']) {
        expect(
          read(file)
            .split('\n')
            .filter((l) => /^\s*[>+~]/.test(l)),
        ).toEqual([]);
      }
    });
  });
});
