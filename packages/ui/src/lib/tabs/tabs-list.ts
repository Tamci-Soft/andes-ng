import { AndesListNavigationKeys } from '@andes-ng/primitives';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AndesTabs } from './tabs';

/**
 * The `role="tablist"` container for a set of `AndesTabsTrigger`s.
 *
 * Hosts `AndesListNavigationKeys` directly on its own host element (via `hostDirectives`),
 * which is the element that owns real DOM focus in roving-tabindex mode - so this is where
 * `keydown` is captured and forwarded to the shared `AndesListNavigation`.
 */
@Component({
  selector: 'andes-tabs-list',
  hostDirectives: [AndesListNavigationKeys],
  host: {
    role: 'tablist',
    '[attr.aria-orientation]': 'tabs.orientation()',
  },
  template: `<ng-content />`,
  styleUrl: './tabs-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTabsList {
  protected readonly tabs = inject(AndesTabs);
}
