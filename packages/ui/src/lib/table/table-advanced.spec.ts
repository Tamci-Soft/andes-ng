import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesTable,
  type AndesTableChange,
  type AndesTableExpandEvent,
  type AndesTableRowSelectEvent,
} from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCell } from './table-cell';
import type { AndesTableRowKey } from './table-context';
import type { AndesTableFilters } from './table-data';
import { AndesTableExpandedRow, AndesTableExpandToggle } from './table-expand';
import { AndesTableFilter, type AndesTableFilterOption } from './table-filter';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import {
  AndesTableSelectAll,
  AndesTableSelection,
  type AndesTableSelectionItem,
  type AndesTableSelectionPreset,
} from './table-selection';
import type { AndesSortState } from './table-sort';
import {
  andesFlattenTree,
  andesTreeDescendants,
  andesTreeIndex,
} from './table-tree';
import { AndesTableVirtualRows } from './table-virtual';

const PARTS = [
  AndesTable,
  AndesTableBody,
  AndesTableCell,
  AndesTableExpandedRow,
  AndesTableExpandToggle,
  AndesTableFilter,
  AndesTableHead,
  AndesTableHeader,
  AndesTableRow,
  AndesTableSelectAll,
  AndesTableSelection,
  AndesTableVirtualRows,
];

interface Account {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly Account[];
}

const ACCOUNTS: readonly Account[] = [
  {
    id: 'assets',
    name: 'Assets',
    children: [
      { id: 'cash', name: 'Cash' },
      {
        id: 'receivables',
        name: 'Receivables',
        children: [
          { id: 'clients', name: 'Clients' },
          { id: 'staff', name: 'Staff' },
        ],
      },
    ],
  },
  { id: 'equity', name: 'Equity' },
];

const ACCESSORS = {
  key: (account: Account) => account.id,
  children: (account: Account) => account.children,
};

function click(element: Element, init: MouseEventInit = {}): void {
  element.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
  );
}

function key(element: Element, value: string, init: KeyboardEventInit = {}) {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: value,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

describe('table tree helpers', () => {
  it('flattens only the children of expanded parents, with their depth', () => {
    const nodes = andesFlattenTree(ACCOUNTS, {
      ...ACCESSORS,
      expandedKeys: ['assets'],
    });

    expect(nodes.map((node) => [node.key, node.level])).toEqual([
      ['assets', 0],
      ['cash', 1],
      ['receivables', 1],
      ['equity', 0],
    ]);
    expect(nodes[0]).toMatchObject({ hasChildren: true, expanded: true });
    expect(nodes[2]).toMatchObject({
      parentKey: 'assets',
      hasChildren: true,
      expanded: false,
    });
  });

  it('hides grandchildren of a collapsed parent even when they are expanded', () => {
    const nodes = andesFlattenTree(ACCOUNTS, {
      ...ACCESSORS,
      expandedKeys: ['receivables'],
    });
    expect(nodes.map((node) => node.key)).toEqual(['assets', 'equity']);
  });

  it('orders each set of siblings with sortSiblings', () => {
    const nodes = andesFlattenTree(ACCOUNTS, {
      ...ACCESSORS,
      expandedKeys: ['assets'],
      sortSiblings: (rows) => [...rows].reverse(),
    });
    expect(nodes.map((node) => node.key)).toEqual([
      'equity',
      'assets',
      'receivables',
      'cash',
    ]);
  });

  it('indexes parents and children, collapsed ones included', () => {
    const tree = andesTreeIndex(ACCOUNTS, ACCESSORS);

    expect([...tree.childrenOf.keys()]).toEqual(['assets', 'receivables']);
    expect(tree.parentOf.get('staff')).toBe('receivables');
    expect(andesTreeDescendants(tree, 'assets')).toEqual([
      'cash',
      'receivables',
      'clients',
      'staff',
    ]);
  });
});

describe('AndesTable tree data', () => {
  @Component({
    imports: PARTS,
    template: `<andes-table
      indentSize="20"
      [selectionTree]="tree"
      [(selectedKeys)]="selected"
      [(expandedKeys)]="expanded"
    >
      <tbody andesTableBody>
        @for (node of nodes(); track node.key) {
          <tr andesTableRow [rowKey]="node.key" [level]="node.level">
            <td andesTableCell>
              <andes-table-selection [label]="'Select ' + node.row.name" />
            </td>
            <td andesTableCell indent>
              <andes-table-expand-toggle [spacer]="!node.hasChildren" />
              {{ node.row.name }}
            </td>
          </tr>
        }
      </tbody>
    </andes-table>`,
  })
  class TreeHost {
    readonly tree = andesTreeIndex(ACCOUNTS, ACCESSORS);
    readonly selected = signal<readonly AndesTableRowKey[]>([]);
    readonly expanded = signal<readonly AndesTableRowKey[]>([
      'assets',
      'receivables',
    ]);
    readonly nodes = computed(() =>
      andesFlattenTree(ACCOUNTS, {
        ...ACCESSORS,
        expandedKeys: this.expanded(),
      }),
    );
  }

  function setup() {
    const fixture = TestBed.createComponent(TreeHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const box = (id: string) =>
      root.querySelector(
        `tr[data-row-key="${id}"] andes-table-selection input`,
      ) as HTMLInputElement;
    const act = (element: Element) => {
      click(element);
      fixture.detectChanges();
    };
    return { fixture, root, host: fixture.componentInstance, box, act };
  }

  it('indents rows by level and renders spacers for leaves', () => {
    const { root } = setup();
    const row = root.querySelector('tr[data-row-key="clients"]') as HTMLElement;

    expect(row.getAttribute('data-level')).toBe('2');
    expect(row.style.getPropertyValue('--andes-table-level')).toBe('2');
    expect(row.querySelector('td.andes-table__cell--indent')).not.toBeNull();
    expect(
      row.querySelector('.andes-table-control__expand-spacer'),
    ).not.toBeNull();
    expect(row.querySelector('button')).toBeNull();
    expect(
      (root.querySelector('table') as HTMLElement).style.getPropertyValue(
        '--andes-table-indent-size',
      ),
    ).toBe('20px');
  });

  it('cascades a parent selection to all of its descendants', () => {
    const { host, box, act } = setup();

    act(box('receivables'));
    expect([...host.selected()].sort()).toEqual([
      'clients',
      'receivables',
      'staff',
    ]);
    expect(box('assets').indeterminate).toBe(true);
    expect(box('assets').checked).toBe(false);
  });

  it('selects a parent once all its children are, and clears it again', () => {
    const { host, box, act } = setup();

    act(box('clients'));
    expect(box('receivables').indeterminate).toBe(true);

    act(box('staff'));
    expect(host.selected()).toContain('receivables');
    expect(box('receivables').checked).toBe(true);

    act(box('cash'));
    expect([...host.selected()].sort()).toEqual([
      'assets',
      'cash',
      'clients',
      'receivables',
      'staff',
    ]);

    act(box('staff'));
    expect(host.selected()).not.toContain('receivables');
    expect(host.selected()).not.toContain('assets');
    expect(box('assets').indeterminate).toBe(true);
  });
});

describe('AndesTable events and bulk selection', () => {
  @Component({
    imports: PARTS,
    template: `<andes-table
      [(sort)]="sort"
      [(filters)]="filters"
      [(selectedKeys)]="selected"
      [(expandedKeys)]="expanded"
      [selectableKeys]="allKeys()"
      (tableChange)="changes.push($event)"
      (rowSelect)="selects.push($event)"
      (expandChange)="expands.push($event)"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead>
            <andes-table-select-all [selections]="selections" />
          </th>
          <th andesTableHead sortKey="name">
            Name
            <andes-table-filter
              column="name"
              label="Filter name"
              [options]="options"
            />
          </th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (id of rendered(); track id) {
          <tr andesTableRow [rowKey]="id">
            <td andesTableCell>
              <andes-table-selection
                [label]="'Select ' + id"
                [disabled]="id === 'c'"
              />
            </td>
            <td andesTableCell>
              <andes-table-expand-toggle [label]="'Details ' + id" />
              {{ id }}
            </td>
          </tr>
        }
      </tbody>
    </andes-table>`,
  })
  class EventsHost {
    readonly sort = signal<AndesSortState | null>(null);
    readonly filters = signal<AndesTableFilters>({});
    readonly selected = signal<readonly AndesTableRowKey[]>([]);
    readonly expanded = signal<readonly AndesTableRowKey[]>([]);
    readonly allKeys = signal<readonly AndesTableRowKey[] | null>(null);
    readonly rendered = signal(['a', 'b', 'c', 'd']);
    readonly options: AndesTableFilterOption[] = [
      { text: 'A', value: 'a' },
      { text: 'B', value: 'b' },
    ];
    readonly selections: (
      AndesTableSelectionPreset | AndesTableSelectionItem
    )[] = [
      'all',
      'invert',
      'none',
      {
        key: 'first',
        text: 'First row only',
        select: (keys) => this.selected.set(keys.slice(0, 1)),
      },
    ];
    readonly changes: AndesTableChange[] = [];
    readonly selects: AndesTableRowSelectEvent[] = [];
    readonly expands: AndesTableExpandEvent[] = [];
  }

  function setup() {
    const fixture = TestBed.createComponent(EventsHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const act = (element: Element, init?: MouseEventInit) => {
      click(element, init);
      fixture.detectChanges();
    };
    const box = (id: string) =>
      root.querySelector(
        `tr[data-row-key="${id}"] andes-table-selection input`,
      ) as HTMLInputElement;
    const menuTrigger = () =>
      root.querySelector(
        '.andes-table-control__menu-trigger',
      ) as HTMLButtonElement;
    const menuItems = () =>
      Array.from(
        root.querySelectorAll('[role="menuitem"]'),
      ) as HTMLButtonElement[];
    return { fixture, root, host, act, box, menuTrigger, menuItems };
  }

  it('emits the whole query state when the sort or a filter changes', () => {
    const { root, host, act, fixture } = setup();

    act(root.querySelector('th[aria-sort]') as HTMLElement);
    expect(host.changes).toEqual([
      {
        action: 'sort',
        columnId: 'name',
        sort: { columnId: 'name', direction: 'asc' },
        sorts: [{ columnId: 'name', direction: 'asc' }],
        filters: {},
      },
    ]);

    act(root.querySelector('.andes-table-filter__trigger') as HTMLElement);
    act(document.querySelector('.andes-table-filter__input') as HTMLElement);
    const ok = Array.from(
      root.querySelectorAll('.andes-table-filter__actions andes-button'),
    ).pop() as HTMLElement;
    act(ok.querySelector('button') ?? ok);
    fixture.detectChanges();

    expect(host.changes.at(-1)).toEqual({
      action: 'filter',
      columnId: 'name',
      sort: { columnId: 'name', direction: 'asc' },
      sorts: [{ columnId: 'name', direction: 'asc' }],
      filters: { name: ['a'] },
    });
  });

  it('emits rowSelect and expandChange for user toggles', () => {
    const { root, host, act, box } = setup();

    act(box('b'));
    expect(host.selects).toEqual([
      { key: 'b', selected: true, selectedKeys: ['b'] },
    ]);

    act(
      root.querySelector(
        'tr[data-row-key="a"] andes-table-expand-toggle button',
      ) as HTMLElement,
    );
    expect(host.expands).toEqual([{ key: 'a', expanded: true }]);
    expect(host.expanded()).toEqual(['a']);
  });

  it('opens a menu of selection entries from the select-all header', () => {
    const { host, act, menuTrigger, menuItems } = setup();

    expect(menuTrigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(menuTrigger().getAttribute('aria-expanded')).toBe('false');
    act(menuTrigger());
    expect(menuTrigger().getAttribute('aria-expanded')).toBe('true');
    expect(menuItems().map((item) => item.textContent?.trim())).toEqual([
      'Select current page',
      'Invert current page',
      'Clear selection',
      'First row only',
    ]);

    act(menuItems()[0]);
    expect(host.selected()).toEqual(['a', 'b', 'd']);
    expect(menuItems()).toEqual([]);
  });

  it('inverts the changeable rows, clears, and runs custom entries', () => {
    const { host, act, menuTrigger, menuItems, fixture } = setup();
    host.selected.set(['a', 'c']);
    fixture.detectChanges();

    act(menuTrigger());
    act(menuItems()[1]);
    expect([...host.selected()].sort()).toEqual(['b', 'c', 'd']);

    act(menuTrigger());
    act(menuItems()[2]);
    expect(host.selected()).toEqual(['c']);

    act(menuTrigger());
    act(menuItems()[3]);
    expect(host.selected()).toEqual(['a']);
  });

  it('moves through the menu with the arrow keys and closes on Escape', () => {
    const { root, act, menuTrigger, menuItems, fixture } = setup();
    act(menuTrigger());
    const menu = root.querySelector('[role="menu"]') as HTMLElement;

    menuItems()[0].focus();
    key(menu, 'ArrowDown');
    expect(document.activeElement).toBe(menuItems()[1]);
    key(menu, 'End');
    expect(document.activeElement).toBe(menuItems()[3]);
    key(menu, 'ArrowDown');
    expect(document.activeElement).toBe(menuItems()[0]);

    key(menu, 'Escape');
    fixture.detectChanges();
    expect(menuItems()).toEqual([]);
    expect(document.activeElement).toBe(menuTrigger());
  });

  it('selects every key of selectableKeys from select-all, not just the rendered rows', () => {
    const { root, host, act, fixture } = setup();
    host.allKeys.set(['a', 'b', 'c', 'd', 'e', 'f']);
    fixture.detectChanges();

    act(root.querySelector('andes-table-select-all input') as HTMLElement);
    expect(host.selected()).toEqual(['a', 'b', 'd', 'e', 'f']);
  });
});

describe('AndesTable header features', () => {
  @Component({
    imports: PARTS,
    template: `<andes-table
      sortTooltip
      tableLayout="fixed"
      [(columnWidths)]="widths"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="name" #name="andesTableHead">
            Name {{ name.direction() ?? 'none' }}
          </th>
          <th
            andesTableHead
            sortKey="total"
            style="width: 7rem"
            [sortIcon]="false"
            [sortTooltip]="false"
          >
            Total
          </th>
          <th
            andesTableHead
            columnKey="notes"
            resizable
            hideBelow="md"
            [minWidth]="60"
            [maxWidth]="200"
          >
            Notes
          </th>
        </tr>
      </thead>
      <tbody andesTableBody>
        <tr andesTableRow>
          <td andesTableCell>Ana</td>
          <td andesTableCell>1</td>
          <td andesTableCell hideBelow="md" ellipsis>Short</td>
        </tr>
      </tbody>
    </andes-table>`,
  })
  class HeaderHost {
    readonly widths = signal<Readonly<Record<string, number>>>({ notes: 100 });
  }

  function setup() {
    const fixture = TestBed.createComponent(HeaderHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const heads = Array.from(root.querySelectorAll('th')) as HTMLElement[];
    return { fixture, root, heads, host: fixture.componentInstance };
  }

  it('names the next sort step in a native tooltip', () => {
    const { heads, fixture } = setup();

    expect(heads[0].getAttribute('title')).toBe('Click to sort ascending');
    click(heads[0]);
    fixture.detectChanges();
    expect(heads[0].getAttribute('title')).toBe('Click to sort descending');
    click(heads[0]);
    fixture.detectChanges();
    expect(heads[0].getAttribute('title')).toBe('Click to cancel sorting');
    expect(heads[1].hasAttribute('title')).toBe(false);
  });

  it('exposes the header state for a custom sort indicator', () => {
    const { heads, fixture } = setup();

    expect(heads[1].querySelector('.andes-table__sorter')).toBeNull();
    expect(heads[0].querySelector('.andes-table__sorter')).not.toBeNull();
    click(heads[0]);
    fixture.detectChanges();
    expect(heads[0].textContent).toContain('Name asc');
  });

  it('resizes a column from the keyboard within its bounds, without sorting', () => {
    const { heads, host, fixture } = setup();
    const handle = heads[2].querySelector(
      '.andes-table__resize-handle',
    ) as HTMLElement;

    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.textContent?.trim()).toBe('Resize column');
    expect(heads[2].style.width).toBe('100px');

    key(handle, 'ArrowRight');
    fixture.detectChanges();
    expect(host.widths()['notes']).toBe(110);
    expect(heads[2].style.width).toBe('110px');
    expect(handle.getAttribute('aria-valuenow')).toBe('110');

    key(handle, 'ArrowLeft', { shiftKey: true });
    fixture.detectChanges();
    expect(host.widths()['notes']).toBe(60);

    key(handle, 'ArrowRight', { shiftKey: true });
    key(handle, 'ArrowRight', { shiftKey: true });
    key(handle, 'ArrowRight', { shiftKey: true });
    key(handle, 'ArrowRight', { shiftKey: true });
    fixture.detectChanges();
    expect(host.widths()['notes']).toBe(200);
  });

  it("keeps a header's own inline width when it has no bound width", () => {
    const { heads } = setup();
    expect(heads[1].style.width).toBe('7rem');
  });

  it('marks responsive cells with their breakpoint class', () => {
    const { root, heads } = setup();
    expect(heads[2].classList).toContain('andes-table__hide-below-md');
    expect(root.querySelector('td.andes-table__hide-below-md')).not.toBeNull();
  });
});

describe('AndesTable tree filter', () => {
  @Component({
    imports: PARTS,
    template: `<andes-table [(filters)]="filters">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead>
            Region
            <andes-table-filter
              column="region"
              label="Filter region"
              searchable
              mode="tree"
              [options]="options"
              [defaultFilteredValue]="['lima']"
              resetToDefault
              (openChange)="opens.push($event)"
              ><span class="custom-icon"></span
            ></andes-table-filter>
          </th>
        </tr>
      </thead>
    </andes-table>`,
  })
  class TreeFilterHost {
    readonly filters = signal<AndesTableFilters>({});
    readonly opens: boolean[] = [];
    readonly options: AndesTableFilterOption[] = [
      {
        text: 'Peru',
        value: 'peru',
        children: [
          { text: 'Lima', value: 'lima' },
          { text: 'Cusco', value: 'cusco' },
        ],
      },
      { text: 'Chile', value: 'chile' },
    ];
  }

  function setup() {
    const fixture = TestBed.createComponent(TreeFilterHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const act = (element: Element) => {
      click(element);
      fixture.detectChanges();
    };
    act(root.querySelector('.andes-table-filter__trigger') as HTMLElement);
    const option = (text: string) =>
      Array.from(root.querySelectorAll('.andes-table-filter__option')).find(
        (label) => label.textContent?.trim() === text,
      ) as HTMLElement | undefined;
    const input = (text: string) =>
      option(text)?.querySelector('input') as HTMLInputElement;
    const actions = () =>
      Array.from(
        root.querySelectorAll('.andes-table-filter__actions button'),
      ) as HTMLButtonElement[];
    return { fixture, root, act, option, input, actions };
  }

  it('replaces the trigger icon with projected content and reports opening', () => {
    const { root, fixture } = setup();
    expect(
      root.querySelector('.andes-table-filter__trigger .custom-icon'),
    ).not.toBeNull();
    expect(root.querySelector('.andes-table-filter__icon')).toBeNull();
    expect(fixture.componentInstance.opens).toEqual([true]);
  });

  it('indents children and checks a whole branch from its parent', () => {
    const { act, option, input } = setup();

    expect(
      (
        option('Lima')?.closest('.andes-table-filter__node') as HTMLElement
      ).style.getPropertyValue('--andes-table-filter-level'),
    ).toBe('1');

    act(input('Peru'));
    expect(input('Lima').checked).toBe(true);
    expect(input('Cusco').checked).toBe(true);
    expect(input('Peru').checked).toBe(true);

    act(input('Cusco'));
    expect(input('Peru').checked).toBe(false);
    expect(input('Peru').indeterminate).toBe(true);
  });

  it('keeps the parents of matching children while searching', () => {
    const { root, fixture, option } = setup();
    const search = root.querySelector(
      '.andes-table-filter__search-input',
    ) as HTMLInputElement;

    search.value = 'cus';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(option('Peru')).toBeDefined();
    expect(option('Cusco')).toBeDefined();
    expect(option('Lima')).toBeUndefined();
    expect(option('Chile')).toBeUndefined();
  });

  it('resets to the default value and applies the parent with its children', () => {
    const { act, input, actions, fixture } = setup();

    act(input('Chile'));
    act(actions()[0]);
    expect(input('Lima').checked).toBe(true);
    expect(input('Chile').checked).toBe(false);
    expect(actions()[0].disabled).toBe(true);

    act(input('Cusco'));
    act(actions()[1]);
    fixture.detectChanges();
    expect(fixture.componentInstance.filters()).toEqual({
      region: ['lima', 'cusco', 'peru'],
    });
    expect(fixture.componentInstance.opens).toEqual([true, false]);
  });
});

describe('AndesTable expanded rows and nesting', () => {
  @Component({
    imports: PARTS,
    template: `<andes-table
      [(expandedKeys)]="expanded"
      [(selectedKeys)]="outer"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead><andes-table-select-all /></th>
          <th andesTableHead>Order</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (id of ['a', 'b']; track id) {
          <tr andesTableRow [rowKey]="id">
            <td andesTableCell><andes-table-selection /></td>
            <td andesTableCell>
              <andes-table-expand-toggle #toggle="andesTableExpandToggle">
                <span class="plus">{{ toggle.expanded() ? '-' : '+' }}</span>
              </andes-table-expand-toggle>
              {{ id }}
            </td>
          </tr>
          <tr *andesTableExpandedRow="id; forceRender: true">
            <td andesTableCell colspan="2">
              <andes-table [(selectedKeys)]="inner">
                <tbody andesTableBody>
                  <tr andesTableRow [rowKey]="id + '-1'">
                    <td andesTableCell><andes-table-selection /></td>
                  </tr>
                </tbody>
              </andes-table>
            </td>
          </tr>
        }
      </tbody>
    </andes-table>`,
  })
  class NestedHost {
    readonly expanded = signal<readonly AndesTableRowKey[]>([]);
    readonly outer = signal<readonly AndesTableRowKey[]>([]);
    readonly inner = signal<readonly AndesTableRowKey[]>([]);
  }

  function setup() {
    const fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, host: fixture.componentInstance };
  }

  it('renders forceRender detail rows up front and only hides them while collapsed', () => {
    const { root, host, fixture } = setup();
    const details = () =>
      Array.from(
        root.querySelectorAll(
          ':scope > andes-table > div tr.andes-table__expanded-row',
        ),
      ) as HTMLElement[];

    expect(details().length).toBe(2);
    expect(details().every((row) => row.hidden)).toBe(true);

    host.expanded.set(['b']);
    fixture.detectChanges();
    expect(details().map((row) => row.hidden)).toEqual([true, false]);
  });

  it('lets projected content replace the chevron and read the state', () => {
    const { root, fixture } = setup();
    const button = root.querySelector(
      'andes-table-expand-toggle button',
    ) as HTMLButtonElement;

    expect(button.querySelector('.andes-table-control__chevron')).toBeNull();
    expect(button.textContent?.trim()).toBe('+');
    click(button);
    fixture.detectChanges();
    expect(button.textContent?.trim()).toBe('-');
  });

  it("keeps a nested table's rows out of the outer select-all", () => {
    const { root, host, fixture } = setup();

    click(root.querySelector('andes-table-select-all input') as HTMLElement);
    fixture.detectChanges();
    expect(host.outer()).toEqual(['a', 'b']);
    expect(host.inner()).toEqual([]);
  });
});

describe('AndesTable virtual rows', () => {
  @Component({
    imports: PARTS,
    template: `<andes-table scrollY="200">
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead>#</th>
          <th andesTableHead>Name</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        <tr
          *andesTableVirtualRows="
            let row of rows();
            rowHeight: 40;
            overscan: 2;
            let i = index
          "
          andesTableRow
          [rowKey]="row"
        >
          <td andesTableCell>{{ i }}</td>
          <td andesTableCell>{{ row }}</td>
        </tr>
      </tbody>
    </andes-table>`,
  })
  class VirtualHost {
    readonly rows = signal(
      Array.from({ length: 1000 }, (_, index) => `row-${index}`),
    );
  }

  function setup() {
    const fixture = TestBed.createComponent(VirtualHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const rendered = () =>
      Array.from(
        root.querySelectorAll('tbody tr.andes-table__row'),
      ) as HTMLElement[];
    const spacers = () =>
      Array.from(
        root.querySelectorAll('tbody tr.andes-table__virtual-spacer'),
      ) as HTMLTableRowElement[];
    return {
      fixture,
      root,
      rendered,
      spacers,
      host: fixture.componentInstance,
    };
  }

  it('renders only a window of rows between two spacers', () => {
    const { root, rendered, spacers } = setup();

    // Before any layout the window covers an assumed 800px viewport.
    expect(rendered().length).toBe(22);
    expect(rendered()[0].getAttribute('data-row-key')).toBe('row-0');
    expect(rendered()[0].style.height).toBe('40px');

    const [top, bottom] = spacers();
    expect(top.hidden).toBe(true);
    expect(bottom.cells[0].style.height).toBe(`${(1000 - 22) * 40}px`);
    expect(bottom.cells[0].getAttribute('colspan')).toBe('2');
    expect(bottom.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('table')?.getAttribute('aria-rowcount')).toBe(
      '1001',
    );
    expect(rendered()[0].getAttribute('aria-rowindex')).toBe('2');
  });

  it('moves the window as the container scrolls, reusing the row elements', () => {
    const { root, rendered, spacers, fixture } = setup();
    const container = root.querySelector(
      '.andes-table__container',
    ) as HTMLElement;
    const firstElement = rendered()[0];

    container.scrollTop = 4000;
    container.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(rendered()[0]).toBe(firstElement);
    expect(rendered()[0].getAttribute('data-row-key')).toBe('row-98');
    expect(rendered()[0].querySelector('td')?.textContent?.trim()).toBe('98');
    expect(rendered()[0].getAttribute('aria-rowindex')).toBe('100');
    expect(spacers()[0].cells[0].style.height).toBe(`${98 * 40}px`);
  });

  it('follows changes to the row list', () => {
    const { host, rendered, spacers, fixture } = setup();

    host.rows.set(['only']);
    fixture.detectChanges();
    expect(rendered().map((row) => row.getAttribute('data-row-key'))).toEqual([
      'only',
    ]);
    expect(spacers().every((row) => row.hidden)).toBe(true);
  });
});
