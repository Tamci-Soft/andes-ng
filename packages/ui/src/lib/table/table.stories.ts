import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { AndesTable } from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCaption } from './table-caption';
import { AndesTableCell } from './table-cell';
import { AndesTableFooter } from './table-footer';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import { andesSortRows, type AndesSortState } from './table-sort';

const TABLE_PARTS = [
  AndesTable,
  AndesTableBody,
  AndesTableCaption,
  AndesTableCell,
  AndesTableFooter,
  AndesTableHead,
  AndesTableHeader,
  AndesTableRow,
];

interface Invoice {
  readonly id: string;
  readonly client: string;
  readonly status: 'Paid' | 'Pending' | 'Overdue';
  readonly method: string;
  readonly total: number;
}

const INVOICES: readonly Invoice[] = [
  {
    id: 'INV-001',
    client: 'Andes Mining',
    status: 'Paid',
    method: 'Credit card',
    total: 250,
  },
  {
    id: 'INV-002',
    client: 'Tamci Peru',
    status: 'Pending',
    method: 'Transfer',
    total: 150,
  },
  {
    id: 'INV-003',
    client: 'Cordillera SA',
    status: 'Overdue',
    method: 'Transfer',
    total: 350,
  },
  {
    id: 'INV-004',
    client: 'Altiplano SAC',
    status: 'Paid',
    method: 'Credit card',
    total: 150,
  },
  {
    id: 'INV-005',
    client: 'Puna Energia',
    status: 'Pending',
    method: 'PayPal',
    total: 150,
  },
];

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Holds the sort state and derives the ordered rows - i.e. exactly the few lines a
 * consumer writes around `AndesTable`. Story-only, never exported from the package.
 *
 * Three invoices share a total of $150, which makes the stable sort visible: sorting
 * by Total never shuffles INV-002 / INV-004 / INV-005 relative to each other, in
 * either direction.
 */
@Component({
  selector: 'andes-table-sorting-demo',
  imports: TABLE_PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table [(sort)]="sort">
      <caption andesTableCaption>
        Invoices — click a header to sort; Enter or Space from the keyboard
      </caption>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="id">Invoice</th>
          <th andesTableHead sortKey="client">Client</th>
          <th andesTableHead sortKey="status">Status</th>
          <th andesTableHead>Method</th>
          <th andesTableHead sortKey="total" align="end">Total</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (invoice of sortedInvoices(); track invoice.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ invoice.id }}</td>
            <td andesTableCell>{{ invoice.client }}</td>
            <td andesTableCell>{{ invoice.status }}</td>
            <td andesTableCell>{{ invoice.method }}</td>
            <td andesTableCell align="end">{{ money(invoice.total) }}</td>
          </tr>
        }
      </tbody>
      <tfoot andesTableFooter>
        <tr andesTableRow>
          <td andesTableCell colspan="4">Total</td>
          <td andesTableCell align="end">{{ money(total()) }}</td>
        </tr>
      </tfoot>
    </andes-table>
    <p class="andes-table-demo__state">
      Sort state: <code>{{ sortLabel() }}</code>
    </p>
  `,
  styles: `
    .andes-table-demo__state {
      margin-block-start: var(--andes-space-4);
      color: var(--andes-color-muted-foreground);
      font-family: var(--andes-font-family), sans-serif;
      font-size: 0.875rem;
    }
  `,
})
class AndesTableSortingDemo {
  readonly sort = signal<AndesSortState | null>(null);

  readonly sortedInvoices = computed(() =>
    andesSortRows(INVOICES, this.sort(), {
      id: (invoice) => invoice.id,
      client: (invoice) => invoice.client,
      status: (invoice) => invoice.status,
      total: (invoice) => invoice.total,
    }),
  );

  readonly total = computed(() =>
    INVOICES.reduce((sum, invoice) => sum + invoice.total, 0),
  );

  readonly sortLabel = computed(() => {
    const sort = this.sort();
    return sort ? `${sort.columnId} / ${sort.direction}` : 'none';
  });

  protected readonly money = money;
}

const STATIC_TABLE = `
  <andes-table [bordered]="bordered" [density]="density" [rowHover]="rowHover" [captionSide]="captionSide">
    <caption andesTableCaption>A list of recent invoices</caption>
    <thead andesTableHeader>
      <tr andesTableRow>
        <th andesTableHead>Invoice</th>
        <th andesTableHead>Client</th>
        <th andesTableHead>Status</th>
        <th andesTableHead align="end">Total</th>
      </tr>
    </thead>
    <tbody andesTableBody>
      <tr andesTableRow>
        <td andesTableCell>INV-001</td>
        <td andesTableCell>Andes Mining</td>
        <td andesTableCell>Paid</td>
        <td andesTableCell align="end">$250.00</td>
      </tr>
      <tr andesTableRow>
        <td andesTableCell>INV-002</td>
        <td andesTableCell>Tamci Peru</td>
        <td andesTableCell>Pending</td>
        <td andesTableCell align="end">$150.00</td>
      </tr>
      <tr andesTableRow>
        <td andesTableCell>INV-003</td>
        <td andesTableCell>Cordillera SA</td>
        <td andesTableCell>Overdue</td>
        <td andesTableCell align="end">$350.00</td>
      </tr>
    </tbody>
    <tfoot andesTableFooter>
      <tr andesTableRow>
        <td andesTableCell colspan="3">Total</td>
        <td andesTableCell align="end">$750.00</td>
      </tr>
    </tfoot>
  </andes-table>
`;

const meta: Meta<AndesTable> = {
  title: 'Table',
  component: AndesTable,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [...TABLE_PARTS, AndesTableSortingDemo] }),
  ],
  argTypes: {
    bordered: { control: 'boolean' },
    density: {
      control: 'select',
      options: ['compact', 'default', 'comfortable'],
    },
    rowHover: { control: 'boolean' },
    captionSide: { control: 'select', options: ['top', 'bottom'] },
  },
  args: {
    bordered: false,
    density: 'default',
    rowHover: true,
    captionSide: 'bottom',
  },
  render: (args) => ({
    props: args,
    template: STATIC_TABLE,
  }),
};

export default meta;

type Story = StoryObj<AndesTable>;

export const Default: Story = {};

export const Bordered: Story = {
  args: { bordered: true },
};

export const CaptionOnTop: Story = {
  args: { captionSide: 'top' },
};

export const WithoutRowHover: Story = {
  args: { rowHover: false },
};

export const Densities: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 2rem;">
        <andes-table density="compact">
          <caption andesTableCaption>Compact</caption>
          <thead andesTableHeader>
            <tr andesTableRow><th andesTableHead>Client</th><th andesTableHead align="end">Total</th></tr>
          </thead>
          <tbody andesTableBody>
            <tr andesTableRow><td andesTableCell>Andes Mining</td><td andesTableCell align="end">$250.00</td></tr>
            <tr andesTableRow><td andesTableCell>Tamci Peru</td><td andesTableCell align="end">$150.00</td></tr>
          </tbody>
        </andes-table>
        <andes-table density="default">
          <caption andesTableCaption>Default</caption>
          <thead andesTableHeader>
            <tr andesTableRow><th andesTableHead>Client</th><th andesTableHead align="end">Total</th></tr>
          </thead>
          <tbody andesTableBody>
            <tr andesTableRow><td andesTableCell>Andes Mining</td><td andesTableCell align="end">$250.00</td></tr>
            <tr andesTableRow><td andesTableCell>Tamci Peru</td><td andesTableCell align="end">$150.00</td></tr>
          </tbody>
        </andes-table>
        <andes-table density="comfortable">
          <caption andesTableCaption>Comfortable</caption>
          <thead andesTableHeader>
            <tr andesTableRow><th andesTableHead>Client</th><th andesTableHead align="end">Total</th></tr>
          </thead>
          <tbody andesTableBody>
            <tr andesTableRow><td andesTableCell>Andes Mining</td><td andesTableCell align="end">$250.00</td></tr>
            <tr andesTableRow><td andesTableCell>Tamci Peru</td><td andesTableCell align="end">$150.00</td></tr>
          </tbody>
        </andes-table>
      </div>
    `,
  }),
};

export const RowHeaders: Story = {
  render: () => ({
    template: `
      <andes-table bordered>
        <caption andesTableCaption>Quarterly revenue by region</caption>
        <thead andesTableHeader>
          <tr andesTableRow>
            <td andesTableCell></td>
            <th andesTableHead align="end">Q1</th>
            <th andesTableHead align="end">Q2</th>
          </tr>
        </thead>
        <tbody andesTableBody>
          <tr andesTableRow>
            <th andesTableHead scope="row">North</th>
            <td andesTableCell align="end">$1,200.00</td>
            <td andesTableCell align="end">$1,450.00</td>
          </tr>
          <tr andesTableRow>
            <th andesTableHead scope="row">South</th>
            <td andesTableCell align="end">$980.00</td>
            <td andesTableCell align="end">$1,120.00</td>
          </tr>
        </tbody>
      </andes-table>
    `,
  }),
};

export const Sortable: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({
    template: `<andes-table-sorting-demo />`,
  }),
};
