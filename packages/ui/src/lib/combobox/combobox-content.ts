import { AndesOverlayContentPrimitive } from '@andes-ng/primitives';
import { Directive, inject } from '@angular/core';

import type { AndesCombobox } from './combobox';
import { ANDES_COMBOBOX } from './combobox-token';

/**
 * The suggestion popup's root element. Composes `AndesOverlayContentPrimitive` via
 * `hostDirectives`, which reads `role: 'listbox'` and `aria-modal: false` off the
 * `AndesOverlayPrimitive` configuration `AndesCombobox` sets up, and reports this element
 * back so the overlay can measure and portal it correctly. Carries `aria-busy` while the
 * root's `loading` is set, so assistive tech knows the suggestions are still arriving.
 *
 * ```html
 * <div andesComboboxContent>
 *   @for (item of combobox.filteredItems(); track item) {
 *     <div andesComboboxItem [value]="item">{{ item }}</div>
 *   } @empty {
 *     <div andesComboboxEmpty>No results found.</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[andesComboboxContent]',
  hostDirectives: [AndesOverlayContentPrimitive],
  host: {
    class: 'andes-combobox-content',
    '[attr.aria-busy]': 'combobox.loading() ? "true" : null',
  },
})
export class AndesComboboxContent {
  protected readonly combobox = inject(
    ANDES_COMBOBOX,
  ) as AndesCombobox<unknown>;
}
