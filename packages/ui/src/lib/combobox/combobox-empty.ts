import {
  Directive,
  ElementRef,
  inject,
  OnInit,
  Renderer2,
} from '@angular/core';

import {
  ANDES_COMBOBOX_EMPTY_ICON,
  createAndesComboboxIcon,
} from './combobox-icons';

/**
 * The "no results" state, shown when the filtered suggestion list is empty.
 *
 * Angular's own `@for`/`@empty` control flow already provides the branching a dedicated
 * `ComboboxEmpty` component would otherwise need to do itself, so this directive is
 * intentionally thin: it renders only when the consumer's `@empty` block does, and
 * contributes `role="status"` so assistive tech announces the message the moment it
 * appears - the equivalent of Base UI Autocomplete's live-region `Status` part.
 *
 * The one thing it adds to the consumer's own message is an inbox glyph above it, the way
 * Ant Design's `notFoundContent` default renders a simple container illustration rather
 * than bare text: a panel holding nothing but one line of small muted text reads as a
 * rendering glitch, where an icon reads as an answer. The glyph is `aria-hidden`, so the
 * live region still announces exactly the message and nothing more.
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
export class AndesComboboxEmpty implements OnInit {
  private readonly renderer = inject(Renderer2);

  private readonly element: HTMLElement =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  ngOnInit(): void {
    const icon = createAndesComboboxIcon(
      this.renderer,
      ANDES_COMBOBOX_EMPTY_ICON,
      'andes-combobox-empty__icon',
    );
    // Ahead of the consumer's message, which by `ngOnInit` is already in place, so the
    // icon sits above the text the way every empty state in the references does.
    this.renderer.insertBefore(this.element, icon, this.element.firstChild);
  }
}
