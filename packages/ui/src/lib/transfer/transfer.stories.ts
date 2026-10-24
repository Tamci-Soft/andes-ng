import { signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesTransfer, type AndesTransferItem } from './transfer';

const text =
  'font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;';
const caption =
  'font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); font-family: var(--andes-font-family), sans-serif;';

const permissions: AndesTransferItem[] = [
  { key: 'invoices.read', title: 'View invoices', description: 'Billing' },
  { key: 'invoices.write', title: 'Create invoices', description: 'Billing' },
  { key: 'invoices.void', title: 'Void invoices', description: 'Billing' },
  { key: 'stock.read', title: 'View stock', description: 'Warehouse' },
  { key: 'stock.adjust', title: 'Adjust stock', description: 'Warehouse' },
  {
    key: 'orders.read',
    title: 'View purchase orders',
    description: 'Purchasing',
  },
  {
    key: 'orders.approve',
    title: 'Approve purchase orders',
    description: 'Purchasing',
  },
  { key: 'reports.read', title: 'View reports', description: 'Reporting' },
  {
    key: 'users.manage',
    title: 'Manage users',
    description: 'Administration',
    disabled: true,
  },
];

const warehouses: AndesTransferItem[] = [
  { key: 'lim', title: 'Lima central' },
  { key: 'ari', title: 'Arequipa' },
  { key: 'tru', title: 'Trujillo' },
  { key: 'cus', title: 'Cusco' },
  { key: 'pur', title: 'Piura' },
  { key: 'iqu', title: 'Iquitos' },
];

const products: AndesTransferItem[] = Array.from({ length: 120 }, (_, i) => ({
  key: `sku-${i + 1}`,
  title: `Product ${String(i + 1).padStart(3, '0')}`,
  description: `SKU-${1000 + i}`,
}));

const meta: Meta<AndesTransfer> = {
  title: 'Transfer',
  component: AndesTransfer,
  tags: ['autodocs'],
  argTypes: {
    showSearch: { control: 'boolean' },
    oneWay: { control: 'boolean' },
    showSelectAll: { control: 'boolean' },
    disabled: { control: 'boolean' },
    status: { control: 'select', options: [undefined, 'error', 'warning'] },
  },
  args: {
    showSearch: false,
    oneWay: false,
    showSelectAll: true,
    disabled: false,
    status: undefined,
  },
  render: (args) => ({
    props: {
      ...args,
      permissionItems: permissions,
      chosenPermissions: signal<readonly string[]>(['invoices.read']),
    },
    template: `<andes-transfer aria-label="Role permissions" [dataSource]="permissionItems" [(targetKeys)]="chosenPermissions" [showSearch]="showSearch" [oneWay]="oneWay" [showSelectAll]="showSelectAll" [disabled]="disabled" [status]="status" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesTransfer>;

export const Default: Story = {};

/** Each list has its own search box; hidden items keep their selection. */
export const Search: Story = {
  render: () => ({
    props: {
      permissionItems: permissions,
      chosen: signal<readonly string[]>(['stock.read']),
    },
    template: `<andes-transfer aria-label="Role permissions" showSearch searchPlaceholder="Search permissions" [dataSource]="permissionItems" [(targetKeys)]="chosen" />`,
  }),
};

/**
 * `filterOption` decides what a search matches. This one matches the start of the group
 * shown in the description.
 */
export const CustomSearchMatch: Story = {
  render: () => ({
    props: {
      permissionItems: permissions,
      chosen: signal<readonly string[]>([]),
      byGroup: (query: string, item: AndesTransferItem) =>
        (item.description ?? '').toLowerCase().startsWith(query.toLowerCase()),
    },
    template: `<andes-transfer aria-label="Role permissions" showSearch searchPlaceholder="Type a group" [dataSource]="permissionItems" [(targetKeys)]="chosen" [filterOption]="byGroup" />`,
  }),
};

export const DisabledItems: Story = {
  render: () => ({
    props: {
      permissionItems: permissions,
      chosen: signal<readonly string[]>(['users.manage']),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <span style="${caption}">"Manage users" is disabled: it can't be selected or moved.</span>
        <andes-transfer aria-label="Role permissions" [dataSource]="permissionItems" [(targetKeys)]="chosen" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    props: {
      permissionItems: permissions,
      chosen: signal<readonly string[]>(['invoices.read', 'stock.read']),
    },
    template: `<andes-transfer aria-label="Role permissions" disabled [dataSource]="permissionItems" [(targetKeys)]="chosen" />`,
  }),
};

/** Target items are removed with their x button; they can't be selected. */
export const OneWay: Story = {
  render: () => ({
    props: {
      warehouseItems: warehouses,
      chosen: signal<readonly string[]>(['lim', 'cus']),
    },
    template: `<andes-transfer aria-label="Warehouses" oneWay [titles]="['Warehouses', 'Assigned']" [dataSource]="warehouseItems" [(targetKeys)]="chosen" />`,
  }),
};

/** Long lists are paged per list; "select all" still covers every page. */
export const Pagination: Story = {
  render: () => ({
    props: {
      productItems: products,
      chosen: signal<readonly string[]>(['sku-3', 'sku-4']),
    },
    template: `<andes-transfer aria-label="Products" showSearch [pagination]="{ pageSize: 8 }" [titles]="['Catalog', 'Promotion']" [dataSource]="productItems" [(targetKeys)]="chosen" />`,
  }),
};

export const Status: Story = {
  render: () => ({
    props: {
      warehouseItems: warehouses,
      none: signal<readonly string[]>([]),
      some: signal<readonly string[]>(['lim']),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <andes-transfer aria-label="Warehouses, error" status="error" [dataSource]="warehouseItems" [(targetKeys)]="none" />
        <andes-transfer aria-label="Warehouses, warning" status="warning" [dataSource]="warehouseItems" [(targetKeys)]="some" />
      </div>
    `,
  }),
};

/** `render` draws each item; here with a secondary line and a trailing badge. */
export const CustomItem: Story = {
  render: () => ({
    props: {
      productItems: products.slice(0, 12),
      chosen: signal<readonly string[]>([]),
    },
    template: `
      <ng-template #productRow let-item let-direction="direction">
        <span style="display: flex; justify-content: space-between; gap: 0.5rem; width: 100%;">
          <span>{{ item.title }}<br /><span style="${caption}">{{ item.description }}</span></span>
          <span style="${caption} align-self: center;">{{ direction === 'target' ? 'on offer' : 'in stock' }}</span>
        </span>
      </ng-template>
      <andes-transfer aria-label="Products" [dataSource]="productItems" [(targetKeys)]="chosen" [render]="productRow" />
    `,
  }),
};

/** `footer` draws under each list and receives its side and visible items. */
export const CustomFooter: Story = {
  render: () => ({
    props: {
      warehouseItems: warehouses,
      chosen: signal<readonly string[]>(['lim']),
    },
    template: `
      <ng-template #listFooter let-direction let-visible="items">
        <span style="${caption}">{{ visible.length }} in {{ direction === 'source' ? 'the pool' : 'this plan' }}</span>
      </ng-template>
      <andes-transfer aria-label="Warehouses" [dataSource]="warehouseItems" [(targetKeys)]="chosen" [footer]="listFooter" />
    `,
  }),
};

export const CustomOperations: Story = {
  render: () => ({
    props: {
      warehouseItems: warehouses,
      chosen: signal<readonly string[]>([]),
    },
    template: `<andes-transfer aria-label="Warehouses" [operations]="['Assign', 'Unassign']" [titles]="['Warehouses', 'Assigned']" [dataSource]="warehouseItems" [(targetKeys)]="chosen" />`,
  }),
};

/** Size the lists with `--andes-transfer-list-width` and `--andes-transfer-list-height`. */
export const ListSize: Story = {
  render: () => ({
    props: {
      warehouseItems: warehouses,
      chosen: signal<readonly string[]>(['ari']),
    },
    template: `<andes-transfer aria-label="Warehouses" style="--andes-transfer-list-width: 20rem; --andes-transfer-list-height: 14rem;" [dataSource]="warehouseItems" [(targetKeys)]="chosen" />`,
  }),
};

export const CustomEmptyState: Story = {
  render: () => ({
    props: {
      warehouseItems: warehouses,
      chosen: signal<readonly string[]>([
        'lim',
        'ari',
        'tru',
        'cus',
        'pur',
        'iqu',
      ]),
    },
    template: `
      <ng-template #nothing let-direction>
        <span style="${text}">{{ direction === 'source' ? 'Every warehouse is assigned.' : 'No warehouse assigned yet.' }}</span>
      </ng-template>
      <andes-transfer aria-label="Warehouses" [dataSource]="warehouseItems" [(targetKeys)]="chosen" [empty]="nothing" />
    `,
  }),
};

/** Moves, selection and search are all reported; the keys are two-way bindable. */
export const Events: Story = {
  render: () => ({
    props: {
      warehouseItems: warehouses,
      chosen: signal<readonly string[]>([]),
      picked: signal<readonly string[]>([]),
      log: signal<readonly string[]>([]),
      note: (log: readonly string[], line: string) => [...log, line].slice(-4),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-transfer aria-label="Warehouses" showSearch
          [dataSource]="warehouseItems" [(targetKeys)]="chosen" [(selectedKeys)]="picked"
          (transferred)="log.set(note(log(), 'moved ' + $event.moveKeys.join(', ') + ' to the ' + $event.direction + ' list'))"
          (searched)="log.set(note(log(), 'searched the ' + $event.direction + ' list for ' + $event.value))" />
        <span style="${text}">Selected: {{ picked().join(', ') || 'none' }} | Target: {{ chosen().join(', ') || 'none' }}</span>
        @for (line of log(); track $index) {
          <span style="${caption}">{{ line }}</span>
        }
      </div>
    `,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: {
      warehouseItems: warehouses,
      assigned: new FormControl<readonly string[]>(['lim']),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-transfer aria-label="Warehouses" [dataSource]="warehouseItems" [formControl]="assigned" />
        <span style="${text}">Control value: {{ assigned.value?.join(', ') || 'empty' }}</span>
      </div>
    `,
  }),
};
