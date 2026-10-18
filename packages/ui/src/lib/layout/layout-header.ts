import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AndesLayoutPosition } from './layout-sizes';

export type { AndesLayoutPosition } from './layout-sizes';

/**
 * The top bar of an `andes-layout`. `position="sticky"` keeps it at the top while the page
 * scrolls; `fixed` pins it to the viewport and keeps its space in the flow, so content never
 * slides underneath. A fixed bar spans the viewport - give it room for a fixed sider with
 * `--andes-layout-fixed-offset-start`.
 *
 * Height comes from `--andes-layout-header-height` (default 3.5rem).
 */
@Component({
  selector: 'andes-layout-header',
  template: '<div class="bar"><ng-content /></div>',
  styleUrl: './layout-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'layout-header',
    '[attr.data-position]': 'position()',
  },
})
export class AndesLayoutHeader {
  readonly position = input<AndesLayoutPosition>('static');
}
