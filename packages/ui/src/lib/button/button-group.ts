import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  input,
  Signal,
  ViewEncapsulation,
} from '@angular/core';

import type { AndesButtonSize } from './button';

export type AndesButtonGroupOrientation = 'horizontal' | 'vertical';

/** What a button reads from the group that contains it. */
export interface AndesButtonGroupContext {
  readonly size: Signal<AndesButtonSize | undefined>;
}

export const ANDES_BUTTON_GROUP = new InjectionToken<AndesButtonGroupContext>(
  'ANDES_BUTTON_GROUP',
);

/**
 * Joins adjacent buttons into one segmented control: inner corners are squared off and
 * neighbouring borders overlap so the row reads as a single unit (a split button, a pager, a
 * toolbar cluster). `size` applies to every button that doesn't set its own.
 */
@Component({
  selector: 'andes-button-group',
  template: '<ng-content />',
  styleUrl: './button-group.css',
  // The group styles the inner element of each projected button, which emulated
  // encapsulation can't reach. Every selector is scoped under `.andes-button-group`.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ANDES_BUTTON_GROUP, useExisting: AndesButtonGroup }],
  host: {
    role: 'group',
    class: 'andes-button-group',
    '[class.andes-button-group--horizontal]': "orientation() === 'horizontal'",
    '[class.andes-button-group--vertical]': "orientation() === 'vertical'",
    '[attr.data-orientation]': 'orientation()',
  },
})
export class AndesButtonGroup implements AndesButtonGroupContext {
  readonly size = input<AndesButtonSize | undefined>(undefined);
  readonly orientation = input<AndesButtonGroupOrientation>('horizontal');
}
