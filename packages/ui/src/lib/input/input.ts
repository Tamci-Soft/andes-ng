import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

export type AndesInputType =
  'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
export type AndesInputSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'andes-input',
  imports: [],
  templateUrl: './input.html',
  styleUrl: './input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesInput),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real <input> in the template instead - a screen reader never sees
    // this non-interactive host element, and a static attribute here would otherwise be
    // left behind on both elements at once (same rationale as AndesButton).
    '[attr.id]': 'null',
    '[attr.name]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesInput implements ControlValueAccessor {
  private readonly nativeInput = viewChild.required<
    HTMLInputElement,
    ElementRef<HTMLInputElement>
  >('nativeInput', { read: ElementRef });

  readonly type = input<AndesInputType>('text');
  readonly size = input<AndesInputSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly clearable = input(false, { transform: booleanAttribute });
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

  protected readonly value = signal('');
  private readonly disabledByForm = signal(false);

  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  protected readonly showClear = computed(
    () =>
      this.clearable() &&
      this.value().length > 0 &&
      !this.isDisabled() &&
      !this.readOnly(),
  );

  protected readonly wrapperClasses = computed(() =>
    clsx(
      'andes-input-wrapper',
      `andes-input-wrapper--${this.size()}`,
      this.ariaInvalid() && 'andes-input-wrapper--invalid',
      this.isDisabled() && 'andes-input-wrapper--disabled',
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

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected clear(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.value.set('');
    this.onChange('');
    this.nativeInput().nativeElement.focus();
  }
}
