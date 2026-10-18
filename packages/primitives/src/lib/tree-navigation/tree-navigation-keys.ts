import { Directive, inject } from '@angular/core';

import { AndesTreeNavigation } from './tree-navigation';

/**
 * Wires the keyboard-owning element of a tree to its {@link AndesTreeNavigation}: forwards
 * `keydown` to it and publishes `aria-activedescendant` when the tree is in `active-descendant`
 * mode.
 *
 * Put it on whichever element holds real DOM focus:
 *
 * - a tree whose nodes take focus — the `role="tree"` element (keys bubble up from the nodes);
 * - a cascader or tree-select — the field or the `<input>`, which keeps focus the whole time;
 * - a menu — the `role="menu"` popup.
 *
 * It only consumes navigation keys, so the consumer is free to bind its own `keydown` handler on
 * the same element for `Enter`, `Space` and `Escape`.
 *
 * In a windowed tree the tab stop can fall on a node that is not rendered. Binding
 * `[attr.tabindex]="navigation.containerTabIndex()"` on the same element then keeps the tree
 * reachable with Tab, and this directive passes the focus on to the node, scrolling it in.
 *
 * ```html
 * <ul role="tree" andesTreeNavigationKeys (keydown.enter)="activate()">…</ul>
 * ```
 */
@Directive({
  selector: '[andesTreeNavigationKeys]',
  host: {
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusin($event)',
    '[attr.aria-activedescendant]': 'navigation.activeDescendantId()',
  },
})
export class AndesTreeNavigationKeys {
  protected readonly navigation = inject(AndesTreeNavigation);

  protected onKeydown(event: KeyboardEvent): void {
    this.navigation.onKeydown(event);
  }

  protected onFocusin(event: FocusEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }
    // Focus landed on the container itself, which only has a tab stop when the real one is a
    // node outside the rendered window.
    const key = this.navigation.tabbableKey();
    if (key !== null && this.navigation.containerTabIndex() === 0) {
      this.navigation.focusKey(key);
    }
  }
}
