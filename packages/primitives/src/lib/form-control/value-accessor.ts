import {
  computed,
  DestroyRef,
  inject,
  signal,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

import { AndesControlStatus, injectAndesControlStatus } from './control-status';

/** What `AndesValueAccessor` needs to know about the component it serves. */
export interface AndesValueAccessorOptions<T> {
  /**
   * The signal that holds the control's value: usually the component's `model()`, but any
   * writable signal works, including a `linkedSignal`. The accessor writes to it for both
   * user commits and form writes, so there is one source of truth to render from.
   */
  readonly value: WritableSignal<T>;
  /**
   * The component's own `disabled` input. It is merged with the disabled state Angular forms
   * pushes in, so either side can disable the control, as with a native `<fieldset>`.
   */
  readonly disabled?: Signal<boolean>;
  /**
   * Decides whether a commit actually changes the value. A commit that does not is dropped,
   * so re-picking the selected option never marks the control dirty. Defaults to `Object.is`;
   * array and object values need their own comparison (see {@link andesShallowArrayEquals}).
   */
  readonly equals?: (previous: T, next: T) => boolean;
  /**
   * What a form's `null` / `undefined` (a `reset()`, an unset model) means for this control,
   * for example `''` for text or `[]` for a multi-select. Treated as immutable. Ignored when
   * `coerce` is given.
   */
  readonly emptyValue?: T;
  /**
   * Turns whatever a form writes into a value of type `T`, e.g. `String(value)` or clamping a
   * number. Takes precedence over `emptyValue`.
   */
  readonly coerce?: (raw: unknown) => T;
  /**
   * Runs after a form wrote a value, for state derived from it that is not itself the value:
   * the text shown in a field, a discarded draft. It runs on writes only, never on commits,
   * and nothing it does is reported back to the form.
   */
  readonly onWrite?: (value: T) => void;
  /** Runs each time the control is marked touched, so a component can surface it as an output. */
  readonly onTouch?: () => void;
}

/** A no-op that stands in for the callbacks Angular forms registers later. */
function noop(): void {
  // Intentionally empty: a component outside any form has nobody to notify.
}

/**
 * Shallow, order-sensitive equality for array values, treating `null` / `undefined` as the
 * empty array. Pass it as `equals` for multi-value controls so that committing an array with
 * the same items does not count as a change.
 */
export function andesShallowArrayEquals<T>(
  previous: readonly T[] | null | undefined,
  next: readonly T[] | null | undefined,
): boolean {
  if (previous === next) {
    return true;
  }
  const a = previous ?? [];
  const b = next ?? [];
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * The `ControlValueAccessor` plumbing every value-holding component re-implements, as one
 * object a component owns rather than inherits. Use it directly when the value signal is not
 * called `value` or the component already extends another class; extend
 * {@link AndesFormControlBase} when it is.
 *
 * It encodes the contract the duplicated code kept getting subtly wrong:
 *
 * - `commit()` sets the signal and tells the form, once, and only if the value changed;
 * - `writeValue()` sets the signal but never tells the form back, so `setValue()` /
 *   `reset()` cannot loop;
 * - `disabled` is the component's input OR the form's state, whichever says so;
 * - `markTouched()` is forwarded every time, because `updateOn: 'blur'` controls only
 *   publish their pending value from that call.
 *
 * Must be created in an injection context. After the component is destroyed it stops
 * notifying the form.
 *
 * ```ts
 * @Component({
 *   selector: 'andes-switch',
 *   providers: [provideAndesValueAccessor(() => AndesSwitch, (self) => self.accessor)],
 * })
 * class AndesSwitch {
 *   readonly checked = model(false);
 *   readonly disabled = input(false, { transform: booleanAttribute });
 *   readonly accessor = new AndesValueAccessor({
 *     value: this.checked,
 *     disabled: this.disabled,
 *     coerce: Boolean,
 *   });
 *
 *   protected toggle(): void {
 *     this.accessor.commit(!this.checked());
 *   }
 * }
 * ```
 */
export class AndesValueAccessor<T> implements ControlValueAccessor {
  private readonly options: AndesValueAccessorOptions<T>;
  private onChange: (value: T) => void = noop;
  private onTouched: () => void = noop;
  private destroyed = false;

  private readonly disabledByForm = signal(false);
  private readonly registrations = signal(0);

  /** The component's value signal, as passed in. */
  readonly value: WritableSignal<T>;

  /** The component's own `disabled` input OR'd with the state Angular forms pushed in. */
  readonly disabled: Signal<boolean>;

  /** The validation state of the bound forms control; see {@link AndesControlStatus}. */
  readonly status: AndesControlStatus;

  constructor(options: AndesValueAccessorOptions<T>) {
    this.options = options;
    this.value = options.value;
    this.disabled = computed(
      () => (options.disabled?.() ?? false) || this.disabledByForm(),
    );
    this.status = injectAndesControlStatus({ rebindOn: this.registrations });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.onChange = noop;
      this.onTouched = noop;
    });
  }

  /**
   * Applies a value chosen by the user: updates the signal and notifies Angular forms,
   * exactly once. Returns `false`, doing nothing, when `value` equals the current one.
   *
   * It does not look at `disabled`: the component decides whether an interaction may happen
   * at all, because only it knows which interactions count (a disabled control may still
   * scroll or expand).
   */
  commit(value: T): boolean {
    const equals = this.options.equals ?? Object.is;
    if (equals(untracked(this.value), value)) {
      return false;
    }
    this.value.set(value);
    this.onChange(value);
    return true;
  }

  /**
   * Tells Angular forms the user has left the control. Call it on blur, and when an
   * interaction ends without a blur (a popup closing). Safe to call repeatedly.
   */
  markTouched(): void {
    // A blur fired by the element being removed must not reach an output that is gone.
    if (this.destroyed) {
      return;
    }
    this.onTouched();
    this.options.onTouch?.();
  }

  /**
   * Called by Angular forms to put a value into the control. Updates the signal and runs
   * `onWrite`, and never reports back to the form.
   */
  writeValue(raw: unknown): void {
    const { coerce, emptyValue, onWrite } = this.options;
    let next: T;
    if (coerce) {
      next = coerce(raw);
    } else if (raw === null || raw === undefined) {
      next = emptyValue === undefined ? (raw as T) : emptyValue;
    } else {
      next = raw as T;
    }
    this.value.set(next);
    onWrite?.(next);
  }

  /** Called by Angular forms to receive value changes made by the user. */
  registerOnChange(fn: (value: T) => void): void {
    this.onChange = this.destroyed ? noop : fn;
    this.registrations.update((count) => count + 1);
  }

  /** Called by Angular forms to receive the touched notification. */
  registerOnTouched(fn: () => void): void {
    this.onTouched = this.destroyed ? noop : fn;
  }

  /** Called by Angular forms when the bound control is enabled or disabled. */
  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }
}
