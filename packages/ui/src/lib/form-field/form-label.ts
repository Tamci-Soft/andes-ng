import {
  ChangeDetectionStrategy,
  Component,
  inject,
  ViewEncapsulation,
} from '@angular/core';

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
  styleUrl: './form-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `.andes-form-label` lives in this component's template but the stylesheet is owned by
  // `AndesFormField`; see the header comment in form-field.css for why the shared sheet is
  // unscoped rather than split per part.
  encapsulation: ViewEncapsulation.None,
})
export class AndesFormLabel {
  protected readonly field = inject(ANDES_FORM_FIELD, { optional: true });
}
