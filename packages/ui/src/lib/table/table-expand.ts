import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  effect,
  type EmbeddedViewRef,
  inject,
  input,
  Renderer2,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import { AndesTable } from './table';
import type { AndesTableRowKey } from './table-context';
import { AndesTableRow } from './table-row';

/**
 * Expand/collapse button for a row. Place it in a cell of the row whose details
 * it reveals; it toggles that row's `rowKey` in
 * `AndesTable.expandedKeys` and exposes the state through `aria-expanded`.
 *
 * Only render it for rows that can expand.
 */
@Component({
  selector: 'andes-table-expand-toggle',
  styleUrl: './table-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-table-control' },
  template: `<button
    type="button"
    class="andes-table-control__expand"
    [attr.aria-expanded]="expanded()"
    [attr.aria-label]="label()"
    [disabled]="resolvedKey() === undefined"
    (click)="toggle()"
  >
    <span class="andes-table-control__chevron" aria-hidden="true"></span>
  </button>`,
})
export class AndesTableExpandToggle {
  private readonly table = inject(AndesTable);
  private readonly row = inject(AndesTableRow, { optional: true });

  /** Key of the row this button expands. Defaults to the enclosing row's `rowKey`. */
  readonly rowKey = input<AndesTableRowKey | undefined>(undefined);

  /**
   * Accessible name. Kept constant while `aria-expanded` carries the state, so
   * include the row's identity, e.g. `Details for INV-001`.
   */
  readonly label = input('Row details');

  protected readonly resolvedKey = computed(
    () => this.rowKey() ?? this.row?.rowKey(),
  );

  protected readonly expanded = computed(() => {
    const key = this.resolvedKey();
    return key !== undefined && this.table.isExpanded(key);
  });

  protected toggle(): void {
    const key = this.resolvedKey();
    if (key !== undefined) {
      this.table.toggleExpanded(key);
    }
  }
}

/**
 * Structural directive for a row's expanded content.
 * Renders its template - normally a full-width `<tr>` right after the row it
 * belongs to - only while that key is in `AndesTable.expandedKeys`, so collapsed
 * details cost nothing.
 *
 * ```html
 * @for (row of rows(); track row.id) {
 *   <tr andesTableRow [rowKey]="row.id">...</tr>
 *   <tr *andesTableExpandedRow="row.id">
 *     <td andesTableCell colspan="5">{{ row.notes }}</td>
 *   </tr>
 * }
 * ```
 */
@Directive({ selector: '[andesTableExpandedRow]' })
export class AndesTableExpandedRow {
  private readonly table = inject(AndesTable);
  private readonly template = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly renderer = inject(Renderer2);

  /** Key of the row whose details this is. */
  readonly rowKey = input.required<AndesTableRowKey>({
    alias: 'andesTableExpandedRow',
  });

  private view: EmbeddedViewRef<unknown> | undefined;

  constructor() {
    effect(() => {
      const expanded = this.table.isExpanded(this.rowKey());

      if (expanded && !this.view) {
        this.view = this.viewContainer.createEmbeddedView(this.template);
        for (const node of this.view.rootNodes) {
          if (node instanceof Element) {
            this.renderer.addClass(node, 'andes-table__row');
            this.renderer.addClass(node, 'andes-table__expanded-row');
          }
        }
      } else if (!expanded && this.view) {
        this.viewContainer.clear();
        this.view = undefined;
      }
    });
  }
}
