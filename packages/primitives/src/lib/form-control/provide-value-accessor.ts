import { forwardRef, inject, Provider, Type } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Registers a component as the `ControlValueAccessor` of the forms directive on its element,
 * replacing the `{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(...), multi: true }`
 * block each component repeated. The component is passed as a thunk so the class can be
 * referenced from its own decorator, which is what the `forwardRef` was for.
 *
 * With only the component, the component itself must implement `ControlValueAccessor`
 * (extending `AndesFormControlBase` does). Pass `select` to register a different object, such
 * as an `AndesValueAccessor` the component owns, so the component's public API does not grow
 * `writeValue` and friends.
 *
 * Because a value accessor is registered, signal forms' `[formField]` binds through it too,
 * so one provider covers `formControl`, `formControlName`, `ngModel` and `[formField]`.
 *
 * ```ts
 * @Component({
 *   selector: 'andes-rating',
 *   providers: [provideAndesValueAccessor(() => AndesRating)],
 * })
 * class AndesRating extends AndesFormControlBase<number> { ... }
 * ```
 */
export function provideAndesValueAccessor<C extends ControlValueAccessor>(
  component: () => Type<C>,
): Provider;
export function provideAndesValueAccessor<C>(
  component: () => Type<C>,
  select: (instance: C) => ControlValueAccessor,
): Provider;
export function provideAndesValueAccessor<C>(
  component: () => Type<C>,
  select?: (instance: C) => ControlValueAccessor,
): Provider {
  if (!select) {
    return {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(component),
      multi: true,
    };
  }
  return {
    provide: NG_VALUE_ACCESSOR,
    useFactory: () => select(inject(component())),
    multi: true,
  };
}
