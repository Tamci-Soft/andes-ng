import { AndesListNavigationItem } from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenu } from './dropdown-menu';

/**
 * A toggleable menu item with a checked/unchecked indicator.
 *
 * `checked` is a `model()`, so it is two-way bindable (`[(checked)]`) or listened to
 * one-way (`(checkedChange)`).
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`: its BEM classes live only in `host: {
 * class: ... }`, which emulated encapsulation's own-component-only scoping can never
 * match.
 *
 * The checkmark is inline SVG rather than a `✓` text glyph so the checked state does
 * not depend on the consuming app's `--andes-font-family` happening to contain that
 * codepoint - see the comment on `.andes-dropdown-menu__indicator svg`.
 */
@Component({
  selector: 'andes-dropdown-menu-checkbox-item',
  hostDirectives: [
    {
      directive: AndesListNavigationItem,
      inputs: ['disabled', 'typeaheadLabel'],
    },
  ],
  template: `
    <span class="andes-dropdown-menu__indicator" aria-hidden="true">
      @if (checked()) {
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      }
    </span>
    <ng-content />
  `,
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'menuitemcheckbox',
    class: 'andes-dropdown-menu__item andes-dropdown-menu__checkbox-item',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '(click)': 'activate()',
    '(keydown.enter)': 'onKeydownActivate($event)',
    '(keydown.space)': 'onKeydownActivate($event)',
  },
})
export class AndesDropdownMenuCheckboxItem {
  /** Current checked state. Two-way bindable with `[(checked)]`. */
  readonly checked = model(false);
  /**
   * Whether toggling closes the menu. Default `false` - checkbox items are commonly
   * toggled more than once before the menu is dismissed.
   */
  readonly closeOnSelect = input(false, { transform: booleanAttribute });

  protected readonly navItem = inject(AndesListNavigationItem);
  protected readonly isDisabled = this.navItem.disabled;

  private readonly menu = inject(AndesDropdownMenu);

  protected activate(): void {
    if (this.isDisabled()) {
      return;
    }
    this.checked.set(!this.checked());
    if (this.closeOnSelect()) {
      this.menu.close('trigger');
    }
  }

  protected onKeydownActivate(event: Event): void {
    event.preventDefault();
    this.activate();
  }
}
