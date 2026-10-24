import { InjectionToken } from '@angular/core';

/**
 * Lets an option row find the command that owns it without importing the component (which
 * imports the row). Typed `unknown`; callers cast to `AndesCommand` with a type-only import.
 */
export const ANDES_COMMAND = new InjectionToken<unknown>('ANDES_COMMAND');
