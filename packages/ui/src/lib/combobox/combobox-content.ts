import { AndesOverlayContentPrimitive } from '@andes-ng/primitives';
import { Directive } from '@angular/core';

/**
 * The suggestion popup's root element. Composes `AndesOverlayContentPrimitive` via
 * `hostDirectives`, which reads `role: 'listbox'` and `aria-modal: false` off the
 * `AndesOverlayPrimitive` configuration `AndesCombobox` sets up, and reports this element
 * back so the overlay can measure and portal it correctly.
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
  },
})
export class AndesComboboxContent {}
