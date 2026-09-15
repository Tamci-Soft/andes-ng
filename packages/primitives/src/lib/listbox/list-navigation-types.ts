import type { Signal } from '@angular/core';

/**
 * Which arrow keys move the active item.
 *
 * - `vertical` — `ArrowUp`/`ArrowDown` (Select and Dropdown Menu listboxes, Combobox popups).
 * - `horizontal` — `ArrowLeft`/`ArrowRight`, mirrored for RTL (a horizontal `Tabs` tablist).
 * - `both` — every arrow key moves through the same flat list (grid-ish toolbars, wrapping
 *   chip rows). There is no two-dimensional row/column model here: `both` simply means all
 *   four arrow keys walk the one list.
 */
export type AndesListOrientation = 'vertical' | 'horizontal' | 'both';

/**
 * How the active item is surfaced to assistive technology.
 *
 * - `roving-tabindex` — the items are genuinely focusable and real DOM focus moves between
 *   them; exactly one item carries `tabindex="0"` while the rest carry `tabindex="-1"`.
 *   Use this whenever the container itself is not a text input: Dropdown Menu and Tabs.
 * - `active-descendant` — real DOM focus never leaves one element (typically a text
 *   `<input>`); the active item is communicated purely through `aria-activedescendant`
 *   pointing at that item's `id`, and items get no `tabindex` at all.
 *   Use this for Combobox, whose input must keep focus while the user navigates the popup.
 */
export type AndesListFocusMode = 'roving-tabindex' | 'active-descendant';

/** Text direction used to mirror horizontal arrow keys. */
export type AndesListTextDirection = 'ltr' | 'rtl';

/**
 * Options accepted by {@link AndesListNavigation.configure}. Every key is optional; an
 * omitted key leaves the current value untouched, so `configure` is safe to call from an
 * `effect` that only knows about some of the options.
 */
export interface AndesListNavigationConfig {
  /** Which arrow keys navigate. Default `'vertical'`. */
  orientation?: AndesListOrientation;
  /**
   * Whether navigation wraps around the ends of the list. Default `true` (the WAI-ARIA
   * Tabs and Menu convention). Set to `false` for listboxes that should stop at the
   * first/last option instead.
   */
  wrap?: boolean;
  /** Whether typing characters moves the active item. Default `true`. */
  typeahead?: boolean;
  /** How long to wait after the last keystroke before matching. Default `200`ms. */
  typeaheadDebounce?: number;
  /** Whether `Home`/`End` jump to the first/last enabled item. Default `true`. */
  homeAndEnd?: boolean;
  /** How the active item is surfaced. Default `'roving-tabindex'`. */
  focusMode?: AndesListFocusMode;
  /** Text direction used to mirror horizontal arrow keys. Default `'ltr'`. */
  textDirection?: AndesListTextDirection;
  /** Whether disabled items are skipped while navigating. Default `true`. */
  skipDisabled?: boolean;
}

/**
 * The contract an item must satisfy to take part in list navigation.
 *
 * {@link AndesListNavigationItem} implements this; the interface exists so that
 * {@link AndesListNavigation} never has to import the item directive (which imports the
 * service), and so consumers can register their own item implementation if they need to.
 *
 * It is deliberately shaped to satisfy the CDK's `Highlightable` and `FocusableOption`
 * interfaces structurally — note that `disabled` is *not* part of it: the CDK's own
 * `ListKeyManagerOption.disabled` is a plain `boolean`, which cannot coexist with a signal
 * input of the same name, so disabled-ness is exposed as {@link isDisabled} and wired into
 * the key manager through its `skipPredicate` instead.
 */
export interface AndesListNavigationItemRef {
  /** Stable DOM `id`, used to wire `aria-activedescendant` in `active-descendant` mode. */
  readonly itemId: string;
  /** Whether this item should be skipped while navigating. */
  readonly isDisabled: Signal<boolean>;
  /** The item's host element. */
  readonly element: HTMLElement;
  /** Text matched against by typeahead. */
  getLabel(): string;
  /** Moves real DOM focus to the item. Only ever called in `roving-tabindex` mode. */
  focus(): void;
  /** Required by the CDK's `Highlightable`; see {@link AndesListNavigationItem}. */
  setActiveStyles(): void;
  /** Required by the CDK's `Highlightable`; see {@link AndesListNavigationItem}. */
  setInactiveStyles(): void;
}
