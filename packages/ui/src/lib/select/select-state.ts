import type {
  AndesListNavigation,
  AndesOverlayAlign,
  AndesOverlayPrimitive,
  AndesOverlaySide,
} from '@andes-ng/primitives';
import type { Signal, TemplateRef } from '@angular/core';

/** Control height, matching the `sm`/`md`/`lg` steps used across andes-ng form controls. */
export type AndesSelectSize = 'sm' | 'md' | 'lg';

/**
 * Selection mode.
 *
 * - `single` — one value (or `null`); the panel closes on selection.
 * - `multiple` — an array of values rendered as removable tags; the panel stays open.
 * - `tags` — `multiple`, plus free text: whatever is typed can be added as a new value.
 */
export type AndesSelectMode = 'single' | 'multiple' | 'tags';

/** Validation status. `error` also sets `aria-invalid`; `warning` is purely visual. */
export type AndesSelectStatus = 'error' | 'warning';

/** Visual treatment of the trigger box. */
export type AndesSelectVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';

/** Where the panel opens relative to the trigger, in Ant Design's vocabulary. */
export type AndesSelectPlacement =
  'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

/**
 * Compares an option's value with the selected value. The default is strict equality,
 * which is wrong as soon as the values are objects coming back from a server — pass
 * something like `(a, b) => a?.id === b?.id` then.
 */
export type AndesSelectCompareWith = (a: unknown, b: unknown) => boolean;

/**
 * Renders a value as trigger text when no option carrying it has ever been rendered.
 * Options only exist in the DOM while the panel is open, so a value written by a form
 * before the first open has no label to borrow — see {@link AndesSelectState.displayLabel}.
 */
export type AndesSelectDisplayWith = (value: unknown) => string;

/** One entry of the `options` input. Extra fields are kept and reach `filterOption`. */
export interface AndesSelectOption<T = unknown> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
  readonly [key: string]: unknown;
}

/** A labelled group of entries in the `options` input. */
export interface AndesSelectOptionGroup<T = unknown> {
  readonly label: string;
  readonly options: readonly AndesSelectOption<T>[];
}

/** The `options` input: flat options, groups, or a mix of both. */
export type AndesSelectOptions<T = unknown> = readonly (
  AndesSelectOption<T> | AndesSelectOptionGroup<T>
)[];

/** The value shape `labelInValue` switches to. */
export interface AndesSelectLabeledValue<T = unknown> {
  readonly value: T;
  readonly label: string;
}

/** What a custom `filterOption` function is given for each option. */
export interface AndesSelectFilterOption {
  readonly value: unknown;
  readonly label: string;
  readonly disabled: boolean;
  /** The `options` entry (or an item's `data` input), for filtering on extra fields. */
  readonly data: unknown;
}

/** Decides whether an option stays visible for the current search text. */
export type AndesSelectFilterFn = (
  search: string,
  option: AndesSelectFilterOption,
) => boolean;

/** One selected value as rendered in the trigger in `multiple`/`tags` mode. */
export interface AndesSelectTag {
  readonly value: unknown;
  readonly label: string;
  /** `false` for a value whose option is disabled, or while the select is disabled. */
  readonly closable: boolean;
}

/** Template context for `tagTemplate`. */
export interface AndesSelectTagContext {
  readonly $implicit: AndesSelectTag;
  /** Removes this value, exactly as the built-in remove button does. */
  readonly onClose: () => void;
}

/** Template context for `optionTemplate`. */
export interface AndesSelectOptionContext {
  readonly $implicit: AndesSelectOption;
  readonly selected: boolean;
}

/** Template context for `labelTemplate`. */
export interface AndesSelectLabelContext {
  readonly $implicit: AndesSelectLabeledValue;
}

/** Template context for a `maxTagPlaceholder` template. */
export interface AndesSelectMaxTagPlaceholderContext {
  readonly $implicit: readonly AndesSelectTag[];
}

/** What stands in for the tags hidden by `maxTagCount`. */
export type AndesSelectMaxTagPlaceholder =
  | string
  | ((omitted: readonly AndesSelectTag[]) => string)
  | TemplateRef<AndesSelectMaxTagPlaceholderContext>;

/** A normalised `options` entry, as the panel renders it. */
export type AndesSelectOptionEntry =
  | { readonly kind: 'option'; readonly option: AndesSelectOption }
  | {
      readonly kind: 'group';
      readonly label: string;
      readonly options: readonly AndesSelectOption[];
    };

/** The part of an option the root component needs to see. */
export interface AndesSelectItemRef {
  /** The value this option carries. */
  readonly value: Signal<unknown>;
  /** Whether the option is unselectable. */
  readonly disabled: Signal<boolean>;
  /** Arbitrary data attached to the option, handed to `filterOption`. */
  readonly data: Signal<unknown>;
  /** @internal Whether the select itself created this option (a `tags`-mode value). */
  readonly custom: Signal<boolean>;
  /**
   * The `role="option"` element — the same element the list-navigation primitive
   * registers, so the two registries can be matched up by identity.
   */
  readonly optionElement: HTMLElement;
  /** Text shown in the trigger once this option is selected. */
  getLabel(): string;
}

/**
 * The internal contract between `AndesSelect` and its compound parts.
 *
 * It exists purely so the parts (`AndesSelectTrigger`, `AndesSelectValue`,
 * `AndesSelectContent`, `AndesSelectItem`, …) can inject the root without importing it:
 * the root provides itself as `AndesSelectState`, which keeps the module graph a tree
 * instead of a cycle. It is exported because `AndesSelectState` appears in the parts'
 * public constructor types, not because consumers are expected to implement it.
 */
export abstract class AndesSelectState {
  /** The overlay instance the panel is rendered into. */
  abstract readonly overlay: AndesOverlayPrimitive;
  /** Roving-tabindex/active-descendant/typeahead state for the options. */
  abstract readonly navigation: AndesListNavigation;

  /** Stable id of the `role="listbox"` element, for the combobox's `aria-controls`. */
  abstract readonly listboxId: string;
  /** Stable id of the hidden element summarising the selection for screen readers. */
  abstract readonly summaryId: string;

  /** Whether the panel is open. */
  abstract readonly isOpen: Signal<boolean>;
  /** The resolved selection: the `value` input, a form's value, or a user's pick. */
  abstract readonly selectedValue: Signal<unknown>;
  /** The (first) selected value, unwrapped from `labelInValue`'s `{ value, label }`. */
  abstract readonly rawValue: Signal<unknown>;
  /** Whether a value is selected. */
  abstract readonly hasValue: Signal<boolean>;
  /** The text the trigger shows for the selected value, or `null` when there is none. */
  abstract readonly displayLabel: Signal<string | null>;
  /** Text shown while nothing is selected. */
  abstract readonly placeholder: Signal<string>;
  /** Whether the control is disabled, by input or by its form control. */
  abstract readonly isDisabled: Signal<boolean>;
  /** Whether the control is in its invalid state (`aria-invalid` or `status="error"`). */
  abstract readonly invalid: Signal<boolean>;
  /** Whether the control is required. */
  abstract readonly required: Signal<boolean>;
  /** Control height. */
  abstract readonly size: Signal<AndesSelectSize>;
  /** Selection mode. */
  abstract readonly mode: Signal<AndesSelectMode>;
  /** Whether the value is an array (`multiple` or `tags`). */
  abstract readonly isMultiple: Signal<boolean>;
  /** Whether the combobox is a text input that filters the options. */
  abstract readonly searchEnabled: Signal<boolean>;
  /** The current search text. */
  abstract readonly searchValue: Signal<string>;
  /** Validation status. */
  abstract readonly status: Signal<AndesSelectStatus | undefined>;
  /** Visual variant. */
  abstract readonly variant: Signal<AndesSelectVariant>;
  /** Whether options are being loaded. */
  abstract readonly loading: Signal<boolean>;
  /** Whether the clear button should be rendered. */
  abstract readonly showClear: Signal<boolean>;
  /** `aria-label` for the trigger, mirrored onto the listbox panel. */
  abstract readonly ariaLabel: Signal<string | undefined>;
  /** `aria-labelledby` for the trigger, mirrored onto the listbox panel. */
  abstract readonly ariaLabelledby: Signal<string | undefined>;
  /** `aria-describedby` for the trigger. */
  abstract readonly ariaDescribedby: Signal<string | undefined>;
  /** The id to publish as `aria-activedescendant` while the search input owns focus. */
  abstract readonly activeDescendantId: Signal<string | null>;
  /** Screen-reader text describing the selection, or `null` when the trigger shows it. */
  abstract readonly selectionSummary: Signal<string | null>;

  /** The tags rendered in the trigger (`multiple`/`tags` mode), capped by `maxTagCount`. */
  abstract readonly visibleTags: Signal<readonly AndesSelectTag[]>;
  /** The tags hidden by `maxTagCount`. */
  abstract readonly omittedTags: Signal<readonly AndesSelectTag[]>;
  /** Text of the `+ N ...` tag, when `maxTagPlaceholder` is not a template. */
  abstract readonly maxTagPlaceholderText: Signal<string>;
  /** `maxTagPlaceholder`, when it is a template. */
  abstract readonly maxTagPlaceholderTemplate: Signal<TemplateRef<AndesSelectMaxTagPlaceholderContext> | null>;
  /** Maximum characters shown per tag. */
  abstract readonly maxTagTextLength: Signal<number | undefined>;

  /** Custom renderers. */
  abstract readonly tagTemplate: Signal<
    TemplateRef<AndesSelectTagContext> | undefined
  >;
  abstract readonly labelTemplate: Signal<
    TemplateRef<AndesSelectLabelContext> | undefined
  >;
  abstract readonly optionTemplate: Signal<
    TemplateRef<AndesSelectOptionContext> | undefined
  >;
  abstract readonly prefix: Signal<TemplateRef<unknown> | undefined>;
  abstract readonly suffixIcon: Signal<TemplateRef<unknown> | null | undefined>;
  abstract readonly clearIcon: Signal<TemplateRef<unknown> | undefined>;
  abstract readonly removeIcon: Signal<TemplateRef<unknown> | undefined>;

  /** The `options` input, normalised for rendering. */
  abstract readonly optionEntries: Signal<readonly AndesSelectOptionEntry[]>;
  /** The typed text offered as a new value in `tags` mode, or `null`. */
  abstract readonly tagCandidate: Signal<string | null>;
  /** Selected `tags`-mode values that no option carries, listed so they can be deselected. */
  abstract readonly customTags: Signal<readonly unknown[]>;
  /** Whether the panel shows its loading row. */
  abstract readonly showLoadingRow: Signal<boolean>;
  /** Whether the panel shows its empty state. */
  abstract readonly showEmpty: Signal<boolean>;
  /** Content of the empty state. */
  abstract readonly notFoundContent: Signal<
    string | TemplateRef<unknown> | null
  >;
  /** Maximum height of the panel in px. */
  abstract readonly listHeight: Signal<number>;
  /** Default panel side and alignment, from `placement`. */
  abstract readonly placementSide: Signal<AndesOverlaySide>;
  abstract readonly placementAlign: Signal<AndesOverlayAlign>;

  /** Adds an option to the registry. Called by `AndesSelectItem` after its view inits. */
  abstract registerItem(item: AndesSelectItemRef): void;
  /** Removes an option from the registry. Called by `AndesSelectItem` on destroy. */
  abstract unregisterItem(item: AndesSelectItemRef): void;
  /** Registers the focusable combobox element. Called by `AndesSelectTrigger`. */
  abstract registerCombobox(element: HTMLElement | null): void;
  /** Whether the given option carries a selected value. */
  abstract isSelected(item: AndesSelectItemRef): boolean;
  /** Whether a raw value is selected. */
  abstract isSelectedValue(value: unknown): boolean;
  /** Whether the option is hidden by the current search. */
  abstract isFilteredOut(item: AndesSelectItemRef): boolean;
  /** Whether the option is unselectable because `maxCount` has been reached. */
  abstract isBlocked(item: AndesSelectItemRef): boolean;
  /** The best label available for a raw value. */
  abstract labelFor(value: unknown): string;
  /** Selects (or, in `multiple`/`tags` mode, toggles) an option. */
  abstract selectItem(item: AndesSelectItemRef): void;
  /** Removes one value (`multiple`/`tags` mode). */
  abstract removeValue(value: unknown): void;
  /** Clears the selection and the search text. */
  abstract clear(): void;
  /** Handles text typed into the search input. */
  abstract onSearchInput(text: string): void;

  /** Opens the panel and moves focus to the selected (or first) option. */
  abstract open(): void;
  /** Closes the panel; focus returns to the trigger. */
  abstract close(): void;
  /** Opens the panel if closed, closes it if open. */
  abstract toggle(): void;
  /** Moves focus to the combobox. */
  abstract focus(): void;

  /** Handles a `keydown` on the combobox (button or search input). */
  abstract onTriggerKeydown(event: KeyboardEvent): void;
  /** Marks the control as touched. */
  abstract markAsTouched(): void;
}
