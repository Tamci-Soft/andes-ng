import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

/**
 * A non-interactive heading for a group of menu items.
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`: its BEM class lives only in `host: {
 * class: ... }`, which emulated encapsulation's own-component-only scoping can never
 * match.
 */
@Component({
  selector: 'andes-dropdown-menu-label',
  template: '<ng-content />',
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'andes-dropdown-menu__label',
  },
})
export class AndesDropdownMenuLabel {}
