import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesTable, type AndesTableSelectionType } from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCell } from './table-cell';
import type { AndesTableRowKey } from './table-context';
import { andesFilterRows, type AndesTableFilters } from './table-data';
import { AndesTableEmpty } from './table-empty';
import { AndesTableExpandedRow, AndesTableExpandToggle } from './table-expand';
import { AndesTableFilter, type AndesTableFilterOption } from './table-filter';
import { AndesTableFooter } from './table-footer';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import { AndesTableSelectAll, AndesTableSelection } from './table-selection';
import type { AndesSortDirection, AndesSortState } from './table-sort';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly status: 'paid' | 'pending';
}

const ROWS: readonly Row[] = [
  { id: 'a', name: 'Ana', status: 'paid' },
  { id: 'b', name: 'Bruno', status: 'pending' },
  { id: 'c', name: 'Carla', status: 'paid' },
  { id: 'd', name: 'Diego', status: 'pending' },
];

function click(element: Element, init: MouseEventInit = {}): void {
  element.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
  );
}

describe('AndesTable row selection', () => {
  @Component({
    imports: [
      AndesTable,
      AndesTableBody,
      AndesTableCell,
      AndesTableHead,
      AndesTableHeader,
      AndesTableRow,
      AndesTableSelectAll,
      AndesTableSelection,
    ],
    template: `<andes-table
      [selectionType]="type()"
      [(selectedKeys)]="selected"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead><andes-table-select-all /></th>
          <th andesTableHead>Name</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (row of rows(); track row.id) {
          <tr andesTableRow [rowKey]="row.id">
            <td andesTableCell>
              <andes-table-selection
                [label]="'Select ' + row.name"
                [disabled]="disabledKeys().includes(row.id)"
              />
            </td>
            <td andesTableCell>{{ row.name }}</td>
          </tr>
        }
      </tbody>
    </andes-table>`,
  })
  class SelectionHost {
    readonly rows = signal<readonly Row[]>(ROWS);
    readonly type = signal<AndesTableSelectionType>('checkbox');
    readonly selected = signal<readonly AndesTableRowKey[]>([]);
    readonly disabledKeys = signal<readonly string[]>([]);
  }

  function setup() {
    const fixture = TestBed.createComponent(SelectionHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const all = () =>
      root.querySelector('andes-table-select-all input') as HTMLInputElement;
    const boxes = () =>
      Array.from(
        root.querySelectorAll('andes-table-selection input'),
      ) as HTMLInputElement[];
    const rowEls = () =>
      Array.from(root.querySelectorAll('tbody tr')) as HTMLElement[];
    const act = (element: Element, init?: MouseEventInit) => {
      click(element, init);
      fixture.detectChanges();
    };
    return { fixture, root, host, all, boxes, rowEls, act };
  }

  it('renders labelled checkboxes and tags each row with its key', () => {
    const { boxes, all, rowEls } = setup();

    expect(boxes().map((box) => box.type)).toEqual([
      'checkbox',
      'checkbox',
      'checkbox',
      'checkbox',
    ]);
    expect(boxes()[0].getAttribute('aria-label')).toBe('Select Ana');
    expect(all().getAttribute('aria-label')).toBe('Select all rows');
    expect(rowEls().map((row) => row.getAttribute('data-row-key'))).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('toggles a row into selectedKeys and marks the row selected', () => {
    const { host, boxes, rowEls, act } = setup();

    act(boxes()[1]);

    expect(host.selected()).toEqual(['b']);
    expect(boxes()[1].checked).toBe(true);
    expect(rowEls()[1].classList).toContain('andes-table__row--selected');

    act(boxes()[1]);

    expect(host.selected()).toEqual([]);
    expect(rowEls()[1].classList).not.toContain('andes-table__row--selected');
  });

  it('shows select-all as indeterminate for a partial selection and checked for a full one', () => {
    const { host, all, fixture } = setup();

    expect(all().checked).toBe(false);
    expect(all().indeterminate).toBe(false);

    host.selected.set(['a']);
    fixture.detectChanges();
    expect(all().checked).toBe(false);
    expect(all().indeterminate).toBe(true);

    host.selected.set(['a', 'b', 'c', 'd']);
    fixture.detectChanges();
    expect(all().checked).toBe(true);
    expect(all().indeterminate).toBe(false);
  });

  it('selects every rendered row, then clears them, from select-all', () => {
    const { host, all, act } = setup();

    act(all());
    expect([...host.selected()].sort()).toEqual(['a', 'b', 'c', 'd']);

    act(all());
    expect(host.selected()).toEqual([]);
  });

  it('leaves disabled rows alone in both directions', () => {
    const { host, all, boxes, fixture, act } = setup();
    host.disabledKeys.set(['b']);
    host.selected.set(['b']);
    fixture.detectChanges();

    expect(boxes()[1].disabled).toBe(true);

    act(all());
    expect([...host.selected()].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(all().checked).toBe(true);

    act(all());
    expect(host.selected()).toEqual(['b']);
  });

  it('keeps keys of rows that are not rendered (preserveSelectedRowKeys)', () => {
    const { host, all, fixture, act } = setup();
    host.selected.set(['zzz']);
    fixture.detectChanges();

    expect(all().indeterminate).toBe(false);

    act(all());
    expect(host.selected()).toContain('zzz');
    act(all());
    expect(host.selected()).toEqual(['zzz']);
  });

  it('selects a range with Shift-click', () => {
    const { host, boxes, act } = setup();

    act(boxes()[0]);
    act(boxes()[2], { shiftKey: true });

    expect([...host.selected()].sort()).toEqual(['a', 'b', 'c']);

    // The range runs from the last clicked row (c) and takes the clicked row's new
    // state: b is being deselected, so b..c are deselected together.
    act(boxes()[1], { shiftKey: true });
    expect(host.selected()).toEqual(['a']);
  });

  it('switches to radios that share a group and keep a single selection', () => {
    const { host, fixture, boxes, root, act } = setup();
    host.type.set('radio');
    fixture.detectChanges();

    expect(boxes().every((box) => box.type === 'radio')).toBe(true);
    const names = new Set(boxes().map((box) => box.name));
    expect(names.size).toBe(1);
    expect([...names][0]).toMatch(/^andes-table-\d+-selection$/);

    act(boxes()[0]);
    act(boxes()[2]);
    expect(host.selected()).toEqual(['c']);

    // No select-all for radios, but the header cell keeps an accessible name.
    expect(root.querySelector('andes-table-select-all input')).toBeNull();
    expect(
      root.querySelector('andes-table-select-all')?.textContent?.trim(),
    ).toBe('Selection');
  });

  it('disables select-all when no row can be selected', () => {
    const { host, fixture, all } = setup();
    host.rows.set([]);
    fixture.detectChanges();

    expect(all().disabled).toBe(true);
  });
});

describe('AndesTable expandable rows', () => {
  @Component({
    imports: [
      AndesTable,
      AndesTableBody,
      AndesTableCell,
      AndesTableExpandedRow,
      AndesTableExpandToggle,
      AndesTableRow,
    ],
    template: `<andes-table
      [(expandedKeys)]="expanded"
      [expandRowByClick]="byClick()"
    >
      <tbody andesTableBody>
        @for (row of rows; track row.id) {
          <tr andesTableRow [rowKey]="row.id">
            <td andesTableCell>
              <andes-table-expand-toggle [label]="'Details for ' + row.name" />
            </td>
            <td andesTableCell>{{ row.name }}</td>
            <td andesTableCell>
              <a href="#" (click)="$event.preventDefault()">Open</a>
            </td>
          </tr>
          <tr *andesTableExpandedRow="row.id" [attr.data-detail]="row.id">
            <td andesTableCell colspan="3">Details of {{ row.name }}</td>
          </tr>
        }
      </tbody>
    </andes-table>`,
  })
  class ExpandHost {
    readonly rows = ROWS;
    readonly expanded = signal<readonly AndesTableRowKey[]>([]);
    readonly byClick = signal(false);
  }

  function setup() {
    const fixture = TestBed.createComponent(ExpandHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const toggles = () =>
      Array.from(
        root.querySelectorAll('andes-table-expand-toggle button'),
      ) as HTMLButtonElement[];
    const details = () =>
      Array.from(root.querySelectorAll('[data-detail]')).map((el) =>
        el.getAttribute('data-detail'),
      );
    const act = (element: Element) => {
      click(element);
      fixture.detectChanges();
    };
    return {
      fixture,
      root,
      host: fixture.componentInstance,
      toggles,
      details,
      act,
    };
  }

  it('renders collapsed toggles with a stable accessible name', () => {
    const { toggles, details } = setup();

    expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');
    expect(toggles()[0].getAttribute('aria-label')).toBe('Details for Ana');
    expect(details()).toEqual([]);
  });

  it('renders the detail row right after its row only while expanded', () => {
    const { toggles, details, act, host, root } = setup();

    act(toggles()[1]);

    expect(host.expanded()).toEqual(['b']);
    expect(toggles()[1].getAttribute('aria-expanded')).toBe('true');
    expect(details()).toEqual(['b']);

    const detail = root.querySelector('[data-detail="b"]') as HTMLElement;
    expect(detail.previousElementSibling?.getAttribute('data-row-key')).toBe(
      'b',
    );
    expect(detail.classList).toContain('andes-table__expanded-row');
    expect(root.querySelector('[data-row-key="b"]')?.classList).toContain(
      'andes-table__row--expanded',
    );

    act(toggles()[1]);
    expect(details()).toEqual([]);
  });

  it('reflects expandedKeys pushed in from outside', () => {
    const { fixture, host, details } = setup();
    host.expanded.set(['a', 'd']);
    fixture.detectChanges();

    expect(details()).toEqual(['a', 'd']);
  });

  it('toggles from anywhere in the row with expandRowByClick, except interactive content', () => {
    const { fixture, host, root, act } = setup();
    host.byClick.set(true);
    fixture.detectChanges();

    const row = root.querySelector('[data-row-key="c"]') as HTMLElement;
    expect(row.classList).toContain('andes-table__row--clickable');

    act(row.children[1]);
    expect(host.expanded()).toEqual(['c']);

    act(row.querySelector('a') as HTMLElement);
    expect(host.expanded()).toEqual(['c']);

    // The toggle itself still toggles exactly once.
    act(row.querySelector('andes-table-expand-toggle button') as HTMLElement);
    expect(host.expanded()).toEqual([]);
  });

  it('ignores row clicks without expandRowByClick', () => {
    const { host, root, act } = setup();

    act(
      root.querySelector('[data-row-key="a"] td:nth-child(2)') as HTMLElement,
    );

    expect(host.expanded()).toEqual([]);
  });
});

describe('AndesTable sorting options', () => {
  @Component({
    imports: [AndesTable, AndesTableHead, AndesTableHeader, AndesTableRow],
    template: `<andes-table
      [multiSort]="multi()"
      [(sort)]="sort"
      [(sorts)]="sorts"
      [sortDirections]="directions()"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="name">Name</th>
          <th andesTableHead sortKey="status" [sortDirections]="['desc']">
            Status
          </th>
          <th andesTableHead sortKey="id">Id</th>
        </tr>
      </thead>
    </andes-table>`,
  })
  class SortHost {
    readonly multi = signal(false);
    readonly sort = signal<AndesSortState | null>(null);
    readonly sorts = signal<readonly AndesSortState[]>([]);
    readonly directions = signal<readonly AndesSortDirection[]>([
      'asc',
      'desc',
    ]);
  }

  function setup() {
    const fixture = TestBed.createComponent(SortHost);
    fixture.detectChanges();
    const heads = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('th'),
    );
    const act = (element: Element) => {
      click(element);
      fixture.detectChanges();
    };
    return { fixture, host: fixture.componentInstance, heads, act };
  }

  it('follows the table-level sortDirections', () => {
    const { fixture, host, heads, act } = setup();
    host.directions.set(['desc', 'asc']);
    fixture.detectChanges();

    act(heads[0]);
    expect(host.sort()).toEqual({ columnId: 'name', direction: 'desc' });
    act(heads[0]);
    expect(host.sort()).toEqual({ columnId: 'name', direction: 'asc' });
    act(heads[0]);
    expect(host.sort()).toBeNull();
  });

  it('lets a header override the directions', () => {
    const { host, heads, act } = setup();

    act(heads[1]);
    expect(host.sort()).toEqual({ columnId: 'status', direction: 'desc' });
    act(heads[1]);
    expect(host.sort()).toBeNull();
  });

  it('sorts several columns with multiSort, keeping click order as priority', () => {
    const { fixture, host, heads, act } = setup();
    host.multi.set(true);
    fixture.detectChanges();

    act(heads[0]);
    act(heads[2]);
    expect(host.sorts()).toEqual([
      { columnId: 'name', direction: 'asc' },
      { columnId: 'id', direction: 'asc' },
    ]);
    expect(host.sort()).toBeNull();
    expect(heads[0].getAttribute('aria-sort')).toBe('ascending');
    expect(heads[2].getAttribute('aria-sort')).toBe('ascending');
    expect(heads[0].getAttribute('data-sort-priority')).toBe('1');
    expect(heads[2].getAttribute('data-sort-priority')).toBe('2');

    // Cycling one column keeps its place and leaves the others alone.
    act(heads[0]);
    expect(host.sorts()).toEqual([
      { columnId: 'name', direction: 'desc' },
      { columnId: 'id', direction: 'asc' },
    ]);

    act(heads[0]);
    expect(host.sorts()).toEqual([{ columnId: 'id', direction: 'asc' }]);
    expect(heads[2].hasAttribute('data-sort-priority')).toBe(false);
  });
});

describe('AndesTable column filters', () => {
  const OPTIONS: readonly AndesTableFilterOption[] = [
    { text: 'Paid', value: 'paid' },
    { text: 'Pending', value: 'pending' },
  ];

  @Component({
    imports: [
      AndesTable,
      AndesTableBody,
      AndesTableCell,
      AndesTableFilter,
      AndesTableHead,
      AndesTableHeader,
      AndesTableRow,
    ],
    template: `<andes-table [(filters)]="filters" [(sort)]="sort">
        <thead andesTableHeader>
          <tr andesTableRow>
            <th andesTableHead sortKey="status">
              Status
              <andes-table-filter
                column="status"
                label="Filter status"
                [options]="options"
                [multiple]="multiple()"
                [searchable]="searchable()"
                [applyOnClose]="applyOnClose()"
              />
            </th>
            <th andesTableHead>
              Name
              <andes-table-filter
                column="name"
                label="Filter name"
                [panel]="custom"
              />
              <ng-template
                #custom
                let-selected
                let-set="setSelected"
                let-confirm="confirm"
                let-clear="clear"
              >
                <input
                  class="custom-input"
                  [value]="selected[0] ?? ''"
                  (input)="set([$any($event.target).value])"
                />
                <button type="button" class="custom-ok" (click)="confirm()">
                  Go
                </button>
                <button type="button" class="custom-clear" (click)="clear()">
                  Clear
                </button>
              </ng-template>
            </th>
          </tr>
        </thead>
        <tbody andesTableBody>
          @for (row of visible(); track row.id) {
            <tr andesTableRow [attr.data-id]="row.id">
              <td andesTableCell>{{ row.status }}</td>
              <td andesTableCell>{{ row.name }}</td>
            </tr>
          }
        </tbody>
      </andes-table>
      <button type="button" class="outside">Outside</button>`,
  })
  class FilterHost {
    readonly options = OPTIONS;
    readonly filters = signal<AndesTableFilters>({});
    readonly sort = signal<AndesSortState | null>(null);
    readonly multiple = signal(true);
    readonly searchable = signal(false);
    readonly applyOnClose = signal(true);
    readonly visible = computed(() =>
      andesFilterRows(ROWS, this.filters(), {
        status: (value, row) => row.status === value,
        name: (value, row) =>
          row.name.toLowerCase().includes(String(value).toLowerCase()),
      }),
    );
  }

  function setup() {
    const fixture = TestBed.createComponent(FilterHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const trigger = (index = 0) =>
      root.querySelectorAll('.andes-table-filter__trigger')[
        index
      ] as HTMLButtonElement;
    const panel = () =>
      root.querySelector('.andes-table-filter__panel') as HTMLElement | null;
    const options = () =>
      Array.from(
        root.querySelectorAll('.andes-table-filter__input'),
      ) as HTMLInputElement[];
    const visibleIds = () =>
      Array.from(root.querySelectorAll('tbody tr')).map((row) =>
        row.getAttribute('data-id'),
      );
    const act = (element: Element) => {
      click(element);
      fixture.detectChanges();
    };
    const check = (input: HTMLInputElement) => {
      input.click();
      fixture.detectChanges();
    };
    const buttonText = (text: string) =>
      Array.from(panel()?.querySelectorAll('button') ?? []).find(
        (button) => button.textContent?.trim() === text,
      ) as HTMLButtonElement;
    const key = (element: Element, value: string) => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: value, bubbles: true }),
      );
      fixture.detectChanges();
    };
    return {
      fixture,
      root,
      host,
      trigger,
      panel,
      options,
      visibleIds,
      act,
      check,
      buttonText,
      key,
    };
  }

  it('renders a labelled, collapsed dialog trigger', () => {
    const { trigger, panel } = setup();

    expect(trigger().getAttribute('aria-label')).toBe('Filter status');
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
  });

  it('opens a labelled dialog of option checkboxes without sorting the column', async () => {
    const { fixture, host, trigger, panel, options, act } = setup();

    act(trigger());
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.getAttribute('role')).toBe('dialog');
    expect(panel()?.getAttribute('aria-label')).toBe('Filter status');
    expect(trigger().getAttribute('aria-controls')).toBe(panel()?.id);
    expect(options().map((input) => input.type)).toEqual([
      'checkbox',
      'checkbox',
    ]);
    expect(host.sort()).toBeNull();
    expect(document.activeElement).toBe(options()[0]);
  });

  it('applies the chosen values on OK and marks the trigger active', () => {
    const {
      host,
      trigger,
      panel,
      options,
      visibleIds,
      act,
      check,
      buttonText,
    } = setup();

    act(trigger());
    check(options()[1]);
    act(buttonText('OK'));

    expect(host.filters()).toEqual({ status: ['pending'] });
    expect(visibleIds()).toEqual(['b', 'd']);
    expect(panel()).toBeNull();
    expect(trigger().classList).toContain(
      'andes-table-filter__trigger--active',
    );
    expect(document.activeElement).toBe(trigger());
    expect(host.sort()).toBeNull();
  });

  it('starts from the applied values and removes the filter when reset and confirmed', () => {
    const { host, fixture, trigger, options, act, buttonText } = setup();
    host.filters.set({ status: ['paid'] });
    fixture.detectChanges();

    act(trigger());
    expect(options().map((input) => input.checked)).toEqual([true, false]);

    act(buttonText('Reset'));
    expect(options().map((input) => input.checked)).toEqual([false, false]);

    act(buttonText('OK'));
    expect(host.filters()).toEqual({});
  });

  it('applies the draft when dismissed with Escape or an outside click, by default', () => {
    const { fixture, host, root, trigger, panel, options, act, check, key } =
      setup();

    act(trigger());
    check(options()[0]);
    key(options()[0], 'Escape');

    expect(panel()).toBeNull();
    expect(host.filters()).toEqual({ status: ['paid'] });
    expect(document.activeElement).toBe(trigger());

    act(trigger());
    check(options()[1]);
    (root.querySelector('.outside') as HTMLElement).dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    );
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(host.filters()).toEqual({ status: ['paid', 'pending'] });
  });

  it('discards the draft on dismiss when applyOnClose is off', () => {
    const { host, fixture, trigger, options, act, check, key } = setup();
    host.applyOnClose.set(false);
    fixture.detectChanges();

    act(trigger());
    check(options()[0]);
    key(options()[0], 'Escape');

    expect(host.filters()).toEqual({});
  });

  it('keeps Enter/Space inside the filter from sorting the column', () => {
    const { host, trigger, key } = setup();

    key(trigger(), 'Enter');
    key(trigger(), ' ');

    expect(host.sort()).toBeNull();
  });

  it('uses radios for a single-value filter', () => {
    const { host, fixture, trigger, options, act, check, buttonText } = setup();
    host.multiple.set(false);
    fixture.detectChanges();

    act(trigger());
    expect(options().every((input) => input.type === 'radio')).toBe(true);

    check(options()[0]);
    check(options()[1]);
    act(buttonText('OK'));

    expect(host.filters()).toEqual({ status: ['pending'] });
  });

  it('narrows the options with the search box', () => {
    const { host, fixture, root, trigger, options, act } = setup();
    host.searchable.set(true);
    fixture.detectChanges();

    act(trigger());
    const search = root.querySelector(
      '.andes-table-filter__search',
    ) as HTMLInputElement;
    search.value = 'pen';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(options()).toHaveLength(1);
    expect(options()[0].parentElement?.textContent?.trim()).toBe('Pending');

    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(
      root.querySelector('.andes-table-filter__no-match')?.textContent?.trim(),
    ).toBe('No matches');
  });

  it('renders a custom panel template with the draft and actions', () => {
    const { host, fixture, root, trigger, visibleIds, act } = setup();

    act(trigger(1));
    const input = root.querySelector('.custom-input') as HTMLInputElement;
    input.value = 'car';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    act(root.querySelector('.custom-ok') as HTMLElement);

    expect(host.filters()).toEqual({ name: ['car'] });
    expect(visibleIds()).toEqual(['c']);

    act(trigger(1));
    expect(
      (root.querySelector('.custom-input') as HTMLInputElement).value,
    ).toBe('car');
    act(root.querySelector('.custom-clear') as HTMLElement);
    expect(host.filters()).toEqual({});
  });
});

describe('AndesTable layout and states', () => {
  @Component({
    imports: [
      AndesTable,
      AndesTableBody,
      AndesTableCell,
      AndesTableEmpty,
      AndesTableFooter,
      AndesTableHead,
      AndesTableHeader,
      AndesTableRow,
    ],
    template: `<andes-table
      [loading]="loading()"
      loadingLabel="Fetching invoices"
      [scrollX]="scrollX()"
      [scrollY]="scrollY()"
      [tableLayout]="layout()"
    >
      <h2 andesTableTop>Invoices</h2>
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead fixed="start">Name</th>
          <th andesTableHead ellipsis>Notes</th>
          <th andesTableHead fixed="end" fixedOffset="40">Actions</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (row of rows(); track row.id) {
          <tr andesTableRow>
            <td andesTableCell fixed="start" [fixedOffset]="32">
              {{ row.name }}
            </td>
            <td andesTableCell ellipsis>Long notes</td>
            <td andesTableCell fixed="end">-</td>
          </tr>
        } @empty {
          <tr andesTableRow>
            <td andesTableCell colspan="3"><andes-table-empty /></td>
          </tr>
        }
      </tbody>
      <tfoot andesTableFooter fixed>
        <tr andesTableRow>
          <td andesTableCell colspan="3">Total</td>
        </tr>
      </tfoot>
      <nav andesTableBottom aria-label="Pages">Pager</nav>
    </andes-table>`,
  })
  class LayoutHost {
    readonly rows = signal<readonly Row[]>(ROWS);
    readonly loading = signal(false);
    readonly scrollX = signal<string | number | undefined>(undefined);
    readonly scrollY = signal<string | number | undefined>(undefined);
    readonly layout = signal<'auto' | 'fixed'>('auto');
  }

  function setup() {
    const fixture = TestBed.createComponent(LayoutHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      root,
      host: fixture.componentInstance,
      table: root.querySelector('table') as HTMLTableElement,
      container: root.querySelector('.andes-table__container') as HTMLElement,
    };
  }

  it('shows a loading overlay, marks the table busy and announces it', () => {
    const { fixture, host, root, table } = setup();
    const status = root.querySelector('[role="status"]') as HTMLElement;

    expect(table.hasAttribute('aria-busy')).toBe(false);
    expect(root.querySelector('.andes-table__loading')).toBeNull();
    expect(status.textContent?.trim()).toBe('');

    host.loading.set(true);
    fixture.detectChanges();

    expect(table.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('.andes-table__loading')).not.toBeNull();
    expect(status.textContent?.trim()).toBe('Fetching invoices');
  });

  it('renders the default empty state, or projected text', () => {
    const { fixture, host, root } = setup();
    host.rows.set([]);
    fixture.detectChanges();

    const empty = root.querySelector('andes-table-empty') as HTMLElement;
    expect(empty.textContent?.trim()).toBe('No data');
    expect(empty.closest('td')?.getAttribute('colspan')).toBe('3');

    @Component({
      imports: [AndesTableEmpty],
      template: `<andes-table-empty>Nothing here</andes-table-empty>`,
    })
    class CustomEmpty {}
    const custom = TestBed.createComponent(CustomEmpty);
    custom.detectChanges();
    expect((custom.nativeElement as HTMLElement).textContent?.trim()).toBe(
      'Nothing here',
    );
  });

  it('turns scrollX into a minimum width and scrollY into a max height with a sticky header', () => {
    const { fixture, host, table, container } = setup();

    expect(table.style.minWidth).toBe('');
    expect(container.style.maxHeight).toBe('');
    expect(table.classList).not.toContain('andes-table--sticky-header');

    host.scrollX.set(900);
    host.scrollY.set('20rem');
    fixture.detectChanges();

    expect(table.style.minWidth).toBe('900px');
    expect(container.style.maxHeight).toBe('20rem');
    expect(container.classList).toContain('andes-table__container--scroll-y');
    expect(table.classList).toContain('andes-table--sticky-header');
  });

  it('applies table-layout fixed on request', () => {
    const { fixture, host, table } = setup();
    host.layout.set('fixed');
    fixture.detectChanges();

    expect(table.classList).toContain('andes-table--layout-fixed');
  });

  it('pins fixed cells with a logical inset from their offset', () => {
    const { root } = setup();
    const [nameHead, , actionsHead] = Array.from(
      root.querySelectorAll('thead th'),
    ) as HTMLElement[];
    const [nameCell, notesCell, actionsCell] = Array.from(
      root.querySelectorAll('tbody tr:first-child td'),
    ) as HTMLElement[];

    expect(nameHead.classList).toContain('andes-table__fixed-start');
    expect(nameHead.style.getPropertyValue('inset-inline-start')).toBe('');
    expect(nameCell.style.getPropertyValue('inset-inline-start')).toBe('32px');
    expect(actionsHead.classList).toContain('andes-table__fixed-end');
    expect(actionsHead.style.getPropertyValue('inset-inline-end')).toBe('40px');
    expect(actionsCell.classList).toContain('andes-table__fixed');
    expect(notesCell.classList).not.toContain('andes-table__fixed');
    expect(notesCell.classList).toContain('andes-table__ellipsis');
  });

  it('derives offsets from the widths of the pinned cells before each one', () => {
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 50 } as DOMRect);

    @Component({
      imports: [AndesTable, AndesTableBody, AndesTableCell, AndesTableRow],
      template: `<andes-table>
        <tbody andesTableBody>
          <tr andesTableRow>
            <td andesTableCell fixed="start">a</td>
            <td andesTableCell fixed="start">b</td>
            <td andesTableCell>c</td>
            <td andesTableCell fixed="end">d</td>
            <td andesTableCell fixed="end">e</td>
          </tr>
        </tbody>
      </andes-table>`,
    })
    class OffsetHost {}

    const fixture = TestBed.createComponent(OffsetHost);
    fixture.detectChanges();
    const cells = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('td'),
    );
    const offset = (cell: HTMLElement) =>
      cell.style.getPropertyValue('--andes-table-fixed-offset');

    expect(cells.map(offset)).toEqual(['0px', '50px', '', '50px', '0px']);
    rect.mockRestore();
  });

  it('marks a fixed summary footer', () => {
    const { root } = setup();

    expect(root.querySelector('tfoot')?.classList).toContain(
      'andes-table__footer--fixed',
    );
  });

  it('projects top and bottom content outside the <table>', () => {
    const { root, table } = setup();
    const top = root.querySelector('h2') as HTMLElement;
    const bottom = root.querySelector('nav') as HTMLElement;

    expect(table.contains(top)).toBe(false);
    expect(table.contains(bottom)).toBe(false);
    expect(
      top.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      bottom.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });
});
