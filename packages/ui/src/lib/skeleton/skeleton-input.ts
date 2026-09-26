import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

import { AndesSkeletonSize } from './skeleton-utils';

@Component({
  selector: 'andes-skeleton-input',
  template: `<span data-slot="skeleton-input" [class]="classes()"></span>`,
  styleUrls: ['./skeleton-fill.css', './skeleton-element.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-hidden]': 'true',
    '[class.andes-skeleton-element--block]': 'block()',
  },
})
export class AndesSkeletonInput {
  readonly size = input<AndesSkeletonSize>('md');
  /** Stretches the placeholder to its parent's width. */
  readonly block = input(false, { transform: booleanAttribute });
  readonly active = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    clsx(
      'andes-skeleton-element',
      'andes-skeleton-input',
      'andes-skeleton-fill',
      `andes-skeleton-element--${this.size()}`,
      this.block() && 'andes-skeleton-element--block',
      this.active() && 'andes-skeleton-fill--active',
    ),
  );
}
