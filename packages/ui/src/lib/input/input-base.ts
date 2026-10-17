import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  input,
  model,
  output,
  Signal,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import clsx from 'clsx';

import type { AndesButtonSize } from '../button/button';

export type AndesInputSize = 'sm' | 'md' | 'lg';
export type AndesInputVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';
export type AndesInputStatus = 'error' | 'warning';

/** What `countFormatter` receives. */
export interface AndesInputCountInfo {
  value: string;
  /** The count as measured by `countStrategy` (UTF-16 code units without one). */
  count: number;
  /** The effective limit: `countMax` when set, otherwise `maxLength`. */
  maxLength: number | undefined;
}

export type AndesInputCountFormatter = (info: AndesInputCountInfo) => string;

/** Measures a value for the counter and the limit - e.g. counting an emoji as one character. */
export type AndesInputCountStrategy = (value: string) => number;

/**
 * Cuts a value that went over `countMax` back down to size. Receives the over-long value and
 * the limit, returns what the field should hold instead.
 */
export type AndesInputCountExceedFormatter = (
  value: string,
  config: { max: number },
) => string;

/** `cursor` places the caret at the start or end, or selects all the text, after focusing. */
export interface AndesInputFocusOptions extends FocusOptions {
  cursor?: 'start' | 'end' | 'all';
}

/** State the shared template needs to draw the Search variant's attached button. */
export interface AndesInputSearchButtonState {
  label: string | undefined;
  /** Custom button content, drawn in place of both the label and the icon. */
  content: TemplateRef<unknown> | undefined;
  /** Replaces the default magnifier icon on an icon-only button. */
  icon: TemplateRef<unknown> | undefined;
  primary: boolean;
  loading: boolean;
}

/** Template context of the Password variant's custom visibility icon: `let-visible`. */
export interface AndesInputVisibilityIconContext {
  $implicit: boolean;
}

// Module-level rather than per-class so ids stay unique across every Input variant rendered on
// the same page (they all share one template and so one id scheme).
let nextId = 0;

// `numberAttribute` turns a missing value into NaN; the count limit has to stay `undefined` so
// it can fall back to `maxLength`.
function optionalNumberAttribute(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Host bindings shared by every variant. The ARIA/id/name attributes are forwarded to the real
 * <input> in the template instead - a screen reader never sees this non-interactive host
 * element, and a static attribute here would otherwise be left behind on both elements at once
 * (same rationale as AndesButton).
 */
export const ANDES_INPUT_HOST = {
  '[attr.id]': 'null',
  '[attr.name]': 'null',
  '[attr.aria-label]': 'null',
  '[attr.aria-labelledby]': 'null',
  '[attr.aria-describedby]': 'null',
  '[attr.aria-invalid]': 'null',
};

/**
 * Everything `andes-input`, `andes-input-password` and `andes-input-search` share: they render
 * the exact same template (`input.html`) and differ only in the handful of protected hooks
 * below, which the variants override. Kept abstract so the three public components stay
 * separate selectors without each one re-forwarding ~20 inputs and a second
 * ControlValueAccessor onto a wrapped `andes-input`.
 */
@Directive()
export abstract class AndesInputBase implements ControlValueAccessor {
  private readonly nativeInput = viewChild.required<
    HTMLInputElement,
    ElementRef<HTMLInputElement>
  >('nativeInput', { read: ElementRef });

  readonly value = model('');
  readonly size = input<AndesInputSize>('md');
  readonly variant = input<AndesInputVariant>('outlined');
  readonly status = input<AndesInputStatus | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly clearable = input(false, { transform: booleanAttribute });
  readonly showCount = input(false, { transform: booleanAttribute });
  readonly countFormatter = input<AndesInputCountFormatter | undefined>(
    undefined,
  );
  /**
   * A soft limit for the counter: going over it flags the field (and the counter) instead of
   * blocking input, unless `countExceedFormatter` is set. Falls back to `maxLength`.
   */
  readonly countMax = input<number | undefined, unknown>(undefined, {
    transform: optionalNumberAttribute,
  });
  /** How the counter (and `countMax`) measures the value; UTF-16 code units by default. */
  readonly countStrategy = input<AndesInputCountStrategy | undefined>(
    undefined,
  );
  /** Trims typed or pasted text that goes over `countMax` (or `maxLength`). */
  readonly countExceedFormatter = input<
    AndesInputCountExceedFormatter | undefined
  >(undefined);
  /** Replaces the clear button's default "x" icon. */
  readonly clearIcon = input<TemplateRef<unknown> | undefined>(undefined);
  /** The clear button's accessible name - translate it with the rest of the form. */
  readonly clearLabel = input('Clear');
  readonly addonBefore = input<string | undefined>(undefined);
  readonly addonAfter = input<string | undefined>(undefined);
  readonly placeholder = input<string | undefined>(undefined);
  readonly autocomplete = input<string | undefined>(undefined);
  readonly maxLength = input<number | undefined>(undefined);
  readonly id = input<string | undefined>(undefined);
  readonly name = input<string | undefined>(undefined);
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

  /** Enter pressed in the field (never mid-IME-composition). */
  readonly pressEnter = output<KeyboardEvent>();
  /** The clear button emptied the field. */
  readonly cleared = output<void>();
  /** The native input took focus (the same `FocusEvent` it received). */
  readonly focused = output<FocusEvent>();
  /** The native input lost focus (the same `FocusEvent` it received). */
  readonly blurred = output<FocusEvent>();

  private readonly disabledByForm = signal(false);

  protected readonly countId = `andes-input-count-${nextId++}`;

  /** The native `type` attribute - each variant decides it (plain type, password toggle, search). */
  protected abstract readonly nativeType: Signal<string>;
  /** `null` hides the password visibility toggle; otherwise whether the password is visible. */
  protected readonly passwordToggle: Signal<boolean | null> = signal(null);
  /** Custom content for the visibility toggle, given whether the password is visible. */
  protected readonly passwordToggleIcon: Signal<
    TemplateRef<AndesInputVisibilityIconContext> | undefined
  > = signal(undefined);
  /** The visibility toggle's `tabindex`. */
  protected readonly passwordToggleTabIndex: Signal<number> = signal(0);
  /** `null` hides the Search variant's attached button. */
  protected readonly searchButton: Signal<AndesInputSearchButtonState | null> =
    signal(null);
  /** Extra classes a variant adds to the field wrapper. */
  protected readonly variantClass: string | undefined = undefined;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  /**
   * `status="error"` is announced too (via `aria-invalid`), not just painted - and so is a
   * value past the soft `countMax`, which paints the error border and the counter red.
   */
  protected readonly isInvalid = computed(
    () =>
      this.ariaInvalid() || this.status() === 'error' || this.countExceeded(),
  );

  protected readonly showClear = computed(
    () =>
      this.clearable() &&
      this.value().length > 0 &&
      !this.isDisabled() &&
      !this.readOnly(),
  );

  // Without a strategy: UTF-16 code units, i.e. the same unit the native `maxlength` attribute
  // counts in - so the counter can never disagree with where the browser stops accepting input.
  protected readonly count = computed(() => this.measure(this.value()));

  /** The limit the counter and the exceeded state are measured against. */
  protected readonly countLimit = computed(
    () => this.countMax() ?? this.maxLength(),
  );

  protected readonly countText = computed(() => {
    const info: AndesInputCountInfo = {
      value: this.value(),
      count: this.count(),
      maxLength: this.countLimit(),
    };
    const formatter = this.countFormatter();
    if (formatter) {
      return formatter(info);
    }
    return info.maxLength == null
      ? `${info.count}`
      : `${info.count} / ${info.maxLength}`;
  });

  protected readonly countExceeded = computed(() => {
    const max = this.countLimit();
    return max != null && this.count() > max;
  });

  // The counter is wired into the input's accessible description so a screen reader reads
  // "3 / 20" on focus, appended after (never replacing) whatever the consumer described it by.
  protected readonly describedBy = computed(
    () =>
      [this.ariaDescribedby(), this.showCount() ? this.countId : undefined]
        .filter(Boolean)
        .join(' ') || null,
  );

  // The button's size class picks its icon/label style; input.css then sizes it from the field
  // (the row's height, font-size and radius), so it lines up whatever the button's own scale.
  protected readonly searchButtonSize = computed<AndesButtonSize>(() => {
    const size = this.size();
    const button = this.searchButton();
    if (button?.label || button?.content) {
      return size;
    }
    return size === 'md' ? 'icon' : `icon-${size}`;
  });

  protected readonly groupClasses = computed(() =>
    clsx(
      'andes-input-group',
      `andes-input-group--${this.size()}`,
      this.searchButton() && 'andes-input-group--search',
      this.isDisabled() && 'andes-input-group--disabled',
    ),
  );

  protected readonly wrapperClasses = computed(() =>
    clsx(
      'andes-input-wrapper',
      `andes-input-wrapper--${this.size()}`,
      `andes-input-wrapper--${this.variant()}`,
      // Includes going over `countMax`: it is a soft limit, so the error border, the red
      // counter and `aria-invalid` are what tell the user - typing is never blocked.
      this.isInvalid() && 'andes-input-wrapper--invalid',
      this.status() === 'warning' &&
        !this.isInvalid() &&
        'andes-input-wrapper--warning',
      this.isDisabled() && 'andes-input-wrapper--disabled',
      this.readOnly() && 'andes-input-wrapper--readonly',
      this.variantClass,
    ),
  );

  // Default no-op accessors until Angular Forms registers the real callbacks via
  // registerOnChange/registerOnTouched (never called at all outside a form directive).
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: string) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: string | null | undefined): void {
    this.value.set(value == null ? '' : String(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  /** Focuses the native input, optionally placing the caret (see `AndesInputFocusOptions`). */
  focus(options?: AndesInputFocusOptions): void {
    const element = this.nativeInput().nativeElement;
    element.focus({ preventScroll: options?.preventScroll });
    const end = element.value.length;
    try {
      switch (options?.cursor) {
        case 'start':
          element.setSelectionRange(0, 0);
          break;
        case 'end':
          element.setSelectionRange(end, end);
          break;
        case 'all':
          element.select();
          break;
      }
    } catch {
      // `email` and `number` inputs throw on setSelectionRange - focusing is all we can do.
    }
  }

  blur(): void {
    this.nativeInput().nativeElement.blur();
  }

  protected onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    // Mid-IME-composition text is provisional; it is trimmed once `compositionend` commits it.
    if ((event as InputEvent).isComposing) {
      this.updateValue(element.value);
      return;
    }
    this.updateValue(this.trimToLimit(element));
  }

  protected onCompositionEnd(event: CompositionEvent): void {
    this.updateValue(this.trimToLimit(event.target as HTMLInputElement));
  }

  protected onFocus(event: FocusEvent): void {
    this.focused.emit(event);
  }

  protected onBlur(event: FocusEvent): void {
    this.onTouched();
    this.blurred.emit(event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // `isComposing` - an Enter that commits an IME composition (e.g. Japanese/Chinese input)
    // is not the user submitting the field.
    if (event.key !== 'Enter' || event.isComposing) {
      return;
    }
    this.pressEnter.emit(event);
    this.onEnter(event);
  }

  protected onClearClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.updateValue('');
    this.cleared.emit();
    this.afterClear();
    this.nativeInput().nativeElement.focus();
  }

  // Keeps focus in the text field when the clear/visibility buttons are clicked with a mouse
  // (keyboard activation never fires mousedown, so keyboard users keep focus on the button).
  protected keepFocus(event: MouseEvent): void {
    event.preventDefault();
  }

  protected togglePasswordVisibility(): void {
    // Only the Password variant renders the toggle.
  }

  protected onSearchClick(event: Event): void {
    // Only the Search variant renders the button.
    void event;
  }

  /** Hook for variants that react to Enter beyond emitting `pressEnter` (Search). */
  protected onEnter(event: KeyboardEvent): void {
    void event;
  }

  /** Hook for variants that react to the field being cleared (Search). */
  protected afterClear(): void {
    // No-op by default.
  }

  private measure(value: string): number {
    const strategy = this.countStrategy();
    return strategy ? strategy(value) : value.length;
  }

  /**
   * Applies `countExceedFormatter` to an over-limit value, writing the trimmed text straight back
   * into the element: the `[value]` binding alone would not repaint it when the trimmed text
   * equals what it last rendered (typing past the limit again).
   */
  private trimToLimit(element: HTMLInputElement): string {
    const value = element.value;
    const formatter = this.countExceedFormatter();
    const max = this.countLimit();
    if (!formatter || max == null || this.measure(value) <= max) {
      return value;
    }
    const trimmed = formatter(value, { max });
    if (trimmed !== value) {
      const caret = Math.min(
        element.selectionStart ?? trimmed.length,
        trimmed.length,
      );
      element.value = trimmed;
      try {
        element.setSelectionRange(caret, caret);
      } catch {
        // `email` and `number` inputs have no selection API.
      }
    }
    return trimmed;
  }

  private updateValue(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }
}
