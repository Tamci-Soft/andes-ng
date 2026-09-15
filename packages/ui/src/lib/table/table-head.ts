import { computed, Directive, inject, input } from '@angular/core';
import clsx from 'clsx';

import { AndesTable, type AndesTableAlign } from './table';
import type { AndesSortDirection } from './table-sort';

/** `scope` values a header cell can declare. */
export type AndesTableHeadScope = 'col' | 'row' | 'colgroup' | 'rowgroup';

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
 * lives in the parent `AndesTable`, so activating one column clears the others.
 */
@Directive({
  selector: 'th[andesTableHead]',
  host: {
    '[class]': 'classes()',
    '[attr.scope]': 'scope()',
    '[attr.aria-sort]': 'ariaSort()',
    '[attr.tabindex]': 'sortKey() ? 0 : null',
    '[attr.data-sort]': 'direction()',
    '(click)': 'toggleSort()',
    '(keydown.enter)': 'onActivateKey($event)',
    '(keydown.space)': 'onActivateKey($event)',
  },
})
export class AndesTableHead {
  private readonly table = inject(AndesTable);

  /**
   * Column id this header sorts by. Must match the key of the accessor handed to
   * `andesSortRows`. Leave it unset for a header that is not sortable.
   */
  readonly sortKey = input<string | undefined>(undefined);

  /** `scope` attribute. `col` for a column header, `row` for a row header. */
  readonly scope = input<AndesTableHeadScope>('col');

  /** Horizontal alignment - keep it identical to the column's cells. */
  readonly align = input<AndesTableAlign>('start');

  /** Direction this column is sorted in, or `null` when it is not the sorted column. */
  readonly direction = computed<AndesSortDirection | null>(() => {
    const key = this.sortKey();
    return key ? this.table.directionFor(key) : null;
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
    ),
  );

  /** Advances this column through the sort cycle. No-op without a `sortKey`. */
  toggleSort(): void {
    const key = this.sortKey();
    if (key) {
      this.table.toggleSort(key);
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
}
