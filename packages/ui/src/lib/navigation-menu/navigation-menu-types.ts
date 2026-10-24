import { InjectionToken, type Signal, type TemplateRef } from '@angular/core';

/** Where the shared panel sits relative to the trigger it belongs to. */
export type AndesNavigationMenuAlign = 'start' | 'center' | 'end';

/** What made the panel open, which decides whether focus moves into it. */
export type AndesNavigationMenuOpenSource = 'pointer' | 'keyboard' | 'api';

/**
 * What an item needs from its content: the template the panel (or the stacked list)
 * renders, and the layout hints.
 *
 * @internal
 */
export interface AndesNavigationMenuContentRef {
  readonly template: Signal<TemplateRef<unknown> | undefined>;
  readonly columns: Signal<number>;
  readonly width: Signal<string | null>;
}

/**
 * One top-level entry of the bar: a link, or a trigger with content.
 *
 * @internal
 */
export interface AndesNavigationMenuItemRef {
  readonly key: Signal<string>;
  readonly disabled: Signal<boolean>;
  /** The trigger element, when the item has content. */
  readonly trigger: Signal<HTMLElement | null>;
  readonly content: Signal<AndesNavigationMenuContentRef | null>;
  readonly host: HTMLElement;
  setTrigger(element: HTMLElement | null): void;
}

/**
 * The surface of `AndesNavigationMenu` its parts depend on.
 *
 * @internal
 */
export interface AndesNavigationMenuContext {
  readonly instanceId: string;
  readonly host: HTMLElement;
  /** Value of the item whose content is open, or `null`. */
  readonly value: Signal<string | null>;
  /** Whether the menu is showing its stacked (narrow screen) form. */
  readonly mobile: Signal<boolean>;
  readonly closeOnNavigate: Signal<boolean>;
  registerItem(item: AndesNavigationMenuItemRef): void;
  unregisterItem(item: AndesNavigationMenuItemRef): void;
  panelId(value: string): string;
  isOpen(item: AndesNavigationMenuItemRef): boolean;
  open(
    item: AndesNavigationMenuItemRef,
    source: AndesNavigationMenuOpenSource,
  ): void;
  close(restoreFocus: boolean): void;
  triggerClicked(item: AndesNavigationMenuItemRef, event: MouseEvent): void;
  triggerPointerEntered(item: AndesNavigationMenuItemRef): void;
  triggerPointerLeft(): void;
  barKeydown(
    event: KeyboardEvent,
    item: AndesNavigationMenuItemRef | null,
  ): void;
  panelKeydown(event: KeyboardEvent): void;
  linkActivated(): void;
}

export const ANDES_NAVIGATION_MENU =
  new InjectionToken<AndesNavigationMenuContext>('ANDES_NAVIGATION_MENU');

export const ANDES_NAVIGATION_MENU_ITEM =
  new InjectionToken<AndesNavigationMenuItemRef>('ANDES_NAVIGATION_MENU_ITEM');

/** Present for anything rendered inside an item's content. */
export const ANDES_NAVIGATION_MENU_CONTENT =
  new InjectionToken<AndesNavigationMenuContentRef>(
    'ANDES_NAVIGATION_MENU_CONTENT',
  );
