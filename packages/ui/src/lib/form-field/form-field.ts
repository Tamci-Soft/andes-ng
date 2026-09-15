import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  forwardRef,
  input,
  ViewEncapsulation,
} from '@angular/core';

import {
  ANDES_FORM_CONTROL,
  ANDES_FORM_DESCRIPTION,
  ANDES_FORM_ERROR,
  ANDES_FORM_FIELD,
  ANDES_FORM_LABEL,
  type AndesFormFieldApi,
} from './form-field-tokens';

let nextFieldId = 0;

/**
 * Layout/label/error-display wrapper around a single form control - the andes-ng
 * counterpart to Ant Design's `Form.Item`, built as a thin shell around Angular's own
 * Reactive Forms (`FormGroup`/`FormControl`/`Validators`) rather than a self-contained
 * validation engine, since Angular already owns that concern (see
 * `docs/research/components/form.md` for the shadcn-vs-Ant comparison this follows).
 *
 * Composition, in author order inside `<andes-form-field>`:
 * - `<andes-form-label>` - optional; renders a real `<label>` wired to the control via
 *   `for`/`id`, and carrying an id of its own ({@link labelId}) so a wrapper component that
 *   only accepts `aria-labelledby` can still be named by it.
 * - the control itself, carrying `andesFormControl` alongside `formControlName` /
 *   `[formControl]` / `[(ngModel)]` - a native `<input>`/`<select>`/`<textarea>`, or any
 *   `ControlValueAccessor` component from this library or elsewhere.
 * - `<andes-form-description>` - optional static help text.
 * - `<andes-form-error>` - optional; only rendered once the control is
 *   `invalid && (touched || dirty)`.
 *
 * `id`/`for`/`aria-describedby`/`aria-invalid`/`aria-required` are all derived here (or on
 * `AndesFormControl`) and picked up by the nested parts through DI (see
 * `form-field-tokens.ts` for why that's token-based rather than a direct class reference) -
 * no id needs to be hand-authored or coordinated by hand for the common case of a native
 * form control. See `AndesFormControl`'s class comment for the wrapper-component caveat.
 */
@Component({
  selector: 'andes-form-field',
  exportAs: 'andesFormField',
  imports: [],
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // form-field.css has to reach three sibling components' templates and the consumer's own
  // projected control, none of which carry this component's emulated-encapsulation scope
  // attribute - see the header comment in form-field.css for the full rationale.
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: ANDES_FORM_FIELD,
      useExisting: forwardRef(() => AndesFormField),
    },
  ],
})
export class AndesFormField implements AndesFormFieldApi {
  private readonly autoId = `andes-form-field-${nextFieldId++}`;

  /** Optional explicit id for the control/label pair. Auto-generated when omitted. */
  readonly id = input<string | undefined>(undefined);

  protected readonly controlApi = contentChild(ANDES_FORM_CONTROL, {
    descendants: true,
  });
  protected readonly labelPresent = contentChild(ANDES_FORM_LABEL, {
    descendants: true,
  });
  protected readonly descriptionPresent = contentChild(ANDES_FORM_DESCRIPTION, {
    descendants: true,
  });
  protected readonly errorPresent = contentChild(ANDES_FORM_ERROR, {
    descendants: true,
  });

  readonly controlId = computed(() => this.id() ?? this.autoId);
  readonly labelId = computed(() => `${this.controlId()}-label`);
  readonly descriptionId = computed(() => `${this.controlId()}-description`);
  readonly errorId = computed(() => `${this.controlId()}-error`);

  /**
   * The `<andes-form-label>`'s own element id, or `null` when no label was authored - shaped
   * to be bound straight through `[aria-labelledby]`.
   *
   * This is the escape hatch for wrapper components that expose no `id` input, where the
   * native `for`/`id` association cannot be completed from outside (see `AndesFormControl`'s
   * class comment): every one of this library's wrappers already accepts an `aria-labelledby`
   * input and forwards it onto its real internal control, so pointing that at the label's id
   * gives assistive technology the accessible name without needing any change to the wrapper's
   * own source. Returns `null` rather than a dangling id when there is no label, so a template
   * binding it unconditionally never emits `aria-labelledby` pointing at nothing.
   */
  readonly labelledBy = computed(() =>
    this.labelPresent() ? this.labelId() : null,
  );

  /** `true` once the registered control is invalid *and* the user has interacted with it
   *  (touched or dirty) - the same gate `AndesFormError` uses to decide whether to render,
   *  and `AndesFormControl` uses for its own `aria-invalid`. `false` when no control with
   *  `andesFormControl` is registered at all. */
  readonly showError = computed(() => this.controlApi()?.showError() ?? false);

  readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.descriptionPresent()) {
      ids.push(this.descriptionId());
    }
    if (this.errorPresent() && this.showError()) {
      ids.push(this.errorId());
    }
    return ids.length > 0 ? ids.join(' ') : null;
  });
}
