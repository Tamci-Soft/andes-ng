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
      padding: 0.3125rem 0.75rem;
      color: var(--andes-color-muted-foreground);
      font-size: 0.75rem;
      line-height: var(--andes-control-line-height, 1.375rem);
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
