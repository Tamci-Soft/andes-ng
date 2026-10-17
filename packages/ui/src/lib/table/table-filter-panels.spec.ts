import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesTable, type AndesTableChange } from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCell } from './table-cell';
import { andesPlacePanel } from './table-context';
import {
  andesDateRangeFilter,
  andesFilterRows,
  andesOptionFilter,
  andesRangeFilter,
  andesReadDateRangeFilter,
  andesReadRangeFilter,
  andesReadTextFilter,
  andesTextFilter,
  type AndesTableFilters,
} from './table-data';
import { AndesTableFilter } from './table-filter';
import {
  AndesTableDateRangeFilter,
  AndesTableRangeFilter,
  AndesTableTextFilter,
} from './table-filter-panels';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import type { AndesSortState } from './table-sort';

interface Invoice {
  readonly id: string;
  readonly client: string;
  readonly amount: number | null;
  readonly issued: string;
  readonly tags: readonly string[];
}

const INVOICES: readonly Invoice[] = [
  {
    id: 'a',
    client: 'José Olaya',
    amount: 100,
    issued: '2026-01-10',
    tags: ['vip'],
  },
  {
    id: 'b',
    client: 'Andes Mining',
    amount: 250.5,
    issued: '2026-02-01',
    tags: [],
  },
  {
    id: 'c',
    client: 'Tamci Peru',
    amount: 900,
    issued: '2026-03-15',
    tags: ['vip', 'export'],
  },
  {
    id: 'd',
    client: 'Andina Foods',
    amount: null,
    issued: '2026-03-31',
    tags: ['export'],
  },
];

const ids = (rows: readonly Invoice[]) => rows.map((row) => row.id);

describe('advanced filter matchers', () => {
  it('matches text by operator, ignoring case and accents', () => {
    const match = (values: readonly (string | null)[]) =>
      ids(
        andesFilterRows(INVOICES, values.length ? { client: values } : {}, {
          client: andesTextFilter((row) => row.client),
        }),
      );

    expect(match(['contains', 'jose'])).toEqual(['a']);
    expect(match(['startsWith', 'and'])).toEqual(['b', 'd']);
    expect(match(['equals', 'TAMCI PERU'])).toEqual(['c']);
    expect(match(['endsWith', 'foods'])).toEqual(['d']);
    expect(match(['notContains', 'and'])).toEqual(['a', 'c']);
    expect(match(['contains', '   '])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps rows inside an inclusive number range with open ends', () => {
    const match = (min: number | null, max: number | null) =>
      ids(
        andesFilterRows(
          INVOICES,
          { amount: [min, max] },
          { amount: andesRangeFilter((row) => row.amount) },
        ),
      );

    expect(match(100, 250.5)).toEqual(['a', 'b']);
    expect(match(null, 100)).toEqual(['a']);
    expect(match(500, null)).toEqual(['c']);
    // Both ends open filters nothing, so the row without an amount stays too.
    expect(match(null, null)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('compares calendar days for a date range, both ends inclusive', () => {
    const match = (from: string | null, to: string | null) =>
      ids(
        andesFilterRows(
          INVOICES,
          { issued: [from, to] },
          {
            issued: andesDateRangeFilter(
              (row) => new Date(`${row.issued}T23:59:00`),
            ),
          },
        ),
      );

    expect(match('2026-02-01', '2026-03-15')).toEqual(['b', 'c']);
    expect(match('2026-03-31', null)).toEqual(['d']);
    expect(match(null, '2026-01-10')).toEqual(['a']);
  });

  it('matches option values against single and multi-valued cells', () => {
    expect(
      ids(
        andesFilterRows(
          INVOICES,
          { tags: ['export'] },
          { tags: andesOptionFilter((row) => row.tags) },
        ),
      ),
    ).toEqual(['c', 'd']);
  });

  it('reads each panel state back for a server-side query', () => {
    expect(andesReadTextFilter(['startsWith', ' and '])).toEqual({
      operator: 'startsWith',
      text: 'and',
    });
    expect(andesReadTextFilter(['contains', ''])).toBeNull();
    expect(andesReadTextFilter(['bogus', 'x'])).toBeNull();
    expect(andesReadRangeFilter([null, 50])).toEqual({ min: null, max: 50 });
    expect(andesReadRangeFilter([null, null])).toBeNull();
    expect(andesReadDateRangeFilter(['2026-01-01', null])).toEqual({
      min: '2026-01-01',
      max: null,
    });
    expect(andesReadDateRangeFilter(['01/01/2026', null])).toBeNull();
  });
});

describe('andesPlacePanel', () => {
  const height = 768;

  beforeEach(() => {
    for (const [name, value] of [
      ['clientWidth', 1024],
      ['clientHeight', height],
    ] as const) {
      Object.defineProperty(document.documentElement, name, {
        configurable: true,
        value,
      });
    }
  });

  afterEach(() => {
    // Back to the environment's own layout values.
    delete (document.documentElement as unknown as Record<string, unknown>)[
      'clientWidth'
    ];
    delete (document.documentElement as unknown as Record<string, unknown>)[
      'clientHeight'
    ];
  });

  function stub(
    element: HTMLElement,
    rect: Partial<DOMRect>,
    size = { width: 0, height: 0 },
  ) {
    element.getBoundingClientRect = () =>
      ({ top: 0, bottom: 0, left: 0, right: 0, ...rect }) as DOMRect;
    Object.defineProperty(element, 'offsetWidth', { value: size.width });
    Object.defineProperty(element, 'offsetHeight', { value: size.height });
  }

  it('opens below the button, end edges aligned', () => {
    const anchor = document.createElement('button');
    const panel = document.createElement('div');
    stub(anchor, { top: 100, bottom: 124, right: 400 });
    stub(panel, {}, { width: 160, height: 200 });

    expect(andesPlacePanel(panel, anchor)).toBe('below');
    expect(panel.style.top).toBe('128px');
    expect(panel.style.left).toBe('240px');
  });

  it('flips above the button when only the space there can hold it', () => {
    const anchor = document.createElement('button');
    const panel = document.createElement('div');
    stub(anchor, { top: height - 40, bottom: height - 16, right: 400 });
    stub(panel, {}, { width: 160, height: 200 });

    expect(andesPlacePanel(panel, anchor)).toBe('above');
    expect(panel.style.top).toBe(`${height - 40 - 4 - 200}px`);
  });
});

describe('ready-made filter panels', () => {
  @Component({
    imports: [
      AndesTable,
      AndesTableBody,
      AndesTableCell,
      AndesTableFilter,
      AndesTableHead,
      AndesTableHeader,
      AndesTableRow,
      AndesTableTextFilter,
      AndesTableRangeFilter,
      AndesTableDateRangeFilter,
    ],
    template: `<andes-table
        [(filters)]="filters"
        [(sort)]="sort"
        (tableChange)="changes.push($event)"
      >
        <thead andesTableHeader>
          <tr andesTableRow>
            <th andesTableHead sortKey="client">
              Client
              <andes-table-filter
                #clientFilter="andesTableFilter"
                column="client"
                label="Filter client"
              >
                <span
                  class="custom-icon"
                  [class.custom-icon--on]="clientFilter.active()"
                ></span>
                <andes-table-text-filter placeholder="Client name" />
              </andes-table-filter>
            </th>
            <th andesTableHead>
              Amount
              <andes-table-filter column="amount" label="Filter amount">
                <andes-table-range-filter />
              </andes-table-filter>
            </th>
            <th andesTableHead>
              Issued
              <andes-table-filter column="issued" label="Filter issued">
                <andes-table-date-range-filter />
              </andes-table-filter>
            </th>
          </tr>
        </thead>
        <tbody andesTableBody>
          @for (row of visible(); track row.id) {
            <tr andesTableRow [attr.data-id]="row.id">
              <td andesTableCell>{{ row.client }}</td>
              <td andesTableCell>{{ row.amount }}</td>
              <td andesTableCell>{{ row.issued }}</td>
            </tr>
          }
        </tbody>
      </andes-table>
      <button type="button" class="outside">Outside</button>`,
  })
  class PanelsHost {
    readonly filters = signal<AndesTableFilters>({});
    readonly sort = signal<AndesSortState | null>(null);
    readonly changes: AndesTableChange[] = [];
    readonly visible = computed(() =>
      andesFilterRows(INVOICES, this.filters(), {
        client: andesTextFilter((row) => row.client),
        amount: andesRangeFilter((row) => row.amount),
        issued: andesDateRangeFilter((row) => row.issued),
      }),
    );
  }

  function setup() {
    const fixture = TestBed.createComponent(PanelsHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const trigger = (index: number) =>
      root.querySelectorAll<HTMLButtonElement>('.andes-table-filter__trigger')[
        index
      ];
    const panel = () =>
      root.querySelector<HTMLElement>('.andes-table-filter__panel');
    const fields = () =>
      Array.from(
        panel()?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
          'input, select',
        ) ?? [],
      );
    const button = (text: string) =>
      Array.from(panel()?.querySelectorAll('button') ?? []).find(
        (item) => item.textContent?.trim() === text,
      ) as HTMLButtonElement;
    const type = (
      field: HTMLInputElement | HTMLSelectElement,
      value: string,
    ) => {
      field.value = value;
      field.dispatchEvent(
        new Event(field instanceof HTMLSelectElement ? 'change' : 'input'),
      );
      fixture.detectChanges();
    };
    const open = (index: number) => {
      trigger(index).click();
      fixture.detectChanges();
    };
    const ok = () => {
      button('OK').click();
      fixture.detectChanges();
    };
    const visibleIds = () =>
      Array.from(root.querySelectorAll('tbody tr')).map((row) =>
        row.getAttribute('data-id'),
      );
    return {
      fixture,
      root,
      host,
      trigger,
      panel,
      fields,
      button,
      type,
      open,
      ok,
      visibleIds,
    };
  }

  it('replaces the funnel with the projected icon and lets it follow active()', () => {
    const { root, host, fixture, trigger } = setup();

    expect(trigger(0).querySelector('.andes-table-filter__icon')).toBeNull();
    expect(trigger(0).querySelector('.custom-icon')).not.toBeNull();
    expect(root.querySelector('.custom-icon--on')).toBeNull();

    host.filters.set({ client: ['contains', 'and'] });
    fixture.detectChanges();
    expect(root.querySelector('.custom-icon--on')).not.toBeNull();
  });

  it('renders the text panel in place of the option list, keeping Reset / OK', () => {
    const { panel, fields, button, open } = setup();

    open(0);

    expect(panel()?.querySelector('.andes-table-filter__options')).toBeNull();
    expect(fields().map((field) => field.tagName)).toEqual(['SELECT', 'INPUT']);
    expect(button('Reset')).toBeTruthy();
    expect(button('OK')).toBeTruthy();
  });

  it('applies an operator and a query from the text panel', () => {
    const { host, fields, type, open, ok, visibleIds } = setup();

    open(0);
    type(fields()[1], 'jose');
    ok();
    expect(host.filters()).toEqual({ client: ['contains', 'jose'] });
    expect(visibleIds()).toEqual(['a']);

    open(0);
    expect((fields()[1] as HTMLInputElement).value).toBe('jose');
    type(fields()[0], 'startsWith');
    type(fields()[1], 'and');
    ok();
    expect(host.filters()).toEqual({ client: ['startsWith', 'and'] });
    expect(visibleIds()).toEqual(['b', 'd']);
  });

  it('applies the text panel on Enter and empties it on Reset', () => {
    const { host, fixture, fields, button, type, open } = setup();

    open(0);
    type(fields()[1], 'tamci');
    fields()[1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.filters()).toEqual({ client: ['contains', 'tamci'] });

    open(0);
    button('Reset').click();
    fixture.detectChanges();
    expect((fields()[1] as HTMLInputElement).value).toBe('');
    button('OK').click();
    fixture.detectChanges();
    expect(host.filters()).toEqual({});
  });

  it('applies a number range, with open ends and a decimal comma', () => {
    const { host, fields, type, open, ok, visibleIds } = setup();

    open(1);
    type(fields()[0], '100');
    type(fields()[1], '250,5');
    ok();
    expect(host.filters()).toEqual({ amount: [100, 250.5] });
    expect(visibleIds()).toEqual(['a', 'b']);

    open(1);
    type(fields()[0], '');
    ok();
    expect(host.filters()).toEqual({ amount: [null, 250.5] });
  });

  it('blocks OK and does not apply on dismiss while the range is invalid', () => {
    const { host, fixture, root, fields, button, type, open, panel } = setup();

    open(1);
    type(fields()[0], '500');
    type(fields()[1], '100');

    expect(button('OK').disabled).toBe(true);
    expect(fields()[0].getAttribute('aria-invalid')).toBe('true');

    type(fields()[1], 'abc');
    expect(fields()[1].getAttribute('aria-invalid')).toBe('true');
    // The half-typed text stays in the field.
    expect((fields()[1] as HTMLInputElement).value).toBe('abc');

    (root.querySelector('.outside') as HTMLElement).dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    );
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(host.filters()).toEqual({});
  });

  it('applies a date range and flags a reversed one', () => {
    const { host, fields, button, type, open, ok, visibleIds } = setup();

    open(2);
    type(fields()[0], '2026-02-01');
    type(fields()[1], '2026-03-15');
    ok();
    expect(host.filters()).toEqual({ issued: ['2026-02-01', '2026-03-15'] });
    expect(visibleIds()).toEqual(['b', 'c']);

    open(2);
    expect(fields().map((field) => field.value)).toEqual([
      '2026-02-01',
      '2026-03-15',
    ]);
    type(fields()[0], '2026-04-01');
    expect(button('OK').disabled).toBe(true);
  });

  it('shows a controlled filter value when the panel opens', () => {
    const { host, fixture, fields, open } = setup();
    host.filters.set({ amount: [10, null] });
    fixture.detectChanges();

    open(1);
    expect(fields().map((field) => field.value)).toEqual(['10', '']);
  });

  it('closes and applies when focus tabs out of the panel', () => {
    const { host, fixture, root, fields, type, open, panel } = setup();

    open(0);
    type(fields()[1], 'peru');
    fields()[1].dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: root.querySelector('.outside'),
      }),
    );
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(host.filters()).toEqual({ client: ['contains', 'peru'] });
  });

  it('does not report a change when the filter is confirmed unchanged', () => {
    const { host, open, ok } = setup();

    open(0);
    ok();
    expect(host.changes).toEqual([]);
  });

  it('clears filters and sort through the table API with one event each', () => {
    const { host, fixture, root } = setup();
    const table = fixture.debugElement.children[0]
      .componentInstance as AndesTable;
    host.filters.set({ client: ['contains', 'a'], amount: [1, null] });
    host.sort.set({ columnId: 'client', direction: 'asc' });
    fixture.detectChanges();

    table.clearFilters(['amount']);
    expect(host.filters()).toEqual({ client: ['contains', 'a'] });

    table.resetState();
    fixture.detectChanges();
    expect(host.filters()).toEqual({});
    expect(host.sort()).toBeNull();
    expect(host.changes.map((change) => change.action)).toEqual([
      'filter',
      'reset',
    ]);

    // Nothing left to clear: no further events.
    table.clearFilters();
    table.clearSort();
    table.resetState();
    expect(host.changes).toHaveLength(2);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(4);
  });
});
