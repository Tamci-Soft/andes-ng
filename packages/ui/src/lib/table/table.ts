import {
  afterEveryRender,
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import {
  ANDES_TABLE_FILTERABLE,
  ANDES_TABLE_SELECTABLE,
  andesCssLength,
  type AndesTableRowKey,
} from './table-context';
import {
  type AndesColumnFilterMatcher,
  type AndesFilterPredicates,
  andesFilterRows,
  andesMoveColumn,
  type AndesFilterValue,
  type AndesTableFilters,
} from './table-data';
import {
  andesNextSortDirection,
  type AndesSortDirection,
  type AndesSortState,
} from './table-sort';
import { andesTreeDescendants, type AndesTableTree } from './table-tree';

/** Cell padding scale, named for what it does rather than as a size. */
export type AndesTableDensity = 'compact' | 'default' | 'comfortable';

/** Visual placement of `<caption>`, independent of its required first-child position. */
export type AndesTableCaptionSide = 'top' | 'bottom';

/** Horizontal alignment of a header or data cell. Logical, so it follows writing direction. */
export type AndesTableAlign = 'start' | 'center' | 'end';

/** Row selection control kind. */
export type AndesTableSelectionType = 'checkbox' | 'radio';

/** CSS `table-layout`. `fixed` is what makes `ellipsis` cells truncate predictably. */
export type AndesTableLayout = 'auto' | 'fixed';

/** Aggregate state of the rendered, enabled row checkboxes, for "select all". */
export type AndesTableSelectAllState = 'all' | 'some' | 'none';

/**
 * What a user interaction changed, as reported by `(tableChange)`: a column sort,
 * a column filter, or both cleared at once through `resetState()`.
 */
export type AndesTableChangeAction = 'sort' | 'filter' | 'reset';

/**
 * The table's sort and filter state after a user interaction - the whole query
 * state a server-side data source needs to refetch (pagination is not owned by
 * the table). For a controlled column filter (`filteredValue`) `filters` holds
 * the *proposed* state, not yet applied.
 */
export interface AndesTableChange {
  readonly action: AndesTableChangeAction;
  /**
   * Column whose header or filter the user operated. Absent for changes that are
   * not tied to one column: `resetState()`, `clearFilters()` and `clearSort()`.
   */
  readonly columnId?: string;
  readonly filters: AndesTableFilters;
  /** The single sort (`multiSort` off). */
  readonly sort: AndesSortState | null;
  /** Every active sort in priority order, whichever mode is on. */
  readonly sorts: readonly AndesSortState[];
}

/** A column width change, as reported by `(columnResize)`. */
export interface AndesTableColumnResize {
  readonly columnKey: string;
  /** New width in pixels. */
  readonly width: number;
  /** Every stored column width after the change, column key -> pixels. */
  readonly widths: Readonly<Record<string, number>>;
}

/** A column move, as reported by `(columnReorder)`. */
export interface AndesTableColumnReorder {
  readonly columnKey: string;
  /** Position among the keyed columns before and after the move. */
  readonly previousIndex: number;
  readonly currentIndex: number;
  /** Every keyed column, in its new order - feed it to `andesOrderColumns`. */
  readonly order: readonly string[];
}

/** Builds the message announced after a keyboard column move. */
export type AndesTableColumnMovedText = (
  column: string,
  position: number,
  total: number,
) => string;

/** Emitted by `rowSelect` when the user toggles one row's selection control. */
export interface AndesTableRowSelectEvent {
  readonly key: AndesTableRowKey;
  readonly selected: boolean;
  /** The whole selection after the change. */
  readonly selectedKeys: readonly AndesTableRowKey[];
}

/** Emitted by `expandChange` when a row is expanded or collapsed. */
export interface AndesTableExpandEvent {
  readonly key: AndesTableRowKey;
  readonly expanded: boolean;
}

/** Native tooltip texts of sortable headers, one per next step of the cycle. */
export interface AndesTableSortTooltipLabels {
  readonly asc: string;
  readonly desc: string;
  readonly cancel: string;
}

/** Where `scrollTo` should bring the table's scroll container. */
export interface AndesTableScrollTarget {
  /** Absolute vertical scroll offset in pixels. */
  readonly top?: number;
  /** Key of a rendered row (its `rowKey`) to bring to the top. */
  readonly key?: AndesTableRowKey;
  /**
   * 0-based index of a body row to bring to the top. With
   * `*andesTableVirtualRows` it reaches rows that are not rendered yet.
   */
  readonly index?: number;
  readonly behavior?: ScrollBehavior;
}

/**
 * Handle a virtual row list registers so `scrollTo({ index })` can reach rows
 * that are not in the DOM.
 */
export interface AndesTableVirtualRowsHandle {
  /** Scroll offset of row `index` within the scroll container. */
  offsetOf(index: number): number;
}

let nextTableId = 0;

/**
 * Styled container for a native `<table>`, and the owner of the sort state shared
 * by every `AndesTableHead` inside it.
 *
 * The children are projected straight into the real `<table>`, so the rendered DOM
 * is an ordinary `<table>/<thead>/<tbody>/<th scope="col">/<td>` tree with all of
 * its implicit ARIA roles intact - nothing here re-implements table semantics.
 *
 * ```html
 * <andes-table [(sort)]="sort">
 *   <caption andesTableCaption>Recent invoices</caption>
 *   <thead andesTableHeader>
 *     <tr andesTableRow>
 *       <th andesTableHead sortKey="client">Client</th>
 *       <th andesTableHead sortKey="total" align="end">Total</th>
 *     </tr>
 *   </thead>
 *   <tbody andesTableBody>
 *     @for (row of sortedRows(); track row.id) {
 *       <tr andesTableRow>
 *         <td andesTableCell>{{ row.client }}</td>
 *         <td andesTableCell align="end">{{ row.total }}</td>
 *       </tr>
 *     }
 *   </tbody>
 * </andes-table>
 * ```
 *
 * The rows themselves stay with the consumer; `andesSortRows` turns `sort()` into
 * the ordered array to render, and `andesFilterRows` / `andesPaginateRows` do the
 * same for `filters()` and a page.
 *
 * Beyond sorting, the table owns the rest of the interactive state as two-way
 * models, each driven by a small part placed where it belongs in the markup:
 * - `selectedKeys` - `andes-table-selection` in a keyed row, `andes-table-select-all`
 *   in the header;
 * - `expandedKeys` - `andes-table-expand-toggle` plus a `*andesTableExpandedRow` row;
 * - `filters` - `andes-table-filter` inside a header cell.
 *
 * Content placed with an `andesTableTop` / `andesTableBottom` attribute renders
 * above / below the table (title, toolbar, pagination); give such a bar the
 * `andes-table__toolbar` class for a start side ("3 of 10 rows selected") and an end
 * side (actions, a pager). The table itself sits in a rounded frame (`framed`).
 * The `andes-table__sr-only` class visually hides projected text, e.g. to name an
 * icon-only header cell.
 *
 * "Select all" finds the row checkboxes through a content query, so
 * `andes-table-selection` must be written in the same template as the
 * `<andes-table>` - not inside a child component's own template.
 */
@Component({
  selector: 'andes-table',
  templateUrl: './table.html',
  styleUrl: './table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTable {
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Draw borders around every cell (a full grid) instead of row separators only.
   * The outer frame is controlled by `framed`.
   */
  readonly bordered = input(false, { transform: booleanAttribute });

  /**
   * Set the table in a rounded, bordered frame that clips the header and footer
   * tints, the row hover and the loading overlay to the corners. On by default;
   * turn it off when the table already sits in a card or panel of its own.
   */
  readonly framed = input(true, { transform: booleanAttribute });

  /** Cell padding scale. */
  readonly density = input<AndesTableDensity>('default');

  /** Highlight the row under the pointer. */
  readonly rowHover = input(true, { transform: booleanAttribute });

  /** Render the caption above or below the table. */
  readonly captionSide = input<AndesTableCaptionSide>('bottom');

  /** CSS `table-layout`. */
  readonly tableLayout = input<AndesTableLayout>('auto');

  /**
   * Show a loading overlay over the table and mark it `aria-busy`. The overlay
   * blocks pointer interaction with the stale rows underneath.
   */
  readonly loading = input(false, { transform: booleanAttribute });

  /** Text announced to assistive tech while `loading`. */
  readonly loadingLabel = input('Loading');

  /**
   * Minimum table width: a number of pixels or any CSS length,
   * e.g. `'max-content'`. Narrower containers scroll horizontally.
   */
  readonly scrollX = input<string | number | undefined>(undefined);

  /**
   * Maximum body height: a number of pixels or any CSS length.
   * When set the table scrolls vertically inside its container and the header
   * row sticks to the top of it.
   */
  readonly scrollY = input<string | number | undefined>(undefined);

  /**
   * Sorted column and direction, or `null` for unsorted. Two-way bindable, and
   * equally usable uncontrolled - the table updates it itself when a sortable
   * header is activated. Used while `multiSort` is off.
   */
  readonly sort = model<AndesSortState | null>(null);

  /**
   * Sort several columns at once. Activating a header then cycles only that
   * column and keeps the others; state lives in `sorts` instead of `sort`.
   */
  readonly multiSort = input(false, { transform: booleanAttribute });

  /**
   * Sorted columns in priority order - the first is the primary key. Two-way
   * bindable; only used while `multiSort` is on. A newly sorted column is
   * appended as the lowest priority.
   */
  readonly sorts = model<readonly AndesSortState[]>([]);

  /**
   * Directions every sortable header cycles through before returning to
   * unsorted. A header's own `sortDirections` wins.
   */
  readonly sortDirections = input<readonly AndesSortDirection[]>([
    'asc',
    'desc',
  ]);

  /**
   * Active column filters, column id -> selected values. Written by each
   * `andes-table-filter`; two-way bindable. Feed it to `andesFilterRows`.
   */
  readonly filters = model<AndesTableFilters>({});

  /**
   * Fires after the user sorts a column or applies a column filter, with the whole
   * resulting sort and filter state. Programmatic changes to the models do not fire
   * it. (Named `tableChange` rather than `change` so the native `change` events of
   * the checkboxes inside the table cannot be mistaken for it.)
   */
  readonly tableChange = output<AndesTableChange>();

  /** Whether row selection uses checkboxes (many) or radios (one). */
  readonly selectionType = input<AndesTableSelectionType>('checkbox');

  /**
   * Keys of the selected rows. Two-way bindable. Keys of rows that are not
   * currently rendered are kept, so selection survives paging and filtering.
   */
  readonly selectedKeys = model<readonly AndesTableRowKey[]>([]);

  /**
   * Keys "select all", Shift-click ranges and the selection menu act on, in
   * display order. Defaults to the rows that are rendered; set it when they are
   * not all in the DOM - a virtual list, or "select all" across every page.
   * Rendered rows whose control is disabled are still skipped.
   */
  readonly selectableKeys = input<readonly AndesTableRowKey[] | null>(null);

  /** Keys of the expanded rows. Two-way bindable. */
  readonly expandedKeys = model<readonly AndesTableRowKey[]>([]);

  /** Toggle a keyed row's expansion by clicking anywhere in it. */
  readonly expandRowByClick = input(false, { transform: booleanAttribute });

  /**
   * Give every header with a column key a resize handle. A header's own
   * `resizable` wins.
   */
  readonly resizable = input(false, { transform: booleanAttribute });

  /**
   * Column widths set by resizing, column key -> pixels. Two-way bindable, so
   * widths can be restored or persisted; a header's `width` applies until its
   * column has an entry here.
   */
  readonly columnWidths = model<Readonly<Record<string, number>>>({});

  /** Fires on every width change made by dragging or the keyboard. */
  readonly columnResize = output<AndesTableColumnResize>();

  /**
   * Let the user move columns: drag a header (or Alt+Arrow Left/Right on a
   * focused one) to a new position. Only headers with a column key move, and
   * fixed columns stay put. The table reports the new order through
   * `columnOrder`/`(columnReorder)`; render the header and body cells in that
   * order (`andesOrderColumns`) for the move to take effect.
   */
  readonly reorderable = input(false, { transform: booleanAttribute });

  /** Column keys in the user's order. Two-way bindable; empty until a move. */
  readonly columnOrder = model<readonly string[]>([]);

  /** Fires after each column move, by drag or keyboard. */
  readonly columnReorder = output<AndesTableColumnReorder>();

  /** Announcement after a keyboard move, e.g. "Status moved to position 2 of 4". */
  readonly columnMovedText = input<AndesTableColumnMovedText>(
    (column, position, total) =>
      `${column} moved to position ${position} of ${total}`,
  );

  /** Live-region text for column moves. */
  protected readonly announcement = signal('');

  /** Column whose header should get focus back once the moved cells re-render. */
  private pendingFocusKey: string | null = null;

  /** A resize drag is in progress. */
  private readonly resizing = signal(false);

  /**
   * Indentation per tree level for cells marked `indent` in rows with a `level`:
   * pixels or a CSS length. Defaults to 1rem.
   */
  readonly indentSize = input<string | number | undefined>(undefined);

  /**
   * Parent/child structure of tree data (from `andesTreeIndex`). When set,
   * selection cascades: toggling a row toggles all its descendants, a parent is
   * selected exactly when all its children are, and a partly selected parent
   * shows an indeterminate checkbox. Leave unset to select rows independently.
   */
  readonly selectionTree = input<AndesTableTree | null>(null);

  /**
   * Keep the header row stuck to the top of the page (plus `stickyOffset`) while
   * the page scrolls past a tall table. Without `scrollY` the table then stops
   * being its own horizontal scroller, so use it for tables that fit their
   * width; with `scrollY` the header already sticks inside the table.
   */
  readonly sticky = input(false, { transform: booleanAttribute });

  /**
   * Distance from the top of the viewport where a `sticky` header stops, e.g.
   * the height of a fixed app bar. Pixels or a CSS length.
   */
  readonly stickyOffset = input<string | number>(0);

  /**
   * Give sortable headers a native tooltip naming what activating them does
   * next ("Click to sort ascending" ...). A header's own `sortTooltip` wins.
   */
  readonly sortTooltip = input(false, { transform: booleanAttribute });

  /** Texts of the sort tooltip. */
  readonly sortTooltipLabels = input<AndesTableSortTooltipLabels>({
    asc: 'Click to sort ascending',
    desc: 'Click to sort descending',
    cancel: 'Click to cancel sorting',
  });

  /**
   * Scroll back to the first row when the user changes the sort or a filter, so
   * the new first results are what they see.
   */
  readonly scrollToFirstRowOnChange = input(false, {
    transform: booleanAttribute,
  });

  /** The user toggled one row's selection control. */
  readonly rowSelect = output<AndesTableRowSelectEvent>();

  /** A row was expanded or collapsed through the table. */
  readonly expandChange = output<AndesTableExpandEvent>();

  /** The table's own scroll container scrolled (with `scrollX`/`scrollY`). */
  readonly bodyScroll = output<Event>();

  /** Shared `name` for this table's radio buttons, so they form one group. */
  readonly radioGroupName = `andes-table-${nextTableId++}-selection`;

  private readonly selectables = contentChildren(ANDES_TABLE_SELECTABLE, {
    descendants: true,
  });

  private readonly filterables = contentChildren(ANDES_TABLE_FILTERABLE, {
    descendants: true,
  });

  /** Column id -> `predicate` of each `andes-table-filter` that has one. */
  readonly filterPredicates = computed(() => {
    const predicates: Record<
      string,
      | ((value: AndesFilterValue, row: never) => boolean)
      | AndesColumnFilterMatcher<never>
    > = {};
    for (const filterable of this.filterables()) {
      const predicate = filterable.predicate();
      if (predicate) {
        predicates[filterable.column()] = predicate;
      }
    }
    return predicates;
  });

  private readonly container =
    viewChild.required<ElementRef<HTMLElement>>('container');

  private readonly scrollTopState = signal(0);
  private readonly viewportHeightState = signal(0);

  /** Vertical scroll offset of the table's scroll container, in pixels. */
  readonly scrollTop = this.scrollTopState.asReadonly();

  /** Visible height of the table's scroll container, in pixels. */
  readonly viewportHeight = this.viewportHeightState.asReadonly();

  private virtualRows: AndesTableVirtualRowsHandle | undefined;

  /** The table is scrolled away from its inline-start edge. */
  private readonly pingStart = signal(false);
  /** More content lies beyond the table's inline-end edge. */
  private readonly pingEnd = signal(false);

  /** Last row toggled without Shift - the anchor of a Shift-click range. */
  private rangeAnchor: AndesTableRowKey | undefined;

  private readonly selectedSet = computed(() => new Set(this.selectedKeys()));
  private readonly expandedSet = computed(() => new Set(this.expandedKeys()));

  private readonly activeSorts = computed<readonly AndesSortState[]>(() => {
    if (this.multiSort()) {
      return this.sorts();
    }
    const sort = this.sort();
    return sort ? [sort] : [];
  });

  private readonly ownSelectables = computed(() =>
    this.selectables().filter((item) => item.owner === this),
  );

  /**
   * Keys whose selection the bulk actions may change: `selectableKeys`, or the
   * rendered, enabled selection controls in document order.
   */
  readonly enabledKeys = computed(() => {
    const explicit = this.selectableKeys();
    if (explicit) {
      const locked = this.disabledKeys();
      return explicit.filter((key) => !locked.has(key));
    }
    return this.ownSelectables()
      .filter((item) => !item.isDisabled())
      .map((item) => item.resolvedKey())
      .filter((key): key is AndesTableRowKey => key !== undefined);
  });

  /** Whether the rendered, enabled rows are all, some or none selected. */
  readonly selectAllState = computed<AndesTableSelectAllState>(() => {
    const keys = this.enabledKeys();
    const selected = this.selectedSet();
    const count = keys.filter((key) => selected.has(key)).length;

    if (count === 0) {
      return 'none';
    }
    return count === keys.length ? 'all' : 'some';
  });

  /** Whether any rendered row can be selected at all. */
  readonly hasSelectableRows = computed(() => this.enabledKeys().length > 0);

  /** Keys of rendered rows whose selection control is disabled. */
  private readonly disabledKeys = computed(
    () =>
      new Set(
        this.ownSelectables()
          .filter((item) => item.isDisabled())
          .map((item) => item.resolvedKey())
          .filter((key): key is AndesTableRowKey => key !== undefined),
      ),
  );

  /**
   * With a `selectionTree`, the unselected rows that have a selected
   * descendant - drawn as indeterminate.
   */
  private readonly partialSet = computed(() => {
    const tree = this.selectionTree();
    const partial = new Set<AndesTableRowKey>();
    if (!tree) {
      return partial;
    }

    const selected = this.selectedSet();
    for (const key of selected) {
      let parent = tree.parentOf.get(key);
      while (parent !== undefined && !partial.has(parent)) {
        if (!selected.has(parent)) {
          partial.add(parent);
        }
        parent = tree.parentOf.get(parent);
      }
    }
    return partial;
  });

  protected readonly indentLength = computed(() =>
    andesCssLength(this.indentSize()),
  );

  protected readonly stickyOffsetLength = computed(() =>
    this.sticky() && !this.scrollYLength()
      ? (andesCssLength(this.stickyOffset()) ?? '0px')
      : null,
  );
  protected readonly scrollYLength = computed(() =>
    andesCssLength(this.scrollY()),
  );
  protected readonly scrollXLength = computed(() =>
    andesCssLength(this.scrollX()),
  );

  protected readonly tableClasses = computed(() =>
    clsx(
      'andes-table',
      `andes-table--${this.density()}`,
      `andes-table--caption-${this.captionSide()}`,
      this.tableLayout() === 'fixed' && 'andes-table--layout-fixed',
      this.bordered() && 'andes-table--bordered',
      this.rowHover() && 'andes-table--hoverable',
      (this.scrollYLength() || this.sticky()) && 'andes-table--sticky-header',
      this.pingStart() && 'andes-table--ping-start',
      this.pingEnd() && 'andes-table--ping-end',
      this.resizing() && 'andes-table--resizing',
    ),
  );

  constructor() {
    afterEveryRender({
      write: () => {
        this.syncFixedOffsets();
        this.restoreMovedFocus();
        this.syncHeaderOffsets();
      },
    });

    afterNextRender(() => {
      this.updateScrollEdges();

      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const container = this.container().nativeElement;
      const observer = new ResizeObserver(() => this.updateScrollEdges());
      observer.observe(container);
      if (container.firstElementChild) {
        observer.observe(container.firstElementChild);
      }
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  // Sorting

  /** Current direction for `columnId`, or `null` when that column is not sorted. */
  directionFor(columnId: string): AndesSortDirection | null {
    return (
      this.activeSorts().find((sort) => sort.columnId === columnId)
        ?.direction ?? null
    );
  }

  /**
   * 1-based priority of `columnId` among the sorted columns, or `null` when it
   * is not sorted. Always 1 for the sorted column while `multiSort` is off.
   */
  sortPriorityFor(columnId: string): number | null {
    const index = this.activeSorts().findIndex(
      (sort) => sort.columnId === columnId,
    );
    return index === -1 ? null : index + 1;
  }

  /** Number of currently sorted columns. */
  readonly sortedColumnCount = computed(() => this.activeSorts().length);

  /**
   * Advances `columnId` through its sort cycle - by default unsorted ->
   * ascending -> descending -> unsorted. Without `multiSort`, activating a
   * different column starts it fresh and drops the previous one, so only one
   * column is ever sorted.
   */
  toggleSort(
    columnId: string,
    directions: readonly AndesSortDirection[] = this.sortDirections(),
  ): void {
    const next = andesNextSortDirection(
      this.directionFor(columnId),
      directions,
    );

    if (!this.multiSort()) {
      this.sort.set(next ? { columnId, direction: next } : null);
      this.emitChange('sort', columnId);
      return;
    }

    const sorts = this.sorts();
    const index = sorts.findIndex((sort) => sort.columnId === columnId);

    if (next === null) {
      this.sorts.set(sorts.filter((sort) => sort.columnId !== columnId));
    } else if (index === -1) {
      this.sorts.set([...sorts, { columnId, direction: next }]);
    } else {
      this.sorts.set(
        sorts.map((sort, i) =>
          i === index ? { columnId, direction: next } : sort,
        ),
      );
    }
    this.emitChange('sort', columnId);
  }

  /** Native tooltip for a sortable header: what activating it does next. */
  sortTooltipFor(
    columnId: string,
    directions: readonly AndesSortDirection[] = this.sortDirections(),
  ): string {
    const next = andesNextSortDirection(
      this.directionFor(columnId),
      directions,
    );
    const labels = this.sortTooltipLabels();
    return next === null ? labels.cancel : labels[next];
  }

  /**
   * Removes every column's sort without touching the filters. Emits
   * `(tableChange)` when something was sorted.
   */
  clearSort(): void {
    if (this.activeSorts().length === 0) {
      return;
    }
    this.sort.set(null);
    this.sorts.set([]);
    this.emitChange('sort');
  }

  // Filtering

  /** Values currently filtering `columnId` (empty when it is not filtered). */
  filterValueFor(columnId: string): readonly AndesFilterValue[] {
    // `filters` may be bound to `null` (as `andesFilterRows` accepts), meaning none.
    return this.filters()?.[columnId] ?? [];
  }

  /**
   * Replaces `columnId`'s filter as a user action: an empty `values` removes it,
   * and `(tableChange)` reports the result.
   */
  setFilter(columnId: string, values: readonly AndesFilterValue[]): void {
    this.syncFilter(columnId, values);
    this.emitChange('filter', columnId);
  }

  /**
   * Replaces `columnId`'s filter without reporting a user change - how a filter
   * seeds its `defaultFilteredValue` or follows its controlled `filteredValue`.
   * A no-op when the values are already in place.
   */
  syncFilter(columnId: string, values: readonly AndesFilterValue[]): void {
    const current = this.filterValueFor(columnId);
    if (
      current.length === values.length &&
      values.every((value) => current.includes(value)) &&
      (values.length > 0 || !(columnId in (this.filters() ?? {})))
    ) {
      return;
    }
    this.filters.set(this.withFilter(columnId, values));
  }

  /**
   * Reports a user's filter choice for a controlled column without applying it:
   * `(tableChange)` carries the filters as they would be.
   */
  notifyFilterChange(
    columnId: string,
    values: readonly AndesFilterValue[],
  ): void {
    this.emitChange(
      'filter',
      columnId,
      this.withFilter(columnId, values),
      false,
    );
  }

  /**
   * The rows passing every active filter, judged by the `predicate` of each
   * column's `andes-table-filter` - `andesFilterRows` with the predicates
   * collected from the header. Columns without a predicate are not filtered.
   */
  filterRows<TRow>(rows: readonly TRow[]): readonly TRow[] {
    return andesFilterRows(
      rows,
      this.filters(),
      this.filterPredicates() as unknown as AndesFilterPredicates<TRow>,
    );
  }

  private withFilter(
    columnId: string,
    values: readonly AndesFilterValue[],
  ): AndesTableFilters {
    const next = { ...(this.filters() ?? {}) };
    if (values.length === 0) {
      delete next[columnId];
    } else {
      next[columnId] = [...values];
    }
    return next;
  }

  private emitChange(
    action: AndesTableChangeAction,
    columnId?: string,
    filters: AndesTableFilters = this.filters() ?? {},
    scroll = true,
  ): void {
    this.tableChange.emit({
      action,
      ...(columnId === undefined ? {} : { columnId }),
      filters,
      sort: this.sort(),
      sorts: this.activeSorts(),
    });
    if (scroll && this.scrollToFirstRowOnChange()) {
      this.scrollTo({ top: 0 });
    }
  }

  /**
   * Removes the filters of `columns`, or of every column when left out. Reports
   * `(tableChange)` when a filter was active.
   */
  clearFilters(columns?: readonly string[]): void {
    const current = this.filters() ?? {};
    const next = columns
      ? Object.fromEntries(
          Object.entries(current).filter(([key]) => !columns.includes(key)),
        )
      : {};
    if (Object.keys(next).length === Object.keys(current).length) {
      return;
    }
    this.filters.set(next);
    this.emitChange('filter');
  }

  /**
   * Clears every filter and sort in one step, with a single `(tableChange)`
   * (`action: 'reset'`) - one refetch for a server-side table.
   */
  resetState(): void {
    const filtered = Object.keys(this.filters() ?? {}).length > 0;
    const sorted = this.activeSorts().length > 0;
    if (!filtered && !sorted) {
      return;
    }
    this.filters.set({});
    this.sort.set(null);
    this.sorts.set([]);
    this.emitChange('reset');
  }

  // Column widths

  /** Stored width of `columnKey` in pixels, or `undefined` when it has none. */
  widthFor(columnKey: string): number | undefined {
    return this.columnWidths()?.[columnKey];
  }

  /** Stores `columnKey`'s width as a user resize and reports it. */
  resizeColumn(columnKey: string, width: number): void {
    if (this.widthFor(columnKey) === width) {
      return;
    }
    const widths = { ...(this.columnWidths() ?? {}), [columnKey]: width };
    this.columnWidths.set(widths);
    this.columnResize.emit({ columnKey, width, widths });
  }

  // Column order

  /**
   * Whether a header cell may be moved: it has a column key, is not pinned and
   * has not opted out.
   */
  static isMovableCell(cell: Element): boolean {
    return (
      cell instanceof HTMLElement &&
      !!cell.dataset['columnKey'] &&
      cell.dataset['reorder'] !== 'off' &&
      !cell.classList.contains('andes-table__fixed')
    );
  }

  /**
   * Moves the header cell at `from` to `to` (cell positions in `row`) and reports
   * the resulting column order. No-op unless the cell is movable and every cell
   * it passes over is too - pinned columns are never crossed.
   */
  moveColumn(row: HTMLTableRowElement, from: number, to: number): boolean {
    const cells = Array.from(row.cells);
    const moved = cells[from];
    if (!moved || to < 0 || to >= cells.length || from === to) {
      return false;
    }
    const passed = cells.slice(Math.min(from, to), Math.max(from, to) + 1);
    if (!passed.every((cell) => AndesTable.isMovableCell(cell))) {
      return false;
    }

    const reordered = [...cells];
    reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const keysOf = (list: HTMLTableCellElement[]) =>
      list
        .map((cell) => cell.dataset['columnKey'])
        .filter((key): key is string => !!key);
    const before = keysOf(cells);
    const rendered = keysOf(reordered);
    const columnKey = moved.dataset['columnKey'] as string;
    const previousIndex = before.indexOf(columnKey);
    const currentIndex = rendered.indexOf(columnKey);

    // A stored order that also lists columns that are not rendered (hidden ones,
    // see `andes-table-column-settings`) keeps them where they were: the moved
    // column lands next to the one it took the place of.
    const stored = this.columnOrder() ?? [];
    const keepsHidden =
      stored.length > rendered.length &&
      before.every((key) => stored.includes(key));
    const order = keepsHidden
      ? andesMoveColumn(stored, columnKey, before[currentIndex])
      : rendered;

    this.columnOrder.set(order);
    this.columnReorder.emit({ columnKey, previousIndex, currentIndex, order });
    return true;
  }

  /**
   * Keyboard move: shifts `cell` one position toward the end (`step` 1) or the
   * start (-1) of its row, keeps focus on it and announces where it landed.
   */
  moveColumnBy(cell: HTMLTableCellElement, step: 1 | -1): void {
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row || !this.moveColumn(row, cell.cellIndex, cell.cellIndex + step)) {
      return;
    }
    const key = cell.dataset['columnKey'] as string;
    const keys = Array.from(row.cells)
      .map((item) => item.dataset['columnKey'])
      .filter((item): item is string => !!item);
    const title =
      cell.querySelector('.andes-table__head-title')?.textContent?.trim() ||
      key;
    this.pendingFocusKey = key;
    this.announcement.set(
      this.columnMovedText()(title, keys.indexOf(key) + 1 + step, keys.length),
    );
  }

  private restoreMovedFocus(): void {
    const key = this.pendingFocusKey;
    if (key === null) {
      return;
    }
    this.pendingFocusKey = null;
    const cell = Array.from(
      this.container().nativeElement.querySelectorAll<HTMLElement>(
        'thead th[data-column-key]',
      ),
    ).find((th) => th.dataset['columnKey'] === key);
    if (cell && document.activeElement !== cell) {
      cell.focus();
    }
  }

  /** Marks a resize drag as in progress, for the table-wide resize cursor. */
  setResizing(resizing: boolean): void {
    this.resizing.set(resizing);
  }

  // Selection

  isSelected(key: AndesTableRowKey): boolean {
    return this.selectedSet().has(key);
  }

  /**
   * Whether `key` is unselected but has a selected descendant. Only ever true
   * with a `selectionTree`.
   */
  isPartiallySelected(key: AndesTableRowKey): boolean {
    return this.partialSet().has(key);
  }

  /**
   * Selects or deselects one row. For radios this makes it the only selection.
   * With `extendRange` (a Shift-click on a checkbox) every enabled row between the
   * previous anchor and `key` takes the new state too.
   */
  toggleSelected(key: AndesTableRowKey, extendRange = false): void {
    if (this.selectionType() === 'radio') {
      this.selectedKeys.set([key]);
      this.rangeAnchor = key;
      this.rowSelect.emit({
        key,
        selected: true,
        selectedKeys: this.selectedKeys(),
      });
      return;
    }

    const select = !this.isSelected(key);
    const keys = this.enabledKeys();
    const from =
      this.rangeAnchor === undefined ? -1 : keys.indexOf(this.rangeAnchor);
    const to = keys.indexOf(key);

    const affected =
      extendRange && from !== -1 && to !== -1
        ? keys.slice(Math.min(from, to), Math.max(from, to) + 1)
        : [key];

    this.applySelection(affected, select);
    this.rangeAnchor = key;
    this.rowSelect.emit({
      key,
      selected: select,
      selectedKeys: this.selectedKeys(),
    });
  }

  /**
   * "Select all": selects every rendered, enabled row, or clears them when they
   * are already all selected. Disabled rows and rows that are not rendered keep
   * whatever state they had.
   */
  toggleAllSelected(): void {
    this.applySelection(this.enabledKeys(), this.selectAllState() !== 'all');
  }

  /** Selects every rendered, enabled row, keeping the rest of the selection. */
  selectAll(): void {
    this.applySelection(this.enabledKeys(), true);
  }

  /**
   * Flips the selection of every rendered, enabled row. Rows that are not
   * rendered keep their state.
   */
  invertSelection(): void {
    const keys = this.enabledKeys();
    const selected = keys.filter((key) => this.isSelected(key));
    const unselected = keys.filter((key) => !this.isSelected(key));
    const removed = new Set(selected);
    const current = this.selectedKeys().filter((key) => !removed.has(key));
    this.selectedKeys.set(current);
    this.applySelection(unselected, true);
  }

  /**
   * Clears the selection, except rendered rows whose control is disabled -
   * those keep whatever state they had.
   */
  clearSelection(): void {
    const locked = this.disabledKeys();
    this.selectedKeys.set(this.selectedKeys().filter((key) => locked.has(key)));
  }

  private applySelection(
    keys: readonly AndesTableRowKey[],
    select: boolean,
  ): void {
    const tree = this.selectionTree();
    const affected = tree ? this.withDescendants(tree, keys) : keys;
    const current = this.selectedKeys();
    let next: AndesTableRowKey[];

    if (select) {
      const set = new Set(current);
      next = [...current, ...affected.filter((key) => !set.has(key))];
    } else {
      const removed = new Set(affected);
      next = current.filter((key) => !removed.has(key));
    }

    this.selectedKeys.set(tree ? this.reconcileAncestors(tree, next) : next);
  }

  /** `keys` plus all their descendants, minus rendered rows that are disabled. */
  private withDescendants(
    tree: AndesTableTree,
    keys: readonly AndesTableRowKey[],
  ): AndesTableRowKey[] {
    const locked = this.disabledKeys();
    const result = new Set<AndesTableRowKey>(keys);
    for (const key of keys) {
      for (const descendant of andesTreeDescendants(tree, key)) {
        if (!locked.has(descendant)) {
          result.add(descendant);
        }
      }
    }
    return [...result];
  }

  /**
   * Makes every parent selected exactly when all of its children are, bottom
   * up, so a change deep in the tree is reflected all the way to the top.
   */
  private reconcileAncestors(
    tree: AndesTableTree,
    keys: readonly AndesTableRowKey[],
  ): AndesTableRowKey[] {
    const selected = new Set(keys);
    const depth = (key: AndesTableRowKey): number => {
      let level = 0;
      for (
        let p = tree.parentOf.get(key);
        p !== undefined;
        p = tree.parentOf.get(p)
      ) {
        level++;
      }
      return level;
    };
    const parents = [...tree.childrenOf.keys()].sort(
      (a, b) => depth(b) - depth(a),
    );

    for (const parent of parents) {
      const children = tree.childrenOf.get(parent) ?? [];
      const all = children.every((child) => selected.has(child));
      if (all) {
        selected.add(parent);
      } else {
        selected.delete(parent);
      }
    }

    const ordered = keys.filter((key) => selected.has(key));
    const known = new Set(ordered);
    return [...ordered, ...[...selected].filter((key) => !known.has(key))];
  }

  // Expansion

  isExpanded(key: AndesTableRowKey): boolean {
    return this.expandedSet().has(key);
  }

  toggleExpanded(key: AndesTableRowKey): void {
    const keys = this.expandedKeys();
    const expanded = !this.isExpanded(key);
    this.expandedKeys.set(
      expanded ? [...keys, key] : keys.filter((k) => k !== key),
    );
    this.expandChange.emit({ key, expanded });
  }

  // Scrolling

  /** Lets `*andesTableVirtualRows` resolve `scrollTo({ index })`. */
  registerVirtualRows(handle: AndesTableVirtualRowsHandle | undefined): void {
    this.virtualRows = handle;
  }

  /**
   * Scrolls the table to an absolute offset, a row key or a row index. When the
   * table has no `scrollY` of its own, the row is scrolled into view on the page
   * instead.
   */
  scrollTo(target: AndesTableScrollTarget): void {
    const container = this.container().nativeElement;
    const behavior = target.behavior ?? 'auto';
    const header = container.querySelector('thead');
    const headerHeight = this.scrollYLength()
      ? (header?.getBoundingClientRect().height ?? 0)
      : 0;

    let top = target.top;
    let row: HTMLElement | null = null;

    if (top === undefined && target.key !== undefined) {
      row = container.querySelector<HTMLElement>(
        `tbody tr[data-row-key="${cssEscape(String(target.key))}"]`,
      );
    } else if (top === undefined && target.index !== undefined) {
      if (this.virtualRows) {
        top = this.virtualRows.offsetOf(target.index) - headerHeight;
      } else {
        row =
          container.querySelectorAll<HTMLElement>(
            'tbody tr.andes-table__row:not(.andes-table__expanded-row)',
          )[target.index] ?? null;
      }
    }

    if (row) {
      if (!this.scrollYLength()) {
        row.scrollIntoView?.({ block: 'start', behavior });
        return;
      }
      top =
        row.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        headerHeight;
    }

    if (top !== undefined) {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: Math.max(0, top), behavior });
      } else {
        container.scrollTop = Math.max(0, top);
      }
    }
  }

  protected onContainerScroll(event: Event): void {
    this.updateScrollEdges();
    this.bodyScroll.emit(event);
  }

  // Fixed columns

  /**
   * Gives every pinned cell without an explicit `fixedOffset` its distance from
   * the pinned edge: the summed width of the pinned cells before it in its row.
   * Written as a custom property the stylesheet reads, so an explicit `fixedOffset` inline style still wins.
   */
  private syncFixedOffsets(): void {
    const table = this.container().nativeElement.querySelector('table');
    if (!table?.querySelector('.andes-table__fixed')) {
      return;
    }

    const writes: [HTMLElement, number][] = [];
    for (const row of Array.from(table.rows)) {
      const cells = Array.from(row.cells);
      for (const [edge, ordered] of [
        ['start', cells],
        ['end', [...cells].reverse()],
      ] as const) {
        let offset = 0;
        for (const cell of ordered) {
          if (cell.classList.contains(`andes-table__fixed-${edge}`)) {
            writes.push([cell, offset]);
            offset += cell.getBoundingClientRect().width;
          }
        }
      }
    }

    // Measure everything first, then write, so the loop never forces a relayout.
    for (const [cell, offset] of writes) {
      cell.style.setProperty('--andes-table-fixed-offset', `${offset}px`);
    }
  }

  /**
   * With a sticky header of several rows (grouped columns), stacks each header
   * row under the ones above it instead of letting them all stick at the top.
   */
  private syncHeaderOffsets(): void {
    if (!this.scrollYLength() && !this.sticky()) {
      return;
    }
    const header = this.container().nativeElement.querySelector('thead');
    if (!header || header.rows.length < 2) {
      return;
    }

    const heights = Array.from(header.rows).map(
      (row) => row.getBoundingClientRect().height,
    );
    let top = 0;
    Array.from(header.rows).forEach((row, index) => {
      for (const cell of Array.from(row.cells)) {
        cell.style.setProperty('--andes-table-header-top', `${top}px`);
      }
      top += heights[index];
    });
  }

  // Fixed-column scroll shadows

  protected updateScrollEdges(): void {
    const element = this.container().nativeElement;
    this.scrollTopState.set(element.scrollTop);
    this.viewportHeightState.set(element.clientHeight);
    // `scrollLeft` is negative when scrolled in a right-to-left container.
    const scrolled = Math.abs(element.scrollLeft);
    this.pingStart.set(scrolled > 0);
    this.pingEnd.set(scrolled + element.clientWidth < element.scrollWidth - 1);
  }
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');
}
