import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

/**
 * A right-aligned keyboard-shortcut hint inside a menu item. Purely presentational -
 * `aria-hidden` so screen readers do not announce it as separate content, and it has
 * no effect on the item's actual key handling.
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`: its BEM class lives only in `host: {
 * class: ... }`, which emulated encapsulation's own-component-only scoping can never
 * match.
 */
@Component({
  selector: 'andes-dropdown-menu-shortcut',
  template: '<ng-content />',
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    'aria-hidden': 'true',
    class: 'andes-dropdown-menu__shortcut',
  },
})
export class AndesDropdownMenuShortcut {}
