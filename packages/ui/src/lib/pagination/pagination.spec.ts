import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesPagination } from './pagination';

@Component({
  imports: [AndesPagination],
  template: `<andes-pagination
    [currentPage]="currentPage()"
    [totalPages]="totalPages()"
    [totalItems]="totalItems()"
    [pageSize]="pageSize()"
    [siblingCount]="siblingCount()"
    [boundaryCount]="boundaryCount()"
    [disabled]="disabled()"
    (pageChange)="onPageChange($event)"
  />`,
})
class HostComponent {
  readonly currentPage = signal(1);
  readonly totalPages = signal<number | undefined>(10);
  readonly totalItems = signal<number | undefined>(undefined);
  readonly pageSize = signal(10);
  readonly siblingCount = signal(1);
  readonly boundaryCount = signal(1);
  readonly disabled = signal(false);
  readonly pageChanges: number[] = [];

  onPageChange(page: number): void {
    this.pageChanges.push(page);
  }
}

describe('AndesPagination', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    const buttons = () =>
      Array.from(nav.querySelectorAll('button')) as HTMLButtonElement[];
    const pageButton = (label: number) =>
      buttons().find((button) => button.textContent?.trim() === String(label));
    return { fixture, nav, buttons, pageButton };
  }

  it('renders a nav with an accessible label', () => {
    const { nav } = createHost();

    expect(nav.getAttribute('aria-label')).toBe('Pagination');
  });

  it('renders page buttons with an ellipsis when there are many pages', () => {
    const { buttons } = createHost();
    const labels = buttons().map((button) => button.textContent?.trim());

    // Previous, 1 2 3 4 5, ellipsis, 10, Next
    expect(labels).toEqual(['‹', '1', '2', '3', '4', '5', '10', '›']);
  });

  it('marks the active page with aria-current="page" and no others', () => {
    const { fixture, pageButton } = createHost();
    fixture.componentInstance.currentPage.set(3);
    fixture.detectChanges();

    expect(pageButton(3)?.getAttribute('aria-current')).toBe('page');
    expect(pageButton(2)?.hasAttribute('aria-current')).toBe(false);
    expect(pageButton(10)?.hasAttribute('aria-current')).toBe(false);
  });

  it('disables the previous button on the first page', () => {
    const { fixture, buttons } = createHost();
    fixture.componentInstance.currentPage.set(1);
    fixture.detectChanges();

    const [previous, next] = [buttons()[0], buttons()[buttons().length - 1]];
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
  });

  it('disables the next button on the last page', () => {
    const { fixture, buttons } = createHost();
    fixture.componentInstance.currentPage.set(10);
    fixture.detectChanges();

    const [previous, next] = [buttons()[0], buttons()[buttons().length - 1]];
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(true);
  });

  it('emits pageChange with the clicked page number', () => {
    const { fixture, pageButton } = createHost();
    pageButton(3)?.click();

    expect(fixture.componentInstance.pageChanges).toEqual([3]);
  });

  it('emits pageChange with currentPage - 1 when previous is clicked', () => {
    const { fixture, buttons } = createHost();
    fixture.componentInstance.currentPage.set(5);
    fixture.detectChanges();

    buttons()[0].click();

    expect(fixture.componentInstance.pageChanges).toEqual([4]);
  });

  it('emits pageChange with currentPage + 1 when next is clicked', () => {
    const { fixture, buttons } = createHost();
    fixture.componentInstance.currentPage.set(5);
    fixture.detectChanges();

    buttons()[buttons().length - 1].click();

    expect(fixture.componentInstance.pageChanges).toEqual([6]);
  });

  it('does not emit when clicking previous on the first page', () => {
    const { fixture, buttons } = createHost();
    fixture.componentInstance.currentPage.set(1);
    fixture.detectChanges();

    buttons()[0].click();

    expect(fixture.componentInstance.pageChanges).toEqual([]);
  });

  it('does not emit when clicking next on the last page', () => {
    const { fixture, buttons } = createHost();
    fixture.componentInstance.currentPage.set(10);
    fixture.detectChanges();

    buttons()[buttons().length - 1].click();

    expect(fixture.componentInstance.pageChanges).toEqual([]);
  });

  it('does not emit when clicking the already-active page', () => {
    const { fixture, pageButton } = createHost();
    fixture.componentInstance.currentPage.set(3);
    fixture.detectChanges();

    pageButton(3)?.click();

    expect(fixture.componentInstance.pageChanges).toEqual([]);
  });

  it('disables every control when disabled is set', () => {
    const { fixture, buttons } = createHost();
    fixture.componentInstance.currentPage.set(5);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(buttons().every((button) => button.disabled)).toBe(true);
  });

  it('does not emit clicks while disabled', () => {
    const { fixture, pageButton } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    pageButton(2)?.click();

    expect(fixture.componentInstance.pageChanges).toEqual([]);
  });

  it('derives the page count from totalItems and pageSize when totalPages is absent', () => {
    const { fixture, pageButton } = createHost();
    fixture.componentInstance.totalPages.set(undefined);
    fixture.componentInstance.totalItems.set(45);
    fixture.componentInstance.pageSize.set(10);
    fixture.detectChanges();

    // ceil(45 / 10) = 5 pages, small enough to render with no ellipsis
    expect(pageButton(5)).toBeTruthy();
    expect(pageButton(6)).toBeFalsy();
  });

  it('shows every page with no ellipsis when few pages exist', () => {
    const { fixture, nav } = createHost();
    fixture.componentInstance.totalPages.set(4);
    fixture.detectChanges();

    const labels = Array.from(nav.querySelectorAll('button')).map((button) =>
      button.textContent?.trim(),
    );
    expect(labels).toEqual(['‹', '1', '2', '3', '4', '›']);
  });

  it('collapses the head into an ellipsis near the end of a long range', () => {
    const { fixture, nav } = createHost();
    fixture.componentInstance.currentPage.set(10);
    fixture.detectChanges();

    const labels = Array.from(nav.querySelectorAll('button')).map((button) =>
      button.textContent?.trim(),
    );
    expect(labels).toEqual(['‹', '1', '6', '7', '8', '9', '10', '›']);
  });

  it('collapses both sides into ellipses in the middle of a long range', () => {
    const { fixture, nav } = createHost();
    fixture.componentInstance.totalPages.set(20);
    fixture.componentInstance.currentPage.set(10);
    fixture.detectChanges();

    const labels = Array.from(nav.querySelectorAll('button')).map((button) =>
      button.textContent?.trim(),
    );
    expect(labels).toEqual(['‹', '1', '9', '10', '11', '20', '›']);
  });

  it('shows more sibling pages when siblingCount is increased', () => {
    const { fixture, nav } = createHost();
    fixture.componentInstance.totalPages.set(20);
    fixture.componentInstance.currentPage.set(10);
    fixture.componentInstance.siblingCount.set(2);
    fixture.detectChanges();

    const labels = Array.from(nav.querySelectorAll('button')).map((button) =>
      button.textContent?.trim(),
    );
    expect(labels).toEqual(['‹', '1', '8', '9', '10', '11', '12', '20', '›']);
  });
});
