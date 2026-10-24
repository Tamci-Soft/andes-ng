import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AndesLayoutPosition } from './layout-sizes';

/** The bottom bar of an `andes-layout`; `position` works as on the header, anchored to the bottom. */
@Component({
  selector: 'andes-layout-footer',
  template: '<div class="bar"><ng-content /></div>',
  styleUrl: './layout-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'layout-footer',
    '[attr.data-position]': 'position()',
  },
})
export class AndesLayoutFooter {
  readonly position = input<AndesLayoutPosition>('static');
}
