import { InjectionToken, type Signal } from '@angular/core';
import type { ValidationErrors } from '@angular/forms';

/**
 * Validation status of a field - Ant Design's `Form.Item` `validateStatus` vocabulary.
 * `null` means "no status yet" (untouched, or nothing to report).
 */
export type AndesFormValidateStatus =
  'success' | 'warning' | 'error' | 'validating';

/** `vertical` stacks label over control; `horizontal` puts them side by side in a two-column
 *  grid sized by `labelCol`/`wrapperCol`; `inline` lays whole fields out in a wrapping row. */
export type AndesFormLayout = 'horizontal' | 'vertical' | 'inline';

export type AndesFormLabelAlign = 'left' | 'right';

/** Same `sm`/`md`/`lg` vocabulary as `AndesButtonSize` (Ant's `small`/`middle`/`large`). */
export type AndesFormSize = 'sm' | 'md' | 'lg';

/** `true` marks required fields with an asterisk, `false` marks nothing, `'optional'` marks
 *  the NON-required ones with an "(optional)" suffix instead. */
export type AndesFormRequiredMark = boolean | 'optional';

/**
 * Width of the label or control column in `horizontal` layout. A number is a span out of 24
 * (Ant's grid - `8` is one third); a string is used verbatim as a CSS track size
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
 * It doubles as the `Form.Item.useStatus()` equivalent: any control can
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
  readonly tooltip: () => string | undefined;
  readonly tooltipId: () => string;
  readonly tooltipLabel: () => string;
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
}

/** Surface `AndesFormField` reads back from the `AndesFormControl` directive nested inside
 *  it, via the same token-indirection technique. */
export interface AndesFormControlApi {
  readonly showError: () => boolean;
  /** `touched || dirty || parent form submitted` - the gate every status waits for. */
  readonly interacted: () => boolean;
  readonly pending: () => boolean;
  readonly valid: () => boolean;
  readonly errors: () => ValidationErrors | null;
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
 * Form-wide presentation defaults an `AndesForm` provides to every field below it - the
 * Angular (DI) counterpart of the props Ant's `<Form>` cascades to its `Form.Item`s. Each
 * field-level input of the same name wins over it.
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
  readonly errorMessages: Signal<AndesFormErrorMessages | undefined>;
}

export const ANDES_FORM = new InjectionToken<AndesFormApi>('AndesForm');

/**
 * App- or subtree-wide error messages (Ant's `validateMessages`), merged between the built-in
 * defaults and any `AndesForm`/`AndesFormField` `errorMessages` input. Register with
 * {@link provideAndesFormErrorMessages}.
 */
export const ANDES_FORM_ERROR_MESSAGES =
  new InjectionToken<AndesFormErrorMessages>('AndesFormErrorMessages');
