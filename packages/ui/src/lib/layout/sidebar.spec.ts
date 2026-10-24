import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AndesSidebar } from './sidebar';
import { AndesSidebarMenuButton } from './sidebar-menu-button';
import {
  AndesSidebarContent,
  AndesSidebarFooter,
  AndesSidebarGroup,
  AndesSidebarGroupLabel,
  AndesSidebarHeader,
  AndesSidebarInset,
  AndesSidebarMenu,
  AndesSidebarMenuBadge,
  AndesSidebarMenuItem,
  AndesSidebarMenuSub,
  AndesSidebarSeparator,
} from './sidebar-parts';
import {
  AndesSidebarCollapsible,
  AndesSidebarProvider,
  AndesSidebarSide,
  AndesSidebarVariant,
} from './sidebar-provider';
import { AndesSidebarTrigger } from './sidebar-trigger';

class FakeMediaQuery {
  matches: boolean;
  private listeners = new Set<(event: MediaQueryListEvent) => void>();
  constructor(matches: boolean) {
    this.matches = matches;
  }
  addEventListener(_: string, l: (event: MediaQueryListEvent) => void) {
    this.listeners.add(l);
  }
  removeEventListener(_: string, l: (event: MediaQueryListEvent) => void) {
    this.listeners.delete(l);
  }
  emit(matches: boolean) {
    this.matches = matches;
    this.listeners.forEach((l) => l({ matches } as MediaQueryListEvent));
  }
}

/** A viewport that is mobile (narrower than 768px) or not, and can be flipped. */
function stubViewport(mobile: boolean) {
  const list = new FakeMediaQuery(mobile);
  vi.stubGlobal('matchMedia', () => list);
  return { set: (value: boolean) => list.emit(value) };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  });
  return data;
}

const PARTS = [
  AndesSidebarProvider,
  AndesSidebar,
  AndesSidebarHeader,
  AndesSidebarContent,
  AndesSidebarFooter,
  AndesSidebarGroup,
  AndesSidebarGroupLabel,
  AndesSidebarMenu,
  AndesSidebarMenuItem,
  AndesSidebarMenuSub,
  AndesSidebarMenuBadge,
  AndesSidebarMenuButton,
  AndesSidebarSeparator,
  AndesSidebarTrigger,
  AndesSidebarInset,
];

@Component({
  imports: PARTS,
  template: `
    <button id="opener" type="button">Open</button>
    <andes-sidebar-provider
      [(open)]="open"
      [(openMobile)]="openMobile"
      [storageKey]="storageKey()"
      [shortcut]="shortcut()"
      [contained]="contained()"
    >
      <andes-sidebar
        [side]="side()"
        [variant]="variant()"
        [collapsible]="collapsible()"
        label="Main navigation"
      >
        <andes-sidebar-header
          ><input id="search" aria-label="Search"
        /></andes-sidebar-header>
        <andes-sidebar-content>
          <andes-sidebar-group id="group">
            <andes-sidebar-group-label>Platform</andes-sidebar-group-label>
            <andes-sidebar-menu>
              <andes-sidebar-menu-item>
                <andes-sidebar-menu-button
                  id="home"
                  href="/home"
                  [active]="true"
                  tooltip="Home"
                  ><svg></svg><span>Home</span
                  ><andes-sidebar-menu-badge
                    >3</andes-sidebar-menu-badge
                  ></andes-sidebar-menu-button
                >
              </andes-sidebar-menu-item>
              <andes-sidebar-menu-item>
                <andes-sidebar-menu-button
                  id="orders"
                  tooltip="Orders"
                  [disabled]="ordersDisabled()"
                  ><svg></svg><span>Orders</span></andes-sidebar-menu-button
                >
                <andes-sidebar-menu-sub
                  ><andes-sidebar-menu-item
                    >Sub</andes-sidebar-menu-item
                  ></andes-sidebar-menu-sub
                >
              </andes-sidebar-menu-item>
              <andes-sidebar-menu-item>
                <andes-sidebar-menu-button id="plain"
                  ><span>No tooltip</span></andes-sidebar-menu-button
                >
              </andes-sidebar-menu-item>
            </andes-sidebar-menu>
          </andes-sidebar-group>
        </andes-sidebar-content>
        <andes-sidebar-separator />
        <andes-sidebar-footer
          ><button id="logout" type="button">
            Log out
          </button></andes-sidebar-footer
        >
      </andes-sidebar>
      <andes-sidebar-inset
        ><andes-sidebar-trigger />
        <main>Page</main></andes-sidebar-inset
      >
    </andes-sidebar-provider>
  `,
})
class Host {
  readonly open = signal(true);
  readonly openMobile = signal(false);
  readonly storageKey = signal<string | undefined>(undefined);
  readonly shortcut = signal<string | null>('b');
  readonly contained = signal(false);
  readonly side = signal<AndesSidebarSide>('start');
  readonly variant = signal<AndesSidebarVariant>('sidebar');
  readonly collapsible = signal<AndesSidebarCollapsible>('icon');
  readonly ordersDisabled = signal(false);
}

afterEach(() => vi.unstubAllGlobals());

function create(options: { mobile?: boolean } = {}) {
  const viewport = stubViewport(options.mobile ?? false);
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const q = (selector: string) =>
    fixture.nativeElement.querySelector(selector) as HTMLElement;
  return {
    fixture,
    viewport,
    host: fixture.componentInstance,
    q,
    provider: () => q('andes-sidebar-provider'),
    sidebar: () => q('andes-sidebar'),
    trigger: () => q('.andes-sidebar-trigger__button'),
  };
}

async function settle(fixture: ComponentFixture<unknown>) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function press(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = document,
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('sidebar provider', () => {
  it('starts open and mirrors its state in attributes', () => {
    const { provider, sidebar } = create();
    expect(provider().getAttribute('data-state')).toBe('expanded');
    expect(provider().getAttribute('data-mode')).toBe('expanded');
    expect(provider().hasAttribute('data-mobile')).toBe(false);
    expect(sidebar().getAttribute('data-state')).toBe('expanded');
    expect(sidebar().getAttribute('data-collapsible')).toBe('icon');
  });

  it('collapses to icons, and the mode follows the sidebar kind', async () => {
    const { fixture, host, provider } = create();
    host.open.set(false);
    await settle(fixture);
    expect(provider().getAttribute('data-state')).toBe('collapsed');
    expect(provider().getAttribute('data-mode')).toBe('icon');

    host.collapsible.set('offcanvas');
    await settle(fixture);
    expect(provider().getAttribute('data-mode')).toBe('offcanvas');

    host.collapsible.set('none');
    await settle(fixture);
    expect(provider().getAttribute('data-mode')).toBe('expanded');
  });

  it('toggles from the trigger and writes the model back', async () => {
    const { fixture, host, trigger } = create();
    trigger().click();
    await settle(fixture);
    expect(host.open()).toBe(false);
    trigger().click();
    await settle(fixture);
    expect(host.open()).toBe(true);
  });

  it('exposes width variables only when set', () => {
    const { provider } = create();
    expect(provider().style.getPropertyValue('--andes-sidebar-width')).toBe('');
  });

  it('marks the contained mode', async () => {
    const { fixture, host, provider } = create();
    host.contained.set(true);
    await settle(fixture);
    expect(provider().hasAttribute('data-contained')).toBe(true);
  });

  describe('keyboard shortcut', () => {
    it('toggles with Ctrl+B and Cmd+B', async () => {
      const { fixture, host } = create();
      const event = press('b', { ctrlKey: true });
      await settle(fixture);
      expect(event.defaultPrevented).toBe(true);
      expect(host.open()).toBe(false);
      press('B', { metaKey: true });
      await settle(fixture);
      expect(host.open()).toBe(true);
    });

    it('ignores other keys, bare B and extra modifiers', async () => {
      const { fixture, host } = create();
      press('b');
      press('x', { ctrlKey: true });
      press('b', { ctrlKey: true, shiftKey: true });
      press('b', { ctrlKey: true, altKey: true });
      await settle(fixture);
      expect(host.open()).toBe(true);
    });

    it('can be changed or turned off', async () => {
      const { fixture, host } = create();
      host.shortcut.set('k');
      await settle(fixture);
      press('b', { ctrlKey: true });
      expect(host.open()).toBe(true);
      press('k', { ctrlKey: true });
      expect(host.open()).toBe(false);

      host.shortcut.set(null);
      await settle(fixture);
      press('k', { ctrlKey: true });
      expect(host.open()).toBe(false);
    });
  });

  describe('persistence', () => {
    it('restores the stored state', async () => {
      memoryStorage({ side: 'false' });
      const viewport = stubViewport(false);
      void viewport;
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.storageKey.set('side');
      await settle(fixture);
      expect(fixture.componentInstance.open()).toBe(false);
    });

    it('writes changes under the key', async () => {
      const data = memoryStorage();
      const { fixture, host } = create();
      host.storageKey.set('side');
      await settle(fixture);
      host.open.set(false);
      await settle(fixture);
      expect(data.get('side')).toBe('false');
      host.open.set(true);
      await settle(fixture);
      expect(data.get('side')).toBe('true');
    });

    it('ignores garbage and unavailable storage', async () => {
      memoryStorage({ side: 'maybe' });
      const fixture = TestBed.createComponent(Host);
      stubViewport(false);
      memoryStorage({ side: 'maybe' });
      fixture.componentInstance.storageKey.set('side');
      await settle(fixture);
      expect(fixture.componentInstance.open()).toBe(true);

      vi.stubGlobal('localStorage', {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
      });
      const second = TestBed.createComponent(Host);
      second.componentInstance.storageKey.set('side');
      await expect(settle(second)).resolves.not.toThrow();
      expect(second.componentInstance.open()).toBe(true);
    });

    it('does nothing without a key', async () => {
      const data = memoryStorage();
      const { fixture, host } = create();
      host.open.set(false);
      await settle(fixture);
      expect(data.size).toBe(0);
    });
  });

  describe('viewport', () => {
    it('detects mobile and resets the overlay when leaving it', async () => {
      const { fixture, host, viewport, provider } = create({ mobile: true });
      expect(provider().hasAttribute('data-mobile')).toBe(true);
      host.openMobile.set(true);
      await settle(fixture);
      viewport.set(false);
      await settle(fixture);
      expect(provider().hasAttribute('data-mobile')).toBe(false);
      expect(host.openMobile()).toBe(false);
    });
  });
});

describe('desktop sidebar', () => {
  it('marks the side, variant and kind, and registers them with the provider', async () => {
    const { fixture, host, sidebar, provider } = create();
    host.side.set('end');
    host.variant.set('floating');
    host.collapsible.set('offcanvas');
    await settle(fixture);
    expect(sidebar().getAttribute('data-side')).toBe('end');
    expect(sidebar().getAttribute('data-variant')).toBe('floating');
    expect(provider().getAttribute('data-side')).toBe('end');
    expect(provider().getAttribute('data-variant')).toBe('floating');
  });

  it('renders a placeholder and a labelled panel', () => {
    const { q } = create();
    expect(q('.andes-sidebar__gap')).not.toBeNull();
    const panel = q('.andes-sidebar__container');
    expect(panel.tagName).toBe('ASIDE');
    expect(panel.getAttribute('aria-label')).toBe('Main navigation');
    expect(panel.hasAttribute('inert')).toBe(false);
  });

  it('takes an off-canvas panel out of the tab order while it is hidden', async () => {
    const { fixture, host, q } = create();
    host.collapsible.set('offcanvas');
    host.open.set(false);
    await settle(fixture);
    expect(q('.andes-sidebar__container').hasAttribute('inert')).toBe(true);
  });

  it('keeps the icon rail interactive', async () => {
    const { fixture, host, q } = create();
    host.open.set(false);
    await settle(fixture);
    expect(q('.andes-sidebar__container').hasAttribute('inert')).toBe(false);
  });

  it('renders a plain column when it never collapses', async () => {
    const { fixture, host, q } = create();
    host.collapsible.set('none');
    await settle(fixture);
    expect(q('.andes-sidebar__static')).not.toBeNull();
    expect(q('.andes-sidebar__gap')).toBeNull();
    expect(q('.andes-sidebar__container')).toBeNull();
  });

  it('shows no overlay on desktop', () => {
    const { q } = create();
    expect(q('.andes-sidebar__overlay')).toBeNull();
    expect(q('.andes-sidebar__scrim')).toBeNull();
  });

  it('projects its content exactly once', () => {
    const { fixture } = create();
    expect(fixture.nativeElement.querySelectorAll('#search')).toHaveLength(1);
  });
});

describe('mobile overlay', () => {
  it('renders a closed, inert modal dialog and a scrim', () => {
    const { q } = create({ mobile: true });
    const overlay = q('.andes-sidebar__overlay');
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
    expect(overlay.getAttribute('aria-label')).toBe('Main navigation');
    expect(overlay.hasAttribute('inert')).toBe(true);
    expect(overlay.hasAttribute('data-open')).toBe(false);
    expect(q('.andes-sidebar__scrim').hasAttribute('data-open')).toBe(false);
    expect(q('.andes-sidebar__gap')).toBeNull();
  });

  it('opens from the trigger, even when the desktop state is collapsed', async () => {
    const { fixture, host, q, trigger } = create({ mobile: true });
    host.open.set(false);
    await settle(fixture);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    trigger().click();
    await settle(fixture);
    expect(host.openMobile()).toBe(true);
    expect(host.open()).toBe(false);
    expect(q('.andes-sidebar__overlay').hasAttribute('inert')).toBe(false);
    expect(q('.andes-sidebar__overlay').hasAttribute('data-open')).toBe(true);
    expect(q('.andes-sidebar__scrim').hasAttribute('data-open')).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('always shows labels on mobile, whatever the desktop state', async () => {
    const { fixture, host, provider } = create({ mobile: true });
    host.open.set(false);
    await settle(fixture);
    expect(provider().getAttribute('data-mode')).toBe('expanded');
  });

  it('moves focus into the panel when it opens', async () => {
    const { fixture, host, q } = create({ mobile: true });
    host.openMobile.set(true);
    await settle(fixture);
    expect(q('.andes-sidebar__overlay').contains(document.activeElement)).toBe(
      true,
    );
    expect(document.activeElement?.id).toBe('search');
  });

  it('closes on Escape and returns focus to what opened it', async () => {
    const { fixture, host, q } = create({ mobile: true });
    const opener = q('#opener');
    opener.focus();
    host.openMobile.set(true);
    await settle(fixture);
    const event = press('Escape', {}, document.activeElement ?? document);
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(host.openMobile()).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes when the scrim is clicked', async () => {
    const { fixture, host, q } = create({ mobile: true });
    host.openMobile.set(true);
    await settle(fixture);
    q('.andes-sidebar__scrim').click();
    await settle(fixture);
    expect(host.openMobile()).toBe(false);
  });

  it('does not steal focus back when the user moved on', async () => {
    const { fixture, host, q } = create({ mobile: true });
    q('#opener').focus();
    host.openMobile.set(true);
    await settle(fixture);
    // The page closes it and sends focus somewhere deliberate before the next render.
    const provider = fixture.debugElement.query(
      By.directive(AndesSidebarProvider),
    ).componentInstance as AndesSidebarProvider;
    const other = document.createElement('button');
    document.body.appendChild(other);
    provider.setOpenMobile(false);
    other.focus();
    await settle(fixture);
    expect(document.activeElement).toBe(other);
    other.remove();
  });

  describe('focus trap', () => {
    it('wraps Tab from the last focusable to the first, and Shift+Tab back', async () => {
      const { fixture, host, q } = create({ mobile: true });
      host.openMobile.set(true);
      await settle(fixture);
      const overlay = q('.andes-sidebar__overlay');
      const focusables = Array.from(
        overlay.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input',
        ),
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      last.focus();
      const forward = press('Tab', {}, last);
      expect(forward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(first);

      const backward = press('Tab', { shiftKey: true }, first);
      expect(backward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(last);
    });

    it('leaves Tab alone in the middle of the panel', async () => {
      const { fixture, host, q } = create({ mobile: true });
      host.openMobile.set(true);
      await settle(fixture);
      const middle = q('#home .andes-sidebar-menu-button__control');
      middle.focus();
      expect(press('Tab', {}, middle).defaultPrevented).toBe(false);
    });

    it('pulls focus that escapes the open panel back in', async () => {
      const { fixture, host, q } = create({ mobile: true });
      host.openMobile.set(true);
      await settle(fixture);
      q('#opener').focus();
      expect(
        q('.andes-sidebar__overlay').contains(document.activeElement),
      ).toBe(true);
    });
  });
});

describe('menu button', () => {
  it('is a link with aria-current when it has an href and is active', () => {
    const { q } = create();
    const link = q('#home .andes-sidebar-menu-button__control');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/home');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.hasAttribute('data-active')).toBe(true);
  });

  it('is a button otherwise, without aria-current', () => {
    const { q } = create();
    const button = q('#orders .andes-sidebar-menu-button__control');
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.hasAttribute('aria-current')).toBe(false);
    expect(button.hasAttribute('data-active')).toBe(false);
  });

  it('can be disabled', async () => {
    const { fixture, host, q } = create();
    host.ordersDisabled.set(true);
    await settle(fixture);
    expect(
      (q('#orders .andes-sidebar-menu-button__control') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  describe('tooltip', () => {
    const hover = (el: HTMLElement) =>
      el.dispatchEvent(new Event('pointerenter', { bubbles: false }));

    it('shows next to the icon while collapsed to icons, and hides on leave', async () => {
      const { fixture, host, q } = create();
      host.open.set(false);
      await settle(fixture);
      const control = q('#orders .andes-sidebar-menu-button__control');
      hover(control);
      await settle(fixture);
      const tip = q('#orders .andes-sidebar-menu-button__tip');
      expect(tip.getAttribute('role')).toBe('tooltip');
      expect(tip.textContent).toBe('Orders');
      expect(control.getAttribute('aria-describedby')).toBe(tip.id);

      control.dispatchEvent(new Event('pointerleave'));
      await settle(fixture);
      expect(q('#orders .andes-sidebar-menu-button__tip')).toBeNull();
      expect(control.hasAttribute('aria-describedby')).toBe(false);
    });

    it('hides on Escape and on press', async () => {
      const { fixture, host, q } = create();
      host.open.set(false);
      await settle(fixture);
      const control = q('#orders .andes-sidebar-menu-button__control');
      hover(control);
      await settle(fixture);
      press('Escape', {}, control);
      await settle(fixture);
      expect(q('#orders .andes-sidebar-menu-button__tip')).toBeNull();

      hover(control);
      await settle(fixture);
      control.dispatchEvent(new Event('pointerdown'));
      await settle(fixture);
      expect(q('#orders .andes-sidebar-menu-button__tip')).toBeNull();
    });

    it('does not show while the labels are visible', async () => {
      const { fixture, q } = create();
      hover(q('#orders .andes-sidebar-menu-button__control'));
      await settle(fixture);
      expect(q('.andes-sidebar-menu-button__tip')).toBeNull();
    });

    it('does not show for a button without tooltip text', async () => {
      const { fixture, host, q } = create();
      host.open.set(false);
      await settle(fixture);
      hover(q('#plain .andes-sidebar-menu-button__control'));
      await settle(fixture);
      expect(q('#plain .andes-sidebar-menu-button__tip')).toBeNull();
    });
  });
});

describe('trigger', () => {
  it('is a labelled button wired to the sidebar', () => {
    const { trigger, sidebar } = create();
    expect(trigger().tagName).toBe('BUTTON');
    expect(trigger().getAttribute('type')).toBe('button');
    expect(trigger().getAttribute('aria-label')).toBe('Toggle sidebar');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(
      sidebar().querySelector('aside')?.id,
    );
  });

  it('reflects the collapsed state', async () => {
    const { fixture, host, trigger } = create();
    host.open.set(false);
    await settle(fixture);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('parts', () => {
  it('give lists and groups their roles and names', () => {
    const { q, fixture } = create();
    expect(q('andes-sidebar-menu').getAttribute('role')).toBe('list');
    expect(q('andes-sidebar-menu-item').getAttribute('role')).toBe('listitem');
    const label = q('andes-sidebar-group-label');
    expect(q('#group').getAttribute('role')).toBe('group');
    expect(q('#group').getAttribute('aria-labelledby')).toBe(label.id);
    expect(
      fixture.nativeElement.querySelectorAll('[role="separator"]'),
    ).toHaveLength(1);
  });

  it('let the inset know the variant, side and mode', async () => {
    const { fixture, host, q } = create();
    host.variant.set('inset');
    host.side.set('end');
    host.open.set(false);
    await settle(fixture);
    const inset = q('andes-sidebar-inset');
    expect(inset.getAttribute('data-variant')).toBe('inset');
    expect(inset.getAttribute('data-side')).toBe('end');
    expect(inset.getAttribute('data-mode')).toBe('icon');
  });
});

describe('sidebar stylesheet contract', () => {
  const css = readFileSync(
    join(process.cwd(), 'packages/ui/src/lib/layout/sidebar.css'),
    'utf8',
  );
  const flat = css
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')');

  it('animates the width and position for 200ms', () => {
    expect(flat).toContain('--_dur: var(--andes-motion-duration-slow, 200ms)');
    expect(flat).toContain(
      '.andes-sidebar__gap { position: relative; width: var(--_w); background: transparent; transition: width var(--_dur) var(--_ease);',
    );
    expect(flat).toContain(
      'transition-property: width, inset-inline-start, inset-inline-end;',
    );
  });

  it('moves the placeholder in step with the panel, so the page does not jump', () => {
    expect(flat).toContain(
      "[data-mode='icon'] .andes-sidebar__gap { width: var(--_wi);",
    );
    expect(flat).toContain(
      "[data-mode='icon'] .andes-sidebar__container { width: var(--_wi);",
    );
    expect(flat).toContain(
      "[data-mode='offcanvas'] .andes-sidebar__gap { width: 0;",
    );
  });

  it('removes every transition under reduced motion', () => {
    const block =
      /@media \(prefers-reduced-motion: reduce\) \{([^@]*)\}\s*$/.exec(
        css,
      )?.[1] ?? '';
    for (const selector of ['gap', 'container', 'overlay', 'scrim']) {
      expect(block).toContain(`.andes-sidebar__${selector}`);
    }
    expect(block).toContain('transition: none');
  });

  it('clips labels to a square control while collapsed to icons', () => {
    expect(flat).toMatch(
      /\[data-mode='icon'\] \.andes-sidebar-menu-button__control \{ width: 2rem;/,
    );
    expect(flat).toContain('overflow: hidden');
  });

  it('uses logical properties only (end side and RTL)', () => {
    expect(css).not.toMatch(
      /margin-left|margin-right|padding-left|padding-right|border-left|border-right|[^-]left:|[^-]right:/,
    );
  });

  it('reads colour from tokens with fallbacks', () => {
    expect(flat).toContain(
      '--_bg: var(--andes-sidebar-background, var(--andes-color-card, #ffffff))',
    );
    expect(css).toContain('var(--andes-z-index-overlay, 1040)');
    expect(css).toContain('var(--andes-color-overlay,');
  });

  it('never starts a line with a combinator', () => {
    expect(css.split('\n').filter((l) => /^\s*[>+~]/.test(l))).toEqual([]);
  });
});
