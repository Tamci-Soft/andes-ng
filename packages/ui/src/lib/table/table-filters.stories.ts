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

import { AndesButton } from '../button/button';
import { AndesTable, type AndesTableChange } from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCell } from './table-cell';
import type { AndesFilterValue } from './table-data';
import { AndesTableEmpty } from './table-empty';
import {
  AndesTableFilter,
  type AndesTableFilterMode,
  type AndesTableFilterOption,
  type AndesTableFilterSearchFn,
} from './table-filter';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import {
  andesSortRows,
  type AndesSortAccessors,
  type AndesSortState,
} from './table-sort';

/*
 * Column filter examples: "Filter and sorter", "Filter in Tree", "Filter search",
 * "Customized filter panel" and "Reset filters and sorters".
 */

const TABLE_PARTS = [
  AndesTable,
  AndesTableBody,
  AndesTableCell,
  AndesTableEmpty,
  AndesTableFilter,
  AndesTableHead,
  AndesTableHeader,
  AndesTableRow,
];

interface Person {
  readonly key: string;
  readonly name: string;
  readonly age: number;
  readonly address: string;
}

const PEOPLE: readonly Person[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
  },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
];

const ADDRESS_OPTIONS: readonly AndesTableFilterOption[] = [
  { text: 'London', value: 'London' },
  { text: 'New York', value: 'New York' },
];

const SORT_ACCESSORS: AndesSortAccessors<Person> = {
  name: { compare: (a, b) => a.name.length - b.name.length },
  age: (person) => person.age,
  address: (person) => person.address,
};

const startsWith = (value: AndesFilterValue, text: string) =>
  text.startsWith(String(value));
const includes = (value: AndesFilterValue, text: string) =>
  text.includes(String(value));

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
  .demo-bar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--andes-space-2);
    margin-block-end: var(--andes-space-4);
  }
`;

/**
 * Filter and sorter: a nested (submenu) Name filter that matches by prefix, an
 * Address filter, and sorters - the Name sorter only sorts descending. Each
 * filter's `predicate` tests a row; `table.filterRows` applies them and
 * `(tableChange)` reports every sort or filter the user changes.
 */
@Component({
  selector: 'andes-filter-sorter-demo',
  imports: [...TABLE_PARTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table #table [(sort)]="sort" (tableChange)="lastChange.set($event)">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th
            andesTableHead
            sortKey="name"
            [sortDirections]="['desc']"
            style="width: 30%"
          >
            Name
            <andes-table-filter
              column="name"
              label="Filter name"
              [options]="nameOptions"
              [predicate]="namePredicate"
            />
          </th>
          <th andesTableHead sortKey="age">Age</th>
          <th andesTableHead style="width: 40%">
            Address
            <andes-table-filter
              column="address"
              label="Filter address"
              [options]="addressOptions"
              [predicate]="addressPredicate"
            />
          </th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (person of sorted(table.filterRows(people)); track person.key) {
          <tr andesTableRow>
            <td andesTableCell>{{ person.name }}</td>
            <td andesTableCell>{{ person.age }}</td>
            <td andesTableCell>{{ person.address }}</td>
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="3"><andes-table-empty /></td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-log">
      tableChange: <code>{{ changeLabel() }}</code>
    </p>
  `,
  styles: STYLES,
})
class FilterSorterDemo {
  protected readonly people = PEOPLE;
  protected readonly addressOptions = ADDRESS_OPTIONS;
  protected readonly nameOptions: readonly AndesTableFilterOption[] = [
    { text: 'Joe', value: 'Joe' },
    { text: 'Jim', value: 'Jim' },
    {
      text: 'Submenu',
      value: 'Submenu',
      children: [
        { text: 'Green', value: 'Green' },
        { text: 'Black', value: 'Black' },
      ],
    },
  ];
  protected readonly namePredicate = (value: AndesFilterValue, row: Person) =>
    startsWith(value, row.name);
  protected readonly addressPredicate = (
    value: AndesFilterValue,
    row: Person,
  ) => startsWith(value, row.address);

  // Sorted by Age, descending, from the start.
  readonly sort = signal<AndesSortState | null>({
    columnId: 'age',
    direction: 'desc',
  });
  readonly lastChange = signal<AndesTableChange | null>(null);
  protected readonly changeLabel = computed(() =>
    JSON.stringify(this.lastChange()),
  );

  protected sorted(rows: readonly Person[]): readonly Person[] {
    return andesSortRows(rows, this.sort(), SORT_ACCESSORS);
  }
}

/**
 * Filter in tree (`mode="tree"`) and filter search (`searchable`): the Name filter as a checkable tree - checking a category
 * checks its colors - and searchable lists. With `customSearch` the Address search
 * uses a function that matches from the start of the text only.
 */
@Component({
  selector: 'andes-filter-tree-demo',
  imports: [...TABLE_PARTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table #table (tableChange)="lastChange.set($event)">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead style="width: 30%">
            Name
            <andes-table-filter
              column="name"
              label="Filter name"
              [options]="nameOptions"
              [mode]="mode()"
              searchable
              [predicate]="namePredicate"
            />
          </th>
          <th andesTableHead>Age</th>
          <th andesTableHead style="width: 40%">
            Address
            <andes-table-filter
              column="address"
              label="Filter address"
              [options]="addressOptions"
              [searchable]="customSearch() ? addressSearch : true"
              [predicate]="addressPredicate"
            />
          </th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (person of table.filterRows(people); track person.key) {
          <tr andesTableRow>
            <td andesTableCell>{{ person.name }}</td>
            <td andesTableCell>{{ person.age }}</td>
            <td andesTableCell>{{ person.address }}</td>
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="3"><andes-table-empty /></td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-log">
      filters: <code>{{ filtersLabel() }}</code>
    </p>
  `,
  styles: STYLES,
})
class FilterTreeDemo {
  readonly mode = input<AndesTableFilterMode>('tree');
  readonly customSearch = input(false);

  protected readonly people = PEOPLE;
  protected readonly addressOptions = ADDRESS_OPTIONS;
  protected readonly nameOptions: readonly AndesTableFilterOption[] = [
    { text: 'Joe', value: 'Joe' },
    {
      text: 'Category 1',
      value: 'Category 1',
      children: [
        { text: 'Yellow', value: 'Yellow' },
        { text: 'Pink', value: 'Pink' },
      ],
    },
    {
      text: 'Category 2',
      value: 'Category 2',
      children: [
        { text: 'Green', value: 'Green' },
        { text: 'Black', value: 'Black' },
      ],
    },
  ];
  protected readonly namePredicate = (value: AndesFilterValue, row: Person) =>
    includes(value, row.name);
  protected readonly addressPredicate = (
    value: AndesFilterValue,
    row: Person,
  ) => startsWith(value, row.address);
  protected readonly addressSearch: AndesTableFilterSearchFn = (
    query,
    option,
  ) => option.text.toLowerCase().startsWith(query.toLowerCase());

  readonly lastChange = signal<AndesTableChange | null>(null);
  protected readonly filtersLabel = computed(() =>
    JSON.stringify(this.lastChange()?.filters ?? {}),
  );
}

/**
 * Customized filter panel: every column gets a text search panel (`panel`) with
 * Search / Reset / Filter / close actions, a search icon as its trigger (`icon`)
 * that turns primary while filtered, and the matching text highlighted in the cells.
 */
@Component({
  selector: 'andes-filter-panel-demo',
  imports: [...TABLE_PARTS, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <andes-table #table [(filters)]="filters" [(sort)]="sort">
      <thead andesTableHeader>
        <tr andesTableRow>
          @for (column of columns; track column.key) {
            <th
              andesTableHead
              [sortKey]="column.key"
              [style.width]="column.width"
            >
              {{ column.title }}
              <andes-table-filter
                [column]="column.key"
                [label]="'Search ' + column.key"
                [panel]="searchPanel"
                [icon]="searchIcon"
                [predicate]="column.predicate"
                (openChange)="$event && focusSearch()"
              />
            </th>
          }
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (person of sorted(table.filterRows(people)); track person.key) {
          <tr andesTableRow>
            @for (column of columns; track column.key) {
              <td andesTableCell>
                @for (part of highlight(column.key, person); track $index) {
                  @if (part.match) {
                    <mark class="demo-mark">{{ part.text }}</mark>
                  } @else {
                    {{ part.text }}
                  }
                }
              </td>
            }
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="3"><andes-table-empty /></td>
          </tr>
        }
      </tbody>
    </andes-table>

    <ng-template
      #searchPanel
      let-selected
      let-setSelected="setSelected"
      let-confirm="confirm"
      let-clear="clear"
      let-close="close"
    >
      <div class="search-panel">
        <input
          class="search-panel__input"
          type="search"
          placeholder="Search"
          aria-label="Search text"
          [value]="selected[0] ?? ''"
          (input)="setSelected(textValues($any($event.target).value))"
          (keydown.enter)="confirm()"
        />
        <div class="search-panel__actions">
          <andes-button size="sm" (click)="confirm()">Search</andes-button>
          <andes-button
            size="sm"
            variant="outline"
            (click)="clear({ confirm: true, closeDropdown: false })"
            >Reset</andes-button
          >
          <andes-button
            size="sm"
            variant="link"
            (click)="confirm({ closeDropdown: false })"
            >Filter</andes-button
          >
          <andes-button size="sm" variant="link" (click)="close()"
            >close</andes-button
          >
        </div>
      </div>
    </ng-template>

    <ng-template #searchIcon let-filtered>
      <span
        class="search-icon"
        [class.search-icon--active]="filtered"
        aria-hidden="true"
      ></span>
    </ng-template>
  `,
  styles: [
    STYLES,
    `
      .search-panel {
        display: grid;
        gap: var(--andes-space-2);
        padding: var(--andes-space-2);
      }
      .search-panel__input {
        box-sizing: border-box;
        width: 100%;
        height: var(--andes-control-height-md, 2rem);
        padding-inline: var(--andes-control-padding-x-md, 0.6875rem);
        border: 1px solid var(--andes-color-input);
        border-radius: var(--andes-control-radius-md, 0.375rem);
        background-color: var(--andes-color-background);
        color: var(--andes-color-foreground);
        font: inherit;
      }
      .search-panel__input:focus-visible {
        outline: 2px solid transparent;
        outline-offset: 2px;
        border-color: var(--andes-color-focus-ring);
        box-shadow: var(
          --andes-focus-halo,
          0 0 0 3px
            color-mix(in srgb, var(--andes-color-focus-ring) 20%, transparent)
        );
      }
      .search-panel__actions {
        display: flex;
        gap: var(--andes-space-2);
      }
      .search-panel__actions ::ng-deep .andes-button {
        height: var(--andes-control-height-sm, 1.5rem);
        padding-inline: var(--andes-control-padding-x-sm, 0.4375rem);
        font-size: 0.875rem;
      }
      .search-icon {
        display: block;
        width: 0.875rem;
        height: 0.875rem;
        background-color: currentcolor;
        mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round'><circle cx='11' cy='11' r='7'/><path d='m20 20-3.5-3.5'/></svg>")
          center / contain no-repeat;
      }
      .search-icon--active {
        color: var(--andes-color-primary-text);
      }
      .demo-mark {
        padding: 0;
        background-color: #ffc069;
        color: inherit;
      }
    `,
  ],
})
class FilterPanelDemo {
  protected readonly people = PEOPLE;
  readonly filters = signal<
    Readonly<Record<string, readonly AndesFilterValue[]>>
  >({});

  protected readonly columns = [
    {
      key: 'name' as const,
      title: 'Name',
      width: '30%',
      predicate: (value: AndesFilterValue, row: Person) =>
        this.matches(value, row.name),
    },
    {
      key: 'age' as const,
      title: 'Age',
      width: '20%',
      predicate: (value: AndesFilterValue, row: Person) =>
        this.matches(value, String(row.age)),
    },
    {
      key: 'address' as const,
      title: 'Address',
      width: null,
      predicate: (value: AndesFilterValue, row: Person) =>
        this.matches(value, row.address),
    },
  ];

  readonly sort = signal<AndesSortState | null>(null);

  protected sorted(rows: readonly Person[]): readonly Person[] {
    return andesSortRows(rows, this.sort(), SORT_ACCESSORS);
  }

  protected textValues(text: string): string[] {
    return text.trim() ? [text.trim()] : [];
  }

  /** Splits a cell into plain and matching runs for the highlight. */
  protected highlight(
    key: 'name' | 'age' | 'address',
    person: Person,
  ): { text: string; match: boolean }[] {
    const text = String(person[key]);
    const query = String(this.filters()[key]?.[0] ?? '');
    if (!query) {
      return [{ text, match: false }];
    }
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase();
    const parts: { text: string; match: boolean }[] = [];
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(needle, from);
      if (at < 0) {
        break;
      }
      if (at > from) {
        parts.push({ text: text.slice(from, at), match: false });
      }
      parts.push({ text: text.slice(at, at + needle.length), match: true });
      from = at + needle.length;
    }
    if (from < text.length) {
      parts.push({ text: text.slice(from), match: false });
    }
    return parts;
  }

  /** Focus the panel's input once it is open. */
  protected focusSearch(): void {
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLInputElement>('.search-panel__input')
        ?.select(),
    );
  }

  private matches(value: AndesFilterValue, text: string): boolean {
    return text.toLowerCase().includes(String(value).toLowerCase());
  }
}

/**
 * Reset filters and sorters: both filters are controlled through
 * `filteredValue`, updated from `(tableChange)`, so outside buttons can clear them
 * (Name starts filtered to "Jim"). Reset inside the Address panel returns the
 * draft to its `defaultFilteredValue` (`resetToDefault`) instead of emptying it.
 */
@Component({
  selector: 'andes-filter-controlled-demo',
  imports: [...TABLE_PARTS, AndesButton, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="demo-bar">
      <andes-button variant="outline" size="sm" (click)="sortAge()"
        >Sort age</andes-button
      >
      <andes-button variant="outline" size="sm" (click)="clearFilters()"
        >Clear filters</andes-button
      >
      <andes-button variant="outline" size="sm" (click)="clearAll()"
        >Clear filters and sorters</andes-button
      >
    </div>
    <andes-table #table [(sort)]="sort" (tableChange)="onChange($event)">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="name">
            Name
            <andes-table-filter
              column="name"
              label="Filter name"
              [options]="nameOptions"
              [filteredValue]="nameFilter()"
              [predicate]="namePredicate"
            />
          </th>
          <th andesTableHead sortKey="age">Age</th>
          <th andesTableHead sortKey="address">
            Address
            <andes-table-filter
              column="address"
              label="Filter address"
              [options]="addressOptions"
              [filteredValue]="addressFilter()"
              [defaultFilteredValue]="['London']"
              resetToDefault
              [predicate]="addressPredicate"
            />
          </th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (person of sorted(table.filterRows(people)); track person.key) {
          <tr andesTableRow>
            <td andesTableCell>{{ person.name }}</td>
            <td andesTableCell>{{ person.age }}</td>
            <td andesTableCell>{{ person.address }}</td>
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="3"><andes-table-empty /></td>
          </tr>
        }
      </tbody>
    </andes-table>
    <p class="demo-log">
      name: <code>{{ nameFilter() | json }}</code> · address:
      <code>{{ addressFilter() | json }}</code>
    </p>
  `,
  styles: [
    STYLES,
    `
      .demo-bar ::ng-deep .andes-button {
        height: var(--andes-control-height-md, 2rem);
        font-size: 0.875rem;
      }
    `,
  ],
})
class FilterControlledDemo {
  protected readonly people = PEOPLE;
  protected readonly addressOptions = ADDRESS_OPTIONS;
  protected readonly nameOptions: readonly AndesTableFilterOption[] = [
    { text: 'Joe', value: 'Joe' },
    { text: 'Jim', value: 'Jim' },
  ];
  protected readonly namePredicate = (value: AndesFilterValue, row: Person) =>
    includes(value, row.name);
  protected readonly addressPredicate = (
    value: AndesFilterValue,
    row: Person,
  ) => includes(value, row.address);

  readonly nameFilter = signal<readonly AndesFilterValue[] | null>(['Jim']);
  readonly addressFilter = signal<readonly AndesFilterValue[] | null>(null);
  readonly sort = signal<AndesSortState | null>(null);

  protected onChange(change: AndesTableChange): void {
    if (change.action === 'filter') {
      this.nameFilter.set(change.filters['name'] ?? null);
      this.addressFilter.set(change.filters['address'] ?? null);
    }
  }

  protected sortAge(): void {
    this.sort.set({ columnId: 'age', direction: 'desc' });
  }

  protected clearFilters(): void {
    this.nameFilter.set(null);
    this.addressFilter.set(null);
  }

  protected clearAll(): void {
    this.clearFilters();
    this.sort.set(null);
  }

  protected sorted(rows: readonly Person[]): readonly Person[] {
    return andesSortRows(rows, this.sort(), SORT_ACCESSORS);
  }
}

const meta: Meta = {
  title: 'Table/Advanced filters',
  decorators: [
    moduleMetadata({
      imports: [
        FilterSorterDemo,
        FilterTreeDemo,
        FilterPanelDemo,
        FilterControlledDemo,
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj;

export const FilterAndSorter: Story = {
  render: () => ({ template: `<andes-filter-sorter-demo />` }),
};

export const FilterInTree: Story = {
  render: () => ({ template: `<andes-filter-tree-demo />` }),
};

export const FilterSearch: Story = {
  render: () => ({
    template: `<andes-filter-tree-demo mode="menu" [customSearch]="true" />`,
  }),
};

export const CustomizedFilterPanel: Story = {
  render: () => ({ template: `<andes-filter-panel-demo />` }),
};

export const ResetFiltersAndSorters: Story = {
  render: () => ({ template: `<andes-filter-controlled-demo />` }),
};
