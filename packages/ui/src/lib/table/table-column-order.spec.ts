import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AndesTable, type AndesTableColumnReorder } from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCell } from './table-cell';
import {
  AndesTableColumnSettings,
  type AndesTableColumnSetting,
} from './table-column-settings';
import { andesMoveColumn, andesVisibleColumns } from './table-data';
import { AndesTableFilter } from './table-filter';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import type { AndesSortState } from './table-sort';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly age: number;
}

const ROWS: readonly Row[] = [
  { id: '1', name: 'Ana', city: 'Lima', age: 31 },
  { id: '2', name: 'Bruno', city: 'Cusco', age: 45 },
];

const LABELS: Readonly<Record<string, string>> = {
  id: 'Id',
  name: 'Name',
  city: 'City',
  age: 'Age',
};

describe('column order helpers', () => {
  it('moves a key before or after its target', () => {
    const order = ['a', 'b', 'c', 'd'];

    expect(andesMoveColumn(order, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(andesMoveColumn(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
    expect(andesMoveColumn(order, 'a', 'zz')).toBe(order);
    expect(andesMoveColumn(order, 'b', 'b')).toBe(order);
  });

  it('drops hidden keys while keeping the order', () => {
    expect(andesVisibleColumns(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
    expect(andesVisibleColumns(['a', 'b', 'c'], new Set(['a', 'c']))).toEqual([
      'b',
    ]);
  });
});

describe('AndesTable column reordering', () => {
  @Component({
    imports: [
      AndesTable,
      AndesTableBody,
      AndesTableCell,
      AndesTableColumnSettings,
      AndesTableFilter,
      AndesTableHead,
      AndesTableHeader,
      AndesTableRow,
    ],
    template: `<andes-table
      reorderable
      resizable
      [(columnOrder)]="order"
      [(sort)]="sort"
      (columnReorder)="moves.push($event)"
    >
      <andes-table-column-settings
        andesTableTop
        [columns]="settings"
        [(order)]="order"
        [(hidden)]="hidden"
      />
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead class="fixed-cell">#</th>
          @for (key of shown(); track key) {
            <th
              andesTableHead
              [columnKey]="key"
              [sortKey]="key === 'name' ? 'name' : undefined"
            >
              {{ label(key) }}
              @if (key === 'city') {
                <andes-table-filter column="city" label="Filter city" />
              }
            </th>
          }
        </tr>
      </thead>
      <tbody andesTableBody>
        @for (row of rows; track row.id) {
          <tr andesTableRow>
            <td andesTableCell>•</td>
            @for (key of shown(); track key) {
              <td andesTableCell>{{ cell(row, key) }}</td>
            }
          </tr>
        }
      </tbody>
    </andes-table>`,
  })
  class ReorderHost {
    readonly rows = ROWS;
    readonly settings: readonly AndesTableColumnSetting[] = [
      { key: 'id', label: 'Id', hideable: false, movable: false },
      { key: 'name', label: 'Name' },
      { key: 'city', label: 'City' },
      { key: 'age', label: 'Age' },
    ];
    readonly order = signal<readonly string[]>(['id', 'name', 'city', 'age']);
    readonly hidden = signal<readonly string[]>([]);
    readonly sort = signal<AndesSortState | null>(null);
    readonly moves: AndesTableColumnReorder[] = [];
    readonly shown = computed(() =>
      andesVisibleColumns(this.order(), this.hidden()),
    );
    readonly label = (key: string) => LABELS[key];
    cell(row: Row, key: string): string {
      return String(row[key as keyof Row]);
    }
  }

  function setup() {
    const fixture = TestBed.createComponent(ReorderHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const titleOf = (th: Element) =>
      th.querySelector('.andes-table__head-title')?.textContent?.trim();
    const header = (text: string) =>
      Array.from(root.querySelectorAll<HTMLElement>('thead th')).find(
        (th) => titleOf(th) === text,
      ) as HTMLElement;
    const headers = () =>
      Array.from(root.querySelectorAll('thead th')).map(titleOf);
    const firstRow = () =>
      Array.from(root.querySelectorAll('tbody tr:first-child td')).map((td) =>
        td.textContent?.trim(),
      );
    const altKey = (element: HTMLElement, key: string) => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      fixture.detectChanges();
    };
    return { fixture, root, host, header, headers, firstRow, altKey };
  }

  it('makes every movable header a focusable drag source with a shortcut', () => {
    const { header } = setup();

    for (const text of ['Id', 'Name', 'City', 'Age']) {
      const th = header(text);
      expect(th.classList).toContain('cdk-drag');
      expect(th.getAttribute('tabindex')).toBe('0');
      expect(th.getAttribute('aria-keyshortcuts')).toBe(
        'Alt+ArrowLeft Alt+ArrowRight',
      );
    }
    // A header without a column key is a drag item only on paper: it stays disabled.
    expect(header('#').classList).toContain('cdk-drag-disabled');
    expect(header('#').hasAttribute('tabindex')).toBe(false);
    expect(header('#').hasAttribute('aria-keyshortcuts')).toBe(false);
  });

  it('moves a column with Alt+Arrow keys, header and body together', async () => {
    const { fixture, root, host, header, headers, firstRow, altKey } = setup();

    altKey(header('Name'), 'ArrowRight');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.order()).toEqual(['id', 'city', 'name', 'age']);
    expect(headers()).toEqual(['#', 'Id', 'City', 'Name', 'Age']);
    expect(firstRow()).toEqual(['•', '1', 'Lima', 'Ana', '31']);
    expect(host.moves).toEqual([
      {
        columnKey: 'name',
        previousIndex: 1,
        currentIndex: 2,
        order: ['id', 'city', 'name', 'age'],
      },
    ]);
    expect(document.activeElement).toBe(header('Name'));
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Name moved to position 3 of 4',
    );
    // Moving does not sort.
    expect(host.sort()).toBeNull();

    altKey(header('Id'), 'ArrowLeft');
    expect(host.order()).toEqual(['id', 'city', 'name', 'age']);
  });

  it('ignores plain arrows and keys typed inside the header filter', () => {
    const { root, host, header, altKey } = setup();

    header('Name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    altKey(
      root.querySelector('.andes-table-filter__trigger') as HTMLElement,
      'ArrowRight',
    );

    expect(host.order()).toEqual(['id', 'name', 'city', 'age']);
  });

  it('applies a drop from the drag list to the order, skipping hidden columns', () => {
    const { fixture, host, headers } = setup();
    host.hidden.set(['city']);
    fixture.detectChanges();
    const dropList = fixture.debugElement
      .query(By.directive(AndesTableHeader))
      .injector.get(CdkDropList);
    const items = dropList.getSortedItems();

    // Drag "Name" (cell 2, after the "#" and "Id" cells) onto "Age" (cell 3).
    dropList.dropped.emit({
      previousIndex: 2,
      currentIndex: 3,
      item: items[1],
      container: dropList,
      previousContainer: dropList,
      isPointerOverContainer: true,
      distance: { x: 0, y: 0 },
      dropPoint: { x: 0, y: 0 },
      event: new MouseEvent('mouseup'),
    });
    fixture.detectChanges();

    expect(host.order()).toEqual(['id', 'city', 'age', 'name']);
    expect(headers()).toEqual(['#', 'Id', 'Age', 'Name']);
  });

  it('does not sort a header on the click that ends a drag', async () => {
    const { fixture, host, header } = setup();
    const drag = fixture.debugElement
      .queryAll(By.directive(AndesTableHead))
      .find((item) => item.nativeElement === header('Name'))
      ?.injector.get(CdkDrag);

    drag?.ended.emit({
      source: drag,
      distance: { x: 0, y: 0 },
      dropPoint: { x: 0, y: 0 },
      event: new MouseEvent('mouseup'),
    });
    header('Name').click();
    expect(host.sort()).toBeNull();

    await new Promise((resolve) => setTimeout(resolve));
    header('Name').click();
    expect(host.sort()).toEqual({ columnId: 'name', direction: 'asc' });
  });

  it('keeps presses on the resize handle and filter from starting a drag', () => {
    const { root, header } = setup();
    const reached: string[] = [];
    header('City').addEventListener('mousedown', () => reached.push('th'));

    header('City')
      .querySelector('.andes-table__resize-handle')
      ?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    root
      .querySelector('andes-table-filter')
      ?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(reached).toEqual([]);
  });

  describe('column settings menu', () => {
    function openMenu(ctx: ReturnType<typeof setup>) {
      (
        ctx.root.querySelector(
          '.andes-table-column-settings__trigger',
        ) as HTMLButtonElement
      ).click();
      ctx.fixture.detectChanges();
      const items = () =>
        Array.from(
          ctx.root.querySelectorAll<HTMLElement>(
            '.andes-table-column-settings__item',
          ),
        );
      const item = (text: string) =>
        items().find((li) => li.textContent?.includes(text)) as HTMLElement;
      return { items, item };
    }

    it('lists the columns in table order with visibility and move controls', () => {
      const ctx = setup();
      const { items, item } = openMenu(ctx);

      expect(
        ctx.root
          .querySelector('.andes-table-column-settings__trigger')
          ?.getAttribute('aria-expanded'),
      ).toBe('true');
      expect(items().map((li) => li.textContent?.trim())).toEqual([
        'Id',
        'Name',
        'City',
        'Age',
      ]);
      expect(item('Id').querySelector('input')?.disabled).toBe(true);
      expect(item('Id').querySelector('button')).toBeNull();
      expect(
        item('Name').querySelector('button')?.getAttribute('aria-label'),
      ).toBe('Move Name earlier');
    });

    it('hides and shows columns, but never the last visible one', () => {
      const ctx = setup();
      const { item } = openMenu(ctx);

      item('City').querySelector('input')?.click();
      ctx.fixture.detectChanges();
      expect(ctx.host.hidden()).toEqual(['city']);
      expect(ctx.headers()).toEqual(['#', 'Id', 'Name', 'Age']);

      item('Name').querySelector('input')?.click();
      item('Age').querySelector('input')?.click();
      ctx.fixture.detectChanges();
      expect(ctx.host.hidden()).toEqual(['city', 'name', 'age']);
      // Only "Id" is left, and it is not hideable anyway.
      expect(ctx.headers()).toEqual(['#', 'Id']);

      item('City').querySelector('input')?.click();
      ctx.fixture.detectChanges();
      expect(ctx.headers()).toEqual(['#', 'Id', 'City']);
    });

    it('moves columns and resets to the first-render state', () => {
      const ctx = setup();
      const { item } = openMenu(ctx);
      const reset = () =>
        ctx.root.querySelector(
          '.andes-table-column-settings__reset',
        ) as HTMLButtonElement;

      expect(reset().disabled).toBe(true);
      (
        item('Age').querySelector(
          '.andes-table-column-settings__move--up',
        ) as HTMLButtonElement
      ).click();
      ctx.fixture.detectChanges();
      expect(ctx.host.order()).toEqual(['id', 'name', 'age', 'city']);
      expect(ctx.headers()).toEqual(['#', 'Id', 'Name', 'Age', 'City']);
      expect(
        (
          item('City').querySelector(
            '.andes-table-column-settings__move--down',
          ) as HTMLButtonElement
        ).disabled,
      ).toBe(true);

      reset().click();
      ctx.fixture.detectChanges();
      expect(ctx.host.order()).toEqual(['id', 'name', 'city', 'age']);
    });

    it('closes on Escape and returns focus to its button', () => {
      const ctx = setup();
      const { item } = openMenu(ctx);
      const trigger = ctx.root.querySelector(
        '.andes-table-column-settings__trigger',
      ) as HTMLButtonElement;

      item('Name').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      ctx.fixture.detectChanges();

      expect(
        ctx.root.querySelector('.andes-table-column-settings__panel'),
      ).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
