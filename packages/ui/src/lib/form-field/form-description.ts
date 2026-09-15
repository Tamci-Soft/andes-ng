import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
} from '@angular/core';

import { ANDES_FORM_DESCRIPTION, ANDES_FORM_FIELD } from './form-field-tokens';

/**
 * Static help text for the control inside an `AndesFormField`, always visible (unlike
 * `AndesFormError`). Registers its id with the enclosing field so it gets folded into the
 * control's `aria-describedby` automatically.
 */
@Component({
  selector: 'andes-form-description',
  imports: [],
  template: `<p
    class="andes-form-description"
    [id]="field?.descriptionId() ?? null"
  >
    <ng-content />
  </p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ANDES_FORM_DESCRIPTION,
      useExisting: forwardRef(() => AndesFormDescription),
    },
  ],
})
export class AndesFormDescription {
  protected readonly field = inject(ANDES_FORM_FIELD, { optional: true });
}
