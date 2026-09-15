import { Directive } from '@angular/core';

/**
 * Styles a native `<thead>`. Only ever applied to a real `<thead>`, so the implicit
 * `rowgroup` role and the header/body association come from the element itself.
 */
@Directive({
  selector: 'thead[andesTableHeader]',
  host: { class: 'andes-table__header' },
})
export class AndesTableHeader {}
