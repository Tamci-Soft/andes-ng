import { AndesListNavigationItem } from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenu } from './dropdown-menu';

/**
 * One option within a set of mutually-exclusive radio items. Items sharing the same
 * `name` form a group; selecting one deselects any other with the same `name`.
 *
 * There is no separate `AndesDropdownMenuRadioGroup` component - grouping is by
 * matching `name`, the same convention native `<input type="radio">` uses, which
 * keeps the anatomy to what was actually required without an extra wrapper.
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`: its BEM classes live only in `host: {
 * class: ... }`, which emulated encapsulation's own-component-only scoping can never
 * match.
 */
@Component({
  selector: 'andes-dropdown-menu-radio-item',
  hostDirectives: [
    {
      directive: AndesListNavigationItem,
      inputs: ['disabled', 'typeaheadLabel'],
    },
  ],
  template: `
    <span class="andes-dropdown-menu__indicator" aria-hidden="true">
      @if (checked()) {
        ●
      }
    </span>
    <ng-content />
  `,
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'menuitemradio',
    class: 'andes-dropdown-menu__item andes-dropdown-menu__radio-item',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '(click)': 'activate()',
    '(keydown.enter)': 'onKeydownActivate($event)',
    '(keydown.space)': 'onKeydownActivate($event)',
  },
})
export class AndesDropdownMenuRadioItem implements OnInit {
  /** The group this item belongs to. Items sharing a `name` are mutually exclusive. */
  readonly name = input.required<string>();
  /** The value this item represents within its group. */
  readonly value = input.required<unknown>();
  /** Selects this item on init if its group has no value yet. Default `false`. */
  readonly defaultChecked = input(false, { transform: booleanAttribute });
  /** Whether selecting the item closes the menu. Default `false`. */
  readonly closeOnSelect = input(false, { transform: booleanAttribute });
  /** Emits this item's value when the user selects it. */
  readonly selected = output<unknown>();

  protected readonly navItem = inject(AndesListNavigationItem);
  protected readonly isDisabled = this.navItem.disabled;

  private readonly menu = inject(AndesDropdownMenu);

  protected readonly checked = computed(
    () => this.menu.radioGroupValue(this.name())() === this.value(),
  );

  /**
   * Required inputs are not readable in the constructor, so the one-time
   * `defaultChecked` seed happens here instead.
   */
  ngOnInit(): void {
    if (
      this.defaultChecked() &&
      this.menu.radioGroupValue(this.name())() === undefined
    ) {
      this.menu.setRadioGroupValue(this.name(), this.value());
    }
  }

  protected activate(): void {
    if (this.isDisabled()) {
      return;
    }
    this.menu.setRadioGroupValue(this.name(), this.value());
    this.selected.emit(this.value());
    if (this.closeOnSelect()) {
      this.menu.close('trigger');
    }
  }

  protected onKeydownActivate(event: Event): void {
    event.preventDefault();
    this.activate();
  }
}
