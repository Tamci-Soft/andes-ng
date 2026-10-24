import { InjectionToken, Signal, TemplateRef } from '@angular/core';

export type AndesSegmentedSize = 'sm' | 'md' | 'lg';
export type AndesSegmentedShape = 'default' | 'round';

/** One entry of `AndesSegmented`'s `options` input. */
export interface AndesSegmentedOptionConfig<T = unknown> {
  /** Text of the option; omit for an icon-only option (and then give `ariaLabel`). */
  label?: string;
  value: T;
  /** Rendered before the label. */
  icon?: TemplateRef<unknown>;
  disabled?: boolean;
  /** Native tooltip (`title`) of the option. */
  tooltip?: string;
  /** Accessible name; needed when the option has no text label. */
  ariaLabel?: string;
  /** Extra CSS class(es) on the rendered option. */
  class?: string;
}

/** A bare string/number is shorthand for `{ label: String(value), value }`. */
export type AndesSegmentedOptionInput<T = unknown> =
  AndesSegmentedOptionConfig<T> | (T & string) | (T & number);

/** Context of the `optionLabel` template: `let-option` is the normalized option. */
export interface AndesSegmentedOptionContext<T = unknown> {
  $implicit: AndesSegmentedOptionConfig<T>;
  checked: boolean;
  index: number;
}

/** Payload of `(selectionChange)`: only user selections, never programmatic writes. */
export interface AndesSegmentedChange<T = unknown> {
  value: T;
  /** The click or key event that selected the option. */
  event: Event;
}

/** What an option reads from and reports to its group. */
export interface AndesSegmentedApi {
  readonly size: Signal<AndesSegmentedSize>;
  readonly isDisabled: Signal<boolean>;
  readonly isChecked: (value: unknown) => boolean;
  /** The one option instance that is in the tab order (roving tabindex). */
  readonly tabbable: Signal<unknown>;
  readonly select: (value: unknown, event: Event) => void;
}

export const ANDES_SEGMENTED = new InjectionToken<AndesSegmentedApi>(
  'ANDES_SEGMENTED',
);
