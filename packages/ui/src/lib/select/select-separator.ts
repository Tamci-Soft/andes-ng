import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A visual divider between options or groups.
 *
 * It is hidden from assistive technology on purpose: a `role="listbox"` may only own
 * options and groups, and the division it draws is already conveyed by the groups
 * themselves.
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
  },
})
export class AndesSelectSeparator {}
