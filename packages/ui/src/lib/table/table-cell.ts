import { computed, Directive, input } from '@angular/core';
import clsx from 'clsx';

import type { AndesTableAlign } from './table';

/** Styles a native `<td>`, keeping its implicit `cell` role. */
@Directive({
  selector: 'td[andesTableCell]',
  host: { '[class]': 'classes()' },
})
export class AndesTableCell {
  /** Horizontal alignment - `end` for numeric columns. */
  readonly align = input<AndesTableAlign>('start');

  protected readonly classes = computed(() =>
    clsx('andes-table__cell', `andes-table__align--${this.align()}`),
  );
}
