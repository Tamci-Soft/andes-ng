import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
  output,
} from '@angular/core';

import { AndesButton } from '../button/button';
import {
  AndesPaginationItem,
  getAndesPaginationRange,
} from './pagination-range';

export type { AndesPaginationItem } from './pagination-range';

@Component({
  selector: 'andes-pagination',
  imports: [AndesButton],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesPagination {
  /** 1-indexed page currently being displayed. */
  readonly currentPage = input.required<number>();

  /**
   * Total number of pages. Takes precedence over `totalItems`/`pageSize`
   * when provided.
   */
  readonly totalPages = input<number | undefined>(undefined);

  /** Total item count, used together with `pageSize` to derive the page count. */
  readonly totalItems = input<number | undefined>(undefined);

  /** Items per page, used together with `totalItems`. */
  readonly pageSize = input(10, { transform: numberAttribute });

  /** Page buttons kept visible on either side of the current page. */
  readonly siblingCount = input(1, { transform: numberAttribute });

  /** Page buttons kept visible at the very start and end of the range. */
  readonly boundaryCount = input(1, { transform: numberAttribute });

  readonly disabled = input(false, { transform: booleanAttribute });

  readonly ariaLabel = input('Pagination', { alias: 'aria-label' });

  /** Emits the requested 1-indexed page whenever the user activates a control. */
  readonly pageChange = output<number>();

  protected readonly resolvedTotalPages = computed(() => {
    const explicitTotalPages = this.totalPages();
    if (explicitTotalPages !== undefined) {
      return Math.max(1, Math.trunc(explicitTotalPages) || 1);
    }

    const totalItems = this.totalItems();
    if (totalItems !== undefined) {
      const pageSize = Math.max(1, Math.trunc(this.pageSize()) || 1);
      return Math.max(1, Math.ceil(totalItems / pageSize));
    }

    return 1;
  });

  protected readonly clampedCurrentPage = computed(() =>
    Math.min(
      Math.max(1, Math.trunc(this.currentPage()) || 1),
      this.resolvedTotalPages(),
    ),
  );

  protected readonly items = computed(() =>
    getAndesPaginationRange(
      this.clampedCurrentPage(),
      this.resolvedTotalPages(),
      this.siblingCount(),
      this.boundaryCount(),
    ),
  );

  protected readonly isFirstPage = computed(
    () => this.clampedCurrentPage() <= 1,
  );

  protected readonly isLastPage = computed(
    () => this.clampedCurrentPage() >= this.resolvedTotalPages(),
  );

  protected isEllipsis(
    item: AndesPaginationItem,
  ): item is 'start-ellipsis' | 'end-ellipsis' {
    return item === 'start-ellipsis' || item === 'end-ellipsis';
  }

  protected goToPage(page: number): void {
    if (this.disabled() || page === this.clampedCurrentPage()) {
      return;
    }
    this.pageChange.emit(page);
  }

  protected goToPrevious(): void {
    if (this.disabled() || this.isFirstPage()) {
      return;
    }
    this.pageChange.emit(this.clampedCurrentPage() - 1);
  }

  protected goToNext(): void {
    if (this.disabled() || this.isLastPage()) {
      return;
    }
    this.pageChange.emit(this.clampedCurrentPage() + 1);
  }
}
