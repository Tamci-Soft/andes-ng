import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

let nextId = 0;

/**
 * A non-interactive heading for a group of menu items. Inside an
 * `AndesDropdownMenuGroup` it also names the group (`aria-labelledby`).
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
    '[attr.id]': 'id()',
  },
})
export class AndesDropdownMenuLabel {
  /** The element id. Generated unless set. */
  readonly id = input(`andes-dropdown-menu-label-${nextId++}`);
}
