import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

import { AndesSkeletonSize, toCssSize } from './skeleton-utils';

export type AndesSkeletonAvatarShape = 'circle' | 'square';

@Component({
  selector: 'andes-skeleton-avatar',
  template: `<span
    data-slot="skeleton-avatar"
    [class]="classes()"
    [style.width]="customSize()"
    [style.height]="customSize()"
  ></span>`,
  styleUrls: ['./skeleton-fill.css', './skeleton-element.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Decorative stand-in - see AndesSkeleton for the single accessible busy indicator.
    '[attr.aria-hidden]': 'true',
  },
})
export class AndesSkeletonAvatar {
  /** A named step of the shared scale, or a number of pixels. */
  readonly size = input<AndesSkeletonSize | number>('md');
  readonly shape = input<AndesSkeletonAvatarShape>('circle');
  readonly active = input(false, { transform: booleanAttribute });

  protected readonly customSize = computed(() => {
    const size = this.size();
    return typeof size === 'number' ? toCssSize(size) : undefined;
  });

  protected readonly classes = computed(() => {
    const size = this.size();
    return clsx(
      'andes-skeleton-element',
      'andes-skeleton-avatar',
      'andes-skeleton-fill',
      `andes-skeleton-avatar--${this.shape()}`,
      typeof size === 'string' && `andes-skeleton-element--${size}`,
      this.active() && 'andes-skeleton-fill--active',
    );
  });
}
