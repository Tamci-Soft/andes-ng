import { InjectionToken, type Signal, type TemplateRef } from '@angular/core';
import type { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validation status of a field, as used by `AndesFormField`'s `validateStatus`.
 * `null` means "no status yet" (untouched, or nothing to report).
 */
export type AndesFormValidateStatus =
  'success' | 'warning' | 'error' | 'validating';

/** `vertical` stacks label over control; `horizontal` puts them side by side in a two-column
 *  grid sized by `labelCol`/`wrapperCol`; `inline` lays whole fields out in a wrapping row. */
export type AndesFormLayout = 'horizontal' | 'vertical' | 'inline';

export type AndesFormLabelAlign = 'left' | 'right';

/** Same `sm`/`md`/`lg` vocabulary as `AndesButtonSize`. */
export type AndesFormSize = 'sm' | 'md' | 'lg';

/** Same `outlined`/`filled`/`borderless`/`underlined` vocabulary a control's own `variant`
 *  would use; read by controls through `injectAndesFormVariant()`. */
export type AndesFormVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';

/** Context of a custom required-mark template. */
export interface AndesFormRequiredMarkContext {
  /** Whether the field is required - same as `required`. */
  readonly $implicit: boolean;
  readonly required: boolean;
}

/** `true` marks required fields with an asterisk, `false` marks nothing, `'optional'` marks
 *  the NON-required ones with an "(optional)" suffix instead. A template replaces both marks
 *  and is rendered after the label text of every field, required or not, with
 *  {@link AndesFormRequiredMarkContext}. */
export type AndesFormRequiredMark =
  boolean | 'optional' | TemplateRef<AndesFormRequiredMarkContext>;

/**
 * When a field starts showing its derived status (error, warning, validating, success):
 * - `interacted` (default) - once the control is touched or dirty, or the form submitted;
 * - `touched` - once the control is blurred, or the form submitted (no errors while typing
 *   the first time);
 * - `dirty` - as soon as the value changes, or the form is submitted;
 * - `submitted` - only after the enclosing form has been submitted;
 * - `always` - immediately, even on a pristine control.
 *
 * Purely a display gate: *when validation runs* is Angular's `updateOn` (`'change'`,
 * `'blur'`, `'submit'`) on the control or group.
 */
export type AndesFormShowErrorsOn =
  'interacted' | 'touched' | 'dirty' | 'submitted' | 'always';

/** Context of a custom `feedbackIcons` template. */
export interface AndesFormFeedbackIconContext {
  /** The status to draw an icon for - same as `status`. */
  readonly $implicit: AndesFormValidateStatus;
  readonly status: AndesFormValidateStatus;
}

/** Options for `scrollToFirstError` / `scrollToField`: where to scroll (standard
 *  `scrollIntoView` options, default `block: 'center'`, `behavior: 'smooth'`) and whether to
 *  move focus into the field's control (default `true`). */
export interface AndesFormScrollOptions extends ScrollIntoViewOptions {
  readonly focus?: boolean;
}

/** One failing control, as reported by `invalidSubmit` and `collectAndesFormErrors()`. */
export interface AndesFormFieldError {
  /** Path from the form root - the same segments `FormGroup.get()` accepts. `[]` is the root
   *  group itself (a cross-field validator on the form). */
  readonly path: readonly (string | number)[];
  readonly errors: ValidationErrors;
}

/** Payload of `AndesForm`'s `invalidSubmit` output. */
export interface AndesFormInvalidSubmit {
  /** The form's `value` at submit time. */
  readonly value: unknown;
  /** Every enabled control with errors, in document order of the form model. */
  readonly errors: readonly AndesFormFieldError[];
}

/**
 * Width of the label or control column in `horizontal` layout. A number is a span out of 24
 * (a 24-column grid - `8` is one third); a string is used verbatim as a CSS track size
 * (`'10rem'`, `'120px'`, `'30%'`, `'auto'`).
 */
export type AndesFormColumn = number | string;

/** Context passed to a function-valued error message. */
export interface AndesFormErrorContext {
  /** The validator error key (`'required'`, `'minlength'`, ...). */
  readonly key: string;
  /** The field's `label` input, when one was given. */
  readonly label: string | undefined;
}

/**
 * One entry of an error-message map. A string may contain `{placeholder}`s, filled from the
 * validator's own error object (`{requiredLength}`/`{actualLength}` for `minlength`,
 * `{min}`/`{actual}` for `min`, ...) plus `{label}`. A function receives that error object
 * as-is.
 */
export type AndesFormErrorMessage =
  | string
  // The error payload's shape is validator-defined (`ValidationErrors` is `Record<string, any>`).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ((error: any, context: AndesFormErrorContext) => string);

/** Validator error key -> message. The `default` key is the fallback for any key with no
 *  entry of its own (a validator whose error value is itself a string uses that string). */
export type AndesFormErrorMessages = Readonly<
  Record<string, AndesFormErrorMessage>
>;

/**
 * Narrow surface `AndesFormField` exposes to the parts nested inside it (`AndesFormLabel`,
 * `AndesFormControl`, `AndesFormDescription`, `AndesFormError`) - kept as an interface +
 * injection token, rather than each of those parts importing the concrete `AndesFormField`
 * class directly, so that `form-field.ts` and `form-control.ts`/`form-label.ts`/etc. don't
 * end up in a circular import (the field also needs to look up `AndesFormControl` and the
 * description/error parts by their own tokens below, going the other direction). Mirrors
 * how `@angular/material`'s `MAT_FORM_FIELD` token decouples `MatFormField` from every
 * control that plugs into it.
 *
 * It doubles as a status hook for custom controls: any control can
 * `inject(ANDES_FORM_FIELD, { optional: true })` and read `status()`/`hasFeedback()` to draw
 * status styling or a feedback icon of its own.
 */
export interface AndesFormFieldApi {
  readonly controlId: () => string;
  readonly labelId: () => string;
  readonly descriptionId: () => string;
  readonly errorId: () => string;
  readonly labelledBy: () => string | null;
  readonly describedBy: () => string | null;
  readonly showError: () => boolean;
  /** Effective status: the manual `validateStatus` override, else derived from the control. */
  readonly status: () => AndesFormValidateStatus | null;
  readonly hasFeedback: () => boolean;
  /** Label decorations, already resolved against the enclosing `AndesForm`'s defaults. */
  readonly showRequiredMark: () => boolean;
  readonly showOptionalMark: () => boolean;
  readonly optionalText: () => string;
  readonly showColon: () => boolean;
  /** A custom required-mark template, when the resolved `requiredMark` is one. */
  readonly requiredMarkTemplate: () => TemplateRef<AndesFormRequiredMarkContext> | null;
  /** Whether the field counts as required (the `required` input, else the control). */
  readonly isRequired: () => boolean;
  readonly tooltip: () => string | TemplateRef<void> | undefined;
  readonly tooltipId: () => string;
  readonly tooltipLabel: () => string;
  /** The resolved display gate - read by `AndesFormControl` for its `interacted` signal. */
  readonly resolvedShowErrorsOn: () => AndesFormShowErrorsOn;
  /** Called by `AndesFormControl` from its constructor; returns the unregister callback. */
  registerControl(control: AndesFormControlApi): () => void;
  /** Called by a nested `noStyle` field so its status/messages surface on this one. */
  registerChild(child: AndesFormFieldChildApi): () => void;
}

export const ANDES_FORM_FIELD = new InjectionToken<AndesFormFieldApi>(
  'AndesFormField',
);

/** What a `noStyle` field reports up to the field it is nested in. */
export interface AndesFormFieldChildApi {
  readonly noStyle: () => boolean;
  readonly status: () => AndesFormValidateStatus | null;
  readonly errorMessages: () => readonly string[];
  readonly warningMessages: () => readonly string[];
}

/** Surface `AndesFormField` reads back from the `AndesFormControl` directive nested inside
 *  it, via the same token-indirection technique. */
export interface AndesFormControlApi {
  readonly showError: () => boolean;
  /** Whether the field's `showErrorsOn` gate is open (by default `touched || dirty || parent
   *  form submitted`) - the gate every status waits for. */
  readonly interacted: () => boolean;
  readonly pending: () => boolean;
  readonly valid: () => boolean;
  readonly errors: () => ValidationErrors | null;
  /** The control's current value, as a signal - re-read on every control event. */
  readonly value: () => unknown;
  /** The bound `AbstractControl`, once the host directive has created it. */
  readonly control: () => AbstractControl | null;
  /** The control's path from its form root, joined with `.` (`'address.city'`), or `null`
   *  for a standalone control. */
  readonly path: () => string | null;
  /** `Validators.required`/`requiredTrue`, or a native `required` attribute on the element -
   *  i.e. anything that should earn a required mark on the label. */
  readonly markedRequired: () => boolean;
}

export const ANDES_FORM_CONTROL = new InjectionToken<AndesFormControlApi>(
  'AndesFormControl',
);

/** Presence markers only - `AndesFormField` just needs to know whether a label/description/
 *  error slot was authored at all, to decide whether to expose its id (`aria-labelledby`) or
 *  fold it into `aria-describedby`. */
export const ANDES_FORM_LABEL = new InjectionToken<unknown>('AndesFormLabel');

export const ANDES_FORM_DESCRIPTION = new InjectionToken<unknown>(
  'AndesFormDescription',
);

export const ANDES_FORM_ERROR = new InjectionToken<unknown>('AndesFormError');

/**
 * Form-wide presentation defaults an `AndesForm` provides to every field below it through
 * DI. Each field-level input of the same name wins over it.
 */
export interface AndesFormApi {
  readonly layout: Signal<AndesFormLayout>;
  readonly labelAlign: Signal<AndesFormLabelAlign>;
  readonly labelCol: Signal<AndesFormColumn | undefined>;
  readonly wrapperCol: Signal<AndesFormColumn | undefined>;
  readonly labelWrap: Signal<boolean>;
  readonly colon: Signal<boolean>;
  readonly requiredMark: Signal<AndesFormRequiredMark>;
  readonly optionalText: Signal<string>;
  readonly size: Signal<AndesFormSize | undefined>;
  readonly variant: Signal<AndesFormVariant | undefined>;
  readonly disabled: Signal<boolean>;
  readonly showErrorsOn: Signal<AndesFormShowErrorsOn>;
  readonly feedbackIcons: Signal<
    TemplateRef<AndesFormFeedbackIconContext> | undefined
  >;
  readonly errorMessages: Signal<AndesFormErrorMessages | undefined>;
}

export const ANDES_FORM = new InjectionToken<AndesFormApi>('AndesForm');

/**
 * App- or subtree-wide error messages, merged between the built-in
 * defaults and any `AndesForm`/`AndesFormField` `errorMessages` input. Register with
 * {@link provideAndesFormErrorMessages}.
 */
export const ANDES_FORM_ERROR_MESSAGES =
  new InjectionToken<AndesFormErrorMessages>('AndesFormErrorMessages');
