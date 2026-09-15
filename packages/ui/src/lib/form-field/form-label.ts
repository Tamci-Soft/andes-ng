import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ANDES_FORM_FIELD } from './form-field-tokens';

/**
 * Label for the control inside an `AndesFormField`. Renders a real `<label for="...">`
 * associated to the control via native HTML semantics (matching both shadcn's and Ant's
 * documented approach), using the id the enclosing `AndesFormField` generated - no manual
 * id coordination required.
 *
 * Renders as a plain, unassociated `<label>` when used outside an `AndesFormField` (`for`
 * is simply omitted).
 */
@Component({
  selector: 'andes-form-label',
  imports: [],
  template: `<label
    class="andes-form-label"
    [attr.for]="field?.controlId() ?? null"
  >
    <ng-content />
  </label>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesFormLabel {
  protected readonly field = inject(ANDES_FORM_FIELD, { optional: true });
}
