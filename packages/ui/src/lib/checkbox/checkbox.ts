import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'andes-checkbox',
  imports: [],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Forwarded to the native input in the template instead - a screen reader never sees
    // this non-interactive host element, so leaving these here would do nothing (see the
    // same convention in AndesButton).
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesCheckbox),
      multi: true,
    },
  ],
})
export class AndesCheckbox implements ControlValueAccessor {
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  /**
   * Prevents toggling without visually disabling the control - distinct from `disabled`:
   * a read-only checkbox stays focusable and keeps its normal (non-dimmed) appearance, it
   * just can't be changed. Matches shadcn/ui's Base UI-backed `Checkbox`'s `readOnly` prop.
   * Native `<input type="checkbox">` ignores the HTML `readonly` attribute entirely (the
   * platform only honors it on text-like inputs), so this is enforced by preventing the
   * `click` that would otherwise toggle it - the same technique `AndesButtonPrimitive` uses
   * to block navigation on a disabled anchor.
   */
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly value = input<string | undefined>(undefined);
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

  /**
   * Emits the new checked value on every user interaction (click or keyboard). Lets
   * `[checked]` be used as a plain, uncontrolled-style two-way pairing
   * (`[checked]="isChecked()" (checkedChange)="isChecked.set($event)"`) for consumers who
   * aren't wiring this control into Reactive/Template-driven forms.
   */
  readonly checkedChange = output<boolean>();

  /**
   * Emits `false` when the user interacts with an indeterminate checkbox. The native
   * `indeterminate` DOM property is cleared by the browser itself as soon as the user
   * toggles the control (see the class-level comment on `indeterminateState` below) - this
   * output lets a consumer keep its own bound `indeterminate` signal in sync with that.
   */
  readonly indeterminateChange = output<boolean>();

  /**
   * Single source of truth for the rendered `checked` state. Seeded from, and kept live in
   * sync with, the `checked` input for plain/uncontrolled usage - but once this control is
   * wired to Reactive or Template-driven forms (`writeValue` has been called at least once),
   * the form value takes over exclusively so the two APIs never fight each other. This
   * mirrors the well-established `mat-checkbox` convention: don't combine the `checked`
   * input with `[formControl]`/`[(ngModel)]` on the same element - pick one.
   */
  protected readonly checkedState = signal(false);

  /**
   * Single source of truth for the native `indeterminate` DOM PROPERTY (not an HTML
   * attribute - `[attr.indeterminate]` is a no-op on a native checkbox, see checkbox.html).
   * Kept in sync with the `indeterminate` input, but a user click also writes to it directly
   * (see `onNativeChange`): a native checkbox's `indeterminate` property is automatically
   * reset to `false` by the browser the moment the user interacts with it, and we mirror
   * that back into our own state instead of fighting the browser on the next render.
   */
  protected readonly indeterminateState = signal(false);

  private readonly formDisabled = signal(false);
  protected readonly isDisabled = signal(false);

  private isFormControlled = false;
  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      const disabled = this.disabled();
      const formDisabled = this.formDisabled();
      this.isDisabled.set(disabled || formDisabled);
    });

    effect(() => {
      const checked = this.checked();
      if (!this.isFormControlled) {
        this.checkedState.set(checked);
      }
    });

    effect(() => {
      this.indeterminateState.set(this.indeterminate());
    });
  }

  protected onNativeClick(event: MouseEvent): void {
    if (this.readOnly()) {
      event.preventDefault();
    }
  }

  protected onNativeChange(event: Event): void {
    const nativeInput = event.target as HTMLInputElement;
    const wasIndeterminate = this.indeterminateState();

    this.checkedState.set(nativeInput.checked);
    // The browser already cleared the DOM property on this same interaction - mirror it
    // into our own state rather than letting the next render fight the user's click.
    this.indeterminateState.set(nativeInput.indeterminate);

    this.onChange(nativeInput.checked);
    this.checkedChange.emit(nativeInput.checked);

    if (wasIndeterminate && !nativeInput.indeterminate) {
      this.indeterminateChange.emit(false);
    }
  }

  protected onNativeBlur(): void {
    this.onTouched();
  }

  writeValue(value: boolean | null): void {
    this.isFormControlled = true;
    this.checkedState.set(!!value);
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
