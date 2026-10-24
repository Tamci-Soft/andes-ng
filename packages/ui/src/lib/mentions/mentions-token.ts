import { InjectionToken } from '@angular/core';

/**
 * Lets the field directive and the option rows find the mentions component that owns them
 * without importing it (the component imports them). Typed `unknown`; callers cast to
 * `AndesMentions` with a type-only import.
 */
export const ANDES_MENTIONS = new InjectionToken<unknown>('ANDES_MENTIONS');
