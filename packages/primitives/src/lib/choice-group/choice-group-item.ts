import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  HOST_TAG_NAME,
  inject,
  input,
  OnDestroy,
  OnInit,
  Signal,
} from '@angular/core';

import { AndesListNavigation } from '../listbox/list-navigation';
import { AndesChoiceGroup } from './choice-group';
import {
  AndesChoiceDataState,
  AndesChoiceItemRef,
  AndesChoiceStateAttribute,
} from './choice-group-types';

let nextId = 0;

/**
 * One choice inside an {@link AndesChoiceGroup}: a radio, a tab, a toggle button or an
 * option. Registers itself with the group on init and removes itself on destroy.
 *
 * It publishes the roving `tabindex`, the item `role`, the selected-state attribute the
 * group's role mapping calls for (`aria-checked`, `aria-selected` or `aria-pressed`), and
 * `data-state`/`data-disabled`/`data-active` hooks for styling. It sets no CSS.
 *
 * ```html
 * <button type="button" andesChoiceItem value="list" [controls]="'panel-list'">List</button>
 * ```
 *
 * Put it on the element that takes keyboard focus. A `<button>` is the usual choice — it
 * gets native `disabled` for free — but any element works, since `Space` and `Enter` are
 * handled by the group instead of relying on a native click.
 */
@Directive({
  selector: '[andesChoiceItem]',
  exportAs: 'andesChoiceItem',
  host: {
    '[attr.id]': 'itemId',
    '[attr.role]': 'role()',
    '[attr.aria-checked]':
      'stateAttribute() === "aria-checked" ? selected() : null',
    '[attr.aria-selected]':
      'stateAttribute() === "aria-selected" ? selected() : null',
    '[attr.aria-pressed]':
      'stateAttribute() === "aria-pressed" ? selected() : null',
    '[attr.aria-controls]': 'controls() ?? null',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.disabled]': 'nativeDisabled && isDisabled() ? "" : null',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.data-state]': 'dataState()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-active]': 'active() ? "" : null',
    '(click)': 'onClick()',
    '(focusin)': 'onFocusin()',
  },
})
export class AndesChoiceItem<T = unknown>
  implements AndesChoiceItemRef, OnInit, OnDestroy
{
  private readonly group = inject<AndesChoiceGroup<T>>(AndesChoiceGroup);
  private readonly navigation = inject(AndesListNavigation);

  /** The value this item stands for. Compared with the group's value (see its `compareWith`). */
  readonly value = input.required<T>();

  /** Disables this item: it is skipped by navigation and cannot be selected. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The `id` of the element this item controls — the tab panel, for a tab. Published as
   * `aria-controls`; leaving it unset omits the attribute, which is right for patterns
   * that control nothing.
   */
  readonly controls = input<string>();

  /**
   * Text that typeahead matches against. Defaults to the item's own text content; set it
   * when the visible text is an icon or is split across elements.
   */
  readonly typeaheadLabel = input<string>();

  readonly element: HTMLElement =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The item's DOM `id` — its own, when it has one, so authored ids are never replaced. */
  readonly itemId: string = this.element.id || `andes-choice-item-${nextId++}`;

  /** Only a native button has a `disabled` attribute worth setting; other elements get ARIA only. */
  protected readonly nativeDisabled = inject(HOST_TAG_NAME) === 'button';

  /** Whether the item is disabled, on its own or because its group is. */
  readonly isDisabled: Signal<boolean> = computed(
    () => this.disabled() || this.group.isDisabled(),
  );

  /** Whether this item is part of the group's selection. */
  readonly selected: Signal<boolean> = computed(() =>
    this.group.isSelected(this.value()),
  );

  /** Whether this item holds the group's roving focus (the one tab stop). */
  readonly active: Signal<boolean> = computed(
    () => this.navigation.activeItem() === this,
  );

  protected readonly role = computed(() => this.group.mapping().itemRole);
  protected readonly stateAttribute: Signal<AndesChoiceStateAttribute> =
    computed(() => this.group.mapping().stateAttribute);

  /** Styling hook whose vocabulary matches the role: checked, active (tab), on, or selected. */
  protected readonly dataState: Signal<AndesChoiceDataState> = computed(() => {
    const selected = this.selected();
    switch (this.stateAttribute()) {
      case 'aria-checked':
        return selected ? 'checked' : 'unchecked';
      case 'aria-pressed':
        return selected ? 'on' : 'off';
      default:
        if (this.role() === 'tab') {
          return selected ? 'active' : 'inactive';
        }
        return selected ? 'selected' : 'unselected';
    }
  });

  /** `0` on the one roving tab stop, `-1` on the rest (and on everything while disabled). */
  protected readonly tabIndex = computed(() =>
    this.navigation.rovingTabindexTarget() === this ? 0 : -1,
  );

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

  setActiveStyles(): void {
    // Only called for aria-activedescendant focus, which a choice group never uses: items
    // take real focus, and the active look is derived from `active` instead.
  }

  setInactiveStyles(): void {
    // See setActiveStyles.
  }

  protected onClick(): void {
    if (this.isDisabled()) {
      return;
    }
    // Some browsers do not focus a button on click; move the tab stop (and focus) here so
    // the keyboard continues from the item the pointer chose.
    this.navigation.setActiveItemSilently(this);
    this.element.focus({ preventScroll: true });
    this.group.activate(this);
  }

  /** Keeps the tab stop on whichever item the user reached, however they reached it. */
  protected onFocusin(): void {
    if (this.navigation.activeItem() !== this && !this.isDisabled()) {
      this.navigation.setActiveItemSilently(this);
    }
  }
}
