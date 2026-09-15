import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';
import clsx from 'clsx';

import type { AndesSortDirection, AndesSortState } from './table-sort';

/** Cell padding scale. Mirrors Ant Design's `size`, named for what it does. */
export type AndesTableDensity = 'compact' | 'default' | 'comfortable';

/** Visual placement of `<caption>`, independent of its required first-child position. */
export type AndesTableCaptionSide = 'top' | 'bottom';

/** Horizontal alignment of a header or data cell. Logical, so it follows writing direction. */
export type AndesTableAlign = 'start' | 'center' | 'end';

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
 * the ordered array to render.
 */
@Component({
  selector: 'andes-table',
  templateUrl: './table.html',
  styleUrl: './table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTable {
  /** Draw borders around every cell instead of row separators only. */
  readonly bordered = input(false, { transform: booleanAttribute });

  /** Cell padding scale. */
  readonly density = input<AndesTableDensity>('default');

  /** Highlight the row under the pointer. */
  readonly rowHover = input(true, { transform: booleanAttribute });

  /** Render the caption above or below the table. */
  readonly captionSide = input<AndesTableCaptionSide>('bottom');

  /**
   * Sorted column and direction, or `null` for unsorted. Two-way bindable, and
   * equally usable uncontrolled - the table updates it itself when a sortable
   * header is activated.
   */
  readonly sort = model<AndesSortState | null>(null);

  protected readonly tableClasses = computed(() =>
    clsx(
      'andes-table',
      `andes-table--${this.density()}`,
      `andes-table--caption-${this.captionSide()}`,
      this.bordered() && 'andes-table--bordered',
      this.rowHover() && 'andes-table--hoverable',
    ),
  );

  /** Current direction for `columnId`, or `null` when that column is not sorted. */
  directionFor(columnId: string): AndesSortDirection | null {
    const sort = this.sort();
    return sort?.columnId === columnId ? sort.direction : null;
  }

  /**
   * Advances `columnId` through the sort cycle: unsorted -> ascending ->
   * descending -> unsorted. Activating a different column starts it at ascending
   * and drops the previous one, so only one column is ever sorted.
   */
  toggleSort(columnId: string): void {
    const direction = this.directionFor(columnId);

    if (direction === null) {
      this.sort.set({ columnId, direction: 'asc' });
      return;
    }

    if (direction === 'asc') {
      this.sort.set({ columnId, direction: 'desc' });
      return;
    }

    this.sort.set(null);
  }
}
