import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readFileSync } from 'node:fs';

import { AndesDropdownMenuCheckboxItem } from '../dropdown-menu/dropdown-menu-checkbox-item';
import { AndesDropdownMenuItem } from '../dropdown-menu/dropdown-menu-item';
import { AndesDropdownMenuLabel } from '../dropdown-menu/dropdown-menu-label';
import { AndesDropdownMenuRadioGroup } from '../dropdown-menu/dropdown-menu-radio-group';
import { AndesDropdownMenuRadioItem } from '../dropdown-menu/dropdown-menu-radio-item';
import { AndesDropdownMenuSeparator } from '../dropdown-menu/dropdown-menu-separator';
import { AndesDropdownMenuShortcut } from '../dropdown-menu/dropdown-menu-shortcut';
import { AndesDropdownMenuSub } from '../dropdown-menu/dropdown-menu-sub';
import { AndesDropdownMenuSubContent } from '../dropdown-menu/dropdown-menu-sub-content';
import { AndesDropdownMenuSubTrigger } from '../dropdown-menu/dropdown-menu-sub-trigger';
import type { AndesDropdownMenuItemDef } from '../dropdown-menu/dropdown-menu-types';
import { AndesMenubar } from './menubar';
import { AndesMenubarMenu } from './menubar-menu';
import { AndesMenubarTrigger } from './menubar-trigger';
import type {
  AndesMenubarClickEvent,
  AndesMenubarOpenChange,
  AndesMenubarSize,
} from './menubar-types';

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
  Home: 36,
  End: 35,
  Tab: 9,
  Enter: 13,
  Escape: 27,
  ' ': 32,
};

function pressKey(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'keyCode', {
    get: () => KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0),
  });
  target.dispatchEvent(event);
  return event;
}

/** jsdom has no `PointerEvent` constructor; a `MouseEvent` carries everything used. */
function pointerEnter(target: EventTarget, pointerType = 'mouse'): void {
  const event = new MouseEvent('pointerenter', { bubbles: false });
  Object.defineProperty(event, 'pointerType', { get: () => pointerType });
  target.dispatchEvent(event);
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
const menus = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'));

// ---------------------------------------------------------------------------

@Component({
  imports: [
    AndesMenubar,
    AndesMenubarMenu,
    AndesMenubarTrigger,
    AndesDropdownMenuItem,
    AndesDropdownMenuCheckboxItem,
    AndesDropdownMenuRadioGroup,
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
    <andes-menubar
      id="bar"
      aria-label="Application"
      [size]="size()"
      [loop]="loop()"
      [disabled]="barDisabled()"
      [(value)]="value"
      [style.direction]="direction()"
      (itemClick)="barClicks.push($event)"
    >
      <andes-menubar-menu
        value="file"
        (openStateChange)="
          changes.push('file:' + $event.source + ':' + $event.open)
        "
        (itemClick)="clicks.push($event)"
      >
        <andes-menubar-trigger id="fileTrigger">File</andes-menubar-trigger>
        <andes-dropdown-menu-item key="new" id="new">
          New
          <andes-dropdown-menu-shortcut>⌘N</andes-dropdown-menu-shortcut>
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="open" id="openItem" [disabled]="true">
          Open
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-sub key="recent">
          <andes-dropdown-menu-sub-trigger id="recentTrigger">
            Recent
          </andes-dropdown-menu-sub-trigger>
          <andes-dropdown-menu-sub-content>
            <andes-dropdown-menu-item key="report" id="report">
              Report.pdf
            </andes-dropdown-menu-item>
          </andes-dropdown-menu-sub-content>
        </andes-dropdown-menu-sub>
        <andes-dropdown-menu-separator />
        <andes-dropdown-menu-item key="quit" id="quit" variant="destructive">
          Quit
        </andes-dropdown-menu-item>
      </andes-menubar-menu>

      <andes-menubar-menu
        value="edit"
        [(open)]="editOpen"
        (openStateChange)="
          changes.push('edit:' + $event.source + ':' + $event.open)
        "
      >
        <andes-menubar-trigger id="editTrigger">Edit</andes-menubar-trigger>
        <andes-dropdown-menu-item key="undo" id="undo"
          >Undo</andes-dropdown-menu-item
        >
        <andes-dropdown-menu-item key="redo" id="redo"
          >Redo</andes-dropdown-menu-item
        >
      </andes-menubar-menu>

      <andes-menubar-menu value="view" [disabled]="viewDisabled()">
        <andes-menubar-trigger id="viewTrigger">View</andes-menubar-trigger>
        <andes-dropdown-menu-checkbox-item id="ruler" [(checked)]="ruler">
          Ruler
        </andes-dropdown-menu-checkbox-item>
        <andes-dropdown-menu-label>Zoom</andes-dropdown-menu-label>
        <andes-dropdown-menu-radio-group [(value)]="zoom">
          <andes-dropdown-menu-radio-item id="zoom100" value="100">
            100%
          </andes-dropdown-menu-radio-item>
          <andes-dropdown-menu-radio-item id="zoom200" value="200">
            200%
          </andes-dropdown-menu-radio-item>
        </andes-dropdown-menu-radio-group>
      </andes-menubar-menu>

      <andes-menubar-menu value="help" align="end">
        <andes-menubar-trigger id="helpTrigger">Help</andes-menubar-trigger>
        <andes-dropdown-menu-item key="docs" id="docs"
          >Docs</andes-dropdown-menu-item
        >
      </andes-menubar-menu>
    </andes-menubar>
  `,
})
class HostComponent {
  readonly size = signal<AndesMenubarSize>('md');
  readonly loop = signal(true);
  readonly barDisabled = signal(false);
  readonly viewDisabled = signal(false);
  readonly direction = signal('ltr');
  readonly value = signal<string | null>(null);
  readonly editOpen = signal(false);
  readonly ruler = signal(false);
  readonly zoom = signal<unknown>('100');
  readonly changes: string[] = [];
  readonly clicks: AndesMenubarClickEvent[] = [];
  readonly barClicks: AndesMenubarClickEvent[] = [];
}

@Component({
  imports: [AndesMenubar, AndesMenubarMenu, AndesMenubarTrigger],
  template: `
    <andes-menubar aria-label="Data driven">
      <andes-menubar-menu
        value="file"
        [items]="items"
        [selectable]="true"
        [(selectedKeys)]="selected"
        (openStateChange)="states.push($event)"
        (itemClick)="clicks.push($event)"
      >
        <andes-menubar-trigger id="dataTrigger">File</andes-menubar-trigger>
      </andes-menubar-menu>
    </andes-menubar>
  `,
})
class DataHostComponent {
  readonly items: readonly AndesDropdownMenuItemDef[] = [
    { key: 'new', label: 'New', extra: '⌘N' },
    { type: 'divider' },
    { key: 'quit', label: 'Quit', danger: true },
  ];
  readonly selected = signal<readonly string[]>([]);
  readonly states: AndesMenubarOpenChange[] = [];
  readonly clicks: AndesMenubarClickEvent[] = [];
}

describe('AndesMenubar', () => {
  withElementGeometry();

  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  afterEach(() => fixture.destroy());

  const trigger = (name: string) => byId(`${name}Trigger`);

  async function click(element: HTMLElement) {
    element.click();
    await settle(fixture);
  }

  async function key(target: EventTarget, name: string) {
    pressKey(target, name);
    await settle(fixture);
  }

  describe('structure and ARIA', () => {
    it('is a horizontal menubar with an accessible name', () => {
      const bar = byId('bar');

      expect(bar.getAttribute('role')).toBe('menubar');
      expect(bar.getAttribute('aria-orientation')).toBe('horizontal');
      expect(bar.getAttribute('aria-label')).toBe('Application');
      expect(bar.getAttribute('data-size')).toBe('md');
      expect(bar.getAttribute('data-variant')).toBe('default');
    });

    it('renders triggers as menuitems that advertise their menu', () => {
      const file = trigger('file');

      expect(file.getAttribute('role')).toBe('menuitem');
      expect(file.getAttribute('aria-haspopup')).toBe('menu');
      expect(file.getAttribute('aria-expanded')).toBe('false');
      expect(file.getAttribute('data-state')).toBe('closed');
      expect(file.hasAttribute('aria-controls')).toBe(false);
    });

    it('reflects the open state on the trigger and names the panel after it', async () => {
      await click(trigger('file'));

      const file = trigger('file');
      expect(file.getAttribute('aria-expanded')).toBe('true');
      expect(file.getAttribute('data-state')).toBe('open');
      expect(menus()).toHaveLength(1);
      expect(menus()[0].getAttribute('role')).toBe('menu');
      expect(file.getAttribute('aria-controls')).toBe(menus()[0].id);
      expect(menus()[0].getAttribute('aria-labelledby')).toBe('fileTrigger');
    });

    it('puts the triggers in one tab stop', () => {
      expect(trigger('file').tabIndex).toBe(0);
      expect(trigger('edit').tabIndex).toBe(-1);
      expect(trigger('view').tabIndex).toBe(-1);
      expect(trigger('help').tabIndex).toBe(-1);
    });

    it('moves the tab stop to the trigger that was focused', async () => {
      trigger('edit').focus();
      await settle(fixture);

      expect(trigger('file').tabIndex).toBe(-1);
      expect(trigger('edit').tabIndex).toBe(0);
    });

    it('skips a disabled trigger for the tab stop', async () => {
      host.viewDisabled.set(true);
      await settle(fixture);

      expect(trigger('view').getAttribute('aria-disabled')).toBe('true');
      expect(trigger('view').hasAttribute('data-disabled')).toBe(true);
      expect(trigger('view').tabIndex).toBe(-1);
    });

    it('has the menu item roles inside the panel', async () => {
      await click(trigger('file'));

      expect(byId('new').getAttribute('role')).toBe('menuitem');
      expect(byId('new').textContent).toContain('⌘N');
      expect(byId('recentTrigger').getAttribute('aria-haspopup')).toBe('menu');
      expect(byId('quit').getAttribute('data-variant')).toBe('destructive');
      expect(byId('openItem').getAttribute('aria-disabled')).toBe('true');

      key(trigger('file'), 'Escape');
      await click(trigger('view'));
      expect(byId('ruler').getAttribute('role')).toBe('menuitemcheckbox');
      expect(byId('zoom100').getAttribute('role')).toBe('menuitemradio');
    });
  });

  describe('opening and closing', () => {
    it('opens on click and leaves focus on the trigger', async () => {
      await click(trigger('file'));

      expect(menus()).toHaveLength(1);
      expect(document.activeElement).toBe(trigger('file'));
      expect(host.changes).toEqual(['file:trigger:true']);
    });

    it('closes on a second click', async () => {
      await click(trigger('file'));
      await click(trigger('file'));

      expect(menus()).toHaveLength(0);
      expect(host.changes).toEqual(['file:trigger:true', 'file:trigger:false']);
    });

    it.each(['ArrowDown', 'Enter', ' '])(
      'opens on %s focusing the first enabled item',
      async (name) => {
        trigger('file').focus();
        const event = pressKey(trigger('file'), name);
        await settle(fixture);

        expect(event.defaultPrevented).toBe(true);
        expect(menus()).toHaveLength(1);
        expect(document.activeElement).toBe(byId('new'));
        expect(host.changes).toEqual(['file:keyboard:true']);
      },
    );

    it('opens on ArrowUp focusing the last item', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowUp');

      expect(document.activeElement).toBe(byId('quit'));
    });

    it('steps into an already open menu with ArrowDown', async () => {
      await click(trigger('file'));
      await key(trigger('file'), 'ArrowDown');

      expect(menus()).toHaveLength(1);
      expect(document.activeElement).toBe(byId('new'));
    });

    it('moves through the panel with the arrow keys, skipping disabled items', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');

      await key(byId('new'), 'ArrowDown');
      expect(document.activeElement).toBe(byId('recentTrigger'));
      await key(byId('recentTrigger'), 'ArrowDown');
      expect(document.activeElement).toBe(byId('quit'));
      await key(byId('quit'), 'ArrowUp');
      expect(document.activeElement).toBe(byId('recentTrigger'));
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');
      expect(document.activeElement).toBe(byId('new'));

      await key(document.body, 'Escape');

      expect(menus()).toHaveLength(0);
      expect(document.activeElement).toBe(trigger('file'));
      expect(host.changes.at(-1)).toBe('file:escape-key:false');
    });

    it('closes on Escape while focus is still on the trigger', async () => {
      await click(trigger('file'));
      await key(document.body, 'Escape');

      expect(menus()).toHaveLength(0);
      expect(document.activeElement).toBe(trigger('file'));
    });

    it('closes on Tab from the panel and from the trigger', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');
      await key(byId('new'), 'Tab');
      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)).toBe('file:tab-out:false');

      await click(trigger('file'));
      await key(trigger('file'), 'Tab');
      expect(menus()).toHaveLength(0);
    });

    it('closes on a click outside', async () => {
      await click(trigger('file'));
      await click(byId('outside'));

      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)).toBe('file:outside-click:false');
    });

    it('does not open a disabled menu', async () => {
      host.viewDisabled.set(true);
      await settle(fixture);

      await click(trigger('view'));
      await key(trigger('view'), 'ArrowDown');

      expect(menus()).toHaveLength(0);
    });

    it('closes an open menu that becomes disabled', async () => {
      await click(trigger('view'));
      expect(menus()).toHaveLength(1);

      host.viewDisabled.set(true);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('disables every menu with the bar', async () => {
      await click(trigger('file'));
      host.barDisabled.set(true);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
      await click(trigger('edit'));
      expect(menus()).toHaveLength(0);
      expect(byId('bar').hasAttribute('data-disabled')).toBe(true);
    });

    it('opens and closes through the menu open binding', async () => {
      host.editOpen.set(true);
      await settle(fixture);
      expect(menus()).toHaveLength(1);
      expect(trigger('edit').getAttribute('aria-expanded')).toBe('true');

      await click(byId('outside'));
      expect(host.editOpen()).toBe(false);
    });
  });

  describe('switching between menus', () => {
    it('switches to a hovered trigger while a menu is open, with no click', async () => {
      await click(trigger('file'));
      pointerEnter(trigger('edit'));
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      expect(trigger('file').getAttribute('aria-expanded')).toBe('false');
      expect(trigger('edit').getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(trigger('edit'));
      expect(host.changes).toEqual([
        'file:trigger:true',
        'file:hover:false',
        'edit:hover:true',
      ]);
    });

    it('leaves a hovered trigger alone while nothing is open', async () => {
      pointerEnter(trigger('edit'));
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('ignores a touch pointer and a disabled trigger', async () => {
      host.viewDisabled.set(true);
      await settle(fixture);
      await click(trigger('file'));

      pointerEnter(trigger('edit'), 'touch');
      await settle(fixture);
      expect(trigger('edit').getAttribute('aria-expanded')).toBe('false');

      pointerEnter(trigger('view'));
      await settle(fixture);
      expect(trigger('file').getAttribute('aria-expanded')).toBe('true');
    });

    it('stops switching once the menu was closed', async () => {
      await click(trigger('file'));
      await key(document.body, 'Escape');
      pointerEnter(trigger('edit'));
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('keeps focus usable after a switch: ArrowDown steps into the new menu', async () => {
      await click(trigger('file'));
      pointerEnter(trigger('edit'));
      await settle(fixture);
      await key(trigger('edit'), 'ArrowDown');

      expect(document.activeElement).toBe(byId('undo'));
    });

    it('tracks the open menu in the bar value', async () => {
      await click(trigger('file'));
      expect(host.value()).toBe('file');

      pointerEnter(trigger('edit'));
      await settle(fixture);
      expect(host.value()).toBe('edit');

      await key(document.body, 'Escape');
      expect(host.value()).toBeNull();
    });

    it('opens the menu named by a value written from outside', async () => {
      host.value.set('help');
      await settle(fixture);
      expect(menus()).toHaveLength(1);
      expect(trigger('help').getAttribute('aria-expanded')).toBe('true');

      host.value.set(null);
      await settle(fixture);
      expect(menus()).toHaveLength(0);
    });
  });

  describe('keyboard movement between triggers', () => {
    it('moves focus with ArrowRight and ArrowLeft, wrapping around', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowRight');
      expect(document.activeElement).toBe(trigger('edit'));
      expect(menus()).toHaveLength(0);

      await key(trigger('edit'), 'ArrowLeft');
      expect(document.activeElement).toBe(trigger('file'));
      await key(trigger('file'), 'ArrowLeft');
      expect(document.activeElement).toBe(trigger('help'));
      await key(trigger('help'), 'ArrowRight');
      expect(document.activeElement).toBe(trigger('file'));
    });

    it('stops at the ends with loop off', async () => {
      host.loop.set(false);
      await settle(fixture);
      trigger('file').focus();
      await key(trigger('file'), 'ArrowLeft');
      expect(document.activeElement).toBe(trigger('file'));

      trigger('help').focus();
      await key(trigger('help'), 'ArrowRight');
      expect(document.activeElement).toBe(trigger('help'));
    });

    it('skips disabled triggers', async () => {
      host.viewDisabled.set(true);
      await settle(fixture);
      trigger('edit').focus();
      await key(trigger('edit'), 'ArrowRight');

      expect(document.activeElement).toBe(trigger('help'));
    });

    it('jumps to the first and last trigger with Home and End', async () => {
      trigger('edit').focus();
      await key(trigger('edit'), 'End');
      expect(document.activeElement).toBe(trigger('help'));
      await key(trigger('help'), 'Home');
      expect(document.activeElement).toBe(trigger('file'));
    });

    it('carries an open menu along with the arrows', async () => {
      await click(trigger('file'));
      await key(trigger('file'), 'ArrowRight');

      expect(menus()).toHaveLength(1);
      expect(trigger('edit').getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(trigger('edit'));
      expect(host.changes.at(-1)).toBe('edit:keyboard:true');
    });

    it('mirrors the arrows in a right-to-left bar', async () => {
      host.direction.set('rtl');
      await settle(fixture);
      trigger('file').focus();
      await key(trigger('file'), 'ArrowLeft');
      expect(document.activeElement).toBe(trigger('edit'));

      await key(trigger('edit'), 'ArrowRight');
      expect(document.activeElement).toBe(trigger('file'));
    });
  });

  describe('keyboard movement between open menus', () => {
    it('opens the next menu from a panel item, focusing its first item', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');
      await key(byId('new'), 'ArrowRight');

      expect(menus()).toHaveLength(1);
      expect(trigger('edit').getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(byId('undo'));
    });

    it('opens the previous menu with ArrowLeft, wrapping to the last', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');
      await key(byId('new'), 'ArrowLeft');

      expect(trigger('help').getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(byId('docs'));
    });

    it('opens a submenu rather than the next menu on a submenu trigger', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');
      byId('recentTrigger').focus();
      await key(byId('recentTrigger'), 'ArrowRight');

      expect(menus()).toHaveLength(2);
      expect(document.activeElement).toBe(byId('report'));
      expect(trigger('file').getAttribute('aria-expanded')).toBe('true');
    });

    it('moves to the next menu from a plain item of a submenu', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');
      byId('recentTrigger').focus();
      await key(byId('recentTrigger'), 'ArrowRight');
      await key(byId('report'), 'ArrowRight');

      expect(menus()).toHaveLength(1);
      expect(trigger('edit').getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(byId('undo'));
    });

    it('closes just the submenu on ArrowLeft', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');
      byId('recentTrigger').focus();
      await key(byId('recentTrigger'), 'ArrowRight');
      await key(byId('report'), 'ArrowLeft');

      expect(menus()).toHaveLength(1);
      expect(trigger('file').getAttribute('aria-expanded')).toBe('true');
      expect(trigger('edit').getAttribute('aria-expanded')).toBe('false');
    });

    it('mirrors the panel arrows in a right-to-left bar', async () => {
      host.direction.set('rtl');
      await settle(fixture);
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');
      await key(byId('new'), 'ArrowLeft');

      expect(trigger('edit').getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('items', () => {
    it('reports an activated item to the menu and the bar, then closes', async () => {
      await click(trigger('file'));
      await click(byId('new'));

      expect(host.clicks.map((entry) => entry.key)).toEqual(['new']);
      expect(host.clicks[0].menu).toBe('file');
      expect(host.barClicks.map((entry) => [entry.menu, entry.key])).toEqual([
        ['file', 'new'],
      ]);
      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)).toBe('file:item:false');
    });

    it('activates with Enter and returns focus to the trigger', async () => {
      trigger('file').focus();
      await key(trigger('file'), 'ArrowDown');
      await key(byId('new'), 'Enter');

      expect(host.clicks.map((entry) => entry.key)).toEqual(['new']);
      expect(document.activeElement).toBe(trigger('file'));
    });

    it('does not activate a disabled item', async () => {
      await click(trigger('file'));
      await click(byId('openItem'));

      expect(host.clicks).toHaveLength(0);
      expect(menus()).toHaveLength(1);
    });

    it('reports the key path of a submenu item', async () => {
      await click(trigger('file'));
      await click(byId('recentTrigger'));
      await click(byId('report'));

      expect(host.clicks[0].keyPath).toEqual(['report', 'recent']);
    });

    it('keeps the menu open for checkbox and radio items', async () => {
      await click(trigger('view'));

      await click(byId('ruler'));
      expect(host.ruler()).toBe(true);
      expect(byId('ruler').getAttribute('aria-checked')).toBe('true');

      await click(byId('zoom200'));
      expect(host.zoom()).toBe('200');
      expect(byId('zoom200').getAttribute('aria-checked')).toBe('true');
      expect(byId('zoom100').getAttribute('aria-checked')).toBe('false');
      expect(menus()).toHaveLength(1);
    });

    it('aligns the panel by the align input', async () => {
      const overlayOf = (id: string) =>
        fixture.debugElement
          .query(By.css(`#${id}`))
          .injector.get(AndesOverlayPrimitive);
      const positioningOf = (id: string) => {
        const { positioning } = overlayOf(id).config();
        return positioning.kind === 'anchored'
          ? [positioning.side, positioning.align]
          : null;
      };

      expect(positioningOf('fileTrigger')).toEqual(['bottom', 'start']);
      expect(positioningOf('helpTrigger')).toEqual(['bottom', 'end']);
    });
  });

  describe('sizes', () => {
    it('reflects the size on the bar', async () => {
      host.size.set('lg');
      await settle(fixture);

      expect(byId('bar').getAttribute('data-size')).toBe('lg');
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync('packages/ui/src/lib/menubar/menubar.css', 'utf8');
    const dropdownCss = readFileSync(
      'packages/ui/src/lib/dropdown-menu/dropdown-menu.css',
      'utf8',
    );

    it('sizes the triggers 24, 32 and 40px with literal fallbacks', () => {
      expect(css).toContain('var(--andes-control-height-sm, 1.5rem)');
      expect(css).toContain('var(--andes-control-height-md, 2rem)');
      expect(css).toContain('var(--andes-control-height-lg, 2.5rem)');
    });

    it('draws a focus ring on the triggers for keyboard focus', () => {
      expect(css).toMatch(
        /\.andes-menubar__trigger:focus-visible \{\s*outline: 2px solid var\(--andes-color-focus-ring\)/,
      );
    });

    it('sets the font on the bar root', () => {
      expect(css).toMatch(
        /\.andes-menubar \{[^}]*font-family: var\(--andes-font-family\), sans-serif/,
      );
    });

    it('uses logical properties only', () => {
      expect(css).toContain(
        'padding-inline: var(--andes-menubar-trigger-padding-x)',
      );
      expect(css).not.toMatch(/(margin|padding|border)-(left|right)\s*:/);
      expect(css).not.toMatch(/\b(left|right)\s*:/);
    });

    it('turns the trigger transition off for reduced motion', () => {
      expect(css).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{\s*\.andes-menubar__trigger \{\s*transition: none/,
      );
    });

    it('never wraps a selector onto a line that starts with a combinator', () => {
      const lines = css.split('\n');
      const wrapped = lines.filter((line) => /^\s*[>+~]\s/.test(line));
      expect(wrapped).toEqual([]);
      // Every selector line closes its rule or continues a list.
      const selectorLines = lines.filter((line) =>
        /^\.andes-menubar/.test(line),
      );
      for (const line of selectorLines) {
        expect(line).toMatch(/[{,]$/);
      }
    });

    it('inherits the dropdown panel exit animation and its reduced-motion opt-out', () => {
      expect(dropdownCss).toMatch(
        /\.andes-dropdown-menu__content\[data-andes-closing\]/,
      );
      const query = dropdownCss.indexOf(
        '@media (prefers-reduced-motion: no-preference)',
      );
      expect(query).toBeGreaterThan(-1);
      expect(dropdownCss.indexOf('[data-andes-closing]')).toBeGreaterThan(
        query,
      );
    });
  });
});

describe('AndesMenubar with an items array', () => {
  withElementGeometry();

  let fixture: ComponentFixture<DataHostComponent>;
  let host: DataHostComponent;

  beforeEach(async () => {
    fixture = TestBed.createComponent(DataHostComponent);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  afterEach(() => fixture.destroy());

  it('renders the items and reports the matching entry', async () => {
    byId('dataTrigger').click();
    await settle(fixture);

    expect(menus()[0].querySelectorAll('[role="separator"]')).toHaveLength(1);
    const quit = Array.from(
      menus()[0].querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
    ).find((item) => item.textContent?.includes('Quit'));
    quit?.click();
    await settle(fixture);

    expect(host.clicks[0].item).toEqual({
      key: 'quit',
      label: 'Quit',
      danger: true,
    });
    expect(host.clicks[0].menu).toBe('file');
    expect(host.selected()).toEqual(['quit']);
    expect(host.states.map((state) => state.open)).toEqual([true, false]);
  });
});
