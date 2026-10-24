import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { By } from '@angular/platform-browser';

import { AndesTabs } from './tabs';
import { AndesTabsContent, AndesTabsContentLazy } from './tabs-content';
import { AndesTabsList } from './tabs-list';
import { AndesTabsTrigger } from './tabs-trigger';
import {
  AndesTabsActivationMode,
  AndesTabsAnimated,
  AndesTabsEditEvent,
  AndesTabsIndicator,
  AndesTabsItem,
  AndesTabsMoreTrigger,
  AndesTabsOrientation,
  AndesTabsPosition,
  AndesTabsReorderEvent,
  AndesTabsScrollEvent,
  AndesTabsSize,
  AndesTabsType,
} from './tabs-types';

/**
 * `ListKeyManager` (used internally by `AndesListNavigation`) reads the deprecated-but-
 * universal `KeyboardEvent.keyCode`, which jsdom leaves at 0 on synthetic events.
 */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
  Home: 36,
  End: 35,
  Enter: 13,
  ' ': 32,
  Delete: 46,
};

function keyCodeFor(key: string): number {
  return KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0);
}

function pressKey(
  target: Element,
  key: string,
  modifiers: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  Object.defineProperty(event, 'keyCode', { get: () => keyCodeFor(key) });
  target.dispatchEvent(event);
  return event;
}

@Component({
  imports: [AndesTabs, AndesTabsList, AndesTabsTrigger, AndesTabsContent],
  template: `
    <andes-tabs
      [orientation]="orientation()"
      [activationMode]="activationMode()"
      [(value)]="value"
    >
      <andes-tabs-list>
        <andes-tabs-trigger value="a">Tab A</andes-tabs-trigger>
        <andes-tabs-trigger value="b" [disabled]="bDisabled()"
          >Tab B</andes-tabs-trigger
        >
        <andes-tabs-trigger value="c">Tab C</andes-tabs-trigger>
      </andes-tabs-list>
      <andes-tabs-content value="a">Panel A</andes-tabs-content>
      <andes-tabs-content value="b">Panel B</andes-tabs-content>
      <andes-tabs-content value="c">Panel C</andes-tabs-content>
    </andes-tabs>
  `,
})
class HostComponent {
  readonly orientation = signal<AndesTabsOrientation>('horizontal');
  readonly activationMode = signal<AndesTabsActivationMode>('automatic');
  readonly bDisabled = signal(false);
  readonly value = signal<string | undefined>(undefined);
}

describe('AndesTabs', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return withHelpers(fixture);
  }

  function withHelpers(fixture: ComponentFixture<HostComponent>) {
    const host = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      tablist: host.querySelector('[role="tablist"]') as HTMLElement,
      tabs: () =>
        Array.from(
          host.querySelectorAll('[role="tab"]'),
        ) as HTMLButtonElement[],
      panels: () =>
        Array.from(host.querySelectorAll('[role="tabpanel"]')) as HTMLElement[],
    };
  }

  describe('default selection', () => {
    it('selects the first enabled tab before any interaction', () => {
      const { tabs, panels } = createHost();

      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs()[1].getAttribute('aria-selected')).toBe('false');
      expect(tabs()[2].getAttribute('aria-selected')).toBe('false');
      expect(panels()[0].hidden).toBe(false);
      expect(panels()[1].hidden).toBe(true);
      expect(panels()[2].hidden).toBe(true);
    });
  });

  describe('roles and cross-linking', () => {
    it('sets role="tablist"/"tab"/"tabpanel"', () => {
      const { tablist, tabs, panels } = createHost();

      expect(tablist).toBeTruthy();
      expect(tabs().length).toBe(3);
      expect(panels().length).toBe(3);
    });

    it('cross-links each tab to its panel via aria-controls/aria-labelledby/id', () => {
      const { tabs, panels } = createHost();

      tabs().forEach((tab, i) => {
        const panel = panels()[i];
        expect(tab.getAttribute('aria-controls')).toBe(panel.id);
        expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
        expect(tab.id.length).toBeGreaterThan(0);
        expect(panel.id.length).toBeGreaterThan(0);
      });
    });

    it('gives every tab an explicit aria-selected, true or false', () => {
      const { tabs } = createHost();

      expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
        'false',
      ]);
    });
  });

  describe('accessibility tree', () => {
    it('only the active panel is exposed - inactive ones carry the native hidden attribute', () => {
      const { panels } = createHost();

      expect(panels()[0].hasAttribute('hidden')).toBe(false);
      expect(panels()[1].hasAttribute('hidden')).toBe(true);
      expect(panels()[2].hasAttribute('hidden')).toBe(true);
    });
  });

  describe('automatic activation (default)', () => {
    it('moves both focus and the active tab together with the arrow keys', () => {
      const { fixture, tabs, panels } = createHost();
      tabs()[0].focus();

      pressKey(tabs()[0], 'ArrowRight');
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[1]);
      expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
      expect(tabs()[0].getAttribute('aria-selected')).toBe('false');
      expect(panels()[1].hidden).toBe(false);
      expect(panels()[0].hidden).toBe(true);
    });

    it('wraps around and skips disabled tabs', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.bDisabled.set(true);
      fixture.detectChanges();
      tabs()[0].focus();

      pressKey(tabs()[0], 'ArrowRight');
      fixture.detectChanges();

      // b is disabled, so focus/selection should skip straight to c.
      expect(document.activeElement).toBe(tabs()[2]);
      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('manual activation', () => {
    it('moves focus only with arrow keys, leaving selection to Enter/Space', () => {
      const { fixture, tabs, panels } = createHost();
      fixture.componentInstance.activationMode.set('manual');
      fixture.detectChanges();
      tabs()[0].focus();

      pressKey(tabs()[0], 'ArrowRight');
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[1]);
      // Selection has not moved yet.
      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs()[1].getAttribute('aria-selected')).toBe('false');
      expect(panels()[0].hidden).toBe(false);

      pressKey(tabs()[1], 'Enter');
      fixture.detectChanges();

      expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
      expect(panels()[1].hidden).toBe(false);
    });

    it('activates the focused tab on Space too', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.activationMode.set('manual');
      fixture.detectChanges();
      tabs()[0].focus();

      pressKey(tabs()[0], 'ArrowRight');
      pressKey(tabs()[1], ' ');
      fixture.detectChanges();

      expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('Home and End', () => {
    it('jumps to the first and last tab', () => {
      const { fixture, tabs } = createHost();
      tabs()[0].focus();

      pressKey(tabs()[0], 'End');
      fixture.detectChanges();
      expect(document.activeElement).toBe(tabs()[2]);
      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');

      pressKey(tabs()[2], 'Home');
      fixture.detectChanges();
      expect(document.activeElement).toBe(tabs()[0]);
      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('disabled tabs', () => {
    it('are skipped while navigating and are not focusable', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.bDisabled.set(true);
      fixture.detectChanges();

      expect(tabs()[1].disabled).toBe(true);
      expect(tabs()[1].getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('click activation', () => {
    it('selects a tab on click regardless of activation mode', () => {
      const { fixture, tabs, panels } = createHost();
      fixture.componentInstance.activationMode.set('manual');
      fixture.detectChanges();

      tabs()[2].click();
      fixture.detectChanges();

      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
      expect(panels()[2].hidden).toBe(false);
    });
  });

  describe('vertical orientation', () => {
    it('navigates with the vertical arrow keys and ignores horizontal ones', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.orientation.set('vertical');
      fixture.detectChanges();
      tabs()[0].focus();

      expect(pressKey(tabs()[0], 'ArrowRight').defaultPrevented).toBe(false);

      pressKey(tabs()[0], 'ArrowDown');
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[1]);
    });
  });

  describe('controlled value', () => {
    it('supports two-way binding via [(value)]', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.value.set('c');
      fixture.detectChanges();

      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');

      tabs()[0].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.value()).toBe('a');
    });
  });

  // Regression coverage for a bug where nothing seeded the shared `AndesListNavigation`'s
  // roving-tabindex target from the currently-selected tab, so it fell back to the
  // primitive's own default (the first enabled item). Under automatic activation, a plain
  // Tab into the tablist would then focus the first tab - not the selected one - and
  // silently reselect it via the "focus moved, so select" effect, with no arrow key ever
  // pressed. See the WAI-ARIA APG: Tab must move focus to the active/selected tab.
  describe('roving-tabindex target follows the selected tab', () => {
    it('targets the selected tab (not the first one) before any interaction', () => {
      const fixture = TestBed.createComponent(HostComponent);
      // Selects C - not the first tab - before the first `detectChanges`, mirroring a
      // consumer rendering `AndesTabs` with `[(value)]` already bound to a non-first tab.
      fixture.componentInstance.value.set('c');
      fixture.detectChanges();
      const { tabs } = withHelpers(fixture);

      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
      expect(tabs()[0].getAttribute('tabindex')).toBe('-1');
      expect(tabs()[1].getAttribute('tabindex')).toBe('-1');
      expect(tabs()[2].getAttribute('tabindex')).toBe('0');
    });

    it('does not silently change value when Tab moves focus into the tablist', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.value.set('c');
      fixture.detectChanges();
      const { tabs } = withHelpers(fixture);

      // A real Tab keypress focuses whichever item is the sole roving-tabindex target - a
      // plain `.focus()` on it is the standard way to simulate that in jsdom, since jsdom
      // does not implement native Tab-key traversal.
      const target = tabs().find((tab) => tab.getAttribute('tabindex') === '0');
      expect(target).toBe(tabs()[2]);
      target?.focus();
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[2]);
      expect(fixture.componentInstance.value()).toBe('c');
      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
    });

    it('updates when a consumer sets [value] programmatically, without breaking automatic activation for subsequent arrow-key navigation', () => {
      const { fixture, tabs } = createHost();

      // Default selection is the first enabled tab; the target starts on A.
      expect(tabs()[0].getAttribute('tabindex')).toBe('0');

      // Not a click, not a keypress - a plain programmatic value change.
      fixture.componentInstance.value.set('c');
      fixture.detectChanges();

      expect(tabs()[2].getAttribute('tabindex')).toBe('0');
      expect(tabs()[0].getAttribute('tabindex')).toBe('-1');
      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');

      // Automatic activation still works normally afterwards: arrowing right from C wraps to A.
      tabs()[2].focus();
      pressKey(tabs()[2], 'ArrowRight');
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[0]);
      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
      expect(fixture.componentInstance.value()).toBe('a');
    });
  });
});

interface TestTab {
  key: string;
  disabled?: boolean;
  closable?: boolean;
}

@Component({
  imports: [
    AndesTabs,
    AndesTabsList,
    AndesTabsTrigger,
    AndesTabsContent,
    AndesTabsContentLazy,
  ],
  template: `
    <ng-template #addTpl><span class="custom-add">add</span></ng-template>
    <ng-template #removeTpl><span class="custom-remove">x</span></ng-template>
    <ng-template #extraLeftTpl><span class="extra-left">L</span></ng-template>
    <ng-template #extraRightTpl><span class="extra-right">R</span></ng-template>
    <ng-template #moreTpl let-hidden let-select="select">
      @for (tab of hidden; track tab.key) {
        <button class="custom-more" (click)="select(tab.key)">
          {{ tab.label }}
        </button>
      }
    </ng-template>
    <andes-tabs
      [draggable]="draggable()"
      [more]="more()"
      [moreSearch]="moreSearch()"
      [moreTrigger]="moreTrigger()"
      [moreTemplate]="customMore() ? moreTpl : undefined"
      [tabBarStyle]="barStyle()"
      [tabBarClass]="barClass()"
      (reorder)="onReorder($event)"
      [type]="type()"
      [tabPosition]="position()"
      [orientation]="orientation()"
      [size]="size()"
      [centered]="centered()"
      [tabBarGutter]="gutter()"
      [animated]="animated()"
      [indicator]="indicator()"
      [destroyOnHidden]="destroyOnHidden()"
      [hideAdd]="hideAdd()"
      [addIcon]="customIcons() ? addTpl : undefined"
      [removeIcon]="customIcons() ? removeTpl : undefined"
      [tabBarExtraContent]="
        extra() ? { left: extraLeftTpl, right: extraRightTpl } : undefined
      "
      [(value)]="value"
      (edit)="onEdit($event)"
      (tabClick)="clicked.push($event.key)"
      (tabScroll)="scrolls.push($event)"
    >
      <span andesTabsExtraLeft class="projected-extra">P</span>
      <andes-tabs-list>
        @for (tab of tabs(); track tab.key) {
          <andes-tabs-trigger
            [value]="tab.key"
            [disabled]="!!tab.disabled"
            [closable]="tab.closable ?? true"
            >Tab {{ tab.key }}</andes-tabs-trigger
          >
        }
      </andes-tabs-list>
      @for (tab of tabs(); track tab.key) {
        <andes-tabs-content
          [value]="tab.key"
          [destroyOnHidden]="panelDestroy()[tab.key]"
          [forceRender]="tab.key === forceKey()"
        >
          <span class="eager">eager {{ tab.key }}</span>
          <ng-template andesTabsContentLazy
            ><span class="lazy">lazy {{ tab.key }}</span></ng-template
          >
        </andes-tabs-content>
      }
    </andes-tabs>
  `,
})
class FeatureHost {
  readonly tabs = signal<TestTab[]>([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);
  readonly type = signal<AndesTabsType>('line');
  readonly position = signal<AndesTabsPosition | undefined>(undefined);
  readonly orientation = signal<AndesTabsOrientation>('horizontal');
  readonly size = signal<AndesTabsSize>('md');
  readonly centered = signal(false);
  readonly gutter = signal<number | undefined>(undefined);
  readonly animated = signal<boolean | AndesTabsAnimated>({
    inkBar: true,
    tabPane: false,
  });
  readonly indicator = signal<AndesTabsIndicator | undefined>(undefined);
  readonly destroyOnHidden = signal(false);
  readonly panelDestroy = signal<Record<string, boolean | undefined>>({});
  readonly forceKey = signal<string | undefined>(undefined);
  readonly hideAdd = signal(false);
  readonly customIcons = signal(false);
  readonly extra = signal(false);
  readonly value = signal<string | undefined>(undefined);
  readonly draggable = signal(false);
  readonly more = signal(true);
  readonly moreSearch = signal(false);
  readonly moreTrigger = signal<AndesTabsMoreTrigger>('click');
  readonly customMore = signal(false);
  readonly barStyle = signal<Record<string, string> | undefined>(undefined);
  readonly barClass = signal<string | undefined>(undefined);

  readonly edits: AndesTabsEditEvent[] = [];
  readonly reorders: AndesTabsReorderEvent[] = [];
  autoReorder = false;

  onReorder(event: AndesTabsReorderEvent): void {
    this.reorders.push(event);
    if (this.autoReorder) {
      this.tabs.update((tabs) => {
        const next = [...tabs];
        const [moved] = next.splice(event.previousIndex, 1);
        next.splice(event.currentIndex, 0, moved);
        return next;
      });
    }
  }

  readonly clicked: string[] = [];
  readonly scrolls: AndesTabsScrollEvent[] = [];
  autoRemove = false;

  onEdit(event: AndesTabsEditEvent): void {
    this.edits.push(event);
    if (this.autoRemove && event.action === 'remove') {
      this.tabs.update((tabs) => tabs.filter((t) => t.key !== event.key));
    }
  }
}

@Component({
  imports: [AndesTabs],
  template: `
    <ng-template #iconTpl><svg class="item-icon"></svg></ng-template>
    <ng-template #labelTpl><em class="rich-label">Rich</em></ng-template>
    <ng-template #contentTpl
      ><p class="rich-content">Rich content</p></ng-template
    >
    <andes-tabs
      [items]="items()"
      [(value)]="value"
      [destroyOnHidden]="destroyOnHidden()"
    />
  `,
})
class ItemsHost {
  readonly iconTpl = viewChild.required('iconTpl', { read: TemplateRef });
  readonly labelTpl = viewChild.required('labelTpl', { read: TemplateRef });
  readonly contentTpl = viewChild.required('contentTpl', { read: TemplateRef });
  readonly items = signal<AndesTabsItem[]>([
    { key: 'one', label: 'One', content: 'Plain one' },
    { key: 'two', label: 'Two', content: 'Plain two' },
    { key: 'three', label: 'Three', content: 'Plain three', disabled: true },
  ]);
  readonly value = signal<string | undefined>(undefined);
  readonly destroyOnHidden = signal(false);
}

/** Stubs `getBoundingClientRect` on one element - jsdom lays nothing out. */
function stubRect(
  element: Element,
  rect: { left?: number; top?: number; width?: number; height?: number },
): void {
  const { left = 0, top = 0, width = 0, height = 0 } = rect;
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }),
  });
}

/** Stubs a scroll container's scroll geometry, keeping its scroll offsets writable. */
function stubScroll(
  element: Element,
  geometry: {
    scrollWidth?: number;
    clientWidth?: number;
    scrollHeight?: number;
    clientHeight?: number;
  },
): void {
  for (const [key, value] of Object.entries(geometry)) {
    Object.defineProperty(element, key, { configurable: true, value });
  }
  for (const key of ['scrollLeft', 'scrollTop']) {
    Object.defineProperty(element, key, {
      configurable: true,
      writable: true,
      value: 0,
    });
  }
}

describe('AndesTabs (extended features)', () => {
  async function createFeatureHost(
    setup?: (host: FeatureHost) => void,
  ): Promise<{
    fixture: ComponentFixture<FeatureHost>;
    host: HTMLElement;
    root: HTMLElement;
    tabs: () => HTMLButtonElement[];
    triggers: () => HTMLElement[];
    panels: () => HTMLElement[];
    q: (selector: string) => HTMLElement | null;
    qa: (selector: string) => HTMLElement[];
    settle: () => Promise<void>;
  }> {
    const fixture = TestBed.createComponent(FeatureHost);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host,
      root: host.querySelector('andes-tabs') as HTMLElement,
      tabs: () =>
        Array.from(
          host.querySelectorAll('[role="tab"]'),
        ) as HTMLButtonElement[],
      triggers: () =>
        Array.from(
          host.querySelectorAll('andes-tabs-trigger'),
        ) as HTMLElement[],
      panels: () =>
        Array.from(host.querySelectorAll('[role="tabpanel"]')) as HTMLElement[],
      q: (selector) => host.querySelector(selector),
      qa: (selector) =>
        Array.from(host.querySelectorAll(selector)) as HTMLElement[],
      settle: async () => {
        fixture.detectChanges();
        await fixture.whenStable();
      },
    };
  }

  describe('type', () => {
    it('defaults to line: an ink bar variant with no add/remove controls', async () => {
      const { root, triggers, q } = await createFeatureHost();

      expect(root.getAttribute('data-type')).toBe('line');
      expect(triggers()[0].getAttribute('data-variant')).toBe('line');
      expect(q('.andes-tabs__add')).toBeNull();
      expect(q('.andes-tabs__remove')).toBeNull();
    });

    it('card marks every trigger as a card but still renders no add/remove controls', async () => {
      const { triggers, q } = await createFeatureHost((h) =>
        h.type.set('card'),
      );

      expect(triggers().map((t) => t.getAttribute('data-variant'))).toEqual([
        'card',
        'card',
        'card',
      ]);
      expect(q('.andes-tabs__add')).toBeNull();
      expect(q('.andes-tabs__remove')).toBeNull();
      expect(q('.andes-tabs__ink-bar')).toBeNull();
    });
  });

  describe('editable-card', () => {
    const editable = (h: FeatureHost) => h.type.set('editable-card');

    it('renders an accessible add button outside the tablist', async () => {
      const { q } = await createFeatureHost(editable);
      const add = q('.andes-tabs__add') as HTMLButtonElement;

      expect(add).toBeTruthy();
      expect(add.getAttribute('aria-label')).toBe('Add tab');
      expect(add.closest('[role="tablist"]')).toBeNull();
    });

    it('emits (edit) with action "add" when the add button is clicked', async () => {
      const { fixture, q } = await createFeatureHost(editable);

      (q('.andes-tabs__add') as HTMLButtonElement).click();

      expect(fixture.componentInstance.edits).toEqual([
        expect.objectContaining({ action: 'add' }),
      ]);
    });

    it('hides the add button with hideAdd', async () => {
      const { q } = await createFeatureHost((h) => {
        editable(h);
        h.hideAdd.set(true);
      });

      expect(q('.andes-tabs__add')).toBeNull();
    });

    it('renders a pointer-only remove button per closable tab', async () => {
      const { qa, tabs } = await createFeatureHost(editable);
      const removes = qa('.andes-tabs__remove');

      expect(removes.length).toBe(3);
      removes.forEach((button) => {
        expect(button.getAttribute('tabindex')).toBe('-1');
        expect(button.getAttribute('aria-hidden')).toBe('true');
      });
      expect(tabs()[0].getAttribute('aria-keyshortcuts')).toBe('Delete');
    });

    it('emits (edit) with action "remove" from the remove button without selecting that tab', async () => {
      const { fixture, qa, tabs } = await createFeatureHost(editable);

      qa('.andes-tabs__remove')[1].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.edits).toEqual([
        expect.objectContaining({ action: 'remove', key: 'b' }),
      ]);
      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('omits the remove button for closable=false, disabled tabs and a null closeIcon', async () => {
      const { qa, triggers } = await createFeatureHost((h) => {
        editable(h);
        h.tabs.set([
          { key: 'a', closable: false },
          { key: 'b', disabled: true },
          { key: 'c' },
        ]);
      });

      expect(qa('.andes-tabs__remove').length).toBe(1);
      expect(triggers()[2].querySelector('.andes-tabs__remove')).toBeTruthy();
    });

    it('renders custom add/remove icons', async () => {
      const { qa, q } = await createFeatureHost((h) => {
        editable(h);
        h.customIcons.set(true);
      });

      expect(q('.andes-tabs__add .custom-add')).toBeTruthy();
      expect(qa('.andes-tabs__remove .custom-remove').length).toBe(3);
    });

    it('removes the focused tab on Delete and moves focus to the following tab', async () => {
      const { fixture, tabs, settle } = await createFeatureHost((h) => {
        editable(h);
        h.autoRemove = true;
      });
      tabs()[0].focus();

      pressKey(tabs()[0], 'Delete');
      await settle();

      expect(fixture.componentInstance.edits).toEqual([
        expect.objectContaining({ action: 'remove', key: 'a' }),
      ]);
      expect(tabs().length).toBe(2);
      expect(document.activeElement).toBe(tabs()[0]);
      expect(tabs()[0].textContent?.trim()).toBe('Tab b');
      // Automatic activation: the focus move selects the new tab too.
      expect(fixture.componentInstance.value()).toBe('b');
    });

    it('ignores Delete outside editable-card', async () => {
      const { fixture, tabs } = await createFeatureHost();
      tabs()[0].focus();

      pressKey(tabs()[0], 'Delete');

      expect(fixture.componentInstance.edits).toEqual([]);
    });
  });

  describe('tabPosition', () => {
    it('lays the bar out on the requested side', async () => {
      const { fixture, root, settle } = await createFeatureHost();
      expect(root.getAttribute('data-position')).toBe('top');

      for (const position of ['bottom', 'left', 'right'] as const) {
        fixture.componentInstance.position.set(position);
        await settle();
        expect(root.getAttribute('data-position')).toBe(position);
        expect(
          root
            .querySelector('.andes-tabs__bar')
            ?.classList.contains(`andes-tabs__bar--${position}`),
        ).toBe(true);
      }
    });

    it('left/right switch the tablist to vertical keyboard navigation', async () => {
      const { fixture, tabs, q } = await createFeatureHost((h) =>
        h.position.set('right'),
      );
      expect(q('[role="tablist"]')?.getAttribute('aria-orientation')).toBe(
        'vertical',
      );
      tabs()[0].focus();

      pressKey(tabs()[0], 'ArrowDown');
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[1]);
    });

    it('bottom keeps horizontal navigation', async () => {
      const { q } = await createFeatureHost((h) => h.position.set('bottom'));

      expect(q('[role="tablist"]')?.getAttribute('aria-orientation')).toBe(
        'horizontal',
      );
    });

    it('treats orientation="vertical" as tabPosition="left" when no position is set', async () => {
      const { root } = await createFeatureHost((h) =>
        h.orientation.set('vertical'),
      );

      expect(root.getAttribute('data-position')).toBe('left');
    });

    it('lets an explicit tabPosition win over orientation', async () => {
      const { root, q } = await createFeatureHost((h) => {
        h.orientation.set('vertical');
        h.position.set('top');
      });

      expect(root.getAttribute('data-position')).toBe('top');
      expect(q('[role="tablist"]')?.getAttribute('aria-orientation')).toBe(
        'horizontal',
      );
    });
  });

  describe('size, centered and tabBarGutter', () => {
    it('forwards size to every trigger', async () => {
      const { fixture, triggers, settle } = await createFeatureHost();
      expect(triggers()[0].getAttribute('data-size')).toBe('md');

      fixture.componentInstance.size.set('lg');
      await settle();

      expect(
        triggers().every((t) => t.getAttribute('data-size') === 'lg'),
      ).toBe(true);
    });

    it('centers the tabs', async () => {
      const { q } = await createFeatureHost((h) => h.centered.set(true));

      expect(
        q('.andes-tabs__bar')?.classList.contains('andes-tabs__bar--centered'),
      ).toBe(true);
    });

    it('applies tabBarGutter as the gap between tabs', async () => {
      const { q } = await createFeatureHost((h) => h.gutter.set(24));

      expect((q('[role="tablist"]') as HTMLElement).style.gap).toBe('24px');
    });
  });

  describe('tabBarExtraContent', () => {
    it('renders projected andesTabsExtraLeft content outside the tablist', async () => {
      const { q } = await createFeatureHost();
      const extra = q('.projected-extra');

      expect(extra?.closest('.andes-tabs__extra--left')).toBeTruthy();
      expect(extra?.closest('[role="tablist"]')).toBeNull();
    });

    it('renders the { left, right } templates on either side of the tabs', async () => {
      const { q } = await createFeatureHost((h) => h.extra.set(true));

      expect(q('.andes-tabs__extra--left .extra-left')).toBeTruthy();
      expect(q('.andes-tabs__extra--right .extra-right')).toBeTruthy();
    });
  });

  describe('outputs', () => {
    it('emits (tabClick) with the clicked key before selecting it', async () => {
      const { fixture, tabs } = await createFeatureHost();

      tabs()[2].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.clicked).toEqual(['c']);
      expect(fixture.componentInstance.value()).toBe('c');
    });

    it('emits (tabScroll) with the scroll direction', async () => {
      const { fixture, q } = await createFeatureHost();
      const scroller = q('.andes-tabs__nav-wrap') as HTMLElement;
      stubScroll(scroller, { scrollWidth: 600, clientWidth: 200 });

      scroller.scrollLeft = 100;
      scroller.dispatchEvent(new Event('scroll'));
      scroller.scrollLeft = 40;
      scroller.dispatchEvent(new Event('scroll'));

      expect(fixture.componentInstance.scrolls).toEqual([
        { direction: 'right' },
        { direction: 'left' },
      ]);
    });
  });

  describe('overflow', () => {
    it('shows pointer-only scroll arrows once the tabs overflow, and scrolls with them', async () => {
      const { fixture, q, settle } = await createFeatureHost();
      expect(q('.andes-tabs__scroll')).toBeNull();

      const scroller = q('.andes-tabs__nav-wrap') as HTMLElement;
      stubScroll(scroller, { scrollWidth: 600, clientWidth: 200 });
      // Any layout-affecting change re-measures; a real browser gets there via ResizeObserver.
      fixture.componentInstance.size.set('lg');
      await settle();

      const prev = q('.andes-tabs__scroll--prev') as HTMLButtonElement;
      const next = q('.andes-tabs__scroll--next') as HTMLButtonElement;
      expect(prev.getAttribute('aria-hidden')).toBe('true');
      expect(prev.getAttribute('tabindex')).toBe('-1');
      expect(prev.disabled).toBe(true);
      expect(next.disabled).toBe(false);
      expect(prev.closest('[role="tablist"]')).toBeNull();

      next.click();
      scroller.dispatchEvent(new Event('scroll'));
      await settle();

      expect(scroller.scrollLeft).toBe(160);
      expect(prev.disabled).toBe(false);
    });

    it('fades only the edges the bar can still scroll past', async () => {
      const { fixture, q, settle } = await createFeatureHost();
      const scroller = q('.andes-tabs__nav-wrap') as HTMLElement;
      const fades = () => ({
        start: scroller.classList.contains('andes-tabs__nav-wrap--fade-start'),
        end: scroller.classList.contains('andes-tabs__nav-wrap--fade-end'),
      });
      expect(fades()).toEqual({ start: false, end: false });

      stubScroll(scroller, { scrollWidth: 600, clientWidth: 200 });
      fixture.componentInstance.size.set('lg');
      await settle();
      expect(fades()).toEqual({ start: false, end: true });

      scroller.scrollLeft = 200;
      scroller.dispatchEvent(new Event('scroll'));
      await settle();
      expect(fades()).toEqual({ start: true, end: true });

      scroller.scrollLeft = 400;
      scroller.dispatchEvent(new Event('scroll'));
      await settle();
      expect(fades()).toEqual({ start: true, end: false });
    });

    it('fades along the reading direction, top to bottom when vertical', () => {
      const css = readFileSync('packages/ui/src/lib/tabs/tabs.css', 'utf8');
      expect(css).toMatch(
        /\.andes-tabs__nav-wrap:dir\(rtl\)\s*\{\s*--andes-tabs-fade-direction: to left;/,
      );
      expect(css).toMatch(
        /\.andes-tabs__bar--vertical \.andes-tabs__nav-wrap\s*\{\s*--andes-tabs-fade-direction: to bottom;/,
      );
    });
  });

  describe('ink bar and indicator', () => {
    async function withLayout(setup?: (host: FeatureHost) => void) {
      const harness = await createFeatureHost(setup);
      stubRect(harness.q('.andes-tabs__nav') as HTMLElement, {
        left: 100,
        top: 50,
        width: 400,
        height: 40,
      });
      const [a, b, c] = harness.triggers();
      stubRect(a, { left: 100, top: 50, width: 60, height: 40 });
      stubRect(b, { left: 160, top: 90, width: 100, height: 40 });
      stubRect(c, { left: 260, top: 130, width: 80, height: 40 });
      return harness;
    }

    it('sits under the selected tab and follows the selection', async () => {
      const { fixture, q, settle } = await withLayout();
      fixture.componentInstance.value.set('b');
      await settle();

      const ink = q('.andes-tabs__ink-bar') as HTMLElement;
      expect(ink.style.left).toBe('60px');
      expect(ink.style.width).toBe('100px');
      expect(ink.getAttribute('aria-hidden')).toBe('true');
      expect(ink.classList.contains('andes-tabs__ink-bar--animated')).toBe(
        true,
      );
    });

    it('uses top/height for a vertical bar', async () => {
      const { fixture, q, settle } = await withLayout((h) =>
        h.position.set('left'),
      );
      fixture.componentInstance.value.set('c');
      await settle();

      const ink = q('.andes-tabs__ink-bar') as HTMLElement;
      expect(ink.style.top).toBe('80px');
      expect(ink.style.height).toBe('40px');
    });

    it('honors indicator size (number or function) and align', async () => {
      const { fixture, q, settle } = await withLayout((h) =>
        h.indicator.set({ size: 20, align: 'start' }),
      );
      fixture.componentInstance.value.set('b');
      await settle();
      const ink = () => q('.andes-tabs__ink-bar') as HTMLElement;
      expect(ink().style.left).toBe('60px');
      expect(ink().style.width).toBe('20px');

      fixture.componentInstance.indicator.set({
        size: (origin) => origin / 2,
        align: 'end',
      });
      await settle();
      expect(ink().style.left).toBe('110px');
      expect(ink().style.width).toBe('50px');

      fixture.componentInstance.indicator.set({ size: 40 });
      await settle();
      expect(ink().style.left).toBe('90px');
    });

    it('does not animate when animated is false', async () => {
      const { fixture, q, settle } = await withLayout((h) =>
        h.animated.set(false),
      );
      fixture.componentInstance.value.set('b');
      await settle();

      expect(
        q('.andes-tabs__ink-bar')?.classList.contains(
          'andes-tabs__ink-bar--animated',
        ),
      ).toBe(false);
    });
  });

  describe('animated tab panes', () => {
    it('only animates panels when tabPane animation is on', async () => {
      const { fixture, panels, settle } = await createFeatureHost();
      expect(
        panels()[0].classList.contains('andes-tabs-content--animated'),
      ).toBe(false);

      fixture.componentInstance.animated.set(true);
      await settle();
      expect(
        panels()[0].classList.contains('andes-tabs-content--animated'),
      ).toBe(true);
    });
  });

  describe('lazy content and destroyOnHidden', () => {
    it('renders lazy content on first activation and keeps it afterwards', async () => {
      const { fixture, panels, settle } = await createFeatureHost();
      const lazyIn = (i: number) => panels()[i].querySelector('.lazy');

      expect(lazyIn(0)).toBeTruthy();
      expect(lazyIn(1)).toBeNull();
      // Plain projected content is always rendered - only hidden.
      expect(panels()[1].querySelector('.eager')).toBeTruthy();

      fixture.componentInstance.value.set('b');
      await settle();
      expect(lazyIn(1)).toBeTruthy();

      fixture.componentInstance.value.set('a');
      await settle();
      expect(lazyIn(1)).toBeTruthy();
      expect(panels()[1].hidden).toBe(true);
    });

    it('destroys hidden lazy content with destroyOnHidden', async () => {
      const { fixture, panels, settle } = await createFeatureHost((h) =>
        h.destroyOnHidden.set(true),
      );

      fixture.componentInstance.value.set('b');
      await settle();
      expect(panels()[0].querySelector('.lazy')).toBeNull();
      expect(panels()[1].querySelector('.lazy')).toBeTruthy();
    });

    it('lets a panel override the Tabs-level destroyOnHidden', async () => {
      const { fixture, panels, settle } = await createFeatureHost((h) => {
        h.destroyOnHidden.set(true);
        h.panelDestroy.set({ a: false });
      });

      fixture.componentInstance.value.set('b');
      await settle();
      expect(panels()[0].querySelector('.lazy')).toBeTruthy();
    });

    it('pre-renders a panel with forceRender', async () => {
      const { panels } = await createFeatureHost((h) => h.forceKey.set('c'));

      expect(panels()[2].querySelector('.lazy')).toBeTruthy();
      expect(panels()[1].querySelector('.lazy')).toBeNull();
    });
  });

  describe('stale value', () => {
    it('falls back to the first enabled tab once value names a removed tab', async () => {
      const { tabs, panels, settle } = await createFeatureHost((h) => {
        h.type.set('editable-card');
        h.autoRemove = true;
        h.value.set('b');
      });

      // A mouse click on the remove button leaves focus where it was.
      (
        tabs()[1].parentElement?.querySelector(
          '.andes-tabs__remove',
        ) as HTMLButtonElement
      ).click();
      await settle();

      expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
      ]);
      expect(panels()[0].hidden).toBe(false);
    });
  });

  describe('tabBarStyle and tabBarClass', () => {
    it('applies inline styles and extra classes to the tab bar', async () => {
      const { q } = await createFeatureHost((h) => {
        h.barStyle.set({ position: 'sticky', top: '0px' });
        h.barClass.set('my-bar');
      });
      const bar = q('.andes-tabs__bar') as HTMLElement;

      expect(bar.style.position).toBe('sticky');
      expect(bar.style.top).toBe('0px');
      expect(bar.classList.contains('my-bar')).toBe(true);
      expect(bar.classList.contains('andes-tabs__bar--top')).toBe(true);
    });
  });

  describe('draggable', () => {
    it('keeps dragging off by default', async () => {
      const { q, triggers, tabs } = await createFeatureHost();

      expect(
        q('andes-tabs-list')?.classList.contains('cdk-drop-list-disabled'),
      ).toBe(true);
      expect(triggers().some((t) => t.hasAttribute('data-draggable'))).toBe(
        false,
      );
      expect(tabs()[0].getAttribute('aria-keyshortcuts')).toBeNull();
    });

    it('makes every enabled tab draggable and advertises the keyboard alternative', async () => {
      const { q, triggers, tabs } = await createFeatureHost((h) => {
        h.draggable.set(true);
        h.tabs.set([{ key: 'a' }, { key: 'b', disabled: true }, { key: 'c' }]);
      });

      expect(
        q('andes-tabs-list')?.classList.contains('cdk-drop-list-disabled'),
      ).toBe(false);
      expect(triggers().map((t) => t.hasAttribute('data-draggable'))).toEqual([
        true,
        false,
        true,
      ]);
      expect(tabs()[0].getAttribute('aria-keyshortcuts')).toBe(
        'Alt+Shift+ArrowLeft Alt+Shift+ArrowRight',
      );
    });

    it('emits (reorder) when a dragged tab is dropped at a new index', async () => {
      const { fixture } = await createFeatureHost((h) => h.draggable.set(true));
      const dropList = fixture.debugElement
        .query(By.directive(AndesTabsList))
        .injector.get(CdkDropList);

      dropList.dropped.emit({
        item: { data: 'c' },
        previousIndex: 2,
        currentIndex: 0,
      } as never);
      dropList.dropped.emit({
        item: { data: 'b' },
        previousIndex: 1,
        currentIndex: 1,
      } as never);

      expect(fixture.componentInstance.reorders).toEqual([
        { key: 'c', previousIndex: 2, currentIndex: 0 },
      ]);
    });

    it('moves the focused tab one step with Alt+Shift+arrow keys', async () => {
      const { fixture, tabs } = await createFeatureHost((h) =>
        h.draggable.set(true),
      );

      pressKey(tabs()[0], 'ArrowRight', { altKey: true, shiftKey: true });
      pressKey(tabs()[0], 'ArrowLeft', { altKey: true, shiftKey: true });
      pressKey(tabs()[2], 'ArrowRight', { altKey: true, shiftKey: true });

      expect(fixture.componentInstance.reorders).toEqual([
        { key: 'a', previousIndex: 0, currentIndex: 1 },
      ]);
    });

    it('ignores Alt+Shift+arrow keys when not draggable', async () => {
      const { fixture, tabs } = await createFeatureHost();

      pressKey(tabs()[0], 'ArrowRight', { altKey: true, shiftKey: true });

      expect(fixture.componentInstance.reorders).toEqual([]);
    });

    it('keeps focus on a moved tab, and arrow keys follow the new order', async () => {
      const { fixture, tabs, settle } = await createFeatureHost((h) => {
        h.draggable.set(true);
        h.autoReorder = true;
      });
      const tabA = tabs()[0];
      tabA.focus();

      pressKey(tabA, 'ArrowRight', { altKey: true, shiftKey: true });
      await settle();
      // Let the list's MutationObserver report the move.
      await Promise.resolve();
      await settle();

      expect(tabs().map((t) => t.textContent?.trim())).toEqual([
        'Tab b',
        'Tab a',
        'Tab c',
      ]);
      expect(document.activeElement).toBe(tabA);

      pressKey(tabA, 'ArrowRight');
      await settle();
      expect(document.activeElement?.textContent?.trim()).toBe('Tab c');
      expect(fixture.componentInstance.value()).toBe('c');
    });
  });

  describe('overflow menu', () => {
    async function overflowing(setup?: (host: FeatureHost) => void) {
      const harness = await createFeatureHost(setup);
      const scroller = harness.q('.andes-tabs__nav-wrap') as HTMLElement;
      stubScroll(scroller, { scrollWidth: 600, clientWidth: 200 });
      stubRect(scroller, { left: 0, width: 200, height: 40 });
      const [a, b, c] = harness.triggers();
      // "a" is scrolled off the start, "c" sticks out past the end.
      stubRect(a, { left: -60, width: 60, height: 40 });
      stubRect(b, { left: 0, width: 100, height: 40 });
      stubRect(c, { left: 160, width: 100, height: 40 });
      // Any layout-affecting change re-measures; a real browser gets there via ResizeObserver.
      harness.fixture.componentInstance.size.set('lg');
      await harness.settle();
      return {
        ...harness,
        moreButton: () => harness.q('.andes-tabs__more') as HTMLButtonElement,
        menu: () => document.querySelector('andes-tabs-more-menu'),
      };
    }

    afterEach(() => {
      document.querySelector('.cdk-overlay-container')?.replaceChildren();
    });

    it('shows no "more" button while the tabs fit', async () => {
      const { q } = await createFeatureHost();
      expect(q('.andes-tabs__more')).toBeNull();
    });

    it('shows a "more" button outside the tablist once the tabs overflow', async () => {
      const { moreButton } = await overflowing();
      const more = moreButton();

      expect(more).toBeTruthy();
      expect(more.getAttribute('aria-label')).toBe('More tabs');
      expect(more.getAttribute('aria-haspopup')).toBe('menu');
      expect(more.getAttribute('aria-expanded')).toBe('false');
      expect(more.closest('[role="tablist"]')).toBeNull();
    });

    it('can be turned off with [more]="false"', async () => {
      const { q } = await overflowing((h) => h.more.set(false));
      expect(q('.andes-tabs__more')).toBeNull();
      expect(q('.andes-tabs__scroll')).toBeTruthy();
    });

    it('lists the tabs scrolled out of view and selects the one picked', async () => {
      const { fixture, moreButton, menu, tabs, settle } = await overflowing();

      moreButton().click();
      await settle();

      expect(menu()?.getAttribute('role')).toBe('menu');
      expect(moreButton().getAttribute('aria-expanded')).toBe('true');
      const items = Array.from(
        menu()?.querySelectorAll('[role="menuitem"]') ?? [],
      ) as HTMLElement[];
      expect(items.map((item) => item.textContent?.trim())).toEqual([
        'Tab a',
        'Tab c',
      ]);

      items[1].click();
      await settle();

      expect(fixture.componentInstance.value()).toBe('c');
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(tabs()[2]);
    });

    it('picks a menu item with Enter', async () => {
      const { fixture, moreButton, menu, settle } = await overflowing();
      moreButton().click();
      await settle();

      const item = menu()?.querySelector('[role="menuitem"]') as HTMLElement;
      pressKey(item, 'Enter');
      await settle();

      expect(fixture.componentInstance.value()).toBe('a');
    });

    it('filters the menu with moreSearch and picks the active option with Enter', async () => {
      const { fixture, moreButton, menu, settle } = await overflowing((h) =>
        h.moreSearch.set(true),
      );
      expect(moreButton().getAttribute('aria-haspopup')).toBe('dialog');
      moreButton().click();
      await settle();

      expect(menu()?.getAttribute('role')).toBe('dialog');
      const input = menu()?.querySelector(
        'input[role="combobox"]',
      ) as HTMLInputElement;
      expect(menu()?.querySelector('[role="listbox"]')).toBeTruthy();

      input.value = 'zz';
      input.dispatchEvent(new Event('input'));
      await settle();
      expect(menu()?.querySelectorAll('[role="option"]').length).toBe(0);
      expect(menu()?.textContent).toContain('No matching tabs');

      input.value = 'C';
      input.dispatchEvent(new Event('input'));
      await settle();
      const options = Array.from(
        menu()?.querySelectorAll('[role="option"]') ?? [],
      ) as HTMLElement[];
      expect(options.map((o) => o.textContent?.trim())).toEqual(['Tab c']);
      expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id);

      pressKey(input, 'Enter');
      await settle();
      expect(fixture.componentInstance.value()).toBe('c');
    });

    it('gives the moreSearch field a single focus indicator, not an outline frame', async () => {
      const { moreButton, menu, settle } = await overflowing((h) =>
        h.moreSearch.set(true),
      );
      moreButton().click();
      await settle();

      const input = menu()?.querySelector(
        '.andes-tabs-more__search',
      ) as HTMLInputElement;
      input.focus();
      const focused = getComputedStyle(input);
      expect(focused.height).toBe('2rem');
      // One indicator only: the primary border and its 2px soft ring.
      expect(
        focused.outlineStyle === '' || focused.outlineStyle === 'none',
      ).toBe(true);
      expect(focused.getPropertyValue('outline')).not.toMatch(/2px/);
      expect(document.activeElement).toBe(input);
      expect(focused.boxShadow).toBe(
        '0 0 0 2px color-mix(in srgb, var(--andes-color-primary) 20%, transparent)',
      );
    });

    it('offers remove buttons for removable tabs in an editable-card menu', async () => {
      const { fixture, moreButton, menu, settle } = await overflowing((h) =>
        h.type.set('editable-card'),
      );
      moreButton().click();
      await settle();

      const remove = menu()?.querySelector(
        '.andes-tabs-more__remove',
      ) as HTMLButtonElement;
      expect(remove.getAttribute('aria-hidden')).toBe('true');
      remove.click();

      expect(fixture.componentInstance.edits).toEqual([
        expect.objectContaining({ action: 'remove', key: 'a' }),
      ]);
    });

    it('renders a custom moreTemplate with the hidden tabs and a select function', async () => {
      const { fixture, moreButton, settle } = await overflowing((h) =>
        h.customMore.set(true),
      );
      moreButton().click();
      await settle();

      const buttons = Array.from(
        document.querySelectorAll('.custom-more'),
      ) as HTMLButtonElement[];
      expect(buttons.map((b) => b.textContent?.trim())).toEqual([
        'Tab a',
        'Tab c',
      ]);
      expect(
        document.querySelector('.andes-tabs__more-panel')?.getAttribute('role'),
      ).toBe('dialog');

      buttons[0].click();
      await settle();
      expect(fixture.componentInstance.value()).toBe('a');
    });

    it('opens on hover with moreTrigger="hover", without taking focus', async () => {
      const { moreButton, menu, settle } = await overflowing((h) =>
        h.moreTrigger.set('hover'),
      );
      const more = moreButton();
      more.dispatchEvent(new MouseEvent('mouseenter'));
      await settle();

      expect(menu()).toBeTruthy();
      expect(menu()?.contains(document.activeElement)).toBe(false);

      more.dispatchEvent(new MouseEvent('mouseleave'));
      await new Promise((resolve) => setTimeout(resolve, 200));
      await settle();
      expect(menu()).toBeNull();
    });
  });

  describe('items', () => {
    async function createItemsHost() {
      const fixture = TestBed.createComponent(ItemsHost);
      fixture.detectChanges();
      await fixture.whenStable();
      const host = fixture.nativeElement as HTMLElement;
      return {
        fixture,
        host,
        tabs: () =>
          Array.from(
            host.querySelectorAll('[role="tab"]'),
          ) as HTMLButtonElement[],
        panels: () =>
          Array.from(
            host.querySelectorAll('[role="tabpanel"]'),
          ) as HTMLElement[],
        settle: async () => {
          fixture.detectChanges();
          await fixture.whenStable();
        },
      };
    }

    it('renders a fully wired tablist and panels from data', async () => {
      const { tabs, panels } = await createItemsHost();

      expect(tabs().map((t) => t.textContent?.trim())).toEqual([
        'One',
        'Two',
        'Three',
      ]);
      expect(tabs()[2].disabled).toBe(true);
      tabs().forEach((tab, i) => {
        expect(tab.getAttribute('aria-controls')).toBe(panels()[i].id);
        expect(panels()[i].getAttribute('aria-labelledby')).toBe(tab.id);
      });
      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
      expect(panels()[0].textContent?.trim()).toBe('Plain one');
      // Item content is lazy.
      expect(panels()[1].textContent?.trim()).toBe('');
    });

    it('selects with click and keyboard like projected tabs', async () => {
      const { fixture, tabs, panels, settle } = await createItemsHost();

      tabs()[1].click();
      await settle();
      expect(fixture.componentInstance.value()).toBe('two');
      expect(panels()[1].textContent?.trim()).toBe('Plain two');

      tabs()[1].focus();
      pressKey(tabs()[1], 'ArrowRight');
      await settle();
      // "three" is disabled, so focus wraps to "one".
      expect(document.activeElement).toBe(tabs()[0]);
      expect(fixture.componentInstance.value()).toBe('one');
    });

    it('accepts templates for label, icon and content', async () => {
      const { fixture, host, settle } = await createItemsHost();
      const component = fixture.componentInstance;

      component.items.set([
        {
          key: 'rich',
          label: component.labelTpl(),
          icon: component.iconTpl(),
          content: component.contentTpl(),
        },
      ]);
      await settle();

      expect(host.querySelector('[role="tab"] .rich-label')).toBeTruthy();
      expect(
        host.querySelector('[role="tab"] .andes-tabs__icon .item-icon'),
      ).toBeTruthy();
      expect(
        host.querySelector('[role="tabpanel"] .rich-content'),
      ).toBeTruthy();
    });
  });
});

describe('tabs motion', () => {
  // Asserted against the stylesheet source: jsdom runs no animations or transitions.
  const read = (file: string) =>
    readFileSync(`packages/ui/src/lib/tabs/${file}`, 'utf8');

  it('cross-fades a new panel in 150ms without sliding it', () => {
    const css = read('tabs-content.css');
    expect(css).toContain('animation: andes-tabs-pane-in 0.15s ease-out;');
    const keyframes =
      /@keyframes andes-tabs-pane-in\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(keyframes).not.toContain('transform');
  });

  it('moves the ink bar in 200ms, without the old 300ms trail', () => {
    const css = read('tabs.css');
    const rule =
      /\.andes-tabs__ink-bar--animated\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('0.2s');
    expect(rule).not.toContain('0.3s');
  });

  it('opens the more menu with the shared soft entry and none under reduced motion', () => {
    const css = read('tabs-more-menu.css');
    expect(css).toContain(
      'animation: andes-tabs-more-in 0.15s cubic-bezier(0.2, 0, 0, 1);',
    );
    expect(css).toContain('transform: scale(0.97);');
    expect(
      css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)')),
    ).toMatch(/animation:\s*none/);
  });

  it('plays the more menu entry back on close, short and accelerating', () => {
    for (const [file, selector] of [
      ['tabs-more-menu.css', ':host([data-andes-closing])'],
      ['tabs.css', '.andes-tabs__more-panel[data-andes-closing]'],
    ] as const) {
      const css = read(file);
      const rule = css.slice(css.indexOf(`${selector} {`));
      expect(rule).toMatch(
        /animation: andes-tabs-more(-panel)?-out var\(--andes-duration-fast, 120ms\)\s+var\(--andes-ease-in, ease-in\) forwards;/,
      );
      const reduced = css.slice(
        css.indexOf('@media (prefers-reduced-motion: reduce)'),
      );
      expect(reduced).toContain(selector);
    }
  });

  it('lets a container set both card tab surfaces', () => {
    const css = read('tabs-trigger.css');
    expect(css).toContain(
      'var(--andes-tabs-card-background, var(--andes-color-muted))',
    );
    expect(css).toMatch(
      /var\(\s*--andes-tabs-card-selected-background,\s*var\(--andes-color-background\)\s*\)/,
    );
  });
});
