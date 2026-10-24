import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

import { toCssSize } from './skeleton-utils';

/**
 * A placeholder box around arbitrary projected content (an icon, a short hint). The content is
 * decorative like every other placeholder, so it is hidden from assistive technology along with
 * the box.
 */
@Component({
  selector: 'andes-skeleton-node',
  template: `<span
    data-slot="skeleton-node"
    [class]="classes()"
    [style.width]="widthStyle()"
    [style.height]="heightStyle()"
    ><ng-content
  /></span>`,
  styleUrls: ['./skeleton-fill.css', './skeleton-element.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-hidden]': 'true',
  },
})
export class AndesSkeletonNode {
  /** Numbers are pixels. Defaults to a 6rem square. */
  readonly width = input<string | number | undefined>(undefined);
  readonly height = input<string | number | undefined>(undefined);
  readonly active = input(false, { transform: booleanAttribute });

  protected readonly widthStyle = computed(() => toCssSize(this.width()));
  protected readonly heightStyle = computed(() => toCssSize(this.height()));

  protected readonly classes = computed(() =>
    clsx(
      'andes-skeleton-element',
      'andes-skeleton-node',
      'andes-skeleton-fill',
      this.active() && 'andes-skeleton-fill--active',
    ),
  );
}
