import { type CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, computed, ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  AndesTable,
  type AndesTableColumnReorder,
  type AndesTableColumnResize,
  type AndesTableLayout,
} from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCell } from './table-cell';
import { andesOrderColumns } from './table-data';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import type { AndesSortState } from './table-sort';

describe('AndesTable resizable columns', () => {
  @Component({
    imports: [
      AndesTable,
      AndesTableBody,
      AndesTableCell,
      AndesTableHead,
      AndesTableHeader,
      AndesTableRow,
    ],
    template: `<andes-table
      [resizable]="resizable()"
      [tableLayout]="layout()"
      [(columnWidths)]="widths"
      [(sort)]="sort"
      (columnResize)="resizes.push($event)"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead sortKey="name" [maxWidth]="300">Name</th>
          <th andesTableHead columnKey="note" width="120" [minWidth]="80">
            Note
          </th>
          <th andesTableHead columnKey="fixed" [resizable]="false">Locked</th>
          <th andesTableHead>No key</th>
        </tr>
      </thead>
      <tbody andesTableBody>
        <tr andesTableRow>
          <td andesTableCell>Ana</td>
          <td andesTableCell>A rather long note</td>
          <td andesTableCell>x</td>
          <td andesTableCell>y</td>
        </tr>
      </tbody>
    </andes-table>`,
  })
  class ResizeHost {
    readonly resizable = signal(true);
    readonly layout = signal<AndesTableLayout>('fixed');
    readonly widths = signal<Readonly<Record<string, number>>>({});
    readonly sort = signal<AndesSortState | null>(null);
    readonly resizes: AndesTableColumnResize[] = [];
  }

  function setup() {
    const fixture = TestBed.createComponent(ResizeHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const headers = () =>
      Array.from(root.querySelectorAll('th')) as HTMLTableCellElement[];
    const handle = (index: number) =>
      headers()[index].querySelector(
        '.andes-table__resize-handle',
      ) as HTMLElement | null;
    const width = (index: number, px: number) =>
      vi
        .spyOn(headers()[index], 'getBoundingClientRect')
        .mockReturnValue(new DOMRect(0, 0, px, 40));
    const pointer = (
      target: EventTarget,
      type: string,
      clientX: number,
      init: PointerEventInit = {},
    ) => {
      // jsdom has no PointerEvent constructor; a MouseEvent carries the same fields.
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        button: 0,
        ...init,
      });
      target.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };
    const key = (
      target: Element,
      value: string,
      init: KeyboardEventInit = {},
    ) => {
      const event = new KeyboardEvent('keydown', {
        key: value,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      target.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };
    return { fixture, root, host, headers, handle, width, pointer, key };
  }

  afterEach(() => vi.restoreAllMocks());

  it('gives keyed headers an accessible separator handle unless opted out', () => {
    const { headers, handle } = setup();

    expect(handle(0)).not.toBeNull();
    expect(handle(1)).not.toBeNull();
    expect(handle(2)).toBeNull();
    expect(handle(3)).toBeNull();

    const separator = handle(0) as HTMLElement;
    expect(separator.getAttribute('role')).toBe('separator');
    expect(separator.getAttribute('aria-orientation')).toBe('vertical');
    expect(separator.getAttribute('tabindex')).toBe('0');
    expect(separator.getAttribute('aria-valuemin')).toBe('48');
    expect(separator.getAttribute('aria-valuemax')).toBe('300');
    const name = (separator.getAttribute('aria-labelledby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .join(' ');
    expect(name).toBe('Resize column Name');
    expect(headers()[0].classList).toContain('andes-table__head--resizable');
  });

  it('applies a starting width, then the stored one', () => {
    const { host, fixture, headers } = setup();

    expect(headers()[1].style.width).toBe('120px');

    host.widths.set({ note: 200 });
    fixture.detectChanges();
    expect(headers()[1].style.width).toBe('200px');
  });

  it('resizes by dragging the handle, clamped to min/max, without sorting', () => {
    const { host, headers, handle, width, pointer } = setup();
    width(0, 100);

    pointer(handle(0) as HTMLElement, 'pointerdown', 500);
    expect(document.body.style.cursor).toBe('col-resize');
    expect((handle(0) as HTMLElement).classList).toContain(
      'andes-table__resize-handle--active',
    );

    pointer(document, 'pointermove', 530);
    expect(headers()[0].style.width).toBe('130px');
    expect(host.widths()).toEqual({ name: 130 });
    expect(host.resizes.at(-1)).toEqual({
      columnKey: 'name',
      width: 130,
      widths: { name: 130 },
    });

    pointer(document, 'pointermove', 100);
    expect(host.widths()['name']).toBe(48);
    pointer(document, 'pointermove', 1000);
    expect(host.widths()['name']).toBe(300);

    pointer(document, 'pointerup', 1000);
    expect(document.body.style.cursor).toBe('');
    pointer(document, 'pointermove', 520);
    expect(host.widths()['name']).toBe(300);

    // The click that ends a drag on the handle must not sort the column.
    (handle(0) as HTMLElement).click();
    expect(host.sort()).toBeNull();
  });

  it('mirrors the drag in right-to-left', () => {
    const { host, headers, handle, width, pointer } = setup();
    width(1, 150);
    headers()[1].style.direction = 'rtl';

    pointer(handle(1) as HTMLElement, 'pointerdown', 500);
    pointer(document, 'pointermove', 460);
    pointer(document, 'pointerup', 460);

    expect(host.widths()).toEqual({ note: 190 });
  });

  it('resizes from the keyboard: arrows, Shift for bigger steps, Home/End', () => {
    const { host, headers, handle, width, key } = setup();
    width(0, 100);
    const separator = handle(0) as HTMLElement;

    separator.dispatchEvent(new FocusEvent('focus'));
    key(separator, 'ArrowRight');
    expect(host.widths()['name']).toBe(110);
    key(separator, 'ArrowLeft', { shiftKey: true });
    expect(host.widths()['name']).toBe(60);
    key(separator, 'End');
    expect(host.widths()['name']).toBe(300);
    key(separator, 'Home');
    expect(host.widths()['name']).toBe(48);
    expect(separator.getAttribute('aria-valuenow')).toBe('48');

    // RTL: the inline end is on the left, so ArrowLeft widens.
    headers()[0].style.direction = 'rtl';
    key(separator, 'ArrowLeft');
    expect(host.widths()['name']).toBe(58);

    // Keys on the handle never reach the header's sort.
    key(separator, 'Enter');
    key(separator, ' ');
    expect(host.sort()).toBeNull();
  });

  it('fits the column to its widest content on double-click or Enter', () => {
    const { fixture, host, handle, key } = setup();
    // Each cell's one-line content: the header title 40px, the body note 150px.
    // jsdom does not lay out, so Range has no geometry; stand one in.
    const proto = Range.prototype as { getBoundingClientRect?: () => DOMRect };
    const original = proto.getBoundingClientRect;
    proto.getBoundingClientRect = function (this: Range) {
      const text = this.startContainer.textContent?.trim() ?? '';
      return new DOMRect(0, 0, text === 'A rather long note' ? 150 : 40, 20);
    };
    onTestFinished(() => {
      proto.getBoundingClientRect = original;
    });

    (handle(1) as HTMLElement).dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true }),
    );
    expect(host.widths()['note']).toBe(150);

    host.widths.set({});
    fixture.detectChanges();
    key(handle(1) as HTMLElement, 'Enter');
    expect(host.widths()['note']).toBe(150);
  });

  it('marks the table while a drag is in progress', () => {
    const { root, handle, width, pointer } = setup();
    width(0, 100);
    const table = root.querySelector('table') as HTMLTableElement;

    pointer(handle(0) as HTMLElement, 'pointerdown', 0);
    expect(table.classList).toContain('andes-table--resizing');
    pointer(document, 'pointerup', 0);
    expect(table.classList).not.toContain('andes-table--resizing');
  });
});

describe('AndesTable reorderable columns', () => {
  interface Column {
    readonly key: string;
    readonly title: string;
    readonly fixed?: 'start' | 'end';
  }

  const COLUMNS: readonly Column[] = [
    { key: 'id', title: 'ID', fixed: 'start' },
    { key: 'name', title: 'Name' },
    { key: 'status', title: 'Status' },
    { key: 'total', title: 'Total' },
  ];

  @Component({
    imports: [
      AndesTable,
      AndesTableBody,
      AndesTableCell,
      AndesTableHead,
      AndesTableHeader,
      AndesTableRow,
    ],
    template: `<andes-table
      [reorderable]="reorderable()"
      [(columnOrder)]="order"
      (columnReorder)="moves.push($event)"
    >
      <thead andesTableHeader>
        <tr andesTableRow>
          <th andesTableHead>
            <span class="andes-table__sr-only">Select</span>
          </th>
          @for (column of ordered(); track column.key) {
            <th andesTableHead [columnKey]="column.key" [fixed]="column.fixed">
              {{ column.title }}
            </th>
          }
        </tr>
      </thead>
      <tbody andesTableBody>
        <tr andesTableRow>
          <td andesTableCell></td>
          @for (column of ordered(); track column.key) {
            <td andesTableCell [fixed]="column.fixed">{{ column.key }}-1</td>
          }
        </tr>
      </tbody>
    </andes-table>`,
  })
  class ReorderHost {
    readonly reorderable = signal(true);
    readonly order = signal<readonly string[]>([]);
    readonly moves: AndesTableColumnReorder[] = [];
    readonly ordered = computed(() =>
      andesOrderColumns(COLUMNS, this.order(), (column) => column.key),
    );
  }

  function setup() {
    const fixture = TestBed.createComponent(ReorderHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const header = (key: string) =>
      root.querySelector(`th[data-column-key="${key}"]`) as HTMLElement;
    const headerKeys = () =>
      Array.from(root.querySelectorAll('thead th')).map(
        (th) => th.getAttribute('data-column-key') ?? '-',
      );
    const bodyTexts = () =>
      Array.from(root.querySelectorAll('tbody td')).map((td) =>
        td.textContent?.trim(),
      );
    const move = (key: string, arrow: 'ArrowLeft' | 'ArrowRight') => {
      const th = header(key);
      th.focus();
      th.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: arrow,
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      fixture.detectChanges();
    };
    return { fixture, root, host, header, headerKeys, bodyTexts, move };
  }

  it('makes keyed, unpinned headers focusable drag sources with a keyboard hint', () => {
    const { root, header } = setup();

    expect(header('name').getAttribute('tabindex')).toBe('0');
    expect(header('name').getAttribute('aria-keyshortcuts')).toBe(
      'Alt+ArrowLeft Alt+ArrowRight',
    );
    expect(header('name').classList).toContain('cdk-drag');
    expect(header('name').classList).not.toContain('cdk-drag-disabled');
    // Pinned and unkeyed columns stay put.
    expect(header('id').classList).toContain('cdk-drag-disabled');
    expect(header('id').getAttribute('aria-keyshortcuts')).toBeNull();
    expect(root.querySelector('thead th')?.classList).toContain(
      'cdk-drag-disabled',
    );
    expect(root.querySelector('thead')?.classList).toContain('cdk-drop-list');
  });

  it('moves a column with Alt+Arrow keys, keeping focus and announcing it', async () => {
    const { fixture, root, host, header, headerKeys, bodyTexts, move } =
      setup();

    move('name', 'ArrowRight');
    await fixture.whenStable();

    expect(host.moves).toEqual([
      {
        columnKey: 'name',
        previousIndex: 1,
        currentIndex: 2,
        order: ['id', 'status', 'name', 'total'],
      },
    ]);
    expect(headerKeys()).toEqual(['-', 'id', 'status', 'name', 'total']);
    expect(bodyTexts()).toEqual(['', 'id-1', 'status-1', 'name-1', 'total-1']);
    expect(document.activeElement).toBe(header('name'));
    expect(
      root.querySelector('[aria-live="polite"]')?.textContent?.trim(),
    ).toBe('Name moved to position 3 of 4');

    move('name', 'ArrowLeft');
    expect(headerKeys()).toEqual(['-', 'id', 'name', 'status', 'total']);
  });

  it('never moves a column across a pinned or unkeyed one', () => {
    const { host, headerKeys, move } = setup();

    move('name', 'ArrowLeft');
    move('id', 'ArrowRight');
    move('total', 'ArrowRight');

    expect(host.moves).toEqual([]);
    expect(headerKeys()).toEqual(['-', 'id', 'name', 'status', 'total']);
  });

  it('mirrors the arrows in right-to-left', () => {
    const { header, headerKeys, move } = setup();
    header('status').style.direction = 'rtl';

    move('status', 'ArrowLeft');

    expect(headerKeys()).toEqual(['-', 'id', 'name', 'total', 'status']);
  });

  it('applies a drop from the header drop list', () => {
    const { fixture, host, header, headerKeys } = setup();
    const dropList = fixture.debugElement
      .query(By.directive(CdkDropList))
      .injector.get(CdkDropList);

    dropList.dropped.emit({
      previousIndex: 4,
      currentIndex: 2,
      item: { element: new ElementRef(header('total')) },
    } as unknown as CdkDragDrop<unknown>);
    fixture.detectChanges();

    expect(host.order()).toEqual(['id', 'total', 'name', 'status']);
    expect(headerKeys()).toEqual(['-', 'id', 'total', 'name', 'status']);
  });

  it('stays inert unless the table is reorderable', () => {
    const { fixture, host, root, header, move } = setup();
    host.reorderable.set(false);
    fixture.detectChanges();

    expect(header('name').classList).toContain('cdk-drag-disabled');
    expect(header('name').getAttribute('tabindex')).toBeNull();
    expect(root.querySelector('thead')?.classList).toContain(
      'cdk-drop-list-disabled',
    );
    move('name', 'ArrowRight');
    expect(host.moves).toEqual([]);
  });
});

describe('andesOrderColumns', () => {
  const columns = ['select', 'a', 'b', 'c'].map((key) => ({ key }));
  const keyOf = (column: { key: string }) =>
    column.key === 'select' ? undefined : column.key;

  it('returns the columns untouched without an order', () => {
    expect(andesOrderColumns(columns, [], keyOf)).toBe(columns);
  });

  it('orders keyed columns and keeps unkeyed ones in place', () => {
    expect(
      andesOrderColumns(columns, ['c', 'a', 'b'], keyOf).map((c) => c.key),
    ).toEqual(['select', 'c', 'a', 'b']);
  });

  it('keeps columns missing from the order in their own positions', () => {
    expect(
      andesOrderColumns(columns, ['b', 'a'], keyOf).map((c) => c.key),
    ).toEqual(['select', 'b', 'a', 'c']);
  });
});
