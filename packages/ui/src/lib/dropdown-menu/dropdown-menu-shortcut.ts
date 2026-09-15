import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A right-aligned keyboard-shortcut hint inside a menu item. Purely presentational -
 * `aria-hidden` so screen readers do not announce it as separate content, and it has
 * no effect on the item's actual key handling.
 */
@Component({
  selector: 'andes-dropdown-menu-shortcut',
  template: '<ng-content />',
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    class: 'andes-dropdown-menu__shortcut',
  },
})
export class AndesDropdownMenuShortcut {}
