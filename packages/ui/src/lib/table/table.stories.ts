import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import {
  CdkDrag,
  type CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { AndesButton } from '../button/button';
import {
  AndesTable,
  type AndesTableRowSelectEvent,
  type AndesTableSelectionType,
} from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCaption } from './table-caption';
import { AndesTableCell } from './table-cell';
import type { AndesTableRowKey } from './table-context';
import {
  andesDateRangeFilter,
  andesFilterRows,
  andesOptionFilter,
  andesRangeFilter,
  andesReadDateRangeFilter,
  andesReadRangeFilter,
  andesReadTextFilter,
  andesTextFilter,
  type AndesTextFilterOperator,
  andesVisibleColumns,
  type AndesFilterValue,
  andesPageCount,
  andesPaginateRows,
  type AndesTableFilters,
} from './table-data';
import { AndesTableEmpty } from './table-empty';
import { AndesTableExpandedRow, AndesTableExpandToggle } from './table-expand';
import { AndesTableFilter, type AndesTableFilterOption } from './table-filter';
import {
  AndesTableDateRangeFilter,
  AndesTableRangeFilter,
  AndesTableTextFilter,
} from './table-filter-panels';
import {
  AndesTableColumnSettings,
  type AndesTableColumnSetting,
} from './table-column-settings';
import { AndesTableFooter } from './table-footer';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import {
  AndesTableSelectAll,
  AndesTableSelection,
  type AndesTableSelectionItem,
  type AndesTableSelectionPreset,
} from './table-selection';
import { andesSortRows, type AndesSortState } from './table-sort';
import { andesFlattenTableTree, andesTreeIndex } from './table-tree';
import { AndesTableVirtualRows } from './table-virtual';

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
  AndesTableVirtualRows,
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
        box-sizing: border-box;
        height: 2rem;
        padding-inline: 0.6875rem;
        border: 1px solid var(--andes-color-input);
        border-radius: var(--andes-radius-md);
        background-color: var(--andes-color-background);
        color: var(--andes-color-foreground);
        font: inherit;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease;
      }
      .client-search__input:hover {
        border-color: color-mix(
          in srgb,
          var(--andes-color-primary) 65%,
          var(--andes-color-input)
        );
      }
      .client-search__input:focus {
        border-color: var(--andes-color-primary);
        box-shadow: 0 0 0 2px
          color-mix(in srgb, var(--andes-color-primary) 20%, transparent);
        outline: none;
      }
      .client-search__actions {
        display: flex;
        justify-content: space-between;
      }
      .client-search__actions ::ng-deep .andes-button {
        height: var(--andes-control-height-sm, 1.5rem);
        padding-inline: var(--andes-control-padding-x-sm, 0.4375rem);
        font-size: var(--andes-control-font-size-md, 0.875rem);
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

const FIELD_STYLES = `
  .demo-input {
    box-sizing: border-box;
    height: 2rem;
    padding-inline: 0.6875rem;
    border: 1px solid var(--andes-color-input);
    border-radius: var(--andes-radius-md);
    background-color: var(--andes-color-background);
    color: var(--andes-color-foreground);
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.375rem;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }
  .demo-input:hover {
    border-color: color-mix(in srgb, var(--andes-color-primary) 65%, var(--andes-color-input));
  }
  .demo-input:focus {
    border-color: var(--andes-color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--andes-color-primary) 20%, transparent);
    outline: none;
  }
  .demo-input::placeholder {
    color: var(--andes-color-muted-foreground);
  }
  .demo-cell-input {
    width: 100%;
    height: 1.5rem;
    padding-inline: 0.4375rem;
  }
  .demo-checks {
    display: flex;
    flex-wrap: wrap;
    gap: var(--andes-space-3);
  }
  .demo-checks label {
    display: inline-flex;
    align-items: center;
    gap: var(--andes-space-1);
  }
  .demo-checks input {
    accent-color: var(--andes-color-primary);
  }
`;

interface Account {
  readonly code: string;
  readonly name: string;
  readonly balance: number;
  readonly children?: readonly Account[];
}

const ACCOUNTS: readonly Account[] = [
  {
    code: '1',
    name: 'Assets',
    balance: 184500,
    children: [
      {
        code: '10',
        name: 'Cash and equivalents',
        balance: 42300,
        children: [
          { code: '101', name: 'Petty cash', balance: 800 },
          { code: '104', name: 'Bank accounts', balance: 41500 },
        ],
      },
      {
        code: '12',
        name: 'Trade receivables',
        balance: 96200,
        children: [
          { code: '121', name: 'Invoices issued', balance: 88700 },
          { code: '123', name: 'Bills of exchange', balance: 7500 },
        ],
      },
      { code: '20', name: 'Inventory', balance: 46000 },
    ],
  },
  {
    code: '4',
    name: 'Liabilities',
    balance: 73400,
    children: [
      { code: '40', name: 'Taxes payable', balance: 18900 },
      { code: '42', name: 'Trade payables', balance: 54500 },
    ],
  },
  { code: '5', name: 'Equity', balance: 111100 },
];

const ACCOUNT_TREE = {
  key: (account: Account) => account.code,
  children: (account: Account) => account.children,
};

/**
 * Tree data: `andesFlattenTableTree` turns the nested chart of accounts into the rows
 * to render, `level` + `indent` indent them, and `selectionTree` makes selection
 * cascade - a parent is checked when all its children are, indeterminate when
 * some are.
 */
@Component({
  selector: 'andes-table-tree-demo',
  imports: [...TABLE_PARTS, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      [selectionTree]="tree"
      [(selectedKeys)]="selected"
      [(expandedKeys)]="expanded"
    >
      <div andesTableTop class="demo-bar">
        <h3>Chart of accounts</h3>
        <span class="demo-pager">
          <andes-button variant="outline" size="sm" (click)="expandAll()"
            >Expand all</andes-button
          >
          <andes-button variant="outline" size="sm" (click)="expanded.set([])"
            >Collapse all</andes-button
          >
        </span>
      </div>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead><andes-table-select-all /></th>
          <th andesTableHead>Account</th>
          <th andesTableHead align="end">Balance</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (node of nodes(); track node.key) {
          <tr andesTableRow [rowKey]="node.key" [level]="node.level">
            <td andesTableCell>
              <andes-table-selection [label]="'Select ' + node.row.name" />
            </td>
            <td andesTableCell indent>
              <andes-table-expand-toggle
                [spacer]="!node.hasChildren"
                [label]="'Sub-accounts of ' + node.row.name"
              />
              {{ node.row.code }} · {{ node.row.name }}
            </td>
            <td andesTableCell align="end">{{ money(node.row.balance) }}</td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-state">Selected: {{ selected().join(', ') || 'none' }}</p>
  `,
  styles: DEMO_STYLES,
})
class AndesTableTreeDemo {
  readonly tree = andesTreeIndex(ACCOUNTS, ACCOUNT_TREE);
  readonly selected = signal<readonly AndesTableRowKey[]>([]);
  readonly expanded = signal<readonly AndesTableRowKey[]>(['1']);
  protected readonly money = money;

  readonly nodes = computed(() =>
    andesFlattenTableTree(ACCOUNTS, {
      ...ACCOUNT_TREE,
      expandedKeys: this.expanded(),
    }),
  );

  protected expandAll(): void {
    this.expanded.set([...this.tree.childrenOf.keys()]);
  }
}

/**
 * The "select all" header with a menu of selection entries: the built-in
 * select / invert / clear, plus a custom "Select paid orders" entry that receives
 * the changeable keys and writes the selection itself.
 */
@Component({
  selector: 'andes-table-selection-menu-demo',
  imports: TABLE_PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table [(selectedKeys)]="selected" (rowSelect)="onRowSelect($event)">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead>
            <andes-table-select-all [selections]="selections" />
          </th>
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
              <andes-table-selection [label]="'Select ' + order.id" />
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
      {{ selected().length }} selected · last row event:
      {{ lastEvent() || 'none' }}
    </p>
  `,
  styles: DEMO_STYLES,
})
class AndesTableSelectionMenuDemo {
  readonly selected = signal<readonly AndesTableRowKey[]>([]);
  readonly lastEvent = signal('');
  protected readonly orders = ORDERS.slice(0, 6);
  protected readonly money = money;

  protected onRowSelect(event: AndesTableRowSelectEvent): void {
    this.lastEvent.set(
      `${event.key} ${event.selected ? 'selected' : 'cleared'}`,
    );
  }

  readonly selections: readonly (
    AndesTableSelectionPreset | AndesTableSelectionItem
  )[] = [
    'all',
    'invert',
    'none',
    {
      key: 'paid',
      text: 'Select paid orders',
      select: (keys) =>
        this.selected.set(
          keys.filter(
            (key) =>
              this.orders.find((order) => order.id === key)?.status === 'Paid',
          ),
        ),
    },
  ];
}

const REGION_OPTIONS: readonly AndesTableFilterOption[] = [
  {
    text: 'Coast',
    value: 'coast',
    children: [
      { text: 'North', value: 'North' },
      { text: 'Lima', value: 'Lima' },
      { text: 'South', value: 'South' },
    ],
  },
  {
    text: 'Inland',
    value: 'inland',
    children: [
      { text: 'Center', value: 'Center' },
      { text: 'East', value: 'East' },
    ],
  },
];

const UNPAID: readonly AndesFilterValue[] = ['Pending', 'Overdue'];

/**
 * Filter variants: a region tree (checking "Coast" checks its three regions), an
 * owner filter whose search matches the start of any name, and a status filter
 * that starts on "unpaid" and whose Reset goes back to that default.
 */
@Component({
  selector: 'andes-table-tree-filter-demo',
  imports: TABLE_PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table [(filters)]="filters">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead>Order</th>
          <th andesTableHead>
            Region
            <andes-table-filter
              column="region"
              label="Filter region"
              searchable
              mode="tree"
              [options]="regionOptions"
            />
          </th>
          <th andesTableHead>
            Owner
            <andes-table-filter
              column="owner"
              label="Filter owner"
              searchable
              searchPlaceholder="Name starts with"
              [searchable]="startsWord"
              [options]="ownerOptions"
            />
          </th>
          <th andesTableHead>
            Status
            <andes-table-filter
              column="status"
              label="Filter status"
              [defaultFilteredValue]="unpaid"
              resetToDefault
              [options]="statusOptions"
            />
          </th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of visible(); track order.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ order.id }}</td>
            <td andesTableCell>{{ order.region }}</td>
            <td andesTableCell>{{ order.owner }}</td>
            <td andesTableCell>
              <span class="demo-status" [attr.data-status]="order.status">{{
                order.status
              }}</span>
            </td>
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="4"><andes-table-empty /></td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-state">filters: {{ describe() }}</p>
  `,
  styles: DEMO_STYLES,
})
class AndesTableTreeFilterDemo {
  protected readonly unpaid = UNPAID;
  readonly filters = signal<AndesTableFilters>({ status: UNPAID });
  protected readonly regionOptions = REGION_OPTIONS;
  protected readonly statusOptions: readonly AndesTableFilterOption[] = [
    { text: 'Paid', value: 'Paid' },
    { text: 'Pending', value: 'Pending' },
    { text: 'Overdue', value: 'Overdue' },
  ];
  protected readonly ownerOptions: readonly AndesTableFilterOption[] = [
    ...new Set(ORDERS.map((order) => order.owner)),
  ].map((owner) => ({ text: owner, value: owner }));

  protected readonly startsWord = (
    query: string,
    option: AndesTableFilterOption,
  ) =>
    option.text
      .toLocaleLowerCase()
      .split(/\s+/)
      .some((word) => word.startsWith(query.toLocaleLowerCase()));

  readonly visible = computed(() =>
    andesFilterRows(ORDERS, this.filters(), {
      region: (value, order) => order.region === value,
      owner: (value, order) => order.owner === value,
      status: (value, order) => order.status === value,
    }),
  );

  protected describe(): string {
    return JSON.stringify(this.filters());
  }
}

interface LedgerLine {
  readonly id: number;
  readonly account: string;
  readonly description: string;
  readonly amount: number;
}

const LEDGER: readonly LedgerLine[] = Array.from(
  { length: 10000 },
  (_, index) => ({
    id: index + 1,
    account: ['104', '121', '40', '42', '20'][index % 5],
    description: `Journal entry ${index + 1} · ${
      ['Sale', 'Purchase', 'Payment', 'Receipt', 'Adjustment'][index % 5]
    }`,
    amount: ((index * 7919) % 100000) / 100,
  }),
);

/**
 * Virtual rows: 10,000 ledger lines, of which only the visible window (plus a few
 * rows of overscan) is in the DOM. Rows have a fixed height, `selectableKeys`
 * lets "select all" reach every line, and `scrollTo({ index })` jumps to any of
 * them.
 */
@Component({
  selector: 'andes-table-virtual-demo',
  imports: [...TABLE_PARTS, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      #table
      density="compact"
      tableLayout="fixed"
      scrollY="420"
      [selectableKeys]="allIds"
      [(selectedKeys)]="selected"
    >
      <div andesTableTop class="demo-bar">
        <h3>General ledger · {{ lines.length }} lines</h3>
        <span class="demo-pager">
          <label for="jump-row">Row</label>
          <input
            id="jump-row"
            class="demo-input"
            type="number"
            min="1"
            [max]="lines.length"
            [value]="jump()"
            (input)="jump.set(+$any($event.target).value)"
          />
          <andes-button
            variant="outline"
            size="sm"
            (click)="table.scrollTo({ index: jump() - 1 })"
            >Go</andes-button
          >
        </span>
      </div>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead style="width: 3rem">
            <andes-table-select-all />
          </th>
          <th andesTableHead style="width: 5rem" align="end">#</th>
          <th andesTableHead style="width: 6rem">Account</th>
          <th andesTableHead>Description</th>
          <th andesTableHead style="width: 8rem" align="end">Amount</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        <tr
          *andesTableVirtualRows="let line of lines; rowHeight: rowHeight"
          andesTableRow
          [rowKey]="line.id"
        >
          <td andesTableCell>
            <andes-table-selection [label]="'Select line ' + line.id" />
          </td>
          <td andesTableCell align="end">{{ line.id }}</td>
          <td andesTableCell>{{ line.account }}</td>
          <td andesTableCell ellipsis>{{ line.description }}</td>
          <td andesTableCell align="end">{{ money(line.amount) }}</td>
        </tr>
      </tbody>
    </andes-table>
    <p class="demo-state">{{ selected().length }} lines selected</p>
  `,
  styles: [DEMO_STYLES, FIELD_STYLES, '.demo-input { width: 6rem; }'],
})
class AndesTableVirtualDemo {
  protected readonly lines = LEDGER;
  protected readonly allIds = LEDGER.map((line) => line.id);
  /** Compact density: a 32px row, line and separator included. */
  protected readonly rowHeight = 32;
  readonly selected = signal<readonly AndesTableRowKey[]>([]);
  readonly jump = signal(5000);
  protected readonly money = money;
}

/**
 * Resizable columns: drag a header's end edge, or focus the handle and use the
 * arrow keys (Shift for bigger steps). Widths are two-way bound on the table
 * (`columnWidths`), so they can be saved and restored.
 */
@Component({
  selector: 'andes-table-resize-demo',
  imports: TABLE_PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      tableLayout="fixed"
      bordered
      resizable
      [(columnWidths)]="widths"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead columnKey="order">Order</th>
          <th andesTableHead columnKey="client" ellipsis>Client</th>
          <th andesTableHead columnKey="notes" [minWidth]="120" ellipsis>
            Notes
          </th>
          <th andesTableHead align="end">Total</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of orders; track order.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ order.id }}</td>
            <td andesTableCell ellipsis>{{ order.client }}</td>
            <td andesTableCell ellipsis>{{ order.notes }}</td>
            <td andesTableCell align="end">{{ money(order.total) }}</td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-state">
      widths: {{ widths()['order'] }} / {{ widths()['client'] }} /
      {{ widths()['notes'] }} px
    </p>
  `,
  styles: DEMO_STYLES,
})
class AndesTableResizeDemo {
  readonly widths = signal<Readonly<Record<string, number>>>({
    order: 110,
    client: 180,
    notes: 320,
  });
  protected readonly orders = ORDERS.slice(0, 5);
  protected readonly money = money;
}

/**
 * Column visibility: a column picker driven by plain `@if`s, plus `hideBelow`,
 * which drops the Region and Owner columns on narrow viewports by itself.
 */
@Component({
  selector: 'andes-table-columns-demo',
  imports: TABLE_PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table>
      <fieldset andesTableTop class="demo-bar demo-checks">
        <legend class="andes-table__sr-only">Visible columns</legend>
        @for (column of columns; track column.id) {
          <label>
            <input
              type="checkbox"
              [checked]="visible().has(column.id)"
              (change)="toggle(column.id)"
            />
            {{ column.label }}
          </label>
        }
      </fieldset>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead>Order</th>
          @if (visible().has('client')) {
            <th andesTableHead>Client</th>
          }
          @if (visible().has('region')) {
            <th andesTableHead hideBelow="md">Region</th>
          }
          @if (visible().has('owner')) {
            <th andesTableHead hideBelow="lg">Owner</th>
          }
          @if (visible().has('total')) {
            <th andesTableHead align="end">Total</th>
          }
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of orders; track order.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ order.id }}</td>
            @if (visible().has('client')) {
              <td andesTableCell>{{ order.client }}</td>
            }
            @if (visible().has('region')) {
              <td andesTableCell hideBelow="md">{{ order.region }}</td>
            }
            @if (visible().has('owner')) {
              <td andesTableCell hideBelow="lg">{{ order.owner }}</td>
            }
            @if (visible().has('total')) {
              <td andesTableCell align="end">{{ money(order.total) }}</td>
            }
          </tr>
        }
      </tbody>
    </andes-table>
  `,
  styles: [
    DEMO_STYLES,
    FIELD_STYLES,
    'fieldset { margin: 0; padding-inline: 0; border: 0; }',
  ],
})
class AndesTableColumnsDemo {
  protected readonly columns = [
    { id: 'client', label: 'Client' },
    { id: 'region', label: 'Region (hidden below 768px)' },
    { id: 'owner', label: 'Owner (hidden below 992px)' },
    { id: 'total', label: 'Total' },
  ];
  readonly visible = signal(new Set(['client', 'region', 'owner', 'total']));
  protected readonly orders = ORDERS.slice(0, 5);
  protected readonly money = money;

  protected toggle(id: string): void {
    const next = new Set(this.visible());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.visible.set(next);
  }
}

/**
 * Server-side data: `tableChange` carries the sort and filters in one event, so
 * a single handler refetches; the page lives with the consumer. The overlay shows
 * while the (simulated) request runs, and `scrollToFirstRowOnChange` brings the
 * new first rows into view.
 */
@Component({
  selector: 'andes-table-server-demo',
  imports: [...TABLE_PARTS, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      scrollY="260"
      scrollToFirstRowOnChange
      [loading]="loading()"
      loadingLabel="Loading orders"
      (tableChange)="fetch($event.sort, $event.filters, 1)"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="id">Order</th>
          <th andesTableHead sortKey="client">Client</th>
          <th andesTableHead>
            Status
            <andes-table-filter
              column="status"
              label="Filter status"
              [options]="statusOptions"
            />
          </th>
          <th andesTableHead sortKey="total" align="end">Total</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of rows(); track order.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ order.id }}</td>
            <td andesTableCell>{{ order.client }}</td>
            <td andesTableCell>{{ order.status }}</td>
            <td andesTableCell align="end">{{ money(order.total) }}</td>
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="4"><andes-table-empty /></td>
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
            (click)="fetch(sort, filters, page() - 1)"
            >Previous</andes-button
          >
          <andes-button
            variant="outline"
            size="sm"
            [disabled]="page() === pageCount()"
            (click)="fetch(sort, filters, page() + 1)"
            >Next</andes-button
          >
        </span>
      </nav>
    </andes-table>
    <p class="demo-state">last request: {{ request() }}</p>
  `,
  styles: DEMO_STYLES,
})
class AndesTableServerDemo {
  protected readonly statusOptions: readonly AndesTableFilterOption[] = [
    { text: 'Paid', value: 'Paid' },
    { text: 'Pending', value: 'Pending' },
    { text: 'Overdue', value: 'Overdue' },
  ];
  protected readonly money = money;
  protected sort: AndesSortState | null = null;
  protected filters: AndesTableFilters = {};

  readonly page = signal(1);
  readonly loading = signal(false);
  readonly request = signal('none yet');
  readonly total = signal(ORDERS.length);
  readonly rows = signal<readonly Order[]>(ORDERS.slice(0, 6));
  readonly pageCount = computed(() => andesPageCount(this.total(), 6));

  protected fetch(
    sort: AndesSortState | null,
    filters: AndesTableFilters,
    page: number,
  ): void {
    this.sort = sort;
    this.filters = filters;
    this.request.set(JSON.stringify({ sort, filters, page }));
    this.loading.set(true);

    // Stands in for an HTTP call that sorts, filters and pages on the server.
    setTimeout(() => {
      const filtered = andesFilterRows(ORDERS, filters, {
        status: (value, order) => order.status === value,
      });
      const sorted = andesSortRows(filtered, sort, {
        id: (order) => order.id,
        client: (order) => order.client,
        total: (order) => order.total,
      });
      this.total.set(sorted.length);
      this.page.set(page);
      this.rows.set(andesPaginateRows(sorted, page, 6));
      this.loading.set(false);
    }, 500);
  }
}

/**
 * Editable rows: the table only renders; editing is ordinary Angular state. One
 * row at a time switches its cells to inputs, with Save and Cancel.
 */
@Component({
  selector: 'andes-table-editable-demo',
  imports: [...TABLE_PARTS, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table tableLayout="fixed">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead style="width: 7rem">Order</th>
          <th andesTableHead>Client</th>
          <th andesTableHead style="width: 8rem" align="end">Total</th>
          <th andesTableHead style="width: 10rem">
            <span class="andes-table__sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of orders(); track order.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ order.id }}</td>
            @if (editing() === order.id) {
              <td andesTableCell>
                <input
                  class="demo-input demo-cell-input"
                  [attr.aria-label]="'Client of ' + order.id"
                  [value]="draft().client"
                  (input)="patch({ client: $any($event.target).value })"
                />
              </td>
              <td andesTableCell align="end">
                <input
                  class="demo-input demo-cell-input"
                  type="number"
                  style="text-align: end"
                  [attr.aria-label]="'Total of ' + order.id"
                  [value]="draft().total"
                  (input)="patch({ total: +$any($event.target).value })"
                />
              </td>
              <td andesTableCell>
                <span class="demo-pager">
                  <andes-button size="sm" (click)="save()">Save</andes-button>
                  <andes-button
                    variant="ghost"
                    size="sm"
                    (click)="editing.set(null)"
                    >Cancel</andes-button
                  >
                </span>
              </td>
            } @else {
              <td andesTableCell>{{ order.client }}</td>
              <td andesTableCell align="end">{{ money(order.total) }}</td>
              <td andesTableCell>
                <andes-button
                  variant="link"
                  size="sm"
                  [disabled]="editing() !== null"
                  (click)="edit(order)"
                  >Edit</andes-button
                >
              </td>
            }
          </tr>
        }
      </tbody>
    </andes-table>
  `,
  styles: [DEMO_STYLES, FIELD_STYLES],
})
class AndesTableEditableDemo {
  readonly orders = signal<readonly Order[]>(ORDERS.slice(0, 4));
  readonly editing = signal<string | null>(null);
  readonly draft = signal<Pick<Order, 'client' | 'total'>>({
    client: '',
    total: 0,
  });
  protected readonly money = money;

  protected edit(order: Order): void {
    this.draft.set({ client: order.client, total: order.total });
    this.editing.set(order.id);
  }

  protected patch(change: Partial<Pick<Order, 'client' | 'total'>>): void {
    this.draft.set({ ...this.draft(), ...change });
  }

  protected save(): void {
    const id = this.editing();
    this.orders.set(
      this.orders().map((order) =>
        order.id === id ? { ...order, ...this.draft() } : order,
      ),
    );
    this.editing.set(null);
  }
}

/**
 * Drag-to-reorder rows with the CDK drag-and-drop directives straight on the
 * native `<tbody>`/`<tr>`: a handle per row, the preview kept inside the table so
 * it keeps the column widths, and `moveItemInArray` to apply the drop.
 */
@Component({
  selector: 'andes-table-drag-demo',
  imports: [...TABLE_PARTS, CdkDrag, CdkDragHandle, CdkDropList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead>
            <span class="andes-table__sr-only">Reorder</span>
          </th>
          <th andesTableHead>Priority</th>
          <th andesTableHead>Order</th>
          <th andesTableHead>Client</th>
        </tr>
      </thead>
      <tbody
        andesTableBody
        cdkDropList
        cdkDropListLockAxis="y"
        (cdkDropListDropped)="drop($event)"
      >
        @for (order of orders(); track order.id; let i = $index) {
          <tr
            andesTableRow
            cdkDrag
            cdkDragPreviewContainer="parent"
            class="demo-drag-row"
          >
            <td andesTableCell>
              <button
                type="button"
                class="demo-handle"
                cdkDragHandle
                [attr.aria-label]="'Drag ' + order.id"
              >
                ⋮⋮
              </button>
            </td>
            <td andesTableCell>{{ i + 1 }}</td>
            <td andesTableCell>{{ order.id }}</td>
            <td andesTableCell>{{ order.client }}</td>
          </tr>
        }
      </tbody>
    </andes-table>
  `,
  styles: [
    DEMO_STYLES,
    `
      .demo-handle {
        padding: 0 var(--andes-space-1);
        border: 0;
        border-radius: var(--andes-radius-sm);
        background: transparent;
        color: var(--andes-color-muted-foreground);
        font-family: inherit;
        cursor: grab;
      }
      .demo-handle:focus-visible {
        outline: 2px solid var(--andes-color-focus-ring);
      }
      .demo-drag-row.cdk-drag-preview {
        display: table-row;
        background-color: var(--andes-color-background);
        box-shadow: 0 4px 16px rgb(0 0 0 / 16%);
      }
      .demo-drag-row.cdk-drag-placeholder {
        opacity: 0.4;
      }
      .cdk-drop-list-dragging .demo-drag-row:not(.cdk-drag-placeholder) {
        transition: transform 0.2s ease;
      }
    `,
  ],
})
class AndesTableDragDemo {
  readonly orders = signal<Order[]>(ORDERS.slice(0, 5));

  protected drop(event: CdkDragDrop<unknown>): void {
    const next = [...this.orders()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.orders.set(next);
  }
}

const ORDER_LINES: Readonly<
  Record<string, readonly { item: string; qty: number; price: number }[]>
> = {
  'ORD-101': [
    { item: 'Steel bolts M12', qty: 400, price: 1.5 },
    { item: 'Hydraulic hose', qty: 20, price: 32.5 },
  ],
  'ORD-102': [{ item: 'Safety helmets', qty: 24, price: 20 }],
  'ORD-103': [
    { item: 'Conveyor belt', qty: 1, price: 1890 },
    { item: 'Installation', qty: 1, price: 420 },
  ],
};

/**
 * Nested tables: each order expands into its own table of lines. The outer
 * "select all" only ever counts the outer rows. `forceRender` keeps the inner
 * tables rendered (hidden) while collapsed, so their selection survives.
 */
@Component({
  selector: 'andes-table-nested-demo',
  imports: TABLE_PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table [(selectedKeys)]="selected">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead><andes-table-select-all /></th>
          <th andesTableHead>
            <span class="andes-table__sr-only">Lines</span>
          </th>
          <th andesTableHead>Order</th>
          <th andesTableHead>Client</th>
          <th andesTableHead align="end">Total</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (order of orders; track order.id) {
          <tr andesTableRow [rowKey]="order.id">
            <td andesTableCell>
              <andes-table-selection [label]="'Select ' + order.id" />
            </td>
            <td andesTableCell>
              <andes-table-expand-toggle [label]="'Lines of ' + order.id" />
            </td>
            <td andesTableCell>{{ order.id }}</td>
            <td andesTableCell>{{ order.client }}</td>
            <td andesTableCell align="end">{{ money(order.total) }}</td>
          </tr>
          <tr *andesTableExpandedRow="order.id; forceRender: true">
            <td andesTableCell colspan="5">
              <andes-table density="compact" bordered>
                <thead andesTableHeader>
                  <tr andesTableRow>
                    <th andesTableHead><andes-table-select-all /></th>
                    <th andesTableHead>Item</th>
                    <th andesTableHead align="end">Qty</th>
                    <th andesTableHead align="end">Price</th>
                  </tr>
                </thead>
                <tbody andesTableBody>
                  @for (line of lines(order.id); track line.item) {
                    <tr andesTableRow [rowKey]="order.id + line.item">
                      <td andesTableCell>
                        <andes-table-selection
                          [label]="'Select ' + line.item"
                        />
                      </td>
                      <td andesTableCell>{{ line.item }}</td>
                      <td andesTableCell align="end">{{ line.qty }}</td>
                      <td andesTableCell align="end">
                        {{ money(line.price) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </andes-table>
            </td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-state">
      Orders selected: {{ selected().join(', ') || 'none' }}
    </p>
  `,
  styles: DEMO_STYLES,
})
class AndesTableNestedDemo {
  readonly selected = signal<readonly AndesTableRowKey[]>([]);
  protected readonly orders = ORDERS.slice(0, 3);
  protected readonly money = money;

  protected lines(id: string) {
    return ORDER_LINES[id] ?? [];
  }
}

interface BillingInvoice {
  readonly id: number;
  readonly number: string;
  readonly client: string;
  readonly status: 'Draft' | 'Issued' | 'Paid' | 'Overdue' | 'Cancelled';
  readonly issued: string;
  readonly amount: number;
}

const BILLING_CLIENTS = [
  'Andes Mining',
  'Tamci Peru',
  'Cordillera SA',
  'Altiplano SAC',
  'Puna Energía',
  'Selva Verde',
  'Nevado Group',
  'Inca Logistics',
  'Titicaca Foods',
  'José Olaya Hnos.',
];

const BILLING_STATUSES: readonly BillingInvoice['status'][] = [
  'Issued',
  'Paid',
  'Overdue',
  'Paid',
  'Draft',
  'Paid',
  'Cancelled',
];

/** 40 invoices spread over the first half of 2026. */
const BILLING: readonly BillingInvoice[] = Array.from(
  { length: 40 },
  (_, index) => {
    const day = 1 + ((index * 37) % 180);
    const date = new Date(2026, 0, day);
    return {
      id: index + 1,
      number: `F001-${String(1200 + index).padStart(6, '0')}`,
      client: BILLING_CLIENTS[(index * 7) % BILLING_CLIENTS.length],
      status: BILLING_STATUSES[index % BILLING_STATUSES.length],
      issued: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      amount: Math.round(((index * 7919) % 4800) + 80 + (index % 3) * 0.5),
    };
  },
);

const BILLING_STATUS_OPTIONS: readonly AndesTableFilterOption[] = [
  'Draft',
  'Issued',
  'Paid',
  'Overdue',
  'Cancelled',
].map((status) => ({ text: status, value: status }));

const BILLING_PAGE_SIZE = 8;

/**
 * Advanced filters for ERP lists, each a ready-made panel projected into
 * `andes-table-filter`:
 * - Client: `andes-table-text-filter` (contains / starts with / equals / does
 *   not contain, ignoring case and accents) with a custom search icon;
 * - Status: the option list as a searchable multi-select;
 * - Issued: `andes-table-date-range-filter`;
 * - Amount: `andes-table-range-filter` (OK is disabled while min > max).
 *
 * `andesFilterRows` matches the rows with `andesTextFilter`, `andesDateRangeFilter`,
 * `andesRangeFilter` and `andesOptionFilter`; a server would read the same
 * state with the `andesRead*` helpers (shown under the table). The filters are
 * controlled - the preset button writes them directly - and the toolbar uses
 * the table's `clearFilters()`, `clearSort()` and `resetState()`. Sorting,
 * filtering and paging combine; any filter or sort change goes back to page 1.
 */
@Component({
  selector: 'andes-table-advanced-filter-demo',
  imports: [
    ...TABLE_PARTS,
    AndesButton,
    AndesTableTextFilter,
    AndesTableRangeFilter,
    AndesTableDateRangeFilter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      #table
      [(filters)]="filters"
      [(sort)]="sort"
      (tableChange)="page.set(1)"
    >
      <div andesTableTop class="demo-bar">
        <span class="demo-pager">
          <andes-button variant="outline" size="sm" (click)="preset()"
            >Overdue over $1,000</andes-button
          >
          <andes-button
            variant="outline"
            size="sm"
            (click)="table.clearFilters()"
            >Clear filters</andes-button
          >
          <andes-button variant="outline" size="sm" (click)="table.clearSort()"
            >Clear sort</andes-button
          >
          <andes-button variant="ghost" size="sm" (click)="table.resetState()"
            >Reset all</andes-button
          >
        </span>
        <span>{{ filtered().length }} of {{ total }} invoices</span>
      </div>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="number">Invoice</th>
          <th andesTableHead sortKey="client">
            Client
            <andes-table-filter column="client" label="Filter client">
              <span class="demo-filter-icon" aria-hidden="true"></span>
              <andes-table-text-filter
                placeholder="Client name"
                [operators]="textOperators"
              />
            </andes-table-filter>
          </th>
          <th andesTableHead>
            Status
            <andes-table-filter
              column="status"
              label="Filter status"
              searchable
              searchPlaceholder="Search status"
              [options]="statusOptions"
            />
          </th>
          <th andesTableHead sortKey="issued">
            Issued
            <andes-table-filter column="issued" label="Filter issue date">
              <andes-table-date-range-filter />
            </andes-table-filter>
          </th>
          <th andesTableHead sortKey="amount" align="end">
            Amount
            <andes-table-filter column="amount" label="Filter amount">
              <andes-table-range-filter
                minPlaceholder="0"
                maxPlaceholder="No limit"
              />
            </andes-table-filter>
          </th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (invoice of pageRows(); track invoice.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ invoice.number }}</td>
            <td andesTableCell>{{ invoice.client }}</td>
            <td andesTableCell>{{ invoice.status }}</td>
            <td andesTableCell>{{ invoice.issued }}</td>
            <td andesTableCell align="end">{{ money(invoice.amount) }}</td>
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="5">
              <andes-table-empty
                >No invoices match these filters</andes-table-empty
              >
            </td>
          </tr>
        }
      </tbody>
      <nav andesTableBottom class="demo-bar" aria-label="Invoice pages">
        <span aria-live="polite"
          >Page {{ current() }} of {{ pageCount() }}</span
        >
        <span class="demo-pager">
          <andes-button
            variant="outline"
            size="sm"
            [disabled]="current() === 1"
            (click)="page.set(current() - 1)"
            >Previous</andes-button
          >
          <andes-button
            variant="outline"
            size="sm"
            [disabled]="current() === pageCount()"
            (click)="page.set(current() + 1)"
            >Next</andes-button
          >
        </span>
      </nav>
    </andes-table>
    <p class="demo-state">
      filters: <code>{{ filtersLabel() }}</code>
    </p>
    <p class="demo-state">
      server query: <code>{{ serverQuery() }}</code>
    </p>
  `,
  styles: [
    DEMO_STYLES,
    `
      .demo-filter-icon {
        display: block;
        width: 0.875rem;
        height: 0.875rem;
        background-color: currentcolor;
        mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round'><circle cx='11' cy='11' r='7'/><path d='m20 20-3.5-3.5'/></svg>")
          center / contain no-repeat;
      }
      .demo-state code {
        overflow-wrap: anywhere;
      }
    `,
  ],
})
class AndesTableAdvancedFilterDemo {
  readonly filters = signal<AndesTableFilters>({});
  readonly sort = signal<AndesSortState | null>(null);
  readonly page = signal(1);

  protected readonly total = BILLING.length;
  protected readonly statusOptions = BILLING_STATUS_OPTIONS;
  protected readonly textOperators: readonly AndesTextFilterOperator[] = [
    'contains',
    'startsWith',
    'equals',
    'notContains',
  ];
  protected readonly money = money;

  readonly filtered = computed(() =>
    andesFilterRows(BILLING, this.filters(), {
      client: andesTextFilter((invoice) => invoice.client),
      status: andesOptionFilter((invoice) => invoice.status),
      issued: andesDateRangeFilter((invoice) => invoice.issued),
      amount: andesRangeFilter((invoice) => invoice.amount),
    }),
  );

  readonly pageCount = computed(() =>
    andesPageCount(this.filtered().length, BILLING_PAGE_SIZE),
  );

  /** The page actually shown - clamped when filtering leaves fewer pages. */
  readonly current = computed(() => Math.min(this.page(), this.pageCount()));

  readonly pageRows = computed(() =>
    andesPaginateRows(
      andesSortRows(this.filtered(), this.sort(), {
        number: (invoice) => invoice.number,
        client: (invoice) => invoice.client,
        issued: (invoice) => invoice.issued,
        amount: (invoice) => invoice.amount,
      }),
      this.current(),
      BILLING_PAGE_SIZE,
    ),
  );

  readonly filtersLabel = computed(() => JSON.stringify(this.filters()));

  /** What a server-side data source would send, read from the same state. */
  readonly serverQuery = computed(() => {
    const filters = this.filters();
    const params = new URLSearchParams();
    const client = andesReadTextFilter(filters['client']);
    if (client) {
      params.set(`client_${client.operator}`, client.text);
    }
    for (const status of filters['status'] ?? []) {
      params.append('status', String(status));
    }
    const issued = andesReadDateRangeFilter(filters['issued']);
    if (issued?.min) params.set('issued_from', issued.min);
    if (issued?.max) params.set('issued_to', issued.max);
    const amount = andesReadRangeFilter(filters['amount']);
    if (amount?.min !== null && amount?.min !== undefined) {
      params.set('amount_min', String(amount.min));
    }
    if (amount?.max !== null && amount?.max !== undefined) {
      params.set('amount_max', String(amount.max));
    }
    const sort = this.sort();
    if (sort) params.set('sort', `${sort.columnId}:${sort.direction}`);
    params.set('page', String(this.current()));
    return `GET /invoices?${params}`;
  });

  protected preset(): void {
    this.filters.set({ status: ['Overdue'], amount: [1000, null] });
    this.page.set(1);
  }
}

const COLUMN_LABELS: Readonly<Record<string, string>> = {
  id: 'Order',
  client: 'Client',
  status: 'Status',
  region: 'Region',
  owner: 'Owner',
  notes: 'Notes',
  total: 'Total',
};

const COLUMN_SETTINGS: readonly AndesTableColumnSetting[] = [
  { key: 'id', label: 'Order', hideable: false },
  { key: 'client', label: 'Client' },
  { key: 'status', label: 'Status' },
  { key: 'region', label: 'Region' },
  { key: 'owner', label: 'Owner' },
  { key: 'notes', label: 'Notes' },
  { key: 'total', label: 'Total' },
];

/**
 * Resize, reorder and hide columns. The table is plain markup, so the column
 * *order* is the consumer's state: one array of keys, from which the header
 * row and every body row render their cells with `@for` + `@switch`.
 * - `reorderable` on the table plus a `columnKey` on each movable header lets
 *   the user drag headers sideways (or press Alt+ArrowLeft / Alt+ArrowRight on
 *   a focused header); the table writes the new order to `[(columnOrder)]` and
 *   emits `columnReorder`. Hidden columns keep their place in that order.
 * - `andes-table-column-settings` edits the same `order` and `hidden` lists
 *   from a menu - checkboxes to show or hide, arrows to move, Reset.
 * - `resizable` + `[(columnWidths)]` on the table, with the widths kept per key
 *   so they travel with their column. Drag the edge, or focus the handle and
 *   use the arrow keys (Shift for bigger steps).
 *
 * `andesVisibleColumns(order, hidden)` gives the keys to render; hidden
 * columns keep their place in the order and come back where they were.
 */
@Component({
  selector: 'andes-table-column-settings-demo',
  imports: [...TABLE_PARTS, AndesTableColumnSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      tableLayout="fixed"
      bordered
      resizable
      reorderable
      [(columnOrder)]="order"
      [(columnWidths)]="widths"
      [(sort)]="sort"
      [(filters)]="filters"
      (columnReorder)="
        lastMove.set($event.columnKey + ' → ' + ($event.currentIndex + 1))
      "
    >
      <div andesTableTop class="demo-bar">
        <span class="demo-hint"
          >Drag a header to move it, drag its edge to resize it</span
        >
        <andes-table-column-settings
          [columns]="settings"
          [(order)]="order"
          [(hidden)]="hidden"
        />
      </div>
      <thead andesTableHeader>
        <tr andesTableRow>
          @for (key of shown(); track key) {
            <th
              andesTableHead
              [columnKey]="key"
              [minWidth]="80"
              [maxWidth]="480"
              [sortKey]="sortable.has(key) ? key : undefined"
              [align]="key === 'total' ? 'end' : 'start'"
              ellipsis
            >
              {{ labelOf(key) }}
              @if (key === 'status') {
                <andes-table-filter
                  column="status"
                  label="Filter status"
                  [options]="statusOptions"
                />
              }
            </th>
          }
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (row of rows(); track row.id) {
          <tr andesTableRow>
            @for (key of shown(); track key) {
              @switch (key) {
                @case ('status') {
                  <td andesTableCell>
                    <span class="demo-status" [attr.data-status]="row.status">{{
                      row.status
                    }}</span>
                  </td>
                }
                @case ('total') {
                  <td andesTableCell align="end">{{ money(row.total) }}</td>
                }
                @default {
                  <td andesTableCell ellipsis>{{ cell(row, key) }}</td>
                }
              }
            }
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-state">
      order: <code>{{ order().join(', ') }}</code> · hidden:
      <code>{{ hidden().join(', ') || 'none' }}</code> · last move:
      {{ lastMove() }}
    </p>
  `,
  styles: [
    DEMO_STYLES,
    `
      .demo-hint {
        color: var(--andes-color-muted-foreground);
      }
    `,
  ],
})
class AndesTableColumnSettingsDemo {
  protected readonly settings = COLUMN_SETTINGS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly sortable = new Set(['id', 'client', 'total']);
  protected readonly money = money;

  readonly order = signal<readonly string[]>(
    COLUMN_SETTINGS.map((column) => column.key),
  );
  readonly hidden = signal<readonly string[]>(['notes']);
  readonly widths = signal<Readonly<Record<string, number>>>({
    id: 110,
    status: 130,
    region: 110,
    owner: 150,
    notes: 260,
    total: 120,
  });
  readonly sort = signal<AndesSortState | null>(null);
  readonly filters = signal<AndesTableFilters>({});
  readonly lastMove = signal('none');

  readonly shown = computed(() =>
    andesVisibleColumns(this.order(), this.hidden()),
  );

  readonly rows = computed(() =>
    andesSortRows(
      andesFilterRows(ORDERS, this.filters(), {
        status: andesOptionFilter((order) => order.status),
      }),
      this.sort(),
      {
        id: (order) => order.id,
        client: (order) => order.client,
        total: (order) => order.total,
      },
    ),
  );

  protected readonly labelOf = (key: string) => COLUMN_LABELS[key] ?? key;

  protected cell(row: Order, key: string): string {
    return String(row[key as keyof Order]);
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
        AndesTableTreeDemo,
        AndesTableSelectionMenuDemo,
        AndesTableTreeFilterDemo,
        AndesTableVirtualDemo,
        AndesTableResizeDemo,
        AndesTableColumnsDemo,
        AndesTableServerDemo,
        AndesTableEditableDemo,
        AndesTableDragDemo,
        AndesTableNestedDemo,
        AndesTableAdvancedFilterDemo,
        AndesTableColumnSettingsDemo,
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

/**
 * With the cell grid on, the rounded frame keeps its corners in every state: with a
 * header that sticks inside a scrolling body, while empty, and under the loading overlay.
 */
export const BorderedStates: Story = {
  render: () => ({
    props: { rows: Array.from({ length: 12 }, (_, i) => i + 1) },
    template: `
      <div style="display: grid; gap: 2rem; width: min(40rem, calc(100vw - 2rem));">
        <andes-table bordered scrollY="12rem">
          <caption andesTableCaption>Sticky header in a scrolling body</caption>
          <thead andesTableHeader>
            <tr andesTableRow><th andesTableHead>Line</th><th andesTableHead>Description</th><th andesTableHead align="end">Amount</th></tr>
          </thead>
          <tbody andesTableBody>
            @for (row of rows; track row) {
              <tr andesTableRow><td andesTableCell>{{ row }}</td><td andesTableCell>Journal entry {{ row }}</td><td andesTableCell align="end">{{ row * 37 }}.00</td></tr>
            }
          </tbody>
        </andes-table>
        <andes-table bordered>
          <caption andesTableCaption>Empty</caption>
          <thead andesTableHeader>
            <tr andesTableRow><th andesTableHead>Invoice</th><th andesTableHead>Client</th><th andesTableHead align="end">Total</th></tr>
          </thead>
          <tbody andesTableBody>
            <tr andesTableRow><td andesTableCell colspan="3"><andes-table-empty /></td></tr>
          </tbody>
        </andes-table>
        <andes-table bordered loading loadingLabel="Loading invoices">
          <caption andesTableCaption>Loading</caption>
          <thead andesTableHeader>
            <tr andesTableRow><th andesTableHead>Invoice</th><th andesTableHead>Client</th><th andesTableHead align="end">Total</th></tr>
          </thead>
          <tbody andesTableBody>
            <tr andesTableRow><td andesTableCell>INV-001</td><td andesTableCell>Acme</td><td andesTableCell align="end">250.00</td></tr>
            <tr andesTableRow><td andesTableCell>INV-002</td><td andesTableCell>Globex</td><td andesTableCell align="end">150.00</td></tr>
          </tbody>
        </andes-table>
      </div>
    `,
  }),
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

export const AdvancedFilters: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-advanced-filter-demo />` }),
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
        <caption andesTableCaption>Fixed layout: long notes are truncated with an ellipsis; hover one for the full text</caption>
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
            <td andesTableCell ellipsis>Quarterly supply contract, renewed automatically every three months unless cancelled in writing.</td>
            <td andesTableCell align="end">$1,250.00</td>
          </tr>
          <tr andesTableRow>
            <td andesTableCell>ORD-103</td>
            <td andesTableCell ellipsis>Second reminder sent; account on hold until the outstanding balance is settled in full.</td>
            <td andesTableCell align="end">$2,310.00</td>
          </tr>
        </tbody>
      </andes-table>
    `,
  }),
};

export const TreeData: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-tree-demo />` }),
};

export const SelectionMenu: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-selection-menu-demo />` }),
};

export const TreeAndCustomFilters: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-tree-filter-demo />` }),
};

export const VirtualRows: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-virtual-demo />` }),
};

export const ResizableColumns: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-resize-demo />` }),
};

export const ResizeReorderAndHideColumns: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-column-settings-demo />` }),
};

export const ColumnVisibility: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-columns-demo />` }),
};

export const ServerSideData: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-server-demo />` }),
};

export const EditableRows: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-editable-demo />` }),
};

export const DragToReorder: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-drag-demo />` }),
};

export const NestedTables: Story = {
  parameters: { docs: { source: { type: 'code' } } },
  render: () => ({ template: `<andes-table-nested-demo />` }),
};

/** Header cells spanning columns and rows; with `scrollY` both header rows stick, stacked. */
export const GroupedHeaders: Story = {
  render: () => ({
    template: `
      <andes-table bordered scrollY="220" style="display: block; width: min(48rem, calc(100vw - 2rem));">
        <caption andesTableCaption>Sales by region and quarter</caption>
        <thead andesTableHeader>
          <tr andesTableRow>
            <th andesTableHead rowspan="2">Region</th>
            <th andesTableHead colspan="2" align="center">First half</th>
            <th andesTableHead colspan="2" align="center">Second half</th>
            <th andesTableHead rowspan="2" align="end">Year</th>
          </tr>
          <tr andesTableRow>
            <th andesTableHead align="end">Q1</th>
            <th andesTableHead align="end">Q2</th>
            <th andesTableHead align="end">Q3</th>
            <th andesTableHead align="end">Q4</th>
          </tr>
        </thead>
        <tbody andesTableBody>
          @for (region of ['North', 'Lima', 'South', 'Center', 'East', 'Abroad']; track region; let i = $index) {
            <tr andesTableRow>
              <th andesTableHead scope="row">{{ region }}</th>
              <td andesTableCell align="end">{{ 1200 + i * 110 }}</td>
              <td andesTableCell align="end">{{ 1350 + i * 90 }}</td>
              <td andesTableCell align="end">{{ 1100 + i * 130 }}</td>
              <td andesTableCell align="end">{{ 1500 + i * 70 }}</td>
              <td andesTableCell align="end">{{ 5150 + i * 400 }}</td>
            </tr>
          }
          <tr andesTableRow>
            <th andesTableHead scope="row">Projects</th>
            <td andesTableCell colspan="4" align="center">Billed once at year end</td>
            <td andesTableCell align="end">9800</td>
          </tr>
        </tbody>
      </andes-table>
    `,
  }),
};

/**
 * `sticky` keeps the header under the top of the page while a long table
 * scrolls past; `stickyOffset` leaves room for the fixed bar above it.
 */
export const StickyHeader: Story = {
  render: () => ({
    props: { rows: Array.from({ length: 40 }, (_, i) => i + 1) },
    template: `
      <div style="position: sticky; top: 0; z-index: 5; height: 3rem; display: flex; align-items: center; padding-inline: 1rem; background: var(--andes-color-primary); color: var(--andes-color-primary-foreground); font-family: var(--andes-font-family), sans-serif;">Fixed app bar</div>
      <andes-table sticky stickyOffset="48" style="display: block; width: min(40rem, calc(100vw - 2rem));">
        <thead andesTableHeader>
          <tr andesTableRow>
            <th andesTableHead>Line</th>
            <th andesTableHead>Description</th>
            <th andesTableHead align="end">Amount</th>
          </tr>
        </thead>
        <tbody andesTableBody>
          @for (row of rows; track row) {
            <tr andesTableRow>
              <td andesTableCell>{{ row }}</td>
              <td andesTableCell>Journal entry {{ row }}</td>
              <td andesTableCell align="end">{{ row * 37 }}.00</td>
            </tr>
          }
        </tbody>
      </andes-table>
    `,
  }),
};

/**
 * `sortTooltip` names the next sort step; `[sortIcon]="false"` plus the
 * `andesTableHead` export lets a header draw its own indicator.
 */
export const SortTooltipAndCustomIcon: Story = {
  render: () => ({
    template: `
      <andes-table sortTooltip>
        <thead andesTableHeader>
          <tr andesTableRow>
            <th andesTableHead sortKey="client">Client</th>
            <th andesTableHead sortKey="total" align="end" [sortIcon]="false" #total="andesTableHead">
              Total
              <span aria-hidden="true">{{ total.direction() === 'asc' ? '↑' : total.direction() === 'desc' ? '↓' : '↕' }}</span>
            </th>
          </tr>
        </thead>
        <tbody andesTableBody>
          <tr andesTableRow><td andesTableCell>Andes Mining</td><td andesTableCell align="end">$250.00</td></tr>
          <tr andesTableRow><td andesTableCell>Tamci Peru</td><td andesTableCell align="end">$150.00</td></tr>
        </tbody>
      </andes-table>
    `,
  }),
};
