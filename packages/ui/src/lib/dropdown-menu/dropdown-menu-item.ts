import { AndesListNavigationItem } from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenuRoot } from './dropdown-menu-root';
import { AndesDropdownMenuLevel } from './dropdown-menu-types';

export type AndesDropdownMenuItemVariant = 'default' | 'destructive';

/**
 * A single selectable action inside a dropdown menu.
 *
 * `role="menuitem"`, the roving `tabindex`, and the `data-active`/`data-disabled`
 * styling hooks come from the composed `AndesListNavigationItem`. Give it a `key` to
 * have it reported through the root's `(itemClick)` and, when the root is
 * `selectable`, to make it selectable - it then becomes a `menuitemradio` (or a
 * `menuitemcheckbox` when `multiple`) with `aria-checked`.
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`: its BEM class lives only in `host: {
 * class: ... }`, which emulated encapsulation's own-component-only scoping can never
 * match.
 */
@Component({
  selector: 'andes-dropdown-menu-item',
  hostDirectives: [
    {
      directive: AndesListNavigationItem,
      inputs: ['disabled', 'typeaheadLabel'],
    },
  ],
  template: `
    <ng-content select="[slot=icon-start]" />
    <ng-content />
    <ng-content select="[slot=icon-end]" />
  `,
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'andes-dropdown-menu__item',
    '[attr.role]': 'role()',
    '[attr.aria-checked]': 'isSelectable() ? isSelected() : null',
    '[attr.data-selected]': 'isSelected() ? "" : null',
    '[attr.data-variant]': 'variant()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '(click)': 'activate($event)',
    '(keydown.enter)': 'onKeydownActivate($event)',
    '(keydown.space)': 'onKeydownActivate($event)',
    '(pointerenter)': 'onPointerEnter($event)',
  },
})
export class AndesDropdownMenuItem {
  /** Identifies the item in `(itemClick)`/`selectedKeys`. Optional for a plain action. */
  readonly key = input<string | undefined>(undefined);
  /** Styles the item red, for a destructive action (Ant's `danger`). Default `'default'`. */
  readonly variant = input<AndesDropdownMenuItemVariant>('default');
  /**
   * Whether selecting the item closes the menu. Default `true`, except in a
   * `selectable` + `multiple` menu, where several picks in a row are the point.
   */
  readonly closeOnSelect = input<boolean | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null
        ? undefined
        : booleanAttribute(value),
  });
  /** Emits when the item is activated by click, Enter or Space. */
  readonly activated = output<void>();

  protected readonly navItem = inject(AndesListNavigationItem);
  protected readonly isDisabled = this.navItem.disabled;

  private readonly root = inject(AndesDropdownMenuRoot);
  private readonly level = inject(AndesDropdownMenuLevel);

  protected readonly isSelectable = computed(
    () => this.root.isSelectable() && this.key() !== undefined,
  );
  protected readonly isSelected = computed(() => {
    const key = this.key();
    return (
      this.isSelectable() && key !== undefined && this.root.isKeySelected(key)
    );
  });
  protected readonly role = computed(() => {
    if (!this.isSelectable()) {
      return 'menuitem';
    }
    return this.root.isMultiple() ? 'menuitemcheckbox' : 'menuitemradio';
  });

  protected activate(event: Event): void {
    if (this.isDisabled()) {
      return;
    }
    this.activated.emit();
    const key = this.key();
    this.root.activateItem({
      key,
      keyPath:
        key === undefined
          ? this.level.keyPath()
          : [key, ...this.level.keyPath()],
      event,
      closeOnSelect:
        this.closeOnSelect() ??
        !(this.root.isSelectable() && this.root.isMultiple()),
    });
  }

  /**
   * The item is a `<andes-dropdown-menu-item>` custom element, not a native
   * `<button>`, precisely so Enter/Space activation can be handled once, explicitly,
   * here - rather than juggling a native button's own click-on-Enter/Space behavior
   * (which browsers implement inconsistently and jsdom does not implement at all)
   * alongside a duplicate explicit handler.
   */
  protected onKeydownActivate(event: Event): void {
    event.preventDefault();
    this.activate(event);
  }

  /** Pointing at a sibling is the cue to close this level's open submenu. */
  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.level.openChild()?.scheduleClose();
    }
  }
}
