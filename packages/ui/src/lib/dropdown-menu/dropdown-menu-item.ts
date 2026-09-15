import { AndesListNavigationItem } from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';

import { AndesDropdownMenu } from './dropdown-menu';

export type AndesDropdownMenuItemVariant = 'default' | 'destructive';

/**
 * A single selectable action inside a dropdown menu.
 *
 * `role="menuitem"`, the roving `tabindex`, and the `data-active`/`data-disabled`
 * styling hooks come from the composed `AndesListNavigationItem`.
 */
@Component({
  selector: 'andes-dropdown-menu-item',
  hostDirectives: [
    {
      directive: AndesListNavigationItem,
      inputs: ['disabled', 'typeaheadLabel'],
    },
  ],
  template: `
    <ng-content select="[slot=icon-start]" />
    <ng-content />
    <ng-content select="[slot=icon-end]" />
  `,
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'menuitem',
    class: 'andes-dropdown-menu__item',
    '[attr.data-variant]': 'variant()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '(click)': 'activate()',
    '(keydown.enter)': 'onKeydownActivate($event)',
    '(keydown.space)': 'onKeydownActivate($event)',
  },
})
export class AndesDropdownMenuItem {
  /** Styles the item red, for a destructive action. Default `'default'`. */
  readonly variant = input<AndesDropdownMenuItemVariant>('default');
  /** Whether selecting the item closes the menu. Default `true`. */
  readonly closeOnSelect = input(true, { transform: booleanAttribute });
  /** Emits when the item is activated by click, Enter or Space. */
  readonly activated = output<void>();

  protected readonly navItem = inject(AndesListNavigationItem);
  protected readonly isDisabled = this.navItem.disabled;

  private readonly menu = inject(AndesDropdownMenu);

  protected activate(): void {
    if (this.isDisabled()) {
      return;
    }
    this.activated.emit();
    if (this.closeOnSelect()) {
      this.menu.close('trigger');
    }
  }

  /**
   * The item is a `<andes-dropdown-menu-item>` custom element, not a native
   * `<button>`, precisely so Enter/Space activation can be handled once, explicitly,
   * here - rather than juggling a native button's own click-on-Enter/Space behavior
   * (which browsers implement inconsistently and jsdom does not implement at all)
   * alongside a duplicate explicit handler.
   */
  protected onKeydownActivate(event: Event): void {
    event.preventDefault();
    this.activate();
  }
}
