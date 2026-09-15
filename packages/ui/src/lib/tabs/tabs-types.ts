import type { AndesListNavigationItemRef } from '@andes-ng/primitives';
import type { Signal } from '@angular/core';

/** Which arrow keys move focus between tabs, per the WAI-ARIA Tabs pattern. */
export type AndesTabsOrientation = 'horizontal' | 'vertical';

/**
 * Whether moving focus with the arrow keys also selects the focused tab.
 *
 * - `automatic` (default) — moving focus to a tab immediately shows its panel too. This is
 *   the WAI-ARIA APG's recommended default for simple tabs.
 * - `manual` — arrow keys only move focus; the user must press `Enter` or `Space` on the
 *   focused tab to activate it. Use this when switching tabs is expensive (e.g. each panel
 *   triggers a network request), so a user arrowing through the list doesn't fire it for
 *   every tab passed over.
 */
export type AndesTabsActivationMode = 'automatic' | 'manual';

/**
 * The contract a trigger must satisfy to register with the parent {@link AndesTabs}.
 *
 * This interface exists purely so `tabs.ts` never has to import `tabs-trigger.ts` (which
 * itself imports `tabs.ts` to inject the parent) - the same avoid-a-circular-import shape
 * used by `AndesListNavigationItemRef` in `@andes-ng/primitives`.
 */
export interface AndesTabsTriggerRef {
  /** The value identifying this tab; matches the `AndesTabsContent` it controls. */
  readonly value: Signal<string>;
  /** Whether this tab is disabled and should be skipped when picking a default tab. */
  readonly disabled: Signal<boolean>;
  /** The trigger's own host element, used to keep the registry in DOM order. */
  readonly element: HTMLElement;
  /**
   * The real `id` of the trigger's focusable button, once `AndesListNavigationItem` has
   * assigned one - `undefined` before the view initializes. `AndesTabsContent` reads this
   * (rather than minting its own id for the trigger) so it never has to fight the primitive
   * for control of that attribute; see the comment in `tabs-trigger.ts`.
   */
  readonly elementId: Signal<string | undefined>;
  /**
   * The trigger's own registered `AndesListNavigationItem`, once its view has initialized -
   * `undefined` before then. Read by `AndesTabs` to keep the shared `AndesListNavigation`'s
   * roving-tabindex target in sync with whichever tab is currently selected.
   */
  readonly navigationItem: Signal<AndesListNavigationItemRef | undefined>;
}
