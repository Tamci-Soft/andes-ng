import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A visual divider between groups of menu items. */
@Component({
  selector: 'andes-dropdown-menu-separator',
  template: '',
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'separator',
    'aria-orientation': 'horizontal',
    class: 'andes-dropdown-menu__separator',
  },
})
export class AndesDropdownMenuSeparator {}
