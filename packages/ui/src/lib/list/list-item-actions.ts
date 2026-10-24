import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The actions of a row: any inline elements (buttons, links), laid out in a line with a thin
 * divider between them in a `split` list. Place it inside `andes-list-item`.
 */
@Component({
  selector: 'andes-list-item-actions',
  template: '<ng-content />',
  styleUrl: './list-item-actions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'list-item-actions',
    role: 'group',
  },
})
export class AndesListItemActions {}
