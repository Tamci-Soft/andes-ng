import type { AndesListNavigationItemRef } from '@andes-ng/primitives';
import { InjectionToken, type Signal, type TemplateRef } from '@angular/core';

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
 * The visual style of the tab bar.
 *
 * - `line` (default) — plain labels over a divider, with a sliding ink bar under the active one.
 * - `card` — each tab is an enclosed card; the active card merges into the panel below it.
 * - `editable-card` — `card`, plus a per-tab remove button and an add button in the bar.
 *   Neither adds nor removes anything itself: both only emit `(edit)`, and the consumer
 *   updates its own list of tabs in response.
 */
export type AndesTabsType = 'line' | 'card' | 'editable-card';

/**
 * Which side of the panels the tab bar sits on. `left`/`right` lay the bar out vertically
 * (and switch keyboard navigation to the vertical arrow keys); they follow the inline
 * direction, so they mirror under `dir="rtl"`.
 */
export type AndesTabsPosition = 'top' | 'bottom' | 'left' | 'right';

/** Preset tab sizes, named after `AndesButton`'s scale. */
export type AndesTabsSize = 'sm' | 'md' | 'lg';

/** Fine-grained form of the `animated` input. */
export interface AndesTabsAnimated {
  /** Whether the ink bar slides between tabs. Default `true`. */
  inkBar?: boolean;
  /** Whether a newly shown panel fades in. Default `false`. */
  tabPane?: boolean;
}

/** Customizes the `line`-type ink bar under the active tab. */
export interface AndesTabsIndicator {
  /**
   * The ink bar's length in px, or a function of the active tab's own length (its width, or
   * its height for a vertical bar). Default: the full length of the tab.
   */
  size?: number | ((origin: number) => number);
  /** Where a shorter-than-the-tab ink bar sits along the tab. Default `'center'`. */
  align?: 'start' | 'center' | 'end';
}

/** Emitted by `(edit)` on an `editable-card` Tabs. */
export type AndesTabsEditEvent =
  | { action: 'add'; event: Event }
  | { action: 'remove'; key: string; event: Event };

/** Emitted by `(tabClick)`. */
export interface AndesTabsClickEvent {
  key: string;
  event: MouseEvent;
}

/** Emitted by `(tabScroll)` whenever an overflowing tab bar scrolls. */
export interface AndesTabsScrollEvent {
  direction: 'left' | 'right' | 'top' | 'bottom';
}

/** The object form of `tabBarExtraContent`. */
export interface AndesTabsExtraContent {
  left?: TemplateRef<unknown>;
  right?: TemplateRef<unknown>;
}

/**
 * One entry of the `items` input - the data-driven alternative to projecting
 * `<andes-tabs-list>`/`<andes-tabs-trigger>`/`<andes-tabs-content>` by hand.
 */
export interface AndesTabsItem {
  /** Unique key; becomes the trigger/panel `value`. */
  key: string;
  /** The tab's label. */
  label: string | TemplateRef<unknown>;
  /** An icon rendered before the label. */
  icon?: TemplateRef<unknown>;
  /** The panel's content. Always rendered lazily - see `AndesTabsContentLazy`. */
  content?: string | TemplateRef<unknown>;
  disabled?: boolean;
  /** Whether an `editable-card` tab shows its remove button. Default `true`. */
  closable?: boolean;
  /** Custom remove icon; `null` hides the remove button. */
  closeIcon?: TemplateRef<unknown> | null;
  /** Overrides the Tabs-level `destroyOnHidden` for this panel. */
  destroyOnHidden?: boolean;
  /** Render the panel before it is first activated, instead of lazily on first activation. */
  forceRender?: boolean;
}

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

/**
 * What `AndesTabsList`, `AndesTabsTrigger` and `AndesTabsContent` need from their parent
 * `AndesTabs`, provided under {@link ANDES_TABS}.
 *
 * The children inject this token rather than the `AndesTabs` class itself because `AndesTabs`
 * now also *imports* them (to render the `items` input) - injecting the class would make
 * `tabs.ts` and each child file import one another, and a component's `imports` array is
 * evaluated at module load, when one side of that cycle is still undefined.
 */
export interface AndesTabsContext {
  readonly activeValue: Signal<string | undefined>;
  /** The effective orientation, derived from `tabPosition`/`orientation`. */
  readonly resolvedOrientation: Signal<AndesTabsOrientation>;
  readonly position: Signal<AndesTabsPosition>;
  readonly activationMode: Signal<AndesTabsActivationMode>;
  readonly type: Signal<AndesTabsType>;
  readonly size: Signal<AndesTabsSize>;
  readonly editable: Signal<boolean>;
  readonly tabBarGutter: Signal<number | undefined>;
  readonly tabPaneAnimated: Signal<boolean>;
  readonly destroyOnHidden: Signal<boolean>;
  readonly removeIcon: Signal<TemplateRef<unknown> | undefined>;
  select(value: string): void;
  handleTabClick(value: string, event: MouseEvent): void;
  requestRemove(value: string, event: Event, fromKeyboard: boolean): void;
  registerTrigger(trigger: AndesTabsTriggerRef): void;
  unregisterTrigger(trigger: AndesTabsTriggerRef): void;
  panelId(value: string): string;
  triggerElementId(value: string): string | undefined;
}

/** @internal Provided by `AndesTabs`; see {@link AndesTabsContext}. */
export const ANDES_TABS = new InjectionToken<AndesTabsContext>('ANDES_TABS');
