import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import clsx from 'clsx';

import { AndesTable, type AndesTableAlign } from './table';
import {
  andesCellModifiers,
  andesCssLength,
  type AndesTableFixed,
} from './table-context';
import type { AndesSortDirection } from './table-sort';

/** `scope` values a header cell can declare. */
export type AndesTableHeadScope = 'col' | 'row' | 'colgroup' | 'rowgroup';

/** Keyboard resize step, in pixels (Shift multiplies it by 5). */
const RESIZE_STEP = 10;

let nextHeadId = 0;

function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined || value === null
    ? undefined
    : booleanAttribute(value);
}

/**
 * Styles a native `<th>` and, when given a `sortKey`, turns it into the sort control
 * for that column.
 *
 * `scope` defaults to `col`, which is what makes a column header actually announce the
 * column it heads; pass `scope="row"` for a row header inside `<tbody>`.
 *
 * Sorting is opt-in through `sortKey` alone - there is no separate `sortable` flag to
 * get out of step with it. A header with a key is keyboard reachable, exposes
 * `aria-sort` (`ascending`/`descending`/`none`), and cycles
 * unsorted -> ascending -> descending -> unsorted on click, Enter or Space. The state
 * lives in the parent `AndesTable`, so activating one column clears the others
 * (unless the table has `multiSort`). The directions cycled through come from
 * `sortDirections` here or on the table.
 *
 * `fixed`/`fixedOffset`/`ellipsis` work as on `AndesTableCell`.
 *
 * The content is laid out like Ant Design's header: the projected title takes the
 * free width, followed by the sort indicator and then any `andes-table-filter`,
 * which sits at the cell's inline end.
 *
 * Resizing: with `resizable` here or on the table, a header with a column key
 * (`columnKey`, or else `sortKey`) gets a drag handle on its inline-end edge. The
 * width lands in `AndesTable.columnWidths` and `(columnResize)`, clamped to
 * `minWidth`/`maxWidth`. The handle is a focusable `role="separator"`: Arrow
 * Left/Right resize by 10px (50px with Shift, mirrored in right-to-left), Home/End
 * jump to the limits, and Enter - like a double-click - fits the column to its
 * content. `width` sets a starting width (Ant's column `width`).
 */
@Component({
  // A component on the native <th> (not a wrapper element) so the table keeps its
  // real cell semantics; the template only arranges the cell's own content.
  selector: 'th[andesTableHead]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="andes-table__head-content">
      <span class="andes-table__head-title" [id]="id + '-title'"
        ><ng-content
      /></span>
      @if (sortKey()) {
        <span class="andes-table__sorter" aria-hidden="true">
          <span
            class="andes-table__sorter-caret andes-table__sorter-caret--up"
          ></span>
          <span
            class="andes-table__sorter-caret andes-table__sorter-caret--down"
          ></span>
        </span>
      }
      <ng-content select="andes-table-filter" />
    </div>
    @if (isResizable()) {
      <span
        class="andes-table__resize-handle"
        [class.andes-table__resize-handle--active]="dragging()"
        role="separator"
        aria-orientation="vertical"
        tabindex="0"
        [attr.aria-labelledby]="id + '-resize ' + id + '-title'"
        [attr.aria-valuenow]="currentWidth()"
        [attr.aria-valuemin]="minWidth()"
        [attr.aria-valuemax]="maxWidth() ?? null"
        (pointerdown)="onResizeStart($event)"
        (dblclick)="autoFit()"
        (keydown)="onResizeKey($event)"
        (focus)="measure()"
        (click)="$event.stopPropagation()"
        (mousedown)="$event.stopPropagation()"
        (touchstart)="$event.stopPropagation()"
      >
        <span class="andes-table__sr-only" [id]="id + '-resize'">{{
          resizeText()
        }}</span>
      </span>
    }`,
  host: {
    '[class]': 'classes()',
    '[attr.scope]': 'scope()',
    '[attr.aria-sort]': 'ariaSort()',
    '[attr.tabindex]': 'sortKey() ? 0 : null',
    '[attr.data-sort]': 'direction()',
    '[attr.data-sort-priority]': 'sortPriority()',
    '[style.inset-inline-start]': "fixed() === 'start' ? offset() : null",
    '[style.inset-inline-end]': "fixed() === 'end' ? offset() : null",
    '[style.width]': 'resolvedWidth()',
    '(click)': 'toggleSort()',
    '(keydown.enter)': 'onActivateKey($event)',
    '(keydown.space)': 'onActivateKey($event)',
  },
})
export class AndesTableHead {
  private readonly table = inject(AndesTable);
  private readonly host = inject<ElementRef<HTMLTableCellElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly id = `andes-table-head-${nextHeadId++}`;

  /**
   * Column id this header sorts by. Must match the key of the accessor handed to
   * `andesSortRows`. Leave it unset for a header that is not sortable.
   */
  readonly sortKey = input<string | undefined>(undefined);

  /** `scope` attribute. `col` for a column header, `row` for a row header. */
  readonly scope = input<AndesTableHeadScope>('col');

  /** Horizontal alignment - keep it identical to the column's cells. */
  readonly align = input<AndesTableAlign>('start');

  /**
   * Directions this column cycles through before returning to unsorted.
   * Defaults to the table's `sortDirections`.
   */
  readonly sortDirections = input<readonly AndesSortDirection[] | undefined>(
    undefined,
  );

  /** Pin this header to the start or end edge of the scroll container. */
  readonly fixed = input<AndesTableFixed | undefined>(undefined);

  /**
   * Distance from the pinned edge: pixels or a CSS length. Leave it unset to have
   * the table sum the widths of the pinned cells before this one.
   */
  readonly fixedOffset = input<string | number | undefined>(undefined);

  /** Truncate overflowing header text on one line with an ellipsis. */
  readonly ellipsis = input(false, { transform: booleanAttribute });

  /**
   * Id of the column for resizing and reordering. Defaults to `sortKey`; set it on
   * a header that is not sortable.
   */
  readonly columnKey = input<string | undefined>(undefined);

  /** Starting width: pixels or a CSS length. A resized width replaces it. */
  readonly width = input<string | number | undefined>(undefined);

  /** Show a resize handle. Defaults to the table's `resizable`. */
  readonly resizable = input<boolean | undefined, unknown>(undefined, {
    transform: optionalBoolean,
  });

  /** Narrowest width, in pixels, a resize may reach. */
  readonly minWidth = input(48);

  /** Widest width, in pixels, a resize may reach. Unbounded when unset. */
  readonly maxWidth = input<number | undefined>(undefined);

  /** Start of the resize handle's accessible name; the column title follows it. */
  readonly resizeText = input('Resize column');

  /** Id this column is stored under in the table's width and order state. */
  readonly key = computed(() => this.columnKey() ?? this.sortKey());

  protected readonly isResizable = computed(
    () => !!this.key() && (this.resizable() ?? this.table.resizable()),
  );

  /** This header's handle is being dragged. */
  protected readonly dragging = signal(false);

  /** Last width this header was measured or resized to, for `aria-valuenow`. */
  private readonly measuredWidth = signal<number | null>(null);

  protected readonly currentWidth = computed(() => {
    const key = this.key();
    const stored = key === undefined ? undefined : this.table.widthFor(key);
    return stored ?? this.measuredWidth();
  });

  protected readonly resolvedWidth = computed(() => {
    const key = this.key();
    const stored = key === undefined ? undefined : this.table.widthFor(key);
    return stored === undefined ? andesCssLength(this.width()) : `${stored}px`;
  });

  protected readonly offset = computed(() =>
    andesCssLength(this.fixedOffset()),
  );

  /** Direction this column is sorted in, or `null` when it is not the sorted column. */
  readonly direction = computed<AndesSortDirection | null>(() => {
    const key = this.sortKey();
    return key ? this.table.directionFor(key) : null;
  });

  /**
   * This column's rank among several sorted columns (`multiSort`); `null` when
   * it is the only sorted column or not sorted at all.
   */
  protected readonly sortPriority = computed(() => {
    const key = this.sortKey();
    if (!key || this.table.sortedColumnCount() < 2) {
      return null;
    }
    return this.table.sortPriorityFor(key);
  });

  protected readonly ariaSort = computed(() => {
    if (!this.sortKey()) {
      return null;
    }

    switch (this.direction()) {
      case 'asc':
        return 'ascending';
      case 'desc':
        return 'descending';
      default:
        return 'none';
    }
  });

  protected readonly classes = computed(() =>
    clsx(
      'andes-table__head',
      `andes-table__align--${this.align()}`,
      this.sortKey() && 'andes-table__head--sortable',
      this.direction() && 'andes-table__head--sorted',
      this.isResizable() && 'andes-table__head--resizable',
      andesCellModifiers(this.fixed(), this.ellipsis()),
    ),
  );

  /** Advances this column through the sort cycle. No-op without a `sortKey`. */
  toggleSort(): void {
    const key = this.sortKey();
    if (key) {
      this.table.toggleSort(key, this.sortDirections());
    }
  }

  protected onActivateKey(event: Event): void {
    if (!this.sortKey()) {
      return;
    }

    // Space would scroll the page otherwise, and Enter can submit an enclosing form.
    event.preventDefault();
    this.toggleSort();
  }

  // Resizing

  /** Reads the rendered width into `aria-valuenow`. */
  protected measure(): number {
    const width = Math.round(
      this.host.nativeElement.getBoundingClientRect().width,
    );
    this.measuredWidth.set(width);
    return width;
  }

  protected onResizeStart(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    // No text selection, no focus jump to the <th>, no sort or drag of the header.
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = this.measure();
    const sign = this.isRtl() ? -1 : 1;
    const body = document.body.style;
    const previous = { cursor: body.cursor, userSelect: body.userSelect };
    body.cursor = 'col-resize';
    body.userSelect = 'none';
    this.table.setResizing(true);
    this.dragging.set(true);

    const move = (moveEvent: PointerEvent) =>
      this.resizeTo(startWidth + (moveEvent.clientX - startX) * sign);
    // eslint-disable-next-line prefer-const -- `end` and the unregister refer to each other
    let unregister: () => void;
    const end = () => {
      unregister();
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      body.cursor = previous.cursor;
      body.userSelect = previous.userSelect;
      this.table.setResizing(false);
      this.dragging.set(false);
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    unregister = this.destroyRef.onDestroy(end);
  }

  protected onResizeKey(event: KeyboardEvent): void {
    // Keys on the handle belong to it: never a sort, never a column move.
    event.stopPropagation();

    const step = RESIZE_STEP * (event.shiftKey ? 5 : 1);
    // The handle sits on the inline-end edge, so "toward the end" widens the column;
    // in right-to-left that is ArrowLeft.
    const grow = this.isRtl() ? 'ArrowLeft' : 'ArrowRight';
    const shrink = this.isRtl() ? 'ArrowRight' : 'ArrowLeft';
    const width = this.currentWidth() ?? this.measure();

    switch (event.key) {
      case grow:
        this.resizeTo(width + step);
        break;
      case shrink:
        this.resizeTo(width - step);
        break;
      case 'Home':
        this.resizeTo(this.minWidth());
        break;
      case 'End':
        if (this.maxWidth() === undefined) {
          return;
        }
        this.resizeTo(this.maxWidth() as number);
        break;
      case 'Enter':
        this.autoFit();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  /**
   * Fits the column to its widest content: this header and every body/footer cell
   * in the same position, each measured on one line.
   */
  autoFit(): void {
    const th = this.host.nativeElement;
    const table = th.closest('table');
    const headerRow = th.parentElement as HTMLTableRowElement | null;
    if (!table || !headerRow || typeof document.createRange !== 'function') {
      return;
    }

    const index = th.cellIndex;
    const columns = headerRow.cells.length;
    const cells = [
      ...Array.from(table.tBodies).flatMap((body) => Array.from(body.rows)),
      ...Array.from(table.tFoot?.rows ?? []),
    ]
      // Rows that span columns (expanded details, empty states) do not line up.
      .filter((row) => row.cells.length === columns)
      .map((row) => row.cells[index]);

    let widest = this.contentWidth(th, this.headContentWidth());
    for (const cell of cells) {
      widest = Math.max(
        widest,
        this.contentWidth(cell, this.naturalWidth(cell)),
      );
    }
    if (widest > 0) {
      this.resizeTo(Math.ceil(widest));
    }
  }

  private resizeTo(width: number): void {
    const key = this.key();
    if (key === undefined) {
      return;
    }
    const max = this.maxWidth() ?? Number.POSITIVE_INFINITY;
    const clamped = Math.round(Math.min(Math.max(width, this.minWidth()), max));
    this.measuredWidth.set(clamped);
    this.table.resizeColumn(key, clamped);
  }

  /** A cell's content width plus its own inline padding and borders. */
  private contentWidth(cell: HTMLElement, content: number): number {
    const style = getComputedStyle(cell);
    const extra = [
      style.paddingInlineStart,
      style.paddingInlineEnd,
      style.borderInlineStartWidth,
      style.borderInlineEndWidth,
    ].reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    return content + extra;
  }

  /** Width of `element`'s contents laid out on a single line. */
  private naturalWidth(element: HTMLElement): number {
    const range = document.createRange();
    range.selectNodeContents(element);
    const previous = element.style.whiteSpace;
    element.style.whiteSpace = 'nowrap';
    const width = range.getBoundingClientRect?.().width ?? 0;
    element.style.whiteSpace = previous;
    return width;
  }

  /** The header row's needs: title text, sorter, filter and the gaps between. */
  private headContentWidth(): number {
    const content = this.host.nativeElement.querySelector<HTMLElement>(
      '.andes-table__head-content',
    );
    if (!content) {
      return this.naturalWidth(this.host.nativeElement);
    }
    const parts = Array.from(content.children) as HTMLElement[];
    const gap = parseFloat(getComputedStyle(content).columnGap) || 0;
    return parts.reduce(
      (sum, part, i) =>
        sum +
        (part.classList.contains('andes-table__head-title')
          ? this.naturalWidth(part)
          : part.getBoundingClientRect().width) +
        (i > 0 ? gap : 0),
      0,
    );
  }

  private isRtl(): boolean {
    return getComputedStyle(this.host.nativeElement).direction === 'rtl';
  }
}
