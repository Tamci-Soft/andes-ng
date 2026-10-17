import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

import { AndesSkeletonSize, toCssSize } from './skeleton-utils';

export type AndesSkeletonButtonShape =
  'default' | 'round' | 'circle' | 'square';

@Component({
  selector: 'andes-skeleton-button',
  template: `<span
    data-slot="skeleton-button"
    [class]="classes()"
    [style.width]="widthStyle()"
    [style.min-width]="widthStyle()"
  ></span>`,
  styleUrls: ['./skeleton-fill.css', './skeleton-element.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-hidden]': 'true',
    '[class.andes-skeleton-element--block]': 'block()',
  },
})
export class AndesSkeletonButton {
  readonly size = input<AndesSkeletonSize>('md');
  readonly shape = input<AndesSkeletonButtonShape>('default');
  /** Stretches the placeholder to its parent's width, like a full-width button. */
  readonly block = input(false, { transform: booleanAttribute });
  readonly active = input(false, { transform: booleanAttribute });
  /**
   * A custom width (numbers are pixels) for a placeholder that stands in for a control wider or
   * narrower than the default. Ignored while `block` is set - the full-width stretch wins.
   */
  readonly width = input<string | number | undefined>(undefined);

  protected readonly widthStyle = computed(() =>
    this.block() ? undefined : toCssSize(this.width()),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-skeleton-element',
      'andes-skeleton-button',
      'andes-skeleton-fill',
      `andes-skeleton-element--${this.size()}`,
      this.shape() !== 'default' && `andes-skeleton-button--${this.shape()}`,
      this.block() && 'andes-skeleton-element--block',
      this.active() && 'andes-skeleton-fill--active',
    ),
  );
}
