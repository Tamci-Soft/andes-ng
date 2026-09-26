import type { Provider } from '@angular/core';
import type { ValidationErrors } from '@angular/forms';

import {
  ANDES_FORM_ERROR_MESSAGES,
  type AndesFormErrorMessages,
} from './form-field-tokens';

/**
 * Built-in messages for every validator `@angular/forms` ships (`Validators.*` and their
 * template-driven directive twins). Deliberately label-free, so they read correctly whether
 * or not the field was given a `label` input; use `{label}` in your own map if you want it.
 */
export const ANDES_DEFAULT_FORM_ERROR_MESSAGES: AndesFormErrorMessages = {
  required: 'This field is required.',
  requiredTrue: 'This field is required.',
  email: 'Enter a valid email address.',
  minlength: 'Enter at least {requiredLength} characters.',
  maxlength: 'Enter no more than {requiredLength} characters.',
  min: 'Enter a value of at least {min}.',
  max: 'Enter a value of at most {max}.',
  pattern: 'The value does not match the expected format.',
  default: 'This value is invalid.',
};

/**
 * Registers error messages for every `AndesFormField` in the injector subtree it is provided
 * in (app config, a route, or a component's `providers`) - Ant's `validateMessages`, as an
 * Angular provider. Entries are merged over the built-in defaults, and are themselves
 * overridden by an `AndesForm`'s or `AndesFormField`'s own `errorMessages` input.
 *
 * ```ts
 * providers: [provideAndesFormErrorMessages({ required: 'Campo obligatorio.' })]
 * ```
 */
export function provideAndesFormErrorMessages(
  messages: AndesFormErrorMessages,
): Provider {
  return { provide: ANDES_FORM_ERROR_MESSAGES, useValue: messages };
}

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Turns an Angular `ValidationErrors` object into display strings, one per failing validator
 * in the order the validators reported them. `maps` is highest-priority first; the built-in
 * defaults are always consulted last.
 */
export function resolveAndesFormErrorMessages(
  errors: ValidationErrors | null,
  maps: readonly (AndesFormErrorMessages | null | undefined)[],
  label: string | undefined,
): string[] {
  if (!errors) {
    return [];
  }
  const chain = [...maps, ANDES_DEFAULT_FORM_ERROR_MESSAGES].filter(
    (map): map is AndesFormErrorMessages => !!map,
  );
  const lookup = (key: string) =>
    chain.find((map) => Object.hasOwn(map, key))?.[key];

  return Object.entries(errors).map(([key, error]) => {
    // A key nobody mapped, whose validator already put a human-readable string in its error
    // (`{ taken: 'That username is taken.' }`), is its own best message.
    const message =
      lookup(key) ??
      (typeof error === 'string' ? error : undefined) ??
      lookup('default') ??
      '';
    if (typeof message === 'function') {
      return message(error, { key, label });
    }
    const values: Record<string, unknown> = {
      ...(error !== null && typeof error === 'object' ? error : {}),
      label: label ?? '',
    };
    return message.replace(PLACEHOLDER, (_, name: string) =>
      values[name] === undefined ? '' : String(values[name]),
    );
  });
}
