import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * Styles a native `<tfoot>` - the place for a totals or summary row.
 *
 * `fixed` keeps the summary pinned to the bottom of the scroll area while the body
 * scrolls, when the table has a `scrollY`.
 */
@Directive({
  selector: 'tfoot[andesTableFooter]',
  host: {
    class: 'andes-table__footer',
    '[class.andes-table__footer--fixed]': 'fixed()',
  },
})
export class AndesTableFooter {
  /** Stick to the bottom of a vertically scrolling table. */
  readonly fixed = input(false, { transform: booleanAttribute });
}
