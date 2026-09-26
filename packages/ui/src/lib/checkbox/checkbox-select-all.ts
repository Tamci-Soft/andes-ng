import { Directive, effect, inject } from '@angular/core';

import {
  ANDES_CHECKBOX_SELECT_ALL,
  AndesCheckboxGroupState,
} from './checkbox-group-state';
import { AndesCheckbox } from './checkbox';

/**
 * Turns the `AndesCheckbox` it sits on into the enclosing group's "select all" toggle.
 *
 * ```html
 * <andes-checkbox-group [(value)]="fruits">
 *   <andes-checkbox andesSelectAll>Select all</andes-checkbox>
 *   <andes-checkbox value="apple">Apple</andes-checkbox>
 * </andes-checkbox-group>
 * ```
 *
 * A directive rather than a second component on purpose: select-all IS an ordinary checkbox in
 * every visual and accessibility respect, so wrapping `AndesCheckbox` in a near-identical
 * component would duplicate its template, its CSS and its ARIA forwarding just to re-derive
 * two booleans. Everything it renders - including the indeterminate dash - is the checkbox's
 * own, already-tested behavior.
 *
 * The checkbox it decorates takes no `value` and never joins the group's item list (see
 * `ANDES_CHECKBOX_SELECT_ALL`), so it summarizes the items without counting itself.
 */
@Directive({
  selector: 'andes-checkbox[andesSelectAll]',
  providers: [
    { provide: ANDES_CHECKBOX_SELECT_ALL, useValue: ANDES_CHECKBOX_SELECT_ALL },
  ],
  host: {
    '(change)': 'onChange($event)',
  },
})
export class AndesCheckboxSelectAll {
  private readonly state = inject(AndesCheckboxGroupState);
  private readonly checkbox = inject(AndesCheckbox, { self: true });

  constructor() {
    // The aggregate is derived state, so it is pushed into the host checkbox's models rather
    // than stored anywhere here: all children checked -> checked, some -> indeterminate, none
    // -> unchecked. Writing both in one effect keeps them from being applied in two separate
    // change-detection passes, which would briefly render "checked AND indeterminate".
    effect(() => {
      this.checkbox.checked.set(this.state.allSelected());
      this.checkbox.indeterminate.set(this.state.indeterminate());
    });
  }

  /**
   * The native `change` from the checkbox's own input, bubbled up to this host element.
   *
   * Reading `checked` off the event target (rather than off the checkbox's model) is what
   * makes the indeterminate case behave the way users expect for free: the browser resolves a
   * click on an indeterminate checkbox to `checked === true`, so a half-selected group selects
   * everything - matching the native platform rather than second-guessing it.
   */
  protected onChange(event: Event): void {
    this.state.setAllSelected((event.target as HTMLInputElement).checked);
  }
}
