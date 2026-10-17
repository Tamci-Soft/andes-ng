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

import { AndesDropdownMenuRadioGroup } from './dropdown-menu-radio-group';
import { AndesDropdownMenuRoot } from './dropdown-menu-root';
import { AndesDropdownMenuLevel } from './dropdown-menu-types';

/**
 * One option within a set of mutually-exclusive radio items.
 *
 * Inside an `AndesDropdownMenuRadioGroup` the group owns the value: the item is
 * checked while the group's `value` equals its own, and selecting it sets the group's
 * `value` - `name` is ignored there. Outside one, items sharing the same `name` form a
 * group, the convention native `<input type="radio">` uses; that state lives in the
 * menu, so it can be seeded (`defaultChecked`) and observed (`(selected)`) but not set
 * by the parent later - use the group component when it must be.
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`: its BEM classes live only in `host: {
 * class: ... }`, which emulated encapsulation's own-component-only scoping can never
 * match.
 *
 * The selected dot is inline SVG rather than a `●` text glyph so the checked state
 * does not depend on the consuming app's `--andes-font-family` happening to contain
 * that codepoint - see the comment on `.andes-dropdown-menu__indicator svg`.
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
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="6" />
        </svg>
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
    '(pointerenter)': 'onPointerEnter($event)',
  },
})
export class AndesDropdownMenuRadioItem implements OnInit {
  /**
   * The group this item belongs to, outside an `AndesDropdownMenuRadioGroup` (ignored
   * inside one). Items sharing a `name` are mutually exclusive; ungrouped items without
   * one share a single unnamed group.
   */
  readonly name = input<string>('');
  /** The value this item represents within its group. */
  readonly value = input.required<unknown>();
  /** Selects this item on init if its group (either kind) has no value yet. Default `false`. */
  readonly defaultChecked = input(false, { transform: booleanAttribute });
  /** Whether selecting the item closes the menu. Default `false`. */
  readonly closeOnSelect = input(false, { transform: booleanAttribute });
  /** Emits this item's value when the user selects it. */
  readonly selected = output<unknown>();

  protected readonly navItem = inject(AndesListNavigationItem);
  protected readonly isDisabled = this.navItem.disabled;

  private readonly menu = inject(AndesDropdownMenuRoot);
  private readonly level = inject(AndesDropdownMenuLevel);
  private readonly group = inject(AndesDropdownMenuRadioGroup, {
    optional: true,
  });

  protected readonly checked = computed(
    () => this.groupValue() === this.value(),
  );

  /**
   * Required inputs are not readable in the constructor, so the one-time
   * `defaultChecked` seed happens here instead.
   */
  ngOnInit(): void {
    if (this.defaultChecked() && this.groupValue() === undefined) {
      this.select();
    }
  }

  protected activate(): void {
    if (this.isDisabled()) {
      return;
    }
    this.select();
    this.selected.emit(this.value());
    if (this.closeOnSelect()) {
      this.menu.hide('item');
    }
  }

  protected onKeydownActivate(event: Event): void {
    event.preventDefault();
    this.activate();
  }

  private groupValue(): unknown {
    return this.group
      ? this.group.value()
      : this.menu.radioGroupValue(this.name())();
  }

  private select(): void {
    if (this.group) {
      this.group.select(this.value());
    } else {
      this.menu.setRadioGroupValue(this.name(), this.value());
    }
  }

  /** Pointing at a sibling is the cue to close this level's open submenu. */
  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.level.openChild()?.scheduleClose();
    }
  }
}
