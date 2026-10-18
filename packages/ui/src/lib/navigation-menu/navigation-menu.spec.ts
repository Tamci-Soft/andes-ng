import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesNavigationMenu } from './navigation-menu';
import { AndesNavigationMenuContent } from './navigation-menu-content';
import { AndesNavigationMenuItem } from './navigation-menu-item';
import {
  AndesNavigationMenuLink,
  AndesNavigationMenuLinkDescription,
  AndesNavigationMenuLinkTitle,
} from './navigation-menu-link';
import { AndesNavigationMenuTrigger } from './navigation-menu-trigger';

/** jsdom has no layout; the overlay's positioning needs a non-zero box to attach. */
function withElementGeometry() {
  const props = ['offsetWidth', 'offsetHeight'] as const;
  const saved = props.map(
    (prop) =>
      [
        prop,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop),
      ] as const,
  );
  beforeAll(() => {
    for (const prop of props) {
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get: () => 1,
      });
    }
  });
  afterAll(() => {
    for (const [prop, descriptor] of saved) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, prop, descriptor);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
          prop
        ];
      }
    }
  });
}

function pressKey(target: Element, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function pointer(target: Element, type: string, pointerType = 'mouse') {
  target.dispatchEvent(new PointerEvent(type, { pointerType, bubbles: false }));
}

@Component({
  imports: [
    AndesNavigationMenu,
    AndesNavigationMenuItem,
    AndesNavigationMenuTrigger,
    AndesNavigationMenuContent,
    AndesNavigationMenuLink,
    AndesNavigationMenuLinkTitle,
    AndesNavigationMenuLinkDescription,
  ],
  template: `
    <andes-navigation-menu
      ariaLabel="Main"
      [align]="align()"
      [indicator]="indicator()"
      [delayDuration]="150"
      [closeDelay]="150"
      [(value)]="value"
    >
      <andes-navigation-menu-item value="products">
        <button type="button" id="products" andesNavigationMenuTrigger>
          Products
        </button>
        <andes-navigation-menu-content [columns]="2">
          <a id="orders" andesNavigationMenuLink href="#orders" [active]="true">
            <span andesNavigationMenuLinkTitle>Orders</span>
            <span andesNavigationMenuLinkDescription>Track orders.</span>
          </a>
          <a id="invoices" andesNavigationMenuLink href="#invoices">
            <span andesNavigationMenuLinkTitle>Invoices</span>
          </a>
          <a id="stock" andesNavigationMenuLink href="#stock">Stock</a>
        </andes-navigation-menu-content>
      </andes-navigation-menu-item>
      <andes-navigation-menu-item value="docs">
        <button type="button" id="docs" andesNavigationMenuTrigger>Docs</button>
        <andes-navigation-menu-content width="20rem">
          <a id="intro" andesNavigationMenuLink href="#intro">Intro</a>
          <a id="guides" andesNavigationMenuLink href="#guides">Guides</a>
        </andes-navigation-menu-content>
      </andes-navigation-menu-item>
      <andes-navigation-menu-item>
        <a
          id="pricing"
          andesNavigationMenuLink
          href="#pricing"
          [active]="pricingActive()"
        >
          Pricing
        </a>
      </andes-navigation-menu-item>
      <andes-navigation-menu-item value="soon" [disabled]="true">
        <button type="button" id="soon" andesNavigationMenuTrigger>Soon</button>
        <andes-navigation-menu-content>
          <a andesNavigationMenuLink href="#soon">Later</a>
        </andes-navigation-menu-content>
      </andes-navigation-menu-item>
    </andes-navigation-menu>
    <button type="button" id="outside">outside</button>
  `,
})
class HostComponent {
  readonly value = signal<string | null>(null);
  readonly align = signal<'start' | 'center' | 'end'>('start');
  readonly indicator = signal(true);
  readonly pricingActive = signal(false);
}

describe('AndesNavigationMenu', () => {
  withElementGeometry();

  afterEach(() => {
    vi.useRealTimers();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  function settle(fixture: ComponentFixture<unknown>) {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
    }
  }

  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const byId = (id: string) =>
      (root.querySelector(`#${id}`) ??
        document.querySelector(`.cdk-overlay-container #${id}`)) as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      byId,
      nav: root.querySelector('andes-navigation-menu') as HTMLElement,
      viewport: () =>
        document.querySelector(
          '.andes-nav-menu__viewport',
        ) as HTMLElement | null,
      settle: () => settle(fixture),
    };
  }

  describe('semantics', () => {
    it('is a labelled navigation landmark with a list of items', () => {
      const { nav, root } = create();

      expect(nav.getAttribute('role')).toBe('navigation');
      expect(nav.getAttribute('aria-label')).toBe('Main');
      expect(root.querySelector('ul')?.getAttribute('role')).toBe('list');
      expect(
        root.querySelectorAll('andes-navigation-menu-item[role="listitem"]'),
      ).toHaveLength(4);
    });

    it('marks the current page link with aria-current', () => {
      const { byId, host, fixture } = create();
      host.pricingActive.set(true);
      fixture.detectChanges();

      expect(byId('pricing').getAttribute('aria-current')).toBe('page');
      expect(byId('pricing').hasAttribute('data-active')).toBe(true);
      expect(byId('docs').hasAttribute('aria-current')).toBe(false);
    });

    it('exposes the disclosure state on triggers', () => {
      const { byId, viewport, fixture } = create();

      expect(byId('products').getAttribute('aria-expanded')).toBe('false');
      expect(byId('products').hasAttribute('aria-controls')).toBe(false);

      byId('products').click();
      fixture.detectChanges();

      expect(byId('products').getAttribute('aria-expanded')).toBe('true');
      const panel = viewport()?.querySelector('[role="group"]') as HTMLElement;
      expect(byId('products').getAttribute('aria-controls')).toBe(panel.id);
      expect(panel.getAttribute('aria-labelledby')).toBe('products');
      expect(byId('products').getAttribute('data-state')).toBe('open');
    });

    it('keeps content out of the page until it is opened', () => {
      const { viewport, byId } = create();

      expect(viewport()).toBeNull();
      expect(byId('orders')).toBeNull();
    });

    it('lays content out as a grid of the requested columns and width', () => {
      const { byId, fixture } = create();

      byId('products').click();
      fixture.detectChanges();
      const content = document.querySelector(
        '.andes-nav-menu__content',
      ) as HTMLElement;
      expect(content.style.getPropertyValue('--andes-nav-menu-columns')).toBe(
        '2',
      );

      byId('docs').click();
      fixture.detectChanges();
      const next = document.querySelector(
        '.andes-nav-menu__content',
      ) as HTMLElement;
      expect(next.style.width).toBe('20rem');
    });

    it('gives link titles and descriptions their styling hooks', () => {
      const { byId, fixture } = create();

      byId('products').click();
      fixture.detectChanges();

      expect(
        byId('orders').querySelector('.andes-nav-menu__link-title')
          ?.textContent,
      ).toBe('Orders');
      expect(
        byId('orders').querySelector('.andes-nav-menu__link-description'),
      ).not.toBeNull();
      expect(byId('orders').getAttribute('data-context')).toBe('content');
      expect(byId('pricing').getAttribute('data-context')).toBe('bar');
    });

    it('can hide the indicator arrow', () => {
      const { byId, host, fixture } = create();

      byId('products').click();
      fixture.detectChanges();
      expect(document.querySelector('.andes-nav-menu__arrow')).not.toBeNull();

      byId('products').click();
      fixture.detectChanges();
      host.indicator.set(false);
      byId('products').click();
      fixture.detectChanges();
      expect(document.querySelector('.andes-nav-menu__arrow')).toBeNull();
    });
  });

  describe('click', () => {
    it('opens on click and closes on a second click', () => {
      const { byId, host, fixture, viewport } = create();

      byId('products').click();
      fixture.detectChanges();
      expect(host.value()).toBe('products');
      expect(viewport()).not.toBeNull();

      byId('products').click();
      fixture.detectChanges();
      expect(host.value()).toBeNull();
      expect(viewport()).toBeNull();
    });

    it('switches content when another trigger is clicked', () => {
      const { byId, host, fixture, viewport } = create();

      byId('products').click();
      fixture.detectChanges();
      byId('docs').click();
      fixture.detectChanges();

      expect(host.value()).toBe('docs');
      expect(
        viewport()?.querySelectorAll('.andes-nav-menu__content'),
      ).toHaveLength(1);
      expect(byId('intro')).not.toBeNull();
      expect(byId('orders')).toBeNull();
    });

    it('does not open a disabled item', () => {
      const { byId, host, fixture } = create();

      byId('soon').click();
      fixture.detectChanges();

      expect(host.value()).toBeNull();
      expect(byId('soon').getAttribute('aria-disabled')).toBe('true');
    });

    it('closes when a link in the content is followed', () => {
      const { byId, host, fixture } = create();

      byId('products').click();
      fixture.detectChanges();
      byId('orders').addEventListener('click', (e) => e.preventDefault());
      byId('orders').click();
      fixture.detectChanges();

      expect(host.value()).toBeNull();
    });

    it('closes on a click outside, but not inside the panel', () => {
      const { byId, host, fixture, viewport } = create();

      byId('products').click();
      fixture.detectChanges();
      viewport()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(host.value()).toBe('products');

      byId('outside').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(host.value()).toBeNull();
    });

    it('follows the two-way value from outside', () => {
      const { host, fixture, viewport } = create();

      host.value.set('docs');
      settle(fixture);
      expect(viewport()).not.toBeNull();

      host.value.set(null);
      settle(fixture);
      expect(viewport()).toBeNull();
    });
  });

  describe('hover intent', () => {
    it('opens after the delay, not before', () => {
      vi.useFakeTimers();
      const { byId, host, fixture } = create();

      pointer(byId('products'), 'pointerenter');
      vi.advanceTimersByTime(149);
      fixture.detectChanges();
      expect(host.value()).toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(host.value()).toBe('products');
    });

    it('cancels a pending open when the pointer leaves first', () => {
      vi.useFakeTimers();
      const { byId, host, fixture } = create();

      pointer(byId('products'), 'pointerenter');
      vi.advanceTimersByTime(100);
      pointer(byId('products'), 'pointerleave');
      vi.advanceTimersByTime(500);
      fixture.detectChanges();

      expect(host.value()).toBeNull();
    });

    it('switches at once when something is already open', () => {
      vi.useFakeTimers();
      const { byId, host, fixture } = create();
      byId('products').click();
      fixture.detectChanges();

      pointer(byId('docs'), 'pointerenter');
      fixture.detectChanges();

      expect(host.value()).toBe('docs');
    });

    it('closes after the grace period once the pointer leaves', () => {
      vi.useFakeTimers();
      const { byId, host, fixture } = create();
      pointer(byId('products'), 'pointerenter');
      vi.advanceTimersByTime(150);
      fixture.detectChanges();

      pointer(byId('products'), 'pointerleave');
      vi.advanceTimersByTime(149);
      fixture.detectChanges();
      expect(host.value()).toBe('products');
      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(host.value()).toBeNull();
    });

    it('stays open while the pointer is over the panel', () => {
      vi.useFakeTimers();
      const { byId, host, fixture, viewport } = create();
      pointer(byId('products'), 'pointerenter');
      vi.advanceTimersByTime(150);
      fixture.detectChanges();

      pointer(byId('products'), 'pointerleave');
      pointer(viewport() as Element, 'pointerenter');
      vi.advanceTimersByTime(1000);
      fixture.detectChanges();
      expect(host.value()).toBe('products');

      pointer(viewport() as Element, 'pointerleave');
      vi.advanceTimersByTime(150);
      fixture.detectChanges();
      expect(host.value()).toBeNull();
    });

    it('ignores touch pointers and keeps a click from closing a hover-opened panel', () => {
      vi.useFakeTimers();
      const { byId, host, fixture } = create();

      pointer(byId('products'), 'pointerenter', 'touch');
      vi.advanceTimersByTime(500);
      expect(host.value()).toBeNull();

      pointer(byId('products'), 'pointerenter');
      vi.advanceTimersByTime(150);
      fixture.detectChanges();
      byId('products').dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 }),
      );
      fixture.detectChanges();
      expect(host.value()).toBe('products');

      vi.advanceTimersByTime(600);
      byId('products').dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 }),
      );
      fixture.detectChanges();
      expect(host.value()).toBeNull();
    });
  });

  describe('keyboard', () => {
    it('moves along the bar with Left / Right and Home / End', () => {
      const { byId } = create();
      byId('products').focus();

      pressKey(byId('products'), 'ArrowRight');
      expect(document.activeElement).toBe(byId('docs'));
      pressKey(byId('docs'), 'ArrowRight');
      expect(document.activeElement).toBe(byId('pricing'));
      pressKey(byId('pricing'), 'ArrowLeft');
      expect(document.activeElement).toBe(byId('docs'));
      pressKey(byId('docs'), 'End');
      expect(document.activeElement).toBe(byId('pricing'));
      pressKey(byId('pricing'), 'Home');
      expect(document.activeElement).toBe(byId('products'));
    });

    it('flips the arrows in right-to-left layouts', () => {
      const { byId, root } = create();
      root.setAttribute('dir', 'rtl');
      byId('products').focus();

      pressKey(byId('products'), 'ArrowLeft');

      expect(document.activeElement).toBe(byId('docs'));
    });

    it('opens with Down and moves focus into the content', () => {
      const { byId, host, fixture } = create();
      byId('products').focus();

      pressKey(byId('products'), 'ArrowDown');
      fixture.detectChanges();
      fixture.detectChanges();

      expect(host.value()).toBe('products');
      expect(document.activeElement).toBe(byId('orders'));
    });

    it('opens with Enter and Space, moving focus into the content', () => {
      const { byId, host, fixture } = create();

      byId('products').dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 0 }),
      );
      fixture.detectChanges();
      fixture.detectChanges();

      expect(host.value()).toBe('products');
      expect(document.activeElement).toBe(byId('orders'));
    });

    it('moves between content links with the arrow keys and Home / End', () => {
      const { byId, fixture } = create();
      byId('products').focus();
      pressKey(byId('products'), 'ArrowDown');
      fixture.detectChanges();
      fixture.detectChanges();

      pressKey(byId('orders'), 'ArrowDown');
      expect(document.activeElement).toBe(byId('invoices'));
      pressKey(byId('invoices'), 'ArrowRight');
      expect(document.activeElement).toBe(byId('stock'));
      pressKey(byId('stock'), 'ArrowDown');
      expect(document.activeElement).toBe(byId('orders'));
      pressKey(byId('orders'), 'ArrowUp');
      expect(document.activeElement).toBe(byId('stock'));
      pressKey(byId('stock'), 'Home');
      expect(document.activeElement).toBe(byId('orders'));
      pressKey(byId('orders'), 'End');
      expect(document.activeElement).toBe(byId('stock'));
    });

    it('closes with Escape and returns focus to the trigger', () => {
      const { byId, host, fixture } = create();
      byId('products').focus();
      pressKey(byId('products'), 'ArrowDown');
      fixture.detectChanges();
      fixture.detectChanges();

      pressKey(byId('orders'), 'Escape');
      fixture.detectChanges();

      expect(host.value()).toBeNull();
      expect(document.activeElement).toBe(byId('products'));
    });

    it('closes with Escape from the trigger', () => {
      const { byId, host, fixture } = create();
      byId('products').click();
      fixture.detectChanges();

      pressKey(byId('products'), 'Escape');
      fixture.detectChanges();

      expect(host.value()).toBeNull();
    });

    it('Tab from an open trigger enters the content', () => {
      const { byId, fixture } = create();
      byId('products').click();
      fixture.detectChanges();
      byId('products').focus();

      const event = pressKey(byId('products'), 'Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(byId('orders'));
    });

    it('Shift+Tab from the first link goes back to the trigger', () => {
      const { byId, fixture } = create();
      byId('products').click();
      fixture.detectChanges();
      byId('orders').focus();

      pressKey(byId('orders'), 'Tab', { shiftKey: true });

      expect(document.activeElement).toBe(byId('products'));
    });

    it('Tab from the last link closes the content and moves on along the bar', () => {
      const { byId, host, fixture } = create();
      byId('products').click();
      fixture.detectChanges();
      byId('stock').focus();

      pressKey(byId('stock'), 'Tab');
      fixture.detectChanges();

      expect(host.value()).toBeNull();
      expect(document.activeElement).toBe(byId('docs'));
    });

    it('follows the focus to another trigger while content is open', () => {
      const { byId, host, fixture } = create();
      byId('products').click();
      fixture.detectChanges();
      byId('products').focus();

      pressKey(byId('products'), 'ArrowRight');
      fixture.detectChanges();

      expect(host.value()).toBe('docs');
    });

    it('closes content when focus moves to a plain link', () => {
      const { byId, host, fixture } = create();
      byId('docs').click();
      fixture.detectChanges();
      byId('docs').focus();

      pressKey(byId('docs'), 'ArrowRight');
      fixture.detectChanges();

      expect(host.value()).toBeNull();
    });

    it('closes when focus leaves the menu for somewhere else', () => {
      const { byId, host, fixture } = create();
      byId('products').click();
      fixture.detectChanges();
      byId('products').focus();

      byId('products').dispatchEvent(
        new FocusEvent('focusout', {
          bubbles: true,
          relatedTarget: byId('outside'),
        }),
      );
      fixture.detectChanges();

      expect(host.value()).toBeNull();
    });

    it('skips the disabled trigger when moving along the bar', () => {
      const { byId } = create();
      byId('pricing').focus();

      pressKey(byId('pricing'), 'ArrowRight');

      expect(document.activeElement).toBe(byId('products'));
    });
  });

  describe('shared panel', () => {
    it('keeps one panel while switching and slides content in from the move direction', () => {
      const { byId, fixture } = create();
      byId('products').click();
      fixture.detectChanges();
      const first = document.querySelector('.andes-nav-menu__viewport');
      expect(
        document
          .querySelector('.andes-nav-menu__content')
          ?.hasAttribute('data-motion'),
      ).toBe(false);

      byId('docs').click();
      fixture.detectChanges();

      expect(document.querySelector('.andes-nav-menu__viewport')).toBe(first);
      expect(
        document
          .querySelector('.andes-nav-menu__content')
          ?.getAttribute('data-motion'),
      ).toBe('from-end');

      byId('products').click();
      fixture.detectChanges();
      expect(
        document
          .querySelector('.andes-nav-menu__content')
          ?.getAttribute('data-motion'),
      ).toBe('from-start');
    });

    it('sizes the panel to the measured content, instantly on first open', () => {
      const { byId, fixture } = create();

      byId('products').click();
      settle(fixture);

      const panel = document.querySelector(
        '.andes-nav-menu__panel',
      ) as HTMLElement;
      expect(panel.style.width).toBe('1px');
      expect(panel.style.height).toBe('1px');
      expect(panel.hasAttribute('data-instant')).toBe(true);
    });

    it('re-enables the size transition once it has settled', () => {
      vi.useFakeTimers();
      const { byId, fixture } = create();

      byId('products').click();
      settle(fixture);
      vi.advanceTimersByTime(60);
      fixture.detectChanges();

      const panel = document.querySelector(
        '.andes-nav-menu__panel',
      ) as HTMLElement;
      expect(panel.hasAttribute('data-instant')).toBe(false);
    });
  });

  describe('stacked (narrow screen) form', () => {
    let query: {
      matches: boolean;
      listener: ((e: { matches: boolean }) => void) | null;
    };

    beforeEach(() => {
      query = { matches: true, listener: null };
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (media: string) => ({
          matches: media.includes('max-width') ? query.matches : false,
          media,
          addEventListener: (
            _: string,
            fn: (e: { matches: boolean }) => void,
          ) => {
            query.listener = fn;
          },
          removeEventListener: () => {
            query.listener = null;
          },
        }),
      });
    });

    afterEach(() => {
      delete (window as unknown as Record<string, unknown>)['matchMedia'];
    });

    it('lists the items vertically and opens content inline instead of in a panel', () => {
      const { byId, nav, host, fixture, viewport, root } = create();

      expect(nav.hasAttribute('data-mobile')).toBe(true);
      const inline = root.querySelector(
        '.andes-nav-menu__inline',
      ) as HTMLElement;
      expect(inline.getAttribute('data-state')).toBe('closed');
      expect(inline.hasAttribute('inert')).toBe(true);

      byId('products').click();
      fixture.detectChanges();
      fixture.detectChanges();

      expect(host.value()).toBe('products');
      expect(viewport()).toBeNull();
      expect(inline.getAttribute('data-state')).toBe('open');
      expect(inline.hasAttribute('inert')).toBe(false);
      expect(
        inline.querySelector('[role="group"]')?.getAttribute('aria-labelledby'),
      ).toBe('products');
      expect(byId('products').getAttribute('aria-controls')).toBe(
        inline.querySelector('[role="group"]')?.id,
      );
    });

    it('does not open on hover, and uses Up / Down to move along the list', () => {
      vi.useFakeTimers();
      const { byId, host } = create();

      pointer(byId('products'), 'pointerenter');
      vi.advanceTimersByTime(500);
      expect(host.value()).toBeNull();

      byId('products').focus();
      pressKey(byId('products'), 'ArrowDown');
      expect(document.activeElement).toBe(byId('docs'));
      pressKey(byId('docs'), 'ArrowUp');
      expect(document.activeElement).toBe(byId('products'));
    });

    it('returns to the bar layout when the screen widens', () => {
      const { nav, fixture, byId, host } = create();
      byId('products').click();
      fixture.detectChanges();

      query.listener?.({ matches: false });
      settle(fixture);

      expect(nav.hasAttribute('data-mobile')).toBe(false);
      expect(host.value()).toBe('products');
      expect(
        document.querySelector('.andes-nav-menu__viewport'),
      ).not.toBeNull();
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(`${__dirname}/navigation-menu.css`, 'utf8');

    it('never starts a selector line with a combinator', () => {
      const offenders = css
        .split('\n')
        .filter((line) => /^\s*[>+~]/.test(line));

      expect(offenders).toEqual([]);
    });

    it('resizes the panel in 200ms with the shared ease-out and no overshoot', () => {
      expect(css).toMatch(/width var\(--_resize\) var\(--_ease\)/);
      expect(css).toContain('var(--andes-motion-duration-slow, 200ms)');
      expect(css).toContain('cubic-bezier(0.2, 0, 0, 1)');
      expect(css).not.toMatch(/cubic-bezier\([^)]*-\d/);
    });

    it('plays the exit animation on the panel root and honours reduced motion', () => {
      expect(css).toMatch(
        /\.andes-nav-menu__viewport\[data-andes-closing\]\s*\{[^}]*animation: andes-nav-menu-exit/,
      );
      expect(css).toContain('prefers-reduced-motion: no-preference');
      expect(css).toContain('prefers-reduced-motion: reduce');
    });

    it('uses an outline ring for focus', () => {
      expect(css).toMatch(
        /\.andes-nav-menu__link:focus-visible\s*\{[^}]*outline: 2px solid var\(--andes-color-focus-ring/,
      );
    });

    it('sizes bar items from the control height token with a literal fallback', () => {
      expect(css).toContain('var(--andes-control-height-md, 2rem)');
    });
  });

  describe('public API', () => {
    it('opens and closes by value', () => {
      const { fixture, host } = create();
      const menu = fixture.debugElement.children[0]
        .componentInstance as AndesNavigationMenu;

      menu.openItem('docs');
      fixture.detectChanges();
      expect(host.value()).toBe('docs');

      menu.closeItem();
      fixture.detectChanges();
      expect(host.value()).toBeNull();
    });
  });
});
