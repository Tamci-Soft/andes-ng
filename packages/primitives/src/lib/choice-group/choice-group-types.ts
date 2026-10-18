import type { Signal } from '@angular/core';

import type { AndesListNavigationItemRef } from '../listbox/list-navigation-types';

/**
 * How many items can be selected at once.
 *
 * - `single` — at most one item; `value` is that item's value, or `null` when none is.
 * - `multiple` — any number of items; `value` is an array (`null` is read as empty).
 */
export type AndesChoiceMode = 'single' | 'multiple';

/**
 * The value held by a choice group: one item's value (or `null`) in `single` mode, an array
 * of values in `multiple` mode. The two shapes share one type so `[(value)]` stays a single
 * binding whatever the mode.
 */
export type AndesChoiceValue<T> = T | readonly T[] | null;

/**
 * The `role` of the group element. It selects a whole {@link AndesChoiceRoleMapping}, so one
 * primitive can serve every "pick from a set" pattern:
 *
 * - `radiogroup` — radio buttons and segmented controls.
 * - `tablist` — tabs.
 * - `toolbar` / `group` — toggle-button groups (`group` when it is not a toolbar).
 * - `listbox` — a listbox whose options are the choices.
 */
export type AndesChoiceGroupRole =
  'radiogroup' | 'tablist' | 'toolbar' | 'group' | 'listbox';

/** The `role` of each item; implied by the group's {@link AndesChoiceGroupRole}. */
export type AndesChoiceItemRole = 'radio' | 'tab' | 'button' | 'option';

/** The ARIA attribute that carries an item's selected state under a given role. */
export type AndesChoiceStateAttribute =
  'aria-checked' | 'aria-selected' | 'aria-pressed';

/** The value of an item's `data-state` styling hook; which pair applies depends on its role. */
export type AndesChoiceDataState =
  | 'checked'
  | 'unchecked'
  | 'active'
  | 'inactive'
  | 'on'
  | 'off'
  | 'selected'
  | 'unselected';

/**
 * Everything that differs between the patterns a choice group can render. Each
 * {@link AndesChoiceGroupRole} has a default mapping in {@link ANDES_CHOICE_ROLE_MAPPINGS};
 * the group's `roleMapping` input overrides single fields of it.
 */
export interface AndesChoiceRoleMapping {
  /** `role` set on every item. */
  readonly itemRole: AndesChoiceItemRole;
  /** The ARIA attribute that reports whether an item is selected. */
  readonly stateAttribute: AndesChoiceStateAttribute;
  /**
   * Whether activating the selected item in `single` mode clears it. Radios and tabs never
   * deselect; a toggle button does. (`multiple` mode always toggles.)
   */
  readonly toggles: boolean;
  /**
   * Whether keyboard navigation also selects the item it lands on, rather than waiting for
   * `Space`/`Enter`. Only meaningful in `single` mode.
   */
  readonly selectionFollowsFocus: boolean;
  /** Whether the role supports `aria-required`, which `required` is then published as. */
  readonly ariaRequired: boolean;
  /** Which arrow keys navigate when `orientation` is not set explicitly. */
  readonly orientation: 'horizontal' | 'vertical' | 'both';
}

/**
 * Default {@link AndesChoiceRoleMapping} for every {@link AndesChoiceGroupRole}, following
 * the WAI-ARIA Authoring Practices pattern of the same name.
 */
export const ANDES_CHOICE_ROLE_MAPPINGS: Readonly<
  Record<AndesChoiceGroupRole, AndesChoiceRoleMapping>
> = {
  radiogroup: {
    itemRole: 'radio',
    stateAttribute: 'aria-checked',
    toggles: false,
    selectionFollowsFocus: true,
    ariaRequired: true,
    orientation: 'both',
  },
  tablist: {
    itemRole: 'tab',
    stateAttribute: 'aria-selected',
    toggles: false,
    selectionFollowsFocus: true,
    ariaRequired: false,
    orientation: 'horizontal',
  },
  toolbar: {
    itemRole: 'button',
    stateAttribute: 'aria-pressed',
    toggles: true,
    selectionFollowsFocus: false,
    ariaRequired: false,
    orientation: 'horizontal',
  },
  group: {
    itemRole: 'button',
    stateAttribute: 'aria-pressed',
    toggles: true,
    selectionFollowsFocus: false,
    ariaRequired: false,
    orientation: 'horizontal',
  },
  listbox: {
    itemRole: 'option',
    stateAttribute: 'aria-selected',
    toggles: false,
    selectionFollowsFocus: false,
    ariaRequired: true,
    orientation: 'vertical',
  },
};

/**
 * What the group needs to know about one of its items. {@link AndesChoiceItem} implements
 * it; the group only ever sees items through this contract, which is what lets the two
 * classes live in separate files without importing each other.
 */
export interface AndesChoiceItemRef extends AndesListNavigationItemRef {
  /** The value this item stands for, compared against the group's value. */
  readonly value: Signal<unknown>;
}
