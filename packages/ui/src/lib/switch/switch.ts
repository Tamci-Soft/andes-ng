import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
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
  /**
   * The rendered `checked` state, and the single source of truth for it - a `model()` rather
   * than an `input()`. A click writes straight into this signal (`this.checked.set(next)`), the
   * same signal a `[checked]`/`[(checked)]`-bound parent reads and writes, via the
   * `checkedChange` output `model()` generates for it. There is no separate internal signal
   * that mirrors or derives from `checked` (previously a `linkedSignal`), so there is nothing
   * left for it to silently diverge from.
   *
   * `model()` does not support the `transform` option that `input()` does, so a bare boolean
   * attribute (`<andes-switch checked>`, no brackets) is no longer coerced through
   * `booleanAttribute` - callers should use a property binding (`[checked]="true"`) instead.
   */
  readonly checked = model(false);
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

  private readonly formDisabled = signal(false);

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

  protected onClick(): void {
    if (this.isDisabled() || this.readonly()) {
      return;
    }

    const next = !this.checked();
    // Writes straight into the model signal - the same signal a `[checked]`/`[(checked)]`-bound
    // parent reads, and `model()` auto-emits `checkedChange` for us, so there's no separate
    // `.emit()` call here (that would double-fire the event).
    this.checked.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.checked.set(!!value);
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
