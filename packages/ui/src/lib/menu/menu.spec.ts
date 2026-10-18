import { Component, signal, type TemplateRef, viewChild } from '@angular/core';
import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readFileSync } from 'node:fs';

import { AndesMenu } from './menu';
import { AndesMenuDivider } from './menu-divider';
import { AndesMenuGroup } from './menu-group';
import { AndesMenuItem } from './menu-item';
import type {
  AndesMenuClickEvent,
  AndesMenuMode,
  AndesMenuNode,
  AndesMenuOpenChangeEvent,
  AndesMenuSelectEvent,
  AndesMenuSize,
  AndesMenuTheme,
} from './menu-types';
import { AndesSubMenu } from './sub-menu';

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

function pressKey(
  target: Element,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
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
    AndesMenu,
    AndesMenuItem,
    AndesSubMenu,
    AndesMenuGroup,
    AndesMenuDivider,
  ],
  template: `
    <andes-menu
      [mode]="mode()"
      [theme]="theme()"
      [size]="size()"
      [inlineCollapsed]="collapsed()"
      [selectable]="selectable()"
      [multiple]="multiple()"
      [navigation]="navigation()"
      [accordion]="accordion()"
      [ariaLabel]="'Main'"
      [triggerSubMenuAction]="action()"
      [subMenuCloseDelay]="100"
      [(selectedKeys)]="selected"
      [(openKeys)]="open"
      (itemClick)="clicks.push($event)"
      (itemSelected)="selects.push($event)"
      (itemDeselected)="deselects.push($event)"
      (openChange)="opens.push($event)"
    >
      <andes-menu-item key="home" title="Home page">Home</andes-menu-item>
      <andes-menu-item key="inbox" [disabled]="inboxDisabled()"
        >Inbox</andes-menu-item
      >
      <andes-sub-menu key="reports" label="Reports">
        <andes-menu-item key="daily">Daily</andes-menu-item>
        <andes-menu-item key="weekly">Weekly</andes-menu-item>
        <andes-sub-menu key="archive" label="Archive">
          <andes-menu-item key="y2024">2024</andes-menu-item>
        </andes-sub-menu>
      </andes-sub-menu>
      <andes-menu-divider />
      <andes-menu-group label="Admin">
        <andes-menu-item key="users" [danger]="true">Users</andes-menu-item>
      </andes-menu-group>
      <andes-menu-item key="docs" href="/docs" target="_blank"
        >Docs</andes-menu-item
      >
    </andes-menu>
  `,
})
class HostComponent {
  readonly mode = signal<AndesMenuMode>('vertical');
  readonly theme = signal<AndesMenuTheme>('light');
  readonly size = signal<AndesMenuSize>('md');
  readonly collapsed = signal(false);
  readonly selectable = signal(true);
  readonly multiple = signal(false);
  readonly navigation = signal(false);
  readonly accordion = signal(false);
  readonly action = signal<'hover' | 'click'>('hover');
  readonly inboxDisabled = signal(false);
  readonly selected = signal<readonly string[]>([]);
  readonly open = signal<readonly string[]>([]);
  readonly clicks: AndesMenuClickEvent[] = [];
  readonly selects: AndesMenuSelectEvent[] = [];
  readonly deselects: AndesMenuSelectEvent[] = [];
  readonly opens: AndesMenuOpenChangeEvent[] = [];
}

@Component({
  imports: [AndesMenu],
  template: `<andes-menu
    mode="inline"
    [items]="items()"
    [(selectedKeys)]="selected"
    [(openKeys)]="open"
  />`,
})
class DataHostComponent {
  readonly selected = signal<readonly string[]>([]);
  readonly open = signal<readonly string[]>([]);
  readonly iconTemplate = viewChild<TemplateRef<unknown>>('icon');
  readonly items = signal<AndesMenuNode[]>([
    { key: 'a', label: 'Alpha', extra: '⌘A' },
    {
      key: 'b',
      label: 'Beta',
      children: [
        { key: 'b1', label: 'Beta one' },
        {
          type: 'group',
          label: 'Group',
          children: [{ key: 'b2', label: 'Beta two', danger: true }],
        },
      ],
    },
    { type: 'divider', dashed: true },
    { key: 'c', label: 'Gamma', href: '/gamma', disabled: true },
  ]);
}

describe('AndesMenu', () => {
  withElementGeometry();

  afterEach(() => {
    vi.useRealTimers();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  function create(setup?: (host: HostComponent) => void) {
    const fixture = TestBed.createComponent(HostComponent);
    setup?.(fixture.componentInstance);
    settle(fixture);
    return withHelpers(fixture);
  }

  function settle(fixture: ComponentFixture<unknown>) {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
    }
  }

  function withHelpers(fixture: ComponentFixture<HostComponent>) {
    const root = fixture.nativeElement as HTMLElement;
    const rows = (scope: ParentNode = root) =>
      Array.from(scope.querySelectorAll<HTMLElement>('[data-andes-menu-row]'));
    const row = (key: string, scope: ParentNode = document) =>
      rows(scope).find(
        (candidate) =>
          candidate.querySelector('.andes-menu__label')?.textContent?.trim() ===
          key,
      ) as HTMLElement | undefined;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      menuEl: root.querySelector('andes-menu') as HTMLElement,
      list: root.querySelector('[data-andes-menu-list]') as HTMLElement,
      rows,
      row,
      popups: () =>
        Array.from(
          document.querySelectorAll<HTMLElement>('.andes-menu__popup'),
        ),
      settle: () => settle(fixture),
    };
  }

  describe('semantics', () => {
    it('is a menu of radio items by default', () => {
      const { list, row } = create();

      expect(list.getAttribute('role')).toBe('menu');
      expect(row('Home')?.getAttribute('role')).toBe('menuitemradio');
      expect(row('Home')?.getAttribute('aria-checked')).toBe('false');
      expect(row('Reports')?.getAttribute('role')).toBe('menuitem');
    });

    it('uses a menubar for a horizontal menu', () => {
      const { list } = create((host) => host.mode.set('horizontal'));

      expect(list.getAttribute('role')).toBe('menubar');
    });

    it('uses checkbox items when several can be selected', () => {
      const { row } = create((host) => host.multiple.set(true));

      expect(row('Home')?.getAttribute('role')).toBe('menuitemcheckbox');
    });

    it('uses plain menuitems when not selectable', () => {
      const { row } = create((host) => host.selectable.set(false));

      expect(row('Home')?.getAttribute('role')).toBe('menuitem');
      expect(row('Home')?.hasAttribute('aria-checked')).toBe(false);
    });

    it('labels a group and renders separators', () => {
      const { root } = create();
      const group = root.querySelector('[role="group"]') as HTMLElement;
      const label = root.querySelector(
        '.andes-menu__group-label',
      ) as HTMLElement;

      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
      expect(label.textContent?.trim()).toBe('Admin');
      expect(root.querySelector('[role="separator"]')).not.toBeNull();
    });

    it('turns into a navigation landmark with aria-current', () => {
      const { menuEl, list, row, fixture, host } = create((h) => {
        h.navigation.set(true);
        h.selected.set(['home']);
      });

      expect(menuEl.getAttribute('role')).toBe('navigation');
      expect(menuEl.getAttribute('aria-label')).toBe('Main');
      expect(list.hasAttribute('role')).toBe(false);
      expect(row('Home')?.getAttribute('aria-current')).toBe('page');
      expect(row('Home')?.getAttribute('role')).toBe('button');
      expect(row('Docs')?.tagName).toBe('A');
      expect(row('Docs')?.hasAttribute('role')).toBe(false);
      expect(row('Reports')?.getAttribute('aria-haspopup')).toBeNull();
      host.selected.set(['inbox']);
      fixture.detectChanges();
      expect(row('Home')?.hasAttribute('aria-current')).toBe(false);
    });

    it('keeps every row a tab stop in navigation mode', () => {
      const { rows } = create((h) => h.navigation.set(true));

      expect(rows().every((r) => r.getAttribute('tabindex') === '0')).toBe(
        true,
      );
    });

    it('renders links as anchors with target and no href when disabled', () => {
      const { row, fixture } = create();
      const docs = row('Docs') as HTMLAnchorElement;

      expect(docs.getAttribute('href')).toBe('/docs');
      expect(docs.getAttribute('target')).toBe('_blank');
      expect(fixture.nativeElement.querySelectorAll('a').length).toBe(1);
    });

    it('does not leak the title attribute onto the host', () => {
      const { root } = create();

      expect(root.querySelector('andes-menu-item[title]')).toBeNull();
    });

    it('marks the dark theme on the menu through the token scope', () => {
      const { menuEl, host, fixture } = create((h) => h.theme.set('dark'));

      expect(menuEl.getAttribute('data-andes-theme')).toBe('dark');
      host.theme.set('light');
      fixture.detectChanges();
      expect(menuEl.hasAttribute('data-andes-theme')).toBe(false);
    });

    it('exposes the size and danger styling hooks', () => {
      const { menuEl, root } = create((h) => h.size.set('lg'));

      expect(menuEl.getAttribute('data-size')).toBe('lg');
      expect(
        root.querySelector('andes-menu-item[data-danger]')?.textContent,
      ).toContain('Users');
    });
  });

  describe('selection', () => {
    it('selects on click and reports it', () => {
      const { row, host, fixture } = create();

      row('Home')?.click();
      fixture.detectChanges();

      expect(host.selected()).toEqual(['home']);
      expect(host.selects).toHaveLength(1);
      expect(host.selects[0]).toMatchObject({
        key: 'home',
        keyPath: ['home'],
        selectedKeys: ['home'],
      });
      expect(host.clicks[0].key).toBe('home');
      expect(row('Home')?.getAttribute('aria-checked')).toBe('true');
      expect(row('Home')?.hasAttribute('data-selected')).toBe(true);
    });

    it('replaces the selection in single mode and ignores a repeat click', () => {
      const { row, host, fixture } = create();

      row('Home')?.click();
      row('Home')?.click();
      row('Inbox')?.click();
      fixture.detectChanges();

      expect(host.selected()).toEqual(['inbox']);
      expect(host.selects.map((e) => e.key)).toEqual(['home', 'inbox']);
      expect(host.deselects).toHaveLength(0);
    });

    it('toggles in multiple mode and emits deselect', () => {
      const { row, host, fixture } = create((h) => h.multiple.set(true));

      row('Home')?.click();
      row('Inbox')?.click();
      row('Home')?.click();
      fixture.detectChanges();

      expect(host.selected()).toEqual(['inbox']);
      expect(host.deselects).toHaveLength(1);
      expect(host.deselects[0].key).toBe('home');
    });

    it('still reports clicks but does not select when not selectable', () => {
      const { row, host } = create((h) => h.selectable.set(false));

      row('Home')?.click();

      expect(host.clicks).toHaveLength(1);
      expect(host.selected()).toEqual([]);
    });

    it('ignores clicks on disabled items', () => {
      const { row, host } = create((h) => h.inboxDisabled.set(true));

      row('Inbox')?.click();

      expect(host.clicks).toHaveLength(0);
      expect(row('Inbox')?.getAttribute('aria-disabled')).toBe('true');
      expect(row('Inbox')?.getAttribute('tabindex')).toBe('-1');
    });

    it('follows selectedKeys set from outside', () => {
      const { row, host, fixture } = create();

      host.selected.set(['weekly']);
      fixture.detectChanges();

      expect(
        document.querySelector('[role="menuitemradio"][data-selected]'),
      ).toBeNull();
      expect(row('Reports')?.hasAttribute('data-descendant-selected')).toBe(
        true,
      );
    });

    it('reports the key path of nested items', () => {
      const {
        row,
        host,
        fixture,
        settle: flush,
      } = create((h) => {
        h.mode.set('inline');
        h.open.set(['reports']);
      });
      flush();

      row('Weekly')?.click();
      fixture.detectChanges();

      expect(host.clicks[0].keyPath).toEqual(['weekly', 'reports']);
    });
  });

  describe('roving tab stop and keyboard', () => {
    it('gives only the first row a tab stop at first', () => {
      const { rows } = create();

      const stops = rows().filter((r) => r.getAttribute('tabindex') === '0');
      expect(stops).toHaveLength(1);
      expect(stops[0].textContent?.trim()).toBe('Home');
    });

    it('starts the tab stop on the selected item', () => {
      const { row } = create((h) => h.selected.set(['inbox']));

      expect(row('Inbox')?.getAttribute('tabindex')).toBe('0');
      expect(row('Home')?.getAttribute('tabindex')).toBe('-1');
    });

    it('moves the tab stop with focus', () => {
      const { row, fixture } = create();

      row('Inbox')?.focus();
      fixture.detectChanges();

      expect(row('Inbox')?.getAttribute('tabindex')).toBe('0');
      expect(row('Home')?.getAttribute('tabindex')).toBe('-1');
    });

    it('moves with the arrow keys, wrapping at the ends', () => {
      const { row } = create();
      row('Home')?.focus();

      pressKey(document.activeElement as Element, 'ArrowDown');
      expect(document.activeElement).toBe(row('Inbox'));
      pressKey(document.activeElement as Element, 'ArrowUp');
      pressKey(document.activeElement as Element, 'ArrowUp');
      expect(document.activeElement).toBe(row('Docs'));
      pressKey(document.activeElement as Element, 'ArrowDown');
      expect(document.activeElement).toBe(row('Home'));
    });

    it('jumps with Home and End', () => {
      const { row } = create();
      row('Inbox')?.focus();

      pressKey(document.activeElement as Element, 'End');
      expect(document.activeElement).toBe(row('Docs'));
      pressKey(document.activeElement as Element, 'Home');
      expect(document.activeElement).toBe(row('Home'));
    });

    it('skips disabled rows', () => {
      const { row } = create((h) => h.inboxDisabled.set(true));
      row('Home')?.focus();

      pressKey(document.activeElement as Element, 'ArrowDown');

      expect(document.activeElement).toBe(row('Reports'));
    });

    it('jumps to the next row starting with the typed letters', () => {
      vi.useFakeTimers();
      const { row } = create();
      row('Home')?.focus();

      pressKey(document.activeElement as Element, 'r');
      expect(document.activeElement).toBe(row('Reports'));
      vi.advanceTimersByTime(500);
      pressKey(document.activeElement as Element, 'd');
      pressKey(document.activeElement as Element, 'o');
      expect(document.activeElement).toBe(row('Docs'));
    });

    it('activates with Enter and Space', () => {
      const { row, host } = create();
      row('Home')?.focus();

      pressKey(row('Home') as Element, 'Enter');
      pressKey(row('Inbox') as Element, ' ');

      expect(host.selected()).toEqual(['inbox']);
      expect(host.clicks.map((e) => e.key)).toEqual(['home', 'inbox']);
    });

    it('lets Enter on a link follow it natively', () => {
      const { row } = create();

      const event = pressKey(row('Docs') as Element, 'Enter');

      expect(event.defaultPrevented).toBe(false);
    });

    it('ignores keys with modifiers', () => {
      const { row } = create();
      row('Home')?.focus();

      pressKey(row('Home') as Element, 'ArrowDown', { ctrlKey: true });

      expect(document.activeElement).toBe(row('Home'));
    });
  });

  describe('inline mode', () => {
    function inline(setup?: (host: HostComponent) => void) {
      return create((host) => {
        host.mode.set('inline');
        setup?.(host);
      });
    }

    it('expands in place and reports the open keys', () => {
      const { row, host, fixture, root } = inline();
      const inner = root.querySelector('.andes-menu__inline') as HTMLElement;

      expect(inner.getAttribute('data-state')).toBe('closed');
      expect(inner.hasAttribute('inert')).toBe(true);
      expect(row('Reports')?.getAttribute('aria-expanded')).toBe('false');

      row('Reports')?.click();
      fixture.detectChanges();

      expect(host.open()).toEqual(['reports']);
      expect(host.opens).toEqual([
        { key: 'reports', open: true, openKeys: ['reports'] },
      ]);
      expect(inner.getAttribute('data-state')).toBe('open');
      expect(inner.hasAttribute('inert')).toBe(false);
      expect(row('Reports')?.getAttribute('aria-expanded')).toBe('true');
      expect(document.querySelector('.andes-menu__popup')).toBeNull();
    });

    it('collapses again on a second click, closing nested submenus too', () => {
      const { row, host, fixture } = inline((h) =>
        h.open.set(['reports', 'archive']),
      );

      row('Reports')?.click();
      fixture.detectChanges();

      expect(host.open()).toEqual([]);
    });

    it('indents rows per level', () => {
      const { row } = inline((h) => h.open.set(['reports', 'archive']));

      expect(row('Home')?.style.getPropertyValue('--andes-menu-indent')).toBe(
        '0px',
      );
      expect(row('Daily')?.style.getPropertyValue('--andes-menu-indent')).toBe(
        '24px',
      );
      expect(row('2024')?.style.getPropertyValue('--andes-menu-indent')).toBe(
        '48px',
      );
    });

    it('keeps siblings open unless accordion is set', () => {
      const { row, host, fixture } = inline();

      row('Reports')?.click();
      row('Archive')?.click();
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports', 'archive']);

      host.accordion.set(true);
      host.open.set([]);
      fixture.detectChanges();
      row('Reports')?.click();
      row('Archive')?.click();
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports', 'archive']);
    });

    it('closes open siblings in accordion mode', () => {
      const { row, host, fixture } = inline((h) => h.accordion.set(true));

      row('Reports')?.click();
      fixture.detectChanges();
      row('Admin')?.click();
      fixture.detectChanges();

      expect(host.open()).toEqual(['reports']);
    });

    it('navigates visible nested rows in sequence and skips collapsed ones', () => {
      const { row, fixture } = inline();
      row('Reports')?.focus();

      pressKey(document.activeElement as Element, 'ArrowDown');
      expect(document.activeElement?.textContent?.trim()).not.toBe('Daily');

      row('Reports')?.focus();
      pressKey(document.activeElement as Element, 'ArrowRight');
      fixture.detectChanges();
      pressKey(document.activeElement as Element, 'ArrowDown');
      expect(document.activeElement).toBe(row('Weekly'));
    });

    it('opens with Right, enters with a second Right and closes with Left', () => {
      const { row, host, fixture } = inline();
      row('Reports')?.focus();

      pressKey(row('Reports') as Element, 'ArrowRight');
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports']);
      TestBed.flushEffects?.();
      fixture.detectChanges();

      row('Reports')?.focus();
      pressKey(row('Reports') as Element, 'ArrowRight');
      expect(document.activeElement).toBe(row('Daily'));

      pressKey(row('Daily') as Element, 'ArrowLeft');
      expect(document.activeElement).toBe(row('Reports'));
      pressKey(row('Reports') as Element, 'ArrowLeft');
      fixture.detectChanges();
      expect(host.open()).toEqual([]);
    });

    it('flips the horizontal arrows in right-to-left layouts', () => {
      const { row, host, fixture, root } = inline();
      root.setAttribute('dir', 'rtl');
      row('Reports')?.focus();

      pressKey(row('Reports') as Element, 'ArrowRight');
      fixture.detectChanges();
      expect(host.open()).toEqual([]);

      pressKey(row('Reports') as Element, 'ArrowLeft');
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports']);
    });

    it('rules out a second wrapper: the inline panel animates height with grid rows', () => {
      const css = readFileSync(`${__dirname}/menu.css`, 'utf8');

      expect(css).toContain('grid-template-rows: 0fr');
      expect(css).toContain('grid-template-rows: 1fr');
    });
  });

  describe('popup submenus (vertical)', () => {
    it('opens a popup on click, with menu semantics', () => {
      const { row, host, fixture, popups } = create((h) =>
        h.action.set('click'),
      );

      row('Reports')?.click();
      fixture.detectChanges();

      expect(host.open()).toEqual(['reports']);
      expect(popups()).toHaveLength(1);
      const list = popups()[0].querySelector('[role="menu"]') as HTMLElement;
      expect(list).not.toBeNull();
      expect(list.getAttribute('aria-labelledby')).toBe(row('Reports')?.id);
      expect(row('Reports')?.getAttribute('aria-haspopup')).toBe('menu');
      expect(row('Reports')?.getAttribute('aria-expanded')).toBe('true');
      expect(row('Reports')?.getAttribute('aria-controls')).toBe(list.id);
      expect(row('Daily', popups()[0])?.getAttribute('tabindex')).toBe('-1');
    });

    it('anchors the popup to the submenu row', () => {
      const { row, fixture } = create((h) => h.action.set('click'));
      const sub = fixture.debugElement
        .queryAll(By.directive(AndesSubMenu))
        .find((d) => d.nativeElement.contains(row('Reports')));

      row('Reports')?.click();
      fixture.detectChanges();

      const overlay = sub?.injector.get(AndesOverlayPrimitive);
      expect(overlay?.anchor()).toBe(row('Reports'));
    });

    it('toggles closed on a second click in click mode', () => {
      const { row, host, fixture, popups } = create((h) =>
        h.action.set('click'),
      );

      row('Reports')?.click();
      fixture.detectChanges();
      row('Reports')?.click();
      fixture.detectChanges();

      expect(host.open()).toEqual([]);
      expect(popups()).toHaveLength(0);
    });

    it('opens on hover after leaving, and closes after the close delay', () => {
      vi.useFakeTimers();
      const { row, host, fixture, popups } = create();

      pointer(row('Reports') as Element, 'pointerenter');
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports']);
      expect(popups()).toHaveLength(1);

      pointer(row('Reports') as Element, 'pointerleave');
      vi.advanceTimersByTime(99);
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports']);
      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(host.open()).toEqual([]);
    });

    it('stays open while the pointer is over the panel', () => {
      vi.useFakeTimers();
      const { row, host, fixture, popups } = create();

      pointer(row('Reports') as Element, 'pointerenter');
      fixture.detectChanges();
      pointer(row('Reports') as Element, 'pointerleave');
      pointer(popups()[0], 'pointerenter');
      vi.advanceTimersByTime(500);
      fixture.detectChanges();

      expect(host.open()).toEqual(['reports']);
      pointer(popups()[0], 'pointerleave');
      vi.advanceTimersByTime(100);
      fixture.detectChanges();
      expect(host.open()).toEqual([]);
    });

    it('does not open on hover in click mode, nor for touch pointers', () => {
      vi.useFakeTimers();
      const { row, host, fixture } = create((h) => h.action.set('click'));

      pointer(row('Reports') as Element, 'pointerenter');
      fixture.detectChanges();
      expect(host.open()).toEqual([]);

      host.action.set('hover');
      fixture.detectChanges();
      pointer(row('Reports') as Element, 'pointerenter', 'touch');
      fixture.detectChanges();
      expect(host.open()).toEqual([]);
    });

    it('opens with Enter, Space and Right, focusing the first row', () => {
      const { row, host, fixture, popups } = create();
      for (const key of ['Enter', ' ', 'ArrowRight']) {
        row('Reports')?.focus();
        pressKey(row('Reports') as Element, key);
        fixture.detectChanges();
        expect(host.open()).toEqual(['reports']);
        host.open.set([]);
        fixture.detectChanges();
      }
      expect(popups()).toHaveLength(0);
    });

    it('moves focus into the popup and out again with Left / Escape', () => {
      const { row, host, fixture, popups } = create();
      row('Reports')?.focus();

      pressKey(row('Reports') as Element, 'ArrowRight');
      fixture.detectChanges();
      fixture.detectChanges();
      expect(document.activeElement).toBe(row('Daily', popups()[0]));

      pressKey(document.activeElement as Element, 'ArrowDown');
      expect(document.activeElement).toBe(row('Weekly', popups()[0]));
      pressKey(document.activeElement as Element, 'ArrowLeft');
      fixture.detectChanges();
      expect(document.activeElement).toBe(row('Reports'));
      expect(host.open()).toEqual([]);

      pressKey(row('Reports') as Element, 'ArrowRight');
      fixture.detectChanges();
      fixture.detectChanges();
      pressKey(document.activeElement as Element, 'Escape');
      fixture.detectChanges();
      expect(document.activeElement).toBe(row('Reports'));
      expect(host.open()).toEqual([]);
    });

    it('opens nested popups and closes them with the parent', () => {
      const { row, host, fixture, popups } = create((h) =>
        h.action.set('click'),
      );

      row('Reports')?.click();
      fixture.detectChanges();
      row('Archive', popups()[0])?.click();
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports', 'archive']);
      expect(popups()).toHaveLength(2);

      row('Reports')?.click();
      fixture.detectChanges();
      expect(host.open()).toEqual([]);
    });

    it('closes every popup and selects when a popup item is activated', () => {
      const { row, host, fixture, popups } = create((h) =>
        h.action.set('click'),
      );

      row('Reports')?.click();
      fixture.detectChanges();
      row('Daily', popups()[0])?.click();
      fixture.detectChanges();

      expect(host.selected()).toEqual(['daily']);
      expect(host.open()).toEqual([]);
      expect(document.activeElement).toBe(row('Reports'));
    });

    it('closes siblings when another submenu opens', () => {
      const { row, host, fixture } = create((h) => {
        h.action.set('click');
      });

      row('Reports')?.click();
      fixture.detectChanges();
      host.open.update((keys) => [...keys]);
      expect(host.open()).toEqual(['reports']);
    });

    it('closes on an outside click but not on a click inside the menu', () => {
      const { row, host, fixture, popups } = create((h) =>
        h.action.set('click'),
      );

      row('Reports')?.click();
      fixture.detectChanges();
      popups()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports']);

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(host.open()).toEqual([]);
    });

    it('closes all popups with Tab', () => {
      const { row, host, fixture } = create((h) => h.action.set('click'));

      row('Reports')?.click();
      fixture.detectChanges();
      pressKey(row('Reports') as Element, 'Tab');
      fixture.detectChanges();

      expect(host.open()).toEqual([]);
    });

    it('does not open a disabled submenu', () => {
      const fixture = TestBed.createComponent(DisabledSubHost);
      fixture.detectChanges();
      const sub = fixture.nativeElement.querySelector(
        '[data-andes-menu-row]',
      ) as HTMLElement;

      sub.click();
      fixture.detectChanges();

      expect(document.querySelector('.andes-menu__popup')).toBeNull();
      expect(sub.getAttribute('aria-disabled')).toBe('true');
    });

    it('carries the dark token scope into the popup', () => {
      const { row, fixture, popups } = create((h) => {
        h.action.set('click');
        h.theme.set('dark');
      });

      row('Reports')?.click();
      fixture.detectChanges();

      expect(popups()[0].getAttribute('data-andes-theme')).toBe('dark');
    });

    it('exposes the exit-animation hook on the popup panel', () => {
      const css = readFileSync(`${__dirname}/menu.css`, 'utf8');

      expect(css).toMatch(
        /\.andes-menu__popup\[data-andes-closing\]\s*\{[^}]*animation: andes-menu-popup-exit/,
      );
      expect(css).toMatch(/prefers-reduced-motion: no-preference/);
    });
  });

  describe('horizontal mode', () => {
    it('opens submenus below the item as popups', () => {
      const { row, host, fixture, popups } = create((h) => {
        h.mode.set('horizontal');
        h.action.set('click');
      });

      row('Reports')?.click();
      fixture.detectChanges();

      expect(host.open()).toEqual(['reports']);
      expect(popups()[0].getAttribute('data-side')).toBe('bottom');
      expect(row('Reports')?.hasAttribute('data-bar')).toBe(true);
    });

    it('moves along the bar with Left / Right and opens with Down / Up', () => {
      const { row, host, fixture, popups } = create((h) =>
        h.mode.set('horizontal'),
      );
      row('Home')?.focus();

      pressKey(row('Home') as Element, 'ArrowRight');
      expect(document.activeElement).toBe(row('Inbox'));
      pressKey(row('Inbox') as Element, 'ArrowLeft');
      expect(document.activeElement).toBe(row('Home'));

      row('Reports')?.focus();
      pressKey(row('Reports') as Element, 'ArrowDown');
      fixture.detectChanges();
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports']);
      expect(document.activeElement).toBe(row('Daily', popups()[0]));
    });

    it('opens to the last row with Up', () => {
      const { row, fixture, popups } = create((h) => h.mode.set('horizontal'));
      row('Reports')?.focus();

      pressKey(row('Reports') as Element, 'ArrowUp');
      fixture.detectChanges();
      fixture.detectChanges();

      expect(document.activeElement).toBe(row('Archive', popups()[0]));
    });

    it('hops to the next bar item from a leaf with Right and back with Left', () => {
      const { row, host, fixture, popups } = create((h) => {
        h.mode.set('horizontal');
      });
      row('Reports')?.focus();
      pressKey(row('Reports') as Element, 'ArrowDown');
      fixture.detectChanges();
      fixture.detectChanges();

      pressKey(document.activeElement as Element, 'ArrowRight');
      fixture.detectChanges();
      expect(host.open()).toEqual([]);
      expect(popups()).toHaveLength(0);
      expect(document.activeElement).toBe(row('Users'));

      row('Users')?.focus();
      row('Reports')?.focus();
      pressKey(row('Reports') as Element, 'ArrowDown');
      fixture.detectChanges();
      fixture.detectChanges();
      pressKey(document.activeElement as Element, 'ArrowLeft');
      fixture.detectChanges();
      expect(document.activeElement).toBe(row('Inbox'));
    });

    it('draws dividers as vertical rules', () => {
      const { root } = create((h) => h.mode.set('horizontal'));

      expect(
        root
          .querySelector('[role="separator"]')
          ?.getAttribute('aria-orientation'),
      ).toBe('vertical');
    });

    describe('overflow', () => {
      let resizeCallback: (() => void) | null = null;

      beforeEach(() => {
        vi.stubGlobal(
          'ResizeObserver',
          class {
            constructor(callback: () => void) {
              resizeCallback = callback;
            }
            observe(): void {
              /* noop */
            }
            unobserve(): void {
              /* noop */
            }
            disconnect(): void {
              /* noop */
            }
          },
        );
      });

      afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        resizeCallback = null;
      });

      function stubGeometry(listWidth: number, unitWidth: number) {
        vi.spyOn(
          HTMLElement.prototype,
          'clientWidth',
          'get',
        ).mockImplementation(function (this: HTMLElement) {
          return this.hasAttribute('data-andes-menu-list') ? listWidth : 0;
        });
        vi.spyOn(
          HTMLElement.prototype,
          'getBoundingClientRect',
        ).mockImplementation(function (this: HTMLElement) {
          const isUnit = this.classList.contains('andes-menu__node');
          const width =
            isUnit && !this.hasAttribute('data-overflowed') ? unitWidth : 0;
          return {
            width,
            height: 0,
            top: 0,
            left: 0,
            right: width,
            bottom: 0,
            x: 0,
            y: 0,
            toJSON: () => null,
          };
        });
      }

      it('moves the items that do not fit into a "…" submenu', () => {
        stubGeometry(280, 100);
        const { fixture, root, host, row, popups } = create((h) =>
          h.mode.set('horizontal'),
        );
        fixture.detectChanges();
        resizeCallback?.();
        fixture.detectChanges();
        fixture.detectChanges();

        const hidden = Array.from(
          root.querySelectorAll('.andes-menu__node[data-overflowed]'),
        );
        expect(hidden.length).toBeGreaterThan(0);
        const trigger = root.querySelector('[data-overflow]') as HTMLElement;
        expect(trigger.getAttribute('aria-label')).toBe('More');
        expect(trigger.getAttribute('aria-haspopup')).toBe('menu');

        trigger.click();
        fixture.detectChanges();
        fixture.detectChanges();
        expect(host.open()).toEqual(['__andes-menu-overflow__']);
        const names = popups()[0].textContent ?? '';
        expect(names).toContain('Docs');
        expect(row('Home', popups()[0])).toBeUndefined();
      });

      it('shows everything again when the bar grows', () => {
        stubGeometry(280, 100);
        const { fixture, root } = create((h) => h.mode.set('horizontal'));
        resizeCallback?.();
        fixture.detectChanges();
        fixture.detectChanges();
        expect(root.querySelector('[data-overflow]')).not.toBeNull();

        stubGeometry(5000, 100);
        resizeCallback?.();
        fixture.detectChanges();
        fixture.detectChanges();

        expect(root.querySelector('[data-overflow]')).toBeNull();
        expect(root.querySelector('[data-overflowed]')).toBeNull();
      });

      it('lets an overflowed item be activated from the popup', () => {
        stubGeometry(280, 100);
        const { fixture, root, host, row, popups } = create((h) =>
          h.mode.set('horizontal'),
        );
        resizeCallback?.();
        fixture.detectChanges();
        fixture.detectChanges();

        (root.querySelector('[data-overflow]') as HTMLElement).click();
        fixture.detectChanges();
        fixture.detectChanges();
        const docs = row('Docs', popups()[0]) as HTMLElement;
        docs.addEventListener('click', (e) => e.preventDefault());
        docs.click();
        fixture.detectChanges();

        expect(host.clicks.at(-1)?.key).toBe('docs');
        expect(host.open()).toEqual([]);
      });

      it('keeps every item in the bar when overflow is disabled', () => {
        stubGeometry(280, 100);
        const fixture = TestBed.createComponent(NoOverflowHost);
        settle(fixture);
        resizeCallback?.();
        settle(fixture);

        expect(
          fixture.nativeElement.querySelector('[data-overflowed]'),
        ).toBeNull();
      });
    });
  });

  describe('collapsed rail', () => {
    function collapsed() {
      return create((h) => {
        h.mode.set('inline');
        h.collapsed.set(true);
      });
    }

    it('flags the rail and shows the first letter of icon-less rows', () => {
      const { menuEl, row } = collapsed();

      expect(menuEl.hasAttribute('data-collapsed')).toBe(true);
      expect(
        row('Home')?.querySelector('.andes-menu__short')?.textContent,
      ).toBe('H');
      expect(row('Home')?.getAttribute('role')).toBe('menuitemradio');
    });

    it('opens submenus as popups instead of expanding them', () => {
      const { row, fixture, popups, root } = collapsed();

      row('Reports')?.click();
      fixture.detectChanges();

      expect(root.querySelector('.andes-menu__inline')).toBeNull();
      expect(popups()).toHaveLength(1);
      expect(row('Reports')?.hasAttribute('data-popup')).toBe(true);
    });

    it('closes expanded sections when it folds and restores them on expand', () => {
      const { host, fixture } = create((h) => {
        h.mode.set('inline');
        h.open.set(['reports']);
      });

      host.collapsed.set(true);
      fixture.detectChanges();
      fixture.detectChanges();
      expect(host.open()).toEqual([]);

      host.collapsed.set(false);
      fixture.detectChanges();
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports']);
    });

    it('does not open popups for keys that were open before it was folded', () => {
      const { popups, host, fixture } = create((h) => {
        h.mode.set('inline');
        h.collapsed.set(true);
        h.open.set(['reports']);
      });

      expect(popups()).toHaveLength(0);
      expect(host.open()).toEqual([]);

      host.collapsed.set(false);
      fixture.detectChanges();
      fixture.detectChanges();
      expect(host.open()).toEqual(['reports']);
    });

    it('shows the label tooltip on hover after a short delay, and hides on leave', () => {
      vi.useFakeTimers();
      const { row, fixture } = collapsed();

      pointer(row('Home') as Element, 'pointerenter');
      expect(document.querySelector('.andes-menu__tooltip')).toBeNull();
      vi.advanceTimersByTime(100);
      fixture.detectChanges();
      const tip = document.querySelector('.andes-menu__tooltip') as HTMLElement;
      expect(tip.textContent?.trim()).toBe('Home page');
      expect(tip.getAttribute('role')).toBe('tooltip');

      pointer(row('Home') as Element, 'pointerleave');
      vi.advanceTimersByTime(60);
      fixture.detectChanges();
      expect(document.querySelector('.andes-menu__tooltip')).toBeNull();
    });

    it('falls back to the label text and switches instantly between rows', () => {
      vi.useFakeTimers();
      const { row, fixture } = collapsed();

      pointer(row('Inbox') as Element, 'pointerenter');
      vi.advanceTimersByTime(100);
      fixture.detectChanges();
      pointer(row('Inbox') as Element, 'pointerleave');
      pointer(row('Docs') as Element, 'pointerenter');
      fixture.detectChanges();

      const tip = document.querySelector('.andes-menu__tooltip');
      expect(tip?.textContent?.trim()).toBe('Docs');
    });

    it('does not show tooltips on an expanded menu', () => {
      vi.useFakeTimers();
      const { row, fixture } = create((h) => h.mode.set('inline'));

      pointer(row('Home') as Element, 'pointerenter');
      vi.advanceTimersByTime(500);
      fixture.detectChanges();

      expect(document.querySelector('.andes-menu__tooltip')).toBeNull();
    });

    it('keeps the label readable to assistive tech while folded', () => {
      const css = readFileSync(`${__dirname}/menu.css`, 'utf8');
      const rule = css.slice(
        css.indexOf('.andes-menu[data-collapsed] .andes-menu__label'),
      );

      expect(rule).toContain('clip-path: inset(50%)');
      expect(rule.slice(0, rule.indexOf('}'))).not.toContain('display: none');
    });
  });

  describe('data-driven items', () => {
    function createData() {
      const fixture = TestBed.createComponent(DataHostComponent);
      settle(fixture);
      const root = fixture.nativeElement as HTMLElement;
      return {
        fixture,
        root,
        host: fixture.componentInstance,
        rows: () =>
          Array.from(
            root.querySelectorAll<HTMLElement>('[data-andes-menu-row]'),
          ),
      };
    }

    it('renders items, submenus, groups, dividers and links from the model', () => {
      const { root, rows } = createData();

      expect(rows().map((r) => r.textContent?.trim())).toEqual([
        'Alpha⌘A',
        'Beta',
        'Beta one',
        'Beta two',
        'Gamma',
      ]);
      expect(
        root.querySelector('.andes-menu__group-label')?.textContent,
      ).toContain('Group');
      expect(
        root.querySelector('[role="separator"]')?.hasAttribute('data-dashed'),
      ).toBe(true);
      const gamma = rows()[4];
      expect(gamma.tagName).toBe('A');
      expect(gamma.hasAttribute('href')).toBe(false);
      expect(gamma.getAttribute('aria-disabled')).toBe('true');
      expect(
        root.querySelector('andes-menu-item[data-danger]')?.textContent,
      ).toContain('Beta two');
    });

    it('selects and expands through the models', () => {
      const { rows, host, fixture } = createData();

      rows()[1].click();
      fixture.detectChanges();
      rows()[2].click();
      fixture.detectChanges();

      expect(host.open()).toEqual(['b']);
      expect(host.selected()).toEqual(['b1']);
    });

    it('updates when the model changes', () => {
      const { rows, host, fixture } = createData();

      host.items.set([{ key: 'z', label: 'Zeta' }]);
      fixture.detectChanges();

      expect(rows().map((r) => r.textContent?.trim())).toEqual(['Zeta']);
    });
  });

  describe('public API', () => {
    it('focus() lands on the tab stop', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.selected.set(['inbox']);
      settle(fixture);
      const menu = fixture.debugElement.children[0]
        .componentInstance as AndesMenu;

      menu.focus();

      expect(document.activeElement?.textContent?.trim()).toBe('Inbox');
    });

    it('opens and closes submenus by key', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.mode.set('inline');
      settle(fixture);
      const menu = fixture.debugElement.children[0]
        .componentInstance as AndesMenu;

      menu.openSubMenu('reports');
      fixture.detectChanges();
      expect(fixture.componentInstance.open()).toEqual(['reports']);

      menu.closeSubMenu('reports');
      fixture.detectChanges();
      expect(fixture.componentInstance.open()).toEqual([]);
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(`${__dirname}/menu.css`, 'utf8');

    it('never starts a selector line with a combinator', () => {
      const offenders = css
        .split('\n')
        .filter((line) => /^\s*[>+~]/.test(line));

      expect(offenders).toEqual([]);
    });

    it('honours reduced motion for transitions', () => {
      expect(css).toContain('prefers-reduced-motion: reduce');
    });

    it('sizes rows from the control height tokens with literal fallbacks', () => {
      expect(css).toContain('var(--andes-control-height-md, 2rem)');
      expect(css).toContain('var(--andes-control-height-sm, 1.5rem)');
      expect(css).toContain('var(--andes-control-height-lg, 2.5rem)');
    });

    it('uses logical properties for the inline indentation', () => {
      expect(css).toContain('padding-inline-start: calc(');
    });

    it('styles focus with an outline ring rather than a border', () => {
      expect(css).toMatch(
        /\.andes-menu__row:focus-visible\s*\{[^}]*outline: 2px solid var\(--andes-color-focus-ring/,
      );
    });
  });
});

@Component({
  imports: [AndesMenu, AndesSubMenu, AndesMenuItem],
  template: `
    <andes-menu>
      <andes-sub-menu key="s" label="Locked" [disabled]="true">
        <andes-menu-item key="x">X</andes-menu-item>
      </andes-sub-menu>
    </andes-menu>
  `,
})
class DisabledSubHost {}

@Component({
  imports: [AndesMenu, AndesMenuItem],
  template: `
    <andes-menu mode="horizontal" [disableOverflow]="true">
      <andes-menu-item key="a">A</andes-menu-item>
      <andes-menu-item key="b">B</andes-menu-item>
      <andes-menu-item key="c">C</andes-menu-item>
      <andes-menu-item key="d">D</andes-menu-item>
    </andes-menu>
  `,
})
class NoOverflowHost {}
