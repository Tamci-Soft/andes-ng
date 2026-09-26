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
  signal,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import {
  ANDES_TABLE_SELECTABLE,
  andesCssLength,
  type AndesTableRowKey,
} from './table-context';
import type { AndesFilterValue, AndesTableFilters } from './table-data';
import {
  andesNextSortDirection,
  type AndesSortDirection,
  type AndesSortState,
} from './table-sort';

/** Cell padding scale. Mirrors Ant Design's `size`, named for what it does. */
export type AndesTableDensity = 'compact' | 'default' | 'comfortable';

/** Visual placement of `<caption>`, independent of its required first-child position. */
export type AndesTableCaptionSide = 'top' | 'bottom';

/** Horizontal alignment of a header or data cell. Logical, so it follows writing direction. */
export type AndesTableAlign = 'start' | 'center' | 'end';

/** Row selection control kind - Ant's `rowSelection.type`. */
export type AndesTableSelectionType = 'checkbox' | 'radio';

/** CSS `table-layout`. `fixed` is what makes `ellipsis` cells truncate predictably. */
export type AndesTableLayout = 'auto' | 'fixed';

/** Aggregate state of the rendered, enabled row checkboxes, for "select all". */
export type AndesTableSelectAllState = 'all' | 'some' | 'none';

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
 * above / below the table (title, toolbar, pagination). The `andes-table__sr-only`
 * class visually hides projected text, e.g. to name an icon-only header cell.
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

  /** Draw borders around every cell instead of row separators only. */
  readonly bordered = input(false, { transform: booleanAttribute });

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

  /** Text announced to assistive tech while `loading` (Ant's Spin `tip`). */
  readonly loadingLabel = input('Loading');

  /**
   * Minimum table width (Ant's `scroll.x`): a number of pixels or any CSS length,
   * e.g. `'max-content'`. Narrower containers scroll horizontally.
   */
  readonly scrollX = input<string | number | undefined>(undefined);

  /**
   * Maximum body height (Ant's `scroll.y`): a number of pixels or any CSS length.
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
   * Sort several columns at once (Ant's `sorter.multiple`). Activating a header
   * then cycles only that column and keeps the others; state lives in `sorts`
   * instead of `sort`.
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
   * unsorted (Ant's `sortDirections`). A header's own `sortDirections` wins.
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

  /** Whether row selection uses checkboxes (many) or radios (one). */
  readonly selectionType = input<AndesTableSelectionType>('checkbox');

  /**
   * Keys of the selected rows (Ant's `selectedRowKeys`). Two-way bindable.
   * Keys of rows that are not currently rendered are kept, like Ant's
   * `preserveSelectedRowKeys`.
   */
  readonly selectedKeys = model<readonly AndesTableRowKey[]>([]);

  /** Keys of the expanded rows (Ant's `expandedRowKeys`). Two-way bindable. */
  readonly expandedKeys = model<readonly AndesTableRowKey[]>([]);

  /** Toggle a keyed row's expansion by clicking anywhere in it (Ant's `expandRowByClick`). */
  readonly expandRowByClick = input(false, { transform: booleanAttribute });

  /** Shared `name` for this table's radio buttons, so they form one group. */
  readonly radioGroupName = `andes-table-${nextTableId++}-selection`;

  private readonly selectables = contentChildren(ANDES_TABLE_SELECTABLE, {
    descendants: true,
  });

  private readonly container =
    viewChild.required<ElementRef<HTMLElement>>('container');

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

  /** Keys of the rendered, enabled selection controls, in document order. */
  private readonly enabledKeys = computed(() =>
    this.selectables()
      .filter((item) => !item.isDisabled())
      .map((item) => item.resolvedKey())
      .filter((key): key is AndesTableRowKey => key !== undefined),
  );

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
      this.scrollYLength() && 'andes-table--sticky-header',
      this.pingStart() && 'andes-table--ping-start',
      this.pingEnd() && 'andes-table--ping-end',
    ),
  );

  constructor() {
    afterEveryRender({ write: () => this.syncFixedOffsets() });

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
  }

  // Filtering

  /** Values currently filtering `columnId` (empty when it is not filtered). */
  filterValueFor(columnId: string): readonly AndesFilterValue[] {
    return this.filters()[columnId] ?? [];
  }

  /** Replaces `columnId`'s filter; an empty `values` removes it. */
  setFilter(columnId: string, values: readonly AndesFilterValue[]): void {
    const next = { ...this.filters() };
    if (values.length === 0) {
      delete next[columnId];
    } else {
      next[columnId] = [...values];
    }
    this.filters.set(next);
  }

  // Selection

  isSelected(key: AndesTableRowKey): boolean {
    return this.selectedSet().has(key);
  }

  /**
   * Selects or deselects one row. For radios this makes it the only selection.
   * With `extendRange` (a Shift-click on a checkbox) every enabled row between the
   * previous anchor and `key` takes the new state too, as in Ant v5.
   */
  toggleSelected(key: AndesTableRowKey, extendRange = false): void {
    if (this.selectionType() === 'radio') {
      this.selectedKeys.set([key]);
      this.rangeAnchor = key;
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
  }

  /**
   * "Select all": selects every rendered, enabled row, or clears them when they
   * are already all selected. Disabled rows and rows that are not rendered keep
   * whatever state they had.
   */
  toggleAllSelected(): void {
    this.applySelection(this.enabledKeys(), this.selectAllState() !== 'all');
  }

  private applySelection(
    keys: readonly AndesTableRowKey[],
    select: boolean,
  ): void {
    const current = this.selectedKeys();

    if (select) {
      const set = new Set(current);
      this.selectedKeys.set([
        ...current,
        ...keys.filter((key) => !set.has(key)),
      ]);
      return;
    }

    const removed = new Set(keys);
    this.selectedKeys.set(current.filter((key) => !removed.has(key)));
  }

  // Expansion

  isExpanded(key: AndesTableRowKey): boolean {
    return this.expandedSet().has(key);
  }

  toggleExpanded(key: AndesTableRowKey): void {
    const keys = this.expandedKeys();
    this.expandedKeys.set(
      this.isExpanded(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  }

  // Fixed columns

  /**
   * Gives every pinned cell without an explicit `fixedOffset` its distance from
   * the pinned edge: the summed width of the pinned cells before it in its row
   * (Ant computes the same from column widths). Written as a custom property the
   * stylesheet reads, so an explicit `fixedOffset` inline style still wins.
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

  // Fixed-column scroll shadows

  protected updateScrollEdges(): void {
    const element = this.container().nativeElement;
    // `scrollLeft` is negative when scrolled in a right-to-left container.
    const scrolled = Math.abs(element.scrollLeft);
    this.pingStart.set(scrolled > 0);
    this.pingEnd.set(scrolled + element.clientWidth < element.scrollWidth - 1);
  }
}
