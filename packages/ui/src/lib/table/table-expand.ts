import {
  booleanAttribute,
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
 * Only render it for rows that can expand. In tree data, give leaf rows a
 * `spacer` instead, so their content lines up with their expandable siblings.
 *
 * Projected content replaces the default chevron, e.g. a plus/minus icon; read
 * the state through `#toggle="andesTableExpandToggle"` and `toggle.expanded()`.
 */
@Component({
  selector: 'andes-table-expand-toggle',
  exportAs: 'andesTableExpandToggle',
  styleUrl: './table-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-table-control' },
  template: `@if (spacer()) {
      <span
        class="andes-table-control__expand-spacer"
        aria-hidden="true"
      ></span>
    } @else {
      <button
        type="button"
        class="andes-table-control__expand"
        [attr.aria-expanded]="expanded()"
        [attr.aria-label]="label()"
        [disabled]="resolvedKey() === undefined"
        (click)="toggle()"
      >
        <ng-content
          ><span class="andes-table-control__chevron" aria-hidden="true"></span
        ></ng-content>
      </button>
    }`,
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

  /**
   * Render an empty box of the toggle's size instead of a button - for leaf rows
   * of tree data.
   */
  readonly spacer = input(false, { transform: booleanAttribute });

  protected readonly resolvedKey = computed(
    () => this.rowKey() ?? this.row?.rowKey(),
  );

  /** Whether the row this toggle controls is expanded. */
  readonly expanded = computed(() => {
    const key = this.resolvedKey();
    return key !== undefined && this.table.isExpanded(key);
  });

  /** Expands or collapses the row. */
  toggle(): void {
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
 * details cost nothing. With `forceRender` the content is rendered up front and
 * only hidden while collapsed, so its state (form inputs, a nested table's
 * scroll position) survives collapsing.
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

  /**
   * Render the content before the row is first expanded and keep it while
   * collapsed, hidden. Microsyntax: `*andesTableExpandedRow="row.id; forceRender: true"`.
   */
  readonly forceRender = input(false, {
    alias: 'andesTableExpandedRowForceRender',
    transform: booleanAttribute,
  });

  private view: EmbeddedViewRef<unknown> | undefined;

  constructor() {
    effect(() => {
      const expanded = this.table.isExpanded(this.rowKey());
      const keep = this.forceRender();

      if ((expanded || keep) && !this.view) {
        this.view = this.viewContainer.createEmbeddedView(this.template);
        for (const node of this.view.rootNodes) {
          if (node instanceof Element) {
            this.renderer.addClass(node, 'andes-table__row');
            this.renderer.addClass(node, 'andes-table__expanded-row');
          }
        }
      } else if (!expanded && !keep && this.view) {
        this.viewContainer.clear();
        this.view = undefined;
      }

      for (const node of this.view?.rootNodes ?? []) {
        if (node instanceof Element) {
          if (expanded) {
            this.renderer.removeAttribute(node, 'hidden');
          } else {
            this.renderer.setAttribute(node, 'hidden', '');
          }
        }
      }
    });
  }
}
