import { JsonPipe, NgTemplateOutlet } from '@angular/common';
import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesPagination, AndesPaginationChange } from './pagination';

const meta: Meta<AndesPagination> = {
  title: 'Pagination',
  component: AndesPagination,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [NgTemplateOutlet] })],
  argTypes: {
    current: { control: 'number' },
    pageSize: { control: 'number' },
    total: { control: 'number' },
    totalPages: { control: 'number' },
    siblingCount: { control: 'number' },
    boundaryCount: { control: 'number' },
    disabled: { control: 'boolean' },
    showLessItems: { control: 'boolean' },
    showPrevNextJumpers: { control: 'boolean' },
    showTitle: { control: 'boolean' },
    hideOnSinglePage: { control: 'boolean' },
    showSizeChanger: { control: 'boolean' },
    showQuickJumper: { control: 'boolean' },
    responsive: { control: 'boolean' },
    size: {
      control: 'inline-radio',
      options: ['small', 'default', 'medium', 'large'],
    },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
  },
  args: {
    current: 1,
    totalPages: 10,
    siblingCount: 1,
    boundaryCount: 1,
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `<andes-pagination
      [current]="current"
      [pageSize]="pageSize ?? 10"
      [total]="total ?? 0"
      [totalPages]="totalPages"
      [siblingCount]="siblingCount ?? 1"
      [boundaryCount]="boundaryCount ?? 1"
      [disabled]="disabled"
      [showLessItems]="showLessItems"
      [showPrevNextJumpers]="showPrevNextJumpers ?? true"
      [showTitle]="showTitle ?? true"
      [hideOnSinglePage]="hideOnSinglePage"
      [showSizeChanger]="showSizeChanger"
      [showQuickJumper]="showQuickJumper"
      [goButton]="goButton ?? false"
      [simple]="simple ?? false"
      [responsive]="responsive"
      [size]="size ?? 'default'"
      [align]="align ?? 'start'"
    />`,
  }),
};

export default meta;

type Story = StoryObj<AndesPagination>;

export const Default: Story = {};

export const FewPages: Story = {
  args: { totalPages: 5, current: 3 },
};

export const NearStart: Story = {
  args: { current: 1 },
};

export const Middle: Story = {
  args: { totalPages: 20, current: 10 },
};

export const NearEnd: Story = {
  args: { current: 10 },
};

export const LargerSiblingCount: Story = {
  args: { totalPages: 20, current: 10, siblingCount: 2 },
};

export const LargerBoundaryCount: Story = {
  args: { totalPages: 20, current: 10, boundaryCount: 2 },
};

/** Page count derived from `total` / `pageSize` instead of an explicit `totalPages`. */
export const DerivedFromTotal: Story = {
  args: { totalPages: undefined, total: 240, pageSize: 25, current: 4 },
};

export const Disabled: Story = {
  args: {
    current: 5,
    disabled: true,
    showSizeChanger: true,
    showQuickJumper: true,
  },
};

/** Collapsed ranges become jump buttons (5 pages; 3 with `showLessItems`). */
export const PrevNextJumpers: Story = {
  args: { totalPages: 50, current: 25 },
};

export const WithoutJumpers: Story = {
  args: { totalPages: 50, current: 25, showPrevNextJumpers: false },
};

export const ShowLessItems: Story = {
  args: { totalPages: 50, current: 25, siblingCount: 2, showLessItems: true },
};

/**
 * Minimal native `<select>` size changer (swap for AndesSelect once it lands). It
 * also appears automatically when `total` exceeds `totalBoundaryShowSizeChanger` (50).
 */
export const SizeChanger: Story = {
  args: {
    totalPages: undefined,
    total: 500,
    current: 3,
    showSizeChanger: true,
  },
};

export const QuickJumper: Story = {
  args: { totalPages: undefined, total: 500, showQuickJumper: true },
};

export const QuickJumperWithGoButton: Story = {
  args: {
    totalPages: undefined,
    total: 500,
    showQuickJumper: true,
    goButton: true,
  },
};

export const Simple: Story = {
  args: { totalPages: undefined, total: 500, current: 2, simple: true },
};

export const SimpleReadOnly: Story = {
  args: {
    totalPages: undefined,
    total: 500,
    current: 2,
    simple: { readOnly: true },
  },
};

export const Small: Story = {
  args: {
    totalPages: undefined,
    total: 500,
    current: 4,
    size: 'small',
    showSizeChanger: true,
    showQuickJumper: true,
  },
};

export const Large: Story = {
  args: {
    totalPages: undefined,
    total: 500,
    current: 4,
    size: 'large',
    showSizeChanger: true,
    showQuickJumper: true,
    goButton: true,
  },
};

/** The three control heights side by side: 24, 32 and 40px. */
export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 1rem;">
        <andes-pagination [total]="500" [current]="4" size="small" [showSizeChanger]="true" [showQuickJumper]="true" aria-label="Small" />
        <andes-pagination [total]="500" [current]="4" [showSizeChanger]="true" [showQuickJumper]="true" aria-label="Default" />
        <andes-pagination [total]="500" [current]="4" size="large" [showSizeChanger]="true" [showQuickJumper]="true" aria-label="Large" />
      </div>`,
  }),
};

/**
 * In editable simple mode, a quick-jumper go button confirms the typed page instead of
 * Enter-or-blur; blurring keeps the text until the button is pressed.
 */
export const SimpleWithGoButton: Story = {
  args: {
    totalPages: undefined,
    total: 500,
    current: 2,
    simple: true,
    showQuickJumper: true,
    goButton: true,
  },
};

/** Resize the viewport below 576px to collapse into the small, simple layout. */
export const Responsive: Story = {
  args: {
    totalPages: undefined,
    total: 500,
    current: 4,
    responsive: true,
    showSizeChanger: true,
  },
};

/** Renders nothing: there is only one page. */
export const HideOnSinglePage: Story = {
  args: { totalPages: undefined, total: 8, hideOnSinglePage: true },
};

/** `total` of 0: no page items, every control disabled. */
export const Empty: Story = {
  args: {
    totalPages: undefined,
    total: 0,
    showQuickJumper: true,
    showSizeChanger: true,
  },
};

export const Align: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    template: `
      <div style="display: grid; gap: 1rem; width: 100%;">
        <andes-pagination [total]="50" align="start" aria-label="Start aligned" />
        <andes-pagination [total]="50" align="center" aria-label="Center aligned" />
        <andes-pagination [total]="50" align="end" aria-label="End aligned" />
      </div>`,
  }),
};

/**
 * `showTotal` takes a template, or a `(total, range) => string` function when plain
 * text is enough.
 */
export const ShowTotal: Story = {
  render: () => ({
    props: {
      totalText: (total: number, range: [number, number]) =>
        `${range[0]}-${range[1]} of ${total} records`,
    },
    template: `
      <div style="display: grid; gap: 1rem;">
        <andes-pagination [total]="85" [current]="2" [showTotal]="totalTpl" aria-label="Total" />
        <andes-pagination [total]="85" [current]="2" [showTotal]="rangeTpl" aria-label="Range" />
        <andes-pagination [total]="85" [current]="2" [showTotal]="totalText" aria-label="Function" />
      </div>
      <ng-template #totalTpl let-total>Total {{ total }} items</ng-template>
      <ng-template #rangeTpl let-total let-range="range">{{ range[0] }}-{{ range[1] }} of {{ total }} items</ng-template>`,
  }),
};

/**
 * `itemRender` replaces the content of each control. The pagination keeps the
 * focusable button, its aria-label and aria-current; `originalElement` renders the
 * default content.
 */
export const ItemRender: Story = {
  render: () => ({
    template: `
      <andes-pagination [total]="500" [current]="3" [itemRender]="itemTpl" />
      <ng-template #itemTpl let-page let-type="type" let-originalElement="originalElement">
        @if (type === 'prev') {
          <span>Previous</span>
        } @else if (type === 'next') {
          <span>Next</span>
        } @else {
          <ng-container *ngTemplateOutlet="originalElement; context: { $implicit: page, type: type }" />
        }
      </ng-template>`,
  }),
};

/** Every visible and accessible label is its own input, so it can be localized. */
export const CustomLabels: Story = {
  render: () => ({
    template: `<andes-pagination
      [total]="500"
      [current]="10"
      [showSizeChanger]="true"
      [showQuickJumper]="true"
      goButton
      aria-label="Paginación"
      previousLabel="Página anterior"
      nextLabel="Página siguiente"
      pageLabel="Página"
      jumpPrevLabel="{count} páginas anteriores"
      jumpNextLabel="{count} páginas siguientes"
      itemsPerPageLabel="/ página"
      pageSizeLabel="Elementos por página"
      jumpToLabel="Ir a"
      jumpToSuffixLabel="página"
      jumpToConfirmLabel="Ir"
    />`,
  }),
};

/**
 * `sizeChangerRender` swaps the built-in page-size select for any control. Its
 * `change(size)` applies the size exactly like the built-in one (clamping the page
 * and emitting both events); `size` and `disabled` let it match the pagination.
 */
export const CustomSizeChanger: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesButton] },
    template: `
      <andes-pagination [total]="500" [current]="3" [showSizeChanger]="true" [sizeChangerRender]="sizeTpl" />
      <ng-template
        #sizeTpl
        let-pageSize
        let-options="options"
        let-disabled="disabled"
        let-label="label"
        let-change="change"
      >
        <span role="group" [attr.aria-label]="label" style="display: inline-flex; gap: 0.25rem;">
          @for (option of options; track option) {
            <andes-button
              size="sm"
              [variant]="option === pageSize ? 'primary' : 'outline'"
              [disabled]="disabled"
              [aria-label]="option + ' per page' + (option === pageSize ? ' (current)' : '')"
              (click)="change(option)"
              >{{ option }}</andes-button
            >
          }
        </span>
      </ng-template>`,
  }),
};

/**
 * Fully wired to local state through `[(current)]` / `[(pageSize)]`, so every control
 * (pages, jumpers, size changer, quick jumper) actually moves the state - useful for
 * exercising keyboard/focus behavior and the a11y panel against every reachable state.
 */
@Component({
  selector: 'andes-pagination-demo',
  imports: [AndesPagination, JsonPipe],
  template: `<div style="display: grid; gap: 1rem;">
    <andes-pagination
      [(current)]="page"
      [(pageSize)]="pageSize"
      [total]="500"
      [showSizeChanger]="true"
      [showQuickJumper]="true"
      [showTotal]="totalTpl"
      (pageChange)="lastChange.set($event)"
    />
    <ng-template #totalTpl let-total let-range="range"
      >{{ range[0] }}-{{ range[1] }} of {{ total }}</ng-template
    >
    <output
      style="font-family: monospace; font-size: 0.875rem; color: var(--andes-color-foreground);"
    >
      current={{ page() }} pageSize={{ pageSize() }} lastChange={{
        lastChange() | json
      }}
    </output>
  </div>`,
})
class AndesPaginationDemo {
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly lastChange = signal<AndesPaginationChange | null>(null);
}

export const Interactive: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesPaginationDemo] },
    template: `<andes-pagination-demo />`,
  }),
};
