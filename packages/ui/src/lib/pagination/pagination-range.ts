/**
 * A rendered pagination slot: either a concrete page number, or a collapsed
 * run of pages shown as an ellipsis. The start/end variants are kept distinct
 * (rather than a single `'ellipsis'` value) so each can be given a stable,
 * unique key when rendering a `@for` loop - at most one of each ever appears
 * in a given range.
 */
export type AndesPaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

function range(start: number, end: number): number[] {
  const length = end - start + 1;
  if (length <= 0) {
    return [];
  }
  return Array.from({ length }, (_, index) => start + index);
}

/**
 * Computes the page numbers to render around `currentPage`, collapsing the
 * rest into a leading and/or trailing ellipsis.
 *
 * - `boundaryCount` pages are always shown at the very start and end of the
 *   range (e.g. `1` and `totalPages`).
 * - `siblingCount` pages are always shown on either side of `currentPage`.
 * - When the gap between a boundary group and the sibling group is exactly
 *   one page, that page is rendered directly instead of an ellipsis - an
 *   ellipsis standing in for a single page saves no space and only adds a
 *   click. A gap of two or more pages collapses into an ellipsis.
 *
 * `currentPage` and `totalPages` are clamped/floored defensively so an
 * out-of-range or fractional value from a caller can't produce a malformed
 * range instead of just a sane fallback.
 */
export function getAndesPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
  boundaryCount = 1,
): AndesPaginationItem[] {
  const safeTotalPages = Math.max(1, Math.trunc(totalPages) || 1);
  const safeSiblingCount = Math.max(0, Math.trunc(siblingCount));
  const safeBoundaryCount = Math.max(0, Math.trunc(boundaryCount));
  const safeCurrentPage = Math.min(
    Math.max(1, Math.trunc(currentPage) || 1),
    safeTotalPages,
  );

  const startPages = range(1, Math.min(safeBoundaryCount, safeTotalPages));
  const endPages = range(
    Math.max(safeTotalPages - safeBoundaryCount + 1, safeBoundaryCount + 1),
    safeTotalPages,
  );

  const siblingsStart = Math.max(
    Math.min(
      safeCurrentPage - safeSiblingCount,
      safeTotalPages - safeBoundaryCount - safeSiblingCount * 2 - 1,
    ),
    safeBoundaryCount + 2,
  );

  const siblingsEnd = Math.min(
    Math.max(
      safeCurrentPage + safeSiblingCount,
      safeBoundaryCount + safeSiblingCount * 2 + 2,
    ),
    endPages.length > 0 ? endPages[0] - 2 : safeTotalPages - 1,
  );

  const items: AndesPaginationItem[] = [...startPages];

  if (siblingsStart > safeBoundaryCount + 2) {
    items.push('start-ellipsis');
  } else if (safeBoundaryCount + 1 < safeTotalPages - safeBoundaryCount) {
    items.push(safeBoundaryCount + 1);
  }

  items.push(...range(siblingsStart, siblingsEnd));

  if (siblingsEnd < safeTotalPages - safeBoundaryCount - 1) {
    items.push('end-ellipsis');
  } else if (safeTotalPages - safeBoundaryCount > safeBoundaryCount) {
    items.push(safeTotalPages - safeBoundaryCount);
  }

  items.push(...endPages);

  return items;
}
