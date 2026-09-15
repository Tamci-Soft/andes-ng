import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

export type AndesSkeletonShape = 'text' | 'circular' | 'rectangular';

@Component({
  selector: 'andes-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Purely decorative: it stands in for content that hasn't loaded yet, so a screen reader
    // must not announce it (or, worse, read a class name for it). Per the component research
    // (docs/research/components/skeleton.md#6), neither shadcn/ui nor Ant Design documents an
    // ARIA pattern for this component, so andes-ng picks one explicitly: the skeleton itself
    // stays aria-hidden, and a consumer who wants a loading announcement wraps the region
    // containing one or more andes-skeleton elements in role="status" aria-live="polite"
    // aria-busy="true" with an sr-only label of its own.
    '[attr.aria-hidden]': 'true',
  },
})
export class AndesSkeleton {
  readonly shape = input<AndesSkeletonShape>('text');
  readonly width = input<string | number | undefined>(undefined);
  readonly height = input<string | number | undefined>(undefined);
  readonly animated = input(true, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    clsx(
      'andes-skeleton',
      `andes-skeleton--${this.shape()}`,
      !this.animated() && 'andes-skeleton--static',
    ),
  );

  protected readonly widthStyle = computed(() => toCssSize(this.width()));
  protected readonly heightStyle = computed(() => toCssSize(this.height()));
}

function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === 'number' ? `${value}px` : value;
}
