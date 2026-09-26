import {
  AndesListNavigation,
  andesOverlayPreset,
  AndesOverlayPrimitive,
  provideAndesOverlay,
  type AndesListNavigationItemRef,
  type AndesOverlayAlign,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { AndesSelectContent } from './select-content';
import {
  AndesSelectState,
  type AndesSelectCompareWith,
  type AndesSelectDisplayWith,
  type AndesSelectFilterFn,
  type AndesSelectItemRef,
  type AndesSelectLabelContext,
  type AndesSelectMaxTagPlaceholder,
  type AndesSelectMode,
  type AndesSelectOption,
  type AndesSelectOptionContext,
  type AndesSelectOptionEntry,
  type AndesSelectOptions,
  type AndesSelectPlacement,
  type AndesSelectSize,
  type AndesSelectStatus,
  type AndesSelectTag,
  type AndesSelectTagContext,
  type AndesSelectVariant,
} from './select-state';
import { AndesSelectTrigger } from './select-trigger';
import { AndesSelectValue } from './select-value';

let nextUniqueId = 0;

/** `undefined`/`null` stay unset; anything else goes through `booleanAttribute`. */
function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined || value === null
    ? undefined
    : booleanAttribute(value);
}

/** `undefined`/`null`/`''` stay unset; anything else goes through `numberAttribute`. */
function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null || value === ''
    ? undefined
    : numberAttribute(value);
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

const PLACEMENTS: Readonly<
  Record<
    AndesSelectPlacement,
    { side: AndesOverlaySide; align: AndesOverlayAlign }
  >
> = {
  bottomLeft: { side: 'bottom', align: 'start' },
  bottomRight: { side: 'bottom', align: 'end' },
  topLeft: { side: 'top', align: 'start' },
  topRight: { side: 'top', align: 'end' },
};

/**
 * A select: a trigger showing the current selection, and an overlay panel of options
 * navigated with the arrow keys, `Home`/`End` and typeahead. Single selection by default;
 * `mode="multiple"` and `mode="tags"` turn the value into an array rendered as removable
 * tags, and `showSearch` turns the trigger into a text input that filters the options.
 *
 * It owns one `AndesOverlayPrimitive` (panel rendering, positioning, dismissal and focus
 * restoration) and one `AndesListNavigation` (roving tabindex or active-descendant, and
 * typeahead), and provides both to its own compound parts, which is how
 * `AndesSelectTrigger`, `AndesSelectContent` and `AndesSelectItem` find the same
 * instances without any manual wiring.
 *
 * ```html
 * <andes-select [formControl]="region" placeholder="Pick a region" aria-label="Region">
 *   <andes-select-trigger>
 *     <andes-select-value />
 *   </andes-select-trigger>
 *   <andes-select-content>
 *     <andes-select-item value="us-east">US East</andes-select-item>
 *     <andes-select-item value="eu-west">EU West</andes-select-item>
 *   </andes-select-content>
 * </andes-select>
 * ```
 *
 * The compound parts are optional: with an `options` array and no projected children the
 * select renders its own trigger and panel.
 *
 * ```html
 * <andes-select mode="multiple" [options]="regions" [(value)]="picked" aria-label="Regions" />
 * ```
 *
 * ## Focus model
 *
 * Without search, the combobox is a `<button>` and real focus moves onto the options
 * while the panel is open (roving tabindex) — the select-only listbox pattern. With
 * search, the combobox is an `<input>` that keeps focus, and the active option is
 * conveyed through `aria-activedescendant` — the editable-combobox pattern.
 */
@Component({
  selector: 'andes-select',
  imports: [AndesSelectContent, AndesSelectTrigger, AndesSelectValue],
  templateUrl: './select.html',
  styleUrl: './select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    AndesListNavigation,
    { provide: AndesSelectState, useExisting: forwardRef(() => AndesSelect) },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesSelect),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real combobox (and, for the label, to the listbox panel)
    // instead: a screen reader never sees this non-interactive host element, so leaving
    // these here would do nothing.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class AndesSelect
  extends AndesSelectState
  implements ControlValueAccessor
{
  readonly overlay = inject(AndesOverlayPrimitive);
  readonly navigation = inject(AndesListNavigation);

  readonly listboxId = `andes-select-listbox-${nextUniqueId}`;
  readonly summaryId = `andes-select-summary-${nextUniqueId++}`;

  /**
   * The selected value: a single value (or `null`) in `single` mode, an array in
   * `multiple`/`tags` mode, and `{ value, label }` objects in place of bare values with
   * `labelInValue`.
   *
   * A `model()`, not a plain `input()`: `[(value)]`/`valueChange` are generated
   * automatically, and - critically - a user's selection is written directly into this
   * same signal (see {@link selectItem}) rather than into a separate internal copy that an
   * `effect()` would then have to mirror back onto. That mirroring shape is what bit
   * `AndesSwitch`/`AndesCheckbox`: an `effect()` (or a `linkedSignal`) only resyncs when
   * the `value` *input* itself produces a value it considers new, so once a user's pick
   * has diverged the internal copy from the bound input, a parent re-asserting a value the
   * input's own signal already holds is architecturally invisible to it, and the display
   * silently stays stuck on the stale selection. With `model()` there is only one signal -
   * the parent's binding and the user's interaction both read and write it - so there is
   * nothing left for it to diverge from.
   *
   * Coexists with `[formControl]`/`[(ngModel)]`, which write through `writeValue` onto the
   * same signal. **`valueChange` therefore also fires when a form writes a value that
   * differs from the current one** - deliberately, so a `[(value)]` binding placed next to
   * a form control stays in sync with it. Listen to {@link selectionChange} instead for
   * changes made by the user only. Read {@link selectedValue} for the current selection
   * whatever set it.
   */
  readonly value = model<unknown>(null);
  /** Selection mode. */
  readonly mode = input<AndesSelectMode>('single');
  /** Text shown while nothing is selected. */
  readonly placeholder = input('');
  /** Disables the control. A form control's own disabled state is honoured too. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Marks the field required; surfaces as `aria-required` on the combobox. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Control height. */
  readonly size = input<AndesSelectSize>('md');
  /** Visual treatment of the trigger box. */
  readonly variant = input<AndesSelectVariant>('outlined');
  /** Validation status. `error` also sets `aria-invalid` on the combobox. */
  readonly status = input<AndesSelectStatus | undefined>(undefined);
  /** Where the panel opens. `side`/`align` on `<andes-select-content>` take precedence. */
  readonly placement = input<AndesSelectPlacement>('bottomLeft');
  /** Maximum height of the panel, in px. */
  readonly listHeight = input(256, { transform: numberAttribute });
  /** Whether typing characters moves the active option while the panel is open. */
  readonly typeahead = input(true, { transform: booleanAttribute });
  /** Compares an option's value with the selected value. Defaults to strict equality. */
  readonly compareWith = input<AndesSelectCompareWith>((a, b) => a === b);
  /** Renders a value that no option carries. Defaults to `String(value)`. */
  readonly displayWith = input<AndesSelectDisplayWith | undefined>(undefined);
  /** Emit and accept `{ value, label }` objects instead of bare values. */
  readonly labelInValue = input(false, { transform: booleanAttribute });

  /**
   * Turns the combobox into a text input that filters the options. Defaults to on in
   * `multiple` mode and off in `single` mode; always on in `tags` mode.
   */
  readonly showSearch = input<boolean | undefined, unknown>(undefined, {
    transform: optionalBoolean,
  });
  /** The search text. Two-way bindable; `searchValueChange` fires as the user types. */
  readonly searchValue = model('');
  /**
   * `true` filters by {@link optionFilterProp}, `false` never filters, and a function
   * decides per option.
   */
  readonly filterOption = input<boolean | AndesSelectFilterFn>(true);
  /**
   * Which option field(s) the built-in filter matches against: `label`, `value`, or any
   * field of an `options` entry / an item's `data`. Defaults to `label` rather than
   * `value`: for options whose values are ids, `value` never matches what users type.
   */
  readonly optionFilterProp = input<string | readonly string[]>('label');
  /** Clear the search text after each selection in `multiple`/`tags` mode. */
  readonly autoClearSearchValue = input(true, { transform: booleanAttribute });
  /** Characters that split typed or pasted text into separate values (`multiple`/`tags`). */
  readonly tokenSeparators = input<readonly string[]>([]);

  /** Shows a button that clears the selection. */
  readonly allowClear = input(false, { transform: booleanAttribute });
  /** Shows a spinner in the trigger and a loading row in an empty panel. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Maximum number of values selectable in `multiple`/`tags` mode. */
  readonly maxCount = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  /** Maximum number of tags rendered before the rest collapse into `+ N ...`. */
  readonly maxTagCount = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  /** Replaces the `+ N ...` text: a string, a function of the hidden tags, or a template. */
  readonly maxTagPlaceholder = input<AndesSelectMaxTagPlaceholder | undefined>(
    undefined,
  );
  /** Maximum characters shown per tag; longer labels are truncated with `...`. */
  readonly maxTagTextLength = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  /** Empty-state content. `null` renders no empty state at all. */
  readonly notFoundContent = input<string | TemplateRef<unknown> | null>(
    'No data',
  );

  /** Options as data - an alternative (or an addition) to projected items. */
  readonly options = input<AndesSelectOptions | undefined>(undefined);
  /** Renders each `options` entry. Context: the option, and whether it is selected. */
  readonly optionTemplate = input<
    TemplateRef<AndesSelectOptionContext> | undefined
  >(undefined);
  /** Renders the selected value in the trigger (`single` mode). */
  readonly labelTemplate = input<
    TemplateRef<AndesSelectLabelContext> | undefined
  >(undefined);
  /** Renders each tag (`multiple`/`tags` mode). */
  readonly tagTemplate = input<TemplateRef<AndesSelectTagContext> | undefined>(
    undefined,
  );
  /** Content rendered before the selection, inside the trigger box. */
  readonly prefix = input<TemplateRef<unknown> | undefined>(undefined);
  /** Replaces the chevron. `null` removes it. */
  readonly suffixIcon = input<TemplateRef<unknown> | null | undefined>(
    undefined,
  );
  /** Replaces the clear button's icon. */
  readonly clearIcon = input<TemplateRef<unknown> | undefined>(undefined);
  /** Replaces each tag's remove icon. */
  readonly removeIcon = input<TemplateRef<unknown> | undefined>(undefined);

  /**
   * Whether the panel is open. Two-way bindable as `[(open)]`; `openChange` fires on every
   * transition, whatever caused it. A one-way `[open]` binding acts as a request: the user
   * can still close the panel, and the binding only re-applies when its value changes.
   */
  readonly openState = model(false, { alias: 'open' });

  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  /**
   * Emits the new value after a change made by the user - selecting, deselecting,
   * removing a tag, clearing - and never for values written by a form or a binding.
   */
  readonly selectionChange = output<unknown>();
  /** Emits the value of an option the user selected. */
  readonly optionSelect = output<unknown>();
  /** Emits a value the user removed in `multiple`/`tags` mode. */
  readonly optionDeselect = output<unknown>();
  /** Emits when the user clears the selection. */
  readonly cleared = output<void>();

  private readonly projectedContent = contentChild(AndesSelectContent, {
    descendants: true,
  });
  private readonly projectedTrigger = contentChild(AndesSelectTrigger, {
    descendants: true,
  });
  private readonly ownContent = viewChild(AndesSelectContent);
  private readonly content = computed(
    () => this.projectedContent() ?? this.ownContent(),
  );

  /** @internal Whether the template renders its own trigger. */
  protected readonly rendersOwnTrigger = computed(
    () => !this.projectedTrigger(),
  );
  /** @internal Whether the template renders its own panel. */
  protected readonly rendersOwnContent = computed(
    () => !this.projectedContent(),
  );

  private readonly _items = signal<readonly AndesSelectItemRef[]>([]);
  private readonly _formDisabled = signal(false);
  private readonly _combobox = signal<HTMLElement | null>(null);

  /**
   * Labels of every option that has ever registered, keyed by value, so the trigger keeps
   * showing a sensible label after the option list itself changes - options arriving
   * asynchronously, or a filtered list that no longer contains the selected value.
   */
  private readonly labelCache = new Map<unknown, string>();
  private readonly labelCacheVersion = signal(0);

  private onChange: (value: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** The current selection, whether it came from the input, a form or the user. */
  readonly selectedValue = this.value.asReadonly();
  readonly isOpen = this.overlay.isOpen;

  readonly isMultiple = computed(() => this.mode() !== 'single');
  readonly searchEnabled = computed(
    () =>
      this.mode() === 'tags' ||
      (this.showSearch() ?? this.mode() === 'multiple'),
  );

  /** The selected values as a list of raw (non-`labelInValue`) values. */
  private readonly selectedValues = computed<readonly unknown[]>(() => {
    const value = this.value();
    const list = this.isMultiple()
      ? Array.isArray(value)
        ? value
        : [value]
      : [value];
    return list
      .map((entry) => this.toRaw(entry))
      .filter((entry) => !isEmptyValue(entry));
  });

  readonly hasValue = computed(() => this.selectedValues().length > 0);

  readonly rawValue = computed(() => this.selectedValues()[0] ?? null);

  readonly invalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );

  readonly isDisabled = computed(() => this.disabled() || this._formDisabled());

  readonly activeDescendantId = computed(() =>
    this.isOpen() ? this.navigation.activeDescendantId() : null,
  );

  readonly placementSide = computed(() => PLACEMENTS[this.placement()].side);
  readonly placementAlign = computed(() => PLACEMENTS[this.placement()].align);

  private readonly flatOptions = computed<readonly AndesSelectOption[]>(() =>
    this.optionEntries().flatMap((entry) =>
      entry.kind === 'group' ? entry.options : [entry.option],
    ),
  );

  readonly optionEntries = computed<readonly AndesSelectOptionEntry[]>(() =>
    (this.options() ?? []).map((entry) =>
      'options' in entry && Array.isArray(entry.options)
        ? {
            kind: 'group' as const,
            label: entry.label,
            options: entry.options,
          }
        : { kind: 'option' as const, option: entry as AndesSelectOption },
    ),
  );

  /** The registered option carrying the (first) selected value. */
  private readonly selectedItem = computed(() => {
    const first = this.selectedValues()[0];
    if (first === undefined) {
      return null;
    }
    return this.findItem(first);
  });

  /**
   * Trigger text for the selected value in `single` mode, resolved as {@link labelFor}
   * does: the option currently carrying it, an `options` entry, a `labelInValue` label,
   * the label cached from the last time an option carried it, `displayWith`, and finally
   * the value itself stringified.
   */
  readonly displayLabel = computed<string | null>(() => {
    if (this.isMultiple() || !this.hasValue()) {
      return null;
    }
    return this.labelFor(this.selectedValues()[0]);
  });

  private readonly tags = computed<readonly AndesSelectTag[]>(() => {
    if (!this.isMultiple()) {
      return [];
    }
    const disabled = this.isDisabled();
    return this.selectedValues().map((value) => ({
      value,
      label: this.labelFor(value),
      closable: !disabled && !this.isValueDisabled(value),
    }));
  });

  readonly visibleTags = computed(() => {
    const max = this.maxTagCount();
    return max === undefined ? this.tags() : this.tags().slice(0, max);
  });

  readonly omittedTags = computed(() => {
    const max = this.maxTagCount();
    return max === undefined ? [] : this.tags().slice(max);
  });

  readonly maxTagPlaceholderText = computed(() => {
    const placeholder = this.maxTagPlaceholder();
    const omitted = this.omittedTags();
    if (typeof placeholder === 'string') {
      return placeholder;
    }
    if (typeof placeholder === 'function') {
      return placeholder(omitted);
    }
    return `+ ${omitted.length} ...`;
  });

  readonly maxTagPlaceholderTemplate = computed(() => {
    const placeholder = this.maxTagPlaceholder();
    return placeholder instanceof TemplateRef ? placeholder : null;
  });

  readonly selectionSummary = computed<string | null>(() => {
    if (!this.hasValue()) {
      return null;
    }
    if (this.isMultiple()) {
      const labels = this.tags().map((tag) => tag.label);
      return `${labels.length} selected: ${labels.join(', ')}`;
    }
    // A non-search button already shows the label as its own content.
    return this.searchEnabled() ? this.displayLabel() : null;
  });

  readonly showClear = computed(
    () =>
      this.allowClear() &&
      !this.isDisabled() &&
      (this.hasValue() || this.searchValue() !== ''),
  );

  readonly tagCandidate = computed<string | null>(() => {
    if (this.mode() !== 'tags') {
      return null;
    }
    const text = this.searchValue().trim();
    if (!text) {
      return null;
    }
    const compare = this.compareWith();
    const known =
      this._items().some(
        (item) =>
          !item.custom() &&
          (compare(item.value(), text) || item.getLabel() === text),
      ) ||
      this.flatOptions().some(
        (option) => compare(option.value, text) || option.label === text,
      ) ||
      this.selectedValues().some((value) => compare(text, value));
    return known ? null : text;
  });

  readonly customTags = computed<readonly unknown[]>(() => {
    if (this.mode() !== 'tags') {
      return [];
    }
    const compare = this.compareWith();
    return this.selectedValues().filter(
      (value) =>
        !this._items().some(
          (item) => !item.custom() && compare(item.value(), value),
        ) && !this.flatOptions().some((option) => compare(option.value, value)),
    );
  });

  private readonly visibleItemCount = computed(
    () => this._items().filter((item) => !this.isFilteredOut(item)).length,
  );

  readonly showLoadingRow = computed(
    () => this.loading() && this.visibleItemCount() === 0,
  );

  readonly showEmpty = computed(
    () =>
      !this.loading() &&
      this.notFoundContent() !== null &&
      this.visibleItemCount() === 0 &&
      this.tagCandidate() === null,
  );

  private lastSearch = '';

  constructor() {
    super();

    this.overlay.configure({
      // `menu` is the closest preset: anchored to the trigger, click-opened, dismissed
      // by Escape and outside-click, no backdrop and no scroll lock. The focus handling
      // differs and is overridden here - focus is moved to a specific option by
      // `activateSelectedOption` (or kept in the search input), not to the first
      // tabbable element, so `autoFocus` must stay out of the way. The role is `none`
      // because `AndesSelectContent` puts `role="listbox"` on an inner element, next to
      // which the empty and loading states can live without being listbox children.
      ...andesOverlayPreset('menu'),
      role: 'none',
      autoFocus: 'none',
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
      focusMode: 'roving-tabindex',
      homeAndEnd: true,
      skipDisabled: true,
      // A native `<select>` stops at the first and last option rather than cycling, and
      // a listbox is the one WAI-ARIA pattern where wrapping is not the convention.
      wrap: false,
    });

    effect(() =>
      this.navigation.typeahead.set(this.typeahead() && !this.searchEnabled()),
    );
    effect(() =>
      this.navigation.focusMode.set(
        this.searchEnabled() ? 'active-descendant' : 'roving-tabindex',
      ),
    );

    effect(() => {
      if (this.isDisabled() && this.overlay.isOpen()) {
        this.overlay.close('imperative');
      }
    });

    // `[open]` is honoured after render: the panel template and the trigger (the
    // positioning anchor) only exist once the view has rendered.
    afterRenderEffect(() => {
      const requested = booleanAttribute(this.openState());
      untracked(() => {
        if (requested && !this.overlay.isOpen()) {
          this.open();
        } else if (!requested && this.overlay.isOpen()) {
          this.close();
        }
      });
    });

    // A new search text re-filters the options; the first match becomes active, so Enter
    // picks it right away. This runs after render because the options'
    // navigability (their `disabled` binding on the list-navigation item) only updates
    // once the view has been checked.
    afterRenderEffect(() => {
      const search = this.searchValue();
      const open = this.overlay.isOpen();
      untracked(() => {
        const changed = search !== this.lastSearch;
        this.lastSearch = search;
        if (!open || !changed) {
          return;
        }
        if (search) {
          this.navigation.focusFirst();
        } else {
          this.activateSelectedOption();
        }
      });
    });

    this.overlay.opened.pipe(takeUntilDestroyed()).subscribe(() => {
      this.openState.set(true);
    });

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      this.navigation.clearActive();
      this.navigation.cancelTypeahead();
      this.searchValue.set('');
      this.openState.set(false);
      this.onTouched();
    });

    this.overlay.keydownEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.onPanelKeydown(event));
  }

  /** Moves focus to the combobox. */
  override focus(): void {
    this._combobox()?.focus();
  }

  /** Removes focus from the combobox. */
  blur(): void {
    this._combobox()?.blur();
  }

  override open(): void {
    if (this.isDisabled() || this.overlay.isOpen()) {
      return;
    }

    const content = this.content();
    if (!content) {
      throw new Error(
        'AndesSelect: no <andes-select-content> was found. A select needs one to render its options into.',
      );
    }

    this.overlay.open(content.panelTemplate(), {
      // The anchor is the whole trigger box, which is not focusable; focus belongs on
      // the combobox inside it.
      restoreFocusTo: this._combobox(),
    });
    this.activateSelectedOption();
  }

  override close(): void {
    this.overlay.close('imperative');
  }

  override toggle(): void {
    if (this.overlay.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  override registerItem(item: AndesSelectItemRef): void {
    this._items.update((items) => [...items, item]);
    if (!item.custom()) {
      this.cacheLabel(item);
    }
  }

  override unregisterItem(item: AndesSelectItemRef): void {
    this._items.update((items) => items.filter((entry) => entry !== item));
  }

  override registerCombobox(element: HTMLElement | null): void {
    this._combobox.set(element);
  }

  override isSelected(item: AndesSelectItemRef): boolean {
    const compare = this.compareWith();
    return this.selectedValues().some((value) => compare(item.value(), value));
  }

  override isSelectedValue(value: unknown): boolean {
    const compare = this.compareWith();
    return this.selectedValues().some((selected) => compare(value, selected));
  }

  override isBlocked(item: AndesSelectItemRef): boolean {
    const max = this.maxCount();
    return (
      this.isMultiple() &&
      max !== undefined &&
      this.selectedValues().length >= max &&
      !this.isSelected(item)
    );
  }

  override isFilteredOut(item: AndesSelectItemRef): boolean {
    if (!this.searchEnabled()) {
      return false;
    }
    const search = this.searchValue();
    if (!search) {
      return false;
    }
    const label = item.getLabel();
    // Values the select created itself are matched on their text only: a consumer's
    // `filterOption` was written for their own options and knows nothing of these.
    if (item.custom()) {
      return !label.toLowerCase().includes(search.trim().toLowerCase());
    }

    const filter = this.filterOption();
    if (filter === false) {
      return false;
    }
    const option = {
      value: item.value(),
      label,
      disabled: item.disabled(),
      data: item.data(),
    };
    if (typeof filter === 'function') {
      return !filter(search, option);
    }

    const needle = search.toLowerCase();
    const props = ([] as string[]).concat(this.optionFilterProp());
    return !props.some((prop) =>
      fieldText(option, prop).toLowerCase().includes(needle),
    );
  }

  override labelFor(value: unknown): string {
    const item = this.findItem(value);
    const rendered = item?.getLabel();
    if (rendered) {
      return rendered;
    }

    const compare = this.compareWith();
    const option = this.flatOptions().find((entry) =>
      compare(entry.value, value),
    );
    if (option) {
      return option.label;
    }

    if (this.labelInValue()) {
      const raw = this.value();
      const entries = Array.isArray(raw) ? raw : [raw];
      const labelled = entries.find(
        (entry) => isLabeledValue(entry) && compare(entry.value, value),
      ) as { label?: unknown } | undefined;
      if (typeof labelled?.label === 'string' && labelled.label) {
        return labelled.label;
      }
    }

    const cached = this.cachedLabel(value);
    if (cached) {
      return cached;
    }

    const displayWith = this.displayWith();
    return displayWith ? displayWith(value) : String(value);
  }

  override selectItem(item: AndesSelectItemRef): void {
    if (this.isDisabled() || item.disabled()) {
      return;
    }

    const raw = item.value();
    if (!item.custom()) {
      this.cacheLabel(item);
    } else {
      this.cacheLabelText(raw, item.getLabel());
    }

    if (!this.isMultiple()) {
      // Writes straight into the model shared with the caller's own `[(value)]` binding
      // (see the class comment on `value`) - this also emits `valueChange`, so there is
      // no separate `this.valueChange.emit(value)` to keep in sync here.
      const changed = !this.isSelected(item);
      const external = this.toExternal(raw);
      this.value.set(external);
      this.onChange(external);
      if (changed) {
        this.selectionChange.emit(external);
      }
      this.optionSelect.emit(external);
      this.onTouched();
      this.close();
      return;
    }

    if (this.isSelected(item)) {
      this.removeValue(raw);
    } else {
      if (this.isBlocked(item)) {
        return;
      }
      this.commitValues([...this.selectedValues(), raw]);
      this.optionSelect.emit(this.toExternal(raw));
    }

    if (this.autoClearSearchValue()) {
      this.searchValue.set('');
    }
    // With the search input keeping focus, a click does not move the active option by
    // itself; in roving-tabindex mode the click's own focus already has.
    const navItem = this.navItemFor(item);
    if (navItem && this.searchEnabled()) {
      this.navigation.setActiveItemSilently(navItem);
    }
  }

  override removeValue(value: unknown): void {
    if (this.isDisabled()) {
      return;
    }
    const compare = this.compareWith();
    const next = this.selectedValues().filter(
      (selected) => !compare(value, selected),
    );
    this.commitValues(next);
    this.optionDeselect.emit(this.toExternal(value));
  }

  override clear(): void {
    if (this.isDisabled()) {
      return;
    }
    this.searchValue.set('');
    if (this.hasValue()) {
      this.commitValues([]);
    }
    this.cleared.emit();
  }

  override onSearchInput(text: string): void {
    if (this.isDisabled()) {
      return;
    }

    const separators = this.tokenSeparators();
    if (
      this.isMultiple() &&
      separators.length > 0 &&
      separators.some((separator) => separator && text.includes(separator))
    ) {
      this.addTokens(splitTokens(text, separators));
      this.searchValue.set('');
      return;
    }

    this.searchValue.set(text);
    if (!this.overlay.isOpen()) {
      this.open();
    }
  }

  override markAsTouched(): void {
    this.onTouched();
  }

  /**
   * Keys on the combobox. With search on, this is the editable-combobox keyboard model
   * (see {@link onSearchKeydown}). Without it, it handles the closed button: every key
   * handled here is `preventDefault`ed, which is also how {@link onPanelKeydown} knows to
   * ignore the very same event - the overlay's document-level key dispatcher starts
   * listening during this handler, so the keystroke that opened the panel can be
   * delivered to it a second time.
   */
  override onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }
    if (this.searchEnabled()) {
      this.onSearchKeydown(event);
      return;
    }
    if (this.overlay.isOpen()) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.open();
        return;
      case 'Home':
        event.preventDefault();
        this.open();
        this.navigation.focusFirst();
        return;
      case 'End':
        event.preventDefault();
        this.open();
        this.navigation.focusLast();
        return;
      case 'Backspace':
      case 'Delete':
        if (this.isMultiple()) {
          event.preventDefault();
          this.removeLastValue();
        } else if (this.allowClear() && this.hasValue()) {
          event.preventDefault();
          this.clear();
        }
        return;
      default:
        break;
    }

    // Typing a character on a closed native `<select>` opens it on the first match, so
    // do the same: open, then hand the keystroke to the typeahead.
    if (this.typeahead() && isPrintableCharacter(event)) {
      event.preventDefault();
      this.open();
      this.navigation.onKeydown(event);
    }
  }

  writeValue(value: unknown): void {
    this.value.set(value ?? (this.isMultiple() ? [] : null));
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._formDisabled.set(isDisabled);
  }

  /**
   * Keys on the search input. Focus never leaves it: `ArrowUp`/`ArrowDown` move the
   * active option (published as `aria-activedescendant`), `Enter` commits it, `Home`/`End`
   * and `Space` keep their text-editing meaning, and `Backspace` on an empty input
   * removes the last tag.
   */
  private onSearchKeydown(event: KeyboardEvent): void {
    const open = this.overlay.isOpen();

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          this.open();
        } else if (event.key === 'ArrowDown') {
          this.navigation.focusNext();
        } else {
          this.navigation.focusPrevious();
        }
        return;
      case 'Enter':
        if (event.isComposing) {
          return;
        }
        event.preventDefault();
        if (open) {
          this.commitActiveOption();
        } else {
          this.open();
        }
        return;
      case 'Backspace':
        if (this.isMultiple() && this.searchValue() === '' && this.hasValue()) {
          event.preventDefault();
          this.removeLastValue();
        }
        return;
      case 'Tab':
        // Focus is already on the input, so Tab can move on naturally once the panel
        // has closed.
        if (open) {
          this.close();
        }
        return;
      default:
        return;
    }
  }

  /**
   * Keys reaching the open panel in roving-tabindex mode. Arrow keys, `Home`/`End` and
   * typeahead go to the list navigation primitive; `Enter`/`Space` commit the active
   * option; `Tab` closes without selecting. `Escape` is left to the overlay primitive,
   * which closes and restores focus. With search on, the input's own handler has
   * already dealt with the key.
   */
  private onPanelKeydown(event: KeyboardEvent): void {
    if (
      !this.overlay.isOpen() ||
      event.defaultPrevented ||
      this.searchEnabled()
    ) {
      return;
    }

    switch (event.key) {
      case 'Escape':
        return;
      case 'Enter':
        event.preventDefault();
        this.commitActiveOption();
        return;
      case ' ':
        // Space extends a typeahead query in progress and only otherwise selects.
        if (this.navigation.isTyping()) {
          break;
        }
        event.preventDefault();
        this.commitActiveOption();
        return;
      case 'Tab':
        // Closing returns focus to the trigger, from where a second Tab leaves the
        // field. Letting Tab through instead would move focus off an option that is
        // about to be destroyed.
        event.preventDefault();
        this.close();
        return;
      default:
        break;
    }

    this.navigation.onKeydown(event);
  }

  private commitActiveOption(): void {
    const active = this.navigation.activeItem();
    const item = active
      ? this._items().find((entry) => entry.optionElement === active.element)
      : undefined;

    if (item && !item.disabled() && !this.isBlocked(item)) {
      this.selectItem(item);
      return;
    }
    if (!this.isMultiple()) {
      this.close();
    }
  }

  /**
   * Makes the selected option active - and, in `roving-tabindex` mode, focused - so the
   * panel opens with the current selection under the keyboard cursor. Falls back to the
   * first enabled option when nothing is selected yet.
   */
  private activateSelectedOption(): void {
    const selected = this.selectedItem();
    const target = selected ? this.navItemFor(selected) : undefined;

    if (target && !target.isDisabled()) {
      this.navigation.focusItem(target);
      return;
    }
    this.navigation.focusFirst();
  }

  private removeLastValue(): void {
    const last = [...this.tags()].reverse().find((tag) => tag.closable);
    if (last) {
      this.removeValue(last.value);
    }
  }

  private addTokens(tokens: readonly string[]): void {
    const compare = this.compareWith();
    const next = [...this.selectedValues()];
    const max = this.maxCount();
    for (const token of tokens) {
      if (max !== undefined && next.length >= max) {
        break;
      }
      const value = this.resolveToken(token);
      if (value === undefined || next.some((entry) => compare(value, entry))) {
        continue;
      }
      next.push(value);
      this.optionSelect.emit(this.toExternal(value));
    }
    if (next.length !== this.selectedValues().length) {
      this.commitValues(next);
    }
  }

  /**
   * The value a typed token stands for: an option whose label or value matches it
   * (case-insensitively), or - in `tags` mode only - the token itself.
   */
  private resolveToken(token: string): unknown {
    const needle = token.toLowerCase();
    const matches = (label: string, value: unknown) =>
      label.toLowerCase() === needle || String(value).toLowerCase() === needle;

    const item = this._items().find(
      (entry) =>
        !entry.custom() &&
        !entry.disabled() &&
        matches(entry.getLabel(), entry.value()),
    );
    if (item) {
      return item.value();
    }
    const option = this.flatOptions().find(
      (entry) => !entry.disabled && matches(entry.label, entry.value),
    );
    if (option) {
      return option.value;
    }
    if (this.mode() === 'tags') {
      this.cacheLabelText(token, token);
      return token;
    }
    return undefined;
  }

  /** Writes a new selection made by the user and notifies everyone who listens. */
  private commitValues(values: readonly unknown[]): void {
    const external = this.isMultiple()
      ? values.map((value) => this.toExternal(value))
      : values.length > 0
        ? this.toExternal(values[0])
        : null;
    this.value.set(external);
    this.onChange(external);
    this.onTouched();
    this.selectionChange.emit(external);
  }

  private toRaw(value: unknown): unknown {
    return this.labelInValue() && isLabeledValue(value) ? value.value : value;
  }

  private toExternal(value: unknown): unknown {
    return this.labelInValue() ? { value, label: this.labelFor(value) } : value;
  }

  private findItem(value: unknown): AndesSelectItemRef | null {
    const compare = this.compareWith();
    const items = this._items();
    return (
      items.find((item) => !item.custom() && compare(item.value(), value)) ??
      items.find((item) => compare(item.value(), value)) ??
      null
    );
  }

  private isValueDisabled(value: unknown): boolean {
    const compare = this.compareWith();
    const item = this.findItem(value);
    if (item) {
      return item.disabled();
    }
    return this.flatOptions().some(
      (option) => !!option.disabled && compare(option.value, value),
    );
  }

  private navItemFor(
    item: AndesSelectItemRef,
  ): AndesListNavigationItemRef | undefined {
    return this.navigation
      .items()
      .find((entry) => entry.element === item.optionElement);
  }

  private cacheLabel(item: AndesSelectItemRef): void {
    this.cacheLabelText(item.value(), item.getLabel());
  }

  private cacheLabelText(value: unknown, label: string): void {
    if (!label || this.labelCache.get(value) === label) {
      return;
    }
    this.labelCache.set(value, label);
    this.labelCacheVersion.update((version) => version + 1);
  }

  private cachedLabel(value: unknown): string | undefined {
    // Read so the lookup re-runs when the cache grows; the cache itself is a plain Map
    // because it is keyed by arbitrary values and matched with `compareWith`.
    this.labelCacheVersion();

    const compare = this.compareWith();
    for (const [cachedValue, label] of this.labelCache) {
      if (compare(cachedValue, value)) {
        return label;
      }
    }
    return undefined;
  }
}

function isPrintableCharacter(event: KeyboardEvent): boolean {
  return (
    event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
  );
}

function isLabeledValue(value: unknown): value is { value: unknown } {
  return typeof value === 'object' && value !== null && 'value' in value;
}

function fieldText(
  option: {
    readonly value: unknown;
    readonly label: string;
    readonly data: unknown;
  },
  prop: string,
): string {
  if (prop === 'label') {
    return option.label;
  }
  if (prop === 'value') {
    return isEmptyValue(option.value) ? '' : String(option.value);
  }
  const data = option.data as Record<string, unknown> | null | undefined;
  const field = data && typeof data === 'object' ? data[prop] : undefined;
  return isEmptyValue(field) ? '' : String(field);
}

function splitTokens(text: string, separators: readonly string[]): string[] {
  let parts = [text];
  for (const separator of separators) {
    if (separator) {
      parts = parts.flatMap((part) => part.split(separator));
    }
  }
  return parts.map((part) => part.trim()).filter(Boolean);
}
