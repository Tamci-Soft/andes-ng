import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Empty state for a table body: an illustration and a message, "No data" unless
 * you project your own. Put it in a single cell that spans every column,
 * typically from a `@for`'s `@empty` block:
 *
 * ```html
 * @for (row of rows(); track row.id) { ... } @empty {
 *   <tr andesTableRow>
 *     <td andesTableCell colspan="4"><andes-table-empty>No invoices yet</andes-table-empty></td>
 *   </tr>
 * }
 * ```
 */
@Component({
  selector: 'andes-table-empty',
  styleUrl: './table-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-table-empty' },
  template: `<span class="andes-table-empty__icon" aria-hidden="true"></span>
    <span class="andes-table-empty__text"
      ><ng-content>No data</ng-content></span
    >`,
})
export class AndesTableEmpty {}
