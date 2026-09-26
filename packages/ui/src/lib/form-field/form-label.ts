import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { ANDES_FORM_FIELD, ANDES_FORM_LABEL } from './form-field-tokens';

/**
 * Label for the control inside an `AndesFormField`. Renders a real `<label for="...">`
 * associated to the control via native HTML semantics (matching shadcn's documented
 * approach), using the id the enclosing `AndesFormField` generated - no manual
 * id coordination required.
 *
 * The `<label>` also carries an id of its own (`AndesFormField.labelId()`). That is what makes
 * `aria-labelledby` association possible for wrapper components that expose no `id` input of
 * their own (`AndesSelect`, `AndesCheckbox`, `AndesSwitch`, `AndesRadioGroup`, `AndesSlider`),
 * where `for`/`id` cannot work - see `AndesFormControl`'s class comment. It is registered with
 * the field through `ANDES_FORM_LABEL` so the field only ever advertises that id
 * (`labelledBy()`) when a label was actually authored.
 *
 * Decorations, all resolved by the enclosing field (and its `AndesForm`):
 * - required mark - a leading `*`, `aria-hidden` because `aria-required` on the control
 *   already says it to assistive technology; or, with `requiredMark="optional"`, a visible
 *   "(optional)" suffix on the fields that are NOT required.
 * - `tooltip` - an info button after the `<label>` with a `role="tooltip"` bubble, shown on
 *   hover/focus and dismissed with Escape. It sits *outside* the `<label>` so its accessible
 *   name never gets folded into the control's.
 * - colon - `horizontal` layout only, `aria-hidden`.
 *
 * Renders as a plain, unassociated `<label>` when used outside an `AndesFormField` (`for` and
 * `id` are simply omitted, and there are no decorations).
 */
@Component({
  selector: 'andes-form-label',
  imports: [],
  template: `<label
      class="andes-form-label"
      [attr.id]="field?.labelId() ?? null"
      [attr.for]="field?.controlId() ?? null"
    >
      @if (field?.showRequiredMark()) {
        <span class="andes-form-label__required" aria-hidden="true">*</span>
      }
      <ng-content />
      @if (field?.showOptionalMark()) {
        <span class="andes-form-label__optional">{{
          field.optionalText()
        }}</span>
      }
    </label>
    @if (field?.tooltip(); as tooltip) {
      <span
        class="andes-form-label__tooltip"
        (mouseenter)="tooltipOpen.set(true)"
        (mouseleave)="tooltipOpen.set(false)"
      >
        <button
          type="button"
          class="andes-form-label__tooltip-trigger"
          [attr.aria-label]="field.tooltipLabel()"
          [attr.aria-describedby]="field.tooltipId()"
          (focus)="tooltipOpen.set(true)"
          (blur)="tooltipOpen.set(false)"
          (keydown.escape)="tooltipOpen.set(false)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
        <span
          class="andes-form-label__tooltip-content"
          role="tooltip"
          [attr.id]="field.tooltipId()"
          [hidden]="!tooltipOpen()"
          >{{ tooltip }}</span
        >
      </span>
    }
    @if (field?.showColon()) {
      <span class="andes-form-label__colon" aria-hidden="true">:</span>
    }`,
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

  protected readonly tooltipOpen = signal(false);
}
