import {
  Component,
  computed,
  Injector,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  andesMediaQuery,
  andesPrefersContrast,
  andesPrefersDark,
  andesPrefersReducedMotion,
} from './media-query';
import { MockMatchMedia } from './viewport-mocks';

const REDUCED = '(prefers-reduced-motion: reduce)';

/** An animation wrapper that skips motion for users who asked for less of it. */
@Component({
  selector: 'andes-test-motion',
  template: `<span [attr.data-animated]="reduced() ? null : ''">x</span>`,
})
class MotionHost {
  readonly reduced = andesPrefersReducedMotion();
}

/** A sider that collapses below a breakpoint taken from an input. */
@Component({
  selector: 'andes-test-sider',
  template: `{{ collapsed() ? 'collapsed' : 'open' }}`,
})
class SiderHost {
  readonly breakpoint = signal(768);
  readonly collapsed = andesMediaQuery(
    computed(() => `(max-width: ${this.breakpoint() - 0.02}px)`),
  );
}

describe('andesMediaQuery', () => {
  const restores: (() => void)[] = [];
  let media: MockMatchMedia;

  beforeEach(() => {
    media = new MockMatchMedia(1000);
    restores.push(media.install());
  });

  afterEach(() => {
    restores.splice(0).forEach((restore) => restore());
    TestBed.resetTestingModule();
  });

  function inContext<T>(fn: () => T): T {
    return TestBed.runInInjectionContext(fn);
  }

  it('reads the current answer synchronously', () => {
    media.setMatches('(min-width: 500px)', true);

    const matches = inContext(() => andesMediaQuery('(min-width: 500px)'));

    expect(matches()).toBe(true);
  });

  it('stays in sync with the query', () => {
    const matches = inContext(() => andesMediaQuery('(max-width: 800px)'));
    TestBed.tick();
    expect(matches()).toBe(false);

    media.setWidth(700);
    expect(matches()).toBe(true);

    media.setWidth(900);
    expect(matches()).toBe(false);
  });

  it('removes its listener when the injector is destroyed', () => {
    inContext(() => andesMediaQuery('(max-width: 800px)'));
    TestBed.tick();
    expect(media.listenerCount).toBe(1);

    TestBed.resetTestingModule();

    expect(media.listenerCount).toBe(0);
  });

  it('never has more than one listener per signal', () => {
    inContext(() => andesMediaQuery('(max-width: 800px)'));
    TestBed.tick();
    media.setWidth(700);
    media.setWidth(900);
    TestBed.tick();

    expect(media.listenerCount).toBe(1);
  });

  describe('with a signal query', () => {
    it('re-evaluates and moves the listener when the query changes', () => {
      const query = signal('(max-width: 800px)');
      const matches = inContext(() => andesMediaQuery(query));
      TestBed.tick();
      expect(matches()).toBe(false);

      media.setWidth(700);
      expect(matches()).toBe(true);

      query.set('(max-width: 600px)');
      TestBed.tick();
      expect(matches()).toBe(false);
      expect(media.listenerCount).toBe(1);
    });

    it('drives a harness component from an input-derived query', () => {
      const fixture = TestBed.createComponent(SiderHost);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('open');

      media.setWidth(500);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('collapsed');

      fixture.componentInstance.breakpoint.set(400);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('open');

      fixture.destroy();
      expect(media.listenerCount).toBe(0);
    });
  });

  describe('injection context', () => {
    it('requires one unless an injector is given', () => {
      expect(() => andesMediaQuery('(min-width: 1px)')).toThrow();
    });

    it('works outside a context with an explicit injector', () => {
      const matches = andesMediaQuery('(min-width: 500px)', {
        injector: TestBed.inject(Injector),
      });

      expect(matches()).toBe(true);
    });
  });

  describe('where the query cannot be evaluated', () => {
    it('holds the ssrDefault on the server without touching matchMedia', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });

      const off = inContext(() => andesMediaQuery('(min-width: 1px)'));
      const on = inContext(() =>
        andesMediaQuery('(min-width: 1px)', { ssrDefault: true }),
      );
      TestBed.tick();

      expect(off()).toBe(false);
      expect(on()).toBe(true);
      expect(media.calls).toBe(0);
    });

    it('holds the ssrDefault where matchMedia does not exist', () => {
      restores.splice(0).forEach((restore) => restore());

      const matches = inContext(() =>
        andesMediaQuery('(min-width: 1px)', { ssrDefault: true }),
      );
      TestBed.tick();

      expect(matches()).toBe(true);
    });

    it('holds the ssrDefault where there is no window at all', () => {
      vi.stubGlobal('window', undefined);
      try {
        const matches = inContext(() =>
          andesMediaQuery('(min-width: 1px)', { ssrDefault: true }),
        );
        expect(matches()).toBe(true);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('preference helpers', () => {
    it('andesPrefersReducedMotion follows the reduced-motion query', () => {
      const reduced = inContext(() => andesPrefersReducedMotion());
      TestBed.tick();
      expect(reduced()).toBe(false);

      media.setMatches(REDUCED, true);
      expect(reduced()).toBe(true);
    });

    it('andesPrefersDark follows the color-scheme query', () => {
      const dark = inContext(() => andesPrefersDark());
      TestBed.tick();
      media.setMatches('(prefers-color-scheme: dark)', true);

      expect(dark()).toBe(true);
    });

    it('andesPrefersContrast follows the contrast query', () => {
      const more = inContext(() => andesPrefersContrast());
      TestBed.tick();
      media.setMatches('(prefers-contrast: more)', true);

      expect(more()).toBe(true);
    });

    it('pass options through to the underlying query', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });

      const reduced = inContext(() =>
        andesPrefersReducedMotion({ ssrDefault: true }),
      );

      expect(reduced()).toBe(true);
    });

    it('lets a harness component switch animation off', () => {
      media.setMatches(REDUCED, true);
      const fixture = TestBed.createComponent(MotionHost);
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector('span') as HTMLElement;
      expect(span.hasAttribute('data-animated')).toBe(false);

      media.setMatches(REDUCED, false);
      fixture.detectChanges();
      expect(span.hasAttribute('data-animated')).toBe(true);

      fixture.destroy();
      expect(media.listenerCount).toBe(0);
    });
  });
});
