import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { AndesSelectState } from './select-state';

/**
 * A visual divider between options or groups.
 *
 * It is hidden from assistive technology on purpose: a `role="listbox"` may only own
 * options and groups, and the division it draws is already conveyed by the groups
 * themselves. It also hides while a search is filtering the options, when the groups it
 * separates may no longer be there.
 */
@Component({
  selector: 'andes-select-separator',
  template: ``,
  styles: `
    :host {
      display: block;
      height: 1px;
      margin: var(--andes-space-1) 0;
      background-color: var(--andes-color-border);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'select-separator',
    'aria-hidden': 'true',
    '[style.display]': 'filtering() ? "none" : null',
  },
})
export class AndesSelectSeparator {
  private readonly select = inject(AndesSelectState);

  protected readonly filtering = computed(
    () => this.select.searchEnabled() && this.select.searchValue() !== '',
  );
}
