import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenuLabel } from './dropdown-menu-label';

/**
 * Groups related items under an optional `AndesDropdownMenuLabel` (Ant's
 * `type: 'group'`). `role="group"`, named by its label, so assistive tech announces
 * the group name when focus enters it. Purely structural: the items inside still take
 * part in the enclosing panel's arrow-key navigation.
 *
 * ```html
 * <andes-dropdown-menu-group>
 *   <andes-dropdown-menu-label>Sort by</andes-dropdown-menu-label>
 *   <andes-dropdown-menu-item key="name">Name</andes-dropdown-menu-item>
 * </andes-dropdown-menu-group>
 * ```
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`.
 */
@Component({
  selector: 'andes-dropdown-menu-group',
  template: '<ng-content />',
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'group',
    class: 'andes-dropdown-menu__group',
    '[attr.aria-labelledby]': 'labelId()',
  },
})
export class AndesDropdownMenuGroup {
  private readonly label = contentChild(AndesDropdownMenuLabel);
  protected readonly labelId = computed(() => this.label()?.id() ?? null);
}
