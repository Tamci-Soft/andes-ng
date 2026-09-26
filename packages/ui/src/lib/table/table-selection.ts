import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { AndesTable } from './table';
import {
  ANDES_TABLE_SELECTABLE,
  type AndesTableRowKey,
  type AndesTableSelectable,
} from './table-context';
import { AndesTableRow } from './table-row';

/**
 * Row selection control (Ant's `rowSelection` cell): a native checkbox, or a
 * radio when the table's `selectionType` is `radio`. Place it in the row's first
 * cell; it selects the row whose `rowKey` it sits in.
 *
 * ```html
 * <tr andesTableRow [rowKey]="row.id">
 *   <td andesTableCell><andes-table-selection [label]="'Select ' + row.name" /></td>
 *   ...
 * ```
 *
 * State lives in `AndesTable.selectedKeys`. Shift-click extends a checkbox
 * selection over the range from the previously clicked row. A `disabled` control
 * is also skipped by "select all" (Ant's `getCheckboxProps({ disabled })`).
 */
@Component({
  selector: 'andes-table-selection',
  styleUrl: './table-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ANDES_TABLE_SELECTABLE, useExisting: AndesTableSelection },
  ],
  host: { class: 'andes-table-control' },
  template: `<input
    class="andes-table-control__input"
    [type]="table.selectionType()"
    [attr.name]="
      table.selectionType() === 'radio' ? table.radioGroupName : null
    "
    [checked]="checked()"
    [disabled]="isDisabled()"
    [attr.aria-label]="label()"
    (click)="onClick($event)"
  />`,
})
export class AndesTableSelection implements AndesTableSelectable {
  protected readonly table = inject(AndesTable);
  private readonly row = inject(AndesTableRow, { optional: true });

  /** Key of the row this control selects. Defaults to the enclosing row's `rowKey`. */
  readonly rowKey = input<AndesTableRowKey | undefined>(undefined);

  /** Prevent toggling this row; "select all" leaves it as it is. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Accessible name. Include something that identifies the row - e.g.
   * `Select INV-001` - so a screen-reader user hears which row it selects.
   */
  readonly label = input('Select row');

  readonly resolvedKey = computed(() => this.rowKey() ?? this.row?.rowKey());

  readonly isDisabled = computed(
    () => this.disabled() || this.resolvedKey() === undefined,
  );

  protected readonly checked = computed(() => {
    const key = this.resolvedKey();
    return key !== undefined && this.table.isSelected(key);
  });

  protected onClick(event: MouseEvent): void {
    const key = this.resolvedKey();
    if (key === undefined) {
      return;
    }

    this.table.toggleSelected(key, event.shiftKey);

    // The table's state is the source of truth; if a controlling parent rejected
    // the change the bound value never moved, so resync the native control.
    (event.target as HTMLInputElement).checked = this.checked();
  }
}

/**
 * "Select all" control for the selection column's header (Ant's header checkbox).
 * Checked when every rendered, enabled row is selected; indeterminate when only
 * some are. Toggling it selects or clears exactly those rows.
 *
 * With radio selection there is nothing to select all, so it renders only its
 * `label` as visually hidden text, keeping the header cell named. Leave it out
 * entirely for Ant's `hideSelectAll`.
 */
@Component({
  selector: 'andes-table-select-all',
  styleUrl: './table-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-table-control' },
  template: `@if (table.selectionType() === 'checkbox') {
      <input
        class="andes-table-control__input"
        type="checkbox"
        [checked]="table.selectAllState() === 'all'"
        [indeterminate]="table.selectAllState() === 'some'"
        [disabled]="!table.hasSelectableRows()"
        [attr.aria-label]="resolvedLabel()"
        (click)="onClick($event)"
      />
    } @else {
      <span class="andes-table-control__sr-only">{{ resolvedLabel() }}</span>
    }`,
})
export class AndesTableSelectAll {
  protected readonly table = inject(AndesTable);

  /** Accessible name. Defaults to "Select all rows" (checkbox) or "Selection" (radio). */
  readonly label = input<string | undefined>(undefined);

  protected readonly resolvedLabel = computed(
    () =>
      this.label() ??
      (this.table.selectionType() === 'radio'
        ? 'Selection'
        : 'Select all rows'),
  );

  protected onClick(event: MouseEvent): void {
    this.table.toggleAllSelected();

    const input = event.target as HTMLInputElement;
    const state = this.table.selectAllState();
    input.checked = state === 'all';
    input.indeterminate = state === 'some';
  }
}
