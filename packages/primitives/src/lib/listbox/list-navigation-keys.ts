import { Directive, inject } from '@angular/core';

import { AndesListNavigation } from './list-navigation';

/**
 * Wires the keyboard-owning element of a list to its {@link AndesListNavigation}: forwards
 * `keydown` to the key manager and publishes `aria-activedescendant` when the list is in
 * `active-descendant` mode.
 *
 * Put it on whichever element holds real DOM focus:
 *
 * - Tabs — the `role="tablist"` element.
 * - Dropdown Menu — the `role="menu"` popup.
 * - Select — the trigger while closed, or the `role="listbox"` popup once focus moves into it.
 * - Combobox — the `<input>` itself, which keeps focus the whole time.
 *
 * It only consumes navigation keys, so the consumer is free to bind its own `keydown`
 * handler on the same element for `Enter`, `Space` and `Escape`.
 *
 * ```html
 * <input andesListNavigationKeys role="combobox" (keydown.enter)="commit()" />
 * ```
 */
@Directive({
  selector: '[andesListNavigationKeys]',
  host: {
    '(keydown)': 'onKeydown($event)',
    '[attr.aria-activedescendant]': 'navigation.activeDescendantId()',
  },
})
export class AndesListNavigationKeys {
  protected readonly navigation = inject(AndesListNavigation);

  protected onKeydown(event: KeyboardEvent): void {
    this.navigation.onKeydown(event);
  }
}
