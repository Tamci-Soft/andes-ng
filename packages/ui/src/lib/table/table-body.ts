import { Directive } from '@angular/core';

/** Styles a native `<tbody>`, keeping its implicit `rowgroup` role. */
@Directive({
  selector: 'tbody[andesTableBody]',
  host: { class: 'andes-table__body' },
})
export class AndesTableBody {}
