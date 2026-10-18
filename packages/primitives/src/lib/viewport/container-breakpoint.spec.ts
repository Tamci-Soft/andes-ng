import {
  Component,
  ElementRef,
  effect,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ANDES_BREAKPOINTS, AndesBreakpoint } from './breakpoints';
import { andesContainerBreakpoint } from './container-breakpoint';
import { MockAnimationFrames, MockResizeObserver } from './viewport-mocks';

/** A pagination bar that drops to a compact layout when its own box is narrow. */
@Component({
  selector: 'andes-test-pager',
  template: ` <nav #bar [attr.data-layout]="layout()">pages</nav> `,
})
class PagerHost {
  readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  readonly layout = andesContainerBreakpoint(
    this.bar,
    { compact: 0, full: 480 },
    { initial: 'full' },
  );
}

@Component({
  selector: 'andes-test-grid',
  template: `<div #row></div>`,
})
class GridHost {
  readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
  readonly thresholds = signal<Record<'narrow' | 'wide', number>>({
    narrow: 0,
    wide: 600,
  });
  readonly bucket = andesContainerBreakpoint(this.row, this.thresholds);
}

@Component({
  selector: 'andes-test-viewport-names',
  template: `<div #row></div>`,
})
class NamedHost {
  readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
  readonly breakpoint = andesContainerBreakpoint(this.row, ANDES_BREAKPOINTS);
}

describe('andesContainerBreakpoint', () => {
  const restores: (() => void)[] = [];
  let frames: MockAnimationFrames;

  beforeEach(() => {
    frames = new MockAnimationFrames();
    restores.push(MockResizeObserver.install(), frames.install());
  });

  afterEach(() => {
    restores.splice(0).forEach((restore) => restore());
    TestBed.resetTestingModule();
  });

  function observer(): MockResizeObserver {
    const live = MockResizeObserver.live.at(-1);
    if (!live) {
      throw new Error('no live ResizeObserver');
    }
    return live;
  }

  function resize(el: Element, width: number): void {
    observer().notify(el, { width, height: 10 });
  }

  describe('in a pagination-style harness', () => {
    function create() {
      const fixture = TestBed.createComponent(PagerHost);
      fixture.detectChanges();
      const bar = fixture.nativeElement.querySelector('nav') as HTMLElement;
      return { fixture, bar };
    }

    it('reports the initial bucket until the element is measured', () => {
      const { fixture } = create();

      expect(fixture.componentInstance.layout()).toBe('full');
    });

    it('switches bucket when the element crosses a threshold', () => {
      const { fixture, bar } = create();

      resize(bar, 300);
      fixture.detectChanges();
      expect(bar.getAttribute('data-layout')).toBe('compact');

      resize(bar, 480);
      frames.flush();
      fixture.detectChanges();
      expect(bar.getAttribute('data-layout')).toBe('full');
    });

    it('does not notify dependents while resizing inside a bucket', () => {
      const { fixture, bar } = create();
      resize(bar, 500);
      const seen: string[] = [];
      TestBed.runInInjectionContext(() =>
        effect(() => seen.push(fixture.componentInstance.layout())),
      );
      TestBed.tick();
      seen.length = 0;

      for (let width = 501; width < 700; width += 20) {
        resize(bar, width);
        frames.flush();
      }
      TestBed.tick();

      expect(seen).toEqual([]);
    });

    it('follows the element when it is swapped for another', () => {
      const el = signal<HTMLElement | undefined>(undefined);
      const bucket = TestBed.runInInjectionContext(() =>
        andesContainerBreakpoint(el, { s: 0, l: 400 }),
      );
      const first = document.createElement('div');
      const second = document.createElement('div');

      el.set(first);
      TestBed.tick();
      resize(first, 500);
      expect(bucket()).toBe('l');

      el.set(second);
      TestBed.tick();
      expect(bucket()).toBe('s');
      resize(second, 100);
      expect(bucket()).toBe('s');
      expect(observer().observed.has(first)).toBe(false);
    });

    it('stops observing when the component is destroyed', () => {
      const { fixture, bar } = create();
      resize(bar, 100);

      fixture.destroy();

      expect(MockResizeObserver.live).toHaveLength(0);
    });
  });

  it('defaults the unmeasured bucket to the smallest one', () => {
    const fixture = TestBed.createComponent(GridHost);
    fixture.detectChanges();

    expect(fixture.componentInstance.bucket()).toBe('narrow');
  });

  it('re-evaluates when a signal of thresholds changes', () => {
    const fixture = TestBed.createComponent(GridHost);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('div') as HTMLElement;
    resize(row, 500);
    expect(fixture.componentInstance.bucket()).toBe('narrow');

    fixture.componentInstance.thresholds.set({ narrow: 0, wide: 400 });

    expect(fixture.componentInstance.bucket()).toBe('wide');
  });

  it('works with the viewport breakpoint table', () => {
    const fixture = TestBed.createComponent(NamedHost);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('div') as HTMLElement;
    const names: AndesBreakpoint[] = [];
    for (const width of [100, 576, 800, 1000, 1250, 1700]) {
      resize(row, width);
      frames.flush();
      names.push(fixture.componentInstance.breakpoint());
    }

    expect(names).toEqual(['xs', 'sm', 'md', 'lg', 'xl', 'xxl']);
  });

  it('uses the smallest bucket for widths below every threshold', () => {
    const fixture = TestBed.createComponent(GridHost);
    fixture.detectChanges();
    fixture.componentInstance.thresholds.set({ narrow: 200, wide: 600 });
    const row = fixture.nativeElement.querySelector('div') as HTMLElement;

    resize(row, 50);

    expect(fixture.componentInstance.bucket()).toBe('narrow');
  });

  it('throws on an empty bucket map', () => {
    const el = document.createElement('div');
    const bucket = TestBed.runInInjectionContext(() =>
      andesContainerBreakpoint(el, {} as Record<string, number>),
    );
    TestBed.tick();

    expect(() => bucket()).toThrow(/at least one bucket/);
  });

  it('passes the box option through to the observation', () => {
    const el = document.createElement('div');
    TestBed.runInInjectionContext(() =>
      andesContainerBreakpoint(el, { s: 0, l: 100 }, { box: 'border-box' }),
    );
    TestBed.tick();

    expect(observer().observed.get(el)).toEqual({ box: 'border-box' });
  });

  it('requires an injection context unless an injector is given', () => {
    expect(() =>
      andesContainerBreakpoint(document.createElement('div'), { a: 0 }),
    ).toThrow();
  });

  it('reports the initial bucket on the server and never observes', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });

    const fixture = TestBed.createComponent(PagerHost);
    fixture.detectChanges();

    expect(fixture.componentInstance.layout()).toBe('full');
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it('reports the initial bucket where ResizeObserver does not exist', () => {
    restores.splice(0).forEach((restore) => restore());
    restores.push(frames.install());

    const fixture = TestBed.createComponent(PagerHost);
    fixture.detectChanges();

    expect(fixture.componentInstance.layout()).toBe('full');
  });
});
