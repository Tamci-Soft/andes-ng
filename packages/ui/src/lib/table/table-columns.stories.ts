import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import {
  AndesTable,
  type AndesTableColumnReorder,
  type AndesTableColumnResize,
  type AndesTableLayout,
} from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCell } from './table-cell';
import type { AndesTableFixed } from './table-context';
import { andesOrderColumns } from './table-data';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import { andesSortRows, type AndesSortState } from './table-sort';

const TABLE_PARTS = [
  AndesTable,
  AndesTableBody,
  AndesTableCell,
  AndesTableHead,
  AndesTableHeader,
  AndesTableRow,
];

const STYLES = `
  :host {
    display: block;
    width: min(56rem, calc(100vw - 2rem));
    font-family: var(--andes-font-family), sans-serif;
  }
  .demo-log {
    margin-block-start: var(--andes-space-4);
    color: var(--andes-color-muted-foreground);
    font-size: 0.875rem;
    line-height: 1.375rem;
  }
  .demo-link {
    color: var(--andes-color-primary-text);
  }
`;

interface Entry {
  readonly key: number;
  readonly date: string;
  readonly amount: number;
  readonly type: string;
  readonly note: string;
}

// Sample entries for the resizable column demos.
const ENTRIES: readonly Entry[] = [
  { key: 0, date: '2018-02-11', amount: 120, type: 'income', note: 'transfer' },
  { key: 1, date: '2018-03-11', amount: 243, type: 'income', note: 'transfer' },
  { key: 2, date: '2018-04-11', amount: 98, type: 'income', note: 'transfer' },
];

/**
 * Resizable columns: drag the edge of a header to resize it (the last
 * column takes up the slack), double-click the edge to fit the content, or focus
 * the edge with Tab and use Arrow Left/Right (Shift for 50px), Home/End and Enter.
 * `[(columnWidths)]` keeps the widths; `(columnResize)` reports each change.
 */
@Component({
  selector: 'andes-resize-demo',
  imports: [...TABLE_PARTS, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      resizable
      [tableLayout]="layout()"
      [bordered]="bordered()"
      [(columnWidths)]="widths"
      [(sort)]="sort"
      (columnResize)="last.set($event)"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead columnKey="date" width="200">Date</th>
          <th andesTableHead sortKey="amount" width="100" align="end">
            Amount
          </th>
          <th andesTableHead columnKey="type" width="100">Type</th>
          <th andesTableHead columnKey="note" width="100" [maxWidth]="320">
            Note
          </th>
          <th andesTableHead columnKey="action">Action</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (entry of sorted(); track entry.key) {
          <tr andesTableRow>
            <td andesTableCell>{{ entry.date }}</td>
            <td andesTableCell align="end">{{ entry.amount }}</td>
            <td andesTableCell>{{ entry.type }}</td>
            <td andesTableCell>{{ entry.note }}</td>
            <td andesTableCell><a class="demo-link" href="#">Delete</a></td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-log">
      columnWidths: <code>{{ widths() | json }}</code>
      @if (last(); as change) {
        <br />columnResize:
        <code>{{ change.columnKey }} → {{ change.width }}px</code>
      }
    </p>
  `,
  styles: STYLES,
})
class ResizeDemo {
  readonly layout = input<AndesTableLayout>('auto');
  readonly bordered = input(false);
  readonly widths = signal<Readonly<Record<string, number>>>({});
  readonly sort = signal<AndesSortState | null>(null);
  readonly last = signal<AndesTableColumnResize | null>(null);

  protected sorted() {
    return andesSortRows(ENTRIES, this.sort(), {
      amount: (entry) => entry.amount,
    });
  }
}

interface Employee {
  readonly id: number;
  readonly name: string;
  readonly team: string;
  readonly role: string;
  readonly city: string;
  readonly email: string;
  readonly phone: string;
}

const EMPLOYEES: readonly Employee[] = [
  'Ana Quispe',
  'Bruno Huamán',
  'Carla Rojas',
  'Diego Flores',
  'Elena Castro',
].map((name, i) => ({
  id: i + 1,
  name,
  team: ['Platform', 'Design', 'Data', 'Mobile', 'Growth'][i],
  role: ['Engineer', 'Designer', 'Analyst', 'Engineer', 'Marketer'][i],
  city: ['Lima', 'Cusco', 'Arequipa', 'Trujillo', 'Piura'][i],
  email: `${name.split(' ')[0].toLowerCase()}@example.com`,
  phone: `+51 9${i}0 123 45${i}`,
}));

const WIDE_COLUMNS: readonly {
  key: keyof Employee;
  title: string;
  width: number;
  fixed?: AndesTableFixed;
}[] = [
  { key: 'name', title: 'Name', width: 160, fixed: 'start' },
  { key: 'team', title: 'Team', width: 140 },
  { key: 'role', title: 'Role', width: 140 },
  { key: 'city', title: 'City', width: 140 },
  { key: 'email', title: 'Email', width: 220 },
  { key: 'phone', title: 'Phone', width: 160 },
  { key: 'id', title: 'ID', width: 80, fixed: 'end' },
];

/**
 * Resizing with `tableLayout="fixed"`, a horizontal scroll and pinned columns:
 * widths are exact (content is clipped with an ellipsis), and the pinned columns'
 * offsets follow as their neighbours resize. Set `dir="rtl"` to see the handles
 * move to the left edge and the drag direction mirror.
 */
@Component({
  selector: 'andes-resize-fixed-demo',
  imports: [...TABLE_PARTS, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.dir]="dir()">
      <andes-table
        resizable
        tableLayout="fixed"
        scrollX="max-content"
        [(columnWidths)]="widths"
      >
        <thead andesTableHeader>
          <tr andesTableRow>
            @for (column of columns; track column.key) {
              <th
                andesTableHead
                [columnKey]="column.key"
                [width]="column.width"
                [fixed]="column.fixed"
                [minWidth]="64"
                ellipsis
              >
                {{ column.title }}
              </th>
            }
          </tr>
        </thead>
        <tbody andesTableBody>
          @for (employee of employees; track employee.id) {
            <tr andesTableRow>
              @for (column of columns; track column.key) {
                <td andesTableCell [fixed]="column.fixed" ellipsis>
                  {{ employee[column.key] }}
                </td>
              }
            </tr>
          }
        </tbody>
      </andes-table>
    </div>
    <p class="demo-log">
      columnWidths: <code>{{ widths() | json }}</code>
    </p>
  `,
  styles: STYLES,
})
class ResizeFixedDemo {
  readonly dir = input<'ltr' | 'rtl'>('ltr');
  protected readonly columns = WIDE_COLUMNS;
  protected readonly employees = EMPLOYEES;
  readonly widths = signal<Readonly<Record<string, number>>>({});
}

interface Contact {
  readonly key: string;
  readonly name: string;
  readonly gender: string;
  readonly age: number;
  readonly email: string;
  readonly address: string;
}

// Sample contacts for the reorderable column demo.
const CONTACTS: readonly Contact[] = [
  {
    key: '1',
    name: 'John Brown',
    gender: 'male',
    age: 32,
    email: 'John Brown@example.com',
    address: 'London No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    gender: 'female',
    age: 42,
    email: 'jimGreen@example.com',
    address: 'London No. 1 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    gender: 'female',
    age: 32,
    email: 'JoeBlack@example.com',
    address: 'Sidney No. 1 Lake Park',
  },
  {
    key: '4',
    name: 'George Hcc',
    gender: 'male',
    age: 20,
    email: 'george@example.com',
    address: 'Sidney No. 1 Lake Park',
  },
];

const CONTACT_COLUMNS: readonly {
  key: keyof Contact;
  title: string;
  width?: number;
  fixed?: AndesTableFixed;
}[] = [
  { key: 'name', title: 'Name', width: 140, fixed: 'start' },
  { key: 'gender', title: 'Gender', width: 110 },
  { key: 'age', title: 'Age', width: 90 },
  { key: 'email', title: 'Email', width: 230 },
  { key: 'address', title: 'Address' },
];

/**
 * Reorderable columns: drag a header sideways to move its column -
 * the pinned Name column stays first - or focus a header and press Alt+Arrow
 * Left/Right (the move is announced). The table reports the order through
 * `[(columnOrder)]`/`(columnReorder)`; the cells are rendered from
 * `andesOrderColumns`. With `resizable` the edges resize too.
 */
@Component({
  selector: 'andes-reorder-demo',
  imports: [...TABLE_PARTS, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table
      reorderable
      [resizable]="resizable()"
      [(columnOrder)]="order"
      (columnReorder)="last.set($event)"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          @for (column of columns(); track column.key) {
            <th
              andesTableHead
              [columnKey]="column.key"
              [width]="column.width"
              [fixed]="column.fixed"
            >
              {{ column.title }}
            </th>
          }
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (contact of contacts; track contact.key) {
          <tr andesTableRow>
            @for (column of columns(); track column.key) {
              <td andesTableCell [fixed]="column.fixed">
                {{ contact[column.key] }}
              </td>
            }
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-log">
      columnOrder: <code>{{ order() | json }}</code>
      @if (last(); as move) {
        <br />columnReorder:
        <code
          >{{ move.columnKey }} {{ move.previousIndex }} →
          {{ move.currentIndex }}</code
        >
      }
    </p>
  `,
  styles: STYLES,
})
class ReorderDemo {
  readonly resizable = input(false);
  protected readonly contacts = CONTACTS;
  readonly order = signal<readonly string[]>([]);
  readonly last = signal<AndesTableColumnReorder | null>(null);
  protected readonly columns = computed(() =>
    andesOrderColumns(CONTACT_COLUMNS, this.order(), (column) => column.key),
  );
}

const meta: Meta = {
  title: 'Table/Columns',
  decorators: [
    moduleMetadata({
      imports: [ResizeDemo, ResizeFixedDemo, ReorderDemo],
    }),
  ],
};

export default meta;

type Story = StoryObj;

export const ResizableColumns: Story = {
  render: () => ({ template: `<andes-resize-demo />` }),
};

export const ResizableBordered: Story = {
  render: () => ({ template: `<andes-resize-demo [bordered]="true" />` }),
};

export const ResizableFixedLayout: Story = {
  render: () => ({ template: `<andes-resize-fixed-demo />` }),
};

export const ResizableRtl: Story = {
  render: () => ({ template: `<andes-resize-fixed-demo dir="rtl" />` }),
};

export const ReorderableColumns: Story = {
  render: () => ({ template: `<andes-reorder-demo />` }),
};

export const ReorderableAndResizable: Story = {
  render: () => ({ template: `<andes-reorder-demo [resizable]="true" />` }),
};
