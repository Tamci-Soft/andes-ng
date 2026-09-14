import { BrnButtonImports } from '@spartan-ng/brain/button';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

export type AndesButtonVariant =
  'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'link';
export type AndesButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type AndesButtonShape = 'default' | 'full';

@Component({
  selector: 'andes-button',
  imports: [BrnButtonImports],
  templateUrl: './button.html',
  styleUrl: './button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesButton {
  readonly variant = input<AndesButtonVariant>('primary');
  readonly size = input<AndesButtonSize>('md');
  readonly shape = input<AndesButtonShape>('default');
  readonly disabled = input(false);
  readonly loading = input(false);

  protected readonly isDisabled = computed(
    () => this.disabled() || this.loading(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-button',
      `andes-button--${this.variant()}`,
      `andes-button--${this.size()}`,
      this.shape() === 'full' && 'andes-button--full',
      this.loading() && 'andes-button--loading',
    ),
  );
}
