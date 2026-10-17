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
 * Pressing anywhere in the popup - padding, a group heading, a button in a header or
 * footer - leaves focus on the input, so the popup does not close underneath the pointer
 * and a button's `click` still lands. (So the popup cannot host a text field of its own:
 * the input is the only place typing goes.)
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
    // The configured side, for the entrance and exit animations' direction.
    '[attr.data-side]': 'combobox.placement().split("-")[0]',
    '(mousedown)': 'onMouseDown($event)',
  },
})
export class AndesComboboxContent {
  protected readonly combobox = inject(
    ANDES_COMBOBOX,
  ) as AndesCombobox<unknown>;

  protected onMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }
}
