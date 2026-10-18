import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';

import {
  buildTreeStructure,
  collectVisibleNodes,
  TreeNodeRecord,
} from './tree-navigation-structure';
import {
  AndesTreeFocusMode,
  AndesTreeNavigationConfig,
  AndesTreeNavigationExpandChange,
  AndesTreeNavigationExpandedSource,
  AndesTreeNavigationItemRef,
  AndesTreeNavigationKey,
  AndesTreeNavigationNode,
  AndesTreeNavigationNodeInfo,
  AndesTreeNavigationNodeSource,
  AndesTreeNavigationRevealRequest,
  AndesTreeNavigationScope,
  AndesTreeOrientation,
  AndesTreeTextDirection,
} from './tree-navigation-types';

/** Default time a typeahead query stays buffered, matching the WAI-ARIA examples. */
export const ANDES_TREE_TYPEAHEAD_DEBOUNCE = 500;

/** `Node.DOCUMENT_POSITION_*` values, inlined so this file never touches the `Node` global. */
const DOCUMENT_POSITION_DISCONNECTED = 1;
const DOCUMENT_POSITION_PRECEDING = 2;

type Direction = 1 | -1;

type Command = 'next' | 'previous' | 'open' | 'close';

/** Whether `later` comes after `earlier` in the document (or cannot be compared at all). */
function isInOrder(
  earlier: AndesTreeNavigationItemRef,
  later: AndesTreeNavigationItemRef,
): boolean {
  const position = earlier.element.compareDocumentPosition(later.element);
  if (position & DOCUMENT_POSITION_DISCONNECTED) {
    return true;
  }
  return !(position & DOCUMENT_POSITION_PRECEDING);
}

/**
 * Returns the items in DOM order. Items normally register in DOM order already, so the common
 * case is one cheap pass that hands back the same array; only a real reorder pays for a sort.
 */
function inDocumentOrder(
  items: readonly AndesTreeNavigationItemRef[],
): readonly AndesTreeNavigationItemRef[] {
  for (let index = 1; index < items.length; index++) {
    if (!isInOrder(items[index - 1], items[index])) {
      return [...items].sort((a, b) =>
        isInOrder(a, b) ? (isInOrder(b, a) ? 0 : -1) : 1,
      );
    }
  }
  return items;
}

/** Whether a key event is a plain printable character, i.e. typeahead input. */
function isPrintableCharacter(event: KeyboardEvent): boolean {
  return (
    event.key?.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
  );
}

/**
 * Shared keyboard-navigation state for hierarchical widgets: trees, cascading pickers, menus
 * with fly-out submenus, grouped navigation. It owns the *visible-node* order (collapsed
 * subtrees are skipped), the active node, the expanded keys, the WAI-ARIA TreeView keys and
 * the ARIA facts (`aria-level`, `aria-posinset`, `aria-setsize`, `aria-expanded`) a node needs.
 *
 * It is a DI-scoped service, not a directive: provide it from the consuming component so that
 * every descendant item — including items rendered into a CDK overlay, which are injector
 * descendants but not DOM descendants — can inject the same instance.
 *
 * ```ts
 * @Component({
 *   selector: 'andes-tree',
 *   providers: [AndesTreeNavigation],
 *   template: `
 *     <ul role="tree" andesTreeNavigationKeys>
 *       @for (node of nodes(); track node.key) {
 *         <li
 *           role="treeitem"
 *           [andesTreeNavigationItem]="node.key"
 *           [parentKey]="node.parentKey"
 *           [disabled]="node.disabled"
 *         >
 *           {{ node.title }}
 *         </li>
 *       }
 *     </ul>
 *   `,
 * })
 * export class AndesTree {
 *   protected readonly navigation = inject(AndesTreeNavigation);
 * }
 * ```
 *
 * ### Where the structure comes from
 *
 * By default the structure is read from the registered items: each item names its key and its
 * parent, and their DOM order is the sibling order. That is exact for any tree that renders all
 * of its nodes. A **windowed** tree renders only the rows in view, so items come and go as the
 * user scrolls; for those, give the navigation the nodes directly with {@link setNodes}. Its
 * data order then drives everything, and rows that are not mounted are still part of the
 * keyboard order: moving onto one emits {@link revealRequested} so the list can scroll to it,
 * and the item takes focus the moment it mounts.
 *
 * ### What it deliberately does not do
 *
 * It owns no selection or checked state, sets no `role`, and never interprets `Enter` or
 * `Space` — activation is the consumer's. "Active node" is keyboard focus, not selection.
 */
@Injectable()
export class AndesTreeNavigation {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = inject(PLATFORM_ID) === 'browser';

  /** Which arrow keys move and which open/close. */
  readonly orientation = signal<AndesTreeOrientation>('vertical');
  /** Which nodes a move key walks over. */
  readonly scope = signal<AndesTreeNavigationScope>('tree');
  /** Whether moving past the first/last node wraps around. */
  readonly wrap = signal(false);
  /** Whether typing characters moves to the next matching node. */
  readonly typeahead = signal(true);
  /** How long a typeahead query stays buffered after the last keystroke. */
  readonly typeaheadDebounce = signal(ANDES_TREE_TYPEAHEAD_DEBOUNCE);
  /** Whether `Home`/`End` jump to the first/last node. */
  readonly homeAndEnd = signal(true);
  /** Whether `*` expands every sibling of the active node. */
  readonly expandSiblings = signal(true);
  /** How the active node is surfaced to assistive technology. */
  readonly focusMode = signal<AndesTreeFocusMode>('roving-tabindex');
  /** Text direction used to mirror the horizontal arrow keys. */
  readonly textDirection = signal<AndesTreeTextDirection>('ltr');
  /** Whether disabled nodes are skipped while navigating. */
  readonly skipDisabled = signal(true);
  /** Whether the keyboard may expand and collapse a disabled node. */
  readonly expandDisabled = signal(false);
  /** Whether the open key on a collapsed parent also steps into its first child. */
  readonly enterOnExpand = signal(false);
  /** Whether the close key on a child also collapses the parent it steps back to. */
  readonly collapseOnLeave = signal(false);

  private readonly source = signal<AndesTreeNavigationNodeSource | null>(null);
  private readonly registered = signal<readonly AndesTreeNavigationItemRef[]>(
    [],
  );
  private readonly orderVersion = signal(0);

  /**
   * Every registered item, in DOM order. Items that scroll out of a windowed tree are not in
   * here, which is why the navigation reads its structure from {@link setNodes} there.
   */
  readonly items: Signal<readonly AndesTreeNavigationItemRef[]> = computed(
    () => {
      this.orderVersion();
      return inDocumentOrder(this.registered());
    },
  );

  private readonly itemByKey = computed(() => {
    const byKey = new Map<AndesTreeNavigationKey, AndesTreeNavigationItemRef>();
    for (const item of this.registered()) {
      const key = item.itemKey();
      if (!byKey.has(key)) {
        byKey.set(key, item);
      }
    }
    return byKey;
  });

  private readonly itemByElement = computed(
    () => new Map(this.registered().map((item) => [item.element, item])),
  );

  private readonly nodes = computed<readonly AndesTreeNavigationNode[]>(() => {
    const source = this.source();
    if (source) {
      return source();
    }
    return this.items().map((item) => ({
      key: item.itemKey(),
      parentKey: item.itemParentKey(),
      disabled: item.isDisabled(),
      expandable: item.isExpandable(),
    }));
  });

  private readonly structure = computed(() => buildTreeStructure(this.nodes()));

  private readonly ownExpanded = signal<ReadonlySet<AndesTreeNavigationKey>>(
    new Set(),
  );
  private readonly expandedStore = signal<AndesTreeNavigationExpandedSource>(
    this.ownExpanded,
  );

  /** The keys of the expanded nodes. */
  readonly expandedKeys: Signal<ReadonlySet<AndesTreeNavigationKey>> = computed(
    () => {
      const value = this.expandedStore()();
      return Array.isArray(value)
        ? new Set<AndesTreeNavigationKey>(value)
        : (value as ReadonlySet<AndesTreeNavigationKey>);
    },
  );

  private readonly visible = computed(() =>
    collectVisibleNodes(this.structure().roots, this.expandedKeys()),
  );

  /**
   * The nodes a user can reach, in reading order: every node whose ancestors are all expanded.
   * This — not the DOM — is the order the arrow keys follow, so collapsed subtrees cost
   * nothing and an unmounted row still has its place. A virtual list renders a window of it.
   */
  readonly visibleNodes: Signal<readonly AndesTreeNavigationNodeInfo[]> =
    this.visible;

  private readonly visibleIndex = computed(() => {
    const index = new Map<AndesTreeNavigationKey, number>();
    this.visible().forEach((node, position) => index.set(node.key, position));
    return index;
  });

  private readonly _activeKey = signal<AndesTreeNavigationKey | null>(null);
  /** The active node's key, or `null` when nothing is active yet. */
  readonly activeKey: Signal<AndesTreeNavigationKey | null> =
    this._activeKey.asReadonly();

  /** The active node's mounted item, or `null` — also when the node is outside a window. */
  readonly activeItem: Signal<AndesTreeNavigationItemRef | null> = computed(
    () => {
      const key = this._activeKey();
      return key === null ? null : (this.itemByKey().get(key) ?? null);
    },
  );

  /** Index of the active node within {@link visibleNodes}, or `-1`. */
  readonly activeIndex: Signal<number> = computed(() => {
    const key = this._activeKey();
    return key === null ? -1 : (this.visibleIndex().get(key) ?? -1);
  });

  /**
   * The `id` to publish as `aria-activedescendant`, or `null` in `roving-tabindex` mode (where
   * real focus already conveys the active node) and while the active node has no mounted item.
   */
  readonly activeDescendantId: Signal<string | null> = computed(() =>
    this.focusMode() === 'active-descendant'
      ? (this.activeItem()?.itemId ?? null)
      : null,
  );

  /**
   * The node that should carry `tabindex="0"` in `roving-tabindex` mode: the active node, or —
   * before anything is active, or once the active node is hidden or skipped — the first node
   * the user can navigate to, so the tree is always reachable with one Tab press.
   */
  readonly tabbableKey: Signal<AndesTreeNavigationKey | null> = computed(() => {
    const active = this._activeKey();
    if (active !== null && this.isNavigable(active)) {
      return active;
    }
    return this.visible().find((node) => !this.isSkipped(node))?.key ?? null;
  });

  /**
   * `0` when the tree has a tab stop but no mounted item to put it on — the tabbable node is
   * outside a windowed tree's rendered range — and `null` otherwise. Bind it to the
   * container's `tabindex` in virtualized templates; {@link AndesTreeNavigationKeys} forwards
   * focus on the container to the tabbable node, which scrolls it in.
   */
  readonly containerTabIndex: Signal<0 | null> = computed(() => {
    if (this.focusMode() !== 'roving-tabindex') {
      return null;
    }
    const key = this.tabbableKey();
    return key !== null && !this.itemByKey().has(key) ? 0 : null;
  });

  private readonly _expandedChange =
    new Subject<AndesTreeNavigationExpandChange>();
  /**
   * Emits whenever the navigation expands or collapses a node on the user's behalf — an arrow
   * key, `*`, or {@link expand}/{@link collapse}/{@link toggle}. This is where a lazy tree
   * starts loading children. {@link setExpanded} and `configure({ expanded })` are the consumer
   * speaking, so they do not echo back.
   */
  readonly expandedChange: Observable<AndesTreeNavigationExpandChange> =
    this._expandedChange.asObservable();

  private readonly _revealRequested =
    new Subject<AndesTreeNavigationRevealRequest>();
  /**
   * Emits when navigation lands on a node that has no mounted item (see {@link setNodes}).
   * Scroll the list to the given index; the item focuses itself when it mounts.
   */
  readonly revealRequested: Observable<AndesTreeNavigationRevealRequest> =
    this._revealRequested.asObservable();

  private readonly _tabOut = new Subject<void>();
  /** Emits when `Tab` is pressed, so a menu or popup can close and hand focus back. */
  readonly tabOut: Observable<void> = this._tabOut.asObservable();

  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  /** The node focus should land on as soon as its item mounts. */
  private pendingFocusKey: AndesTreeNavigationKey | null = null;
  /** The parent to step into as soon as it has a child (`enterOnExpand` with lazy children). */
  private pendingEnterKey: AndesTreeNavigationKey | null = null;
  /** The active node's ancestors, nearest first, kept for when the node itself disappears. */
  private activeAncestry: readonly AndesTreeNavigationKey[] = [];
  /** Whether keyboard focus was last seen on one of this navigation's items. */
  private focusInside = false;
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.cancelTypeahead();
      this._expandedChange.complete();
      this._revealRequested.complete();
      this._tabOut.complete();
    });

    // The structure can change under the active node without any key being pressed: a
    // controlled `expanded` set collapses, a lazy child arrives, a row is deleted. Settle the
    // active node (and any step-into waiting for children) whenever that happens.
    effect(() => {
      this.visible();
      untracked(() => {
        this.reconcileActive();
        this.resolvePendingEnter();
      });
    });
  }

  /** Applies any subset of the configuration options in one call. */
  configure(config: AndesTreeNavigationConfig): void {
    if (config.orientation !== undefined) {
      this.orientation.set(config.orientation);
    }
    if (config.scope !== undefined) {
      this.scope.set(config.scope);
    }
    if (config.wrap !== undefined) {
      this.wrap.set(config.wrap);
    }
    if (config.typeahead !== undefined) {
      this.typeahead.set(config.typeahead);
    }
    if (config.typeaheadDebounce !== undefined) {
      this.typeaheadDebounce.set(config.typeaheadDebounce);
    }
    if (config.homeAndEnd !== undefined) {
      this.homeAndEnd.set(config.homeAndEnd);
    }
    if (config.expandSiblings !== undefined) {
      this.expandSiblings.set(config.expandSiblings);
    }
    if (config.focusMode !== undefined) {
      this.focusMode.set(config.focusMode);
    }
    if (config.textDirection !== undefined) {
      this.textDirection.set(config.textDirection);
    }
    if (config.skipDisabled !== undefined) {
      this.skipDisabled.set(config.skipDisabled);
    }
    if (config.expandDisabled !== undefined) {
      this.expandDisabled.set(config.expandDisabled);
    }
    if (config.enterOnExpand !== undefined) {
      this.enterOnExpand.set(config.enterOnExpand);
    }
    if (config.collapseOnLeave !== undefined) {
      this.collapseOnLeave.set(config.collapseOnLeave);
    }
    if (config.expanded !== undefined) {
      this.setExpanded(config.expanded);
    }
  }

  /**
   * Supplies the nodes in data order instead of reading them from the registered items — the
   * mode for windowed trees, and for any tree that wants to navigate nodes it has not rendered.
   * Pass `null` to go back to deriving the structure from items.
   *
   * The function runs inside a `computed`, so signals it reads (the node list, a loaded-children
   * map) keep the navigation up to date by themselves.
   */
  setNodes(source: AndesTreeNavigationNodeSource | null): void {
    this.source.set(source);
  }

  /**
   * Keeps the expanded keys in a signal the consumer owns, e.g. a component's `model()`, so
   * the state has one home and two-way binding just works. A `Set` and an array are both
   * accepted; whichever shape the signal holds is written back. Pass `null` to return to the
   * navigation's own store.
   */
  bindExpanded<K extends AndesTreeNavigationKey>(
    source: AndesTreeNavigationExpandedSource<K> | null,
  ): void {
    this.expandedStore.set(
      (source as AndesTreeNavigationExpandedSource | null) ?? this.ownExpanded,
    );
  }

  /** Adds an item to the tree. Called by `AndesTreeNavigationItem` on init. */
  register(item: AndesTreeNavigationItemRef): void {
    this.registered.update((items) => [...items, item]);
  }

  /**
   * Removes an item from the tree. Called by `AndesTreeNavigationItem` on destroy. If that item
   * was the active one, the reconcile that follows decides where the active node goes.
   */
  unregister(item: AndesTreeNavigationItemRef): void {
    this.registered.update((items) => items.filter((entry) => entry !== item));
  }

  /**
   * Re-reads the DOM order of the items. The order is re-checked whenever the tree's structure
   * changes, but moving existing elements around (re-sorting a `@for` list) changes no signal,
   * so call this after such a reorder. Trees fed by {@link setNodes} never need it.
   */
  refreshOrder(): void {
    this.orderVersion.update((version) => version + 1);
  }

  // ------------------------------------------------------------------ queries

  /** The hierarchy facts of a node, or `null` for a key the navigation does not know. */
  nodeInfo(key: AndesTreeNavigationKey): AndesTreeNavigationNodeInfo | null {
    return this.structure().byKey.get(key) ?? null;
  }

  /** Index of a node among the {@link visibleNodes}, or `-1` when it is hidden or unknown. */
  visibleIndexOf(key: AndesTreeNavigationKey): number {
    return this.visibleIndex().get(key) ?? -1;
  }

  /** The mounted item of a node, if it has one. */
  itemForKey(key: AndesTreeNavigationKey): AndesTreeNavigationItemRef | null {
    return this.itemByKey().get(key) ?? null;
  }

  /** Whether a node is expanded. */
  isExpanded(key: AndesTreeNavigationKey): boolean {
    return this.expandedKeys().has(key);
  }

  // ------------------------------------------------------------------ expansion

  /** Expands a node that can be expanded. Returns whether anything changed. */
  expand(key: AndesTreeNavigationKey): boolean {
    const node = this.structure().byKey.get(key);
    if (!node || !node.expandable || this.isExpanded(key)) {
      return false;
    }
    this.commitExpanded(new Set(this.expandedKeys()).add(key), true);
    return true;
  }

  /** Collapses a node. If the active node was inside it, the active node becomes this one. */
  collapse(key: AndesTreeNavigationKey): boolean {
    if (!this.isExpanded(key)) {
      return false;
    }
    const next = new Set(this.expandedKeys());
    next.delete(key);
    this.commitExpanded(next, true);
    return true;
  }

  /** Expands a collapsed node and collapses an expanded one. */
  toggle(key: AndesTreeNavigationKey): boolean {
    return this.isExpanded(key) ? this.collapse(key) : this.expand(key);
  }

  /** Expands every known node that can be expanded. */
  expandAll(): void {
    const next = new Set(this.expandedKeys());
    for (const node of this.structure().byKey.values()) {
      if (node.expandable) {
        next.add(node.key);
      }
    }
    this.commitExpanded(next, true);
  }

  /** Collapses every node. */
  collapseAll(): void {
    this.commitExpanded(new Set(), true);
  }

  /** Expands every ancestor of a node, so that the node becomes visible. */
  expandTo(key: AndesTreeNavigationKey): void {
    const next = new Set(this.expandedKeys());
    for (
      let ancestor = this.structure().byKey.get(key)?.parent ?? null;
      ancestor;
      ancestor = ancestor.parent
    ) {
      next.add(ancestor.key);
    }
    this.commitExpanded(next, true);
  }

  /**
   * Replaces the expanded keys. This is the consumer setting state, so it emits no
   * {@link expandedChange}.
   */
  setExpanded(keys: Iterable<AndesTreeNavigationKey>): void {
    this.commitExpanded(new Set(keys), false);
  }

  // ------------------------------------------------------------------ focus

  /**
   * Makes a visible, navigable node active and brings it into focus. In `roving-tabindex` mode
   * that moves real focus to its item; in `active-descendant` mode it scrolls the item into
   * view. If the node has no mounted item (a windowed tree) it is still made active, and
   * {@link revealRequested} asks the list to render it. Returns `false` for a hidden, unknown
   * or skipped node, leaving everything as it was.
   */
  focusKey(key: AndesTreeNavigationKey): boolean {
    if (!this.isNavigable(key)) {
      return false;
    }
    this.activate(key);
    const item = this.itemByKey().get(key);
    if (item) {
      this.applyFocus(item);
    } else {
      this.pendingFocusKey = key;
      this._revealRequested.next({ key, index: this.visibleIndexOf(key) });
    }
    return true;
  }

  /** Moves the active node to the first navigable node of the current scope. */
  focusFirst(): void {
    this.focusEdge(true);
  }

  /** Moves the active node to the last navigable node of the current scope. */
  focusLast(): void {
    this.focusEdge(false);
  }

  /** Moves the active node to the next navigable node, respecting {@link wrap}. */
  focusNext(): void {
    this.move(this.currentRecord(), 1);
  }

  /** Moves the active node to the previous navigable node, respecting {@link wrap}. */
  focusPrevious(): void {
    this.move(this.currentRecord(), -1);
  }

  /**
   * Moves the active pointer without focusing anything — for restoring the active node on
   * init (say, the selected one), or following a click that already moved real focus. Accepts
   * any known node, even one that is currently collapsed away. Returns `false` for an unknown
   * key.
   */
  setActiveKeySilently(key: AndesTreeNavigationKey | null): boolean {
    if (key === null) {
      this.clearActive();
      return true;
    }
    if (!this.structure().byKey.has(key)) {
      return false;
    }
    this.activate(key);
    return true;
  }

  /** Clears the active node, e.g. when a popup closes. */
  clearActive(): void {
    this.pendingFocusKey = null;
    this.pendingEnterKey = null;
    this.activeAncestry = [];
    this._activeKey.set(null);
  }

  /** Whether a typeahead query is currently buffered. */
  isTyping(): boolean {
    return this.typeaheadBuffer.length > 0;
  }

  /** Discards any buffered typeahead query. */
  cancelTypeahead(): void {
    this.clearTypeaheadTimer();
    this.typeaheadBuffer = '';
  }

  private clearTypeaheadTimer(): void {
    if (this.typeaheadTimer !== null) {
      clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = null;
    }
  }

  // ------------------------------------------------------------------ item hooks

  /**
   * Called by an item when real focus lands on it, so the active node follows the mouse or a
   * direct Tab and Tabbing away and back returns to the same place.
   */
  onItemFocusin(item: AndesTreeNavigationItemRef): void {
    this.focusInside = true;
    if (this.focusMode() !== 'roving-tabindex') {
      return;
    }
    const key = item.itemKey();
    if (this._activeKey() !== key && this.structure().byKey.has(key)) {
      this.activate(key);
    }
  }

  /**
   * Called by an item when it loses focus. Focus that merely moves to another node keeps the
   * "focus is in the tree" memory; so does an item that was removed while focused, which is
   * exactly the case where focus must be handed to an ancestor instead of being lost.
   */
  onItemFocusout(item: AndesTreeNavigationItemRef, event: FocusEvent): void {
    const next = event.relatedTarget as Element | null;
    if (next) {
      this.focusInside = this.itemByElement().has(next as HTMLElement);
    } else if (item.element.isConnected) {
      this.focusInside = false;
    }
  }

  /**
   * Called by an item once it has rendered, so a node that navigation reached before it was
   * mounted (a windowed tree) receives the focus it was promised.
   */
  onItemRendered(item: AndesTreeNavigationItemRef): void {
    if (
      this.pendingFocusKey !== null &&
      item.itemKey() === this.pendingFocusKey
    ) {
      this.pendingFocusKey = null;
      this.applyFocus(item);
    }
  }

  // ------------------------------------------------------------------ keyboard

  /**
   * Handles a `keydown` on whichever element owns keyboard focus for this tree — the tree or a
   * node in `roving-tabindex` mode, the input in `active-descendant` mode.
   * `AndesTreeNavigationKeys` wires this up for you.
   *
   * Only navigation keys are consumed (and `preventDefault`ed): the four arrows, `Home`, `End`,
   * `*` and typeahead characters. `Enter`, `Space` (outside a typeahead query) and `Escape`
   * are left entirely to the consumer, as are keys typed into a control nested inside a node
   * and any event a consumer handler already `preventDefault`ed — which is how a multi-select
   * tree claims `Shift`+arrow before the navigation sees it.
   */
  onKeydown(event: KeyboardEvent): void {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    if (event.key === 'Tab') {
      this._tabOut.next();
      return;
    }

    const origin = this.keyOrigin(event);
    if (origin === 'inside-node') {
      return;
    }
    if (origin !== null) {
      // Real focus is the source of truth in roving mode; catch up if a focus event was missed.
      if (this._activeKey() !== origin && this.structure().byKey.has(origin)) {
        this.activate(origin);
      }
    }

    const record = this.currentRecord();
    const handled = this.handleKey(event, record);
    if (handled) {
      event.preventDefault();
    }
  }

  // ------------------------------------------------------------------ internals

  private handleKey(
    event: KeyboardEvent,
    record: TreeNodeRecord | null,
  ): boolean {
    const command = this.commandFor(event.key);
    if (command === 'next') {
      return this.move(record, 1);
    }
    if (command === 'previous') {
      return this.move(record, -1);
    }
    if (command === 'open') {
      return this.open(record);
    }
    if (command === 'close') {
      return this.close(record);
    }
    if (event.key === 'Home' && this.homeAndEnd()) {
      return this.focusEdge(true, record);
    }
    if (event.key === 'End' && this.homeAndEnd()) {
      return this.focusEdge(false, record);
    }
    if (event.key === '*' && this.expandSiblings()) {
      return this.expandSiblingsOf(record);
    }
    if (isPrintableCharacter(event) && this.typeahead()) {
      // Space activates a node; it may extend a typeahead query but must never start one.
      if (event.key === ' ' && !this.isTyping()) {
        return false;
      }
      return this.matchTypeahead(event.key, record);
    }
    return false;
  }

  /** Maps an arrow key to what it means in the current orientation and direction. */
  private commandFor(key: string): Command | null {
    const rtl = this.textDirection() === 'rtl';
    if (this.orientation() === 'horizontal') {
      switch (key) {
        case 'ArrowRight':
          return rtl ? 'previous' : 'next';
        case 'ArrowLeft':
          return rtl ? 'next' : 'previous';
        case 'ArrowDown':
          return 'open';
        case 'ArrowUp':
          return 'close';
      }
      return null;
    }
    switch (key) {
      case 'ArrowDown':
        return 'next';
      case 'ArrowUp':
        return 'previous';
      case 'ArrowRight':
        return rtl ? 'close' : 'open';
      case 'ArrowLeft':
        return rtl ? 'open' : 'close';
    }
    return null;
  }

  /**
   * Where a key press came from: the key of the node whose item it was typed on, `null` for
   * the container itself, or `'inside-node'` for a control nested inside a node, whose keys
   * belong to that control.
   */
  private keyOrigin(
    event: KeyboardEvent,
  ): AndesTreeNavigationKey | 'inside-node' | null {
    const byElement = this.itemByElement();
    let element = event.target as Element | null;
    while (element) {
      const item = byElement.get(element as HTMLElement);
      if (item) {
        return item.element === event.target ? item.itemKey() : 'inside-node';
      }
      if (element === event.currentTarget) {
        break;
      }
      element = element.parentElement;
    }
    return null;
  }

  /** The active node's record, provided it is still visible. */
  private currentRecord(): TreeNodeRecord | null {
    const key = this._activeKey();
    if (key === null || !this.visibleIndex().has(key)) {
      return null;
    }
    return this.structure().byKey.get(key) ?? null;
  }

  private isSkipped(node: AndesTreeNavigationNodeInfo): boolean {
    return this.skipDisabled() && node.disabled;
  }

  private isNavigable(key: AndesTreeNavigationKey): boolean {
    if (!this.visibleIndex().has(key)) {
      return false;
    }
    const node = this.structure().byKey.get(key);
    return !!node && !this.isSkipped(node);
  }

  private canToggle(node: TreeNodeRecord): boolean {
    return !node.disabled || this.expandDisabled();
  }

  /** The nodes a move key walks over: everything visible, or just the active node's group. */
  private scopeList(record: TreeNodeRecord | null): readonly TreeNodeRecord[] {
    if (this.scope() === 'tree') {
      return this.visible();
    }
    return record
      ? (record.parent?.children ?? this.structure().roots)
      : this.structure().roots;
  }

  private indexInScope(
    list: readonly TreeNodeRecord[],
    record: TreeNodeRecord | null,
  ): number {
    if (!record) {
      return -1;
    }
    return this.scope() === 'tree'
      ? this.visibleIndexOf(record.key)
      : list.indexOf(record);
  }

  private move(record: TreeNodeRecord | null, direction: Direction): boolean {
    const list = this.scopeList(record);
    const from = this.indexInScope(list, record);
    const target =
      from === -1
        ? this.edgeOf(list, direction === 1)
        : this.stepFrom(list, from, direction);
    if (target) {
      this.focusKey(target.key);
    }
    return true;
  }

  private stepFrom(
    list: readonly TreeNodeRecord[],
    from: number,
    direction: Direction,
  ): TreeNodeRecord | null {
    const count = list.length;
    for (let step = 1; step < count; step++) {
      let index = from + direction * step;
      if (index < 0 || index >= count) {
        if (!this.wrap()) {
          return null;
        }
        index = ((index % count) + count) % count;
      }
      if (!this.isSkipped(list[index])) {
        return list[index];
      }
    }
    return null;
  }

  private edgeOf(
    list: readonly TreeNodeRecord[],
    first: boolean,
  ): TreeNodeRecord | null {
    if (first) {
      return list.find((node) => !this.isSkipped(node)) ?? null;
    }
    for (let index = list.length - 1; index >= 0; index--) {
      if (!this.isSkipped(list[index])) {
        return list[index];
      }
    }
    return null;
  }

  private focusEdge(first: boolean, record = this.currentRecord()): boolean {
    const target = this.edgeOf(this.scopeList(record), first);
    if (target) {
      this.focusKey(target.key);
    }
    return true;
  }

  private firstNavigableChild(node: TreeNodeRecord): TreeNodeRecord | null {
    return node.children.find((child) => !this.isSkipped(child)) ?? null;
  }

  /** Opens a collapsed parent, or steps into the first child of an open one. */
  private open(record: TreeNodeRecord | null): boolean {
    const vertical = this.orientation() === 'vertical';
    if (!record || !record.expandable) {
      // Sideways keys must not scroll a vertical tree, but a sideways bar leaves Down alone.
      return vertical;
    }
    if (!this.isExpanded(record.key)) {
      if (!this.canToggle(record)) {
        return true;
      }
      this.expand(record.key);
      if (this.enterOnExpand()) {
        this.stepIntoOrWait(record);
      }
      return true;
    }
    const child = this.firstNavigableChild(record);
    if (child) {
      this.focusKey(child.key);
    } else if (this.enterOnExpand()) {
      this.pendingEnterKey = record.key;
    }
    return true;
  }

  private stepIntoOrWait(record: TreeNodeRecord): void {
    // Children read from items only exist once they have rendered, so a parent that has none
    // yet is stepped into later, from `resolvePendingEnter`.
    const child = this.firstNavigableChild(
      this.structure().byKey.get(record.key) ?? record,
    );
    if (child) {
      this.focusKey(child.key);
    } else {
      this.pendingEnterKey = record.key;
    }
  }

  /** Closes an open parent, or steps out to the nearest navigable ancestor. */
  private close(record: TreeNodeRecord | null): boolean {
    const vertical = this.orientation() === 'vertical';
    if (!record) {
      return vertical;
    }
    if (
      record.expandable &&
      this.isExpanded(record.key) &&
      this.canToggle(record)
    ) {
      this.collapse(record.key);
      return true;
    }
    let parent = record.parent;
    while (parent && this.isSkipped(parent)) {
      parent = parent.parent;
    }
    if (!parent) {
      return vertical;
    }
    this.focusKey(parent.key);
    if (this.collapseOnLeave() && this.canToggle(parent)) {
      this.collapse(parent.key);
    }
    return true;
  }

  private expandSiblingsOf(record: TreeNodeRecord | null): boolean {
    if (!record) {
      return true;
    }
    const siblings = record.parent?.children ?? this.structure().roots;
    const next = new Set(this.expandedKeys());
    for (const sibling of siblings) {
      if (sibling.expandable && this.canToggle(sibling)) {
        next.add(sibling.key);
      }
    }
    this.commitExpanded(next, true);
    return true;
  }

  private matchTypeahead(
    character: string,
    record: TreeNodeRecord | null,
  ): boolean {
    this.clearTypeaheadTimer();
    this.typeaheadBuffer += character.toLocaleLowerCase();
    this.typeaheadTimer = setTimeout(
      () => this.cancelTypeahead(),
      this.typeaheadDebounce(),
    );

    const list = this.scopeList(record);
    if (list.length === 0) {
      return true;
    }
    const from = this.indexInScope(list, record);
    const buffer = this.typeaheadBuffer;
    const repeated =
      buffer.length > 1 && [...buffer].every((letter) => letter === buffer[0]);

    let target: TreeNodeRecord | null;
    if (repeated) {
      // "aa" is a prefix when some label starts with it, and otherwise the user cycling
      // through the "a" nodes.
      target =
        this.findByPrefix(list, buffer, Math.max(from, 0)) ??
        this.findByPrefix(list, buffer[0], from + 1);
    } else {
      // A single character searches from the *next* node so repeating it cycles; a longer
      // query refines from the current one, which may itself still match.
      target = this.findByPrefix(
        list,
        buffer,
        buffer.length === 1 ? from + 1 : Math.max(from, 0),
      );
    }
    if (target) {
      this.focusKey(target.key);
    }
    return true;
  }

  private findByPrefix(
    list: readonly TreeNodeRecord[],
    prefix: string,
    start: number,
  ): TreeNodeRecord | null {
    for (let step = 0; step < list.length; step++) {
      const node = list[(start + step) % list.length];
      if (
        !this.isSkipped(node) &&
        this.labelOf(node).trimStart().toLocaleLowerCase().startsWith(prefix)
      ) {
        return node;
      }
    }
    return null;
  }

  private labelOf(node: TreeNodeRecord): string {
    return node.label ?? this.itemByKey().get(node.key)?.getLabel() ?? '';
  }

  /** Records the active node and its ancestry, and drops waits that belonged to the old one. */
  private activate(key: AndesTreeNavigationKey): void {
    const ancestry: AndesTreeNavigationKey[] = [];
    for (
      let ancestor = this.structure().byKey.get(key)?.parent ?? null;
      ancestor;
      ancestor = ancestor.parent
    ) {
      ancestry.push(ancestor.key);
    }
    this.activeAncestry = ancestry;
    this.pendingFocusKey = null;
    this.pendingEnterKey = null;
    this._activeKey.set(key);
  }

  private applyFocus(item: AndesTreeNavigationItemRef): void {
    if (!this.isBrowser) {
      return;
    }
    if (this.focusMode() === 'roving-tabindex') {
      item.focus();
    } else {
      item.reveal();
    }
  }

  private currentStore(): WritableSignal<unknown> {
    return this.expandedStore() as WritableSignal<unknown>;
  }

  /**
   * Writes a new expanded set, optionally announcing what changed, and then makes sure the
   * active node is still somewhere a user can be.
   */
  private commitExpanded(
    next: ReadonlySet<AndesTreeNavigationKey>,
    announce: boolean,
  ): void {
    const current = this.expandedKeys();
    const changes: AndesTreeNavigationExpandChange[] = [];
    for (const key of next) {
      if (!current.has(key)) {
        changes.push({ key, expanded: true });
      }
    }
    for (const key of current) {
      if (!next.has(key)) {
        changes.push({ key, expanded: false });
      }
    }
    if (changes.length === 0) {
      return;
    }

    const store = this.currentStore();
    store.set(Array.isArray(untracked(store)) ? [...next] : new Set(next));
    if (announce && !this.destroyed) {
      changes.forEach((change) => this._expandedChange.next(change));
    }
    // Collapsing is synchronous on purpose: the active descendant is still mounted right now,
    // so focus can be handed to the ancestor before the browser would have dropped it.
    this.reconcileActive();
  }

  /**
   * Keeps the active node somewhere reachable. When it has been hidden by a collapse, it moves
   * to the nearest visible ancestor — and takes real focus along if the tree had it. When it
   * has been deleted from a node source, the same applies to its remembered ancestry. When an
   * item-derived node merely disappears, nothing is guessed and the active node is cleared:
   * an unmounted item is not evidence that the node is gone.
   */
  private reconcileActive(): void {
    const active = this._activeKey();
    if (this.destroyed || active === null || this.visibleIndex().has(active)) {
      return;
    }

    const byKey = this.structure().byKey;
    const record = byKey.get(active);
    let target: TreeNodeRecord | null = null;

    if (record) {
      target = record.parent;
      while (
        target &&
        (!this.visibleIndex().has(target.key) || this.isSkipped(target))
      ) {
        target = target.parent;
      }
    } else {
      for (const key of this.activeAncestry) {
        const ancestor = byKey.get(key);
        if (!ancestor || !this.visibleIndex().has(key)) {
          continue;
        }
        // From items, an ancestor only explains the disappearance if it is collapsed.
        if (
          !this.isSkipped(ancestor) &&
          (this.source() !== null || !this.isExpanded(key))
        ) {
          target = ancestor;
        }
        break;
      }
    }

    const hadFocus = this.hadFocus();
    if (!target) {
      this.clearActive();
      return;
    }
    if (hadFocus && this.focusMode() === 'roving-tabindex') {
      this.focusKey(target.key);
    } else {
      this.activate(target.key);
    }
  }

  /** Whether keyboard focus is on this tree right now, or was when its node was removed. */
  private hadFocus(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    const focused = this.document.activeElement as HTMLElement | null;
    return this.focusInside || (!!focused && this.itemByElement().has(focused));
  }

  /** Finishes a step into a parent whose children were not there when the key was pressed. */
  private resolvePendingEnter(): void {
    const key = this.pendingEnterKey;
    if (key === null) {
      return;
    }
    const node = this.structure().byKey.get(key);
    if (!node || this._activeKey() !== key || !this.isExpanded(key)) {
      this.pendingEnterKey = null;
      return;
    }
    const child = this.firstNavigableChild(node);
    if (child) {
      this.pendingEnterKey = null;
      this.focusKey(child.key);
    }
  }
}
