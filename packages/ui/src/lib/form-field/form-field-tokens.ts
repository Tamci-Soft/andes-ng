import { InjectionToken } from '@angular/core';

/**
 * Narrow surface `AndesFormField` exposes to the parts nested inside it (`AndesFormLabel`,
 * `AndesFormControl`, `AndesFormDescription`, `AndesFormError`) - kept as an interface +
 * injection token, rather than each of those parts importing the concrete `AndesFormField`
 * class directly, so that `form-field.ts` and `form-control.ts`/`form-label.ts`/etc. don't
 * end up in a circular import (the field also needs to look up `AndesFormControl` and the
 * description/error parts by their own tokens below, going the other direction). Mirrors
 * how `@angular/material`'s `MAT_FORM_FIELD` token decouples `MatFormField` from every
 * control that plugs into it.
 */
export interface AndesFormFieldApi {
  readonly controlId: () => string;
  readonly descriptionId: () => string;
  readonly errorId: () => string;
  readonly describedBy: () => string | null;
  readonly showError: () => boolean;
}

export const ANDES_FORM_FIELD = new InjectionToken<AndesFormFieldApi>(
  'AndesFormField',
);

/** Surface `AndesFormField` reads back from the `AndesFormControl` directive nested inside
 *  it, via the same token-indirection technique. */
export interface AndesFormControlApi {
  readonly showError: () => boolean;
}

export const ANDES_FORM_CONTROL = new InjectionToken<AndesFormControlApi>(
  'AndesFormControl',
);

/** Presence markers only - `AndesFormField` just needs to know whether a description/error
 *  slot was authored at all, to decide whether to fold its id into `aria-describedby`. */
export const ANDES_FORM_DESCRIPTION = new InjectionToken<unknown>(
  'AndesFormDescription',
);

export const ANDES_FORM_ERROR = new InjectionToken<unknown>('AndesFormError');
