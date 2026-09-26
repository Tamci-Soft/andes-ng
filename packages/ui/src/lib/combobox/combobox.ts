import {
  AndesListNavigation,
  AndesOverlayPrimitive,
  andesOverlayPreset,
  provideAndesOverlay,
  type AndesOverlayAlign,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
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
  ViewEncapsulation,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { AndesComboboxContent } from './combobox-content';
import { AndesComboboxEmpty } from './combobox-empty';
import { AndesComboboxInput } from './combobox-input';
import { AndesComboboxItem } from './combobox-item';
import { ANDES_COMBOBOX } from './combobox-token';

/** Converts an item to the text shown in the input and matched against while filtering. */
export type AndesComboboxItemToString<T> = (item: T) => string;

/** Custom filter predicate, given the raw item and the input's current (untrimmed) text. */
export type AndesComboboxFilterPredicate<T> = (
  item: T,
  query: string,
) => boolean;

/** Equality check used to determine which item (if any) is the current selection. */
export type AndesComboboxCompareWith<T> = (a: T, b: T) => boolean;

/** One suggestion in the data-driven `[options]` mode. */
export interface AndesComboboxOption<T = string> {
  readonly value: T;
  /** Text shown in the list and put in the input once chosen. Defaults to `itemToStringValue(value)`. */
  readonly label?: string;
  readonly disabled?: boolean;
}

/** A labelled group of suggestions in the `[options]` mode. */
export interface AndesComboboxOptionGroup<T = string> {
  readonly label: string;
  readonly options: readonly AndesComboboxOption<T>[];
}

/** An entry of `[options]`: a suggestion, or a group of them. */
export type AndesComboboxOptionEntry<T = string> =
  AndesComboboxOption<T> | AndesComboboxOptionGroup<T>;

/**
 * A custom `filterOption` function: given the input's current (untrimmed) text and a
 * suggestion, decides whether that suggestion stays in the list. In the projected-items
 * mode each item is handed over wrapped as `{ value: item, label: itemToStringValue(item) }`.
 */
export type AndesComboboxFilterOption<T> = (
  query: string,
  option: AndesComboboxOption<T>,
) => boolean;

export type AndesComboboxSize = 'sm' | 'md' | 'lg';
export type AndesComboboxStatus = 'error' | 'warning';
export type AndesComboboxVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';
export type AndesComboboxPlacement =
  'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/** Payload of `(optionSelect)`: the chosen value and the option it came from. */
export interface AndesComboboxSelectEvent<T = string> {
  readonly value: T;
  readonly option: AndesComboboxOption<T>;
}

/** Context of an `[optionTemplate]`. */
export interface AndesComboboxOptionContext<T = string> {
  readonly $implicit: AndesComboboxOption<T>;
  /** The input's current text, e.g. for highlighting the matched part. */
  readonly query: string;
}

/** @internal One row of the `[options]` mode's rendered list. */
export type AndesComboboxRenderedEntry<T> =
  | {
      readonly kind: 'group';
      readonly key: string;
      readonly label: string;
      readonly options: readonly AndesComboboxOption<T>[];
    }
  | {
      readonly kind: 'option';
      readonly key: T;
      readonly option: AndesComboboxOption<T>;
    };

const defaultItemToString = <T>(item: T): string => `${item}`;
const defaultCompareWith = <T>(a: T, b: T): boolean => a === b;

function isGroup<T>(
  entry: AndesComboboxOptionEntry<T>,
): entry is AndesComboboxOptionGroup<T> {
  return Array.isArray((entry as AndesComboboxOptionGroup<T>).options);
}

/** `filterOption` accepts a bare attribute (`filterOption="false"`) as well as a function. */
function filterOptionAttribute<T>(
  value: boolean | string | AndesComboboxFilterOption<T>,
): boolean | AndesComboboxFilterOption<T> {
  return typeof value === 'function' ? value : booleanAttribute(value);
}

/** `popupMatchSelectWidth` as `boolean | number`, attribute-friendly. */
function matchWidthAttribute(
  value: boolean | number | string,
): boolean | number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && !isNaN(+value)) {
    return numberAttribute(value);
  }
  return booleanAttribute(value);
}

function optionalNumberAttribute(value: unknown): number | undefined {
  return value == null || value === '' ? undefined : numberAttribute(value);
}

let nextUniqueId = 0;

/**
 * Root of the Combobox / autocomplete component: a free-text input backed by a filtered,
 * keyboard-navigable list of suggestions.
 *
 * Composes two shared behavior primitives directly rather than reinventing either:
 * `AndesOverlayPrimitive` for the popup (portal, positioning, dismissal - configured as a
 * non-modal, anchored popover that never traps or steals focus) and `AndesListNavigation`
 * in its `'active-descendant'` focus mode for the suggestion list (arrow-key highlighting
 * communicated purely via `aria-activedescendant`, since real DOM focus must stay on the
 * `<input>` at all times - see `AndesComboboxInput`).
 *
 * It can be used two ways.
 *
 * **Data-driven**: pass `[options]` and the component renders the input, the popup,
 * groups, options and the empty/loading states itself.
 *
 * ```html
 * <andes-combobox [options]="fruits" placeholder="Search fruit..." [(ngModel)]="fruit" />
 * ```
 *
 * **Compound**, for full control over the markup: assemble the parts in the host template.
 *
 * ```html
 * <andes-combobox #combobox [items]="fruits" [(ngModel)]="selectedFruit">
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
 * Every input, output and model applies to both modes, except where a doc comment says
 * otherwise. `filteredItems`, `labelOf` and every other `@internal` member exists for the
 * parts to compose against - it is the equivalent of React context for this compound
 * component, not part of the supported public API.
 */
@Component({
  selector: 'andes-combobox',
  imports: [
    NgTemplateOutlet,
    AndesComboboxInput,
    AndesComboboxContent,
    AndesComboboxItem,
    AndesComboboxEmpty,
  ],
  templateUrl: './combobox.html',
  styleUrl: './combobox.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The input, popup, options and empty-state are content projected in through the
  // andesCombobox* directives (or rendered into a portal), so emulated encapsulation's
  // scoping attribute would never reach them - see combobox.css.
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideAndesOverlay(),
    AndesListNavigation,
    {
      provide: ANDES_COMBOBOX,
      useExisting: forwardRef(() => AndesCombobox),
    },
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
  /**
   * The current selection: `null` until a suggestion is chosen, and again once the text is
   * edited away from the chosen suggestion's label. Two-way bindable as `[(value)]`, and
   * written by `[(ngModel)]`/`[formControl]` through the ControlValueAccessor as well.
   *
   * `value` is never the input's free text: that is reported by `(searchChange)`, the
   * chosen suggestion by `value`/`(optionSelect)`.
   */
  readonly value = model<T | null>(null);

  /**
   * Whether the suggestion popup is open. Two-way bindable as `[(open)]`, and kept in sync
   * however the popup opens or closes (focus, typing, Escape, an outside click, a
   * selection). Named `isOpen` on the class so the imperative `open()`/`close()` methods
   * keep their names.
   */
  readonly isOpen = model(false, { alias: 'open' });

  /**
   * Data-driven suggestions: `{ label, value }` objects, optionally nested one level into
   * `{ label, options }` groups. When set, the component renders its own input and popup
   * and ignores projected `andesComboboxInput`/`andesComboboxContent` parts.
   */
  readonly options = input<readonly AndesComboboxOptionEntry<T>[] | undefined>(
    undefined,
  );

  /** The compound mode's data source: what `filteredItems` is filtered from. */
  readonly items = input<readonly T[]>([]);

  /**
   * Converts an item to the string shown in the input once selected and matched against
   * while filtering. Defaults to template-literal stringification, which is exactly right
   * for `T = string` and a reasonable fallback for anything else - override it for object
   * items. In the `[options]` mode it is the fallback for an option without a `label`.
   */
  readonly itemToStringValue =
    input<AndesComboboxItemToString<T>>(defaultItemToString);

  /**
   * Client-side filtering. `true` (the default) keeps suggestions whose
   * `optionFilterProp` contains the input's text, case-insensitively; `false` turns
   * client-side filtering off entirely - for suggestions already filtered by a server; a
   * function decides per suggestion.
   */
  readonly filterOption = input<
    boolean | AndesComboboxFilterOption<T>,
    boolean | string | AndesComboboxFilterOption<T>
  >(true, { transform: filterOptionAttribute });

  /**
   * Which property of a suggestion the default filter matches against. `'label'` (the
   * default) uses the displayed text; any other key reads that property off the option
   * object, e.g. `'value'` or an extra field such as `'keywords'`.
   */
  readonly optionFilterProp = input('label');

  /**
   * The compound mode's original custom filter, given the raw item and the input's text.
   * Kept for compatibility; a `filterOption` function takes precedence over it.
   */
  readonly filterPredicate = input<AndesComboboxFilterPredicate<T> | undefined>(
    undefined,
  );

  /** Identifies which item (if any) is the current selection. Defaults to `===`. */
  readonly compareWith = input<AndesComboboxCompareWith<T>>(defaultCompareWith);

  /**
   * Highlights the first filtered match automatically whenever the list changes, so Enter
   * picks it straight away.
   */
  readonly autoHighlight = input(true, { transform: booleanAttribute });

  /**
   * When on, moving the highlight with the arrow keys previews that suggestion's label in
   * the input, without re-filtering the list. Enter or leaving the field commits the
   * previewed suggestion; Escape restores the text that was typed.
   */
  readonly backfill = input(false, { transform: booleanAttribute });

  /** Shows a button that empties the input and the selection while there is text. */
  readonly allowClear = input(false, { transform: booleanAttribute });
  /** Replaces the clear button's default cross icon. */
  readonly clearIcon = input<TemplateRef<void> | undefined>(undefined);
  /** Accessible name of the clear button. */
  readonly clearLabel = input('Clear');

  /** Placeholder of the input. Applied to a projected `andesComboboxInput` too. */
  readonly placeholder = input<string | undefined>(undefined);
  /** Native `maxlength` of the input. Applied to a projected `andesComboboxInput` too. */
  readonly maxLength = input<number | undefined, unknown>(undefined, {
    transform: optionalNumberAttribute,
  });
  /** Focuses the input once it first renders (which, as any focus does, opens the popup). */
  readonly autoFocus = input(false, { transform: booleanAttribute });
  /** `id` of the rendered input in the `[options]` mode, for a `<label for>`. */
  readonly inputId = input<string | undefined>(undefined);

  /** Control height and font size. */
  readonly size = input<AndesComboboxSize>('md');
  /** Validation status. `'error'` also sets `aria-invalid` on the input. */
  readonly status = input<AndesComboboxStatus | undefined>(undefined);
  /** Visual treatment of the input box. */
  readonly variant = input<AndesComboboxVariant>('outlined');

  /** Where the popup opens relative to the input. Flips when it does not fit. */
  readonly placement = input<AndesComboboxPlacement>('bottom-start');

  /**
   * Popup width: `true` (the default) makes the popup exactly as wide as the input,
   * `false` sizes it to its content, a number sets that width in px.
   */
  readonly popupMatchSelectWidth = input<
    boolean | number,
    boolean | number | string
  >(true, { transform: matchWidthAttribute });

  /**
   * What the `[options]` mode's popup shows when nothing matches: a message (rendered with
   * the inbox illustration) or a template. `null` hides the popup while there are no
   * matches.
   */
  readonly notFoundContent = input<string | TemplateRef<void> | null>(
    'No results found.',
  );

  /**
   * Marks the suggestions as being fetched: shows a spinner in the input, sets `aria-busy`
   * on the popup, and - in the `[options]` mode - replaces the list with `loadingText`.
   */
  readonly loading = input(false, { transform: booleanAttribute });
  /** The `[options]` mode's loading message. */
  readonly loadingText = input('Loading...');

  /** Custom rendering of each suggestion in the `[options]` mode. */
  readonly optionTemplate = input<
    TemplateRef<AndesComboboxOptionContext<T>> | undefined
  >(undefined);

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

  /**
   * The input's text, on every edit (typing, or clearing). Not named `search`, which is
   * a native DOM event.
   */
  readonly searchChange = output<string>();
  /** A suggestion was chosen, even if it was already the value. */
  readonly optionSelect = output<AndesComboboxSelectEvent<T>>();
  /** The clear button was used. */
  readonly clear = output<void>();
  /** Scroll events of the `[options]` mode's popup (e.g. for infinite loading). */
  readonly popupScroll = output<Event>();

  /** @internal */
  readonly overlay = inject(AndesOverlayPrimitive);
  /** @internal */
  readonly navigation = inject(AndesListNavigation);

  private readonly panel = viewChild<TemplateRef<unknown>>('panel');

  private readonly uid = `andes-combobox-${nextUniqueId++}`;
  private readonly _query = signal('');
  private readonly _backfill = signal<string | null>(null);
  private readonly formDisabled = signal(false);
  private destroyed = false;

  /** @internal The text the user typed, which the list is filtered by. */
  readonly query = this._query.asReadonly();

  /** @internal The text shown in the input: a backfilled preview, or else the query. */
  readonly displayText = computed(() => this._backfill() ?? this._query());

  /** Combines the `disabled` input with a disabled state set through the forms APIs. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /** @internal */
  readonly usesOptions = computed(() => this.options() !== undefined);

  /** @internal */
  readonly invalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );

  /** @internal */
  readonly showClear = computed(
    () =>
      this.allowClear() &&
      this.displayText() !== '' &&
      !this.isDisabled() &&
      !this.readOnly(),
  );

  /** @internal How many affordances sit at the input's inline end, so it reserves room. */
  readonly suffixCount = computed(
    () => Number(this.showClear()) + Number(this.loading()),
  );

  /** @internal */
  readonly hasSuffix = computed(() => this.suffixCount() > 0);

  /** @internal The `[options]` mode's rows: groups and options that match the query. */
  readonly renderedOptions = computed<readonly AndesComboboxRenderedEntry<T>[]>(
    () => {
      const entries = this.options() ?? [];
      const query = this._query();
      const filtering = this.isFiltering(query);
      const keep = (option: AndesComboboxOption<T>) =>
        !filtering || this.matches(option, query);

      const rendered: AndesComboboxRenderedEntry<T>[] = [];
      entries.forEach((entry, index) => {
        if (isGroup(entry)) {
          const options = entry.options.filter(keep);
          if (options.length > 0) {
            rendered.push({
              kind: 'group',
              key: `${this.uid}-group-${index}`,
              label: entry.label,
              options,
            });
          }
        } else if (keep(entry)) {
          rendered.push({ kind: 'option', key: entry.value, option: entry });
        }
      });
      return rendered;
    },
  );

  /**
   * @internal Items matching the current input text - the compound mode's `[items]`, or
   * the `[options]` mode's values, flattened out of their groups.
   */
  readonly filteredItems = computed<readonly T[]>(() => {
    if (this.usesOptions()) {
      return this.renderedOptions().flatMap((entry) =>
        entry.kind === 'group'
          ? entry.options.map((option) => option.value)
          : [entry.option.value],
      );
    }

    const items = this.items();
    const query = this._query();
    if (!this.isFiltering(query)) {
      return items;
    }

    const filter = this.filterOption();
    const predicate = this.filterPredicate();
    const toString = this.itemToStringValue();
    return items.filter((item) =>
      typeof filter !== 'function' && predicate
        ? predicate(item, query)
        : this.matches({ value: item, label: toString(item) }, query),
    );
  });

  /** @internal Whether the `[options]` popup has nothing to show and should hide itself. */
  readonly hidePopup = computed(
    () =>
      this.notFoundContent() === null &&
      !this.loading() &&
      this.renderedOptions().length === 0,
  );

  /** @internal */
  readonly notFoundTemplate = computed(() => {
    const content = this.notFoundContent();
    return content instanceof TemplateRef ? content : null;
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- replaced by registerOnChange before any real change can occur
  private onChange: (value: T | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- replaced by registerOnTouched before any real touch can occur
  private onTouched: () => void = () => {};

  // Tracks what the auto-highlight effect last acted on - see its guard, below.
  private lastAutoHighlightItems: readonly T[] | undefined;
  private lastAutoHighlightOpen: boolean | undefined;
  private lastAutoHighlightEnabled: boolean | undefined;
  private lastAutoHighlightLoading: boolean | undefined;
  private lastAutoHighlightRegistered: readonly unknown[] | undefined;

  /**
   * The value this component itself last wrote to {@link value} (or received through
   * `writeValue`), so the effect that mirrors a parent's `[value]` binding into the input's
   * text can tell a parent's write apart from its own.
   */
  private syncedValue: T | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));

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

    // The [(open)] model follows the overlay however it opened or closed...
    this.overlay.opened.subscribe(() => {
      if (!this.destroyed) {
        this.isOpen.set(true);
      }
    });
    this.overlay.closed.subscribe((reason) => {
      // A backfilled preview only outlives the popup when it was committed (Enter, blur);
      // any other way of closing discards it, restoring the text that was typed.
      this._backfill.set(null);
      // 'destroyed' is the overlay tearing down with this component, by which point the
      // model's own output is already destroyed and would throw on emit (NG0953).
      if (!this.destroyed && reason !== 'destroyed') {
        this.isOpen.set(false);
      }
    });

    // ...and the overlay follows the model when a parent writes [open].
    effect(() => {
      const wanted = this.isOpen();
      // Read (tracked) so that an initial [open]="true" waits for the template to exist.
      if (!this.panel()) {
        return;
      }
      untracked(() => {
        const actual = this.overlay.isOpen();
        if (wanted && !actual) {
          this.open();
          if (!this.overlay.isOpen()) {
            // Disabled or read-only: refuse, and say so through openChange.
            this.isOpen.set(false);
          }
        } else if (!wanted && actual) {
          this.close();
        }
      });
    });

    effect(() => {
      const [side, align] = this.placement().split('-') as [
        AndesOverlaySide,
        AndesOverlayAlign,
      ];
      const match = this.popupMatchSelectWidth();
      this.overlay.configure({
        positioning: {
          kind: 'anchored',
          side,
          align,
          sideOffset: 4,
          matchAnchorWidth: match === true,
        },
        size: typeof match === 'number' ? { width: match } : {},
      });
    });

    // Mirrors a parent's [value] write into the input's text, the way writeValue does for
    // the forms APIs. Writes this component made itself are recognised and skipped - the
    // text they belong with is already in place.
    effect(() => {
      const value = this.value();
      untracked(() => {
        if (value === this.syncedValue) {
          return;
        }
        this.syncedValue = value;
        this._backfill.set(null);
        this._query.set(value == null ? '' : this.labelOf(value));
      });
    });

    effect(() => {
      const items = this.filteredItems();
      const isOpen = this.overlay.isOpen();
      const autoHighlight = this.autoHighlight();
      const loading = this.loading();
      // The rows actually rendered for those items. They register a render *after*
      // filteredItems changes - so a list that arrives while the popup is already open
      // (async options, loading ending) has nothing to highlight on the first run, and
      // needs this to run again once the rows exist.
      const registered = this.navigation.items();

      // This effect exists to *re*-highlight the first match whenever the filtered set or
      // open state genuinely changes - not to re-run its side effect on every unrelated
      // change-detection pass. Without this guard it would call clearActive() on every
      // tick once autoHighlight is off, silently undoing whatever ArrowDown/ArrowUp just
      // set as the active item (arrow-key navigation writes activeItem, not filteredItems
      // or isOpen, so it never legitimately needs to re-run for that).
      if (
        items === this.lastAutoHighlightItems &&
        isOpen === this.lastAutoHighlightOpen &&
        autoHighlight === this.lastAutoHighlightEnabled &&
        loading === this.lastAutoHighlightLoading &&
        registered === this.lastAutoHighlightRegistered
      ) {
        return;
      }
      this.lastAutoHighlightItems = items;
      this.lastAutoHighlightOpen = isOpen;
      this.lastAutoHighlightEnabled = autoHighlight;
      this.lastAutoHighlightLoading = loading;
      this.lastAutoHighlightRegistered = registered;

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
    const panel = this.panel();
    if (
      !panel ||
      this.isDisabled() ||
      this.readOnly() ||
      this.overlay.isOpen()
    ) {
      return;
    }
    this.overlay.open(panel);
  }

  /** Closes the suggestion popup. A no-op if already closed. */
  close(): void {
    this.overlay.close();
  }

  /** Moves focus to the input. */
  focus(options?: FocusOptions): void {
    this.overlay.anchor()?.focus(options);
  }

  /** Removes focus from the input. */
  blur(): void {
    this.overlay.anchor()?.blur();
  }

  /** Empties the input and the selection, as the `allowClear` button does. */
  clearValue(): void {
    this._backfill.set(null);
    this._query.set('');
    this.searchChange.emit('');
    if (this.value() !== null) {
      this.setValue(null);
    }
    this.clear.emit();
    this.focus();
  }

  /** @internal Called by `AndesComboboxInput` on every keystroke. */
  setQuery(text: string): void {
    this._backfill.set(null);
    this._query.set(text);
    this.searchChange.emit(text);

    // Once the displayed text no longer matches the selected item's own label, the
    // selection itself is stale - clearing it keeps the form value honest instead of
    // silently keeping a value the user has since edited away from.
    const current = this.value();
    if (current !== null && this.labelOf(current) !== text) {
      this.setValue(null);
    }
  }

  /** @internal Called by `AndesComboboxItem` on pointer selection. */
  selectValue(value: T): void {
    this._backfill.set(null);
    this._query.set(this.labelOf(value));
    this.setValue(value);
    this.onTouched();
    this.optionSelect.emit({ value, option: this.optionFor(value) });
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
    const active = this.activeItem();
    if (!active) {
      return false;
    }
    this.selectValue(active.value());
    return true;
  }

  /**
   * @internal Called by `AndesComboboxInput` after an arrow key moved the highlight:
   * previews the highlighted suggestion's label in the input when `backfill` is on.
   */
  backfillActiveItem(): void {
    if (!this.backfill()) {
      return;
    }
    const active = this.activeItem();
    if (active) {
      this._backfill.set(this.labelOf(active.value()));
    }
  }

  /** @internal Called by `AndesComboboxInput` on Escape: discards any preview, then closes. */
  dismiss(): void {
    this._backfill.set(null);
    this.close();
  }

  /** @internal Called by `AndesComboboxInput` on blur. */
  notifyBlur(): void {
    // Leaving the field with a backfilled preview showing keeps what the user sees.
    if (this._backfill() !== null && this.selectActiveItem()) {
      return;
    }
    this.onTouched();
    this.close();
  }

  /** @internal Whether `value` is the current selection, per `compareWith`. */
  isSelected(value: T): boolean {
    const current = this.value();
    return current !== null && this.compareWith()(current, value);
  }

  /** @internal The text a value is shown as: its option's label, or `itemToStringValue`. */
  labelOf(value: T): string {
    const option = this.findOption(value);
    return option ? this.optionLabel(option) : this.itemToStringValue()(value);
  }

  /** @internal */
  optionLabel(option: AndesComboboxOption<T>): string {
    return option.label ?? this.itemToStringValue()(option.value);
  }

  /** @internal Relays the `[options]` popup's scroll events. */
  onPopupScroll(event: Event): void {
    this.popupScroll.emit(event);
  }

  writeValue(value: T | null): void {
    const next = value ?? null;
    this.syncedValue = next;
    this.value.set(next);
    this._backfill.set(null);
    this._query.set(next === null ? '' : this.labelOf(next));
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

  private setValue(value: T | null): void {
    this.syncedValue = value;
    this.value.set(value);
    this.onChange(value);
  }

  private activeItem(): AndesComboboxItem<T> | null {
    return this.navigation.activeItem() as AndesComboboxItem<T> | null;
  }

  private isFiltering(query: string): boolean {
    return query.trim() !== '' && this.filterOption() !== false;
  }

  private matches(option: AndesComboboxOption<T>, query: string): boolean {
    const filter = this.filterOption();
    if (typeof filter === 'function') {
      return filter(query, option);
    }
    const prop = this.optionFilterProp();
    const target =
      prop === 'label'
        ? this.optionLabel(option)
        : (option as unknown as Record<string, unknown>)[prop];
    return String(target ?? '')
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  }

  private findOption(value: T): AndesComboboxOption<T> | undefined {
    const entries = this.options();
    if (!entries) {
      return undefined;
    }
    const compare = this.compareWith();
    for (const entry of entries) {
      const found = isGroup(entry)
        ? entry.options.find((option) => compare(option.value, value))
        : compare(entry.value, value)
          ? entry
          : undefined;
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  private optionFor(value: T): AndesComboboxOption<T> {
    return this.findOption(value) ?? { value, label: this.labelOf(value) };
  }
}
