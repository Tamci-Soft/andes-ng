import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesLayout } from './layout';
import { AndesLayoutContent } from './layout-content';
import { AndesLayoutFooter } from './layout-footer';
import { AndesLayoutHeader } from './layout-header';
import { AndesLayoutSider } from './layout-sider';
import { AndesLayoutBreakpoint, AndesLayoutPosition } from './layout-sizes';

class FakeMediaQuery {
  matches: boolean;
  private listeners = new Set<(event: MediaQueryListEvent) => void>();
  constructor(
    readonly query: string,
    matches: boolean,
  ) {
    this.matches = matches;
  }
  addEventListener(_: string, listener: (event: MediaQueryListEvent) => void) {
    this.listeners.add(listener);
  }
  removeEventListener(
    _: string,
    listener: (event: MediaQueryListEvent) => void,
  ) {
    this.listeners.delete(listener);
  }
  emit(matches: boolean) {
    this.matches = matches;
    this.listeners.forEach((listener) =>
      listener({ matches } as MediaQueryListEvent),
    );
  }
  get listenerCount() {
    return this.listeners.size;
  }
}

function stubWidth(initialWidth: number) {
  let width = initialWidth;
  const lists: FakeMediaQuery[] = [];
  vi.stubGlobal('matchMedia', (query: string) => {
    const max = Number(/max-width: ([\d.]+)px/.exec(query)?.[1] ?? 0);
    const list = new FakeMediaQuery(query, width <= max);
    lists.push(list);
    return list;
  });
  return {
    lists,
    resize(next: number) {
      width = next;
      for (const list of lists) {
        const max = Number(/max-width: ([\d.]+)px/.exec(list.query)?.[1] ?? 0);
        if (list.matches !== width <= max) {
          list.emit(width <= max);
        }
      }
    },
  };
}

@Component({
  imports: [
    AndesLayout,
    AndesLayoutHeader,
    AndesLayoutContent,
    AndesLayoutFooter,
    AndesLayoutSider,
  ],
  template: `
    <ng-template #custom><b class="custom-trigger">Menu</b></ng-template>
    <andes-layout id="outer" [hasSider]="forceSider()">
      @if (withSider()) {
        <andes-layout-sider
          [(collapsed)]="collapsed"
          [collapsible]="collapsible()"
          [width]="width()"
          [collapsedWidth]="collapsedWidth()"
          [breakpoint]="breakpoint()"
          [reverseArrow]="reverseArrow()"
          [theme]="theme()"
          [side]="side()"
          [position]="siderPosition()"
          [trigger]="
            trigger() === 'custom'
              ? custom
              : trigger() === 'none'
                ? null
                : undefined
          "
          (breakpointChange)="breaks.push($event)"
          ><nav id="siderBody">Menu</nav></andes-layout-sider
        >
      }
      <andes-layout id="inner">
        <andes-layout-header [position]="headerPosition()"
          >Head</andes-layout-header
        >
        <andes-layout-content>Body</andes-layout-content>
        <andes-layout-footer [position]="footerPosition()"
          >Foot</andes-layout-footer
        >
      </andes-layout>
    </andes-layout>
  `,
})
class Host {
  readonly withSider = signal(true);
  readonly forceSider = signal(false);
  readonly collapsed = signal(false);
  readonly collapsible = signal(true);
  readonly width = signal<number | string>(240);
  readonly collapsedWidth = signal<number | string>(64);
  readonly breakpoint = signal<AndesLayoutBreakpoint | undefined>(undefined);
  readonly reverseArrow = signal(false);
  readonly theme = signal<'light' | 'dark'>('light');
  readonly side = signal<'start' | 'end'>('start');
  readonly siderPosition = signal<AndesLayoutPosition>('static');
  readonly trigger = signal<'default' | 'custom' | 'none'>('default');
  readonly headerPosition = signal<AndesLayoutPosition>('static');
  readonly footerPosition = signal<AndesLayoutPosition>('static');
  readonly breaks: boolean[] = [];
}

afterEach(() => vi.unstubAllGlobals());

describe('classic layout', () => {
  function create() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const q = (selector: string) =>
      fixture.nativeElement.querySelector(selector) as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      q,
      sider: () => q('andes-layout-sider'),
      toggle: () => q('[data-slot="layout-sider-trigger"]'),
    };
  }

  describe('AndesLayout', () => {
    it('is a column by default and a row once it holds a sider', () => {
      const { fixture, host, q } = create();
      expect(q('#outer').hasAttribute('data-has-sider')).toBe(true);
      expect(q('#inner').hasAttribute('data-has-sider')).toBe(false);
      host.withSider.set(false);
      fixture.detectChanges();
      expect(q('#outer').hasAttribute('data-has-sider')).toBe(false);
    });

    it('can be forced into a row', () => {
      const { fixture, host, q } = create();
      host.withSider.set(false);
      host.forceSider.set(true);
      fixture.detectChanges();
      expect(q('#outer').hasAttribute('data-has-sider')).toBe(true);
    });

    it('marks its parts', () => {
      const { q } = create();
      expect(q('andes-layout-header').getAttribute('data-slot')).toBe(
        'layout-header',
      );
      expect(q('andes-layout-content').getAttribute('data-slot')).toBe(
        'layout-content',
      );
      expect(q('andes-layout-footer').getAttribute('data-slot')).toBe(
        'layout-footer',
      );
    });
  });

  describe('header and footer', () => {
    it('are static unless told otherwise', () => {
      const { q } = create();
      expect(q('andes-layout-header').getAttribute('data-position')).toBe(
        'static',
      );
      expect(q('andes-layout-footer').getAttribute('data-position')).toBe(
        'static',
      );
    });

    it('take sticky and fixed positions', () => {
      const { fixture, host, q } = create();
      host.headerPosition.set('sticky');
      host.footerPosition.set('fixed');
      fixture.detectChanges();
      expect(q('andes-layout-header').getAttribute('data-position')).toBe(
        'sticky',
      );
      expect(q('andes-layout-footer').getAttribute('data-position')).toBe(
        'fixed',
      );
    });

    it('wrap their content in a bar', () => {
      const { q } = create();
      expect(q('andes-layout-header .bar').textContent).toBe('Head');
    });
  });

  describe('AndesLayoutSider', () => {
    it('is a labelled region sized by width', () => {
      const { sider, q } = create();
      expect(
        sider().style.getPropertyValue('--andes-layout-sider-current-width'),
      ).toBe('240px');
      expect(q('aside').getAttribute('aria-label')).toBe('Sidebar');
      expect(q('#siderBody')).not.toBeNull();
      expect(sider().hasAttribute('data-collapsed')).toBe(false);
    });

    it('accepts CSS lengths for both widths', () => {
      const { fixture, host, sider } = create();
      host.width.set('20rem');
      host.collapsedWidth.set('3rem');
      fixture.detectChanges();
      const read = () =>
        sider().style.getPropertyValue('--andes-layout-sider-current-width');
      expect(read()).toBe('20rem');
      host.collapsed.set(true);
      fixture.detectChanges();
      expect(read()).toBe('3rem');
    });

    it('has no toggle unless collapsible', () => {
      const { fixture, host, toggle } = create();
      expect(toggle()).not.toBeNull();
      host.collapsible.set(false);
      fixture.detectChanges();
      expect(toggle()).toBeNull();
    });

    it('collapses and expands from the toggle, with accurate ARIA', () => {
      const { fixture, host, sider, toggle } = create();
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(toggle().getAttribute('aria-label')).toBe('Collapse sidebar');
      expect(toggle().getAttribute('aria-controls')).toBe(
        sider().querySelector('aside')?.id,
      );

      toggle().click();
      fixture.detectChanges();
      expect(host.collapsed()).toBe(true);
      expect(sider().hasAttribute('data-collapsed')).toBe(true);
      expect(
        sider().style.getPropertyValue('--andes-layout-sider-current-width'),
      ).toBe('64px');
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(toggle().getAttribute('aria-label')).toBe('Expand sidebar');

      toggle().click();
      fixture.detectChanges();
      expect(host.collapsed()).toBe(false);
    });

    it('is a real button reachable by keyboard', () => {
      const { toggle } = create();
      expect(toggle().tagName).toBe('BUTTON');
      expect(toggle().getAttribute('type')).toBe('button');
    });

    it('follows the two-way model from outside', () => {
      const { fixture, host, sider } = create();
      host.collapsed.set(true);
      fixture.detectChanges();
      expect(sider().hasAttribute('data-collapsed')).toBe(true);
    });

    it('points the arrow toward its edge, and flips it for reverseArrow', () => {
      const { fixture, host, q } = create();
      const pointing = () => q('.trigger .arrow').getAttribute('data-pointing');
      expect(pointing()).toBe('start');
      host.collapsed.set(true);
      fixture.detectChanges();
      expect(pointing()).toBe('end');
      host.reverseArrow.set(true);
      fixture.detectChanges();
      expect(pointing()).toBe('start');
    });

    it('renders a custom trigger template, and none for null', () => {
      const { fixture, host, q, toggle } = create();
      host.trigger.set('custom');
      fixture.detectChanges();
      expect(q('.custom-trigger')).not.toBeNull();
      expect(q('.trigger .arrow')).toBeNull();
      toggle().click();
      fixture.detectChanges();
      expect(host.collapsed()).toBe(true);

      host.trigger.set('none');
      fixture.detectChanges();
      expect(toggle()).toBeNull();
    });

    it('carries theme, side and position as attributes', () => {
      const { fixture, host, sider } = create();
      host.theme.set('dark');
      host.side.set('end');
      host.siderPosition.set('sticky');
      fixture.detectChanges();
      expect(sider().getAttribute('data-theme')).toBe('dark');
      expect(sider().getAttribute('data-side')).toBe('end');
      expect(sider().getAttribute('data-position')).toBe('sticky');
    });

    describe('collapsed width of 0', () => {
      it('swaps the bottom toggle for an edge tab once collapsed', () => {
        const { fixture, host, q, sider } = create();
        host.collapsedWidth.set(0);
        fixture.detectChanges();
        expect(q('.trigger')).not.toBeNull();
        expect(q('.zero-trigger')).toBeNull();

        q('.trigger').click();
        fixture.detectChanges();
        expect(host.collapsed()).toBe(true);
        expect(q('.trigger')).toBeNull();
        expect(sider().hasAttribute('data-zero')).toBe(true);
        const tab = q('.zero-trigger');
        expect(tab).not.toBeNull();
        expect(tab.getAttribute('aria-label')).toBe('Expand sidebar');
        expect(tab.getAttribute('aria-expanded')).toBe('false');

        tab.click();
        fixture.detectChanges();
        expect(host.collapsed()).toBe(false);
        expect(sider().hasAttribute('data-zero')).toBe(false);
        expect(q('.zero-trigger')).toBeNull();
      });
    });

    describe('breakpoint', () => {
      it('collapses below the breakpoint, reports it and expands again', () => {
        const viewport = stubWidth(500);
        const fixture = TestBed.createComponent(Host);
        fixture.componentInstance.breakpoint.set('md');
        fixture.detectChanges();
        const host = fixture.componentInstance;
        const sider = fixture.nativeElement.querySelector(
          'andes-layout-sider',
        ) as HTMLElement;

        expect(host.collapsed()).toBe(true);
        expect(sider.hasAttribute('data-broken')).toBe(true);
        expect(host.breaks).toEqual([true]);

        viewport.resize(1000);
        fixture.detectChanges();
        expect(host.collapsed()).toBe(false);
        expect(sider.hasAttribute('data-broken')).toBe(false);
        expect(host.breaks).toEqual([true, false]);
      });

      it('does nothing while the viewport is wide, and still lets the user toggle', () => {
        stubWidth(1400);
        const fixture = TestBed.createComponent(Host);
        fixture.componentInstance.breakpoint.set('lg');
        fixture.detectChanges();
        expect(fixture.componentInstance.collapsed()).toBe(false);
        expect(fixture.componentInstance.breaks).toEqual([]);
        (
          fixture.nativeElement.querySelector(
            '[data-slot="layout-sider-trigger"]',
          ) as HTMLElement
        ).click();
        fixture.detectChanges();
        expect(fixture.componentInstance.collapsed()).toBe(true);
      });

      it('uses a max-width query one hair below the breakpoint', () => {
        const viewport = stubWidth(1400);
        const fixture = TestBed.createComponent(Host);
        fixture.componentInstance.breakpoint.set('lg');
        fixture.detectChanges();
        expect(viewport.lists.map((l) => l.query)).toContain(
          '(max-width: 991.98px)',
        );
      });

      it('stops listening when the breakpoint is removed', () => {
        const viewport = stubWidth(500);
        const fixture = TestBed.createComponent(Host);
        fixture.componentInstance.breakpoint.set('md');
        fixture.detectChanges();
        const list = viewport.lists[0];
        expect(list.listenerCount).toBe(1);
        fixture.componentInstance.breakpoint.set(undefined);
        fixture.detectChanges();
        expect(list.listenerCount).toBe(0);
      });
    });
  });

  describe('stylesheet contract', () => {
    const read = (file: string) =>
      readFileSync(
        join(process.cwd(), 'packages/ui/src/lib/layout', file),
        'utf8',
      );
    const flat = (css: string) =>
      css.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');

    it('animates the sider width for 200ms with the shared easing', () => {
      const css = flat(read('layout-sider.css'));
      expect(css).toContain(
        'transition: width var(--andes-motion-duration-slow, 200ms) var(--andes-motion-ease-out, cubic-bezier(0.2, 0, 0, 1))',
      );
    });

    it('turns the transition off for reduced motion', () => {
      const css = flat(read('layout-sider.css'));
      expect(css).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{[^@]*transition: none/,
      );
    });

    it('uses logical properties only, so RTL needs nothing extra', () => {
      for (const file of [
        'layout-sider.css',
        'layout-header.css',
        'layout-footer.css',
      ]) {
        expect(read(file)).not.toMatch(
          /margin-left|margin-right|padding-left|padding-right|border-left|border-right|[^-]left:|[^-]right:/,
        );
      }
    });

    it('keeps a hidden sider out of the tab order', () => {
      expect(flat(read('layout-sider.css'))).toMatch(
        /\[data-zero\]\) \.panel \{ visibility: hidden/,
      );
    });

    it('never starts a line with a combinator', () => {
      for (const file of [
        'layout.css',
        'layout-sider.css',
        'layout-header.css',
        'layout-footer.css',
        'layout-content.css',
      ]) {
        expect(
          read(file)
            .split('\n')
            .filter((l) => /^\s*[>+~]/.test(l)),
        ).toEqual([]);
      }
    });
  });
});
