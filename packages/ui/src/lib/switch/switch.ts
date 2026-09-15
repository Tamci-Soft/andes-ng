import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

export type AndesSwitchSize = 'sm' | 'md';

@Component({
  selector: 'andes-switch',
  imports: [],
  templateUrl: './switch.html',
  styleUrl: './switch.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesSwitch),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real button in the template instead - a screen reader never sees
    // this non-interactive host element, so leaving these here would do nothing. Same
    // class of bug already found and fixed in AndesButton.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesSwitch implements ControlValueAccessor {
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly size = input<AndesSwitchSize>('md');
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

  readonly checkedChange = output<boolean>();

  private readonly formDisabled = signal(false);
  protected readonly isChecked = signal(false);

  protected readonly isDisabled = computed(
    () => this.disabled() || this.formDisabled(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-switch',
      `andes-switch--${this.size()}`,
      this.ariaInvalid() && 'andes-switch--invalid',
    ),
  );

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    // One-way sync from the `checked` input into the internal signal that actually drives
    // rendering and can also be mutated locally (by a click or by writeValue) - the same
    // "controlled input, locally-overridable state" shape as AndesButton's loading/visibleLoading.
    effect(() => {
      this.isChecked.set(this.checked());
    });
  }

  protected onClick(): void {
    if (this.isDisabled() || this.readonly()) {
      return;
    }

    const next = !this.isChecked();
    this.isChecked.set(next);
    this.onChange(next);
    this.checkedChange.emit(next);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.isChecked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
