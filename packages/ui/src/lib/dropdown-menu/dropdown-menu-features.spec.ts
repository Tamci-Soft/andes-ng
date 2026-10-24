import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AndesDropdownButton } from './dropdown-button';
import { AndesDropdownMenu } from './dropdown-menu';
import { AndesDropdownMenuContent } from './dropdown-menu-content';
import { AndesDropdownMenuGroup } from './dropdown-menu-group';
import { AndesDropdownMenuItem } from './dropdown-menu-item';
import { AndesDropdownMenuLabel } from './dropdown-menu-label';
import { AndesDropdownMenuSeparator } from './dropdown-menu-separator';
import { AndesDropdownMenuSub } from './dropdown-menu-sub';
import { AndesDropdownMenuSubContent } from './dropdown-menu-sub-content';
import { AndesDropdownMenuSubTrigger } from './dropdown-menu-sub-trigger';
import { AndesDropdownMenuTrigger } from './dropdown-menu-trigger';
import type {
  AndesDropdownMenuArrow,
  AndesDropdownMenuClickEvent,
  AndesDropdownMenuItemDef,
  AndesDropdownMenuOpenChange,
  AndesDropdownMenuPlacement,
  AndesDropdownMenuSelectEvent,
  AndesDropdownMenuSubmenuClickEvent,
  AndesDropdownMenuTriggerAction,
} from './dropdown-menu-types';

/**
 * jsdom reports zero geometry for every element, which makes CDK's
 * `InteractivityChecker` treat them all as invisible and therefore untabbable - see
 * the identical helper in `dropdown-menu.spec.ts`.
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

const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
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
function pointer(target: EventTarget, type: 'pointerenter' | 'pointerleave') {
  const event = new MouseEvent(type, { bubbles: false });
  Object.defineProperty(event, 'pointerType', { get: () => 'mouse' });
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

function overlayOf(fixture: ComponentFixture<unknown>, type: unknown) {
  return fixture.debugElement
    .query(By.directive(type as never))
    .injector.get(AndesOverlayPrimitive);
}

// ---------------------------------------------------------------------------

@Component({
  imports: [
    AndesDropdownMenu,
    AndesDropdownMenuTrigger,
    AndesDropdownMenuContent,
    AndesDropdownMenuItem,
    AndesDropdownMenuSub,
    AndesDropdownMenuSubTrigger,
    AndesDropdownMenuSubContent,
  ],
  template: `
    <button type="button" id="outside">Outside</button>
    <andes-dropdown-menu
      [(open)]="open"
      [trigger]="trigger()"
      [placement]="placement()"
      [arrow]="arrow()"
      [disabled]="disabled()"
      [autoFocus]="autoFocus()"
      [autoAdjustOverflow]="autoAdjust()"
      [mouseEnterDelay]="0"
      [mouseLeaveDelay]="0"
      [subMenuOpenDelay]="0"
      [subMenuCloseDelay]="0"
      [expandIcon]="useExpandIcon() ? expandTpl : undefined"
      (openStateChange)="changes.push($event)"
      (itemClick)="clicks.push($event)"
      (submenuTriggerClick)="submenuClicks.push($event)"
    >
      <button type="button" id="trigger" andesDropdownMenuTrigger>
        Options
      </button>
      <andes-dropdown-menu-content>
        <andes-dropdown-menu-item id="edit" key="edit"
          >Edit</andes-dropdown-menu-item
        >
        <andes-dropdown-menu-sub key="share" [popupOffset]="subOffset()">
          <andes-dropdown-menu-sub-trigger id="shareTrigger"
            >Share</andes-dropdown-menu-sub-trigger
          >
          <andes-dropdown-menu-sub-content>
            <andes-dropdown-menu-item id="email" key="email"
              >Email</andes-dropdown-menu-item
            >
            <andes-dropdown-menu-sub key="social">
              <andes-dropdown-menu-sub-trigger id="socialTrigger"
                >Social</andes-dropdown-menu-sub-trigger
              >
              <andes-dropdown-menu-sub-content>
                <andes-dropdown-menu-item id="mastodon" key="mastodon"
                  >Mastodon</andes-dropdown-menu-item
                >
              </andes-dropdown-menu-sub-content>
            </andes-dropdown-menu-sub>
          </andes-dropdown-menu-sub-content>
        </andes-dropdown-menu-sub>
        <andes-dropdown-menu-item id="archive" key="archive"
          >Archive</andes-dropdown-menu-item
        >
      </andes-dropdown-menu-content>
    </andes-dropdown-menu>
    <ng-template #expandTpl let-open
      ><i id="customExpand">{{ open ? '-' : '+' }}</i></ng-template
    >
  `,
})
class MenuHost {
  readonly open = signal(false);
  readonly trigger = signal<
    AndesDropdownMenuTriggerAction | AndesDropdownMenuTriggerAction[]
  >('click');
  readonly placement = signal<AndesDropdownMenuPlacement>('bottomLeft');
  readonly arrow = signal<AndesDropdownMenuArrow>(false);
  readonly disabled = signal(false);
  readonly autoFocus = signal<boolean | undefined>(undefined);
  readonly autoAdjust = signal(true);
  readonly useExpandIcon = signal(false);
  readonly subOffset = signal<[number, number] | undefined>(undefined);
  readonly changes: AndesDropdownMenuOpenChange[] = [];
  readonly clicks: AndesDropdownMenuClickEvent[] = [];
  readonly submenuClicks: AndesDropdownMenuSubmenuClickEvent[] = [];
}

describe('AndesDropdownMenu - extended features', () => {
  withElementGeometry();

  let fixture: ComponentFixture<MenuHost>;
  let host: MenuHost;

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  describe('[(open)] and (openStateChange)', () => {
    it('opens when the parent sets open, without reporting it back as a user change', async () => {
      host.open.set(true);
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      expect(host.changes).toEqual([]);
    });

    it('closes when the parent clears open', async () => {
      host.open.set(true);
      await settle(fixture);
      host.open.set(false);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('writes user-driven changes back through the two-way binding with their source', async () => {
      byId('trigger').click();
      await settle(fixture);
      expect(host.open()).toBe(true);
      expect(host.changes).toEqual([{ open: true, source: 'trigger' }]);

      pressKey(document.body, 'Escape');
      await settle(fixture);
      expect(host.open()).toBe(false);
      expect(host.changes.at(-1)).toEqual({
        open: false,
        source: 'escape-key',
      });
    });

    it.each([
      ['outside-click', () => byId('outside').click()],
      ['item', () => byId('edit').click()],
      ['tab-out', () => pressKey(byId('edit'), 'Tab')],
    ] as const)('reports %s as the close source', async (source, act) => {
      byId('trigger').click();
      await settle(fixture);
      act();
      await settle(fixture);

      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)).toEqual({ open: false, source });
    });

    it('returns focus to the trigger only when focus was inside the menu', async () => {
      byId('trigger').click();
      await settle(fixture);
      expect(document.activeElement).toBe(byId('edit'));

      byId('outside').focus();
      byId('outside').click();
      await settle(fixture);
      expect(document.activeElement).toBe(byId('outside'));
    });
  });

  describe('disabled', () => {
    it('marks the trigger and ignores click and keyboard opens', async () => {
      host.disabled.set(true);
      await settle(fixture);

      expect(byId('trigger').getAttribute('aria-disabled')).toBe('true');
      expect(byId('trigger').hasAttribute('data-disabled')).toBe(true);

      byId('trigger').click();
      pressKey(byId('trigger'), 'ArrowDown');
      await settle(fixture);
      expect(menus()).toHaveLength(0);
    });

    it('closes an open menu when it becomes disabled', async () => {
      byId('trigger').click();
      await settle(fixture);
      host.disabled.set(true);
      await settle(fixture);

      expect(menus()).toHaveLength(0);
      expect(host.open()).toBe(false);
    });
  });

  describe('trigger="hover"', () => {
    beforeEach(async () => {
      host.trigger.set('hover');
      await settle(fixture);
    });

    it('opens on pointer enter without moving focus, and closes on pointer leave', async () => {
      byId('outside').focus();
      pointer(byId('trigger'), 'pointerenter');
      await settle(fixture, 5);

      expect(menus()).toHaveLength(1);
      expect(document.activeElement).toBe(byId('outside'));
      expect(host.changes).toEqual([{ open: true, source: 'hover' }]);

      pointer(byId('trigger'), 'pointerleave');
      await settle(fixture, 5);
      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)).toEqual({ open: false, source: 'hover' });
    });

    it('stays open while the pointer moves from the trigger into the panel', async () => {
      pointer(byId('trigger'), 'pointerenter');
      await settle(fixture, 5);
      pointer(byId('trigger'), 'pointerleave');
      pointer(menus()[0], 'pointerenter');
      await settle(fixture, 5);

      expect(menus()).toHaveLength(1);

      pointer(menus()[0], 'pointerleave');
      await settle(fixture, 5);
      expect(menus()).toHaveLength(0);
    });

    it('opens on click (keyboard/touch) but a click never closes it', async () => {
      byId('trigger').click();
      await settle(fixture);
      expect(menus()).toHaveLength(1);

      byId('trigger').click();
      await settle(fixture);
      expect(menus()).toHaveLength(1);
    });

    it('focuses the first item on hover open when autoFocus is set', async () => {
      host.autoFocus.set(true);
      await settle(fixture);
      pointer(byId('trigger'), 'pointerenter');
      await settle(fixture, 5);

      expect(document.activeElement).toBe(byId('edit'));
    });
  });

  describe('trigger="contextMenu"', () => {
    beforeEach(async () => {
      host.trigger.set('contextMenu');
      await settle(fixture);
    });

    function rightClick(x: number, y: number): MouseEvent {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: x,
        clientY: y,
      });
      byId('trigger').dispatchEvent(event);
      return event;
    }

    it('opens on right-click at the pointer and suppresses the native menu', async () => {
      const event = rightClick(120, 80);
      await settle(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(menus()).toHaveLength(1);
      expect(host.changes).toEqual([{ open: true, source: 'context-menu' }]);

      const overlay = overlayOf(fixture, AndesDropdownMenu);
      const anchor = overlay.anchor() as HTMLElement;
      expect(anchor.classList).toContain('andes-dropdown-menu__point-anchor');
      expect(anchor.style.left).toBe('120px');
      expect(anchor.style.top).toBe('80px');
    });

    it('opens against the trigger, focusing the first item, from the context-menu key', async () => {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      byId('trigger').dispatchEvent(event);
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      expect(overlayOf(fixture, AndesDropdownMenu).anchor()).toBe(
        byId('trigger'),
      );
      expect(document.activeElement).toBe(byId('edit'));
    });

    it('does not open on a left click', async () => {
      byId('trigger').click();
      await settle(fixture);
      expect(menus()).toHaveLength(0);
    });

    it('removes the point anchor and re-anchors to the trigger on close', async () => {
      rightClick(10, 10);
      await settle(fixture);
      pressKey(document.body, 'Escape');
      await settle(fixture);

      expect(
        document.querySelector('.andes-dropdown-menu__point-anchor'),
      ).toBeNull();
      expect(overlayOf(fixture, AndesDropdownMenu).anchor()).toBe(
        byId('trigger'),
      );
    });

    it('re-opens at the new point on a second right-click', async () => {
      rightClick(10, 10);
      await settle(fixture);
      rightClick(50, 60);
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      const anchor = overlayOf(
        fixture,
        AndesDropdownMenu,
      ).anchor() as HTMLElement;
      expect(anchor.style.left).toBe('50px');
      expect(
        document.querySelectorAll('.andes-dropdown-menu__point-anchor'),
      ).toHaveLength(1);
    });
  });

  describe('placement / arrow / autoAdjustOverflow', () => {
    function positioning() {
      return overlayOf(fixture, AndesDropdownMenu).config().positioning;
    }

    it.each([
      ['bottomLeft', 'bottom', 'start'],
      ['bottom', 'bottom', 'center'],
      ['bottomRight', 'bottom', 'end'],
      ['topLeft', 'top', 'start'],
      ['top', 'top', 'center'],
      ['topRight', 'top', 'end'],
      ['leftTop', 'left', 'start'],
      ['right', 'right', 'center'],
      ['rightBottom', 'right', 'end'],
    ] as const)(
      'maps %s to side=%s align=%s',
      async (placement, side, align) => {
        host.placement.set(placement);
        await settle(fixture);

        expect(positioning()).toMatchObject({ kind: 'anchored', side, align });
      },
    );

    it('marks the panel with its placement side, which its entry motion keys off', async () => {
      host.placement.set('topRight');
      await settle(fixture);
      byId('trigger').click();
      await settle(fixture);

      expect(
        document
          .querySelector('.andes-dropdown-menu__content')
          ?.getAttribute('data-side'),
      ).toBe('top');
    });

    it('turns flip and shift off with autoAdjustOverflow=false', async () => {
      host.autoAdjust.set(false);
      await settle(fixture);

      expect(positioning()).toMatchObject({ flip: false, shift: false });
    });

    it('renders an arrow next to the panel and makes room for it', async () => {
      host.arrow.set(true);
      await settle(fixture);
      byId('trigger').click();
      await settle(fixture);

      const arrow = document.querySelector('.andes-dropdown-menu__arrow');
      expect(arrow).toBeTruthy();
      expect(arrow?.getAttribute('aria-hidden')).toBe('true');
      expect(arrow?.getAttribute('data-side')).toBeTruthy();
      expect(positioning()).toMatchObject({ sideOffset: 10 });
    });

    it('renders no arrow by default', async () => {
      byId('trigger').click();
      await settle(fixture);
      expect(document.querySelector('.andes-dropdown-menu__arrow')).toBeNull();
    });

    // `data-side` steers the entry drift, so a top-placed menu drifts in from its
    // trigger's side; `data-align` is a styling hook.
    it('exposes the requested side and alignment on the panel', async () => {
      host.placement.set('topRight');
      await settle(fixture);
      byId('trigger').click();
      await settle(fixture);

      const panel = menus()[0];
      expect(panel.getAttribute('data-side')).toBe('top');
      expect(panel.getAttribute('data-align')).toBe('end');
    });

    it('shifts a start-aligned panel toward the trigger center with pointAtCenter', async () => {
      const rect = vi
        .spyOn(byId('trigger'), 'getBoundingClientRect')
        .mockReturnValue(new DOMRect(0, 0, 100, 32));
      host.arrow.set({ pointAtCenter: true });
      await settle(fixture);
      byId('trigger').click();
      await settle(fixture);

      // half the 100px trigger minus the arrow's 14px inset from the panel edge
      expect(positioning()).toMatchObject({ alignOffset: 36 });
      rect.mockRestore();
    });
  });

  describe('autoFocus', () => {
    it('leaves focus on the trigger when a click opens the menu with autoFocus=false', async () => {
      host.autoFocus.set(false);
      await settle(fixture);
      byId('trigger').focus();
      byId('trigger').click();
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      expect(document.activeElement).toBe(byId('trigger'));
    });

    it('still focuses on a keyboard open', async () => {
      host.autoFocus.set(false);
      await settle(fixture);
      pressKey(byId('trigger'), 'ArrowDown');
      await settle(fixture);

      expect(document.activeElement).toBe(byId('edit'));
    });
  });

  describe('(itemClick)', () => {
    it('reports the key, key path, event and a null item for projected items', async () => {
      byId('trigger').click();
      await settle(fixture);
      byId('edit').click();
      await settle(fixture);

      expect(host.clicks).toHaveLength(1);
      expect(host.clicks[0]).toMatchObject({
        key: 'edit',
        keyPath: ['edit'],
        item: null,
      });
      expect(host.clicks[0].event).toBeInstanceOf(MouseEvent);
    });
  });

  describe('submenus', () => {
    async function openRoot() {
      byId('trigger').click();
      await settle(fixture);
    }

    it('renders the sub-trigger as a menuitem that advertises its submenu', async () => {
      await openRoot();
      const trigger = byId('shareTrigger');

      expect(trigger.getAttribute('role')).toBe('menuitem');
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(
        trigger.querySelector('.andes-dropdown-menu__expand-icon svg'),
      ).toBeTruthy();
    });

    it("takes part in the parent panel's arrow-key navigation", async () => {
      await openRoot();
      pressKey(byId('edit'), 'ArrowDown');
      await settle(fixture);

      expect(document.activeElement).toBe(byId('shareTrigger'));
    });

    it('ArrowRight opens the submenu and focuses its first item', async () => {
      await openRoot();
      byId('shareTrigger').focus();
      pressKey(byId('shareTrigger'), 'ArrowRight');
      await settle(fixture);

      expect(menus()).toHaveLength(2);
      expect(byId('shareTrigger').getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(byId('email'));
      expect(menus()[1].getAttribute('aria-labelledby')).toBe('shareTrigger');
    });

    it('ArrowLeft closes only the submenu and returns focus to its trigger', async () => {
      await openRoot();
      pressKey(byId('shareTrigger'), 'ArrowRight');
      await settle(fixture);
      pressKey(byId('email'), 'ArrowLeft');
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      expect(document.activeElement).toBe(byId('shareTrigger'));
    });

    it('Escape inside a submenu closes just that submenu', async () => {
      await openRoot();
      pressKey(byId('shareTrigger'), 'Enter');
      await settle(fixture);
      pressKey(byId('email'), 'Escape');
      await settle(fixture);

      expect(menus()).toHaveLength(1);
      expect(host.open()).toBe(true);
      expect(document.activeElement).toBe(byId('shareTrigger'));
    });

    it('navigates its own items with ArrowDown, separately from the parent', async () => {
      await openRoot();
      pressKey(byId('shareTrigger'), 'ArrowRight');
      await settle(fixture);
      pressKey(byId('email'), 'ArrowDown');
      await settle(fixture);

      expect(document.activeElement).toBe(byId('socialTrigger'));
    });

    it('nests: a submenu inside a submenu opens and reports the full key path', async () => {
      await openRoot();
      pressKey(byId('shareTrigger'), 'ArrowRight');
      await settle(fixture);
      pressKey(byId('socialTrigger'), 'ArrowRight');
      await settle(fixture);

      expect(menus()).toHaveLength(3);
      byId('mastodon').click();
      await settle(fixture);

      expect(host.clicks.at(-1)).toMatchObject({
        key: 'mastodon',
        keyPath: ['mastodon', 'social', 'share'],
      });
      expect(menus()).toHaveLength(0);
      expect(host.changes.at(-1)).toEqual({ open: false, source: 'item' });
    });

    it('opens on click without moving focus', async () => {
      await openRoot();
      byId('shareTrigger').click();
      await settle(fixture);

      expect(menus()).toHaveLength(2);
      expect(document.activeElement).not.toBe(byId('email'));
    });

    it('opens on hover after the intent delay, and closes when a sibling is hovered', async () => {
      await openRoot();
      pointer(byId('shareTrigger'), 'pointerenter');
      await settle(fixture, 5);
      expect(menus()).toHaveLength(2);

      pointer(byId('shareTrigger'), 'pointerleave');
      pointer(byId('archive'), 'pointerenter');
      await settle(fixture, 5);
      expect(menus()).toHaveLength(1);
    });

    it('does not close when the pointer moves on into the submenu itself', async () => {
      await openRoot();
      pointer(byId('shareTrigger'), 'pointerenter');
      await settle(fixture, 5);
      pointer(byId('shareTrigger'), 'pointerleave');
      pointer(byId('archive'), 'pointerenter');
      pointer(menus()[1], 'pointerenter');
      await settle(fixture, 5);

      expect(menus()).toHaveLength(2);
    });

    it('closes every open submenu when the root closes, leaving no orphan panels', async () => {
      await openRoot();
      pressKey(byId('shareTrigger'), 'ArrowRight');
      await settle(fixture);
      pressKey(byId('socialTrigger'), 'ArrowRight');
      await settle(fixture);

      byId('outside').click();
      await settle(fixture);

      expect(menus()).toHaveLength(0);
      expect(document.querySelectorAll('.andes-overlay-pane')).toHaveLength(0);
    });

    it('Tab inside a submenu closes the whole menu', async () => {
      await openRoot();
      pressKey(byId('shareTrigger'), 'ArrowRight');
      await settle(fixture);
      pressKey(byId('email'), 'Tab');
      await settle(fixture);

      expect(menus()).toHaveLength(0);
      expect(document.activeElement).toBe(byId('trigger'));
    });

    it('reports a click on a submenu trigger row through (submenuTriggerClick)', async () => {
      await openRoot();
      byId('shareTrigger').click();
      await settle(fixture);

      expect(host.submenuClicks).toHaveLength(1);
      expect(host.submenuClicks[0]).toMatchObject({
        key: 'share',
        keyPath: ['share'],
      });
      expect(host.submenuClicks[0].event).toBeInstanceOf(MouseEvent);
      expect(menus()).toHaveLength(2);
    });

    it('shifts the submenu panel by popupOffset', async () => {
      await openRoot();
      const overlay = overlayOf(fixture, AndesDropdownMenuSub);
      expect(overlay.config().positioning).toMatchObject({
        sideOffset: 2,
        alignOffset: -5,
      });

      host.subOffset.set([8, 4]);
      await settle(fixture);
      expect(overlay.config().positioning).toMatchObject({
        side: 'right',
        align: 'start',
        sideOffset: 10,
        alignOffset: -1,
      });
    });

    it('renders the expandIcon template with the open state', async () => {
      host.useExpandIcon.set(true);
      await settle(fixture);
      await openRoot();

      const icon = () =>
        byId('shareTrigger').querySelector('#customExpand') as HTMLElement;
      expect(icon().textContent).toBe('+');
      expect(byId('shareTrigger').querySelector('svg')).toBeNull();

      byId('shareTrigger').click();
      await settle(fixture);
      expect(icon().textContent).toBe('-');
    });
  });
});

// ---------------------------------------------------------------------------

@Component({
  imports: [AndesDropdownMenu, AndesDropdownMenuTrigger],
  template: `
    <andes-dropdown-menu
      [items]="items"
      [selectable]="selectable()"
      [multiple]="multiple()"
      [(selectedKeys)]="selected"
      [subMenuOpenDelay]="0"
      (itemClick)="clicks.push($event)"
      (itemSelect)="selects.push($event)"
      (itemDeselect)="deselects.push($event)"
    >
      <button type="button" id="trigger" andesDropdownMenuTrigger>
        Options
      </button>
    </andes-dropdown-menu>
    <ng-template #iconTpl
      ><svg id="editIcon" viewBox="0 0 24 24"></svg
    ></ng-template>
  `,
})
class ItemsHost {
  readonly icon = viewChild.required<TemplateRef<unknown>>('iconTpl');
  readonly selectable = signal(false);
  readonly multiple = signal(false);
  readonly selected = signal<readonly string[]>([]);
  readonly clicks: AndesDropdownMenuClickEvent[] = [];
  readonly selects: AndesDropdownMenuSelectEvent[] = [];
  readonly deselects: AndesDropdownMenuSelectEvent[] = [];
  items: AndesDropdownMenuItemDef[] = [];
}

describe('AndesDropdownMenu - items array', () => {
  withElementGeometry();

  let fixture: ComponentFixture<ItemsHost>;
  let host: ItemsHost;

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemsHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    host.items = [
      { key: 'edit', label: 'Edit', icon: host.icon(), extra: '⌘E' },
      { key: 'copy', label: 'Copy', disabled: true },
      { type: 'divider', dashed: true },
      {
        type: 'group',
        label: 'Sort by',
        children: [
          { key: 'name', label: 'Name' },
          { key: 'date', label: 'Date' },
        ],
      },
      {
        key: 'more',
        label: 'More',
        children: [{ key: 'export', label: 'Export' }],
      },
      { type: 'divider' },
      { key: 'delete', label: 'Delete', danger: true },
    ];
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  async function openMenu() {
    byId('trigger').click();
    await settle(fixture);
  }

  const item = (label: string) =>
    menus()
      .flatMap((menu) =>
        Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')),
      )
      .find((element) =>
        element.textContent?.trim().startsWith(label),
      ) as HTMLElement;

  it('renders items, icons, extra content, dividers, groups and submenus', async () => {
    await openMenu();
    const menu = menus()[0];

    expect(item('Edit').querySelector('#editIcon')).toBeTruthy();
    expect(
      item('Edit')
        .querySelector('.andes-dropdown-menu__extra')
        ?.textContent?.trim(),
    ).toBe('⌘E');
    expect(item('Copy').getAttribute('aria-disabled')).toBe('true');
    expect(item('Delete').getAttribute('data-variant')).toBe('destructive');

    const separators = menu.querySelectorAll('[role="separator"]');
    expect(separators).toHaveLength(2);
    expect(separators[0].hasAttribute('data-dashed')).toBe(true);
    expect(separators[1].hasAttribute('data-dashed')).toBe(false);

    const group = menu.querySelector('[role="group"]') as HTMLElement;
    const labelId = group.getAttribute('aria-labelledby') as string;
    expect(document.getElementById(labelId)?.textContent?.trim()).toBe(
      'Sort by',
    );
    expect(group.querySelectorAll('[role="menuitem"]')).toHaveLength(2);

    expect(item('More').getAttribute('aria-haspopup')).toBe('menu');
  });

  it('reports the matching items entry and key path through (itemClick)', async () => {
    await openMenu();
    item('Edit').click();
    await settle(fixture);

    expect(host.clicks[0]).toMatchObject({
      key: 'edit',
      keyPath: ['edit'],
      item: host.items[0],
    });
  });

  it('renders submenu children in their own panel with their own key path', async () => {
    await openMenu();
    pressKey(item('More'), 'ArrowRight');
    await settle(fixture);

    expect(menus()).toHaveLength(2);
    expect(document.activeElement).toBe(item('Export'));

    item('Export').click();
    await settle(fixture);
    expect(host.clicks.at(-1)).toMatchObject({
      key: 'export',
      keyPath: ['export', 'more'],
    });
  });

  describe('selectable', () => {
    it('is off by default: plain menuitems, no aria-checked', async () => {
      await openMenu();
      expect(item('Name').getAttribute('role')).toBe('menuitem');
      expect(item('Name').hasAttribute('aria-checked')).toBe(false);
    });

    it('single mode: menuitemradio, selects one key and emits (itemSelect)', async () => {
      host.selectable.set(true);
      await settle(fixture);
      await openMenu();

      expect(item('Name').getAttribute('role')).toBe('menuitemradio');
      expect(item('Name').getAttribute('aria-checked')).toBe('false');

      item('Name').click();
      await settle(fixture);
      expect(host.selected()).toEqual(['name']);
      expect(host.selects[0]).toMatchObject({
        key: 'name',
        selectedKeys: ['name'],
      });
      expect(menus()).toHaveLength(0);

      await openMenu();
      expect(item('Name').getAttribute('aria-checked')).toBe('true');
      expect(item('Name').hasAttribute('data-selected')).toBe(true);

      item('Date').click();
      await settle(fixture);
      expect(host.selected()).toEqual(['date']);
    });

    it('multiple mode: menuitemcheckbox, toggles keys and stays open', async () => {
      host.selectable.set(true);
      host.multiple.set(true);
      await settle(fixture);
      await openMenu();

      expect(item('Name').getAttribute('role')).toBe('menuitemcheckbox');

      item('Name').click();
      await settle(fixture);
      item('Date').click();
      await settle(fixture);
      expect(host.selected()).toEqual(['name', 'date']);
      expect(menus()).toHaveLength(1);

      item('Name').click();
      await settle(fixture);
      expect(host.selected()).toEqual(['date']);
      expect(host.deselects[0]).toMatchObject({
        key: 'name',
        selectedKeys: ['date'],
      });
    });

    it('reflects selectedKeys set by the parent', async () => {
      host.selectable.set(true);
      host.selected.set(['date']);
      await settle(fixture);
      await openMenu();

      expect(item('Date').getAttribute('aria-checked')).toBe('true');
      expect(item('Name').getAttribute('aria-checked')).toBe('false');
    });
  });
});

// ---------------------------------------------------------------------------

@Component({
  imports: [
    AndesDropdownMenu,
    AndesDropdownMenuTrigger,
    AndesDropdownMenuContent,
    AndesDropdownMenuItem,
    AndesDropdownMenuGroup,
    AndesDropdownMenuLabel,
    AndesDropdownMenuSeparator,
  ],
  template: `
    <andes-dropdown-menu>
      <button type="button" id="trigger" andesDropdownMenuTrigger>
        Options
      </button>
      <andes-dropdown-menu-content>
        <andes-dropdown-menu-group id="group">
          <andes-dropdown-menu-label id="groupLabel"
            >Sort</andes-dropdown-menu-label
          >
          <andes-dropdown-menu-item>Name</andes-dropdown-menu-item>
        </andes-dropdown-menu-group>
        <andes-dropdown-menu-separator dashed />
      </andes-dropdown-menu-content>
    </andes-dropdown-menu>
  `,
})
class GroupHost {}

describe('AndesDropdownMenuGroup / dashed separator', () => {
  withElementGeometry();

  it('labels the group with its label and draws a dashed separator', async () => {
    const fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
    byId('trigger').click();
    await settle(fixture);

    expect(byId('group').getAttribute('role')).toBe('group');
    expect(byId('group').getAttribute('aria-labelledby')).toBe('groupLabel');

    const separator = document.querySelector(
      '[role="separator"]',
    ) as HTMLElement;
    expect(separator.hasAttribute('data-dashed')).toBe(true);
    expect(getComputedStyle(separator).borderTopStyle).toBe('dashed');
    fixture.destroy();
  });
});

// ---------------------------------------------------------------------------

@Component({
  imports: [
    AndesDropdownButton,
    AndesDropdownMenuContent,
    AndesDropdownMenuItem,
  ],
  template: `
    <andes-dropdown-button
      [disabled]="disabled()"
      [loading]="loading()"
      [loadingDelay]="loadingDelay()"
      (buttonClick)="mainClicks = mainClicks + 1"
      (itemClick)="clicks.push($event)"
    >
      Save
      <andes-dropdown-menu-content>
        <andes-dropdown-menu-item id="saveAs" key="save-as"
          >Save as…</andes-dropdown-menu-item
        >
      </andes-dropdown-menu-content>
    </andes-dropdown-button>
  `,
})
class ButtonHost {
  readonly disabled = signal(false);
  readonly loading = signal(false);
  readonly loadingDelay = signal(0);
  mainClicks = 0;
  readonly clicks: AndesDropdownMenuClickEvent[] = [];
}

describe('AndesDropdownButton', () => {
  withElementGeometry();

  let fixture: ComponentFixture<ButtonHost>;
  let host: ButtonHost;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ButtonHost);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  afterEach(() => fixture.destroy());

  const buttons = () =>
    Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLButtonElement>('button'),
    );

  it('renders a main button with the label and an icon-only caret with an accessible name', () => {
    const [main, caret] = buttons();

    expect(buttons()).toHaveLength(2);
    expect(main.textContent?.trim()).toBe('Save');
    expect(caret.getAttribute('aria-label')).toBe('More actions');
  });

  it('the main button emits (buttonClick) and does not open the menu', async () => {
    buttons()[0].click();
    await settle(fixture);

    expect(host.mainClicks).toBe(1);
    expect(menus()).toHaveLength(0);
  });

  it('the caret opens the projected menu, which works like any dropdown menu', async () => {
    buttons()[1].click();
    await settle(fixture);

    expect(menus()).toHaveLength(1);
    expect(
      buttons()[1]
        .closest('[andesdropdownmenutrigger]')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(document.activeElement).toBe(byId('saveAs'));

    byId('saveAs').click();
    await settle(fixture);
    expect(host.clicks[0]).toMatchObject({ key: 'save-as' });
    expect(menus()).toHaveLength(0);
    expect(host.mainClicks).toBe(0);
  });

  it('returns focus to the caret button (not its custom-element host) on Escape', async () => {
    buttons()[1].focus();
    buttons()[1].click();
    await settle(fixture);
    pressKey(document.body, 'Escape');
    await settle(fixture);

    expect(document.activeElement).toBe(buttons()[1]);
  });

  it('defaults to bottomRight, aligned under the caret', () => {
    const overlay = overlayOf(fixture, AndesDropdownButton);
    expect(overlay.config().positioning).toMatchObject({
      side: 'bottom',
      align: 'end',
    });
  });

  it('shows the main button spinner only after loadingDelay', async () => {
    host.loadingDelay.set(40);
    host.loading.set(true);
    await settle(fixture);
    const [main, caret] = buttons();
    expect(main.querySelector('.andes-button__spinner')).toBeNull();

    await settle(fixture, 60);
    expect(main.querySelector('.andes-button__spinner')).toBeTruthy();
    expect(caret.querySelector('.andes-button__spinner')).toBeNull();
  });

  it('disabled disables both halves', async () => {
    host.disabled.set(true);
    await settle(fixture);

    expect(buttons().every((button) => button.disabled)).toBe(true);
    buttons()[1].click();
    await settle(fixture);
    expect(menus()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------

@Component({
  imports: [AndesDropdownMenu, AndesDropdownMenuTrigger, NgTemplateOutlet],
  template: `
    <andes-dropdown-menu
      [items]="items"
      [closeOnSelect]="closeOnSelect()"
      [panelClass]="panelClass()"
      [popupTemplate]="usePopup() ? popupTpl : undefined"
      [subMenuOpenDelay]="0"
      (itemClick)="clicks.push($event)"
    >
      <button type="button" id="trigger" andesDropdownMenuTrigger>
        Options
      </button>
    </andes-dropdown-menu>
    <ng-template #popupTpl let-menu let-close="close">
      <input id="search" aria-label="Search" />
      <ng-container *ngTemplateOutlet="menu" />
      <button type="button" id="footer" (click)="close()">New item</button>
    </ng-template>
  `,
})
class ExtrasHost {
  readonly closeOnSelect = signal<boolean | undefined>(undefined);
  readonly panelClass = signal<string | undefined>(undefined);
  readonly usePopup = signal(false);
  readonly clicks: AndesDropdownMenuClickEvent[] = [];
  readonly items: AndesDropdownMenuItemDef[] = [
    { key: 'docs', label: 'Docs', href: '#docs' },
    { key: 'site', label: 'Website', href: '#site', target: '_blank' },
    { key: 'gone', label: 'Gone', href: '#gone', disabled: true },
    { key: 'pin', label: 'Pin', closeOnSelect: false },
    { key: 'close', label: 'Close me', closeOnSelect: true },
    {
      key: 'more',
      label: 'More',
      popupClass: 'my-submenu',
      popupOffset: [6, 2],
      children: [{ key: 'export', label: 'Export' }],
    },
  ];
}

describe('AndesDropdownMenu - links, closing, custom popup', () => {
  withElementGeometry();

  let fixture: ComponentFixture<ExtrasHost>;
  let host: ExtrasHost;

  beforeEach(() => {
    fixture = TestBed.createComponent(ExtrasHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  async function openMenu() {
    byId('trigger').click();
    await settle(fixture);
  }

  const item = (label: string) =>
    Array.from(
      document.querySelectorAll<HTMLElement>('[role^="menuitem"]'),
    ).find((element) =>
      element.textContent?.trim().startsWith(label),
    ) as HTMLElement;

  describe('link items', () => {
    it('renders the content inside an anchor with href, target and a safe rel', async () => {
      await openMenu();
      const docs = item('Docs').querySelector('a') as HTMLAnchorElement;
      const site = item('Website').querySelector('a') as HTMLAnchorElement;

      expect(docs.getAttribute('href')).toBe('#docs');
      expect(docs.getAttribute('target')).toBeNull();
      expect(docs.getAttribute('tabindex')).toBe('-1');
      expect(docs.textContent?.trim()).toBe('Docs');
      expect(site.getAttribute('target')).toBe('_blank');
      expect(site.getAttribute('rel')).toBe('noopener noreferrer');
      expect(item('Docs').getAttribute('role')).toBe('menuitem');
    });

    it('drops the href of a disabled link item', async () => {
      await openMenu();
      const gone = item('Gone').querySelector('a') as HTMLAnchorElement;
      expect(gone.hasAttribute('href')).toBe(false);
    });

    it('activates through the anchor on Enter, then reports and closes', async () => {
      await openMenu();
      const anchor = item('Docs').querySelector('a') as HTMLAnchorElement;
      const anchorClicks: Event[] = [];
      anchor.addEventListener('click', (event) => {
        anchorClicks.push(event);
        event.preventDefault();
      });

      pressKey(item('Docs'), 'Enter');
      await settle(fixture);

      expect(anchorClicks).toHaveLength(1);
      expect(host.clicks).toHaveLength(1);
      expect(host.clicks[0]).toMatchObject({ key: 'docs', keyPath: ['docs'] });
      expect(menus()).toHaveLength(0);
    });

    it('forwards a click on the row outside the anchor to the anchor', async () => {
      await openMenu();
      const anchor = item('Docs').querySelector('a') as HTMLAnchorElement;
      let anchorClicks = 0;
      anchor.addEventListener('click', (event) => {
        anchorClicks++;
        event.preventDefault();
      });

      item('Docs').click();
      await settle(fixture);

      expect(anchorClicks).toBe(1);
      expect(host.clicks).toHaveLength(1);
    });
  });

  describe('closeOnSelect', () => {
    it('keeps the menu open for an item whose closeOnSelect is false', async () => {
      await openMenu();
      item('Pin').click();
      await settle(fixture);

      expect(host.clicks.at(-1)?.key).toBe('pin');
      expect(menus()).toHaveLength(1);
    });

    it('keeps every plain item open with closeOnSelect=false on the root, unless the item overrides it', async () => {
      host.closeOnSelect.set(false);
      await settle(fixture);
      await openMenu();

      item('Docs')
        .querySelector('a')
        ?.addEventListener('click', (event) => event.preventDefault());
      item('Docs').click();
      await settle(fixture);
      expect(menus()).toHaveLength(1);

      item('Close me').click();
      await settle(fixture);
      expect(menus()).toHaveLength(0);
    });
  });

  describe('submenu options', () => {
    it('applies popupClass to the submenu panel and popupOffset to its position', async () => {
      await openMenu();
      pressKey(item('More'), 'ArrowRight');
      await settle(fixture);

      const panel = document.querySelector(
        '.andes-dropdown-menu__sub-content',
      ) as HTMLElement;
      expect(panel.classList.contains('my-submenu')).toBe(true);
      expect(panel.classList.contains('andes-dropdown-menu__content')).toBe(
        true,
      );
    });
  });

  it('adds panelClass to the overlay pane', async () => {
    host.panelClass.set('wide-menu');
    await settle(fixture);
    await openMenu();

    const pane = menus()[0].closest('.cdk-overlay-pane') as HTMLElement;
    expect(pane.classList.contains('wide-menu')).toBe(true);
  });

  describe('popupTemplate', () => {
    beforeEach(async () => {
      host.usePopup.set(true);
      await settle(fixture);
    });

    it('wraps the menu and the extra content in one popup surface', async () => {
      await openMenu();
      const popup = document.querySelector(
        '.andes-dropdown-menu__popup',
      ) as HTMLElement;

      expect(popup).toBeTruthy();
      expect(popup.querySelector('#search')).toBeTruthy();
      expect(popup.querySelector('[role="menu"]')).toBeTruthy();
      expect(popup.querySelector('#footer')).toBeTruthy();
      expect(popup.getAttribute('data-side')).toBe('bottom');
      expect(getComputedStyle(menus()[0]).boxShadow).toBe('none');
    });

    it('lets the extra content close the popup through the context', async () => {
      await openMenu();
      byId('footer').click();
      await settle(fixture);

      expect(menus()).toHaveLength(0);
    });

    it('leaves keys typed in the extra controls alone', async () => {
      await openMenu();
      const search = byId('search');
      search.focus();
      pressKey(search, 'ArrowDown');
      pressKey(search, 'w');
      await settle(fixture);

      expect(document.activeElement).toBe(search);
      expect(menus()).toHaveLength(1);
    });

    it('still navigates the menu with the arrow keys', async () => {
      await openMenu();
      item('Docs').focus();
      pressKey(item('Docs'), 'ArrowDown');
      await settle(fixture);

      expect(document.activeElement).toBe(item('Website'));
    });

    it('lets Tab move between the menu and the extra controls, closing only past the end', async () => {
      await openMenu();
      item('Docs').focus();
      pressKey(item('Docs'), 'ArrowDown');
      await settle(fixture);

      const tab = pressKey(document.activeElement as HTMLElement, 'Tab');
      await settle(fixture);
      expect(tab.defaultPrevented).toBe(false);
      expect(menus()).toHaveLength(1);

      byId('footer').focus();
      pressKey(byId('footer'), 'Tab');
      await settle(fixture);
      expect(menus()).toHaveLength(0);
    });
  });
});

describe('AndesDropdownMenu panelClass ownership', () => {
  @Component({
    imports: [AndesDropdownMenu, AndesDropdownMenuTrigger],
    template: `<andes-dropdown-menu
      [panelClass]="panelClass()"
      [items]="[{ key: 'a', label: 'A' }]"
    >
      <button type="button" andesDropdownMenuTrigger>Open</button>
    </andes-dropdown-menu>`,
  })
  class PanelClassHost {
    readonly panelClass = signal<string | undefined>(undefined);
  }

  function overlayOf(fixture: ComponentFixture<PanelClassHost>) {
    return fixture.debugElement
      .query(By.directive(AndesDropdownMenu))
      .injector.get(AndesOverlayPrimitive);
  }

  it('leaves pane classes configured by a wrapping component alone while the input is unset', () => {
    const fixture = TestBed.createComponent(PanelClassHost);
    fixture.detectChanges();
    const overlay = overlayOf(fixture);

    overlay.configure({ panelClass: 'wrapper-panel' });
    fixture.detectChanges();

    expect(overlay.config().panelClass).toBe('wrapper-panel');
  });

  it('leaves positioning configured by a wrapping component alone while placement is default', () => {
    const fixture = TestBed.createComponent(PanelClassHost);
    fixture.detectChanges();
    const overlay = overlayOf(fixture);
    const wrapped = {
      kind: 'anchored',
      side: 'top',
      align: 'end',
    } as const;

    overlay.configure({ positioning: wrapped });
    fixture.detectChanges();

    expect(overlay.config().positioning).toMatchObject(wrapped);
  });

  it('applies the input once set and clears it when unset again', () => {
    const fixture = TestBed.createComponent(PanelClassHost);
    fixture.detectChanges();
    const overlay = overlayOf(fixture);

    fixture.componentInstance.panelClass.set('mine');
    fixture.detectChanges();
    expect(overlay.config().panelClass).toBe('mine');

    fixture.componentInstance.panelClass.set(undefined);
    fixture.detectChanges();
    expect(overlay.config().panelClass).toBeNull();
  });
});
