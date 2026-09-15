import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';

import { ANDES_FORM_FIELD, ANDES_FORM_LABEL } from './form-field-tokens';

/**
 * Label for the control inside an `AndesFormField`. Renders a real `<label for="...">`
 * associated to the control via native HTML semantics (matching both shadcn's and Ant's
 * documented approach), using the id the enclosing `AndesFormField` generated - no manual
 * id coordination required.
 *
 * The `<label>` also carries an id of its own (`AndesFormField.labelId()`). That is what makes
 * `aria-labelledby` association possible for wrapper components that expose no `id` input of
 * their own (`AndesSelect`, `AndesCheckbox`, `AndesSwitch`, `AndesRadioGroup`, `AndesSlider`),
 * where `for`/`id` cannot work - see `AndesFormControl`'s class comment. It is registered with
 * the field through `ANDES_FORM_LABEL` so the field only ever advertises that id
 * (`labelledBy()`) when a label was actually authored.
 *
 * Renders as a plain, unassociated `<label>` when used outside an `AndesFormField` (`for` and
 * `id` are simply omitted).
 */
@Component({
  selector: 'andes-form-label',
  imports: [],
  template: `<label
    class="andes-form-label"
    [attr.id]="field?.labelId() ?? null"
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
  providers: [
    {
      provide: ANDES_FORM_LABEL,
      useExisting: forwardRef(() => AndesFormLabel),
    },
  ],
})
export class AndesFormLabel {
  protected readonly field = inject(ANDES_FORM_FIELD, { optional: true });
}
