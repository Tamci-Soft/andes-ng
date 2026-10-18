import type { Signal } from '@angular/core';

import type {
  AndesDropdownMenuClickEvent,
  AndesDropdownMenuOpenChangeSource,
  AndesDropdownMenuSelectEvent,
} from '../dropdown-menu/dropdown-menu-types';

/** Control height of the bar's triggers: 24, 32 or 40px. */
export type AndesMenubarSize = 'sm' | 'md' | 'lg';

/**
 * - `default` - the bar is a bordered surface of its own.
 * - `plain` - no border, background or padding, for a bar that sits in an app header.
 */
export type AndesMenubarVariant = 'default' | 'plain';

/** Where a menu's panel aligns along the edge of its trigger. */
export type AndesMenubarAlign = 'start' | 'center' | 'end';

/**
 * Why a menu opened or closed: the same values as the dropdown menu.
 *
 * - `trigger` - a click on the menu's trigger.
 * - `hover` - the pointer moved onto the trigger while another menu was open.
 * - `keyboard` - Enter, Space or an arrow key.
 * - `item`, `escape-key`, `outside-click`, `tab-out` - from inside the open menu.
 */
export type AndesMenubarOpenChangeSource = AndesDropdownMenuOpenChangeSource;

/** Payload of a menu's `(openStateChange)`. */
export interface AndesMenubarOpenChange {
  readonly open: boolean;
  readonly source: AndesMenubarOpenChangeSource;
}

/** Payload of `(itemClick)`: the activated item, and the `value` of the menu it sits in. */
export interface AndesMenubarClickEvent extends AndesDropdownMenuClickEvent {
  readonly menu: string;
}

/** Payload of `(itemSelect)`/`(itemDeselect)`, emitted only while `selectable` is on. */
export interface AndesMenubarSelectEvent extends AndesDropdownMenuSelectEvent {
  readonly menu: string;
}

/** What opening a menu from code can ask for. */
export interface AndesMenubarShowOptions {
  /**
   * Where focus goes. `first`/`last` focus that item, `none` leaves focus on the
   * trigger (the pointer's way to open a menu). Default `first`.
   */
  readonly focus?: 'first' | 'last' | 'none';
  /** Reported through `(openStateChange)`. Default `programmatic`. */
  readonly source?: AndesMenubarOpenChangeSource;
}

/** What the bar needs from one of its menus. */
export interface AndesMenubarMenuRef {
  readonly value: Signal<string>;
  readonly isOpen: Signal<boolean>;
  show(options?: AndesMenubarShowOptions): void;
  hide(
    source: AndesMenubarOpenChangeSource,
    options?: { readonly restoreFocus?: boolean },
  ): void;
  focusFirstItem(): void;
  focusLastItem(): void;
}

/** What the bar needs from one of its triggers. */
export interface AndesMenubarTriggerRef {
  readonly element: HTMLElement;
  readonly menu: AndesMenubarMenuRef;
  readonly isDisabled: Signal<boolean>;
  focus(): void;
}
