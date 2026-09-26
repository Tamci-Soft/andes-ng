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
  viewChild,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import clsx from 'clsx';

import type { AndesButtonSize } from '../button/button';

export type AndesInputSize = 'sm' | 'md' | 'lg';
export type AndesInputVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';
export type AndesInputStatus = 'error' | 'warning';

/** What `countFormatter` receives - the same shape as Ant Design's `showCount.formatter`. */
export interface AndesInputCountInfo {
  value: string;
  count: number;
  maxLength: number | undefined;
}

export type AndesInputCountFormatter = (info: AndesInputCountInfo) => string;

/** `cursor` mirrors Ant Design's `focus({ cursor })` option. */
export interface AndesInputFocusOptions extends FocusOptions {
  cursor?: 'start' | 'end' | 'all';
}

/** State the shared template needs to draw the Search variant's attached button. */
export interface AndesInputSearchButtonState {
  label: string | undefined;
  primary: boolean;
  loading: boolean;
}

// Module-level rather than per-class so ids stay unique across every Input variant rendered on
// the same page (they all share one template and so one id scheme).
let nextId = 0;

/**
 * Everything `andes-input`, `andes-input-password` and `andes-input-search` share: they render
 * the exact same template (`input.html`) and differ only in the handful of protected hooks
 * below, which the variants override. Kept abstract so the three public components stay
 * separate selectors - mirroring Ant Design's `Input` / `Input.Password` / `Input.Search` -
 * without each one re-forwarding ~20 inputs and a second ControlValueAccessor onto a wrapped
 * `andes-input`.
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

  /** Enter pressed in the field (never mid-IME-composition) - Ant Design's `onPressEnter`. */
  readonly pressEnter = output<KeyboardEvent>();
  /** The clear button emptied the field - Ant Design's `onClear`. */
  readonly cleared = output<void>();

  private readonly disabledByForm = signal(false);

  protected readonly countId = `andes-input-count-${nextId++}`;

  /** The native `type` attribute - each variant decides it (plain type, password toggle, search). */
  protected abstract readonly nativeType: Signal<string>;
  /** `null` hides the password visibility toggle; otherwise whether the password is visible. */
  protected readonly passwordToggle: Signal<boolean | null> = signal(null);
  /** `null` hides the Search variant's attached button. */
  protected readonly searchButton: Signal<AndesInputSearchButtonState | null> =
    signal(null);
  /** Extra classes a variant adds to the field wrapper. */
  protected readonly variantClass: string | undefined = undefined;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  /** `status="error"` is announced too, not just painted - unlike Ant, which leaves that to you. */
  protected readonly isInvalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );

  protected readonly showClear = computed(
    () =>
      this.clearable() &&
      this.value().length > 0 &&
      !this.isDisabled() &&
      !this.readOnly(),
  );

  // UTF-16 code units, i.e. the same unit the native `maxlength` attribute counts in - so the
  // counter can never disagree with where the browser actually stops accepting input.
  protected readonly count = computed(() => this.value().length);

  protected readonly countText = computed(() => {
    const info: AndesInputCountInfo = {
      value: this.value(),
      count: this.count(),
      maxLength: this.maxLength(),
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
    const max = this.maxLength();
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

  // Matches the field's own height: sm/md/lg buttons are the same 2/2.5/3rem as the input sizes.
  protected readonly searchButtonSize = computed<AndesButtonSize>(() => {
    const size = this.size();
    if (this.searchButton()?.label) {
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
      this.isInvalid() && 'andes-input-wrapper--invalid',
      this.status() === 'warning' &&
        !this.isInvalid() &&
        'andes-input-wrapper--warning',
      this.isDisabled() && 'andes-input-wrapper--disabled',
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

  /** Focuses the native input, optionally placing the caret (Ant Design's `focus({ cursor })`). */
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
    this.updateValue((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    this.onTouched();
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

  private updateValue(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }
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
