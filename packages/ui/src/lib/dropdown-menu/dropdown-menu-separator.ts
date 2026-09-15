import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

/**
 * A visual divider between groups of menu items.
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`: its BEM class lives only in `host: {
 * class: ... }`, which emulated encapsulation's own-component-only scoping can never
 * match.
 */
@Component({
  selector: 'andes-dropdown-menu-separator',
  template: '',
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'separator',
    'aria-orientation': 'horizontal',
    class: 'andes-dropdown-menu__separator',
  },
})
export class AndesDropdownMenuSeparator {}
