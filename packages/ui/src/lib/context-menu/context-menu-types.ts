import type {
  AndesDropdownMenuClickEvent,
  AndesDropdownMenuOpenChangeSource,
  AndesDropdownMenuSelectEvent,
} from '../dropdown-menu/dropdown-menu-types';

/**
 * Why the open state changed.
 *
 * - `context-menu` - a right-click (or the platform's own context-menu gesture).
 * - `long-press` - a touch or pen press held for `longPressDelay`.
 * - `keyboard` - the context-menu key or Shift+F10.
 * - `scroll` - the page scrolled or the window resized while the menu was open.
 * - Everything else - `item`, `escape-key`, `outside-click`, `tab-out`, `programmatic` -
 *   comes from the menu itself.
 */
export type AndesContextMenuOpenChangeSource =
  AndesDropdownMenuOpenChangeSource | 'long-press' | 'scroll';

/** Payload of `(openStateChange)`: the new open state and what caused it, as one object. */
export interface AndesContextMenuOpenChange {
  readonly open: boolean;
  readonly source: AndesContextMenuOpenChangeSource;
}

/** Payload of `(itemClick)`: the activated item, plus the context of the area that opened the menu. */
export interface AndesContextMenuClickEvent extends AndesDropdownMenuClickEvent {
  /**
   * The value bound to `andesContextMenuContext` on the area the menu was opened from
   * (a table row, a file, a canvas shape...), or `undefined`.
   */
  readonly context: unknown;
}

/** Payload of `(itemSelect)`/`(itemDeselect)`, emitted only while `selectable` is on. */
export interface AndesContextMenuSelectEvent extends AndesDropdownMenuSelectEvent {
  readonly context: unknown;
}

/** Options of `AndesContextMenu.openAt`. */
export interface AndesContextMenuOpenOptions {
  /** Reported through `(openStateChange)`. Default `'programmatic'`. */
  readonly source?: AndesContextMenuOpenChangeSource;
  /** Whether to move focus to the first item. Defaults to the menu's `autoFocus`. */
  readonly focus?: boolean;
  /** Reported back in `(itemClick)`'s `context`. */
  readonly context?: unknown;
}

/** A viewport coordinate pair, in CSS pixels. */
export interface AndesContextMenuPoint {
  readonly x: number;
  readonly y: number;
}
