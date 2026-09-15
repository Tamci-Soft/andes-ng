import { Directive } from '@angular/core';

/** Styles a native `<tfoot>` - the place for a totals or summary row. */
@Directive({
  selector: 'tfoot[andesTableFooter]',
  host: { class: 'andes-table__footer' },
})
export class AndesTableFooter {}
