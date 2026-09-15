import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
} from '@angular/core';

import { ANDES_FORM_ERROR, ANDES_FORM_FIELD } from './form-field-tokens';

/**
 * Validation error message for the control inside an `AndesFormField`. Only rendered once
 * the registered control is `invalid && (touched || dirty)` - the idiomatic Angular "don't
 * show errors before the user has interacted with the field" pattern - never as soon as an
 * untouched required field happens to be empty.
 *
 * Rendered with `role="alert"` so assistive technology announces the message the moment it
 * appears, since screen-reader announcement of validation errors is explicitly flagged as
 * undocumented/unaddressed upstream in both shadcn/RHF and Ant Design's own guides (see
 * `docs/research/components/form.md`, section 6) - andes-ng makes it an explicit, tested
 * behavior instead of leaving it to each consumer to wire up.
 */
@Component({
  selector: 'andes-form-error',
  imports: [],
  template: `@if (visible()) {
    <p class="andes-form-error" [id]="field?.errorId() ?? null" role="alert">
      <ng-content />
    </p>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ANDES_FORM_ERROR,
      useExisting: forwardRef(() => AndesFormError),
    },
  ],
})
export class AndesFormError {
  protected readonly field = inject(ANDES_FORM_FIELD, { optional: true });

  protected readonly visible = computed(() => this.field?.showError() ?? false);
}
