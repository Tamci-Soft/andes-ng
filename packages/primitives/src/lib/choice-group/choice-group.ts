import { Directionality } from '@angular/cdk/bidi';
import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  Signal,
  signal,
  untracked,
} from '@angular/core';

import { AndesListNavigation } from '../listbox/list-navigation';
import type {
  AndesListOrientation,
  AndesListTextDirection,
} from '../listbox/list-navigation-types';
import {
  ANDES_CHOICE_ROLE_MAPPINGS,
  AndesChoiceGroupRole,
  AndesChoiceItemRef,
  AndesChoiceMode,
  AndesChoiceRoleMapping,
  AndesChoiceValue,
} from './choice-group-types';

/** Whether a registered navigation item is one of this group's choice items. */
function isChoiceItem(item: object): item is AndesChoiceItemRef {
  return 'value' in item && typeof item.value === 'function';
}

/** Space or Enter without a modifier: the keys that activate the focused item. */
function isActivationKey(event: KeyboardEvent): boolean {
  return (
    (event.key === ' ' || event.key === 'Enter') &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

/**
 * The shared behavior of every "choose from a set" control: one tab stop, arrow keys move
 * between items, and `Space`/`Enter` (or focus itself) select. It owns the selection and
 * the roving focus, and publishes the ARIA that goes with them; the consuming component
 * owns the markup and the styling.
 *
 * The same directive serves radio groups, segmented controls, tabs, toggle-button groups
 * and listbox-style pickers. What changes between them is only data — the group's
 * {@link role} picks a default {@link AndesChoiceRoleMapping} (item role, which `aria-*`
 * attribute carries the selected state, whether focus selects, which arrows navigate).
 *
 * Roving focus is {@link AndesListNavigation}'s: the group provides its own instance, so
 * items — including ones rendered by a descendant component — find it through DI, and
 * arrow-key movement, `Home`/`End`, wrap-around and disabled-item skipping are the shared
 * implementation rather than a per-component copy.
 *
 * ```html
 * <div andesChoiceGroup role="radiogroup" [(value)]="size" aria-label="Size">
 *   @for (option of options; track option.value) {
 *     <button type="button" andesChoiceItem [value]="option.value" [disabled]="option.disabled">
 *       {{ option.label }}
 *     </button>
 *   }
 * </div>
 * ```
 *
 * `value` follows the user and the program alike: setting it (or binding `[value]`)
 * updates every item, but only the user's own selection fires {@link changed} — the
 * convention form-control wrappers need to tell the two apart.
 */
@Directive({
  selector: '[andesChoiceGroup]',
  exportAs: 'andesChoiceGroup',
  providers: [AndesListNavigation],
  host: {
    '[attr.role]': 'role()',
    '[attr.aria-orientation]': 'ariaOrientation()',
    '[attr.aria-multiselectable]': 'ariaMultiselectable()',
    '[attr.aria-required]': 'ariaRequired()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-orientation]': 'resolvedOrientation()',
    '(keydown)': 'onKeydown($event)',
    '(keyup)': 'onKeyup($event)',
    '(focusout)': 'onFocusout($event)',
  },
})
export class AndesChoiceGroup<T = unknown> {
  private readonly navigation = inject(AndesListNavigation);
  private readonly directionality = inject(Directionality);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * The selected value: one item's value (or `null`) in `single` mode, an array in
   * `multiple` mode. Two-way bindable.
   */
  readonly value = model<AndesChoiceValue<T>>(null);

  /** Whether one or many items can be selected. Default `'single'`. */
  readonly mode = input<AndesChoiceMode>('single');

  /**
   * The ARIA role of the group, which also decides the role and selected-state attribute
   * of its items (see {@link AndesChoiceRoleMapping}). Default `'radiogroup'`.
   */
  readonly role = input<AndesChoiceGroupRole>('radiogroup');

  /**
   * Overrides individual fields of the mapping {@link role} selects, for the rare pattern
   * that sits between two of them — e.g. a `toolbar` of items that do not deselect.
   */
  readonly roleMapping = input<Partial<AndesChoiceRoleMapping>>();

  /**
   * Whether `single` mode must always keep a selection: activating the selected item then
   * does nothing instead of clearing it. Also published as `aria-required` on roles that
   * support it. Has no effect on `multiple` mode.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * Whether activating the selected item clears it in `single` mode. Defaults to what the
   * {@link role} does natively — a toggle button deselects, a radio or tab does not.
   */
  readonly deselectable = input<boolean>();

  /** Disables every item: none can be focused, navigated to or selected. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether keyboard navigation selects the item it lands on (radio buttons, automatic
   * tabs) or only moves focus until `Space`/`Enter` (manual tabs, toggle groups). Defaults
   * to what the {@link role} does natively. Ignored in `multiple` mode, where moving
   * through the items must not change a selection.
   */
  readonly selectionFollowsFocus = input<boolean>();

  /**
   * Which arrow keys navigate: `horizontal` (mirrored for right-to-left), `vertical`, or
   * `both`. Defaults to what the {@link role} does natively.
   */
  readonly orientation = input<AndesListOrientation>();

  /** Whether navigation wraps from the last item to the first, and back. Default `true`. */
  readonly wrap = input(true, { transform: booleanAttribute });

  /**
   * Whether typing a character moves focus to the matching item. Off by default: only a
   * listbox-style picker usually wants it, and it would otherwise compete with `Space`.
   */
  readonly typeahead = input(false, { transform: booleanAttribute });

  /**
   * Overrides the text direction otherwise read from the surrounding `dir`, so a right-to-left
   * group can be forced inside a left-to-right page (and vice versa).
   */
  readonly textDirection = input<AndesListTextDirection>();

  /**
   * Decides whether two values are the same choice. Defaults to `Object.is`; supply one
   * when items stand for objects that are re-created between renders.
   */
  readonly compareWith = input<(a: T, b: T) => boolean>(Object.is);

  /**
   * Fires with the new value when the *user* changes the selection — by clicking, by
   * `Space`/`Enter`, or by navigating when selection follows focus. It does not fire for
   * writes to {@link value}. (Named `changed` so it cannot be mistaken for the native
   * `change` event that bubbles out of form controls placed inside.)
   */
  readonly changed = output<AndesChoiceValue<T>>();

  private readonly forcedDisabled = signal(false);

  /**
   * Whether the group is disabled, by its input or through {@link setDisabledState}.
   * Items read this to disable themselves.
   */
  readonly isDisabled: Signal<boolean> = computed(
    () => this.disabled() || this.forcedDisabled(),
  );

  /** The role mapping in effect: the {@link role}'s default with any overrides applied. */
  readonly mapping: Signal<AndesChoiceRoleMapping> = computed(() => ({
    ...(ANDES_CHOICE_ROLE_MAPPINGS[this.role()] ??
      ANDES_CHOICE_ROLE_MAPPINGS.radiogroup),
    ...this.roleMapping(),
  }));

  /** The orientation in effect, after falling back to the role's default. */
  protected readonly resolvedOrientation: Signal<AndesListOrientation> =
    computed(() => this.orientation() ?? this.mapping().orientation);

  /** The text direction in effect: the {@link textDirection} input, else the surrounding `dir`. */
  readonly direction: Signal<AndesListTextDirection> = computed(
    () => this.textDirection() ?? this.directionality.valueSignal(),
  );

  /** Whether activating the selected item clears it. `multiple` mode always toggles. */
  readonly toggles: Signal<boolean> = computed(
    () =>
      this.mode() === 'multiple' ||
      (this.deselectable() ?? this.mapping().toggles),
  );

  /** Whether navigating selects. Only ever true in `single` mode. */
  readonly followsFocus: Signal<boolean> = computed(
    () =>
      this.mode() === 'single' &&
      (this.selectionFollowsFocus() ?? this.mapping().selectionFollowsFocus),
  );

  /** The selected values as an array, whatever the mode. */
  readonly values: Signal<readonly T[]> = computed(() => {
    const value = this.value();
    if (value === null || value === undefined) {
      return [];
    }
    if (this.mode() === 'multiple') {
      return Array.isArray(value) ? (value as readonly T[]) : [value as T];
    }
    return [value as T];
  });

  /**
   * Every choice item registered with the group, in DOM order. Items register themselves,
   * so `@if`/`@for`-rendered items need no bookkeeping.
   */
  readonly items: Signal<readonly AndesChoiceItemRef[]> = computed(() =>
    this.navigation.items().filter(isChoiceItem),
  );

  /** The first selected item that can be focused: the one that carries the tab stop. */
  readonly selectedItem: Signal<AndesChoiceItemRef | null> = computed(() => {
    const values = this.values();
    if (values.length === 0) {
      return null;
    }
    return (
      this.items().find(
        (item) => !item.isDisabled() && this.isSelected(item.value() as T),
      ) ?? null
    );
  });

  protected readonly ariaOrientation = computed(() => {
    const orientation = this.resolvedOrientation();
    return this.role() === 'group' || orientation === 'both'
      ? null
      : orientation;
  });

  protected readonly ariaMultiselectable = computed(() =>
    this.role() === 'listbox' && this.mode() === 'multiple' ? 'true' : null,
  );

  protected readonly ariaRequired = computed(() =>
    this.required() && this.mapping().ariaRequired ? 'true' : null,
  );

  constructor() {
    // Navigation options are inputs of this directive, so they are pushed to the shared
    // list-navigation instance whenever any of them changes.
    effect(() => this.syncNavigation());

    // The tab stop belongs to the selected item, so that Tab re-enters the group where the
    // user left a choice rather than on whichever item was last focused. Only the identity of
    // the selected item is tracked: items registering or arrow-key focus moving do not
    // re-run this, which would drag the tab stop back mid-navigation.
    effect(() => {
      const selected = this.selectedItem();
      if (selected) {
        untracked(() => this.moveTabStopTo(selected));
      }
    });
  }

  /** Whether `value` is part of the current selection. */
  isSelected(value: T): boolean {
    const compare = this.compareWith();
    return this.values().some((selected) => compare(selected, value));
  }

  /**
   * Selects `value` as the user would: in `multiple` mode it is added, in `single` mode it
   * replaces the selection. Disabled groups and unknown values are ignored. Fires
   * {@link changed} when the selection actually changes.
   */
  select(value: T): void {
    if (this.isDisabled() || this.isSelected(value)) {
      return;
    }
    this.commit(this.mode() === 'multiple' ? [...this.values(), value] : value);
  }

  /**
   * Deselects `value` as the user would. In `single` mode this is refused when the group is
   * {@link required}. Fires {@link changed} when the selection actually changes.
   */
  deselect(value: T): void {
    if (this.isDisabled() || !this.isSelected(value)) {
      return;
    }
    if (this.mode() === 'multiple') {
      const compare = this.compareWith();
      this.commit(
        this.values().filter((selected) => !compare(selected, value)),
      );
    } else if (!this.required()) {
      this.commit(null);
    }
  }

  /** Selects `value` if it is not selected, otherwise deselects it. */
  toggle(value: T): void {
    if (this.isSelected(value)) {
      this.deselect(value);
    } else {
      this.select(value);
    }
  }

  /**
   * Empties the selection as the user would. Refused in `single` mode when the group is
   * {@link required}. Fires {@link changed} when the selection actually changes.
   */
  clear(): void {
    if (this.isDisabled() || this.values().length === 0) {
      return;
    }
    if (this.mode() === 'multiple') {
      this.commit([]);
    } else if (!this.required()) {
      this.commit(null);
    }
  }

  /**
   * Moves focus into the group: onto the selected item, or the first one that can take
   * focus — the same item a Tab press lands on.
   */
  focus(options?: FocusOptions): void {
    this.navigation.rovingTabindexTarget()?.element.focus(options);
  }

  /**
   * Disables the group from outside the template, for wrappers that implement
   * `ControlValueAccessor.setDisabledState`. Combined with the `disabled` input, so
   * either one disables the group.
   */
  setDisabledState(isDisabled: boolean): void {
    this.forcedDisabled.set(isDisabled);
  }

  /**
   * The user activated an item (click, `Space` or `Enter`). Called by
   * {@link AndesChoiceItem}; follows the toggle rules of the current mapping.
   * @internal
   */
  activate(item: AndesChoiceItemRef): void {
    if (this.isDisabled() || item.isDisabled()) {
      return;
    }
    const value = item.value() as T;
    if (this.mode() === 'multiple') {
      this.toggle(value);
    } else if (this.isSelected(value)) {
      if (this.toggles()) {
        this.deselect(value);
      }
    } else {
      this.select(value);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }
    const item = this.itemFor(event.target);
    if (!item) {
      return;
    }

    if (isActivationKey(event) && !this.isTypingSpace(event)) {
      // Taking over the key (rather than leaving it to a native button's click) is what
      // makes a `<div role="radio">` behave like a `<button>`, and keeps one code path for
      // both: the default action is cancelled so a button cannot also fire a click.
      event.preventDefault();
      this.activate(item);
      return;
    }

    this.syncNavigation();
    // Navigation continues from the item that actually holds focus, which can differ from
    // the tab stop after a programmatic value change moved the stop to the selection.
    this.moveTabStopTo(item);
    const before = this.navigation.activeItem();
    this.navigation.onKeydown(event);
    const after = this.navigation.activeItem();

    if (
      this.followsFocus() &&
      after &&
      after !== before &&
      isChoiceItem(after)
    ) {
      // Focus moves, selection follows; only ever to select, never to deselect.
      this.select(after.value() as T);
    }
  }

  protected onKeyup(event: KeyboardEvent): void {
    // A button clicks on the *release* of Space in some browsers, after keydown has already
    // activated the item; cancel that second activation.
    if (event.key === ' ' && !this.isDisabled() && this.itemFor(event.target)) {
      event.preventDefault();
    }
  }

  protected onFocusout(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.contains(next)) {
      return;
    }
    // Focus left the group: put the tab stop back on the selection, so manual-activation
    // tabs and toggle groups re-enter where the choice is, not where the user last browsed.
    const selected = this.selectedItem();
    if (selected) {
      this.moveTabStopTo(selected);
    }
  }

  private isTypingSpace(event: KeyboardEvent): boolean {
    return event.key === ' ' && this.navigation.isTyping();
  }

  private itemFor(target: EventTarget | null): AndesChoiceItemRef | undefined {
    return target
      ? this.items().find((item) => item.element.contains(target as Node))
      : undefined;
  }

  private moveTabStopTo(item: AndesChoiceItemRef): void {
    if (this.navigation.activeItem() !== item) {
      this.navigation.setActiveItemSilently(item);
    }
  }

  private commit(next: AndesChoiceValue<T>): void {
    this.value.set(next);
    this.changed.emit(next);
  }

  private syncNavigation(): void {
    this.navigation.configure({
      orientation: this.resolvedOrientation(),
      wrap: this.wrap(),
      typeahead: this.typeahead(),
      homeAndEnd: true,
      focusMode: 'roving-tabindex',
      textDirection: this.direction(),
      skipDisabled: true,
    });
  }
}
