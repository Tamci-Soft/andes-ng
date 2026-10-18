import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

import { ANDES_MASONRY } from './masonry-token';

/**
 * An item projected into an `andes-masonry`. The element itself is what gets positioned, so it
 * stays in source order in the DOM.
 */
@Component({
  selector: 'andes-masonry-item',
  template: '<ng-content />',
  styleUrl: './masonry-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'listitem',
    'data-slot': 'masonry-item',
    'data-masonry-item': '',
    '[attr.data-layout]': 'masonry?.layoutMode() ?? "css"',
  },
})
export class AndesMasonryItem {
  protected readonly masonry = inject(ANDES_MASONRY, { optional: true });
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Identity for stable placement; defaults to the element itself. */
  readonly itemKey = input<string | number | undefined>(undefined);
  /** Pins the item to a column (0-based). */
  readonly column = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null || value === ''
        ? undefined
        : numberAttribute(value),
  });
  /** Estimated height in pixels, used until the item can be measured. */
  readonly height = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null || value === ''
        ? undefined
        : numberAttribute(value),
  });

  constructor() {
    effect(() => {
      this.itemKey();
      this.column();
      this.height();
      this.masonry?.requestLayout();
    });
  }
}
