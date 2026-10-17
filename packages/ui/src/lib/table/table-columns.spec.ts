import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesTable,
  type AndesTableColumnResize,
  type AndesTableLayout,
} from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCell } from './table-cell';
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
