import {
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesTreeNavigation } from './tree-navigation';
import { AndesTreeNavigationItem } from './tree-navigation-item';
import { AndesTreeNavigationKeys } from './tree-navigation-keys';
import {
  AndesTreeNavigationConfig,
  AndesTreeNavigationExpandChange,
  AndesTreeNavigationKey,
  AndesTreeNavigationNode,
  AndesTreeNavigationRevealRequest,
} from './tree-navigation-types';

function pressKey(
  target: Element,
  key: string,
  modifiers: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  target.dispatchEvent(event);
  return event;
}

interface Row {
  readonly key: string;
  readonly parent: string | null;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * ```
 * src
 *   app
 *     main
 *     util
 *   lib
 * docs
 *   readme
 *   guide
 * license
 * ```
 */
const ROWS: readonly Row[] = [
  { key: 'src', parent: null, label: 'src' },
  { key: 'app', parent: 'src', label: 'app' },
  { key: 'main', parent: 'app', label: 'main.ts' },
  { key: 'util', parent: 'app', label: 'util.ts' },
  { key: 'lib', parent: 'src', label: 'lib' },
  { key: 'docs', parent: null, label: 'docs' },
  { key: 'readme', parent: 'docs', label: 'readme.md' },
  { key: 'guide', parent: 'docs', label: 'guide.md' },
  { key: 'license', parent: null, label: 'license' },
];

/** Every node rendered flat; the ones under a collapsed parent are `hidden`. */
@Component({
  imports: [AndesTreeNavigationItem, AndesTreeNavigationKeys],
  providers: [AndesTreeNavigation],
  template: `
    <ul role="tree" andesTreeNavigationKeys aria-label="Files">
      @for (row of rows(); track row.key) {
        <li
          role="treeitem"
          aria-selected="false"
          [andesTreeNavigationItem]="row.key"
          [parentKey]="row.parent"
          [disabled]="row.disabled ?? false"
          [hidden]="navigation.visibleIndexOf(row.key) < 0"
        >
          {{ row.label }}
        </li>
      }
    </ul>
  `,
})
class FlatTreeHost {
  readonly navigation = inject(AndesTreeNavigation);
  readonly rows = signal<readonly Row[]>(ROWS);
}

/** Children exist in the DOM only while their parent is open, the way a lazy tree renders. */
@Component({
  imports: [AndesTreeNavigationItem, AndesTreeNavigationKeys],
  providers: [AndesTreeNavigation],
  template: `
    <ul role="tree" andesTreeNavigationKeys>
      @for (row of shown(); track row.key) {
        <li
          role="treeitem"
          aria-selected="false"
          [andesTreeNavigationItem]="row.key"
          [parentKey]="row.parent"
          [expandable]="hasChildren(row.key)"
        >
          {{ row.label }}
        </li>
      }
    </ul>
  `,
})
class LazyTreeHost {
  readonly navigation = inject(AndesTreeNavigation);
  /** Keys whose children have "arrived from the server". */
  readonly loaded = signal<ReadonlySet<string>>(new Set());
  readonly requests: string[] = [];

  readonly shown = computed(() => {
    const expanded = this.navigation.expandedKeys();
    const loaded = this.loaded();
    const shown = new Set<string>();
    return ROWS.filter((row) => {
      const visible =
        row.parent === null ||
        (shown.has(row.parent) &&
          loaded.has(row.parent) &&
          expanded.has(row.parent));
      if (visible) {
        shown.add(row.key);
      }
      return visible;
    });
  });

  constructor() {
    this.navigation.expandedChange.subscribe(({ key, expanded }) => {
      if (expanded) {
        this.requests.push(String(key));
      }
    });
  }

  hasChildren(key: string): boolean {
    return ROWS.some((row) => row.parent === key);
  }

  load(key: string): void {
    this.loaded.update((loaded) => new Set(loaded).add(key));
  }
}

/** A recursive template: the parent of an item is the enclosing item, found through DI. */
@Component({
  imports: [AndesTreeNavigationItem, AndesTreeNavigationKeys],
  providers: [AndesTreeNavigation],
  template: `
    <ul role="tree" andesTreeNavigationKeys>
      <li role="treeitem" aria-selected="false" [andesTreeNavigationItem]="'a'">
        a
        <ul role="group">
          <li
            role="treeitem"
            aria-selected="false"
            [andesTreeNavigationItem]="'a1'"
          >
            a1
          </li>
          <li
            role="treeitem"
            aria-selected="false"
            [andesTreeNavigationItem]="'a2'"
          >
            a2
            <ul role="group">
              <li
                role="treeitem"
                aria-selected="false"
                [andesTreeNavigationItem]="'a2x'"
              >
                a2x
              </li>
            </ul>
          </li>
        </ul>
      </li>
      <li role="treeitem" aria-selected="false" [andesTreeNavigationItem]="'b'">
        b
      </li>
    </ul>
  `,
})
class NestedTreeHost {
  readonly navigation = inject(AndesTreeNavigation);
}

/** The combobox shape: a text input keeps focus while the tree is addressed through ARIA. */
@Component({
  imports: [AndesTreeNavigationItem, AndesTreeNavigationKeys],
  providers: [AndesTreeNavigation],
  template: `
    <input
      andesTreeNavigationKeys
      role="combobox"
      aria-expanded="true"
      aria-controls="tree"
    />
    <ul id="tree" role="tree">
      @for (row of rows; track row.key) {
        <li
          role="treeitem"
          aria-selected="false"
          [andesTreeNavigationItem]="row.key"
          [parentKey]="row.parent"
          [hidden]="navigation.visibleIndexOf(row.key) < 0"
        >
          {{ row.label }}
        </li>
      }
    </ul>
  `,
})
class ActiveDescendantHost {
  readonly navigation = inject(AndesTreeNavigation);
  readonly rows = ROWS;

  constructor() {
    this.navigation.configure({ focusMode: 'active-descendant' });
  }
}

/** A windowed tree: only five rows exist at a time, the order comes from the node source. */
@Component({
  imports: [AndesTreeNavigationItem, AndesTreeNavigationKeys],
  providers: [AndesTreeNavigation],
  template: `
    <div
      role="tree"
      andesTreeNavigationKeys
      [attr.tabindex]="navigation.containerTabIndex()"
    >
      @for (row of windowRows(); track row.key) {
        <div
          role="treeitem"
          aria-selected="false"
          [andesTreeNavigationItem]="row.key"
        >
          {{ row.label }}
        </div>
      }
    </div>
  `,
})
class WindowedTreeHost {
  readonly navigation = inject(AndesTreeNavigation);
  readonly nodes = signal<readonly AndesTreeNavigationNode[]>(
    Array.from({ length: 40 }, (_, index) => [
      { key: `g${index}`, label: `group ${index}` },
      { key: `g${index}a`, parentKey: `g${index}`, label: `item ${index}a` },
      { key: `g${index}b`, parentKey: `g${index}`, label: `item ${index}b` },
    ]).flat(),
  );
  readonly start = signal(0);
  readonly size = 5;
  readonly reveals: AndesTreeNavigationRevealRequest[] = [];

  readonly windowRows = computed(() => {
    const labels = new Map(this.nodes().map((node) => [node.key, node.label]));
    return this.navigation
      .visibleNodes()
      .slice(this.start(), this.start() + this.size)
      .map((node) => ({ key: node.key, label: labels.get(node.key) ?? '' }));
  });

  constructor() {
    this.navigation.setNodes(() => this.nodes());
    this.navigation.revealRequested.subscribe((request) => {
      this.reveals.push(request);
      this.start.set(Math.max(0, request.index - 2));
    });
  }
}

describe('AndesTreeNavigation', () => {
  function setup<T extends { navigation: AndesTreeNavigation }>(
    component: new () => T,
    config?: AndesTreeNavigationConfig,
  ) {
    const fixture: ComponentFixture<T> = TestBed.createComponent(component);
    if (config) {
      fixture.componentInstance.navigation.configure(config);
    }
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const navigation = fixture.componentInstance.navigation;
    const changes: AndesTreeNavigationExpandChange[] = [];
    navigation.expandedChange.subscribe((change) => changes.push(change));

    const helpers = {
      fixture,
      host,
      navigation,
      changes,
      item: (key: string) =>
        host.querySelector<HTMLElement>(`[id="${helpers.idOf(key)}"]`),
      idOf: (key: string) => navigation.itemForKey(key)?.itemId ?? '',
      /** The element that owns keyboard events: the tree, or the input. */
      keyHost: () =>
        host.querySelector<HTMLElement>(
          '[role="tree"], [role="combobox"]',
        ) as HTMLElement,
      /** Focuses an item the way a click would. */
      focus: (key: string) => {
        helpers.item(key)?.focus();
        fixture.detectChanges();
      },
      /** Sends a key to whatever currently has focus, else to the key host. */
      press: (key: string, modifiers?: Partial<KeyboardEventInit>) => {
        const active = document.activeElement;
        const target =
          active && host.contains(active) && active !== host
            ? active
            : helpers.keyHost();
        const event = pressKey(target, key, modifiers);
        fixture.detectChanges();
        return event;
      },
      pressSeq: (...keys: string[]) =>
        keys.forEach((key) => helpers.press(key)),
      active: () => navigation.activeKey(),
      focused: () => {
        const element = document.activeElement as HTMLElement | null;
        return (
          navigation
            .items()
            .find((item) => item.element === element)
            ?.itemKey() ?? null
        );
      },
      visible: () => navigation.visibleNodes().map((node) => node.key),
    };
    return helpers;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('structure and ARIA facts', () => {
    it('derives level, position and set size from the parent links', () => {
      const { item } = setup(FlatTreeHost);

      const facts = (key: string) => {
        const el = item(key) as HTMLElement;
        return [
          el.getAttribute('aria-level'),
          el.getAttribute('aria-posinset'),
          el.getAttribute('aria-setsize'),
        ].join('/');
      };

      expect(facts('src')).toBe('1/1/3');
      expect(facts('docs')).toBe('1/2/3');
      expect(facts('license')).toBe('1/3/3');
      expect(facts('app')).toBe('2/1/2');
      expect(facts('lib')).toBe('2/2/2');
      expect(facts('util')).toBe('3/2/2');
    });

    it('counts collapsed siblings in the set size', () => {
      const { navigation } = setup(FlatTreeHost);

      expect(navigation.visibleNodes().map((node) => node.key)).toEqual([
        'src',
        'docs',
        'license',
      ]);
      expect(navigation.nodeInfo('lib')?.setSize).toBe(2);
      expect(navigation.nodeInfo('lib')?.posInSet).toBe(2);
    });

    it('reports aria-expanded on parents only and keeps it in sync', () => {
      const { item, navigation, fixture } = setup(FlatTreeHost);

      expect(item('src')?.getAttribute('aria-expanded')).toBe('false');
      expect(item('license')?.hasAttribute('aria-expanded')).toBe(false);

      navigation.expand('src');
      fixture.detectChanges();

      expect(item('src')?.getAttribute('aria-expanded')).toBe('true');
      expect(item('src')?.hasAttribute('data-expanded')).toBe(true);
      expect(item('license')?.hasAttribute('aria-expanded')).toBe(false);
    });

    it('exposes the facts as signals on the item', () => {
      const { navigation } = setup(FlatTreeHost);
      navigation.expand('src');
      const app = navigation.itemForKey('app') as AndesTreeNavigationItem;

      expect(app.ariaLevel()).toBe(2);
      expect(app.ariaPosinset()).toBe(1);
      expect(app.ariaSetsize()).toBe(2);
      expect(app.ariaExpanded()).toBe(false);
      expect(app.isExpandableNode()).toBe(true);
      expect(app.expanded()).toBe(false);
    });

    it('marks disabled nodes with aria-disabled and a styling hook', () => {
      const { fixture, item } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'docs' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();

      expect(item('docs')?.getAttribute('aria-disabled')).toBe('true');
      expect(item('docs')?.hasAttribute('data-disabled')).toBe(true);
      expect(item('src')?.hasAttribute('aria-disabled')).toBe(false);
    });

    it('leaves the ARIA attributes to the component when manageAria is off', () => {
      @Component({
        imports: [AndesTreeNavigationItem],
        providers: [AndesTreeNavigation],
        template: `<div
          [andesTreeNavigationItem]="'x'"
          [manageAria]="false"
        ></div>`,
      })
      class Unmanaged {}

      const fixture = TestBed.createComponent(Unmanaged);
      fixture.detectChanges();
      const el = fixture.nativeElement.firstElementChild as HTMLElement;

      expect(el.hasAttribute('aria-level')).toBe(false);
      expect(el.hasAttribute('aria-setsize')).toBe(false);
      expect(el.hasAttribute('id')).toBe(true);
    });

    it('lets the item override level, position and set size', () => {
      @Component({
        imports: [AndesTreeNavigationItem],
        providers: [AndesTreeNavigation],
        template: `
          <div
            [andesTreeNavigationItem]="'x'"
            [level]="4"
            [posInSet]="'7'"
            [setSize]="120"
          ></div>
        `,
      })
      class Overridden {}

      const fixture = TestBed.createComponent(Overridden);
      fixture.detectChanges();
      const el = fixture.nativeElement.firstElementChild as HTMLElement;

      expect(el.getAttribute('aria-level')).toBe('4');
      expect(el.getAttribute('aria-posinset')).toBe('7');
      expect(el.getAttribute('aria-setsize')).toBe('120');
    });

    it('reads the parent from the enclosing item in nested markup', () => {
      const { navigation } = setup(NestedTreeHost);

      expect(navigation.nodeInfo('a2x')?.parentKey).toBe('a2');
      expect(navigation.nodeInfo('a2x')?.level).toBe(3);
      expect(navigation.nodeInfo('a')?.expandable).toBe(true);
      expect(navigation.nodeInfo('b')?.expandable).toBe(false);
    });

    it('treats a node with an unknown parent as a root', () => {
      const { navigation, fixture } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set([
        { key: 'orphan', parent: 'ghost', label: 'orphan' },
      ]);
      fixture.detectChanges();

      expect(navigation.nodeInfo('orphan')?.level).toBe(1);
      expect(navigation.nodeInfo('orphan')?.parentKey).toBeNull();
    });

    it('keeps the first node when a key repeats', () => {
      const { navigation, fixture } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set([
        { key: 'dup', parent: null, label: 'first' },
        { key: 'dup', parent: null, label: 'second' },
        { key: 'other', parent: null, label: 'other' },
      ]);
      fixture.detectChanges();

      expect(navigation.visibleNodes().map((node) => node.key)).toEqual([
        'dup',
        'other',
      ]);
    });

    it('follows DOM order, including after the elements are reordered', () => {
      const { navigation, fixture, host } = setup(FlatTreeHost);
      const list = host.querySelector('ul') as HTMLElement;
      const license = list.lastElementChild as HTMLElement;
      list.insertBefore(license, list.firstElementChild);

      navigation.refreshOrder();
      fixture.detectChanges();

      expect(navigation.visibleNodes().map((node) => node.key)).toEqual([
        'license',
        'src',
        'docs',
      ]);
    });

    it('answers queries about unknown keys without throwing', () => {
      const { navigation } = setup(FlatTreeHost);

      expect(navigation.nodeInfo('nope')).toBeNull();
      expect(navigation.visibleIndexOf('nope')).toBe(-1);
      expect(navigation.itemForKey('nope')).toBeNull();
      expect(navigation.focusKey('nope')).toBe(false);
      expect(navigation.setActiveKeySilently('nope')).toBe(false);
      expect(navigation.expand('nope')).toBe(false);
      expect(navigation.collapse('nope')).toBe(false);
    });
  });

  describe('roving tabindex', () => {
    it('puts the only tab stop on the first node initially', () => {
      const { item } = setup(FlatTreeHost);

      expect(item('src')?.getAttribute('tabindex')).toBe('0');
      expect(item('docs')?.getAttribute('tabindex')).toBe('-1');
      expect(item('license')?.getAttribute('tabindex')).toBe('-1');
    });

    it('moves the tab stop with the active node', () => {
      const { item, press, focus } = setup(FlatTreeHost);
      focus('src');
      press('ArrowDown');

      expect(item('docs')?.getAttribute('tabindex')).toBe('0');
      expect(item('src')?.getAttribute('tabindex')).toBe('-1');
    });

    it('follows focus that arrived by other means, such as a click', () => {
      const { navigation, focus } = setup(FlatTreeHost);
      focus('license');

      expect(navigation.activeKey()).toBe('license');
    });

    it('skips a disabled first node when choosing the tab stop', () => {
      const { fixture, item } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'src' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();

      expect(item('src')?.getAttribute('tabindex')).toBe('-1');
      expect(item('docs')?.getAttribute('tabindex')).toBe('0');
    });

    it('falls back to the first node while the active one is hidden', () => {
      const { navigation } = setup(FlatTreeHost);
      navigation.setActiveKeySilently('main');

      expect(navigation.tabbableKey()).toBe('src');
    });

    it('keeps the tab stop on the active node once it is visible', () => {
      const { navigation } = setup(FlatTreeHost);
      navigation.expandTo('main');
      navigation.setActiveKeySilently('main');

      expect(navigation.tabbableKey()).toBe('main');
    });

    it('has no tab stop when there are no nodes', () => {
      const { navigation, fixture } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set([]);
      fixture.detectChanges();

      expect(navigation.tabbableKey()).toBeNull();
      expect(navigation.containerTabIndex()).toBeNull();
    });
  });

  describe('Up and Down', () => {
    it('walk the visible nodes only', () => {
      const { press, focus, focused } = setup(FlatTreeHost);
      focus('src');
      press('ArrowDown');
      expect(focused()).toBe('docs');
      press('ArrowDown');
      expect(focused()).toBe('license');
      press('ArrowUp');
      expect(focused()).toBe('docs');
    });

    it('cross level boundaries in an expanded tree', () => {
      const { navigation, press, focus, focused } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('src');

      const order: (AndesTreeNavigationKey | null)[] = [];
      for (let i = 0; i < 8; i++) {
        press('ArrowDown');
        order.push(focused());
      }

      expect(order).toEqual([
        'app',
        'main',
        'util',
        'lib',
        'docs',
        'readme',
        'guide',
        'license',
      ]);
    });

    it('stop at the ends by default', () => {
      const { press, focus, focused } = setup(FlatTreeHost);
      focus('src');
      press('ArrowUp');
      expect(focused()).toBe('src');

      focus('license');
      press('ArrowDown');
      expect(focused()).toBe('license');
    });

    it('wrap around when asked to', () => {
      const { press, focus, focused } = setup(FlatTreeHost, { wrap: true });
      focus('src');
      press('ArrowUp');
      expect(focused()).toBe('license');
      press('ArrowDown');
      expect(focused()).toBe('src');
    });

    it('skip disabled nodes', () => {
      const { fixture, press, focus, focused } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'docs' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();
      focus('src');

      press('ArrowDown');
      expect(focused()).toBe('license');
      press('ArrowUp');
      expect(focused()).toBe('src');
    });

    it('stop on disabled nodes when skipDisabled is off', () => {
      const { fixture, press, focus, focused } = setup(FlatTreeHost, {
        skipDisabled: false,
      });
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'docs' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();
      focus('src');

      press('ArrowDown');
      expect(focused()).toBe('docs');
    });

    it('start from the first node when nothing is active', () => {
      const { navigation, keyHost, fixture } = setup(ActiveDescendantHost);

      pressKey(keyHost(), 'ArrowDown');
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('src');
    });

    it('start from the last node on Up when nothing is active', () => {
      const { navigation, keyHost, fixture } = setup(ActiveDescendantHost);

      pressKey(keyHost(), 'ArrowUp');
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('license');
    });

    it('prevent the default scroll', () => {
      const { press, focus } = setup(FlatTreeHost);
      focus('src');

      expect(press('ArrowDown').defaultPrevented).toBe(true);
      expect(press('ArrowUp').defaultPrevented).toBe(true);
    });
  });

  describe('Right', () => {
    it('opens a collapsed parent and stays on it', () => {
      const { press, focus, focused, navigation, changes } =
        setup(FlatTreeHost);
      focus('src');
      press('ArrowRight');

      expect(navigation.isExpanded('src')).toBe(true);
      expect(focused()).toBe('src');
      expect(changes).toEqual([{ key: 'src', expanded: true }]);
    });

    it('steps into the first child of an open parent', () => {
      const { press, focus, focused } = setup(FlatTreeHost);
      focus('src');
      press('ArrowRight');
      press('ArrowRight');

      expect(focused()).toBe('app');
    });

    it('skips a disabled first child', () => {
      const { fixture, press, focus, focused } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'app' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();
      focus('src');
      press('ArrowRight');
      press('ArrowRight');

      expect(focused()).toBe('lib');
    });

    it('does nothing on a leaf but still keeps the page from scrolling', () => {
      const { press, focus, focused, changes } = setup(FlatTreeHost);
      focus('license');
      const event = press('ArrowRight');

      expect(focused()).toBe('license');
      expect(changes).toEqual([]);
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not open a disabled parent that holds focus', () => {
      const { fixture, press, focus, navigation } = setup(FlatTreeHost, {
        skipDisabled: false,
      });
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'src' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();
      focus('src');
      press('ArrowRight');

      expect(navigation.isExpanded('src')).toBe(false);
    });

    it('opens a disabled parent when expandDisabled is on', () => {
      const { fixture, press, focus, navigation } = setup(FlatTreeHost, {
        skipDisabled: false,
        expandDisabled: true,
      });
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'src' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();
      focus('src');
      press('ArrowRight');

      expect(navigation.isExpanded('src')).toBe(true);
    });
  });

  describe('Left', () => {
    it('closes an open parent and stays on it', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expand('src');
      focus('src');
      press('ArrowLeft');

      expect(navigation.isExpanded('src')).toBe(false);
      expect(focused()).toBe('src');
    });

    it('steps from a child to its parent', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('main');
      press('ArrowLeft');
      expect(focused()).toBe('app');
      expect(navigation.isExpanded('app')).toBe(true);
      press('ArrowLeft');
      expect(navigation.isExpanded('app')).toBe(false);
      press('ArrowLeft');
      expect(focused()).toBe('src');
    });

    it('steps from a leaf to its parent', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('lib');
      press('ArrowLeft');

      expect(focused()).toBe('src');
    });

    it('does nothing on a collapsed root', () => {
      const { press, focus, focused, changes } = setup(FlatTreeHost);
      focus('docs');
      const event = press('ArrowLeft');

      expect(focused()).toBe('docs');
      expect(changes).toEqual([]);
      expect(event.defaultPrevented).toBe(true);
    });

    it('skips a disabled parent and goes to the nearest enabled ancestor', () => {
      const { fixture, press, focus, focused, navigation } =
        setup(FlatTreeHost);
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'app' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();
      navigation.expandTo('main');
      focus('main');
      press('ArrowLeft');

      expect(focused()).toBe('src');
    });

    it('also collapses the parent when collapseOnLeave is on', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost, {
        collapseOnLeave: true,
      });
      navigation.expand('src');
      focus('app');
      press('ArrowLeft');

      expect(focused()).toBe('src');
      expect(navigation.isExpanded('src')).toBe(false);
    });
  });

  describe('Home, End and *', () => {
    it('jump to the first and last visible node', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expand('src');
      focus('docs');
      press('Home');
      expect(focused()).toBe('src');
      press('End');
      expect(focused()).toBe('license');
    });

    it('reach into expanded subtrees for End', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('src');
      press('End');

      expect(focused()).toBe('license');
      navigation.collapseAll();
    });

    it('skip disabled nodes at the edges', () => {
      const { fixture, press, focus, focused } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'license' || row.key === 'src'
            ? { ...row, disabled: true }
            : row,
        ),
      );
      fixture.detectChanges();
      focus('docs');
      press('End');
      expect(focused()).toBe('docs');
      press('Home');
      expect(focused()).toBe('docs');
    });

    it('can be switched off', () => {
      const { press, focus, focused } = setup(FlatTreeHost, {
        homeAndEnd: false,
      });
      focus('docs');
      const event = press('End');

      expect(focused()).toBe('docs');
      expect(event.defaultPrevented).toBe(false);
    });

    it('expands every expandable sibling on *', () => {
      const { press, focus, navigation, changes } = setup(FlatTreeHost);
      focus('src');
      press('*');

      expect(navigation.isExpanded('src')).toBe(true);
      expect(navigation.isExpanded('docs')).toBe(true);
      expect(changes.map((change) => change.key).sort()).toEqual([
        'docs',
        'src',
      ]);
    });

    it('only expands siblings of the active node, not its cousins', () => {
      const { press, focus, navigation } = setup(FlatTreeHost);
      navigation.expand('src');
      focus('app');
      press('*');

      expect(navigation.isExpanded('app')).toBe(true);
      expect(navigation.isExpanded('docs')).toBe(false);
    });

    it('can be switched off, which turns * into a typeahead character', () => {
      const { press, focus, navigation } = setup(FlatTreeHost, {
        expandSiblings: false,
      });
      focus('src');
      press('*');

      expect(navigation.isExpanded('src')).toBe(false);
    });
  });

  describe('typeahead', () => {
    it('finds nodes across levels', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('src');
      press('g');

      expect(focused()).toBe('guide');
    });

    it('cycles through nodes sharing a first letter', () => {
      vi.useFakeTimers();
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('src');

      press('l');
      expect(focused()).toBe('lib');
      press('l');
      expect(focused()).toBe('license');
      press('l');
      expect(focused()).toBe('lib');
    });

    it('refines the match with a longer query', () => {
      vi.useFakeTimers();
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('src');

      press('r');
      press('e');
      press('a');
      expect(focused()).toBe('readme');
    });

    it('starts over once the debounce has elapsed', () => {
      vi.useFakeTimers();
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('src');

      press('d');
      expect(focused()).toBe('docs');
      expect(navigation.isTyping()).toBe(true);
      vi.advanceTimersByTime(600);
      expect(navigation.isTyping()).toBe(false);
      press('g');
      expect(focused()).toBe('guide');
    });

    it('honours a custom debounce', () => {
      vi.useFakeTimers();
      const { press, focus, navigation } = setup(FlatTreeHost, {
        typeaheadDebounce: 50,
      });
      focus('src');
      press('d');
      vi.advanceTimersByTime(60);

      expect(navigation.isTyping()).toBe(false);
    });

    it('treats a repeated letter as cycling when no label starts with the pair', () => {
      vi.useFakeTimers();
      const { press, focus, focused, navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('src');

      press('l');
      press('l');

      expect(focused()).toBe('license');
    });

    it('prefers a label that starts with the repeated letters', () => {
      vi.useFakeTimers();
      const { navigation, fixture, press, focus, focused } =
        setup(FlatTreeHost);
      fixture.componentInstance.rows.set([
        { key: 'a1', parent: null, label: 'alpha' },
        { key: 'a2', parent: null, label: 'aardvark' },
        { key: 'a3', parent: null, label: 'also' },
      ]);
      fixture.detectChanges();
      focus('a1');

      press('a');
      expect(focused()).toBe('a2');
      press('a');
      expect(focused()).toBe('a2');
      expect(navigation.activeKey()).toBe('a2');
    });

    it('skips disabled nodes', () => {
      const { fixture, press, focus, focused } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'docs' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();
      focus('src');
      press('d');

      expect(focused()).toBe('src');
    });

    it('ignores nodes that are collapsed away', () => {
      const { press, focus, focused } = setup(FlatTreeHost);
      focus('src');
      press('g');

      expect(focused()).toBe('src');
    });

    it('lets a space extend a query but never start one', () => {
      vi.useFakeTimers();
      const { fixture, press, focus, focused } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set([
        { key: 'one', parent: null, label: 'new file' },
        { key: 'two', parent: null, label: 'new folder' },
      ]);
      fixture.detectChanges();
      focus('one');

      const lone = press(' ');
      expect(lone.defaultPrevented).toBe(false);

      press('n');
      press('e');
      press('w');
      const inQuery = press(' ');
      press('f');
      press('o');
      expect(inQuery.defaultPrevented).toBe(true);
      expect(focused()).toBe('two');
    });

    it('can be switched off', () => {
      const { press, focus, focused } = setup(FlatTreeHost, {
        typeahead: false,
      });
      focus('src');
      const event = press('d');

      expect(focused()).toBe('src');
      expect(event.defaultPrevented).toBe(false);
    });

    it('uses an explicit typeaheadLabel over the text content', () => {
      @Component({
        imports: [AndesTreeNavigationItem, AndesTreeNavigationKeys],
        providers: [AndesTreeNavigation],
        template: `
          <div role="tree" andesTreeNavigationKeys>
            <div [andesTreeNavigationItem]="'a'" typeaheadLabel="zebra">★</div>
            <div [andesTreeNavigationItem]="'b'" typeaheadLabel="  yak">★</div>
          </div>
        `,
      })
      class Labelled {
        readonly navigation = inject(AndesTreeNavigation);
      }
      const { press, navigation } = setup(Labelled);
      press('y');

      expect(navigation.activeKey()).toBe('b');
    });
  });

  describe('keys that are not the navigation’s', () => {
    it('ignores Enter, Space and Escape', () => {
      const { press, focus } = setup(FlatTreeHost);
      focus('src');

      for (const key of ['Enter', ' ', 'Escape']) {
        expect(press(key).defaultPrevented).toBe(false);
      }
    });

    it('ignores keys with Ctrl, Meta or Alt held', () => {
      const { press, focus, focused } = setup(FlatTreeHost);
      focus('src');
      for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
        const event = press('ArrowDown', { [modifier]: true });
        expect(event.defaultPrevented).toBe(false);
      }

      expect(focused()).toBe('src');
    });

    it('still navigates with Shift held, so range selection can build on it', () => {
      const { press, focus, focused } = setup(FlatTreeHost);
      focus('src');
      press('ArrowDown', { shiftKey: true });

      expect(focused()).toBe('docs');
    });

    it('leaves an event that a consumer handler already claimed', () => {
      const { press, focus, focused, keyHost } = setup(FlatTreeHost);
      keyHost().addEventListener('keydown', (event) => event.preventDefault(), {
        capture: true,
      });
      focus('src');
      press('ArrowDown');

      expect(focused()).toBe('src');
    });

    it('leaves keys typed into a control nested in a node alone', () => {
      @Component({
        imports: [AndesTreeNavigationItem, AndesTreeNavigationKeys],
        providers: [AndesTreeNavigation],
        template: `
          <div role="tree" andesTreeNavigationKeys>
            <div [andesTreeNavigationItem]="'a'">a <input id="rename" /></div>
            <div [andesTreeNavigationItem]="'b'">b</div>
          </div>
        `,
      })
      class WithInput {
        readonly navigation = inject(AndesTreeNavigation);
      }
      const { host, navigation, fixture } = setup(WithInput);
      navigation.focusKey('a');

      const event = pressKey(
        host.querySelector('#rename') as Element,
        'ArrowDown',
      );
      fixture.detectChanges();

      expect(event.defaultPrevented).toBe(false);
      expect(navigation.activeKey()).toBe('a');
    });

    it('emits tabOut on Tab without consuming it', () => {
      const { press, focus, navigation } = setup(FlatTreeHost);
      const tabs = vi.fn();
      navigation.tabOut.subscribe(tabs);
      focus('src');
      const event = press('Tab');

      expect(tabs).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('right-to-left', () => {
    it('mirrors Left and Right', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost, {
        textDirection: 'rtl',
      });
      focus('src');

      press('ArrowLeft');
      expect(navigation.isExpanded('src')).toBe(true);
      press('ArrowLeft');
      expect(focused()).toBe('app');
      press('ArrowRight');
      expect(focused()).toBe('src');
      press('ArrowRight');
      expect(navigation.isExpanded('src')).toBe(false);
    });

    it('leaves Up and Down alone', () => {
      const { press, focus, focused } = setup(FlatTreeHost, {
        textDirection: 'rtl',
      });
      focus('src');
      press('ArrowDown');

      expect(focused()).toBe('docs');
    });
  });

  describe('orientation', () => {
    it('moves with Left/Right and opens/closes with Down/Up when horizontal', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost, {
        orientation: 'horizontal',
        scope: 'level',
      });
      focus('src');

      press('ArrowRight');
      expect(focused()).toBe('docs');
      press('ArrowLeft');
      expect(focused()).toBe('src');
      press('ArrowDown');
      expect(navigation.isExpanded('src')).toBe(true);
      press('ArrowUp');
      expect(navigation.isExpanded('src')).toBe(false);
    });

    it('mirrors the movement keys for RTL when horizontal', () => {
      const { press, focus, focused } = setup(FlatTreeHost, {
        orientation: 'horizontal',
        scope: 'level',
        textDirection: 'rtl',
      });
      focus('src');
      press('ArrowLeft');

      expect(focused()).toBe('docs');
    });

    it('leaves vertical arrows to the page on a horizontal leaf', () => {
      const { press, focus } = setup(FlatTreeHost, {
        orientation: 'horizontal',
        scope: 'level',
      });
      focus('license');

      expect(press('ArrowDown').defaultPrevented).toBe(false);
      expect(press('ArrowUp').defaultPrevented).toBe(false);
      expect(press('ArrowRight').defaultPrevented).toBe(true);
    });
  });

  describe('level scope', () => {
    it('keeps Up/Down inside the sibling group', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost, {
        scope: 'level',
      });
      navigation.expandAll();
      focus('app');

      press('ArrowDown');
      expect(focused()).toBe('lib');
      press('ArrowDown');
      expect(focused()).toBe('lib');
      press('ArrowUp');
      expect(focused()).toBe('app');
    });

    it('keeps Home/End and typeahead inside the group', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost, {
        scope: 'level',
      });
      navigation.expandAll();
      focus('app');

      press('End');
      expect(focused()).toBe('lib');
      press('Home');
      expect(focused()).toBe('app');
      press('g');
      expect(focused()).toBe('app');
    });

    it('wraps within the group', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost, {
        scope: 'level',
        wrap: true,
      });
      navigation.expandAll();
      focus('lib');
      press('ArrowDown');

      expect(focused()).toBe('app');
    });

    it('still changes level with the open and close keys', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost, {
        scope: 'level',
      });
      navigation.expand('src');
      focus('src');
      press('ArrowRight');
      expect(focused()).toBe('app');
      press('ArrowLeft');
      expect(focused()).toBe('src');
    });
  });

  describe('enterOnExpand', () => {
    it('opens a parent and steps into its first child in one key', () => {
      const { press, focus, focused, navigation } = setup(FlatTreeHost, {
        enterOnExpand: true,
      });
      focus('src');
      press('ArrowRight');

      expect(navigation.isExpanded('src')).toBe(true);
      expect(focused()).toBe('app');
    });

    it('waits for children that have not rendered yet', () => {
      const { fixture, press, focus, focused, navigation } = setup(
        LazyTreeHost,
        {
          enterOnExpand: true,
        },
      );
      focus('src');
      press('ArrowRight');
      expect(focused()).toBe('src');
      expect(navigation.isExpanded('src')).toBe(true);

      fixture.componentInstance.load('src');
      fixture.detectChanges();

      expect(focused()).toBe('app');
    });

    it('gives up waiting once the user moves elsewhere', () => {
      const { fixture, press, focus, focused, navigation } = setup(
        LazyTreeHost,
        {
          enterOnExpand: true,
        },
      );
      focus('src');
      press('ArrowRight');
      press('ArrowDown');
      expect(focused()).toBe('docs');

      fixture.componentInstance.load('src');
      fixture.detectChanges();

      expect(focused()).toBe('docs');
      expect(navigation.activeKey()).toBe('docs');
    });

    it('also waits when the parent is already open but still empty', () => {
      const { fixture, press, focus, focused } = setup(LazyTreeHost, {
        enterOnExpand: true,
      });
      focus('src');
      press('ArrowRight');
      press('ArrowRight');
      expect(focused()).toBe('src');

      fixture.componentInstance.load('src');
      fixture.detectChanges();

      expect(focused()).toBe('app');
    });
  });

  describe('expansion state', () => {
    it('starts collapsed and exposes the set of expanded keys', () => {
      const { navigation } = setup(FlatTreeHost);

      expect(navigation.expandedKeys().size).toBe(0);
      navigation.expand('src');
      expect([...navigation.expandedKeys()]).toEqual(['src']);
    });

    it('expands, collapses and toggles', () => {
      const { navigation } = setup(FlatTreeHost);

      expect(navigation.expand('src')).toBe(true);
      expect(navigation.expand('src')).toBe(false);
      expect(navigation.toggle('src')).toBe(true);
      expect(navigation.isExpanded('src')).toBe(false);
      expect(navigation.collapse('src')).toBe(false);
      expect(navigation.toggle('src')).toBe(true);
      expect(navigation.isExpanded('src')).toBe(true);
    });

    it('refuses to expand a leaf', () => {
      const { navigation } = setup(FlatTreeHost);

      expect(navigation.expand('license')).toBe(false);
      expect(navigation.isExpanded('license')).toBe(false);
    });

    it('expands and collapses everything', () => {
      const { navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      expect(navigation.visibleNodes()).toHaveLength(9);
      navigation.collapseAll();
      expect(navigation.visibleNodes()).toHaveLength(3);
    });

    it('expands the ancestors of a node to reveal it', () => {
      const { navigation } = setup(FlatTreeHost);
      navigation.expandTo('main');

      expect(navigation.isExpanded('src')).toBe(true);
      expect(navigation.isExpanded('app')).toBe(true);
      expect(navigation.visibleIndexOf('main')).toBeGreaterThan(-1);
      expect(navigation.isExpanded('docs')).toBe(false);
    });

    it('announces changes it makes, but not the consumer’s own', () => {
      const { navigation, changes } = setup(FlatTreeHost);
      navigation.expand('src');
      navigation.setExpanded(['docs']);
      navigation.configure({ expanded: ['src'] });

      expect(changes).toEqual([
        { key: 'src', expanded: true },
        // `expandedChange` is for navigation-driven changes only.
      ]);
      expect([...navigation.expandedKeys()]).toEqual(['src']);
    });

    it('announces every key a bulk change touches', () => {
      const { navigation, changes } = setup(FlatTreeHost);
      navigation.expand('src');
      changes.length = 0;
      navigation.collapseAll();

      expect(changes).toEqual([{ key: 'src', expanded: false }]);
    });

    it('keeps state in a signal the consumer owns', () => {
      const { navigation, fixture } = setup(FlatTreeHost);
      const owned = signal<ReadonlySet<AndesTreeNavigationKey>>(
        new Set(['docs']),
      );
      navigation.bindExpanded(owned);
      fixture.detectChanges();

      expect(navigation.isExpanded('docs')).toBe(true);
      navigation.expand('src');
      expect([...owned()].sort()).toEqual(['docs', 'src']);

      owned.set(new Set());
      expect(navigation.isExpanded('src')).toBe(false);
    });

    it('writes back the array shape when the owned signal holds an array', () => {
      const { navigation } = setup(FlatTreeHost);
      const owned = signal<readonly AndesTreeNavigationKey[]>(['docs']);
      navigation.bindExpanded(owned);

      navigation.expand('src');

      expect(owned()).toEqual(['docs', 'src']);
      navigation.collapse('docs');
      expect(owned()).toEqual(['src']);
    });

    it('accepts a signal typed with a narrower key type', () => {
      const { navigation } = setup(FlatTreeHost);
      const owned = signal<readonly string[]>([]);
      navigation.bindExpanded(owned);

      navigation.expand('docs');

      expect(owned()).toEqual(['docs']);
    });

    it('returns to its own store when unbound', () => {
      const { navigation } = setup(FlatTreeHost);
      const owned = signal<ReadonlySet<AndesTreeNavigationKey>>(
        new Set(['docs']),
      );
      navigation.bindExpanded(owned);
      navigation.bindExpanded(null);

      expect(navigation.isExpanded('docs')).toBe(false);
      navigation.expand('src');
      expect([...owned()]).toEqual(['docs']);
    });

    it('applies initial expanded keys from configure', () => {
      const { navigation } = setup(FlatTreeHost, { expanded: ['src', 'app'] });

      expect(navigation.visibleNodes().map((node) => node.key)).toEqual([
        'src',
        'app',
        'main',
        'util',
        'lib',
        'docs',
        'license',
      ]);
    });
  });

  describe('collapsing while a descendant is active', () => {
    it('moves focus to the collapsed ancestor', () => {
      const { navigation, focus, focused, item, fixture } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('main');

      navigation.collapse('src');
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('src');
      expect(focused()).toBe('src');
      expect(item('src')?.getAttribute('tabindex')).toBe('0');
    });

    it('lands on the nearest collapsed ancestor, not the root', () => {
      const { navigation, focus, focused } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('main');

      navigation.collapse('app');

      expect(focused()).toBe('app');
    });

    it('handles collapseAll from deep inside', () => {
      const { navigation, focus, focused } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('util');

      navigation.collapseAll();

      expect(focused()).toBe('src');
    });

    it('follows a collapse made through the owned expanded signal', () => {
      const { navigation, focus, focused, fixture } = setup(FlatTreeHost);
      const owned = signal<ReadonlySet<AndesTreeNavigationKey>>(
        new Set(['src', 'app']),
      );
      navigation.bindExpanded(owned);
      fixture.detectChanges();
      focus('main');
      expect(focused()).toBe('main');

      owned.set(new Set(['src']));
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('app');
      expect(focused()).toBe('app');
    });

    it('moves the active node but does not steal focus that left the tree', () => {
      const { navigation, focus, fixture, host } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('main');
      const outside = document.createElement('button');
      host.appendChild(outside);
      outside.focus();
      fixture.detectChanges();

      navigation.collapse('src');

      expect(navigation.activeKey()).toBe('src');
      expect(document.activeElement).toBe(outside);
    });

    it('collapses with the keyboard from a child via two Left presses', () => {
      const { press, navigation, focus, focused } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('util');
      press('ArrowLeft'); // up to app
      press('ArrowLeft'); // collapse app
      press('ArrowLeft'); // up to src
      press('ArrowLeft'); // collapse src

      expect(focused()).toBe('src');
      expect(navigation.isExpanded('src')).toBe(false);
      expect(navigation.visibleIndexOf('app')).toBe(-1);
    });

    it('does not do anything when the active node stays visible', () => {
      const { navigation, focus, focused } = setup(FlatTreeHost);
      navigation.expandAll();
      focus('license');

      navigation.collapse('src');

      expect(focused()).toBe('license');
    });

    it('works in active-descendant mode without touching DOM focus', () => {
      const { navigation, fixture, keyHost } = setup(ActiveDescendantHost);
      navigation.expandAll();
      keyHost().focus();
      navigation.focusKey('main');
      fixture.detectChanges();
      expect(keyHost().getAttribute('aria-activedescendant')).toBe(
        navigation.itemForKey('main')?.itemId,
      );

      navigation.collapse('src');
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('src');
      expect(keyHost().getAttribute('aria-activedescendant')).toBe(
        navigation.itemForKey('src')?.itemId,
      );
      expect(document.activeElement).toBe(keyHost());
    });
  });

  describe('lazy children', () => {
    it('opens a parent whose children are not rendered, then reaches them once they are', () => {
      const { fixture, navigation, press, focus, focused, changes } =
        setup(LazyTreeHost);
      expect(navigation.nodeInfo('src')?.expandable).toBe(true);
      focus('src');

      press('ArrowRight');
      expect(changes).toEqual([{ key: 'src', expanded: true }]);
      expect(fixture.componentInstance.requests).toEqual(['src']);
      // Nothing to step into yet.
      press('ArrowRight');
      expect(focused()).toBe('src');

      fixture.componentInstance.load('src');
      fixture.detectChanges();
      press('ArrowRight');

      expect(focused()).toBe('app');
      expect(navigation.nodeInfo('app')?.level).toBe(2);
      expect(navigation.nodeInfo('lib')?.setSize).toBe(2);
    });

    it('keeps a node expandable by declaration even with no children registered', () => {
      const { navigation } = setup(LazyTreeHost);

      expect(navigation.nodeInfo('docs')?.expandable).toBe(true);
      expect(navigation.nodeInfo('license')?.expandable).toBe(false);
      expect(navigation.visibleNodes().map((node) => node.key)).toEqual([
        'src',
        'docs',
        'license',
      ]);
    });

    it('drops the children from the order when their parent collapses', () => {
      const { fixture, navigation, focus, press, focused } =
        setup(LazyTreeHost);
      fixture.componentInstance.load('src');
      focus('src');
      press('ArrowRight');
      press('ArrowRight');
      expect(focused()).toBe('app');

      navigation.collapse('src');
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('src');
      expect(focused()).toBe('src');
      expect(navigation.items().map((item) => item.itemKey())).toEqual([
        'src',
        'docs',
        'license',
      ]);
    });

    it('moves a deleted active item to its collapsed ancestor even if the item is destroyed first', () => {
      const { fixture, navigation, focus } = setup(LazyTreeHost);
      fixture.componentInstance.load('src');
      navigation.expand('src');
      fixture.detectChanges();
      focus('app');

      // Collapsing through the store destroys the active item in the same pass.
      navigation.setExpanded([]);
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('src');
    });

    it('clears the active node when an item vanishes without explanation', () => {
      const { fixture, navigation } = setup(FlatTreeHost);
      navigation.setActiveKeySilently('license');
      fixture.componentInstance.rows.set(
        ROWS.filter((row) => row.key !== 'license'),
      );
      fixture.detectChanges();

      expect(navigation.activeKey()).toBeNull();
    });
  });

  describe('active-descendant mode', () => {
    it('publishes the active node and gives items no tabindex', () => {
      const { navigation, keyHost, item, fixture } =
        setup(ActiveDescendantHost);

      expect(keyHost().hasAttribute('aria-activedescendant')).toBe(false);
      expect(item('src')?.hasAttribute('tabindex')).toBe(false);

      pressKey(keyHost(), 'ArrowDown');
      fixture.detectChanges();

      expect(keyHost().getAttribute('aria-activedescendant')).toBe(
        item('src')?.id,
      );
      expect(navigation.activeDescendantId()).toBe(item('src')?.id);
      expect(item('src')?.hasAttribute('data-active')).toBe(true);
    });

    it('keeps real focus on the input while navigating', () => {
      const { navigation, keyHost, fixture } = setup(ActiveDescendantHost);
      keyHost().focus();
      navigation.expand('src');
      pressKey(keyHost(), 'ArrowDown');
      pressKey(keyHost(), 'ArrowDown');
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('app');
      expect(document.activeElement).toBe(keyHost());
    });

    it('scrolls the active item into view', () => {
      const { navigation, item, fixture } = setup(ActiveDescendantHost);
      const target = item('docs') as HTMLElement;
      const scrollIntoView = vi.fn();
      target.scrollIntoView = scrollIntoView;

      navigation.focusKey('docs');
      fixture.detectChanges();

      expect(scrollIntoView).toHaveBeenCalledWith({
        block: 'nearest',
        inline: 'nearest',
      });
    });

    it('opens and closes parents from the input', () => {
      const { navigation, keyHost, fixture } = setup(ActiveDescendantHost);
      pressKey(keyHost(), 'ArrowDown');
      pressKey(keyHost(), 'ArrowRight');
      fixture.detectChanges();
      expect(navigation.isExpanded('src')).toBe(true);

      pressKey(keyHost(), 'ArrowRight');
      expect(navigation.activeKey()).toBe('app');
      pressKey(keyHost(), 'ArrowLeft');
      expect(navigation.activeKey()).toBe('src');
    });

    it('returns to roving tabindex when the mode changes back', () => {
      const { navigation, item, fixture } = setup(ActiveDescendantHost);
      navigation.configure({ focusMode: 'roving-tabindex' });
      fixture.detectChanges();

      expect(item('src')?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('active node management', () => {
    it('sets the active node silently, without moving focus', () => {
      const { navigation, fixture, focused } = setup(FlatTreeHost);

      expect(navigation.setActiveKeySilently('docs')).toBe(true);
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('docs');
      expect(navigation.activeIndex()).toBe(1);
      expect(focused()).toBeNull();
    });

    it('accepts a node that is currently collapsed away', () => {
      const { navigation } = setup(FlatTreeHost);
      navigation.setActiveKeySilently('main');

      expect(navigation.activeKey()).toBe('main');
      expect(navigation.activeIndex()).toBe(-1);
    });

    it('clears the active node', () => {
      const { navigation } = setup(FlatTreeHost);
      navigation.setActiveKeySilently('docs');
      navigation.clearActive();
      expect(navigation.activeKey()).toBeNull();
      expect(navigation.activeItem()).toBeNull();

      navigation.setActiveKeySilently('docs');
      navigation.setActiveKeySilently(null);
      expect(navigation.activeKey()).toBeNull();
    });

    it('moves programmatically with the focus helpers', () => {
      const { navigation, focused, fixture } = setup(FlatTreeHost);
      navigation.expandAll();
      fixture.detectChanges();

      navigation.focusFirst();
      expect(focused()).toBe('src');
      navigation.focusNext();
      expect(focused()).toBe('app');
      navigation.focusLast();
      expect(focused()).toBe('license');
      navigation.focusPrevious();
      expect(focused()).toBe('guide');
    });

    it('refuses to focus a hidden or disabled node', () => {
      const { navigation, fixture } = setup(FlatTreeHost);
      fixture.componentInstance.rows.set(
        ROWS.map((row) =>
          row.key === 'docs' ? { ...row, disabled: true } : row,
        ),
      );
      fixture.detectChanges();

      expect(navigation.focusKey('main')).toBe(false);
      expect(navigation.focusKey('docs')).toBe(false);
      expect(navigation.focusKey('license')).toBe(true);
    });

    it('exposes the active item', () => {
      const { navigation } = setup(FlatTreeHost);
      navigation.focusKey('docs');

      expect(navigation.activeItem()?.itemKey()).toBe('docs');
    });
  });

  describe('node source and windowing', () => {
    function windowed() {
      const result = setup(WindowedTreeHost);
      return {
        ...result,
        mounted: () => result.navigation.items().map((item) => item.itemKey()),
      };
    }

    it('renders and navigates a window of the visible nodes', () => {
      const { mounted, navigation } = windowed();

      expect(mounted()).toEqual(['g0', 'g1', 'g2', 'g3', 'g4']);
      expect(navigation.visibleNodes()).toHaveLength(40);
    });

    it('knows set sizes for rows that are not mounted', () => {
      const { navigation } = windowed();

      expect(navigation.nodeInfo('g39')?.posInSet).toBe(40);
      expect(navigation.nodeInfo('g39')?.setSize).toBe(40);
      expect(navigation.nodeInfo('g20b')?.setSize).toBe(2);
    });

    it('moves to a row outside the window and asks for it to be revealed', () => {
      const { fixture, navigation, focus, press, mounted } = windowed();
      focus('g0');

      press('End');

      expect(navigation.activeKey()).toBe('g39');
      expect(fixture.componentInstance.reveals).toEqual([
        { key: 'g39', index: 39 },
      ]);
      expect(mounted()).toContain('g39');
    });

    it('focuses the row as soon as it mounts', () => {
      const { focused, focus, press } = windowed();
      focus('g0');

      press('End');

      expect(focused()).toBe('g39');
    });

    it('steps across the window edge with Down', () => {
      const { focused, focus, press, fixture } = windowed();
      focus('g4');
      press('ArrowDown');

      expect(focused()).toBe('g5');
      expect(fixture.componentInstance.reveals[0].key).toBe('g5');
    });

    it('opens a parent in the window and reaches children that are unmounted', () => {
      const { navigation, focus, press, focused } = windowed();
      focus('g0');
      press('ArrowRight');
      press('ArrowRight');

      expect(focused()).toBe('g0a');
      expect(navigation.nodeInfo('g0a')?.level).toBe(2);
    });

    it('collapse from inside moves to the ancestor even when it is outside the window', () => {
      const { fixture, navigation, focus, press, focused } = windowed();
      focus('g0');
      press('ArrowRight');
      press('ArrowRight');
      press('ArrowDown'); // g0b
      // Scroll the window away so that g0 is no longer mounted.
      fixture.componentInstance.start.set(20);
      fixture.detectChanges();
      expect(navigation.itemForKey('g0')).toBeNull();

      navigation.collapse('g0');
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('g0');
      expect(fixture.componentInstance.reveals.at(-1)).toEqual({
        key: 'g0',
        index: 0,
      });
      expect(focused()).toBe('g0');
    });

    it('keeps the active node when its row scrolls out of the window', () => {
      const { fixture, navigation, focus } = windowed();
      focus('g1');

      fixture.componentInstance.start.set(20);
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('g1');
      expect(navigation.itemForKey('g1')).toBeNull();
    });

    it('offers a container tab stop while the tabbable row is unmounted', () => {
      const { fixture, navigation, focus, keyHost } = windowed();
      focus('g1');
      expect(keyHost().hasAttribute('tabindex')).toBe(false);

      fixture.componentInstance.start.set(20);
      fixture.detectChanges();

      expect(navigation.containerTabIndex()).toBe(0);
      expect(keyHost().getAttribute('tabindex')).toBe('0');
    });

    it('forwards focus on the container to the tabbable row', () => {
      const { fixture, navigation, focus, keyHost, focused } = windowed();
      focus('g1');
      fixture.componentInstance.start.set(20);
      fixture.detectChanges();
      // A scroll is a rendering change; a reveal moves the window back to the row.
      keyHost().focus();
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('g1');
      expect(focused()).toBe('g1');
    });

    it('follows changes to the source', () => {
      const { fixture, navigation } = windowed();
      fixture.componentInstance.nodes.update((nodes) => nodes.slice(0, 3));
      fixture.detectChanges();

      expect(navigation.visibleNodes().map((node) => node.key)).toEqual(['g0']);
      navigation.expand('g0');
      expect(navigation.visibleNodes()).toHaveLength(3);
    });

    it('moves a deleted active node to its remembered parent', () => {
      const { fixture, navigation, focus, press } = windowed();
      focus('g0');
      press('ArrowRight');
      press('ArrowRight');
      expect(navigation.activeKey()).toBe('g0a');

      fixture.componentInstance.nodes.update((nodes) =>
        nodes.filter((node) => node.key !== 'g0a'),
      );
      fixture.detectChanges();

      expect(navigation.activeKey()).toBe('g0');
    });

    it('lets parents follow their children in the source', () => {
      const { fixture, navigation } = windowed();
      fixture.componentInstance.nodes.set([
        { key: 'child', parentKey: 'parent' },
        { key: 'parent' },
      ]);
      navigation.expand('parent');
      fixture.detectChanges();

      expect(navigation.visibleNodes().map((node) => node.key)).toEqual([
        'parent',
        'child',
      ]);
      expect(navigation.nodeInfo('child')?.level).toBe(2);
    });

    it('goes back to the registered items when the source is removed', () => {
      const { fixture, navigation } = windowed();
      navigation.setNodes(null);
      fixture.detectChanges();

      expect(navigation.visibleNodes().map((node) => node.key)).toEqual([
        'g0',
        'g1',
        'g2',
        'g3',
        'g4',
      ]);
    });
  });

  describe('without a DOM', () => {
    function service() {
      TestBed.configureTestingModule({ providers: [AndesTreeNavigation] });
      return TestBed.inject(AndesTreeNavigation);
    }

    function chain(depth: number): AndesTreeNavigationNode[] {
      return Array.from({ length: depth }, (_, index) => ({
        key: index,
        parentKey: index === 0 ? null : index - 1,
        label: `node ${index}`,
      }));
    }

    it('handles a very deep tree without overflowing the stack', () => {
      const navigation = service();
      const depth = 5000;
      navigation.setNodes(() => chain(depth));

      navigation.expandAll();

      expect(navigation.visibleNodes()).toHaveLength(depth);
      expect(navigation.nodeInfo(depth - 1)?.level).toBe(depth);
      expect(navigation.nodeInfo(depth - 1)?.setSize).toBe(1);
      navigation.focusLast();
      expect(navigation.activeKey()).toBe(depth - 1);
      navigation.collapse(0);
      TestBed.tick();
      expect(navigation.activeKey()).toBe(0);
    });

    it('handles a wide tree', () => {
      const navigation = service();
      navigation.setNodes(() =>
        Array.from({ length: 20000 }, (_, index) => ({ key: index })),
      );

      expect(navigation.visibleNodes()).toHaveLength(20000);
      expect(navigation.nodeInfo(19999)?.posInSet).toBe(20000);
    });

    it('survives a cycle in the parent links', () => {
      const navigation = service();
      navigation.setNodes(() => [
        { key: 'a', parentKey: 'b' },
        { key: 'b', parentKey: 'a' },
        { key: 'c' },
      ]);

      expect(navigation.visibleNodes().map((node) => node.key)).toEqual(['c']);
    });

    it('treats a node that names itself as parent as a root', () => {
      const navigation = service();
      navigation.setNodes(() => [{ key: 'a', parentKey: 'a' }]);

      expect(navigation.visibleNodes().map((node) => node.key)).toEqual(['a']);
      expect(navigation.nodeInfo('a')?.level).toBe(1);
    });

    it('navigates by key with no items mounted, asking for each row to be revealed', () => {
      const navigation = service();
      const reveals: AndesTreeNavigationRevealRequest[] = [];
      navigation.revealRequested.subscribe((request) => reveals.push(request));
      navigation.setNodes(() => [{ key: 'a' }, { key: 'b' }, { key: 'c' }]);

      navigation.focusFirst();
      navigation.focusNext();
      navigation.focusLast();

      expect(reveals).toEqual([
        { key: 'a', index: 0 },
        { key: 'b', index: 1 },
        { key: 'c', index: 2 },
      ]);
    });

    it('handles keydown on a bare element', () => {
      const navigation = service();
      navigation.setNodes(() => [
        { key: 'a', label: 'apple' },
        { key: 'b', label: 'berry' },
      ]);
      const element = document.createElement('div');
      element.addEventListener('keydown', (event) =>
        navigation.onKeydown(event),
      );

      pressKey(element, 'ArrowDown');
      expect(navigation.activeKey()).toBe('a');
      pressKey(element, 'b');
      expect(navigation.activeKey()).toBe('b');
      navigation.cancelTypeahead();
    });

    it('returns false from setActiveKeySilently for keys it does not know', () => {
      const navigation = service();
      navigation.setNodes(() => [{ key: 'a' }]);

      expect(navigation.setActiveKeySilently('zzz')).toBe(false);
    });

    it('does not crash on an empty tree', () => {
      const navigation = service();
      const element = document.createElement('div');
      element.addEventListener('keydown', (event) =>
        navigation.onKeydown(event),
      );

      for (const key of [
        'ArrowDown',
        'ArrowUp',
        'ArrowRight',
        'ArrowLeft',
        'Home',
        'End',
        '*',
        'a',
      ]) {
        pressKey(element, key);
      }

      navigation.cancelTypeahead();
      expect(navigation.activeKey()).toBeNull();
    });
  });

  describe('teardown and platform', () => {
    it('cancels a pending typeahead timer on destroy', () => {
      vi.useFakeTimers();
      const { fixture, press, focus, navigation } = setup(FlatTreeHost);
      focus('src');
      press('d');
      expect(navigation.isTyping()).toBe(true);
      const clear = vi.spyOn(globalThis, 'clearTimeout');

      fixture.destroy();

      expect(clear).toHaveBeenCalled();
      expect(navigation.isTyping()).toBe(false);
    });

    it('completes its observables on destroy', () => {
      const { fixture, navigation } = setup(FlatTreeHost);
      const completed = vi.fn();
      navigation.expandedChange.subscribe({ complete: completed });
      navigation.revealRequested.subscribe({ complete: completed });
      navigation.tabOut.subscribe({ complete: completed });

      fixture.destroy();

      expect(completed).toHaveBeenCalledTimes(3);
    });

    it('unregisters items when they are destroyed', () => {
      const { fixture, navigation } = setup(FlatTreeHost);
      fixture.destroy();

      expect(navigation.items()).toHaveLength(0);
    });

    it('does not touch focus on the server', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { navigation, item } = setup(FlatTreeHost);
      const element = item('docs') as HTMLElement;
      const focus = vi.spyOn(element, 'focus');

      expect(navigation.focusKey('docs')).toBe(true);

      expect(navigation.activeKey()).toBe('docs');
      expect(focus).not.toHaveBeenCalled();
    });

    it('does not scroll on the server in active-descendant mode', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { navigation, item } = setup(ActiveDescendantHost);
      const element = item('docs') as HTMLElement;
      element.scrollIntoView = vi.fn();

      navigation.focusKey('docs');

      expect(element.scrollIntoView).not.toHaveBeenCalled();
    });

    it('does not move focus back after the host is destroyed', () => {
      const { fixture, navigation } = setup(FlatTreeHost);
      navigation.expandAll();
      navigation.focusKey('main');
      fixture.destroy();

      expect(() => navigation.setExpanded([])).not.toThrow();
    });
  });
});
