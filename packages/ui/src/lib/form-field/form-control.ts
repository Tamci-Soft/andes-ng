import {
  computed,
  DestroyRef,
  Directive,
  forwardRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NgControl } from '@angular/forms';

import { ANDES_FORM_CONTROL, ANDES_FORM_FIELD } from './form-field-tokens';

/**
 * Applied on the actual form control element - a native `<input>`/`<select>`/`<textarea>`,
 * or one of this library's own `ControlValueAccessor` components (e.g. `AndesInput`) -
 * alongside `formControlName`, `[formControl]` or `[(ngModel)]` on that same element.
 *
 * Reads the bound control's status through Angular's own `NgControl` (whichever host
 * directive registered it - `FormControlName`, `FormControlDirective` or `NgModel`), so it
 * works identically regardless of which of the three the consumer used. Exposes the
 * idiomatic "show error only after interaction" predicate (`invalid && (touched || dirty)`)
 * as `showError`, and - when nested inside an `AndesFormField` - automatically reflects
 * `id`/`aria-describedby`/`aria-invalid` onto the element it's applied to.
 *
 * That automatic attribute wiring is exact and complete for native elements, because the
 * directive's host bindings apply directly to the same DOM node the directive sits on. It
 * cannot reach *inside* a wrapper component's own template (e.g. `AndesInput` renders its
 * own internal `<input>`) - Angular has no mechanism for one directive's host bindings to
 * feed another co-located component's `@Input()`s, only bindings authored in a template can
 * do that. For those wrapper components, additionally bind `AndesFormField`'s exported
 * `controlId()` / `showError()` and this directive's own `describedBy()` onto the
 * component's own `id` / `aria-invalid` / `aria-describedby` inputs directly (see the
 * form-field Storybook docs).
 */
@Directive({
  selector: '[andesFormControl]',
  exportAs: 'andesFormControl',
  providers: [
    {
      provide: ANDES_FORM_CONTROL,
      useExisting: forwardRef(() => AndesFormControl),
    },
  ],
  host: {
    '[attr.id]': 'resolvedId()',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-invalid]': 'showError() ? "true" : null',
  },
})
export class AndesFormControl implements OnInit {
  private readonly ngControl = inject(NgControl, {
    optional: true,
    self: true,
  });
  private readonly field = inject(ANDES_FORM_FIELD, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  protected readonly invalid = signal(false);
  protected readonly touched = signal(false);
  protected readonly dirty = signal(false);

  /** `control.invalid && (control.touched || control.dirty)` - Angular's idiomatic
   *  "don't yell at the user before they've interacted with the field" rule. Drives both
   *  this control's own `aria-invalid` and the enclosing field's error visibility. */
  readonly showError = computed(
    () => this.invalid() && (this.touched() || this.dirty()),
  );

  readonly resolvedId = computed(() => this.field?.controlId() ?? null);

  readonly describedBy = computed(() => this.field?.describedBy() ?? null);

  ngOnInit(): void {
    // NgControl.control is only populated once the host directive (FormControlName/
    // FormControlDirective/NgModel) has processed its own inputs, which for a directive
    // co-located on the same element happens after every constructor on that element has
    // already run - so this has to live in ngOnInit, not the constructor.
    const control = this.ngControl?.control;
    if (!control) {
      // No NgControl on this element (e.g. the directive was applied without
      // formControlName/[formControl]/ngModel) - there's no validity state to read, so the
      // control is simply never reported as invalid.
      return;
    }

    this.syncFromControl(control);
    control.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncFromControl(control));
  }

  private syncFromControl(control: AbstractControl): void {
    this.invalid.set(control.invalid);
    this.touched.set(control.touched);
    this.dirty.set(control.dirty);
  }
}
