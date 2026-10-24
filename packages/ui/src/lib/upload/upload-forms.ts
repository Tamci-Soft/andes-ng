import type {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

import type { AndesUploadFile } from './upload-types';

/**
 * Keeps a form invalid while a file is still being sent (`uploadPending`) or one failed
 * (`uploadFailed`). Pair with `Validators.required` to also demand at least one file.
 */
export function andesUploadSettled(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const files = (control.value ?? []) as AndesUploadFile[];
    if (!Array.isArray(files)) {
      return null;
    }
    const errors: ValidationErrors = {};
    if (files.some((file) => file.status === 'uploading')) {
      errors['uploadPending'] = true;
    }
    if (files.some((file) => file.status === 'error')) {
      errors['uploadFailed'] = true;
    }
    return Object.keys(errors).length > 0 ? errors : null;
  };
}

/** At most `max` files. */
export function andesUploadMaxFiles(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const files = control.value;
    return Array.isArray(files) && files.length > max
      ? { uploadMaxFiles: { max, actual: files.length } }
      : null;
  };
}
