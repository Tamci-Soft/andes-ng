import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

import { toCssSize } from './skeleton-utils';

@Component({
  selector: 'andes-skeleton-image',
  template: `<span
    data-slot="skeleton-image"
    [class]="classes()"
    [style.width]="widthStyle()"
    [style.height]="heightStyle()"
  >
    <svg
      class="andes-skeleton-image__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  </span>`,
  styleUrls: ['./skeleton-fill.css', './skeleton-element.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-hidden]': 'true',
  },
})
export class AndesSkeletonImage {
  /** Numbers are pixels. Defaults to a 6rem square. */
  readonly width = input<string | number | undefined>(undefined);
  readonly height = input<string | number | undefined>(undefined);
  readonly active = input(false, { transform: booleanAttribute });

  protected readonly widthStyle = computed(() => toCssSize(this.width()));
  protected readonly heightStyle = computed(() => toCssSize(this.height()));

  protected readonly classes = computed(() =>
    clsx(
      'andes-skeleton-element',
      'andes-skeleton-image',
      'andes-skeleton-fill',
      this.active() && 'andes-skeleton-fill--active',
    ),
  );
}
