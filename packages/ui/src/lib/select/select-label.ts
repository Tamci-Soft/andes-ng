import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AndesSelectGroup } from './select-group';

/**
 * The heading of an `<andes-select-group>`. Inside a group it becomes that group's
 * accessible name; on its own it is a plain visual heading in the panel.
 */
@Component({
  selector: 'andes-select-label',
  template: `<ng-content />`,
  styles: `
    :host {
      display: block;
      padding: var(--andes-space-1) var(--andes-space-2);
      color: var(--andes-color-muted-foreground);
      font-size: 0.75em;
      font-weight: var(--andes-font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'select-label',
    '[attr.id]': 'group?.labelId ?? null',
  },
})
export class AndesSelectLabel {
  protected readonly group = inject(AndesSelectGroup, { optional: true });

  constructor() {
    this.group?.registerLabel();
  }
}
