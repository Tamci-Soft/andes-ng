import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesTable } from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCaption } from './table-caption';
import { AndesTableCell } from './table-cell';
import type { AndesTableRowKey } from './table-context';
import {
  andesFilterRows,
  andesOptionFilter,
  andesPageCount,
  andesPaginateRows,
  andesTextFilter,
  type AndesTableFilters,
} from './table-data';
import { AndesTableEmpty } from './table-empty';
import { AndesTableFilter, type AndesTableFilterOption } from './table-filter';
import { AndesTableTextFilter } from './table-filter-panels';
import { AndesTableFooter } from './table-footer';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import { AndesTableSelectAll, AndesTableSelection } from './table-selection';
import { andesSortRows, type AndesSortState } from './table-sort';

const PARTS = [
  AndesTable,
  AndesTableBody,
  AndesTableCaption,
  AndesTableCell,
  AndesTableEmpty,
  AndesTableFilter,
  AndesTableFooter,
  AndesTableHead,
  AndesTableHeader,
  AndesTableRow,
  AndesTableSelectAll,
  AndesTableSelection,
  AndesTableTextFilter,
  AndesButton,
];

const STYLES = `
  :host {
    display: block;
    width: min(40rem, calc(100vw - 2rem));
    font-family: var(--andes-font-family), sans-serif;
  }
  .demo-pager {
    display: flex;
    align-items: center;
    gap: var(--andes-space-2);
  }
  nav.demo-pager--end {
    justify-content: flex-end;
  }
  .demo-grow {
    flex: 1 1 auto;
  }
`;

interface Payment {
  readonly id: string;
  readonly status: 'Paid' | 'Pending' | 'Overdue';
  readonly email: string;
  readonly amount: number;
}

const PAYMENTS: readonly Payment[] = [
  { id: 'p1', status: 'Paid', email: 'ana@andes.pe', amount: 250 },
  { id: 'p2', status: 'Pending', email: 'luis@tamci.pe', amount: 150 },
  { id: 'p3', status: 'Overdue', email: 'maria@cordillera.pe', amount: 350 },
  { id: 'p4', status: 'Paid', email: 'jorge@altiplano.pe', amount: 450 },
  { id: 'p5', status: 'Pending', email: 'rosa@puna.pe', amount: 550 },
  { id: 'p6', status: 'Paid', email: 'carla@quipu.pe', amount: 120 },
  { id: 'p7', status: 'Overdue', email: 'diego@inti.pe', amount: 980 },
  { id: 'p8', status: 'Paid', email: 'elena@yupana.pe', amount: 310 },
];

const PAYMENT_PAGE_SIZE = 5;

function usd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/**
 * A compact data table: a selection column with an indeterminate "select all", a
 * sortable column, an end-aligned amount, a summary row for the total and a
 * caption. The bar under the table (`andes-table__toolbar` in the `andesTableBottom`
 * slot) reads "n of m row(s) selected." on the start side and pages with Previous
 * and Next on the end side.
 */
@Component({
  selector: 'andes-data-table-demo',
  imports: PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table [(sort)]="sort" [(selectedKeys)]="selected">
      <caption andesTableCaption>
        A list of recent payments.
      </caption>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead><andes-table-select-all /></th>
          <th andesTableHead sortKey="status">Status</th>
          <th andesTableHead sortKey="email">Email</th>
          <th andesTableHead sortKey="amount" align="end">Amount</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (payment of pageRows(); track payment.id) {
          <tr andesTableRow [rowKey]="payment.id">
            <td andesTableCell>
              <andes-table-selection [label]="'Select ' + payment.email" />
            </td>
            <td andesTableCell>{{ payment.status }}</td>
            <td andesTableCell>{{ payment.email }}</td>
            <td andesTableCell align="end">{{ usd(payment.amount) }}</td>
          </tr>
        }
      </tbody>
      <tfoot andesTableFooter>
        <tr andesTableRow>
          <td andesTableCell colspan="3">Total</td>
          <td andesTableCell align="end">{{ usd(total()) }}</td>
        </tr>
      </tfoot>
      <div andesTableBottom class="andes-table__toolbar">
        <span class="demo-grow" aria-live="polite"
          >{{ selected().length }} of {{ payments.length }} row(s)
          selected.</span
        >
        <span class="demo-pager">
          <andes-button
            variant="outline"
            size="sm"
            [disabled]="page() === 1"
            (click)="page.set(page() - 1)"
            >Previous</andes-button
          >
          <andes-button
            variant="outline"
            size="sm"
            [disabled]="page() === pageCount"
            (click)="page.set(page() + 1)"
            >Next</andes-button
          >
        </span>
      </div>
    </andes-table>
  `,
  styles: STYLES,
})
class AndesDataTableDemo {
  readonly sort = signal<AndesSortState | null>(null);
  readonly selected = signal<readonly AndesTableRowKey[]>(['p2']);
  readonly page = signal(1);

  protected readonly payments = PAYMENTS;
  protected readonly pageCount = andesPageCount(
    PAYMENTS.length,
    PAYMENT_PAGE_SIZE,
  );
  protected readonly usd = usd;

  readonly pageRows = computed(() =>
    andesPaginateRows(
      andesSortRows(PAYMENTS, this.sort(), {
        status: (payment) => payment.status,
        email: (payment) => payment.email,
        amount: (payment) => payment.amount,
      }),
      this.page(),
      PAYMENT_PAGE_SIZE,
    ),
  );

  readonly total = computed(() =>
    this.pageRows().reduce((sum, payment) => sum + payment.amount, 0),
  );
}

interface Person {
  readonly id: number;
  readonly name: string;
  readonly city: string;
  readonly age: number;
}

const CITIES = ['Lima', 'Cusco', 'Arequipa', 'Piura'] as const;
const NAMES = ['Ana', 'Luis', 'María', 'Jorge', 'Rosa', 'Carlos'] as const;

const PEOPLE: readonly Person[] = Array.from({ length: 13 }, (_, index) => ({
  id: index + 1,
  name: `${NAMES[index % NAMES.length]} ${index + 1}`,
  city: CITIES[(index * 3) % CITIES.length],
  age: 20 + ((index * 7) % 29),
}));

const CITY_OPTIONS: readonly AndesTableFilterOption[] = CITIES.map((city) => ({
  text: city,
  value: city,
}));

const PEOPLE_PAGE_SIZE = 5;

/**
 * A list with the usual server-list controls: a sorter next to the label, filter
 * triggers at the end of the header cell (a text filter for Name, a list of options
 * for City), an end-aligned number, and the pager on the end side of the bar below.
 */
@Component({
  selector: 'andes-list-table-demo',
  imports: PARTS,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table [(sort)]="sort" [(filters)]="filters">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="name">
            Name
            <andes-table-filter column="name" label="Filter name">
              <andes-table-text-filter placeholder="Name" />
            </andes-table-filter>
          </th>
          <th andesTableHead>
            City
            <andes-table-filter
              column="city"
              label="Filter city"
              [options]="cityOptions"
            />
          </th>
          <th andesTableHead sortKey="age" align="end">Age</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (person of pageRows(); track person.id) {
          <tr andesTableRow>
            <td andesTableCell>{{ person.name }}</td>
            <td andesTableCell>{{ person.city }}</td>
            <td andesTableCell align="end">{{ person.age }}</td>
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="3">
              <andes-table-empty
                >No people match these filters</andes-table-empty
              >
            </td>
          </tr>
        }
      </tbody>
      <nav
        andesTableBottom
        class="andes-table__toolbar demo-pager--end"
        aria-label="People pages"
      >
        <andes-button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous page"
          [disabled]="page() === 1"
          (click)="page.set(page() - 1)"
          >&lsaquo;</andes-button
        >
        @for (number of pageNumbers(); track number) {
          <andes-button
            size="icon-sm"
            [variant]="number === page() ? 'outline' : 'ghost'"
            [attr.aria-current]="number === page() ? 'page' : null"
            (click)="page.set(number)"
            >{{ number }}</andes-button
          >
        }
        <andes-button
          variant="ghost"
          size="icon-sm"
          aria-label="Next page"
          [disabled]="page() === pageCount()"
          (click)="page.set(page() + 1)"
          >&rsaquo;</andes-button
        >
      </nav>
    </andes-table>
  `,
  styles: STYLES,
})
class AndesListTableDemo {
  readonly sort = signal<AndesSortState | null>(null);
  readonly filters = signal<AndesTableFilters>({});
  readonly page = signal(1);

  protected readonly cityOptions = CITY_OPTIONS;

  private readonly filtered = computed(() =>
    andesSortRows(
      andesFilterRows(PEOPLE, this.filters(), {
        name: andesTextFilter((person) => person.name),
        city: andesOptionFilter((person) => person.city),
      }),
      this.sort(),
      {
        name: (person) => person.name,
        age: (person) => person.age,
      },
    ),
  );

  readonly pageCount = computed(() =>
    andesPageCount(this.filtered().length, PEOPLE_PAGE_SIZE),
  );
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.pageCount() }, (_, index) => index + 1),
  );
  readonly pageRows = computed(() =>
    andesPaginateRows(this.filtered(), this.page(), PEOPLE_PAGE_SIZE),
  );
}

const meta: Meta = {
  title: 'Table/Data table',
  decorators: [
    moduleMetadata({ imports: [AndesDataTableDemo, AndesListTableDemo] }),
  ],
};

export default meta;

type Story = StoryObj;

/** Selection, a sortable column, an end-aligned amount, a total row and a Previous / Next bar. */
export const SelectionAndTotal: Story = {
  render: () => ({ template: `<andes-data-table-demo />` }),
};

/** A sorter beside the label, filter triggers, and a pager on the end side. */
export const SortFilterAndPager: Story = {
  render: () => ({ template: `<andes-list-table-demo />` }),
};

/** The same list without the outer frame, for a table that already sits in a card. */
export const WithoutFrame: Story = {
  render: () => ({
    template: `
      <div style="width: min(40rem, calc(100vw - 2rem));">
        <andes-table [framed]="false">
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
