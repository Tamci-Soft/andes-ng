import type { Signal, WritableSignal } from '@angular/core';

/** Identifies a node. Keys are compared with `===`, so `1` and `'1'` are different nodes. */
export type AndesTreeNavigationKey = string | number;

/**
 * Which arrow keys move between nodes.
 *
 * - `vertical` — `ArrowUp`/`ArrowDown` move, `ArrowRight`/`ArrowLeft` (mirrored for RTL) open
 *   and close. The WAI-ARIA TreeView layout; also nested menus and cascading columns.
 * - `horizontal` — `ArrowLeft`/`ArrowRight` (mirrored for RTL) move, `ArrowDown` opens and
 *   `ArrowUp` closes. The menubar layout, where the top level runs sideways and submenus drop
 *   down.
 *
 * The orientation is a property of the whole navigation. A bar whose panels run in the other
 * direction uses one navigation for the bar and one per panel, because each panel is its own
 * keyboard scope anyway.
 */
export type AndesTreeOrientation = 'vertical' | 'horizontal';

/**
 * Which nodes a move key walks over.
 *
 * - `tree` — every visible node, depth first, regardless of level. `Up`/`Down` step across
 *   level boundaries and `Home`/`End` reach the first/last visible node. The TreeView default.
 * - `level` — only the siblings of the active node. `Up`/`Down`, `Home`/`End` and typeahead
 *   stay inside the current group, and only the open/close keys change level. This is how a
 *   cascading column picker or a menu with fly-out submenus behaves: each group is its own
 *   list.
 */
export type AndesTreeNavigationScope = 'tree' | 'level';

/**
 * How the active node is surfaced to assistive technology.
 *
 * - `roving-tabindex` — nodes are genuinely focusable and real DOM focus moves between them;
 *   exactly one node carries `tabindex="0"` and the rest `tabindex="-1"`. Use this when the
 *   tree itself holds focus.
 * - `active-descendant` — real DOM focus stays on one element (a search input, a popup
 *   container) and the active node is communicated through `aria-activedescendant`. Nodes get
 *   no `tabindex`.
 */
export type AndesTreeFocusMode = 'roving-tabindex' | 'active-descendant';

/** Text direction used to mirror the horizontal arrow keys. */
export type AndesTreeTextDirection = 'ltr' | 'rtl';

/**
 * A node as the navigation needs to know it. This is what an {@link AndesTreeNavigationNodeSource}
 * returns, and what items contribute when no source is set.
 */
export interface AndesTreeNavigationNode {
  /** Unique key of the node. */
  readonly key: AndesTreeNavigationKey;
  /**
   * Key of the parent node. `null`, `undefined` and a key that names no known node all make
   * the node a root, so a partially loaded tree degrades to "shown at the top" rather than
   * disappearing.
   */
  readonly parentKey?: AndesTreeNavigationKey | null;
  /** Whether keyboard navigation skips the node (see {@link AndesTreeNavigationConfig.skipDisabled}). */
  readonly disabled?: boolean;
  /**
   * Whether the node can be expanded. Leave it out to derive it from "has known children";
   * set it to `true` for a parent whose children are not loaded or not rendered yet, which is
   * what lets `ArrowRight` open it and trigger the load.
   */
  readonly expandable?: boolean;
  /** Text typeahead matches against. Defaults to the mounted item's own text, else `''`. */
  readonly label?: string;
}

/**
 * Supplies the nodes of the tree in **data order**: siblings in the order they appear, parents
 * identified by `parentKey`. Parents do not have to precede their children, and the nodes do
 * not have to be mounted.
 *
 * This is what makes windowed (virtualized) trees work: rows that are scrolled out of view have
 * no item, but they are still part of the keyboard order. Read signals inside it freely — it is
 * called from a `computed`, so the navigation follows whatever it reads.
 */
export type AndesTreeNavigationNodeSource =
  () => readonly AndesTreeNavigationNode[];

/**
 * A node as the navigation resolved it: the hierarchy facts a tree row needs for its ARIA
 * attributes, independent of whether the node is expanded.
 */
export interface AndesTreeNavigationNodeInfo {
  /** The node's key. */
  readonly key: AndesTreeNavigationKey;
  /** Key of the parent, or `null` for a root. */
  readonly parentKey: AndesTreeNavigationKey | null;
  /** 1 for a root; becomes `aria-level`. */
  readonly level: number;
  /**
   * 1-based position among all siblings; becomes `aria-posinset`. Collapsed and hidden
   * siblings count, as the WAI-ARIA pattern asks.
   */
  readonly posInSet: number;
  /** Number of siblings, the node included; becomes `aria-setsize`. */
  readonly setSize: number;
  /** Whether keyboard navigation skips the node. */
  readonly disabled: boolean;
  /** Whether the node can be expanded: declared explicitly, or because it has known children. */
  readonly expandable: boolean;
}

/** Reported when navigation expands or collapses a node. */
export interface AndesTreeNavigationExpandChange {
  /** The node that changed. */
  readonly key: AndesTreeNavigationKey;
  /** Its new state. */
  readonly expanded: boolean;
}

/**
 * Reported when keyboard navigation lands on a node that has no mounted item, i.e. a row
 * outside a virtual list's rendered window. The consumer scrolls to {@link index}; when the
 * row's item mounts it takes focus (or scrolls itself into view) on its own.
 */
export interface AndesTreeNavigationRevealRequest {
  /** The node navigation moved to. */
  readonly key: AndesTreeNavigationKey;
  /** Its index among the visible nodes. */
  readonly index: number;
}

/**
 * A writable signal the navigation can keep the expanded keys in, so the owner of the state
 * stays the consumer. A `Set` and a plain array are both accepted — whichever shape the signal
 * currently holds is the shape that gets written back.
 */
export type AndesTreeNavigationExpandedSource<
  K extends AndesTreeNavigationKey = AndesTreeNavigationKey,
> = WritableSignal<ReadonlySet<K>> | WritableSignal<readonly K[]>;

/**
 * Options accepted by {@link AndesTreeNavigation.configure}. Every key is optional; an omitted
 * key leaves the current value untouched, so `configure` is safe to call from an `effect` that
 * only knows about some of the options.
 */
export interface AndesTreeNavigationConfig {
  /** Which arrow keys move and which open/close. Default `'vertical'`. */
  orientation?: AndesTreeOrientation;
  /** Which nodes a move walks over. Default `'tree'`. */
  scope?: AndesTreeNavigationScope;
  /**
   * Whether moving past the first/last node wraps around. Default `false`, as in the
   * TreeView pattern. Menus and accordions turn it on.
   */
  wrap?: boolean;
  /** Whether typing characters moves to the next node whose label matches. Default `true`. */
  typeahead?: boolean;
  /** How long a typeahead query stays buffered after the last keystroke. Default `500`ms. */
  typeaheadDebounce?: number;
  /** Whether `Home`/`End` jump to the first/last node. Default `true`. */
  homeAndEnd?: boolean;
  /** Whether `*` expands every sibling of the active node. Default `true`. */
  expandSiblings?: boolean;
  /** How the active node is surfaced. Default `'roving-tabindex'`. */
  focusMode?: AndesTreeFocusMode;
  /** Text direction used to mirror the horizontal arrow keys. Default `'ltr'`. */
  textDirection?: AndesTreeTextDirection;
  /** Whether disabled nodes are skipped while navigating. Default `true`. */
  skipDisabled?: boolean;
  /**
   * Whether the keyboard may expand and collapse a disabled node. Only matters when
   * {@link skipDisabled} is `false` and disabled nodes can therefore hold focus. Default
   * `false`: a disabled node is inert. Trees whose "disabled" nodes are only unselectable, not
   * unopenable, turn this on.
   */
  expandDisabled?: boolean;
  /**
   * Whether the open key, pressed on a collapsed parent, also moves into its first child
   * instead of only opening it. Default `false` (the TreeView pattern: open, stay). Menus and
   * cascading columns turn it on. If the children are not there yet the move happens as soon
   * as they appear.
   */
  enterOnExpand?: boolean;
  /**
   * Whether the close key, pressed on a child, also collapses the parent it steps back to.
   * Default `false` (the TreeView pattern: just move). Menus turn it on, because leaving a
   * submenu closes it.
   */
  collapseOnLeave?: boolean;
  /**
   * Initial or replacement expanded keys. Applies to whichever store is current: the
   * navigation's own, or the one passed to {@link AndesTreeNavigation.bindExpanded}.
   */
  expanded?: Iterable<AndesTreeNavigationKey>;
}

/**
 * The contract an item must satisfy to take part in tree navigation.
 *
 * {@link AndesTreeNavigationItem} implements this; the interface exists so that
 * {@link AndesTreeNavigation} never has to import the item directive (which imports the
 * service), and so consumers can register their own item implementation if they need to.
 */
export interface AndesTreeNavigationItemRef {
  /** Stable DOM `id`, used to wire `aria-activedescendant` in `active-descendant` mode. */
  readonly itemId: string;
  /** The item's host element. */
  readonly element: HTMLElement;
  /** The node's key. */
  readonly itemKey: Signal<AndesTreeNavigationKey>;
  /** The parent's key, `null` for a root. */
  readonly itemParentKey: Signal<AndesTreeNavigationKey | null>;
  /** Whether navigation should skip the item. */
  readonly isDisabled: Signal<boolean>;
  /** Explicit expandability; `undefined` means "derive it from the children". */
  readonly isExpandable: Signal<boolean | undefined>;
  /** Text matched against by typeahead. */
  getLabel(): string;
  /** Moves real DOM focus to the item. Only called in `roving-tabindex` mode. */
  focus(): void;
  /** Brings the item into view without moving focus. Only called in `active-descendant` mode. */
  reveal(): void;
}
