import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';

export type AndesButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type AndesButtonSize = 'sm' | 'md' | 'lg';

@Component({
  // Native button semantics are intentional for keyboard and form behavior.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[andesButton]',
  template: '<ng-content />',
  styleUrl: './button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }],
  host: {
    class: 'andes-button',
    '[attr.data-size]': 'size()',
    '[attr.data-variant]': 'variant()',
  },
})
export class AndesButton {
  readonly variant = input<AndesButtonVariant>('primary');
  readonly size = input<AndesButtonSize>('md');
}
