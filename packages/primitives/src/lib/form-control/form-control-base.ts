import {
  booleanAttribute,
  Directive,
  input,
  model,
  output,
  Signal,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

import { AndesControlStatus } from './control-status';
import { AndesValueAccessor } from './value-accessor';

/**
 * Base class for a component whose state is a single `value` and that should work with every
 * kind of Angular form. It owns the `value` model, the `disabled` input, the
 * `ControlValueAccessor` methods and the status of the bound control, so a subclass only
 * renders the value and calls {@link commit} when the user changes it.
 *
 * ```ts
 * @Component({
 *   selector: 'andes-rating',
 *   providers: [provideAndesValueAccessor(() => AndesRating)],
 * })
 * class AndesRating extends AndesFormControlBase<number> {
 *   protected emptyValue(): number {
 *     return 0;
 *   }
 *   protected pick(stars: number): void {
 *     this.commit(stars);
 *   }
 * }
 * ```
 *
 * The class also satisfies signal forms' custom-control contract (`value` model, `disabled`
 * input, `touch` output). A subclass that omits `provideAndesValueAccessor` therefore binds
 * to `[formField]` natively and is simply not usable with reactive or template-driven forms;
 * one that provides it works with all of them, signal forms going through the accessor.
 *
 * It declares the `value` and `disabled` members itself, so a component whose value signal
 * has another name (`checked`, `pressed`) uses {@link AndesValueAccessor} directly instead.
 */
@Directive()
export abstract class AndesFormControlBase<T> implements ControlValueAccessor {
  /**
   * The control's value. A `model()`, so `[(value)]` works beside any forms binding and a
   * user's pick and a form's write land in the same signal. Note that this means
   * `valueChange` also fires when a form writes a different value; `commit()` is what tells
   * the form about changes made by the user.
   */
  readonly value = model<T>(this.emptyValue());

  /** Disables the control. A disabled state pushed by Angular forms disables it as well. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Fires each time the user leaves the control. It is the touched signal of signal forms'
   * custom-control contract; reactive and template-driven forms are told through their
   * accessor callback instead.
   */
  readonly touch = output<void>();

  private readonly accessor: AndesValueAccessor<T>;

  /** `disabled` merged with the disabled state of the bound form control. */
  protected readonly isDisabled: Signal<boolean>;

  /** The validation state of the bound form control; see {@link AndesControlStatus}. */
  protected readonly status: AndesControlStatus;

  constructor() {
    this.accessor = new AndesValueAccessor<T>({
      value: this.value,
      disabled: this.disabled,
      coerce: (raw) => this.coerce(raw),
      equals: (previous, next) => this.equals(previous, next),
      onWrite: (written) => this.onWritten(written),
      onTouch: () => this.touch.emit(),
    });
    this.isDisabled = this.accessor.disabled;
    this.status = this.accessor.status;
  }

  /**
   * What the control holds before a form writes anything, and what a form's `null` /
   * `undefined` (a `reset()`) means: `''` for text, `[]` for a multi-select. A method rather
   * than a constant so that every control gets its own array or object. It runs while the
   * base class is being constructed, so it must not read the subclass's own fields.
   */
  protected abstract emptyValue(): T;

  /**
   * Applies a value chosen by the user and notifies Angular forms exactly once. Does nothing,
   * and returns `false`, when {@link equals} says nothing changed.
   */
  protected commit(value: T): boolean {
    return this.accessor.commit(value);
  }

  /** Reports that the user left the control. Call it on blur. */
  protected markTouched(): void {
    this.accessor.markTouched();
  }

  /**
   * Turns what a form writes into a `T`. By default `null` / `undefined` become the empty
   * value and everything else passes through unchanged. Override
   * it to normalize (`String(raw)`, clamping) or to make the empty value depend on inputs.
   */
  protected coerce(raw: unknown): T {
    return raw === null || raw === undefined ? this.emptyValue() : (raw as T);
  }

  /**
   * Whether two values are the same for the purpose of {@link commit}. `Object.is` by
   * default; override it for array and object values.
   */
  protected equals(previous: T, next: T): boolean {
    return Object.is(previous, next);
  }

  /**
   * Called after a form wrote a value, to refresh state derived from it. Never reported back
   * to the form.
   */
  protected onWritten(value: T): void {
    void value;
  }

  /** Called by Angular forms to write a value into the control; never echoes back. */
  writeValue(raw: unknown): void {
    this.accessor.writeValue(raw);
  }

  /** Called by Angular forms to receive value changes made by the user. */
  registerOnChange(fn: (value: T) => void): void {
    this.accessor.registerOnChange(fn);
  }

  /** Called by Angular forms to receive the touched notification. */
  registerOnTouched(fn: () => void): void {
    this.accessor.registerOnTouched(fn);
  }

  /** Called by Angular forms when the bound control is enabled or disabled. */
  setDisabledState(isDisabled: boolean): void {
    this.accessor.setDisabledState(isDisabled);
  }
}
