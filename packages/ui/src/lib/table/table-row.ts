import { computed, Directive, inject, input } from '@angular/core';

import { AndesTable } from './table';
import type { AndesTableRowKey } from './table-context';

// Clicks that land on these belong to the control, never to "expand row by click".
const INTERACTIVE =
  'a, button, input, select, textarea, label, summary, [tabindex], [contenteditable]';

/**
 * Styles a native `<tr>`, keeping its implicit `row` role.
 *
 * Give a body row a `rowKey` (Ant's `rowKey`) to make it selectable and
 * expandable: the `andes-table-selection` and `andes-table-expand-toggle`
 * controls inside it read the key from here, and the row reflects the table's
 * selection/expansion state as `andes-table__row--selected` /
 * `andes-table__row--expanded` classes and a `data-row-key` attribute.
 */
@Directive({
  selector: 'tr[andesTableRow]',
  host: {
    class: 'andes-table__row',
    '[class.andes-table__row--selected]': 'selected()',
    '[class.andes-table__row--expanded]': 'expanded()',
    '[class.andes-table__row--clickable]': 'expandByClick()',
    '[attr.data-row-key]': 'rowKey() ?? null',
    '(click)': 'onClick($event)',
  },
})
export class AndesTableRow {
  private readonly table = inject(AndesTable, { optional: true });

  /** Unique key of the record this row renders. */
  readonly rowKey = input<AndesTableRowKey | undefined>(undefined);

  /** Whether this row is in the table's `selectedKeys`. */
  readonly selected = computed(() => {
    const key = this.rowKey();
    return key !== undefined && !!this.table?.isSelected(key);
  });

  /** Whether this row is in the table's `expandedKeys`. */
  readonly expanded = computed(() => {
    const key = this.rowKey();
    return key !== undefined && !!this.table?.isExpanded(key);
  });

  protected readonly expandByClick = computed(
    () => this.rowKey() !== undefined && !!this.table?.expandRowByClick(),
  );

  protected onClick(event: MouseEvent): void {
    const key = this.rowKey();
    if (!this.expandByClick() || key === undefined) {
      return;
    }

    const target = event.target as Element | null;
    const host = event.currentTarget as Element;
    const interactive = target?.closest(INTERACTIVE);
    if (interactive && host.contains(interactive)) {
      return;
    }

    this.table?.toggleExpanded(key);
  }
}
