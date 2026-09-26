import { booleanAttribute, computed, Directive, input } from '@angular/core';
import clsx from 'clsx';

import type { AndesTableAlign } from './table';
import {
  andesCellModifiers,
  andesCssLength,
  type AndesTableFixed,
} from './table-context';

/**
 * Styles a native `<td>`, keeping its implicit `cell` role.
 *
 * `fixed` pins the cell (and, used on every cell of a column, the column) to an
 * edge while the table scrolls horizontally. Its offset from that edge is worked
 * out from the pinned cells before it unless `fixedOffset` sets it.
 */
@Directive({
  selector: 'td[andesTableCell]',
  host: {
    '[class]': 'classes()',
    '[style.inset-inline-start]': "fixed() === 'start' ? offset() : null",
    '[style.inset-inline-end]': "fixed() === 'end' ? offset() : null",
  },
})
export class AndesTableCell {
  /** Horizontal alignment - `end` for numeric columns. */
  readonly align = input<AndesTableAlign>('start');

  /** Pin this cell to the start or end edge of the scroll container. */
  readonly fixed = input<AndesTableFixed | undefined>(undefined);

  /**
   * Distance from the pinned edge: pixels or a CSS length. Leave it unset to have
   * the table sum the widths of the pinned cells before this one.
   */
  readonly fixedOffset = input<string | number | undefined>(undefined);

  /**
   * Truncate overflowing content on one line with an ellipsis. Needs a bounded
   * column width - `tableLayout="fixed"` or an explicit width.
   */
  readonly ellipsis = input(false, { transform: booleanAttribute });

  protected readonly offset = computed(() =>
    andesCssLength(this.fixedOffset()),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-table__cell',
      `andes-table__align--${this.align()}`,
      andesCellModifiers(this.fixed(), this.ellipsis()),
    ),
  );
}
