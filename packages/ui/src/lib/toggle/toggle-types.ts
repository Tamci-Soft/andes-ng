import { InjectionToken, Signal } from '@angular/core';

export type AndesToggleVariant = 'default' | 'outline';
export type AndesToggleSize = 'sm' | 'md' | 'lg';
export type AndesToggleGroupType = 'single' | 'multiple';
export type AndesToggleGroupOrientation = 'horizontal' | 'vertical';

/** What a toggle inside a group reads from and reports to it. */
export interface AndesToggleGroupApi {
  readonly variant: Signal<AndesToggleVariant>;
  readonly size: Signal<AndesToggleSize>;
  readonly isDisabled: Signal<boolean>;
  readonly isPressed: (value: unknown) => boolean;
  /** The one toggle instance in the tab order (roving tabindex). */
  readonly tabbable: Signal<unknown>;
  readonly toggle: (value: unknown) => void;
}

export const ANDES_TOGGLE_GROUP = new InjectionToken<AndesToggleGroupApi>(
  'ANDES_TOGGLE_GROUP',
);
