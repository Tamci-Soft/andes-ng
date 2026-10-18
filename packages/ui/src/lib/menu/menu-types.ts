import {
  InjectionToken,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';

/**
 * How the menu lays out its items.
 *
 * - `vertical`: a stacked list; submenus open as popups beside their row.
 * - `horizontal`: a bar; submenus open as popups below their item, and items that
 *   do not fit collapse into an overflow submenu.
 * - `inline`: a stacked list whose submenus expand in place (animated height) and
 *   are indented per level.
 */
export type AndesMenuMode = 'vertical' | 'horizontal' | 'inline';

/**
 * `light` follows the page theme. `dark` re-scopes the design tokens to their dark
 * values on the menu (and its popups), which gives a dark sidebar on a light page.
 */
export type AndesMenuTheme = 'light' | 'dark';

/** Row height: sm 24px, md 32px (default), lg 40px. */
export type AndesMenuSize = 'sm' | 'md' | 'lg';

/** What opens a popup submenu from a pointer. */
export type AndesMenuTriggerAction = 'hover' | 'click';

/** An icon: a template to render, or a plain string (glyph, emoji or icon-font ligature). */
export type AndesMenuIcon = TemplateRef<unknown> | string;

/** A label: plain text or a template. */
export type AndesMenuLabel = string | TemplateRef<unknown>;

/** Context handed to a custom `expandIcon` template. */
export interface AndesMenuExpandIconContext {
  /** Whether the submenu is open. */
  $implicit: boolean;
  /** Whether the submenu opens as a popup (otherwise it expands inline). */
  popup: boolean;
}

/** Fields shared by every node of the data-driven `items` model. */
interface AndesMenuNodeBase {
  /** Identifies the node in `selectedKeys`, `openKeys` and event key paths. */
  key?: string;
  label?: AndesMenuLabel;
  icon?: AndesMenuIcon;
  disabled?: boolean;
  /** Tooltip text shown for the collapsed rail (defaults to the label). */
  title?: string;
}

/** A leaf item. With `href` it renders as a link. */
export interface AndesMenuItemNode extends AndesMenuNodeBase {
  type?: 'item';
  key: string;
  danger?: boolean;
  /** Trailing hint, typically a keyboard shortcut. */
  extra?: string;
  href?: string;
  target?: string;
  rel?: string;
  children?: undefined;
}

/** An item with `children` becomes a submenu. */
export interface AndesMenuSubMenuNode extends AndesMenuNodeBase {
  type?: 'submenu';
  key: string;
  extra?: string;
  children: readonly AndesMenuNode[];
}

/** A titled group of nodes. */
export interface AndesMenuGroupNode extends AndesMenuNodeBase {
  type: 'group';
  children: readonly AndesMenuNode[];
}

/** A separator line. */
export interface AndesMenuDividerNode {
  type: 'divider';
  key?: string;
  dashed?: boolean;
}

export type AndesMenuNode =
  | AndesMenuItemNode
  | AndesMenuSubMenuNode
  | AndesMenuGroupNode
  | AndesMenuDividerNode;

/** Emitted when an item is activated. `keyPath` runs from the item up to the root. */
export interface AndesMenuClickEvent {
  key: string;
  keyPath: readonly string[];
  event: Event;
}

/** Emitted by `select` / `deselect`. */
export interface AndesMenuSelectEvent {
  key: string;
  keyPath: readonly string[];
  /** The selection after the change. */
  selectedKeys: readonly string[];
  event: Event;
}

/** Emitted when a submenu opens or closes. */
export interface AndesMenuOpenChangeEvent {
  key: string;
  open: boolean;
  /** The open submenu keys after the change. */
  openKeys: readonly string[];
}

/** Where focus goes when a submenu is opened from the keyboard. */
export type AndesMenuFocusTarget = 'first' | 'last' | null;

/**
 * Something a menu lays out as a direct child of its list: the unit the horizontal
 * overflow logic hides or moves into the overflow popup.
 *
 * @internal
 */
export interface AndesMenuUnit {
  readonly host: HTMLElement;
  /** Set by the menu when the unit no longer fits in the bar. */
  readonly overflowed: WritableSignal<boolean>;
  /** The unit's own rendering, which the overflow popup re-renders. */
  readonly view: Signal<TemplateRef<unknown> | undefined>;
  /** Whether the unit is a separator (dropped when it leads the overflow popup). */
  readonly divider: boolean;
}

/**
 * A focusable row: a leaf item or a submenu title.
 *
 * @internal
 */
export interface AndesMenuEntry {
  readonly id: string;
  readonly kind: 'item' | 'sub';
  readonly key: Signal<string>;
  readonly disabled: Signal<boolean>;
  readonly host: HTMLElement;
  /** The focusable element currently rendered for this row, if any. */
  readonly row: Signal<HTMLElement | null>;
  readonly level: AndesMenuLevel;
  /** Whether the row renders inside a popup panel (as opposed to the bar or inline list). */
  readonly inPopup: Signal<boolean>;
  /** The visible text of the row. Read on demand (typeahead, tooltips). */
  readonly text: () => string;
  /** Tooltip text for the collapsed rail. */
  readonly tooltipText: () => string;
  /** The submenu behind this row, when it is a submenu title. Set once by the submenu. */
  sub: AndesMenuSubRef | null;
}

/**
 * Where a node sits in the tree: the root list, a submenu or a group.
 *
 * @internal
 */
export interface AndesMenuLevel {
  /** Number of enclosing submenus: drives the inline indentation. */
  readonly depth: number;
  /** The nearest enclosing submenu, `null` at the root. */
  readonly sub: AndesMenuSubRef | null;
  /** Whether rows at this level render inside a popup panel. */
  readonly inPopup: Signal<boolean>;
  /** True only for the root list itself (the level whose children can overflow). */
  readonly isRoot: boolean;
}

/**
 * What the menu and the rows need from a submenu.
 *
 * @internal
 */
export interface AndesMenuSubRef {
  readonly entry: AndesMenuEntry;
  readonly level: AndesMenuLevel;
  readonly isOpen: Signal<boolean>;
  /** The submenu whose popup this one opens from (the overflow submenu for overflowed ones). */
  readonly chainParent: Signal<AndesMenuSubRef | null>;
  /** The popup panel element, while open. */
  readonly panel: Signal<HTMLElement | null>;
  readonly usesPopup: Signal<boolean>;
  open(focus?: AndesMenuFocusTarget): void;
  close(): void;
  toggle(focus?: AndesMenuFocusTarget): void;
  scheduleOpen(): void;
  scheduleClose(): void;
  cancelTimers(): void;
  /** Moves focus to the first / last navigable row of the popup (after it renders). */
  focusRowIn(target: 'first' | 'last'): void;
}

/**
 * What a row template binds to. One implementation per row kind, shared by the
 * `AndesMenuRow` directive that sits on the focusable element.
 *
 * @internal
 */
export interface AndesMenuRowBinding {
  readonly entry: AndesMenuEntry;
  readonly role: Signal<string | null>;
  readonly tabIndex: Signal<number>;
  readonly checked: Signal<boolean | null>;
  readonly current: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly expanded: Signal<boolean | null>;
  readonly hasPopup: Signal<boolean>;
  readonly controls: Signal<string | null>;
  readonly selected: Signal<boolean>;
  readonly bar: Signal<boolean>;
  readonly opened: Signal<boolean>;
  attach(element: HTMLElement): void;
  detach(element: HTMLElement): void;
  onClick(event: MouseEvent): void;
  onKeydown(event: KeyboardEvent): void;
  onFocus(): void;
  onFocusOut(event: FocusEvent): void;
  onPointerEnter(event: PointerEvent): void;
  onPointerLeave(event: PointerEvent): void;
}

/**
 * The surface of `AndesMenu` the rows and submenus depend on.
 *
 * @internal
 */
export interface AndesMenuContext {
  readonly instanceId: string;
  readonly host: HTMLElement;
  readonly mode: Signal<AndesMenuMode>;
  readonly theme: Signal<AndesMenuTheme>;
  readonly size: Signal<AndesMenuSize>;
  /** True for an inline menu folded into its icon rail. */
  readonly collapsed: Signal<boolean>;
  /** Whether submenus open as popups (every mode except an expanded inline menu). */
  readonly popupSubmenus: Signal<boolean>;
  readonly navigation: Signal<boolean>;
  readonly selectable: Signal<boolean>;
  readonly multiple: Signal<boolean>;
  readonly inlineIndent: Signal<number>;
  readonly triggerAction: Signal<AndesMenuTriggerAction>;
  readonly openDelay: Signal<number>;
  readonly closeDelay: Signal<number>;
  readonly expandIcon: Signal<TemplateRef<AndesMenuExpandIconContext> | null>;
  /** The id of the row that carries `tabindex="0"` in the roving tab order. */
  readonly tabStopId: Signal<string | null>;
  /** The "…" submenu that holds the overflowed units, while there are any. */
  readonly overflowSub: Signal<AndesMenuSubRef | null>;
  /** The custom "…" template for the horizontal overflow submenu, if any. */
  readonly overflowIndicator: Signal<TemplateRef<unknown> | null>;
  /** Accessible name of the overflow submenu's trigger. */
  readonly overflowLabel: Signal<string>;
  /** The units currently moved into the overflow popup, in bar order. */
  readonly overflowUnits: Signal<readonly AndesMenuUnit[]>;
  /** Every registered row, in registration order. */
  readonly entries: Signal<readonly AndesMenuEntry[]>;
  isSelected(key: string): boolean;
  isOpen(key: string): boolean;
  /** Whether a selected row sits somewhere below this submenu. */
  hasSelectedDescendant(sub: AndesMenuSubRef): boolean;
  registerEntry(entry: AndesMenuEntry): void;
  unregisterEntry(entry: AndesMenuEntry): void;
  registerUnit(unit: AndesMenuUnit): void;
  unregisterUnit(unit: AndesMenuUnit): void;
  registerOverflowSub(sub: AndesMenuSubRef | null): void;
  /** Opens or closes a submenu, closing the siblings and descendants that must follow. */
  setOpen(sub: AndesMenuSubRef, open: boolean): void;
  closeAllPopups(): void;
  /** Called when an item row is activated by the pointer or the keyboard. */
  activate(entry: AndesMenuEntry, event: Event): void;
  /** Called when the pointer enters any row: lets open sibling submenus start closing. */
  rowPointerEntered(entry: AndesMenuEntry): void;
  keydown(entry: AndesMenuEntry, event: KeyboardEvent): void;
  rowFocused(entry: AndesMenuEntry): void;
  rowFocusLeft(event: FocusEvent): void;
  showTooltip(entry: AndesMenuEntry, immediate: boolean): void;
  hideTooltip(): void;
  /** Whether a DOM node belongs to this menu, including its popups. */
  owns(node: Node | null): boolean;
  isRtl(element: Element): boolean;
  keyPathOf(entry: AndesMenuEntry): readonly string[];
}

/** The menu the current node belongs to. */
export const ANDES_MENU = new InjectionToken<AndesMenuContext>('ANDES_MENU');

/** The level (root, submenu or group) the current node sits in. */
export const ANDES_MENU_LEVEL = new InjectionToken<AndesMenuLevel>(
  'ANDES_MENU_LEVEL',
);

/** The `key` a submenu uses for the overflow popup. */
export const ANDES_MENU_OVERFLOW_KEY = '__andes-menu-overflow__';
