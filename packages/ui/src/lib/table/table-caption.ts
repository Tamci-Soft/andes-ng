import { Directive } from '@angular/core';

/**
 * Styles a native `<caption>`, which gives the table its accessible name.
 *
 * HTML requires `<caption>` to be the table's first child; where it is *drawn* is
 * controlled by `AndesTable`'s `captionSide` input, not by moving the element.
 */
@Directive({
  selector: 'caption[andesTableCaption]',
  host: { class: 'andes-table__caption' },
})
export class AndesTableCaption {}
