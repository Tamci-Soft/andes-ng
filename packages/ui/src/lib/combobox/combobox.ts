import {
  AndesListNavigation,
  AndesOverlayPrimitive,
  andesOverlayPreset,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import type { AndesComboboxItem } from './combobox-item';

/** Converts an item to the text shown in the input and matched against while filtering. */
export type AndesComboboxItemToString<T> = (item: T) => string;

/** Custom filter predicate, given the raw item and the input's current (untrimmed) text. */
export type AndesComboboxFilterPredicate<T> = (
  item: T,
  query: string,
) => boolean;

/** Equality check used to determine which item (if any) is the current selection. */
export type AndesComboboxCompareWith<T> = (a: T, b: T) => boolean;

const defaultItemToString = <T>(item: T): string => `${item}`;
const defaultCompareWith = <T>(a: T, b: T): boolean => a === b;

/**
 * Root of the Combobox / AutoComplete compound component: a free-text input backed by a
 * filtered, keyboard-navigable list of suggestions.
 *
 * Composes two shared behavior primitives directly rather than reinventing either:
 * `AndesOverlayPrimitive` for the popup (portal, positioning, dismissal - configured as a
 * non-modal, anchored popover that never traps or steals focus) and `AndesListNavigation`
 * in its `'active-descendant'` focus mode for the suggestion list (arrow-key highlighting
 * communicated purely via `aria-activedescendant`, since real DOM focus must stay on the
 * `<input>` at all times - see `AndesComboboxInput`).
 *
 * This root component owns no DOM structure of its own beyond two content outlets: it is
 * a coordinator, not a container. Assemble the parts in the host template:
 *
 * ```html
 * <andes-combobox
 *   [items]="fruits"
 *   [(ngModel)]="selectedFruit"
 * >
 *   <input andesComboboxInput placeholder="Search fruit..." />
 *   <div andesComboboxContent>
 *     @for (fruit of combobox.filteredItems(); track fruit) {
 *       <div andesComboboxItem [value]="fruit">{{ fruit }}</div>
 *     } @empty {
 *       <div andesComboboxEmpty>No results found.</div>
 *     }
 *   </div>
 * </andes-combobox>
 * ```
 *
 * `filteredItems`, `itemToStringValue` and every other member below other than the
 * `@Input`/`@Output` surface exists for `AndesComboboxInput`/`Content`/`Item`/`Empty` to
 * compose against - it is the equivalent of React context for this compound component, not
 * part of the supported public API. Consumers only ever touch the inputs/outputs and the
 * four directives.
 */
@Component({
  selector: 'andes-combobox',
  templateUrl: './combobox.html',
  styleUrl: './combobox.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The input, popup, options and empty-state are all content projected in through the
  // andesCombobox* directives rather than rendered by this component's own template, so
  // emulated encapsulation's scoping attribute would never reach them - see combobox.css.
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideAndesOverlay(),
    AndesListNavigation,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesCombobox),
      multi: true,
    },
  ],
  host: {
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class AndesCombobox<T = string> implements ControlValueAccessor {
  /** The data source suggestions are filtered from. */
  readonly items = input<readonly T[]>([]);

  /**
   * Converts an item to the string shown in the input once selected and matched against
   * while filtering. Defaults to template-literal stringification, which is exactly right
   * for `T = string` and a reasonable fallback for anything else - override it for object
   * items.
   */
  readonly itemToStringValue =
    input<AndesComboboxItemToString<T>>(defaultItemToString);

  /**
   * Custom filter predicate, given the raw item and the input's current text. Defaults to
   * a case-insensitive substring match against `itemToStringValue(item)`.
   */
  readonly filterPredicate = input<AndesComboboxFilterPredicate<T> | undefined>(
    undefined,
  );

  /** Identifies which item (if any) is the current selection. Defaults to `===`. */
  readonly compareWith = input<AndesComboboxCompareWith<T>>(defaultCompareWith);

  /** Highlights the first filtered match automatically whenever the list changes. */
  readonly autoHighlight = input(true, { transform: booleanAttribute });

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });

  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  /** Emits the newly selected item, or `null` once a selection no longer matches the text. */
  readonly valueChange = output<T | null>();

  /** @internal */
  readonly overlay = inject(AndesOverlayPrimitive);
  /** @internal */
  readonly navigation = inject(AndesListNavigation);

  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  private readonly _value = signal<T | null>(null);
  private readonly _query = signal('');
  private readonly formDisabled = signal(false);

  /** @internal The text currently shown in the input. */
  readonly query = this._query.asReadonly();

  /** Combines the `disabled` input with a disabled state set through the forms APIs. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /** @internal Items matching the current input text. */
  readonly filteredItems = computed(() => {
    const query = this._query().trim().toLowerCase();
    if (!query) {
      return this.items();
    }

    const predicate = this.filterPredicate();
    const toString = this.itemToStringValue();
    return this.items().filter((item) =>
      predicate
        ? predicate(item, this._query())
        : toString(item).toLowerCase().includes(query),
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- replaced by registerOnChange before any real change can occur
  private onChange: (value: T | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- replaced by registerOnTouched before any real touch can occur
  private onTouched: () => void = () => {};

  // Tracks what the auto-highlight effect last acted on - see its guard, below.
  private lastAutoHighlightItems: readonly T[] | undefined;
  private lastAutoHighlightOpen: boolean | undefined;
  private lastAutoHighlightEnabled: boolean | undefined;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('popover'),
      role: 'listbox',
      // The input keeps real DOM focus for the popup's entire lifetime - see
      // AndesComboboxInput - so nothing here may move focus into the panel.
      trapFocus: false,
      autoFocus: 'none',
      restoreFocus: false,
      positioning: {
        kind: 'anchored',
        side: 'bottom',
        align: 'start',
        sideOffset: 4,
        matchAnchorWidth: true,
      },
    });

    this.navigation.configure({
      orientation: 'vertical',
      focusMode: 'active-descendant',
      wrap: true,
      homeAndEnd: true,
      // Typed characters are handled entirely as filter text via (input) on the field -
      // CDK's own letter-matching typeahead would otherwise double-handle them.
      typeahead: false,
    });

    // Forces AndesListNavigation to construct its CDK key manager right now, outside any
    // reactive context: ListKeyManager's own constructor schedules an effect() of its own,
    // and creating one from inside the effect() below (on that effect's first run) would
    // trip Angular's "effect() cannot be called from within a reactive context" (NG0602).
    this.navigation.clearActive();

    effect(() => {
      const items = this.filteredItems();
      const isOpen = this.overlay.isOpen();
      const autoHighlight = this.autoHighlight();

      // This effect exists to *re*-highlight the first match whenever the filtered set or
      // open state genuinely changes - not to re-run its side effect on every unrelated
      // change-detection pass. Without this guard it would call clearActive() on every
      // tick once autoHighlight is off, silently undoing whatever ArrowDown/ArrowUp just
      // set as the active item (arrow-key navigation writes activeItem, not filteredItems
      // or isOpen, so it never legitimately needs to re-run for that).
      if (
        items === this.lastAutoHighlightItems &&
        isOpen === this.lastAutoHighlightOpen &&
        autoHighlight === this.lastAutoHighlightEnabled
      ) {
        return;
      }
      this.lastAutoHighlightItems = items;
      this.lastAutoHighlightOpen = isOpen;
      this.lastAutoHighlightEnabled = autoHighlight;

      if (!isOpen || items.length === 0) {
        this.navigation.clearActive();
        return;
      }
      if (autoHighlight) {
        this.navigation.focusFirst();
      } else {
        this.navigation.clearActive();
      }
    });
  }

  /** Opens the suggestion popup. A no-op while disabled, read-only or already open. */
  open(): void {
    if (this.isDisabled() || this.readOnly() || this.overlay.isOpen()) {
      return;
    }
    this.overlay.open(this.panel());
  }

  /** Closes the suggestion popup. A no-op if already closed. */
  close(): void {
    this.overlay.close();
  }

  /** @internal Called by `AndesComboboxInput` on every keystroke. */
  setQuery(text: string): void {
    this._query.set(text);

    // Once the displayed text no longer matches the selected item's own label, the
    // selection itself is stale - clearing it keeps the form value honest instead of
    // silently keeping a value the user has since edited away from.
    const current = this._value();
    if (current !== null && this.itemToStringValue()(current) !== text) {
      this._value.set(null);
      this.onChange(null);
      this.valueChange.emit(null);
    }
  }

  /** @internal Called by `AndesComboboxItem` on pointer selection. */
  selectValue(value: T): void {
    this._value.set(value);
    this._query.set(this.itemToStringValue()(value));
    this.onChange(value);
    this.onTouched();
    this.valueChange.emit(value);
    this.close();
  }

  /**
   * @internal Commits whichever item is currently highlighted, e.g. on Enter. Returns
   * whether there was one to commit.
   */
  selectActiveItem(): boolean {
    if (!this.overlay.isOpen()) {
      return false;
    }
    const active = this.navigation.activeItem() as AndesComboboxItem<T> | null;
    if (!active) {
      return false;
    }
    this.selectValue(active.value());
    return true;
  }

  /** @internal Called by `AndesComboboxInput` on blur. */
  notifyBlur(): void {
    this.onTouched();
    this.close();
  }

  /** @internal Whether `value` is the current selection, per `compareWith`. */
  isSelected(value: T): boolean {
    const current = this._value();
    return current !== null && this.compareWith()(current, value);
  }

  writeValue(value: T | null): void {
    this._value.set(value ?? null);
    this._query.set(value == null ? '' : this.itemToStringValue()(value));
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
