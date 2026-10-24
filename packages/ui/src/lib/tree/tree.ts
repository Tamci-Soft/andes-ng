import { Directionality } from '@angular/cdk/bidi';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { filter, isObservable, lastValueFrom, take } from 'rxjs';

import { AndesTreeNodeTemplate } from './tree-node-template';
import type {
  AndesFlatTreeNode,
  AndesTreeAllowDrop,
  AndesTreeCheckEvent,
  AndesTreeDropEvent,
  AndesTreeDropInfo,
  AndesTreeDropPosition,
  AndesTreeEntry,
  AndesTreeExpandEvent,
  AndesTreeFieldNames,
  AndesTreeKey,
  AndesTreeLabels,
  AndesTreeLoadData,
  AndesTreeLoadErrorEvent,
  AndesTreeLoadEvent,
  AndesTreeNode,
  AndesTreeNodeContext,
  AndesTreeNodeEvent,
  AndesTreeScrollOptions,
  AndesTreeSelectEvent,
  AndesTreeTextSegment,
} from './tree-types';
import {
  andesConductCheck,
  andesCreateTreeIndex,
  andesFilterTree,
  andesFlattenEntries,
  andesGetExpandableKeys,
  andesGetTreeAncestors,
  andesHighlightSegments,
  andesIsTreeDescendantOrSelf,
  andesMoveTreeNode,
  andesToggleCheck,
} from './tree-utils';

export type AndesTreeDensity = 'default' | 'compact';
export type AndesTreeExpandAction = 'click' | 'doubleClick' | false;
export type AndesTreeFilterMode = 'filter' | 'highlight';

const DEFAULT_LABELS: AndesTreeLabels = {
  empty: 'No data',
  loading: 'Loading',
  results: (count) => (count === 1 ? '1 result' : `${count} results`),
  moved: (title, position, target) =>
    `${title} moved ${position === 'inside' ? 'into' : position} ${target}`,
};

/** How long a dragged node must hover a closed parent before it opens. */
const DRAG_EXPAND_DELAY_MS = 600;
/** How long typed characters keep building one type-ahead search. */
const TYPEAHEAD_RESET_MS = 500;

let nextTreeId = 0;

function draggableAttribute(
  value: boolean | string | ((node: AndesTreeNode) => boolean),
): boolean | ((node: AndesTreeNode) => boolean) {
  return typeof value === 'function' ? value : booleanAttribute(value);
}

/**
 * A tree view: a hierarchy of nodes that expand and collapse, can be selected, checked,
 * filtered, loaded on demand and reordered by dragging.
 *
 * ```html
 * <andes-tree
 *   [nodes]="nodes"
 *   checkable
 *   [(expandedKeys)]="expanded"
 *   [(checkedKeys)]="checked"
 *   aria-label="Warehouses"
 * />
 * ```
 *
 * ## Data
 *
 * `nodes` is a plain array of {@link AndesTreeNode} objects (`key`, `title`, `children`, and the
 * optional `icon`, `disabled`, `selectable`, `checkable`, `disableCheckbox` and `isLeaf`). Data
 * with other property names is read through `fieldNames`. A custom `andesTreeNode` template draws
 * the node content instead of the title.
 *
 * ## State
 *
 * `expandedKeys`, `selectedKeys`, `checkedKeys` and `loadedKeys` are two-way models. Checking
 * cascades by default: a parent is checked when all its children are and half-checked when some
 * are; `checkStrictly` makes every node independent. `checkedKeys` holds the fully checked nodes
 * (parents included); `halfCheckedKeys()` the partly checked parents.
 *
 * ## Keyboard
 *
 * The tree follows the WAI-ARIA treeview pattern with a roving tabindex: arrow keys move
 * between the visible nodes, Right / Left open, close or step to the child / parent, Home / End
 * jump to the ends, Enter selects (or toggles a node that cannot be selected), Space checks or
 * selects, `*` opens every sibling and typing jumps to the next matching title. With dragging
 * on, Alt + arrow keys move the focused node: Up / Down past a sibling, Right into the sibling
 * above it, Left out to its parent's level.
 *
 * ## Large trees
 *
 * `virtualScroll` renders only the rows in view (the tree then needs a `height`); every row still
 * reports its level, position and set size so assistive technology sees the whole tree.
 */
@Component({
  selector: 'andes-tree',
  imports: [
    NgTemplateOutlet,
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
  ],
  templateUrl: './tree.html',
  styleUrl: './tree.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'tree',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
  },
})
export class AndesTree {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly directionality = inject(Directionality);

  private readonly treeId = `andes-tree-${nextTreeId++}`;

  /** The nodes. A two-way model so a drop (or a keyboard move) can reorder them in place. */
  readonly nodes = model<AndesTreeNode[]>([]);
  /** Renames the properties read from each node. */
  readonly fieldNames = input<AndesTreeFieldNames | undefined>(undefined);

  readonly expandedKeys = model<AndesTreeKey[]>([]);
  readonly selectedKeys = model<AndesTreeKey[]>([]);
  /** Fully checked nodes. Parents are included when everything below them is checked. */
  readonly checkedKeys = model<AndesTreeKey[]>([]);
  /** Nodes whose children have been loaded (or that `loadData` has been called for). */
  readonly loadedKeys = model<AndesTreeKey[]>([]);

  /** Open every node that has children, once, when the first nodes arrive. */
  readonly defaultExpandAll = input(false, { transform: booleanAttribute });

  /** Select several nodes: a click toggles, Shift + click selects a range. */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** `false` turns selection off (a checkable tree often wants that). */
  readonly selectable = input(true, { transform: booleanAttribute });
  /** Whether clicking the selected node again clears the selection. */
  readonly deselectable = input(true, { transform: booleanAttribute });

  readonly checkable = input(false, { transform: booleanAttribute });
  /** Checking a node affects only that node, not its parents or children. */
  readonly checkStrictly = input(false, { transform: booleanAttribute });

  /** Connector lines between parents and children, and a boxed +/- switcher. */
  readonly showLine = input(false, { transform: booleanAttribute });
  /** Show node icons, with a folder or file when a node has none of its own. */
  readonly showIcon = input(false, { transform: booleanAttribute });
  /** File-browser look: icons, full-width rows, a solid selected row, a click opens folders. */
  readonly directory = input(false, { transform: booleanAttribute });
  /** Rows (and their hover and selected background) span the full width. */
  readonly blockNode = input(false, { transform: booleanAttribute });
  readonly density = input<AndesTreeDensity>('default');
  /** What toggles a parent besides its switcher. Directory trees default to `'click'`. */
  readonly expandAction = input<AndesTreeExpandAction | undefined>(undefined);

  /** Lets nodes be dragged to reorder or re-parent them. A function picks which nodes. */
  readonly draggable = input<
    boolean | ((node: AndesTreeNode) => boolean),
    boolean | string | ((node: AndesTreeNode) => boolean)
  >(false, {
    transform: draggableAttribute,
  });
  /** Veto a drop; the default allows every drop that is not into the node's own subtree. */
  readonly allowDrop = input<AndesTreeAllowDrop | undefined>(undefined);

  /** Loads the children of a node that has not got any yet, the first time it opens. */
  readonly loadData = input<AndesTreeLoadData | undefined>(undefined);
  /** Shows the loading state in place of the nodes (for the initial fetch). */
  readonly loading = input(false, { transform: booleanAttribute });

  /** Text to filter by, ignoring case and accents. */
  readonly filter = input('');
  /** Replaces the default title match. */
  readonly filterFn = input<
    ((node: AndesTreeNode, query: string) => boolean) | undefined
  >(undefined);
  /** `'filter'` hides non-matching branches; `'highlight'` keeps every node and only marks. */
  readonly filterMode = input<AndesTreeFilterMode>('filter');
  readonly highlightMatches = input(true, { transform: booleanAttribute });
  /** Open the ancestors of the matches when the filter changes. */
  readonly expandOnFilter = input(true, { transform: booleanAttribute });

  /** Render only the visible rows. Needs a `height`. */
  readonly virtualScroll = input(false, { transform: booleanAttribute });
  /** Height of the scrolling area when `virtualScroll` is on (a number is px). */
  readonly height = input<number | string>(320);

  readonly nodeTemplate = input<TemplateRef<AndesTreeNodeContext> | undefined>(
    undefined,
  );
  readonly iconTemplate = input<TemplateRef<AndesTreeNodeContext> | undefined>(
    undefined,
  );
  readonly labels = input<Partial<AndesTreeLabels>>({});

  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  /** A node was clicked (before selection and expansion react). */
  readonly nodeClick = output<AndesTreeNodeEvent>();
  readonly nodeDoubleClick = output<AndesTreeNodeEvent>();
  readonly nodeContextMenu = output<AndesTreeNodeEvent>();
  /** A node opened or closed. */
  readonly nodeExpand = output<AndesTreeExpandEvent>();
  /** A node was selected or deselected by the user. */
  readonly nodeSelect = output<AndesTreeSelectEvent>();
  /** A node was checked or unchecked by the user. */
  readonly nodeCheck = output<AndesTreeCheckEvent>();
  /** A node's children finished loading. */
  readonly nodeLoaded = output<AndesTreeLoadEvent>();
  readonly nodeLoadError = output<AndesTreeLoadErrorEvent>();
  readonly nodeDragStart = output<AndesTreeNodeEvent>();
  readonly nodeDragEnd = output<AndesTreeNodeEvent>();
  /** A node was moved. The `nodes` model already holds the result. */
  readonly nodeDrop = output<AndesTreeDropEvent>();

  protected readonly nodeTemplateDirective = contentChild(
    AndesTreeNodeTemplate,
  );
  private readonly viewport = viewChild(CdkVirtualScrollViewport);

  private readonly activeKey = signal<AndesTreeKey | null>(null);
  private readonly loadingKeys = signal<ReadonlySet<AndesTreeKey>>(new Set());
  protected readonly announcement = signal('');
  protected readonly dragKey = signal<AndesTreeKey | null>(null);
  protected readonly dropIndicator = signal<{
    key: AndesTreeKey;
    position: AndesTreeDropPosition;
    level: number;
  } | null>(null);
  /** Branches whose next open or close should animate (the ones just toggled). */
  protected readonly animateKeys = signal<ReadonlySet<AndesTreeKey>>(new Set());

  private selectionAnchor: AndesTreeKey | null = null;
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  private dragExpandTimer: ReturnType<typeof setTimeout> | null = null;
  private expandAllApplied = false;
  private readonly itemIds = new Map<AndesTreeKey, string>();
  private readonly itemKeys = new Map<string, AndesTreeKey>();

  protected readonly index = computed(() =>
    andesCreateTreeIndex(this.nodes(), this.fieldNames()),
  );
  protected readonly text = computed<AndesTreeLabels>(() => ({
    ...DEFAULT_LABELS,
    ...this.labels(),
  }));
  protected readonly query = computed(() => this.filter().trim());
  private readonly filterResult = computed(() => {
    const query = this.query();
    if (!query) {
      return null;
    }
    const matcher = this.filterFn();
    return andesFilterTree(
      this.index(),
      query,
      matcher ? (entry, text) => matcher(entry.node, text) : undefined,
    );
  });
  private readonly include = computed(() => {
    const result = this.filterResult();
    return result && this.filterMode() === 'filter'
      ? (entry: AndesTreeEntry) => result.visible.has(entry.key)
      : undefined;
  });
  private readonly segments = computed(() => {
    const result = this.filterResult();
    const map = new Map<AndesTreeKey, AndesTreeTextSegment[]>();
    if (result && this.highlightMatches()) {
      const query = this.query();
      for (const key of result.matched) {
        const entry = this.index().byKey.get(key);
        if (entry) {
          map.set(key, andesHighlightSegments(entry.title, query));
        }
      }
    }
    return map;
  });

  /** Every row of the (filtered) tree, depth first, collapsed branches included. */
  protected readonly allRows = computed(() =>
    andesFlattenEntries(this.index().roots, { include: this.include() }),
  );
  private readonly childRowsByParent = computed(() => {
    const map = new Map<AndesTreeKey | null, AndesFlatTreeNode[]>();
    for (const row of this.allRows()) {
      const siblings = map.get(row.parentKey);
      if (siblings) {
        siblings.push(row);
      } else {
        map.set(row.parentKey, [row]);
      }
    }
    return map;
  });
  protected readonly rootRows = computed(
    () => this.childRowsByParent().get(null) ?? [],
  );

  protected readonly expandedSet = computed(
    () => new Set<AndesTreeKey>(this.expandedKeys()),
  );
  protected readonly selectedSet = computed(
    () => new Set<AndesTreeKey>(this.selectedKeys()),
  );
  private readonly loadedSet = computed(
    () => new Set<AndesTreeKey>(this.loadedKeys()),
  );
  private readonly checkState = computed(() =>
    andesConductCheck(this.checkedKeys(), this.index(), this.checkStrictly()),
  );

  /** The partly checked parents (cascading mode). */
  readonly halfCheckedKeys = computed(() => {
    const half = this.checkState().halfChecked;
    return this.index().order.filter((key) => half.has(key));
  });

  /** Branches rendered at least once: they stay in the DOM so closing can animate. */
  protected readonly everExpanded = linkedSignal<
    ReadonlySet<AndesTreeKey>,
    ReadonlySet<AndesTreeKey>
  >({
    source: this.expandedSet,
    computation: (current, previous) => {
      if (!previous) {
        return current;
      }
      let merged: Set<AndesTreeKey> | null = null;
      for (const key of current) {
        if (!previous.value.has(key)) {
          merged ??= new Set(previous.value);
          merged.add(key);
        }
      }
      return merged ?? previous.value;
    },
  });

  /** The rows a user can reach: those whose ancestors are all open. */
  protected readonly visibleRows = computed(() => {
    const expanded = this.expandedSet();
    const shown = new Set<AndesTreeKey>();
    const rows: AndesFlatTreeNode[] = [];
    for (const row of this.allRows()) {
      if (
        row.parentKey === null ||
        (shown.has(row.parentKey) && expanded.has(row.parentKey))
      ) {
        rows.push(row);
        shown.add(row.key);
      }
    }
    return rows;
  });
  private readonly visibleIndex = computed(() => {
    const map = new Map<AndesTreeKey, number>();
    this.visibleRows().forEach((row, i) => map.set(row.key, i));
    return map;
  });
  protected readonly hasRows = computed(() => this.allRows().length > 0);

  /** The one row in the tab order: the focused one, else the selected one, else the first. */
  protected readonly tabbableKey = computed<AndesTreeKey | null>(() => {
    const rows = this.visibleRows();
    if (rows.length === 0) {
      return null;
    }
    const active = this.activeKey();
    if (active !== null && this.visibleIndex().has(active)) {
      return active;
    }
    const selected = this.selectedSet();
    return (rows.find((row) => selected.has(row.key)) ?? rows[0]).key;
  });

  protected readonly effectiveExpandAction = computed(
    () => this.expandAction() ?? (this.directory() ? 'click' : false),
  );
  protected readonly iconsShown = computed(
    () => this.showIcon() || this.directory(),
  );
  protected readonly rowHeight = computed(() =>
    this.density() === 'compact' ? 24 : 28,
  );
  protected readonly viewportHeight = computed(() => {
    const height = this.height();
    return typeof height === 'number' ? `${height}px` : height;
  });
  protected readonly customNodeTemplate = computed(
    () => this.nodeTemplate() ?? this.nodeTemplateDirective()?.template,
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearTypeahead();
      this.clearDragExpand();
    });

    effect(() => {
      const nodes = this.nodes();
      if (this.expandAllApplied || nodes.length === 0) {
        return;
      }
      this.expandAllApplied = true;
      if (this.defaultExpandAll()) {
        untracked(() => this.expandAll());
      }
    });

    effect(() => {
      const result = this.filterResult();
      if (!result || !this.expandOnFilter()) {
        return;
      }
      untracked(() => {
        const current = this.expandedKeys();
        const missing = [...result.expand].filter(
          (key) => !current.includes(key),
        );
        if (missing.length > 0) {
          this.expandedKeys.set([...current, ...missing]);
        }
      });
    });

    effect(() => {
      const result = this.filterResult();
      if (result) {
        const count = result.matched.size;
        untracked(() => this.announcement.set(this.text().results(count)));
      }
    });
  }

  /* ---------------------------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------------------------- */

  /** Opens every node that has children. */
  expandAll(): void {
    const keys = andesGetExpandableKeys(this.index());
    this.markAnimated(keys);
    this.expandedKeys.set(keys);
  }

  collapseAll(): void {
    this.markAnimated(this.expandedKeys());
    this.expandedKeys.set([]);
  }

  /** Opens the given nodes (and keeps the ones already open). */
  expandKeys(keys: readonly AndesTreeKey[]): void {
    const current = this.expandedKeys();
    const missing = keys.filter((key) => !current.includes(key));
    if (missing.length > 0) {
      this.markAnimated(missing);
      this.expandedKeys.set([...current, ...missing]);
    }
  }

  collapseKeys(keys: readonly AndesTreeKey[]): void {
    this.markAnimated(keys);
    const remove = new Set(keys);
    this.expandedKeys.set(
      this.expandedKeys().filter((key) => !remove.has(key)),
    );
  }

  /** Opens a closed node or closes an open one, loading its children when needed. */
  toggleExpanded(key: AndesTreeKey): void {
    const row = this.allRows().find((candidate) => candidate.key === key);
    if (row) {
      this.toggleExpand(row);
    }
  }

  /** Checks every checkable node (or clears them all). */
  setAllChecked(checked: boolean): void {
    const index = this.index();
    if (!checked) {
      this.checkedKeys.set([]);
      return;
    }
    const keys = index.order.filter((key) => {
      const entry = index.byKey.get(key) as AndesTreeEntry;
      return entry.checkable && !entry.disableCheckbox;
    });
    const state = andesConductCheck(keys, index, this.checkStrictly());
    this.checkedKeys.set(index.order.filter((key) => state.checked.has(key)));
  }

  /** The node object for a key. */
  getNode(key: AndesTreeKey): AndesTreeNode | undefined {
    return this.index().byKey.get(key)?.node;
  }

  /** Moves focus to a node, opening its ancestors and scrolling it into view if needed. */
  focusKey(key: AndesTreeKey): void {
    this.scrollToKey(key, { focus: true });
  }

  /**
   * Scrolls a node into view. By default it opens the node's collapsed ancestors first; in a
   * virtual tree it scrolls the viewport to the row's offset.
   */
  scrollToKey(
    key: AndesTreeKey,
    options: AndesTreeScrollOptions = {},
  ): boolean {
    const entry = this.index().byKey.get(key);
    if (!entry) {
      return false;
    }
    const {
      align = 'nearest',
      behavior = 'auto',
      expand = true,
      focus = false,
    } = options;

    const closed: AndesTreeKey[] = [];
    for (let parent = entry.parent; parent; parent = parent.parent) {
      if (!this.expandedSet().has(parent.key)) {
        closed.unshift(parent.key);
      }
    }
    if (closed.length > 0) {
      if (!expand) {
        return false;
      }
      this.expandKeys(closed);
    }

    const reveal = () => {
      const position = this.visibleIndex().get(key);
      if (position === undefined) {
        return;
      }
      const viewport = this.viewport();
      if (this.virtualScroll() && viewport) {
        const size = this.rowHeight();
        const viewportSize = viewport.getViewportSize();
        const current = viewport.measureScrollOffset();
        const start = position * size;
        const end = start - viewportSize + size;
        let target: number | null;
        switch (align) {
          case 'start':
            target = start;
            break;
          case 'end':
            target = end;
            break;
          case 'center':
            target = start - (viewportSize - size) / 2;
            break;
          default:
            target = start < current ? start : end > current ? end : null;
        }
        if (target !== null) {
          viewport.scrollToOffset(Math.max(0, target), behavior);
        }
      } else if (!focus) {
        this.itemElement(key)?.scrollIntoView?.({
          block: align === 'nearest' ? 'nearest' : align,
          behavior,
        });
      }
      if (focus) {
        this.activeKey.set(key);
        const focusIt = () =>
          this.itemElement(key)?.focus({ preventScroll: false });
        if (this.itemElement(key)) {
          focusIt();
        } else if (viewport && this.virtualScroll()) {
          // A virtual row only exists once the scroll has rendered it, which happens after the
          // browser reports the scroll - wait for the row to enter the rendered range.
          viewport.renderedRangeStream
            .pipe(
              filter(
                (range) => position >= range.start && position < range.end,
              ),
              take(1),
              takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() =>
              afterNextRender(focusIt, { injector: this.injector }),
            );
        } else {
          afterNextRender(focusIt, { injector: this.injector });
        }
      }
    };

    if (closed.length > 0) {
      afterNextRender(reveal, { injector: this.injector });
    } else {
      reveal();
    }
    return true;
  }

  /* ---------------------------------------------------------------------------------------
   * Row state (used by the template)
   * ------------------------------------------------------------------------------------- */

  protected itemId(key: AndesTreeKey): string {
    let id = this.itemIds.get(key);
    if (!id) {
      id = `${this.treeId}-n${this.itemIds.size}`;
      this.itemIds.set(key, id);
      this.itemKeys.set(id, key);
    }
    return id;
  }

  protected titleId(key: AndesTreeKey): string {
    return `${this.itemId(key)}-t`;
  }

  protected childRows(key: AndesTreeKey): readonly AndesFlatTreeNode[] {
    return this.childRowsByParent().get(key) ?? [];
  }

  protected isLeaf(row: AndesFlatTreeNode): boolean {
    const entry = row.entry;
    if (entry.isLeafFlag !== undefined) {
      return entry.isLeafFlag;
    }
    if (row.hasChildren || entry.children.length > 0) {
      return false;
    }
    return !this.needsLoad(entry);
  }

  private needsLoad(entry: AndesTreeEntry): boolean {
    return (
      !!this.loadData() &&
      entry.isLeafFlag !== true &&
      !entry.hasChildrenField &&
      !this.loadedSet().has(entry.key)
    );
  }

  protected isExpanded(key: AndesTreeKey): boolean {
    return this.expandedSet().has(key);
  }

  protected isSelected(key: AndesTreeKey): boolean {
    return this.selectedSet().has(key);
  }

  protected isLoading(key: AndesTreeKey): boolean {
    return this.loadingKeys().has(key);
  }

  protected canSelect(row: AndesFlatTreeNode): boolean {
    return this.selectable() && row.entry.selectable;
  }

  protected showCheckbox(row: AndesFlatTreeNode): boolean {
    return this.checkable() && row.entry.checkable;
  }

  protected isChecked(key: AndesTreeKey): boolean {
    return this.checkState().checked.has(key);
  }

  protected isIndeterminate(key: AndesTreeKey): boolean {
    return this.checkState().halfChecked.has(key);
  }

  protected checkedAria(key: AndesTreeKey): 'true' | 'false' | 'mixed' {
    if (this.isChecked(key)) {
      return 'true';
    }
    return this.isIndeterminate(key) ? 'mixed' : 'false';
  }

  protected isDraggable(row: AndesFlatTreeNode): boolean {
    const draggable = this.draggable();
    if (!draggable || row.entry.disabled) {
      return false;
    }
    return typeof draggable === 'function' ? draggable(row.node) : true;
  }

  protected rowSegments(row: AndesFlatTreeNode): AndesTreeTextSegment[] {
    return this.segments().get(row.key) ?? [{ text: row.title, match: false }];
  }

  protected isMatch(key: AndesTreeKey): boolean {
    return this.segments().has(key);
  }

  protected nodeContext(row: AndesFlatTreeNode): AndesTreeNodeContext {
    const key = row.key;
    return {
      $implicit: row.node,
      node: row.node,
      key,
      title: row.title,
      level: row.level,
      expanded: this.isExpanded(key),
      selected: this.isSelected(key),
      checked: this.isChecked(key),
      indeterminate: this.isIndeterminate(key),
      loading: this.isLoading(key),
      disabled: row.entry.disabled,
      isLeaf: this.isLeaf(row),
      query: this.query(),
      segments: this.rowSegments(row),
    };
  }

  protected iconTemplateFor(
    row: AndesFlatTreeNode,
  ): TemplateRef<AndesTreeNodeContext> | null {
    const own = row.node.icon;
    if (own instanceof TemplateRef) {
      return own;
    }
    return this.iconTemplate() ?? null;
  }

  protected iconGlyph(row: AndesFlatTreeNode): string | null {
    const own = row.node.icon;
    return typeof own === 'string' && own ? own : null;
  }

  protected readonly trackRow = (_: number, row: AndesFlatTreeNode) => row.key;

  /* ---------------------------------------------------------------------------------------
   * Pointer interaction
   * ------------------------------------------------------------------------------------- */

  protected onRowClick(event: MouseEvent, row: AndesFlatTreeNode): void {
    this.activeKey.set(row.key);
    this.nodeClick.emit({ node: row.node, key: row.key, event });
    this.selectRow(row, event);
    if (this.effectiveExpandAction() === 'click' && !this.isLeaf(row)) {
      this.toggleExpand(row);
    }
  }

  protected onRowDoubleClick(event: MouseEvent, row: AndesFlatTreeNode): void {
    this.nodeDoubleClick.emit({ node: row.node, key: row.key, event });
    if (this.effectiveExpandAction() === 'doubleClick' && !this.isLeaf(row)) {
      this.toggleExpand(row);
    }
  }

  protected onRowContextMenu(event: MouseEvent, row: AndesFlatTreeNode): void {
    this.nodeContextMenu.emit({ node: row.node, key: row.key, event });
  }

  protected onSwitcherClick(event: MouseEvent, row: AndesFlatTreeNode): void {
    event.stopPropagation();
    this.activeKey.set(row.key);
    if (!this.isLeaf(row)) {
      this.toggleExpand(row);
    }
  }

  protected onCheckboxClick(event: MouseEvent, row: AndesFlatTreeNode): void {
    event.stopPropagation();
    this.activeKey.set(row.key);
    this.toggleCheck(row);
  }

  /* ---------------------------------------------------------------------------------------
   * State changes
   * ------------------------------------------------------------------------------------- */

  /** Lets the branches just toggled animate; branches the consumer opens by data do not. */
  private markAnimated(keys: readonly AndesTreeKey[]): void {
    if (keys.length > 0) {
      this.animateKeys.update((set) => new Set([...set, ...keys]));
    }
  }

  protected onCollapseAnimationEnd(event: Event, key: AndesTreeKey): void {
    if (event.target !== event.currentTarget) {
      return;
    }
    this.animateKeys.update((set) => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }

  private toggleExpand(row: AndesFlatTreeNode): void {
    const key = row.key;
    const expanding = !this.expandedSet().has(key);
    this.markAnimated([key]);
    if (expanding) {
      this.expandedKeys.set([...this.expandedKeys(), key]);
      if (this.needsLoad(row.entry)) {
        this.load(row);
      }
    } else {
      this.keepFocusOnCollapse(row);
      this.expandedKeys.set(this.expandedKeys().filter((k) => k !== key));
    }
    this.nodeExpand.emit({
      node: row.node,
      key,
      expanded: expanding,
      expandedKeys: this.expandedKeys(),
    });
  }

  /** Closing a branch that holds focus would drop it on the page; park it on the branch. */
  private keepFocusOnCollapse(row: AndesFlatTreeNode): void {
    const host = this.host.nativeElement;
    const active = host.ownerDocument.activeElement;
    const item = this.itemElement(row.key);
    if (item && active && active !== item && item.contains(active)) {
      this.activeKey.set(row.key);
      item.focus();
    }
  }

  private load(row: AndesFlatTreeNode): void {
    const loadData = this.loadData();
    if (!loadData) {
      return;
    }
    const key = row.key;
    this.loadingKeys.update((set) => new Set(set).add(key));
    const settle = () =>
      this.loadingKeys.update((set) => {
        const next = new Set(set);
        next.delete(key);
        return next;
      });

    let pending: Promise<unknown>;
    try {
      const result = loadData(row.node);
      pending = isObservable(result)
        ? lastValueFrom(result, { defaultValue: undefined })
        : Promise.resolve(result);
    } catch (error) {
      pending = Promise.reject(error);
    }

    pending.then(
      () => {
        settle();
        if (!this.loadedKeys().includes(key)) {
          this.loadedKeys.set([...this.loadedKeys(), key]);
        }
        this.nodeLoaded.emit({ node: row.node, key });
      },
      (error: unknown) => {
        settle();
        this.expandedKeys.set(this.expandedKeys().filter((k) => k !== key));
        this.nodeLoadError.emit({ node: row.node, key, error });
      },
    );
  }

  private selectRow(
    row: AndesFlatTreeNode,
    event?: Pick<MouseEvent, 'shiftKey'>,
  ): void {
    if (!this.canSelect(row)) {
      return;
    }
    const key = row.key;
    const current = this.selectedKeys();
    let next: AndesTreeKey[];
    let selected: boolean;

    if (this.multiple()) {
      const anchor = this.selectionAnchor;
      const visible = this.visibleIndex();
      if (event?.shiftKey && anchor !== null && visible.has(anchor)) {
        const from = visible.get(anchor) as number;
        const to = visible.get(key) as number;
        const range = this.visibleRows()
          .slice(Math.min(from, to), Math.max(from, to) + 1)
          .filter((candidate) => this.canSelect(candidate))
          .map((candidate) => candidate.key);
        next = [...new Set([...current, ...range])];
        selected = true;
      } else {
        selected = !this.selectedSet().has(key);
        next = selected ? [...current, key] : current.filter((k) => k !== key);
        this.selectionAnchor = key;
      }
    } else if (this.selectedSet().has(key)) {
      if (!this.deselectable()) {
        return;
      }
      selected = false;
      next = [];
    } else {
      selected = true;
      next = [key];
      this.selectionAnchor = key;
    }

    this.selectedKeys.set(next);
    const index = this.index();
    this.nodeSelect.emit({
      node: row.node,
      key,
      selected,
      selectedKeys: next,
      selectedNodes: next
        .map((k) => index.byKey.get(k)?.node)
        .filter((node): node is AndesTreeNode => !!node),
    });
  }

  private toggleCheck(row: AndesFlatTreeNode): void {
    const entry = row.entry;
    if (!this.checkable() || !entry.checkable || entry.disableCheckbox) {
      return;
    }
    const index = this.index();
    const checked = !this.checkState().checked.has(row.key);
    const state = andesToggleCheck(
      this.checkState().checked,
      index,
      row.key,
      checked,
      this.checkStrictly(),
    );
    const keys = index.order.filter((key) => state.checked.has(key));
    this.checkedKeys.set(keys);
    this.nodeCheck.emit({
      node: row.node,
      key: row.key,
      checked,
      checkedKeys: keys,
      halfCheckedKeys: index.order.filter((key) => state.halfChecked.has(key)),
      checkedNodes: keys
        .map((key) => index.byKey.get(key)?.node)
        .filter((node): node is AndesTreeNode => !!node),
    });
  }

  /* ---------------------------------------------------------------------------------------
   * Keyboard
   * ------------------------------------------------------------------------------------- */

  protected onFocusin(event: FocusEvent): void {
    const item = this.closestItem(event.target);
    const key = item ? this.itemKeys.get(item.id) : undefined;
    if (key !== undefined) {
      this.activeKey.set(key);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const item = this.closestItem(event.target);
    // Keys typed into something inside a node (an input in a custom template) are its own.
    if (!item || item !== event.target || event.defaultPrevented) {
      return;
    }
    const key = this.itemKeys.get(item.id);
    const position =
      key === undefined ? undefined : this.visibleIndex().get(key);
    if (key === undefined || position === undefined) {
      return;
    }
    const rows = this.visibleRows();
    const row = rows[position];
    const rtl = this.directionality.value === 'rtl';

    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      const direction = this.moveDirection(event.key, rtl);
      if (direction && this.draggable()) {
        event.preventDefault();
        this.moveWithKeyboard(row, direction);
      }
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      return;
    }

    const open = rtl ? 'ArrowLeft' : 'ArrowRight';
    const close = rtl ? 'ArrowRight' : 'ArrowLeft';
    const expandable = !this.isLeaf(row);
    const expanded = this.isExpanded(key);

    switch (event.key) {
      case 'ArrowDown':
        this.focusRow(rows[position + 1]);
        break;
      case 'ArrowUp':
        this.focusRow(rows[position - 1]);
        break;
      case open:
        if (expandable && !expanded) {
          this.toggleExpand(row);
        } else if (expandable && rows[position + 1]?.parentKey === key) {
          this.focusRow(rows[position + 1]);
        }
        break;
      case close:
        if (expandable && expanded) {
          this.toggleExpand(row);
        } else if (row.parentKey !== null) {
          const parent = this.visibleIndex().get(row.parentKey);
          if (parent !== undefined) {
            this.focusRow(rows[parent]);
          }
        }
        break;
      case 'Home':
        this.focusRow(rows[0]);
        break;
      case 'End':
        this.focusRow(rows[rows.length - 1]);
        break;
      case 'Enter':
        if (this.canSelect(row)) {
          this.selectRow(row, event);
        } else if (this.showCheckbox(row)) {
          this.toggleCheck(row);
        } else if (expandable) {
          this.toggleExpand(row);
        }
        break;
      case ' ':
        if (this.showCheckbox(row)) {
          this.toggleCheck(row);
        } else {
          this.selectRow(row, event);
        }
        break;
      case '*':
        this.expandSiblings(row);
        break;
      default:
        if (event.key.length === 1 && !event.altKey) {
          this.runTypeahead(event.key, position);
          // A space mid-search belongs to the search, not to the selection.
          break;
        }
        return;
    }
    event.preventDefault();
  }

  private moveDirection(key: string, rtl: boolean) {
    switch (key) {
      case 'ArrowUp':
        return 'up';
      case 'ArrowDown':
        return 'down';
      case 'ArrowRight':
        return rtl ? 'outdent' : 'indent';
      case 'ArrowLeft':
        return rtl ? 'indent' : 'outdent';
      default:
        return null;
    }
  }

  private expandSiblings(row: AndesFlatTreeNode): void {
    const siblings = this.childRowsByParent().get(row.parentKey) ?? [];
    this.expandKeys(
      siblings.filter((sibling) => !this.isLeaf(sibling)).map((s) => s.key),
    );
  }

  private runTypeahead(character: string, from: number): void {
    this.clearTypeahead();
    this.typeahead += character.toLocaleLowerCase();
    this.typeaheadTimer = setTimeout(
      () => (this.typeahead = ''),
      TYPEAHEAD_RESET_MS,
    );
    const rows = this.visibleRows();
    const start = this.typeahead.length === 1 ? from + 1 : from;
    for (let step = 0; step < rows.length; step++) {
      const row = rows[(start + step) % rows.length];
      if (row.title.toLocaleLowerCase().startsWith(this.typeahead)) {
        this.focusRow(row);
        return;
      }
    }
  }

  private clearTypeahead(): void {
    if (this.typeaheadTimer !== null) {
      clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = null;
    }
  }

  private focusRow(row: AndesFlatTreeNode | undefined): void {
    if (!row) {
      return;
    }
    this.activeKey.set(row.key);
    const element = this.itemElement(row.key);
    if (element) {
      element.focus();
      return;
    }
    // A row outside the rendered window of a virtual tree.
    this.scrollToKey(row.key, { focus: true });
  }

  private closestItem(target: EventTarget | null): HTMLElement | null {
    const item = (target as HTMLElement | null)?.closest?.<HTMLElement>(
      '[role="treeitem"]',
    );
    return item &&
      this.itemKeys.has(item.id) &&
      this.host.nativeElement.contains(item)
      ? item
      : null;
  }

  private itemElement(key: AndesTreeKey): HTMLElement | null {
    const id = this.itemIds.get(key);
    return id
      ? this.host.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`)
      : null;
  }

  /* ---------------------------------------------------------------------------------------
   * Drag and drop
   * ------------------------------------------------------------------------------------- */

  protected onDragStart(event: DragEvent, row: AndesFlatTreeNode): void {
    if (!this.isDraggable(row)) {
      event.preventDefault();
      return;
    }
    this.dragKey.set(row.key);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Some browsers refuse to start a drag without data.
      event.dataTransfer.setData('text/plain', row.title);
    }
    this.nodeDragStart.emit({ node: row.node, key: row.key, event });
  }

  protected onDragOver(event: DragEvent, row: AndesFlatTreeNode): void {
    const dragKey = this.dragKey();
    if (dragKey === null) {
      return;
    }
    const resolved = this.resolveDrop(
      dragKey,
      row,
      this.positionFromPointer(event),
    );
    if (!resolved) {
      this.clearDropIndicator();
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const current = this.dropIndicator();
    const next = resolved.indicator;
    if (
      !current ||
      current.key !== next.key ||
      current.position !== next.position ||
      current.level !== next.level
    ) {
      this.dropIndicator.set(next);
      this.scheduleDragExpand(row, next.position);
    }
  }

  protected onDragLeave(event: DragEvent, row: AndesFlatTreeNode): void {
    const related = event.relatedTarget as Node | null;
    if (
      this.dropIndicator()?.key === row.key &&
      !(related && (event.currentTarget as HTMLElement).contains(related))
    ) {
      this.clearDropIndicator();
    }
  }

  protected onDrop(event: DragEvent, row: AndesFlatTreeNode): void {
    const dragKey = this.dragKey();
    if (dragKey === null) {
      return;
    }
    event.preventDefault();
    const resolved = this.resolveDrop(
      dragKey,
      row,
      this.positionFromPointer(event),
    );
    this.finishDrag();
    if (resolved) {
      this.commitMove(resolved.info);
    }
  }

  protected onDragEnd(event: DragEvent, row: AndesFlatTreeNode): void {
    this.finishDrag();
    this.nodeDragEnd.emit({ node: row.node, key: row.key, event });
  }

  private positionFromPointer(event: DragEvent): AndesTreeDropPosition {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio =
      rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
    if (ratio < 0.25) {
      return 'before';
    }
    return ratio > 0.75 ? 'after' : 'inside';
  }

  /**
   * Turns "dragged over this row, at this part of it" into the move that would happen. Dropping
   * after an open parent means "as its first child", which is where the node would appear.
   */
  private resolveDrop(
    dragKey: AndesTreeKey,
    row: AndesFlatTreeNode,
    position: AndesTreeDropPosition,
  ): {
    info: AndesTreeDropInfo;
    indicator: {
      key: AndesTreeKey;
      position: AndesTreeDropPosition;
      level: number;
    };
  } | null {
    const index = this.index();
    const drag = index.byKey.get(dragKey);
    if (!drag || andesIsTreeDescendantOrSelf(drag, row.entry)) {
      return null;
    }
    if (position === 'inside' && row.entry.disabled) {
      return null;
    }

    let target = row.entry;
    let resolved = position;
    let level = row.level;
    if (
      position === 'after' &&
      row.hasChildren &&
      this.isExpanded(row.key) &&
      !this.isLeaf(row)
    ) {
      const first = this.childRows(row.key)[0];
      if (!first || first.key === dragKey) {
        return null;
      }
      target = first.entry;
      resolved = 'before';
      level = row.level + 1;
    }

    const info: AndesTreeDropInfo = {
      dragNode: drag.node,
      dragKey,
      targetNode: target.node,
      targetKey: target.key,
      position: resolved,
    };
    if (this.allowDrop()?.(info) === false) {
      return null;
    }
    return { info, indicator: { key: row.key, position, level } };
  }

  private scheduleDragExpand(
    row: AndesFlatTreeNode,
    position: AndesTreeDropPosition,
  ) {
    this.clearDragExpand();
    if (position !== 'inside' || this.isLeaf(row) || this.isExpanded(row.key)) {
      return;
    }
    this.dragExpandTimer = setTimeout(
      () => this.toggleExpand(row),
      DRAG_EXPAND_DELAY_MS,
    );
  }

  private clearDragExpand(): void {
    if (this.dragExpandTimer !== null) {
      clearTimeout(this.dragExpandTimer);
      this.dragExpandTimer = null;
    }
  }

  private clearDropIndicator(): void {
    this.clearDragExpand();
    this.dropIndicator.set(null);
  }

  private finishDrag(): void {
    this.dragKey.set(null);
    this.clearDropIndicator();
  }

  protected isDragging(key: AndesTreeKey): boolean {
    return this.dragKey() === key;
  }

  private commitMove(info: AndesTreeDropInfo): boolean {
    const next = andesMoveTreeNode(
      this.nodes(),
      info.dragKey,
      info.targetKey,
      info.position,
      this.fieldNames(),
    );
    if (!next) {
      return false;
    }
    this.nodes.set(next);
    // Show the node where it landed: open the branch it now sits in.
    const index = this.index();
    const moved = index.byKey.get(info.dragKey);
    this.expandKeys(
      moved?.parent && !this.expandedSet().has(moved.parent.key)
        ? [...andesGetTreeAncestors(moved).map((entry) => entry.key)]
        : [],
    );
    const title = index.byKey.get(info.dragKey)?.title ?? '';
    const targetTitle = index.byKey.get(info.targetKey)?.title ?? '';
    this.announcement.set(this.text().moved(title, info.position, targetTitle));
    this.nodeDrop.emit({ ...info, nodes: next });
    return true;
  }

  private moveWithKeyboard(
    row: AndesFlatTreeNode,
    direction: 'up' | 'down' | 'indent' | 'outdent',
  ): void {
    if (!this.isDraggable(row)) {
      return;
    }
    const entry = row.entry;
    const siblings = entry.parent ? entry.parent.children : this.index().roots;
    let target: AndesTreeEntry | undefined;
    let position: AndesTreeDropPosition = 'after';

    switch (direction) {
      case 'up':
        target = siblings[entry.index - 1];
        position = 'before';
        break;
      case 'down':
        target = siblings[entry.index + 1];
        break;
      case 'indent': {
        const previous = siblings[entry.index - 1];
        if (previous && !previous.disabled) {
          const last = previous.children[previous.children.length - 1];
          target = last ?? previous;
          position = last ? 'after' : 'inside';
        }
        break;
      }
      case 'outdent':
        target = entry.parent ?? undefined;
        break;
    }
    if (!target) {
      return;
    }

    const info: AndesTreeDropInfo = {
      dragNode: entry.node,
      dragKey: entry.key,
      targetNode: target.node,
      targetKey: target.key,
      position,
    };
    if (this.allowDrop()?.(info) === false) {
      return;
    }
    if (this.commitMove(info)) {
      this.activeKey.set(entry.key);
      afterNextRender(() => this.itemElement(entry.key)?.focus(), {
        injector: this.injector,
      });
    }
  }
}
