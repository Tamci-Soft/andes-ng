import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  linkedSignal,
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

  /**
   * Single source of truth for the rendered `checked` state. Seeded from, and kept live in
   * sync with, the `checked` input for plain/uncontrolled usage - but locally overridable (by
   * a click) between updates, the same "controlled input, locally-overridable state" shape as
   * AndesButton's loading/visibleLoading.
   *
   * Built with `linkedSignal` instead of a plain `signal()` mirrored by a constructor
   * `effect()`: a `linkedSignal` re-derives its value synchronously, as part of the normal
   * signal-consumer graph, the moment `checked()` actually transitions to a new value -
   * including transitioning back to a value it already held earlier (e.g. a parent
   * optimistically applying a click via `(checkedChange)` and then rolling it back to
   * `false` again once `checked()` has genuinely become `true` in between). A one-shot
   * `effect()` mirror is more fragile here: it re-runs on its own schedule rather than being
   * read synchronously off the same graph the template renders from, and is generally
   * discouraged by the Angular team for this kind of state derivation in favor of
   * `computed`/`linkedSignal`.
   *
   * Once this control is wired to Reactive or Template-driven forms (`writeValue` has been
   * called at least once), the form value takes over exclusively so the two APIs never fight
   * each other - the same `isFormControlled` guard AndesCheckbox uses for the identical
   * problem, adapted here to `linkedSignal`'s advanced (source + computation) form so the
   * guard is consulted on every re-derivation instead of only inside a one-shot effect.
   */
  protected readonly isChecked = linkedSignal<boolean, boolean>({
    source: this.checked,
    computation: (checked, previous) =>
      this.isFormControlled ? (previous?.value ?? checked) : checked,
  });

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

  private isFormControlled = false;
  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

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
    this.isFormControlled = true;
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
