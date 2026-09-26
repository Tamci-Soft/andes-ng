import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  forwardRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { resolveAndesFormErrorMessages } from './form-error-messages';
import {
  ANDES_FORM,
  ANDES_FORM_DESCRIPTION,
  ANDES_FORM_ERROR,
  ANDES_FORM_ERROR_MESSAGES,
  ANDES_FORM_FIELD,
  ANDES_FORM_LABEL,
  type AndesFormColumn,
  type AndesFormControlApi,
  type AndesFormErrorMessages,
  type AndesFormFieldApi,
  type AndesFormFieldChildApi,
  type AndesFormLabelAlign,
  type AndesFormLayout,
  type AndesFormRequiredMark,
  type AndesFormValidateStatus,
} from './form-field-tokens';
import { AndesFormLabel } from './form-label';

let nextFieldId = 0;

/** Most to least severe - a field aggregating several statuses reports the first present. */
const STATUS_PRIORITY: readonly AndesFormValidateStatus[] = [
  'error',
  'warning',
  'validating',
  'success',
];

/** Default label column: 8 of 24, i.e. one third. */
const DEFAULT_LABEL_COL = 8;

/** `undefined` stays `undefined` (meaning "inherit from the form"); anything else is coerced
 *  like a boolean attribute, so `colon="false"` and `[colon]="false"` both work. */
function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined || value === null
    ? undefined
    : booleanAttribute(value);
}

function toTrack(column: AndesFormColumn): string {
  return typeof column === 'number'
    ? `${Math.round((column / 24) * 1e6) / 1e4}%`
    : column;
}

/**
 * Layout/label/error-display wrapper around a single form control, built as a thin shell
 * around Angular's own Reactive Forms (`FormGroup`/`FormControl`/`Validators`) rather than a
 * self-contained validation engine, since Angular already owns that concern.
 *
 * Composition inside `<andes-form-field>`:
 * - `<andes-form-label>` - optional (or use the `label` input); renders a real `<label>`
 *   wired to the control via `for`/`id`, and carrying an id of its own ({@link labelId}) so a
 *   wrapper component that only accepts `aria-labelledby` can still be named by it. Always
 *   placed in the label column, wherever it was authored.
 * - the control itself, carrying `andesFormControl` alongside `formControlName` /
 *   `[formControl]` / `[(ngModel)]` - a native `<input>`/`<select>`/`<textarea>`, or any
 *   `ControlValueAccessor` component from this library or elsewhere.
 * - `<andes-form-description>` - optional static help text.
 * - `<andes-form-error>` - optional hand-written error; only rendered while the field is in
 *   the `error` status. Without one, the field renders the messages for the control's actual
 *   `ValidationErrors` itself (see {@link validationMessages}).
 *
 * `id`/`for`/`aria-describedby`/`aria-invalid`/`aria-required` are all derived here (or on
 * `AndesFormControl`) and picked up by the nested parts through DI (see
 * `form-field-tokens.ts` for why that's token-based rather than a direct class reference) -
 * no id needs to be hand-authored or coordinated by hand for the common case of a native
 * form control. See `AndesFormControl`'s class comment for the wrapper-component caveat.
 *
 * Layout, label column width, colon, required mark and error messages default from an
 * enclosing `AndesForm` (`[andesForm]`), and each has a same-named input here that wins.
 */
@Component({
  selector: 'andes-form-field',
  exportAs: 'andesFormField',
  imports: [AndesFormLabel],
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
  private readonly form = inject(ANDES_FORM, { optional: true });
  private readonly providedMessages = inject(ANDES_FORM_ERROR_MESSAGES, {
    optional: true,
  });
  /** The field this one is nested in, if any - only meaningful for a `noStyle` field. */
  private readonly parent = inject(ANDES_FORM_FIELD, {
    optional: true,
    skipSelf: true,
  });

  /** Optional explicit id for the control/label pair. Auto-generated when omitted. */
  readonly id = input<string | undefined>(undefined);

  /** Label text - shorthand for projecting an `<andes-form-label>`, which wins when both are
   *  given. Also what `{label}` interpolates to in error messages. */
  readonly label = input<string | undefined>(undefined);

  /**
   * Manual status override. Leave unset to derive it from the control:
   * nothing until the user interacts (touched/dirty) or the form is submitted, then
   * `validating` while an async validator is pending, `error` while invalid, `success` once
   * valid. `''` forces "no status". `warning` is only ever manual - Angular validators have no
   * non-blocking severity.
   */
  readonly validateStatus = input<AndesFormValidateStatus | '' | undefined>(
    undefined,
  );

  /** Show a status icon at the trailing edge of the control. */
  readonly hasFeedback = input(false, { transform: booleanAttribute });

  /** Replaces the generated validation messages with this text; coloured by the current
   *  status. */
  readonly help = input<string | undefined>(undefined);

  /** Secondary text rendered below the control and any messages. */
  readonly extra = input<string | undefined>(undefined);

  /** Help text behind an info icon next to the label. */
  readonly tooltip = input<string | undefined>(undefined);

  /** Accessible name of the tooltip's trigger button - override to localize. */
  readonly tooltipLabel = input('More information');

  /** Forces the required mark on or off, instead of detecting `Validators.required`. Purely
   *  visual - it does not add a validator. */
  readonly required = input<boolean | undefined, unknown>(undefined, {
    transform: optionalBoolean,
  });

  /** Overrides the form's `requiredMark` for this field. */
  readonly requiredMark = input<AndesFormRequiredMark | undefined>(undefined);

  /** Overrides the form's `colon` for this field. */
  readonly colon = input<boolean | undefined, unknown>(undefined, {
    transform: optionalBoolean,
  });

  readonly layout = input<AndesFormLayout | undefined>(undefined);
  readonly labelAlign = input<AndesFormLabelAlign | undefined>(undefined);
  readonly labelCol = input<AndesFormColumn | undefined>(undefined);
  readonly wrapperCol = input<AndesFormColumn | undefined>(undefined);
  readonly labelWrap = input<boolean | undefined, unknown>(undefined, {
    transform: optionalBoolean,
  });

  /** Error messages for this field only; merged over the form's and the provided ones. */
  readonly errorMessages = input<AndesFormErrorMessages | undefined>(undefined);

  /**
   * Render no chrome at all - no label, no messages, no layout - only the projected control,
   * which still gets status/aria wiring. Nested inside another field, its status and messages
   * surface on that parent instead, which is how several controls share one label (`<andes-form-field label="Phone"><andes-form-field noStyle>...`).
   */
  readonly noStyle = input(false, { transform: booleanAttribute });

  private readonly controls = signal<readonly AndesFormControlApi[]>([]);
  private readonly children = signal<readonly AndesFormFieldChildApi[]>([]);

  protected readonly controlApi = computed(() => this.controls()[0]);
  protected readonly projectedLabel = contentChild(ANDES_FORM_LABEL, {
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
  /** Id of the generated-messages / `help` block. */
  readonly helpId = computed(() => `${this.controlId()}-help`);
  readonly extraId = computed(() => `${this.controlId()}-extra`);
  readonly tooltipId = computed(() => `${this.controlId()}-tooltip`);

  protected readonly hasLabel = computed(
    () => !!this.projectedLabel() || !!this.label(),
  );

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
    this.hasLabel() ? this.labelId() : null,
  );

  /** Status derived from this field's own control plus any `noStyle` children. */
  private readonly derivedStatus = computed<AndesFormValidateStatus | null>(
    () => {
      const statuses = this.children()
        .filter((child) => child.noStyle())
        .map((child) => child.status());
      const control = this.controlApi();
      if (control?.interacted()) {
        statuses.push(
          control.pending()
            ? 'validating'
            : control.showError()
              ? 'error'
              : control.valid()
                ? 'success'
                : null,
        );
      }
      return STATUS_PRIORITY.find((s) => statuses.includes(s)) ?? null;
    },
  );

  readonly status = computed<AndesFormValidateStatus | null>(() => {
    const override = this.validateStatus();
    return override === undefined ? this.derivedStatus() : override || null;
  });

  /** `true` while the field is in the `error` status - by default once the registered
   *  control is invalid *and* the user has interacted with it (touched, dirty or the form
   *  was submitted). The same gate `AndesFormError` uses to decide whether to render, and
   *  `AndesFormControl` uses for its own `aria-invalid`. */
  readonly showError = computed(() => this.status() === 'error');

  /**
   * Display strings for the control's current `ValidationErrors` (plus those of any `noStyle`
   * children), resolved through this field's `errorMessages`, then the form's, then
   * `provideAndesFormErrorMessages`, then the built-in defaults. Empty unless the control is
   * actually showing its error.
   */
  readonly validationMessages = computed<readonly string[]>(() => {
    const control = this.controlApi();
    const own =
      control?.showError() && this.status() === 'error'
        ? resolveAndesFormErrorMessages(
            control.errors(),
            [
              this.errorMessages(),
              this.form?.errorMessages(),
              this.providedMessages,
            ],
            this.label(),
          )
        : [];
    const nested = this.children()
      .filter((child) => child.noStyle())
      .flatMap((child) => child.errorMessages());
    return [...own, ...nested];
  });

  /** What the help slot shows: the `help` text, else the generated messages - unless an
   *  `<andes-form-error>` was authored, which then owns error display on its own. */
  protected readonly helpMessages = computed<readonly string[]>(() => {
    const help = this.help();
    if (help !== undefined) {
      return help ? [help] : [];
    }
    return this.showError() && !this.errorPresent()
      ? this.validationMessages()
      : [];
  });

  protected readonly helpIsGenerated = computed(
    () => this.help() === undefined,
  );

  readonly resolvedLayout = computed<AndesFormLayout>(
    () => this.layout() ?? this.form?.layout() ?? 'vertical',
  );

  protected readonly resolvedLabelAlign = computed<AndesFormLabelAlign>(
    () => this.labelAlign() ?? this.form?.labelAlign() ?? 'right',
  );

  protected readonly resolvedLabelWrap = computed(
    () => this.labelWrap() ?? this.form?.labelWrap() ?? false,
  );

  /** `grid-template-columns` for `horizontal` layout; `null` (no inline style) otherwise. */
  protected readonly gridColumns = computed(() => {
    if (this.resolvedLayout() !== 'horizontal' || this.noStyle()) {
      return null;
    }
    const label = this.labelCol() ?? this.form?.labelCol() ?? DEFAULT_LABEL_COL;
    const wrapper = this.wrapperCol() ?? this.form?.wrapperCol();
    return `${toTrack(label)} ${wrapper === undefined ? 'minmax(0, 1fr)' : toTrack(wrapper)}`;
  });

  /** The icon to draw for `hasFeedback`, or `null`. */
  protected readonly feedbackIcon = computed(() =>
    this.hasFeedback() && !this.noStyle() ? this.status() : null,
  );

  private readonly isRequired = computed(
    () => this.required() ?? this.controlApi()?.markedRequired() ?? false,
  );

  private readonly resolvedRequiredMark = computed<AndesFormRequiredMark>(
    () => this.requiredMark() ?? this.form?.requiredMark() ?? true,
  );

  readonly showRequiredMark = computed(
    () => this.resolvedRequiredMark() === true && this.isRequired(),
  );

  readonly showOptionalMark = computed(
    () => this.resolvedRequiredMark() === 'optional' && !this.isRequired(),
  );

  readonly optionalText = computed(
    () => this.form?.optionalText() ?? '(optional)',
  );

  /** The colon is a horizontal-layout device only; stacked labels don't need a separator. */
  readonly showColon = computed(
    () =>
      this.resolvedLayout() === 'horizontal' &&
      (this.colon() ?? this.form?.colon() ?? true),
  );

  protected readonly hasMessages = computed(
    () =>
      !!this.descriptionPresent() ||
      (!!this.errorPresent() && this.showError()) ||
      this.helpMessages().length > 0 ||
      !!this.extra(),
  );

  readonly describedBy = computed(() => {
    // A noStyle field renders no messages of its own - they surface on the parent field - so
    // its control is described by whatever describes the parent's.
    if (this.noStyle() && this.parent) {
      return this.parent.describedBy();
    }
    const ids: string[] = [];
    if (this.descriptionPresent()) {
      ids.push(this.descriptionId());
    }
    if (this.errorPresent() && this.showError()) {
      ids.push(this.errorId());
    }
    if (this.helpMessages().length > 0) {
      ids.push(this.helpId());
    }
    if (this.extra()) {
      ids.push(this.extraId());
    }
    return ids.length > 0 ? ids.join(' ') : null;
  });

  constructor() {
    const child: AndesFormFieldChildApi = {
      noStyle: this.noStyle,
      status: this.status,
      errorMessages: this.validationMessages,
    };
    const unregister = this.parent?.registerChild(child);
    if (unregister) {
      inject(DestroyRef).onDestroy(unregister);
    }
  }

  registerControl(control: AndesFormControlApi): () => void {
    this.controls.update((list) => [...list, control]);
    return () =>
      this.controls.update((list) => list.filter((c) => c !== control));
  }

  registerChild(child: AndesFormFieldChildApi): () => void {
    this.children.update((list) => [...list, child]);
    return () =>
      this.children.update((list) => list.filter((c) => c !== child));
  }
}
