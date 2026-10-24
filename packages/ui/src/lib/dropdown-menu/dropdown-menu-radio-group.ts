import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  model,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenuLabel } from './dropdown-menu-label';

/**
 * A controlled set of mutually-exclusive `AndesDropdownMenuRadioItem`s. The group owns
 * the selected value: its items read their checked state from `value` and write to it
 * when selected, so the parent can both read the choice and change it at any time
 * (`[(value)]`) - which `name`-based grouping alone cannot, since that state lives
 * inside the menu.
 *
 * ```html
 * <andes-dropdown-menu-radio-group [(value)]="sort">
 *   <andes-dropdown-menu-label>Sort by</andes-dropdown-menu-label>
 *   <andes-dropdown-menu-radio-item value="name">Name</andes-dropdown-menu-radio-item>
 *   <andes-dropdown-menu-radio-item value="date">Date</andes-dropdown-menu-radio-item>
 * </andes-dropdown-menu-radio-group>
 * ```
 *
 * Items reach the group through DI, so they need no `name` inside it. Like
 * `AndesDropdownMenuGroup` it is `role="group"`, named by its label, and purely
 * structural for arrow-key navigation.
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`.
 */
@Component({
  selector: 'andes-dropdown-menu-radio-group',
  template: '<ng-content />',
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'group',
    class: 'andes-dropdown-menu__group andes-dropdown-menu__radio-group',
    '[attr.aria-labelledby]': 'labelId()',
  },
})
export class AndesDropdownMenuRadioGroup {
  /** The selected item's `value`. Two-way bindable (`[(value)]`). */
  readonly value = model<unknown>(undefined);

  private readonly label = contentChild(AndesDropdownMenuLabel);
  protected readonly labelId = computed(() => this.label()?.id() ?? null);

  /** @internal Called by a radio item when the user selects it. */
  select(value: unknown): void {
    if (this.value() !== value) {
      this.value.set(value);
    }
  }
}
