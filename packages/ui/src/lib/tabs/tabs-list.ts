import { AndesListNavigationKeys } from '@andes-ng/primitives';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ANDES_TABS } from './tabs-types';

/**
 * The `role="tablist"` container for a set of `AndesTabsTrigger`s.
 *
 * Hosts `AndesListNavigationKeys` directly on its own host element (via `hostDirectives`),
 * which is the element that owns real DOM focus in roving-tabindex mode - so this is where
 * `keydown` is captured and forwarded to the shared `AndesListNavigation`.
 *
 * The parent `AndesTabs` projects this element into its tab bar (inside the scrollable nav,
 * next to the ink bar); the divider line, scroll arrows and add button all live in the bar
 * around it, so this element only ever contains tabs.
 */
@Component({
  selector: 'andes-tabs-list',
  hostDirectives: [AndesListNavigationKeys],
  host: {
    role: 'tablist',
    '[attr.aria-orientation]': 'tabs.resolvedOrientation()',
    '[attr.data-variant]': 'tabs.type() === "line" ? "line" : "card"',
    '[style.gap.px]': 'tabs.tabBarGutter()',
  },
  template: `<ng-content />`,
  styleUrl: './tabs-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTabsList {
  protected readonly tabs = inject(ANDES_TABS);
}
