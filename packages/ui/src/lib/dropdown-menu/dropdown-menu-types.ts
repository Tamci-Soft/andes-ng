import type { TemplateRef } from '@angular/core';

/**
 * What opens the menu. Mirrors Ant Design's `Dropdown.trigger` values, including its
 * camel-cased `'contextMenu'`.
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

/** Ant Design's twelve `Dropdown.placement` values. */
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
 * Why the open state changed. Ant Design reports only `'trigger' | 'menu'`; this is a
 * superset of it - every value except `item`, `tab-out` and `hover` leaving the panel
 * is what Ant would call `'trigger'`.
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

/** Payload of `(openStateChange)`: Ant's `onOpenChange(open, info)` as one object. */
export interface AndesDropdownMenuOpenChange {
  readonly open: boolean;
  readonly source: AndesDropdownMenuOpenChangeSource;
}

/** Payload of `(itemClick)`: Ant's `menu.onClick({ key, keyPath, domEvent, item })`. */
export interface AndesDropdownMenuClickEvent {
  /** The activated item's `key`. */
  readonly key: string;
  /** The item's key followed by each ancestor submenu's key, innermost first (Ant's order). */
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

/** A plain, activatable entry of the `items` array (Ant's `MenuItemType`). */
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

/** A nested submenu (Ant's `SubMenuType`). `type` is optional when `children` is present. */
export interface AndesDropdownMenuSubmenuOption {
  readonly type?: 'submenu';
  readonly key: string;
  readonly label: AndesDropdownMenuLabelValue;
  readonly icon?: TemplateRef<unknown>;
  readonly disabled?: boolean;
  readonly title?: string;
  readonly children: readonly AndesDropdownMenuItemDef[];
}

/** A labelled, non-interactive group of items (Ant's `MenuItemGroupType`). */
export interface AndesDropdownMenuGroupOption {
  readonly type: 'group';
  readonly key?: string;
  readonly label?: AndesDropdownMenuLabelValue;
  readonly children: readonly AndesDropdownMenuItemDef[];
}

/** A separator line (Ant's `MenuDividerType`). */
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

/** Narrows an `items` entry to a submenu: explicit `type: 'submenu'`, or Ant's implicit `children`. */
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
