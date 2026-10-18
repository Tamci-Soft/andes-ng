import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ANDES_BREAKPOINT_NAMES,
  ANDES_BREAKPOINT_SSR_DEFAULT,
  ANDES_BREAKPOINTS,
  AndesBreakpoint,
  AndesBreakpoints,
  andesBreakpointForWidth,
} from './breakpoints';
import { MockMatchMedia } from './viewport-mocks';

/** A nav that collapses below `lg`, the shape the layout and navigation components will use. */
@Component({
  selector: 'andes-test-nav',
  template: `{{ compact() ? 'compact' : 'full' }}`,
})
class NavHost {
  readonly breakpoints = TestBed.inject(AndesBreakpoints);
  readonly compact = this.breakpoints.down('lg');
}

describe('breakpoint constants', () => {
  it('keep the established names and pixel values', () => {
    expect(ANDES_BREAKPOINT_NAMES).toEqual([
      'xs',
      'sm',
      'md',
      'lg',
      'xl',
      'xxl',
    ]);
    expect(ANDES_BREAKPOINTS).toEqual({
      xs: 0,
      sm: 576,
      md: 768,
      lg: 992,
      xl: 1200,
      xxl: 1600,
    });
  });

  it('andesBreakpointForWidth picks the largest breakpoint that fits', () => {
    expect(andesBreakpointForWidth(0)).toBe('xs');
    expect(andesBreakpointForWidth(575.9)).toBe('xs');
    expect(andesBreakpointForWidth(576)).toBe('sm');
    expect(andesBreakpointForWidth(991)).toBe('md');
    expect(andesBreakpointForWidth(1600)).toBe('xxl');
    expect(andesBreakpointForWidth(5000)).toBe('xxl');
  });

  it('andesBreakpointForWidth treats negative and NaN widths as xs', () => {
    expect(andesBreakpointForWidth(-10)).toBe('xs');
    expect(andesBreakpointForWidth(Number.NaN)).toBe('xs');
  });
});

describe('AndesBreakpoints', () => {
  const restores: (() => void)[] = [];
  let media: MockMatchMedia;

  beforeEach(() => {
    media = new MockMatchMedia(1000);
    restores.push(media.install());
  });

  afterEach(() => {
    restores.splice(0).forEach((restore) => restore());
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  function service(): AndesBreakpoints {
    return TestBed.inject(AndesBreakpoints);
  }

  describe('active', () => {
    it('reads the viewport synchronously', () => {
      media.setWidth(800);

      expect(service().active()).toBe('md');
    });

    it.each<[number, AndesBreakpoint]>([
      [0, 'xs'],
      [575, 'xs'],
      [576, 'sm'],
      [768, 'md'],
      [992, 'lg'],
      [1200, 'xl'],
      [1600, 'xxl'],
    ])('is %s px wide -> %s', (width, expected) => {
      media.setWidth(width);

      expect(service().active()).toBe(expected);
    });

    it('follows the viewport as it is resized', () => {
      const breakpoints = service();

      media.setWidth(1300);
      expect(breakpoints.active()).toBe('xl');
      media.setWidth(500);
      expect(breakpoints.active()).toBe('xs');
    });

    it('uses one listener per breakpoint and no resize listener', () => {
      const add = vi.spyOn(window, 'addEventListener');
      service();

      expect(media.listenerCount).toBe(5);
      expect(add).not.toHaveBeenCalledWith('resize', expect.anything());
    });

    it('removes every listener when the injector is destroyed', () => {
      service();

      TestBed.resetTestingModule();

      expect(media.listenerCount).toBe(0);
    });

    it('is read-only', () => {
      expect(
        (service().active as unknown as { set?: unknown }).set,
      ).toBeUndefined();
    });
  });

  describe('up', () => {
    it('is true from the start of the breakpoint', () => {
      const breakpoints = service();
      const mdUp = breakpoints.up('md');

      media.setWidth(767);
      expect(mdUp()).toBe(false);
      media.setWidth(768);
      expect(mdUp()).toBe(true);
      media.setWidth(5000);
      expect(mdUp()).toBe(true);
    });

    it('is always true for xs', () => {
      media.setWidth(0);

      expect(service().up('xs')()).toBe(true);
    });

    it('returns the same signal for the same name', () => {
      const breakpoints = service();

      expect(breakpoints.up('lg')).toBe(breakpoints.up('lg'));
      expect(breakpoints.up('lg')).not.toBe(breakpoints.up('xl'));
    });
  });

  describe('down', () => {
    it('is true strictly before the start of the breakpoint', () => {
      const breakpoints = service();
      const belowLg = breakpoints.down('lg');

      media.setWidth(991);
      expect(belowLg()).toBe(true);
      media.setWidth(992);
      expect(belowLg()).toBe(false);
    });

    it('is the complement of up for every breakpoint and width', () => {
      const breakpoints = service();
      for (const width of [
        0, 575, 576, 767, 768, 991, 992, 1199, 1200, 1599, 1600,
      ]) {
        media.setWidth(width);
        for (const name of ANDES_BREAKPOINT_NAMES) {
          expect(breakpoints.down(name)()).toBe(!breakpoints.up(name)());
        }
      }
    });

    it('is never true for xs', () => {
      media.setWidth(0);

      expect(service().down('xs')()).toBe(false);
    });
  });

  describe('between', () => {
    it('includes the lower breakpoint and excludes the upper', () => {
      const breakpoints = service();
      const range = breakpoints.between('sm', 'lg');

      media.setWidth(575);
      expect(range()).toBe(false);
      media.setWidth(576);
      expect(range()).toBe(true);
      media.setWidth(991);
      expect(range()).toBe(true);
      media.setWidth(992);
      expect(range()).toBe(false);
    });

    it('chained ranges cover every width exactly once', () => {
      const breakpoints = service();
      const ranges = ANDES_BREAKPOINT_NAMES.slice(0, -1).map((name, i) =>
        breakpoints.between(name, ANDES_BREAKPOINT_NAMES[i + 1]),
      );
      const last = breakpoints.up('xxl');

      for (const width of [
        0, 300, 576, 700, 768, 900, 992, 1100, 1200, 1500, 1600, 2400,
      ]) {
        media.setWidth(width);
        const hits = [...ranges, last].filter((range) => range()).length;
        expect(hits).toBe(1);
      }
    });

    it('is never true for an empty or reversed range', () => {
      const breakpoints = service();
      const same = breakpoints.between('md', 'md');
      const reversed = breakpoints.between('xl', 'sm');

      for (const width of [0, 800, 1300, 2000]) {
        media.setWidth(width);
        expect(same()).toBe(false);
        expect(reversed()).toBe(false);
      }
    });
  });

  it('rejects an unknown breakpoint name', () => {
    const breakpoints = service();
    const unknown = 'huge' as AndesBreakpoint;

    expect(() => breakpoints.up(unknown)).toThrow(/Unknown Andes breakpoint/);
    expect(() => breakpoints.down(unknown)).toThrow();
    expect(() => breakpoints.between('sm', unknown)).toThrow();
  });

  it('drives a harness component and cleans up with it', () => {
    media.setWidth(1300);
    const fixture = TestBed.createComponent(NavHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('full');

    media.setWidth(800);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('compact');
  });

  describe('where the viewport cannot be measured', () => {
    it('holds the default (lg) on the server and registers nothing', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });

      const breakpoints = service();

      expect(breakpoints.active()).toBe('lg');
      expect(breakpoints.up('lg')()).toBe(true);
      expect(media.calls).toBe(0);
    });

    it('honours an overridden server default', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: ANDES_BREAKPOINT_SSR_DEFAULT, useValue: 'xs' },
        ],
      });

      expect(service().active()).toBe('xs');
    });

    it('holds the default where matchMedia does not exist', () => {
      restores.splice(0).forEach((restore) => restore());

      expect(service().active()).toBe('lg');
    });

    it('holds the default where there is no window', () => {
      vi.stubGlobal('window', undefined);
      try {
        expect(service().active()).toBe('lg');
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});
