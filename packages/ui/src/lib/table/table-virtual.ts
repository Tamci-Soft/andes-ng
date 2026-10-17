import {
  DestroyRef,
  Directive,
  effect,
  type EmbeddedViewRef,
  inject,
  input,
  numberAttribute,
  Renderer2,
  TemplateRef,
  untracked,
  ViewContainerRef,
} from '@angular/core';

import { AndesTable, type AndesTableVirtualRowsHandle } from './table';

/** Template context of each row rendered by `*andesTableVirtualRows`. */
export interface AndesTableVirtualRowContext<TRow> {
  /** The row record. */
  $implicit: TRow;
  /** Index of the row in the whole list, not in the rendered window. */
  index: number;
  /** Length of the whole list. */
  count: number;
}

/** Rows rendered before the container has been measured (first paint, tests). */
const UNMEASURED_VIEWPORT = 800;

/**
 * Renders only the body rows inside (and just around) the visible part of a
 * table with `scrollY`, so lists of thousands of rows stay fast. A use of
 * `@for` becomes:
 *
 * ```html
 * <andes-table scrollY="400" [selectableKeys]="allIds()">
 *   ...
 *   <tbody andesTableBody>
 *     <tr
 *       *andesTableVirtualRows="let row of rows(); rowHeight: 45; let i = index"
 *       andesTableRow
 *       [rowKey]="row.id"
 *     >
 *       <td andesTableCell>{{ row.name }}</td>
 *     </tr>
 *   </tbody>
 * </andes-table>
 * ```
 *
 * Every row must be exactly `rowHeight` pixels tall - each rendered row is given
 * that height, so keep its content on one line (`ellipsis` helps). Rows outside
 * the window are replaced by two spacer rows, the row elements are reused as the
 * window moves, and the table reports the full `aria-rowcount` with an
 * `aria-rowindex` on each rendered row, so assistive tech still hears the real
 * size and position.
 *
 * Expanded detail rows are not supported inside a virtual list. Because rows
 * outside the window are not rendered, give the table `selectableKeys` so
 * "select all" covers the whole list.
 */
@Directive({ selector: '[andesTableVirtualRows]' })
export class AndesTableVirtualRows<
  TRow,
> implements AndesTableVirtualRowsHandle {
  private readonly table = inject(AndesTable);
  private readonly template =
    inject<TemplateRef<AndesTableVirtualRowContext<TRow>>>(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly renderer = inject(Renderer2);

  /**
   * Every row of the list. `let row of rows` in the microsyntax binds `of` to
   * `<selector>Of`, which is why the input carries that name.
   */
  readonly andesTableVirtualRowsOf = input.required<readonly TRow[]>();

  /** Height of every row, in pixels. */
  readonly rowHeight = input.required<number, unknown>({
    alias: 'andesTableVirtualRowsRowHeight',
    transform: numberAttribute,
  });

  /** Extra rows rendered above and below the visible ones. */
  readonly overscan = input<number, unknown>(6, {
    alias: 'andesTableVirtualRowsOverscan',
    transform: numberAttribute,
  });

  private readonly views: EmbeddedViewRef<AndesTableVirtualRowContext<TRow>>[] =
    [];
  private topSpacer: HTMLTableRowElement | undefined;
  private bottomSpacer: HTMLTableRowElement | undefined;

  /** Types `let row` in the template as the row type. */
  static ngTemplateContextGuard<TRow>(
    _directive: AndesTableVirtualRows<TRow>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- named for the type predicate only
    context: unknown,
  ): context is AndesTableVirtualRowContext<TRow> {
    return true;
  }

  constructor() {
    this.table.registerVirtualRows(this);
    inject(DestroyRef).onDestroy(() => {
      this.table.registerVirtualRows(undefined);
      this.topSpacer?.remove();
      this.bottomSpacer?.remove();
    });

    effect(() => {
      const rows = this.andesTableVirtualRowsOf();
      const rowHeight = Math.max(1, this.rowHeight());
      const overscan = Math.max(0, this.overscan());
      const scrollTop = this.table.scrollTop();
      const viewport = this.table.viewportHeight();
      untracked(() =>
        this.render(rows, rowHeight, overscan, scrollTop, viewport),
      );
    });
  }

  offsetOf(index: number): number {
    return this.regionStart() + index * this.rowHeight();
  }

  /**
   * Offset of the first virtual row within the scroll container's content. The
   * spacer row's offset parent is the table, and the table's is the wrapper the
   * container starts at, so layout offsets add up without a scroll correction.
   */
  private regionStart(): number {
    const spacer = this.topSpacer;
    const table = spacer?.closest('table');
    const container = spacer?.closest<HTMLElement>('.andes-table__container');
    if (!spacer || !table || !container) {
      return 0;
    }
    return spacer.offsetTop + table.offsetTop - container.offsetTop;
  }

  private render(
    rows: readonly TRow[],
    rowHeight: number,
    overscan: number,
    scrollTop: number,
    viewport: number,
  ): void {
    this.ensureSpacers();
    const count = rows.length;
    const height = viewport > 0 ? viewport : UNMEASURED_VIEWPORT;
    const offset = scrollTop - this.regionStart();

    const first = Math.min(
      count,
      Math.max(0, Math.floor(offset / rowHeight) - overscan),
    );
    const last = Math.min(
      count,
      Math.max(first, Math.ceil((offset + height) / rowHeight) + overscan),
    );

    const table = this.topSpacer?.closest('table');
    const headerRows = table?.tHead?.rows.length ?? 0;
    if (table) {
      this.renderer.setAttribute(
        table,
        'aria-rowcount',
        String(count + headerRows),
      );
    }

    const size = last - first;
    while (this.views.length > size) {
      this.views.pop()?.destroy();
    }

    for (let slot = 0; slot < size; slot++) {
      const index = first + slot;
      let view = this.views[slot];
      if (view) {
        view.context.$implicit = rows[index];
        view.context.index = index;
        view.context.count = count;
      } else {
        view = this.viewContainer.createEmbeddedView(this.template, {
          $implicit: rows[index],
          index,
          count,
        });
        this.views.push(view);
      }
      view.detectChanges();

      for (const node of view.rootNodes) {
        if (node instanceof HTMLElement) {
          this.renderer.setStyle(node, 'height', `${rowHeight}px`);
          this.renderer.setAttribute(
            node,
            'aria-rowindex',
            String(headerRows + index + 1),
          );
        }
      }
    }

    this.sizeSpacer(this.topSpacer, first * rowHeight);
    this.sizeSpacer(this.bottomSpacer, (count - last) * rowHeight);
  }

  private ensureSpacers(): void {
    const anchor = this.viewContainer.element.nativeElement as Node;
    const parent = anchor.parentNode;
    if (!parent || this.topSpacer) {
      return;
    }

    this.topSpacer = this.createSpacer();
    this.bottomSpacer = this.createSpacer();
    // Views are inserted right before the anchor, so the top spacer goes before
    // them and the bottom one after the anchor.
    this.renderer.insertBefore(parent, this.topSpacer, anchor);
    this.renderer.insertBefore(parent, this.bottomSpacer, anchor.nextSibling);
  }

  private createSpacer(): HTMLTableRowElement {
    const row: HTMLTableRowElement = this.renderer.createElement('tr');
    this.renderer.addClass(row, 'andes-table__virtual-spacer');
    this.renderer.setAttribute(row, 'aria-hidden', 'true');
    this.renderer.appendChild(row, this.renderer.createElement('td'));
    return row;
  }

  private sizeSpacer(row: HTMLTableRowElement | undefined, height: number) {
    if (!row) {
      return;
    }
    const cell = row.cells[0];
    const header = row.closest('table')?.tHead?.rows[0];
    const columns = header
      ? Array.from(header.cells).reduce((sum, cell) => sum + cell.colSpan, 0)
      : 1;
    this.renderer.setAttribute(cell, 'colspan', String(Math.max(1, columns)));
    this.renderer.setStyle(cell, 'height', `${height}px`);
    if (height > 0) {
      this.renderer.removeAttribute(row, 'hidden');
    } else {
      this.renderer.setAttribute(row, 'hidden', '');
    }
  }
}
