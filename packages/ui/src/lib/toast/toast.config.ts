import {
  InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from '@angular/core';

import {
  ANDES_MESSAGE_DEFAULT_DURATION,
  ANDES_TOAST_DEFAULT_DURATION,
  ANDES_TOAST_DEFAULT_MAX_VISIBLE,
  type AndesToastGlobalConfig,
} from './toast.types';

/** Built-in notification defaults, before any `provideAndesToastConfig()` override. */
export const ANDES_TOAST_BUILTIN_DEFAULTS: AndesToastGlobalConfig = {
  placement: 'bottom-right',
  duration: ANDES_TOAST_DEFAULT_DURATION,
  maxCount: ANDES_TOAST_DEFAULT_MAX_VISIBLE,
  overflow: 'queue',
  pauseOnHover: true,
  showProgress: false,
  dismissible: true,
  stack: false,
};

/** Built-in message defaults, before any `provideAndesMessageConfig()` override. */
export const ANDES_MESSAGE_BUILTIN_DEFAULTS: AndesToastGlobalConfig = {
  placement: 'top-center',
  duration: ANDES_MESSAGE_DEFAULT_DURATION,
  maxCount: Number.POSITIVE_INFINITY,
  overflow: 'queue',
  pauseOnHover: true,
  showProgress: false,
  dismissible: false,
  stack: false,
};

/**
 * App-wide defaults for `AndesToastService` (notifications), set once at bootstrap and
 * adjustable later with `config()`. Prefer `provideAndesToastConfig()` over
 * providing this directly; the service still reads it when it's absent.
 */
export const ANDES_TOAST_CONFIG = new InjectionToken<
  Partial<AndesToastGlobalConfig>
>('ANDES_TOAST_CONFIG');

/** App-wide defaults for `AndesMessageService`, also adjustable with its `config()`. */
export const ANDES_MESSAGE_CONFIG = new InjectionToken<
  Partial<Omit<AndesToastGlobalConfig, 'placement'>>
>('ANDES_MESSAGE_CONFIG');

/**
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideAndesToastConfig({ placement: 'top-right', showProgress: true })],
 * });
 * ```
 */
export function provideAndesToastConfig(
  config: Partial<AndesToastGlobalConfig>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ANDES_TOAST_CONFIG, useValue: config },
  ]);
}

/** Global defaults for `AndesMessageService`. Messages always render top-center. */
export function provideAndesMessageConfig(
  config: Partial<Omit<AndesToastGlobalConfig, 'placement'>>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ANDES_MESSAGE_CONFIG, useValue: config },
  ]);
}
