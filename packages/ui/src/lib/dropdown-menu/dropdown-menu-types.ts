import type { TemplateRef } from '@angular/core';

/**
 * What opens the menu. Note the camel-cased `'contextMenu'`, unlike the kebab-cased
 * `'context-menu'` open-change source.
 *
 * - `click` - a click (or Enter/Space, which a `<button>` turns into a click) toggles it.
 * - `hover` - pointer hover opens it after `mouseEnterDelay` and closes it
 *   `mouseLeaveDelay` after the pointer has left both the trigger and every open panel.
 *   A click still *opens* a hover menu (never closes it), so it stays reachable by
 *   keyboard and touch.
 * - `contextMenu` - a right-click (or the context-menu key / Shift+F10) opens it at the
 *   pointer position instead of against the trigger's box.
 */
export type AndesDropdownMenuTriggerAction = 'click' | 'hover' | 'contextMenu';

/** The twelve placements: a side of the trigger, optionally aligned to one of its ends. */
export type AndesDropdownMenuPlacement =
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'
  | 'left'
  | 'leftTop'
  | 'leftBottom'
  | 'right'
  | 'rightTop'
  | 'rightBottom';

/** Whether to render an arrow, and whether to shift the panel so it points at the trigger's center. */
export type AndesDropdownMenuArrow =
  boolean | { readonly pointAtCenter: boolean };

/**
 * Why the open state changed. Every value except `item`, `tab-out` and `hover` leaving
 * the panel is a trigger-side change; those three originate in the menu itself.
 */
export type AndesDropdownMenuOpenChangeSource =
  | 'trigger'
  | 'hover'
  | 'context-menu'
  | 'keyboard'
  | 'item'
  | 'escape-key'
  | 'outside-click'
  | 'tab-out'
  | 'programmatic';

/** Payload of `(openStateChange)`: the new open state and what caused it, as one object. */
export interface AndesDropdownMenuOpenChange {
  readonly open: boolean;
  readonly source: AndesDropdownMenuOpenChangeSource;
}

/** Payload of `(itemClick)`: which item was activated, where it sits, and by what event. */
export interface AndesDropdownMenuClickEvent {
  /** The activated item's `key`. */
  readonly key: string;
  /** The item's key followed by each ancestor submenu's key, innermost first. */
  readonly keyPath: readonly string[];
  /** The click or keydown that activated the item. */
  readonly event: Event;
  /** The matching entry of the `items` array, or `null` for a projected item. */
  readonly item: AndesDropdownMenuItemOption | null;
}

/** Payload of `(itemSelect)`/`(itemDeselect)`, emitted only while `selectable` is on. */
export interface AndesDropdownMenuSelectEvent extends AndesDropdownMenuClickEvent {
  /** The selection after this change. */
  readonly selectedKeys: readonly string[];
}

/** `string` renders as text; a `TemplateRef` renders as-is. */
export type AndesDropdownMenuLabelValue = string | TemplateRef<unknown>;

/** A plain, activatable entry of the `items` array. */
export interface AndesDropdownMenuItemOption {
  readonly type?: 'item';
  readonly key: string;
  readonly label: AndesDropdownMenuLabelValue;
  /** Leading icon. A template, since the library ships no icon set of its own. */
  readonly icon?: TemplateRef<unknown>;
  /** Trailing content - a shortcut hint, a badge. */
  readonly extra?: AndesDropdownMenuLabelValue;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  /** Typeahead text, for a `TemplateRef` label. Defaults to the rendered text. */
  readonly title?: string;
}

/** A nested submenu. `type` is optional when `children` is present. */
export interface AndesDropdownMenuSubmenuOption {
  readonly type?: 'submenu';
  readonly key: string;
  readonly label: AndesDropdownMenuLabelValue;
  readonly icon?: TemplateRef<unknown>;
  readonly disabled?: boolean;
  readonly title?: string;
  readonly children: readonly AndesDropdownMenuItemDef[];
}

/** A labelled, non-interactive group of items. */
export interface AndesDropdownMenuGroupOption {
  readonly type: 'group';
  readonly key?: string;
  readonly label?: AndesDropdownMenuLabelValue;
  readonly children: readonly AndesDropdownMenuItemDef[];
}

/** A separator line. */
export interface AndesDropdownMenuDividerOption {
  readonly type: 'divider';
  readonly key?: string;
  readonly dashed?: boolean;
}

/** One entry of the `items` array. */
export type AndesDropdownMenuItemDef =
  | AndesDropdownMenuItemOption
  | AndesDropdownMenuSubmenuOption
  | AndesDropdownMenuGroupOption
  | AndesDropdownMenuDividerOption;

/** Narrows an `items` entry to a submenu: explicit `type: 'submenu'`, or implied by `children`. */
export function isAndesDropdownMenuSubmenu(
  def: AndesDropdownMenuItemDef,
): def is AndesDropdownMenuSubmenuOption {
  return (
    def.type === 'submenu' ||
    (def.type === undefined && 'children' in def && Array.isArray(def.children))
  );
}

/**
 * The one thing every level of the menu tree - the root panel, and each submenu's
 * panel - has in common: it can have at most one open child submenu, and it
 * contributes its key to its descendants' `keyPath`.
 *
 * An abstract class rather than an `InjectionToken` so it doubles as the DI token and
 * the type, and so the sub-parts can inject it without importing the concrete root or
 * submenu classes (which would be an import cycle, since those render the sub-parts).
 */
export abstract class AndesDropdownMenuLevel {
  /** The currently open child submenu of this level, if any. */
  abstract readonly openChild: () => AndesDropdownMenuSubmenuRef | null;
  /** Records `child` as this level's open submenu, closing any other one first. */
  abstract childOpened(child: AndesDropdownMenuSubmenuRef): void;
  /** Clears `child` as this level's open submenu, if it still is. */
  abstract childClosed(child: AndesDropdownMenuSubmenuRef): void;
  /** Keys from this level up to the root, innermost first. */
  abstract keyPath(): readonly string[];
}

/** What a level needs from one of its child submenus. */
export interface AndesDropdownMenuSubmenuRef {
  close(restoreFocus?: boolean): void;
  scheduleClose(): void;
  cancelClose(): void;
}
