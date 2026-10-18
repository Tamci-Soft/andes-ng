import { booleanAttribute, Directive, inject, input } from '@angular/core';

import {
  ANDES_NAVIGATION_MENU,
  ANDES_NAVIGATION_MENU_CONTENT,
} from './navigation-menu-types';

/**
 * Marks an `<a>` (or `<button>`) as a link of the menu. It works in the bar and inside
 * content, takes part in the arrow-key navigation, marks the current page with
 * `aria-current="page"` and closes any open content when followed.
 *
 * Put it on the element your router already decorates, so `routerLink` and
 * `routerLinkActive` keep working:
 *
 * ```html
 * <a andesNavigationMenuLink routerLink="/orders" [active]="isOrders()">Orders</a>
 * ```
 */
@Directive({
  selector: '[andesNavigationMenuLink]',
  host: {
    class: 'andes-nav-menu__link',
    '[attr.data-context]': 'inContent ? "content" : "bar"',
    '[attr.data-andes-nav-menu-focusable]': 'inContent ? null : ""',
    'data-andes-nav-menu-link': '',
    '[attr.aria-current]': 'active() ? "page" : null',
    '[attr.data-active]': 'active() ? "" : null',
    '(click)': 'menu.linkActivated()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AndesNavigationMenuLink {
  protected readonly menu = inject(ANDES_NAVIGATION_MENU);
  protected readonly inContent =
    inject(ANDES_NAVIGATION_MENU_CONTENT, { optional: true }) !== null;

  /** Marks this link as the current page. */
  readonly active = input(false, { transform: booleanAttribute });

  /** Content keys are handled once, by the panel the link bubbles to. */
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.inContent) {
      this.menu.barKeydown(event, null);
    }
  }
}

/** The title line of a card-style link. */
@Directive({
  selector: '[andesNavigationMenuLinkTitle]',
  host: { class: 'andes-nav-menu__link-title' },
})
export class AndesNavigationMenuLinkTitle {}

/** The secondary line of a card-style link. */
@Directive({
  selector: '[andesNavigationMenuLinkDescription]',
  host: { class: 'andes-nav-menu__link-description' },
})
export class AndesNavigationMenuLinkDescription {}
