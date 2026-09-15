import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A non-interactive heading for a group of menu items. */
@Component({
  selector: 'andes-dropdown-menu-label',
  template: '<ng-content />',
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-dropdown-menu__label',
  },
})
export class AndesDropdownMenuLabel {}
