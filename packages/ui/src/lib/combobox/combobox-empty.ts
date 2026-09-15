import { Directive } from '@angular/core';

/**
 * The "no results" state, shown when the filtered suggestion list is empty.
 *
 * Angular's own `@for`/`@empty` control flow already provides the branching a dedicated
 * `ComboboxEmpty` component would otherwise need to do itself, so this directive is
 * intentionally thin: it renders only when the consumer's `@empty` block does, and
 * contributes `role="status"` so assistive tech announces the message the moment it
 * appears - the equivalent of Base UI Autocomplete's live-region `Status` part.
 *
 * ```html
 * @for (item of combobox.filteredItems(); track item) {
 *   <div andesComboboxItem [value]="item">{{ item }}</div>
 * } @empty {
 *   <div andesComboboxEmpty>No results found.</div>
 * }
 * ```
 */
@Directive({
  selector: '[andesComboboxEmpty]',
  host: {
    class: 'andes-combobox-empty',
    role: 'status',
  },
})
export class AndesComboboxEmpty {}
