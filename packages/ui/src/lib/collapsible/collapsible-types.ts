import { InjectionToken, Signal } from '@angular/core';

/** What the trigger and the content of a collapsible read from their root. */
export interface AndesCollapsibleApi {
  readonly isOpen: Signal<boolean>;
  readonly isDisabled: Signal<boolean>;
  /** `id` of the content element, referenced by every trigger's `aria-controls`. */
  readonly contentId: string;
  readonly toggle: () => void;
}

export const ANDES_COLLAPSIBLE = new InjectionToken<AndesCollapsibleApi>(
  'ANDES_COLLAPSIBLE',
);
