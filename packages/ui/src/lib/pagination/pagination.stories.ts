import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesPagination } from './pagination';

const meta: Meta<AndesPagination> = {
  title: 'Pagination',
  component: AndesPagination,
  tags: ['autodocs'],
  argTypes: {
    currentPage: { control: 'number' },
    totalPages: { control: 'number' },
    totalItems: { control: 'number' },
    pageSize: { control: 'number' },
    siblingCount: { control: 'number' },
    boundaryCount: { control: 'number' },
    disabled: { control: 'boolean' },
  },
  args: {
    currentPage: 1,
    totalPages: 10,
    siblingCount: 1,
    boundaryCount: 1,
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `<andes-pagination [currentPage]="currentPage" [totalPages]="totalPages" [totalItems]="totalItems" [pageSize]="pageSize" [siblingCount]="siblingCount" [boundaryCount]="boundaryCount" [disabled]="disabled" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesPagination>;

export const Default: Story = {};

export const FewPages: Story = {
  args: { totalPages: 5, currentPage: 3 },
};

export const NearStart: Story = {
  args: { currentPage: 1 },
};

export const Middle: Story = {
  args: { totalPages: 20, currentPage: 10 },
};

export const NearEnd: Story = {
  args: { currentPage: 10 },
};

export const LargerSiblingCount: Story = {
  args: { totalPages: 20, currentPage: 10, siblingCount: 2 },
};

export const LargerBoundaryCount: Story = {
  args: { totalPages: 20, currentPage: 10, boundaryCount: 2 },
};

export const DerivedFromTotalItems: Story = {
  args: {
    totalPages: undefined,
    totalItems: 240,
    pageSize: 25,
    currentPage: 4,
  },
};

export const Disabled: Story = {
  args: { currentPage: 5, disabled: true },
};

/**
 * A fully interactive instance wired to local state, so pressing a page
 * control (or Previous/Next) actually moves `currentPage` and re-renders -
 * useful for exercising keyboard/focus behavior and the a11y panel against
 * every reachable state, not just a single static snapshot.
 */
@Component({
  selector: 'andes-pagination-demo',
  imports: [AndesPagination],
  template: `<andes-pagination
    [currentPage]="page()"
    [totalPages]="10"
    (pageChange)="page.set($event)"
  />`,
})
class AndesPaginationDemo {
  readonly page = signal(1);
}

export const Interactive: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesPaginationDemo] },
    template: `<andes-pagination-demo />`,
  }),
};
