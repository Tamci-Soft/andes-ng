import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  Signal,
} from '@angular/core';

import { AndesListNavigation } from './list-navigation';
import { AndesListNavigationItemRef } from './list-navigation-types';

let nextId = 0;

/**
 * One navigable item inside a list governed by {@link AndesListNavigation}: an option, a
 * menu item or a tab. Registers itself with the parent on init and removes itself on
 * destroy, so `@if`/`@for`-driven lists and CDK-overlay popups work without any manual
 * bookkeeping.
 *
 * It manages only the mechanics of being navigable — the roving `tabindex`, a stable `id`
 * for `aria-activedescendant`, and `data-active`/`data-disabled` hooks for styling. Roles
 * and selection attributes (`role="option"`, `aria-selected`, `aria-checked`) stay with the
 * consuming component.
 *
 * ```html
 * <button type="button" andesListNavigationItem [disabled]="option.disabled">
 *   {{ option.label }}
 * </button>
 * ```
 */
@Directive({
  selector: '[andesListNavigationItem]',
  host: {
    '[attr.id]': 'itemId',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(focusin)': 'onFocusin()',
  },
})
export class AndesListNavigationItem
  implements AndesListNavigationItemRef, OnInit, OnDestroy
{
  /** Whether the item is skipped while navigating. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Text typeahead matches against. Defaults to the item's own text content, which is
   * usually right; set it when the visible text is decorative or split across elements.
   */
  readonly typeaheadLabel = input<string>();

  /** @internal Mirrors {@link disabled} under the name the parent's item contract uses. */
  readonly isDisabled: Signal<boolean> = this.disabled;

  private readonly navigation = inject(AndesListNavigation);

  readonly element: HTMLElement =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The item's DOM `id` — its own, when it has one, so authored ids are never clobbered. */
  readonly itemId: string =
    this.element.id || `andes-list-navigation-item-${nextId++}`;

  /** Whether this is the parent's active item. */
  readonly active = computed(() => this.navigation.activeItem() === this);

  /**
   * `0` on the one roving-tabindex target, `-1` on every other item, and absent entirely in
   * `active-descendant` mode, where items are not focusable at all.
   */
  protected readonly tabIndex = computed<number | null>(() => {
    if (this.navigation.focusMode() === 'active-descendant') {
      return null;
    }
    return this.navigation.rovingTabindexTarget() === this ? 0 : -1;
  });

  ngOnInit(): void {
    this.navigation.register(this);
  }

  ngOnDestroy(): void {
    this.navigation.unregister(this);
  }

  getLabel(): string {
    return this.typeaheadLabel() ?? (this.element.textContent ?? '').trim();
  }

  focus(): void {
    this.element.focus();
  }

  /**
   * The CDK's `Highlightable` hook, called only in `active-descendant` mode. Andes derives
   * the active *styling* from the parent's signal instead (see {@link active}), so that it
   * works identically in both focus modes; what is genuinely mode-specific is scrolling —
   * real focus never moves here, so the item has to bring itself into view.
   */
  setActiveStyles(): void {
    this.element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  /**
   * Counterpart to {@link setActiveStyles}. Nothing to undo: the active styling is derived
   * from the parent's signal, and scrolling is not reversible.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- required by the CDK's `Highlightable` interface
  setInactiveStyles(): void {}

  /**
   * Keeps the roving `tabindex` on whichever item the user actually reached, including via
   * mouse or a direct Tab, so Tabbing away and back returns to the same place.
   */
  protected onFocusin(): void {
    if (
      this.navigation.focusMode() === 'roving-tabindex' &&
      this.navigation.activeItem() !== this
    ) {
      this.navigation.setActiveItemSilently(this);
    }
  }
}
