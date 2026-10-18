import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesDropdownMenuCheckboxItem } from '../dropdown-menu/dropdown-menu-checkbox-item';
import { AndesDropdownMenuItem } from '../dropdown-menu/dropdown-menu-item';
import { AndesDropdownMenuLabel } from '../dropdown-menu/dropdown-menu-label';
import { AndesDropdownMenuRadioItem } from '../dropdown-menu/dropdown-menu-radio-item';
import { AndesDropdownMenuSeparator } from '../dropdown-menu/dropdown-menu-separator';
import { AndesDropdownMenuShortcut } from '../dropdown-menu/dropdown-menu-shortcut';
import { AndesDropdownMenuSub } from '../dropdown-menu/dropdown-menu-sub';
import { AndesDropdownMenuSubContent } from '../dropdown-menu/dropdown-menu-sub-content';
import { AndesDropdownMenuSubTrigger } from '../dropdown-menu/dropdown-menu-sub-trigger';
import type { AndesDropdownMenuItemDef } from '../dropdown-menu/dropdown-menu-types';
import { AndesContextMenu } from './context-menu';
import { AndesContextMenuTrigger } from './context-menu-trigger';
import type {
  AndesContextMenuClickEvent,
  AndesContextMenuOpenChange,
} from './context-menu-types';

/**
 * jsdom reports zero geometry for every element, which makes CDK's
 * `InteractivityChecker` treat them all as invisible and therefore untabbable.
 */
function withElementGeometry() {
  const descriptors = (['offsetWidth', 'offsetHeight'] as const).map(
    (prop) =>
      [
        prop,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop),
      ] as const,
  );

  beforeAll(() => {
    for (const [prop] of descriptors) {
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get: () => 1,
      });
    }
  });

  afterAll(() => {
    for (const [prop, descriptor] of descriptors) {
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

/** `ListKeyManager` reads the deprecated-but-universal `KeyboardEvent.keyCode`. */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
  Tab: 9,
  Enter: 13,
  Escape: 27,
  F10: 121,
  ContextMenu: 93,
  ' ': 32,
};

function pressKey(
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, 'keyCode', {
    get: () => KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0),
  });
  target.dispatchEvent(event);
  return event;
}

/** jsdom has no `PointerEvent` constructor; a `MouseEvent` carries everything used. */
function pointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: { x?: number; y?: number; pointerType?: string } = {},
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
  });
  Object.defineProperties(event, {
    pointerType: { get: () => init.pointerType ?? 'mouse' },
    pointerId: { get: () => 1 },
    isPrimary: { get: () => true },
  });
  target.dispatchEvent(event);
}

function rightClick(
  target: EventTarget,
  x = 0,
  y = 0,
  init: MouseEventInit = {},
): MouseEvent {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    clientX: x,
    clientY: y,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

async function settle(fixture: ComponentFixture<unknown>, ms = 0) {
  fixture.detectChanges();
  await fixture.whenStable();
  await sleep(ms);
  fixture.detectChanges();
  await fixture.whenStable();
}

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const itemByText = (text: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[role^="menuitem"]')).find(
    (item) => item.textContent?.includes(text),
  ) as HTMLElement;
const menus = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'));

// ---------------------------------------------------------------------------

@Component({
  imports: [
    AndesContextMenu,
    AndesContextMenuTrigger,
    AndesDropdownMenuItem,
    AndesDropdownMenuCheckboxItem,
    AndesDropdownMenuRadioItem,
    AndesDropdownMenuSeparator,
    AndesDropdownMenuLabel,
    AndesDropdownMenuShortcut,
    AndesDropdownMenuSub,
    AndesDropdownMenuSubTrigger,
    AndesDropdownMenuSubContent,
  ],
  template: `
    <button type="button" id="outside">Outside</button>
    <andes-context-menu
      [(open)]="open"
      [disabled]="disabled()"
      [autoFocus]="autoFocus()"
      [longPressDelay]="longPressDelay()"
      [closeOnScroll]="closeOnScroll()"
      (openStateChange)="changes.push($event)"
      (itemClick)="clicks.push($event)"
    >
      <div
        id="area"
        tabindex="0"
        andesContextMenuTrigger
        [andesContextMenuContext]="{ id: 7 }"
        [andesContextMenuDisabled]="areaDisabled()"
      >
        <span id="inner">Right-click me</span>
      </div>

      <andes-dropdown-menu-item key="copy" id="copy">
        Copy
        <andes-dropdown-menu-shortcut>⌘C</andes-dropdown-menu-shortcut>
      </andes-dropdown-menu-item>
      <andes-dropdown-menu-item key="paste" id="paste" [disabled]="true">
        Paste
      </andes-dropdown-menu-item>
      <andes-dropdown-menu-item key="rename" id="rename">
        Rename
      </andes-dropdown-menu-item>
      <andes-dropdown-menu-separator />
      <andes-dropdown-menu-checkbox-item id="hidden" [(checked)]="hidden">
        Show hidden
      </andes-dropdown-menu-checkbox-item>
      <andes-dropdown-menu-label>View</andes-dropdown-menu-label>
      <andes-dropdown-menu-radio-item id="viewList" name="view" value="list">
        List
      </andes-dropdown-menu-radio-item>
      <andes-dropdown-menu-radio-item id="viewGrid" name="view" value="grid">
        Grid
      </andes-dropdown-menu-radio-item>
      <andes-dropdown-menu-sub key="share">
        <andes-dropdown-menu-sub-trigger id="shareTrigger">
          Share
        </andes-dropdown-menu-sub-trigger>
        <andes-dropdown-menu-sub-content>
          <andes-dropdown-menu-item key="email" id="email">
            Email
          </andes-dropdown-menu-item>
        </andes-dropdown-menu-sub-content>
      </andes-dropdown-menu-sub>
      <andes-dropdown-menu-item key="delete" id="delete" variant="destructive">
        Delete
      </andes-dropdown-menu-item>
    </andes-context-menu>
  `,
})
class HostComponent {
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly areaDisabled = signal(false);
  readonly autoFocus = signal(true);
  readonly longPressDelay = signal(30);
  readonly closeOnScroll = signal(true);
  readonly hidden = signal(false);
  readonly changes: AndesContextMenuOpenChange[] = [];
  readonly clicks: AndesContextMenuClickEvent[] = [];
}

@Component({
  imports: [AndesContextMenu, AndesContextMenuTrigger],
  template: `
    <andes-context-menu
      #menu="andesContextMenu"
      [items]="items"
      [selectable]="true"
      [(selectedKeys)]="selected"
      (itemClick)="clicks.push($event)"
    />
    <section
      id="outer"
      [andesContextMenuTrigger]="menu"
      [andesContextMenuContext]="'outer'"
    >
      <p id="outerText">Outer</p>
      <div
        id="rowA"
        [andesContextMenuTrigger]="menu"
        [andesContextMenuContext]="'row-a'"
      >
        Row A
      </div>
      <div
        id="rowB"
        [andesContextMenuTrigger]="menu"
        [andesContextMenuContext]="'row-b'"
      >
        Row B
      </div>
    </section>
  `,
})
class BoundHostComponent {
  readonly items: readonly AndesDropdownMenuItemDef[] = [
    { key: 'open', label: 'Open' },
    { key: 'archive', label: 'Archive' },
    { type: 'divider' },
    { key: 'remove', label: 'Remove', danger: true },
  ];
  readonly selected = signal<readonly string[]>([]);
  readonly clicks: AndesContextMenuClickEvent[] = [];
}

describe('AndesContextMenu', () => {
  withElementGeometry();

  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    document
      .querySelectorAll('.andes-context-menu__anchor')
      .forEach((anchor) => anchor.remove());
  });

  const area = () => byId('area');
  const anchor = () =>
    document.querySelector<HTMLElement>('.andes-context-menu__anchor');

  async function openWithRightClick(x = 120, y = 80) {
    const event = rightClick(area(), x, y);
    await settle(fixture);
    return event;
  }

  describe('opening', () => {
    it('stays closed until asked', () => {
      expect(menus()).toHaveLength(0);
    });

    it('opens on right-click at the pointer and suppresses the native menu', async () => {
      const event = await openWithRightClick(120, 80);

      expect(event.defaultPrevented).toBe(true);
      expect(menus()).toHaveLength(1);
      expect(host.open()).toBe(true);
      expect(host.changes).toEqual([{ open: true, source: 'context-menu' }]);
      expect(anchor()?.style.left).toBe('120px');
      expect(anchor()?.style.top).toBe('80px');
    });

    it('opens from a right-click on a descendant of the area', async () => {
      rightClick(byId('inner'), 5, 6);
      await settle(fixture);

      expect(menus()).toHaveLength(1);
    });

    it('anchors the panel below and aligned to the start of the point', async () => {
      await openWithRightClick();
      const pane = document.querySelector('.andes-overlay-pane');
      const panel = menus()[0];

      expect(pane).toBeTruthy();
      expect(panel.getAttribute('data-side')).toBe('bottom');
      expect(panel.getAttribute('data-align')).toBe('start');
    });

    it('does not open on a left click', async () => {
      area().click();
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('leaves the native menu alone outside the area', async () => {
      const event = rightClick(byId('outside'), 4, 4);
      await settle(fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(menus()).toHaveLength(0);
    });

    it('leaves the native menu alone while the menu is disabled', async () => {
      host.disabled.set(true);
      await settle(fixture);

      const event = rightClick(area(), 1, 1);
      await settle(fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(menus()).toHaveLength(0);
    });

    it('leaves the native menu alone while the area is disabled', async () => {
      host.areaDisabled.set(true);
      await settle(fixture);

      const event = rightClick(area(), 1, 1);
      await settle(fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(menus()).toHaveLength(0);
      expect(area().hasAttribute('data-disabled')).toBe(true);
    });

    it('closes when it becomes disabled while open', async () => {
      await openWithRightClick();
      host.disabled.set(true);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
      expect(host.open()).toBe(false);
    });

    it('moves to the new point on a second right-click instead of stacking', async () => {
      await openWithRightClick(10, 10);
      rightClick(area(), 50, 60);
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      expect(
        document.querySelectorAll('.andes-context-menu__anchor'),
      ).toHaveLength(1);
      expect(anchor()?.style.left).toBe('50px');
      expect(anchor()?.style.top).toBe('60px');
      expect(host.changes).toEqual([{ open: true, source: 'context-menu' }]);
    });

    it('removes its point anchor when closed', async () => {
      await openWithRightClick();
      pressKey(document.body, 'Escape');
      await settle(fixture);

      expect(anchor()).toBeNull();
    });

    it('marks the area with data-state', async () => {
      expect(area().getAttribute('data-state')).toBe('closed');
      await openWithRightClick();
      expect(area().getAttribute('data-state')).toBe('open');
    });

    it('opens through the open binding, at the area', async () => {
      host.open.set(true);
      await settle(fixture);

      expect(menus()).toHaveLength(1);
    });

    it('exposes the area context while open and reports it on item clicks', async () => {
      await openWithRightClick();
      byId('rename').click();
      await settle(fixture);

      expect(host.clicks).toHaveLength(1);
      expect(host.clicks[0].key).toBe('rename');
      expect(host.clicks[0].context).toEqual({ id: 7 });
    });
  });

  describe('keyboard', () => {
    function stubRect(element: HTMLElement, left: number, top: number) {
      element.getBoundingClientRect = () =>
        ({
          left,
          top,
          right: left + 100,
          bottom: top + 40,
          width: 100,
          height: 40,
          x: left,
          y: top,
          toJSON: () => ({}),
        }) as DOMRect;
    }

    it('opens at the focused element from the context-menu key', async () => {
      stubRect(area(), 30, 40);
      area().focus();
      const event = pressKey(area(), 'ContextMenu');
      await settle(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(menus()).toHaveLength(1);
      expect(anchor()?.style.left).toBe('30px');
      expect(anchor()?.style.top).toBe('40px');
      expect(host.changes).toEqual([{ open: true, source: 'keyboard' }]);
    });

    it('opens from Shift+F10', async () => {
      stubRect(area(), 5, 6);
      pressKey(area(), 'F10', { shiftKey: true });
      await settle(fixture);

      expect(menus()).toHaveLength(1);
    });

    it('ignores a bare F10', async () => {
      pressKey(area(), 'F10');
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('opens at the focused descendant, not the whole area', async () => {
      stubRect(byId('inner'), 77, 88);
      pressKey(byId('inner'), 'ContextMenu');
      await settle(fixture);

      expect(anchor()?.style.left).toBe('77px');
      expect(anchor()?.style.top).toBe('88px');
    });

    it('treats a coordinate-less contextmenu event as the keyboard gesture', async () => {
      stubRect(area(), 12, 14);
      const event = rightClick(area(), 0, 0, { button: 0 });
      await settle(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(anchor()?.style.left).toBe('12px');
      expect(host.changes[0].source).toBe('keyboard');
    });

    it('does not touch the keys while disabled', async () => {
      host.disabled.set(true);
      await settle(fixture);
      const event = pressKey(area(), 'ContextMenu');

      expect(event.defaultPrevented).toBe(false);
    });

    it('moves focus to the first enabled item on open', async () => {
      area().focus();
      await openWithRightClick();

      expect(document.activeElement).toBe(byId('copy'));
    });

    it('leaves focus where it was with autoFocus off', async () => {
      host.autoFocus.set(false);
      await settle(fixture);
      area().focus();
      await openWithRightClick();

      expect(menus()).toHaveLength(1);
      expect(document.activeElement).toBe(area());
    });

    it('moves through the items with the arrow keys, skipping disabled ones', async () => {
      await openWithRightClick();

      pressKey(byId('copy'), 'ArrowDown');
      fixture.detectChanges();
      expect(document.activeElement).toBe(byId('rename'));

      pressKey(byId('rename'), 'ArrowUp');
      fixture.detectChanges();
      expect(document.activeElement).toBe(byId('copy'));
    });

    it('closes on Escape and returns focus to the element it came from', async () => {
      area().focus();
      await openWithRightClick();
      expect(document.activeElement).toBe(byId('copy'));

      pressKey(document.body, 'Escape');
      await settle(fixture);

      expect(menus()).toHaveLength(0);
      expect(document.activeElement).toBe(area());
      expect(host.changes.at(-1)).toEqual({
        open: false,
        source: 'escape-key',
      });
    });

    it('closes on Tab', async () => {
      area().focus();
      await openWithRightClick();
      pressKey(byId('copy'), 'Tab');
      await settle(fixture);

      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)?.source).toBe('tab-out');
    });

    it('opens a submenu with ArrowRight and closes only it with ArrowLeft', async () => {
      await openWithRightClick();
      byId('shareTrigger').focus();
      pressKey(byId('shareTrigger'), 'ArrowRight');
      await settle(fixture);
      expect(menus()).toHaveLength(2);
      expect(document.activeElement).toBe(byId('email'));

      pressKey(byId('email'), 'ArrowLeft');
      await settle(fixture);
      expect(menus()).toHaveLength(1);
      expect(document.activeElement).toBe(byId('shareTrigger'));
    });
  });

  describe('dismissal', () => {
    it('closes on a click outside', async () => {
      await openWithRightClick();
      byId('outside').click();
      await settle(fixture);

      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)).toEqual({
        open: false,
        source: 'outside-click',
      });
    });

    it('closes on a click on the area itself', async () => {
      await openWithRightClick();
      area().click();
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('closes when the native menu is requested elsewhere on the page', async () => {
      await openWithRightClick();
      rightClick(byId('outside'), 3, 3);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('does not count the release of the opening right button as a click away', async () => {
      await openWithRightClick();
      document.body.dispatchEvent(
        new MouseEvent('auxclick', { bubbles: true, button: 2 }),
      );
      await settle(fixture);

      expect(menus()).toHaveLength(1);
    });

    it('keeps the native menu out of the panel', async () => {
      await openWithRightClick();
      const event = rightClick(byId('rename'), 1, 1);

      expect(event.defaultPrevented).toBe(true);
    });

    it('closes when the page scrolls, but not when the panel does', async () => {
      await openWithRightClick();
      menus()[0].dispatchEvent(new Event('scroll'));
      await settle(fixture);
      expect(menus()).toHaveLength(1);

      document.dispatchEvent(new Event('scroll'));
      await settle(fixture);
      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)?.source).toBe('scroll');
    });

    it('closes on a window resize', async () => {
      await openWithRightClick();
      window.dispatchEvent(new Event('resize'));
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('stays put on scroll with closeOnScroll off', async () => {
      host.closeOnScroll.set(false);
      await settle(fixture);
      await openWithRightClick();
      document.dispatchEvent(new Event('scroll'));
      await settle(fixture);

      expect(menus()).toHaveLength(1);
    });
  });

  describe('items', () => {
    it('closes after a plain item and reports its key path', async () => {
      await openWithRightClick();
      byId('copy').click();
      await settle(fixture);

      expect(host.clicks.map((click) => click.key)).toEqual(['copy']);
      expect(host.clicks[0].keyPath).toEqual(['copy']);
      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)).toEqual({ open: false, source: 'item' });
    });

    it('does not activate a disabled item', async () => {
      await openWithRightClick();
      byId('paste').click();
      await settle(fixture);

      expect(host.clicks).toHaveLength(0);
      expect(menus()).toHaveLength(1);
    });

    it('keeps the menu open for checkbox and radio items', async () => {
      await openWithRightClick();

      byId('hidden').click();
      fixture.detectChanges();
      expect(host.hidden()).toBe(true);
      expect(byId('hidden').getAttribute('aria-checked')).toBe('true');

      byId('viewGrid').click();
      fixture.detectChanges();
      expect(byId('viewGrid').getAttribute('aria-checked')).toBe('true');
      expect(byId('viewList').getAttribute('aria-checked')).toBe('false');
      expect(menus()).toHaveLength(1);
    });

    it('reports the full key path of a submenu item', async () => {
      await openWithRightClick();
      byId('shareTrigger').click();
      await settle(fixture);
      byId('email').click();
      await settle(fixture);

      expect(host.clicks[0].keyPath).toEqual(['email', 'share']);
      expect(menus()).toHaveLength(0);
    });

    it('has the menu roles', async () => {
      await openWithRightClick();

      expect(menus()[0].getAttribute('role')).toBe('menu');
      expect(byId('copy').getAttribute('role')).toBe('menuitem');
      expect(byId('hidden').getAttribute('role')).toBe('menuitemcheckbox');
      expect(byId('viewList').getAttribute('role')).toBe('menuitemradio');
      expect(byId('shareTrigger').getAttribute('aria-haspopup')).toBe('menu');
      expect(byId('delete').getAttribute('data-variant')).toBe('destructive');
    });
  });

  describe('long press', () => {
    it('opens under the finger after the delay', async () => {
      pointer(area(), 'pointerdown', { x: 40, y: 50, pointerType: 'touch' });
      expect(menus()).toHaveLength(0);
      await sleep(60);
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      expect(anchor()?.style.left).toBe('40px');
      expect(anchor()?.style.top).toBe('50px');
      expect(host.changes).toEqual([{ open: true, source: 'long-press' }]);
    });

    it('also works for a pen', async () => {
      pointer(area(), 'pointerdown', { pointerType: 'pen' });
      await sleep(60);
      await settle(fixture);

      expect(menus()).toHaveLength(1);
    });

    it('does not open if the finger lifts first', async () => {
      pointer(area(), 'pointerdown', { pointerType: 'touch' });
      pointer(area(), 'pointerup', { pointerType: 'touch' });
      await sleep(60);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('does not open if the finger drifts', async () => {
      pointer(area(), 'pointerdown', { x: 0, y: 0, pointerType: 'touch' });
      pointer(area(), 'pointermove', { x: 30, y: 0, pointerType: 'touch' });
      await sleep(60);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('tolerates a small wobble', async () => {
      pointer(area(), 'pointerdown', { x: 0, y: 0, pointerType: 'touch' });
      pointer(area(), 'pointermove', { x: 4, y: 3, pointerType: 'touch' });
      await sleep(60);
      await settle(fixture);

      expect(menus()).toHaveLength(1);
    });

    it('is ignored for a mouse', async () => {
      pointer(area(), 'pointerdown', { pointerType: 'mouse' });
      await sleep(60);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('is off with a zero delay', async () => {
      host.longPressDelay.set(0);
      await settle(fixture);
      pointer(area(), 'pointerdown', { pointerType: 'touch' });
      await sleep(60);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('survives the lift-off click, then closes on the next outside click', async () => {
      pointer(area(), 'pointerdown', { pointerType: 'touch' });
      await sleep(60);
      await settle(fixture);

      pointer(area(), 'pointerup', { pointerType: 'touch' });
      area().click();
      await settle(fixture);
      expect(menus()).toHaveLength(1);

      byId('outside').click();
      await settle(fixture);
      expect(menus()).toHaveLength(0);
    });

    it('does not reopen from the contextmenu event a phone sends after the press', async () => {
      pointer(area(), 'pointerdown', { x: 40, y: 50, pointerType: 'touch' });
      await sleep(60);
      await settle(fixture);
      rightClick(area(), 41, 51, { button: 0 });
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      expect(anchor()?.style.left).toBe('40px');
      expect(host.changes).toHaveLength(1);
    });
  });

  describe('motion and styling contract', () => {
    const css = readFileSync(
      'packages/ui/src/lib/dropdown-menu/dropdown-menu.css',
      'utf8',
    );

    it('inherits the shared exit animation for a closing panel', () => {
      expect(css).toMatch(
        /\.andes-dropdown-menu__content\[data-andes-closing\]/,
      );
      expect(css).toMatch(/animation: andes-dropdown-menu-exit/);
    });

    it('turns animation off for reduced motion', () => {
      // Enter and exit both sit inside the no-preference query.
      const query = css.indexOf(
        '@media (prefers-reduced-motion: no-preference)',
      );
      expect(query).toBeGreaterThan(-1);
      expect(css.indexOf('andes-dropdown-menu-enter 150ms')).toBeGreaterThan(
        query,
      );
      expect(css.indexOf('[data-andes-closing]')).toBeGreaterThan(query);
    });

    it('renders the panel on the shared panel class, with the font set on its root', async () => {
      await openWithRightClick();

      expect(menus()[0].classList).toContain('andes-dropdown-menu__content');
      expect(css).toMatch(
        /\.andes-dropdown-menu__content \{[^}]*font-family: var\(--andes-font-family\)/,
      );
    });
  });
});

describe('AndesContextMenu bound to areas', () => {
  withElementGeometry();

  let fixture: ComponentFixture<BoundHostComponent>;
  let host: BoundHostComponent;

  beforeEach(async () => {
    fixture = TestBed.createComponent(BoundHostComponent);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  afterEach(() => fixture.destroy());

  it('serves several areas from one menu, each with its own context', async () => {
    rightClick(byId('rowA'), 10, 10);
    await settle(fixture);
    itemByText('Archive').click();
    await settle(fixture);

    rightClick(byId('rowB'), 20, 20);
    await settle(fixture);
    itemByText('Archive').click();
    await settle(fixture);

    expect(host.clicks.map((click) => click.context)).toEqual([
      'row-a',
      'row-b',
    ]);
  });

  it('lets the innermost area win', async () => {
    rightClick(byId('rowA'), 10, 10);
    await settle(fixture);

    expect(menus()).toHaveLength(1);
    itemByText('Open').click();
    await settle(fixture);
    expect(host.clicks[0].context).toBe('row-a');
  });

  it('falls back to the outer area outside the rows', async () => {
    rightClick(byId('outerText'), 10, 10);
    await settle(fixture);
    itemByText('Open').click();
    await settle(fixture);

    expect(host.clicks[0].context).toBe('outer');
  });

  it('renders the items array and reports the matching entry', async () => {
    rightClick(byId('rowA'), 10, 10);
    await settle(fixture);

    expect(menus()[0].querySelectorAll('[role="separator"]')).toHaveLength(1);
    byId('rowA').click();
    await settle(fixture);
    rightClick(byId('rowA'), 10, 10);
    await settle(fixture);

    const remove = Array.from(
      menus()[0].querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
    ).find((item) => item.textContent?.includes('Remove'));
    remove?.click();
    await settle(fixture);

    expect(host.clicks.at(-1)?.item).toEqual({
      key: 'remove',
      label: 'Remove',
      danger: true,
    });
    expect(host.selected()).toEqual(['remove']);
  });

  it('leaves no point anchor behind once destroyed', async () => {
    rightClick(byId('rowA'), 10, 10);
    await settle(fixture);
    fixture.destroy();

    expect(
      document.querySelectorAll('.andes-context-menu__anchor'),
    ).toHaveLength(0);
  });
});
