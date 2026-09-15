import { Directive } from '@angular/core';

/** Styles a native `<tr>`, keeping its implicit `row` role. */
@Directive({
  selector: 'tr[andesTableRow]',
  host: { class: 'andes-table__row' },
})
export class AndesTableRow {}
