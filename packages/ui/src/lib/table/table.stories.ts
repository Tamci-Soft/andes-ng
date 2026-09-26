import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesTable, type AndesTableSelectionType } from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCaption } from './table-caption';
import { AndesTableCell } from './table-cell';
import type { AndesTableRowKey } from './table-context';
import {
  andesFilterRows,
  andesPageCount,
  andesPaginateRows,
  type AndesTableFilters,
} from './table-data';
import { AndesTableEmpty } from './table-empty';
import { AndesTableExpandedRow, AndesTableExpandToggle } from './table-expand';
import { AndesTableFilter, type AndesTableFilterOption } from './table-filter';
import { AndesTableFooter } from './table-footer';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import { AndesTableSelectAll, AndesTableSelection } from './table-selection';
import { andesSortRows, type AndesSortState } from './table-sort';

const TABLE_PARTS = [
  AndesTable,
  AndesTableBody,
  AndesTableCaption,
  AndesTableCell,
  AndesTableEmpty,
  AndesTableExpandedRow,
  AndesTableExpandToggle,
  AndesTableFilter,
  AndesTableFooter,
  AndesTableHead,
  AndesTableHeader,
  AndesTableRow,
  AndesTableSelectAll,
  AndesTableSelection,
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

/** Larger, story-only data set for the interactive feature demos below. */
interface Order {
  readonly id: string;
  readonly client: string;
  readonly status: Invoice['status'];
  readonly method: string;
  readonly region: string;
  readonly owner: string;
  readonly total: number;
  readonly notes: string;
}

const ORDERS: readonly Order[] = [
  {
    id: 'ORD-101',
    client: 'Andes Mining',
    status: 'Paid',
    method: 'Credit card',
    region: 'North',
    owner: 'Lucía Paredes',
    total: 1250,
    notes:
      'Quarterly supply contract, renewed automatically every three months.',
  },
  {
    id: 'ORD-102',
    client: 'Tamci Peru',
    status: 'Pending',
    method: 'Transfer',
    region: 'Lima',
    owner: 'Jorge Quispe',
    total: 480,
    notes: 'Waiting for the purchase order number from procurement.',
  },
  {
    id: 'ORD-103',
    client: 'Cordillera SA',
    status: 'Overdue',
    method: 'Transfer',
    region: 'South',
    owner: 'Ana Huamán',
    total: 2310,
    notes: 'Second reminder sent; account on hold until settled.',
  },
  {
    id: 'ORD-104',
    client: 'Altiplano SAC',
    status: 'Paid',
    method: 'Credit card',
    region: 'South',
    owner: 'Lucía Paredes',
    total: 150,
    notes: 'Single delivery.',
  },
  {
    id: 'ORD-105',
    client: 'Puna Energia',
    status: 'Pending',
    method: 'PayPal',
    region: 'Center',
    owner: 'Rosa Mamani',
    total: 150,
    notes: 'Split into two shipments at the client’s request.',
  },
  {
    id: 'ORD-106',
    client: 'Selva Verde',
    status: 'Paid',
    method: 'Transfer',
    region: 'East',
    owner: 'Jorge Quispe',
    total: 870,
    notes: 'Includes on-site installation.',
  },
  {
    id: 'ORD-107',
    client: 'Costa Azul',
    status: 'Overdue',
    method: 'Credit card',
    region: 'Lima',
    owner: 'Ana Huamán',
    total: 95,
    notes: 'Card declined twice; new card requested.',
  },
  {
    id: 'ORD-108',
    client: 'Nevado Group',
    status: 'Paid',
    method: 'PayPal',
    region: 'North',
    owner: 'Rosa Mamani',
    total: 3020,
    notes: 'Framework agreement, first call-off.',
  },
  {
    id: 'ORD-109',
    client: 'Inca Logistics',
    status: 'Pending',
    method: 'Transfer',
    region: 'Center',
    owner: 'Lucía Paredes',
    total: 640,
    notes: 'Pricing under review.',
  },
  {
    id: 'ORD-110',
    client: 'Titicaca Foods',
    status: 'Paid',
    method: 'Credit card',
    region: 'South',
    owner: 'Jorge Quispe',
    total: 410,
    notes: 'Repeat order.',
  },
];

const DEMO_STYLES = `
  :host {
    display: block;
    width: min(56rem, calc(100vw - 2rem));
    font-family: var(--andes-font-family), sans-serif;
  }
  .demo-state {
    margin-block-start: var(--andes-space-4);
    color: var(--andes-color-muted-foreground);
    font-size: 0.875rem;
  }
  .demo-status {
    display: inline-flex;
    align-items: center;
    gap: var(--andes-space-2);
  }
  .demo-status::before {
    content: '';
    width: 0.5rem;
    height: 0.5rem;
    border-radius: var(--andes-radius-full);
    background-color: var(--andes-color-success);
  }
  .demo-status[data-status='Pending']::before {
    background-color: var(--andes-color-warning);
  }
  .demo-status[data-status='Overdue']::before {
    background-color: var(--andes-color-danger);
  }
  .demo-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--andes-space-3);
    padding-block: var(--andes-space-3);
    color: var(--andes-color-foreground);
    font-size: 0.875rem;
  }
  .demo-bar h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: var(--andes-font-weight-medium);
  }
  .demo-pager {
    display: flex;
    align-items: center;
    gap: var(--andes-space-2);
  }
`;

/**
 * Row selection: checkbox column with "select all" (indeterminate while partial),
 * a disabled row, Shift-click range selection, and the selected keys bound
 * two-way. `type="radio"` switches the same markup to single selection.
 */
@Component({
  selector: 'andes-table-selection-demo',
  imports: TABLE_PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table [selectionType]="type()" [(selectedKeys)]="selected">
      <caption andesTableCaption>
        Orders — ORD-103 is on hold and cannot be selected
      </caption>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead><andes-table-select-all /></th>
          <th andesTableHead>Order</th>
          <th andesTableHead>Client</th>
          <th andesTableHead>Status</th>
          <th andesTableHead align="end">Total</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of orders; track order.id) {
          <tr andesTableRow [rowKey]="order.id">
            <td andesTableCell>
              <andes-table-selection
                [label]="'Select ' + order.id"
                [disabled]="order.id === 'ORD-103'"
              />
            </td>
            <td andesTableCell>{{ order.id }}</td>
            <td andesTableCell>{{ order.client }}</td>
            <td andesTableCell>
              <span class="demo-status" [attr.data-status]="order.status">{{
                order.status
              }}</span>
            </td>
            <td andesTableCell align="end">{{ money(order.total) }}</td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-state">
      selectedKeys: <code>{{ selectedLabel() }}</code>
    </p>
  `,
  styles: DEMO_STYLES,
})
class AndesTableSelectionDemo {
  readonly type = input<AndesTableSelectionType>('checkbox');
  readonly selected = signal<readonly AndesTableRowKey[]>(['ORD-102']);
  readonly selectedLabel = computed(() =>
    this.selected().length ? this.selected().join(', ') : 'none',
  );
  protected readonly orders = ORDERS.slice(0, 6);
  protected readonly money = money;
}

/**
 * Expandable rows: an expand button per row, a lazily rendered detail row, and
 * optionally "expand by clicking the row".
 */
@Component({
  selector: 'andes-table-expand-demo',
  imports: TABLE_PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table [(expandedKeys)]="expanded" [expandRowByClick]="byClick()">
      <caption andesTableCaption>
        {{
          byClick()
            ? 'Click anywhere on a row to show its notes'
            : 'Use the arrow buttons to show each order’s notes'
        }}
      </caption>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead>
            <span class="andes-table__sr-only">Details</span>
          </th>
          <th andesTableHead>Order</th>
          <th andesTableHead>Client</th>
          <th andesTableHead>Owner</th>
          <th andesTableHead align="end">Total</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of orders; track order.id) {
          <tr andesTableRow [rowKey]="order.id">
            <td andesTableCell>
              <andes-table-expand-toggle [label]="'Notes for ' + order.id" />
            </td>
            <td andesTableCell>{{ order.id }}</td>
            <td andesTableCell>{{ order.client }}</td>
            <td andesTableCell>{{ order.owner }}</td>
            <td andesTableCell align="end">{{ money(order.total) }}</td>
          </tr>
          <tr *andesTableExpandedRow="order.id">
            <td andesTableCell></td>
            <td andesTableCell colspan="4">{{ order.notes }}</td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-state">
      expandedKeys: <code>{{ expanded().join(', ') || 'none' }}</code>
    </p>
  `,
  styles: DEMO_STYLES,
})
class AndesTableExpandDemo {
  readonly byClick = input(false);
  readonly expanded = signal<readonly AndesTableRowKey[]>(['ORD-102']);
  protected readonly orders = ORDERS.slice(0, 5);
  protected readonly money = money;
}

const STATUS_OPTIONS: readonly AndesTableFilterOption[] = [
  { text: 'Paid', value: 'Paid' },
  { text: 'Pending', value: 'Pending' },
  { text: 'Overdue', value: 'Overdue' },
];

const METHOD_OPTIONS: readonly AndesTableFilterOption[] = [
  { text: 'Credit card', value: 'Credit card' },
  { text: 'Transfer', value: 'Transfer' },
  { text: 'PayPal', value: 'PayPal' },
];

/**
 * Column filters combined with sorting: a multi-value menu (Status), a
 * single-value searchable menu (Method) and a fully custom panel template
 * (Client text search), plus the empty state when nothing matches.
 */
@Component({
  selector: 'andes-table-filter-demo',
  imports: [...TABLE_PARTS, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table [(filters)]="filters" [(sort)]="sort">
      <caption andesTableCaption>
        Orders — filter from the funnel buttons, sort from the headers
      </caption>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="id">Order</th>
          <th andesTableHead sortKey="client">
            Client
            <andes-table-filter
              column="client"
              label="Filter client"
              [panel]="clientSearch"
            />
          </th>
          <th andesTableHead sortKey="status">
            Status
            <andes-table-filter
              column="status"
              label="Filter status"
              [options]="statusOptions"
            />
          </th>
          <th andesTableHead>
            Method
            <andes-table-filter
              column="method"
              label="Filter method"
              [options]="methodOptions"
              [multiple]="false"
              searchable
            />
          </th>
          <th andesTableHead sortKey="total" align="end">Total</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of visible(); track order.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ order.id }}</td>
            <td andesTableCell>{{ order.client }}</td>
            <td andesTableCell>
              <span class="demo-status" [attr.data-status]="order.status">{{
                order.status
              }}</span>
            </td>
            <td andesTableCell>{{ order.method }}</td>
            <td andesTableCell align="end">{{ money(order.total) }}</td>
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="5">
              <andes-table-empty
                >No orders match these filters</andes-table-empty
              >
            </td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-state">
      filters: <code>{{ filtersLabel() }}</code>
    </p>

    <ng-template
      #clientSearch
      let-selected
      let-setSelected="setSelected"
      let-confirm="confirm"
      let-clear="clear"
    >
      <div class="client-search">
        <input
          type="search"
          class="client-search__input"
          aria-label="Client name contains"
          placeholder="Client name contains…"
          [value]="selected[0] ?? ''"
          (input)="setSelected(textValues($any($event.target).value))"
          (keydown.enter)="confirm()"
        />
        <div class="client-search__actions">
          <andes-button variant="link" size="sm" (click)="clear()"
            >Clear</andes-button
          >
          <andes-button size="sm" (click)="confirm()">Search</andes-button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [
    DEMO_STYLES,
    `
      .client-search {
        display: grid;
        gap: var(--andes-space-2);
        padding: var(--andes-space-2);
      }
      .client-search__input {
        padding-block: var(--andes-space-1);
        padding-inline: var(--andes-space-2);
        border: 1px solid var(--andes-color-input);
        border-radius: var(--andes-radius-sm);
        background-color: var(--andes-color-background);
        color: var(--andes-color-foreground);
        font-family: var(--andes-font-family), sans-serif;
        font-size: 0.875rem;
      }
      .client-search__actions {
        display: flex;
        justify-content: space-between;
      }
    `,
  ],
})
class AndesTableFilterDemo {
  readonly filters = signal<AndesTableFilters>({ status: ['Paid', 'Pending'] });
  readonly sort = signal<AndesSortState | null>(null);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly methodOptions = METHOD_OPTIONS;
  protected readonly money = money;

  readonly visible = computed(() =>
    andesSortRows(
      andesFilterRows(ORDERS, this.filters(), {
        status: (value, order) => order.status === value,
        method: (value, order) => order.method === value,
        client: (value, order) =>
          order.client.toLowerCase().includes(String(value).toLowerCase()),
      }),
      this.sort(),
      {
        id: (order) => order.id,
        client: (order) => order.client,
        status: (order) => order.status,
        total: (order) => order.total,
      },
    ),
  );

  readonly filtersLabel = computed(() => JSON.stringify(this.filters()));

  protected textValues(text: string): string[] {
    return text.trim() ? [text.trim()] : [];
  }
}

const STATUS_RANK: readonly Invoice['status'][] = [
  'Overdue',
  'Pending',
  'Paid',
];

/**
 * Multi-column sorting: each header cycles on its own and the order they were
 * activated in sets their priority. Total starts descending-first.
 */
@Component({
  selector: 'andes-table-multi-sort-demo',
  imports: TABLE_PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table multiSort [(sorts)]="sorts" density="compact">
      <caption andesTableCaption>
        Sort by Region, then Status, then Total — each header toggles
        independently
      </caption>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="region">Region</th>
          <th andesTableHead sortKey="status">Status</th>
          <th andesTableHead>Client</th>
          <th
            andesTableHead
            sortKey="total"
            align="end"
            [sortDirections]="['desc', 'asc']"
          >
            Total
          </th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of sorted(); track order.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ order.region }}</td>
            <td andesTableCell>{{ order.status }}</td>
            <td andesTableCell>{{ order.client }}</td>
            <td andesTableCell align="end">{{ money(order.total) }}</td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-state">
      sorts: <code>{{ sortsLabel() }}</code>
    </p>
  `,
  styles: DEMO_STYLES,
})
class AndesTableMultiSortDemo {
  readonly sorts = signal<readonly AndesSortState[]>([
    { columnId: 'region', direction: 'asc' },
    { columnId: 'total', direction: 'desc' },
  ]);

  readonly sorted = computed(() =>
    andesSortRows(ORDERS, this.sorts(), {
      region: (order) => order.region,
      status: {
        // A business order rather than the alphabetical one.
        compare: (a, b) =>
          STATUS_RANK.indexOf(a.status) - STATUS_RANK.indexOf(b.status),
      },
      total: (order) => order.total,
    }),
  );

  readonly sortsLabel = computed(
    () =>
      this.sorts()
        .map((sort) => `${sort.columnId} ${sort.direction}`)
        .join(' → ') || 'none',
  );

  protected readonly money = money;
}

/**
 * Scrolling: `scrollY` caps the height with a sticky header and a fixed summary
 * row; `scrollX` forces horizontal scroll with pinned selection, order and
 * action columns (edge shadows appear once content scrolls beneath them).
 */
@Component({
  selector: 'andes-table-scroll-demo',
  imports: [...TABLE_PARTS, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      scrollY="16rem"
      [scrollX]="1100"
      bordered
      [(selectedKeys)]="selected"
    >
      <caption andesTableCaption>
        Scroll inside the table: the header, summary and pinned columns stay put
      </caption>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead fixed="start">
            <andes-table-select-all />
          </th>
          <th andesTableHead fixed="start" sortKey="id">Order</th>
          <th andesTableHead>Client</th>
          <th andesTableHead>Status</th>
          <th andesTableHead>Method</th>
          <th andesTableHead>Region</th>
          <th andesTableHead>Owner</th>
          <th andesTableHead align="end">Total</th>
          <th andesTableHead fixed="end" align="center">Actions</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of orders; track order.id) {
          <tr andesTableRow [rowKey]="order.id">
            <td andesTableCell fixed="start">
              <andes-table-selection [label]="'Select ' + order.id" />
            </td>
            <td andesTableCell fixed="start">
              {{ order.id }}
            </td>
            <td andesTableCell>{{ order.client }}</td>
            <td andesTableCell>{{ order.status }}</td>
            <td andesTableCell>{{ order.method }}</td>
            <td andesTableCell>{{ order.region }}</td>
            <td andesTableCell>{{ order.owner }}</td>
            <td andesTableCell align="end">{{ money(order.total) }}</td>
            <td andesTableCell fixed="end" align="center">
              <andes-button
                variant="link"
                size="sm"
                [aria-label]="'View ' + order.id"
                >View</andes-button
              >
            </td>
          </tr>
        }
      </tbody>
      <tfoot andesTableFooter fixed>
        <tr andesTableRow>
          <td andesTableCell fixed="start"></td>
          <td andesTableCell fixed="start">Total</td>
          <td andesTableCell colspan="5"></td>
          <td andesTableCell align="end">{{ money(total) }}</td>
          <td andesTableCell fixed="end"></td>
        </tr>
      </tfoot>
    </andes-table>
  `,
  styles: DEMO_STYLES,
})
class AndesTableScrollDemo {
  readonly selected = signal<readonly AndesTableRowKey[]>([]);
  protected readonly orders = ORDERS;
  protected readonly total = ORDERS.reduce(
    (sum, order) => sum + order.total,
    0,
  );
  protected readonly money = money;
}

const PAGE_SIZE = 4;

/**
 * Pagination hook: the table has no pager of its own - a title bar goes in the
 * `andesTableTop` slot, any pager in `andesTableBottom`, and `andesPaginateRows`
 * slices the (sorted) rows. Changing page shows the loading overlay briefly, as
 * a server-backed table would.
 */
@Component({
  selector: 'andes-table-pagination-demo',
  imports: [...TABLE_PARTS, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      [(sort)]="sort"
      [loading]="loading()"
      loadingLabel="Loading orders"
    >
      <div andesTableTop class="demo-bar">
        <h3 id="orders-title">Orders</h3>
        <span>{{ orders.length }} total</span>
      </div>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="id">Order</th>
          <th andesTableHead sortKey="client">Client</th>
          <th andesTableHead sortKey="total" align="end">Total</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of pageRows(); track order.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ order.id }}</td>
            <td andesTableCell>{{ order.client }}</td>
            <td andesTableCell align="end">{{ money(order.total) }}</td>
          </tr>
        }
      </tbody>
      <nav andesTableBottom class="demo-bar" aria-label="Orders pages">
        <span aria-live="polite">Page {{ page() }} of {{ pageCount() }}</span>
        <span class="demo-pager">
          <andes-button
            variant="outline"
            size="sm"
            [disabled]="page() === 1"
            (click)="goTo(page() - 1)"
            >Previous</andes-button
          >
          <andes-button
            variant="outline"
            size="sm"
            [disabled]="page() === pageCount()"
            (click)="goTo(page() + 1)"
            >Next</andes-button
          >
        </span>
      </nav>
    </andes-table>
  `,
  styles: DEMO_STYLES,
})
class AndesTablePaginationDemo {
  readonly sort = signal<AndesSortState | null>(null);
  readonly page = signal(1);
  readonly loading = signal(false);

  protected readonly orders = ORDERS;
  protected readonly money = money;

  readonly pageCount = computed(() =>
    andesPageCount(this.orders.length, PAGE_SIZE),
  );

  readonly pageRows = computed(() =>
    andesPaginateRows(
      andesSortRows(this.orders, this.sort(), {
        id: (order) => order.id,
        client: (order) => order.client,
        total: (order) => order.total,
      }),
      this.page(),
      PAGE_SIZE,
    ),
  );

  protected goTo(page: number): void {
    this.loading.set(true);
    setTimeout(() => {
      this.page.set(page);
      this.loading.set(false);
    }, 600);
  }
}

const STATIC_TABLE = `
  <andes-table [bordered]="bordered" [density]="density" [rowHover]="rowHover" [captionSide]="captionSide" [loading]="loading" [tableLayout]="tableLayout">
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
    moduleMetadata({
      imports: [
        ...TABLE_PARTS,
        AndesTableSortingDemo,
        AndesTableSelectionDemo,
        AndesTableExpandDemo,
        AndesTableFilterDemo,
        AndesTableMultiSortDemo,
        AndesTableScrollDemo,
        AndesTablePaginationDemo,
      ],
    }),
  ],
  argTypes: {
    bordered: { control: 'boolean' },
    density: {
      control: 'select',
      options: ['compact', 'default', 'comfortable'],
    },
    rowHover: { control: 'boolean' },
    captionSide: { control: 'select', options: ['top', 'bottom'] },
    loading: { control: 'boolean' },
    tableLayout: { control: 'select', options: ['auto', 'fixed'] },
  },
  args: {
    bordered: false,
    density: 'default',
    rowHover: true,
    captionSide: 'bottom',
    loading: false,
    tableLayout: 'auto',
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

export const RowSelection: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-selection-demo />` }),
};

export const RadioSelection: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-selection-demo type="radio" />` }),
};

export const ExpandableRows: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-expand-demo />` }),
};

export const ExpandRowByClick: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-expand-demo [byClick]="true" />` }),
};

export const Filters: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-filter-demo />` }),
};

export const MultiSort: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-multi-sort-demo />` }),
};

export const ScrollAndFixedColumns: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-scroll-demo />` }),
};

export const Pagination: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-pagination-demo />` }),
};

export const Loading: Story = {
  args: { loading: true },
};

export const Empty: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 2rem; width: min(40rem, calc(100vw - 2rem));">
        <andes-table>
          <caption andesTableCaption>Default empty state</caption>
          <thead andesTableHeader>
            <tr andesTableRow><th andesTableHead>Invoice</th><th andesTableHead>Client</th><th andesTableHead align="end">Total</th></tr>
          </thead>
          <tbody andesTableBody>
            <tr andesTableRow><td andesTableCell colspan="3"><andes-table-empty /></td></tr>
          </tbody>
        </andes-table>
        <andes-table>
          <caption andesTableCaption>Custom empty text</caption>
          <thead andesTableHeader>
            <tr andesTableRow><th andesTableHead>Invoice</th><th andesTableHead>Client</th><th andesTableHead align="end">Total</th></tr>
          </thead>
          <tbody andesTableBody>
            <tr andesTableRow><td andesTableCell colspan="3"><andes-table-empty>No invoices this month</andes-table-empty></td></tr>
          </tbody>
        </andes-table>
      </div>
    `,
  }),
};

export const Ellipsis: Story = {
  render: () => ({
    template: `
      <andes-table tableLayout="fixed" style="display: block; width: min(36rem, calc(100vw - 2rem));">
        <caption andesTableCaption>Fixed layout: long notes are truncated with an ellipsis</caption>
        <thead andesTableHeader>
          <tr andesTableRow>
            <th andesTableHead style="width: 7rem">Order</th>
            <th andesTableHead ellipsis>Notes</th>
            <th andesTableHead align="end" style="width: 7rem">Total</th>
          </tr>
        </thead>
        <tbody andesTableBody>
          <tr andesTableRow>
            <td andesTableCell>ORD-101</td>
            <td andesTableCell ellipsis title="Quarterly supply contract, renewed automatically every three months unless cancelled in writing.">Quarterly supply contract, renewed automatically every three months unless cancelled in writing.</td>
            <td andesTableCell align="end">$1,250.00</td>
          </tr>
          <tr andesTableRow>
            <td andesTableCell>ORD-103</td>
            <td andesTableCell ellipsis title="Second reminder sent; account on hold until the outstanding balance is settled in full.">Second reminder sent; account on hold until the outstanding balance is settled in full.</td>
            <td andesTableCell align="end">$2,310.00</td>
          </tr>
        </tbody>
      </andes-table>
    `,
  }),
};
