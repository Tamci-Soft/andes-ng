import { getAndesPaginationRange } from './pagination-range';

describe('getAndesPaginationRange', () => {
  it('renders every page with no ellipsis when the whole range already fits', () => {
    expect(getAndesPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getAndesPaginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('renders every page with no ellipsis when totalPages is 1', () => {
    expect(getAndesPaginationRange(1, 1)).toEqual([1]);
  });

  it('renders every page with no ellipsis when totalPages is 2', () => {
    expect(getAndesPaginationRange(1, 2)).toEqual([1, 2]);
    expect(getAndesPaginationRange(2, 2)).toEqual([1, 2]);
  });

  it('collapses the tail into an end-ellipsis when the current page is near the start', () => {
    expect(getAndesPaginationRange(1, 10)).toEqual([
      1,
      2,
      3,
      4,
      5,
      'end-ellipsis',
      10,
    ]);
    expect(getAndesPaginationRange(2, 10)).toEqual([
      1,
      2,
      3,
      4,
      5,
      'end-ellipsis',
      10,
    ]);
  });

  it('collapses the head into a start-ellipsis when the current page is near the end', () => {
    expect(getAndesPaginationRange(10, 10)).toEqual([
      1,
      'start-ellipsis',
      6,
      7,
      8,
      9,
      10,
    ]);
    expect(getAndesPaginationRange(9, 10)).toEqual([
      1,
      'start-ellipsis',
      6,
      7,
      8,
      9,
      10,
    ]);
  });

  it('collapses both sides into ellipses when the current page is in the middle', () => {
    expect(getAndesPaginationRange(5, 10)).toEqual([
      1,
      'start-ellipsis',
      4,
      5,
      6,
      'end-ellipsis',
      10,
    ]);
  });

  it('shows the exact page instead of an ellipsis when the gap is exactly one page', () => {
    // boundary page 1, then page 2 sits right next to sibling range starting at 3 -
    // a one-page gap is filled in directly rather than spent on an ellipsis.
    expect(getAndesPaginationRange(4, 7, 1, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('respects a larger siblingCount', () => {
    expect(getAndesPaginationRange(10, 20, 2, 1)).toEqual([
      1,
      'start-ellipsis',
      8,
      9,
      10,
      11,
      12,
      'end-ellipsis',
      20,
    ]);
  });

  it('respects a larger boundaryCount', () => {
    expect(getAndesPaginationRange(10, 20, 1, 2)).toEqual([
      1,
      2,
      'start-ellipsis',
      9,
      10,
      11,
      'end-ellipsis',
      19,
      20,
    ]);
  });

  it('supports siblingCount and boundaryCount of 0', () => {
    expect(getAndesPaginationRange(5, 10, 0, 0)).toEqual([
      'start-ellipsis',
      5,
      'end-ellipsis',
    ]);
  });

  it('never produces duplicate page numbers', () => {
    for (let totalPages = 1; totalPages <= 25; totalPages++) {
      for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        const items = getAndesPaginationRange(currentPage, totalPages);
        const pageNumbers = items.filter(
          (item): item is number => typeof item === 'number',
        );
        expect(new Set(pageNumbers).size).toBe(pageNumbers.length);
        expect(Math.min(...pageNumbers)).toBe(1);
        expect(Math.max(...pageNumbers)).toBe(totalPages);
      }
    }
  });

  it('clamps a currentPage below 1 or above totalPages', () => {
    expect(getAndesPaginationRange(0, 5)).toEqual(
      getAndesPaginationRange(1, 5),
    );
    expect(getAndesPaginationRange(99, 5)).toEqual(
      getAndesPaginationRange(5, 5),
    );
  });

  it('floors a fractional totalPages and treats a non-positive one as 1', () => {
    expect(getAndesPaginationRange(1, 5.9)).toEqual([1, 2, 3, 4, 5]);
    expect(getAndesPaginationRange(1, 0)).toEqual([1]);
    expect(getAndesPaginationRange(1, -3)).toEqual([1]);
  });
});
