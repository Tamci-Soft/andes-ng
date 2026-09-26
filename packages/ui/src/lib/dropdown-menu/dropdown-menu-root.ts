import type { Signal, TemplateRef } from '@angular/core';

import type { AndesDropdownMenuOpenChangeSource } from './dropdown-menu-types';

/** What activating an item reports to the root. */
export interface AndesDropdownMenuActivation {
  readonly key: string | undefined;
  readonly keyPath: readonly string[];
  readonly event: Event;
  readonly closeOnSelect: boolean;
}

/**
 * The contract every sub-part (trigger, items, submenus, panels) relies on, provided by
 * `AndesDropdownMenu` (and `AndesDropdownButton`, which is one).
 *
 * The sub-parts inject this abstract class instead of the concrete component because
 * the root's own template renders some of them (the `items` array renderer), so a
 * direct reference would be an import cycle.
 */
export abstract class AndesDropdownMenuRoot {
  /** Whether the whole menu is disabled - its trigger opens nothing. */
  abstract readonly isDisabled: Signal<boolean>;
  /** Whether the menu is currently open. */
  abstract readonly isOpen: Signal<boolean>;
  /** Whether keyed items are selectable. */
  abstract readonly isSelectable: Signal<boolean>;
  /** Whether more than one key can be selected at once. */
  abstract readonly isMultiple: Signal<boolean>;
  /** Custom submenu expand icon, if any. */
  abstract readonly expandIcon: Signal<TemplateRef<unknown> | undefined>;
  /** How submenus open from their trigger item. */
  abstract readonly triggerSubMenuAction: Signal<'hover' | 'click'>;
  /** Hover-intent delay before a submenu opens, in ms. */
  abstract readonly subMenuOpenDelay: Signal<number>;
  /** Grace period before a submenu closes once the pointer moves elsewhere, in ms. */
  abstract readonly subMenuCloseDelay: Signal<number>;

  /** Whether `key` is currently selected. */
  abstract isKeySelected(key: string): boolean;
  /** Called by every activatable item. Emits the click/select events and closes if asked. */
  abstract activateItem(activation: AndesDropdownMenuActivation): void;
  /** Closes the menu (and every open submenu). */
  abstract hide(source: AndesDropdownMenuOpenChangeSource): void;
  /** The pointer entered the trigger or any of the menu's panels. */
  abstract pointerEntered(): void;
  /** The pointer left the trigger or one of the menu's panels. */
  abstract pointerLeft(): void;

  /** Current value of the named radio group. */
  abstract radioGroupValue(name: string): Signal<unknown>;
  /** Selects `value` within the named radio group. */
  abstract setRadioGroupValue(name: string, value: unknown): void;
}
