import type {
  AndesListNavigation,
  AndesOverlayPrimitive,
} from '@andes-ng/primitives';
import type { Signal } from '@angular/core';

/** Control height, matching the `sm`/`md`/`lg` steps used across andes-ng form controls. */
export type AndesSelectSize = 'sm' | 'md' | 'lg';

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

/** The part of an option the root component needs to see. */
export interface AndesSelectItemRef {
  /** The value this option carries. */
  readonly value: Signal<unknown>;
  /** Whether the option is unselectable. */
  readonly disabled: Signal<boolean>;
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
  /** Roving-tabindex/typeahead state for the options. */
  abstract readonly navigation: AndesListNavigation;

  /** Whether the panel is open. */
  abstract readonly isOpen: Signal<boolean>;
  /** The resolved selection: the `value` input, a form's value, or a user's pick. */
  abstract readonly selectedValue: Signal<unknown>;
  /** Whether a value is selected. */
  abstract readonly hasValue: Signal<boolean>;
  /** The text the trigger shows for the selected value, or `null` when there is none. */
  abstract readonly displayLabel: Signal<string | null>;
  /** Text shown while nothing is selected. */
  abstract readonly placeholder: Signal<string>;
  /** Whether the control is disabled, by input or by its form control. */
  abstract readonly isDisabled: Signal<boolean>;
  /** Whether the control is in its invalid state. */
  abstract readonly invalid: Signal<boolean>;
  /** Whether the control is required. */
  abstract readonly required: Signal<boolean>;
  /** Control height. */
  abstract readonly size: Signal<AndesSelectSize>;
  /** `aria-label` for the trigger, mirrored onto the listbox panel. */
  abstract readonly ariaLabel: Signal<string | undefined>;
  /** `aria-labelledby` for the trigger, mirrored onto the listbox panel. */
  abstract readonly ariaLabelledby: Signal<string | undefined>;
  /** `aria-describedby` for the trigger. */
  abstract readonly ariaDescribedby: Signal<string | undefined>;

  /** Adds an option to the registry. Called by `AndesSelectItem` on init. */
  abstract registerItem(item: AndesSelectItemRef): void;
  /** Removes an option from the registry. Called by `AndesSelectItem` on destroy. */
  abstract unregisterItem(item: AndesSelectItemRef): void;
  /** Whether the given option carries the selected value. */
  abstract isSelected(item: AndesSelectItemRef): boolean;
  /** Selects an option, notifies the form and closes the panel. */
  abstract selectItem(item: AndesSelectItemRef): void;

  /** Opens the panel and moves focus to the selected (or first) option. */
  abstract open(): void;
  /** Closes the panel; focus returns to the trigger. */
  abstract close(): void;
  /** Opens the panel if closed, closes it if open. */
  abstract toggle(): void;

  /** Handles a `keydown` on the closed trigger. */
  abstract onTriggerKeydown(event: KeyboardEvent): void;
  /** Marks the control as touched. */
  abstract markAsTouched(): void;
}
