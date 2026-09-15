import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesTable,
  type AndesTableCaptionSide,
  type AndesTableDensity,
} from './table';
import { AndesTableBody } from './table-body';
import { AndesTableCaption } from './table-caption';
import { AndesTableCell } from './table-cell';
import { AndesTableFooter } from './table-footer';
import { AndesTableHead } from './table-head';
import { AndesTableHeader } from './table-header';
import { AndesTableRow } from './table-row';
import { andesSortRows, type AndesSortState } from './table-sort';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly score: number;
}

const ROWS: readonly Row[] = [
  { id: 'a', name: 'Carla', score: 10 },
  { id: 'b', name: 'Ana', score: 30 },
  { id: 'c', name: 'Bruno', score: 10 },
  { id: 'd', name: 'Diego', score: 20 },
];

@Component({
  imports: [
    AndesTable,
    AndesTableBody,
    AndesTableCaption,
    AndesTableCell,
    AndesTableFooter,
    AndesTableHead,
    AndesTableHeader,
    AndesTableRow,
  ],
  template: `<andes-table
    [(sort)]="sort"
    [bordered]="bordered()"
    [density]="density()"
    [rowHover]="rowHover()"
    [captionSide]="captionSide()"
  >
    <caption andesTableCaption>
      Team scores
    </caption>
    <thead andesTableHeader>
      <tr andesTableRow>
        <th andesTableHead sortKey="name">Name</th>
        <th andesTableHead sortKey="score" align="end">Score</th>
        <th andesTableHead align="center">Actions</th>
      </tr>
    </thead>
    <tbody andesTableBody>
      @for (row of sortedRows(); track row.id) {
        <tr andesTableRow>
          <td andesTableCell [attr.data-row]="row.id">{{ row.name }}</td>
          <td andesTableCell align="end">{{ row.score }}</td>
          <td andesTableCell align="center">-</td>
        </tr>
      }
    </tbody>
    <tfoot andesTableFooter>
      <tr andesTableRow>
        <td andesTableCell>Total</td>
        <td andesTableCell align="end">70</td>
        <td andesTableCell></td>
      </tr>
    </tfoot>
  </andes-table>`,
})
class HostComponent {
  readonly rows = signal<readonly Row[]>(ROWS);
  readonly sort = signal<AndesSortState | null>(null);
  readonly bordered = signal(false);
  readonly density = signal<AndesTableDensity>('default');
  readonly rowHover = signal(true);
  readonly captionSide = signal<AndesTableCaptionSide>('bottom');

  readonly sortedRows = computed(() =>
    andesSortRows(this.rows(), this.sort(), {
      name: (row) => row.name,
      score: (row) => row.score,
    }),
  );
}

describe('AndesTable', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const table = root.querySelector('table') as HTMLTableElement;
    const heads = Array.from(
      table.querySelectorAll('thead th'),
    ) as HTMLTableCellElement[];

    const rowIds = () =>
      Array.from(table.querySelectorAll('tbody [data-row]')).map((cell) =>
        cell.getAttribute('data-row'),
      );

    const activate = (head: HTMLElement) => {
      head.click();
      fixture.detectChanges();
    };

    const press = (head: HTMLElement, key: string) => {
      head.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };

    return { fixture, root, table, heads, rowIds, activate, press };
  }

  describe('semantic structure', () => {
    it('renders a real <table> with the projected sections as its direct children', () => {
      const { table } = createHost();

      expect(table.tagName).toBe('TABLE');
      expect(Array.from(table.children).map((child) => child.tagName)).toEqual([
        'CAPTION',
        'THEAD',
        'TBODY',
        'TFOOT',
      ]);
    });

    it('keeps <caption> as the table’s first child', () => {
      const { table } = createHost();

      expect(table.firstElementChild?.tagName).toBe('CAPTION');
      expect(table.querySelector('caption')?.textContent?.trim()).toBe(
        'Team scores',
      );
    });

    it('renders header cells as <th> inside a <tr> inside <thead>', () => {
      const { table, heads } = createHost();
      const headerRow = table.querySelector('thead > tr');

      expect(heads).toHaveLength(3);
      expect(heads.every((head) => head.tagName === 'TH')).toBe(true);
      expect(heads.every((head) => head.parentElement === headerRow)).toBe(
        true,
      );
    });

    it('renders data cells as <td> inside <tr> inside <tbody>', () => {
      const { table } = createHost();
      const bodyRows = Array.from(table.querySelectorAll('tbody > tr'));

      expect(bodyRows).toHaveLength(ROWS.length);
      for (const row of bodyRows) {
        expect(row.tagName).toBe('TR');
        expect(Array.from(row.children).map((cell) => cell.tagName)).toEqual([
          'TD',
          'TD',
          'TD',
        ]);
      }
    });

    it('marks every column header with scope="col"', () => {
      const { heads } = createHost();

      expect(heads.map((head) => head.getAttribute('scope'))).toEqual([
        'col',
        'col',
        'col',
      ]);
    });

    it('lets a header opt into scope="row" for row headers', () => {
      @Component({
        imports: [AndesTable, AndesTableBody, AndesTableHead, AndesTableRow],
        template: `<andes-table>
          <tbody andesTableBody>
            <tr andesTableRow>
              <th andesTableHead scope="row">Ana</th>
            </tr>
          </tbody>
        </andes-table>`,
      })
      class RowHeaderHost {}

      const fixture = TestBed.createComponent(RowHeaderHost);
      fixture.detectChanges();
      const head = fixture.nativeElement.querySelector('tbody th');

      expect(head.getAttribute('scope')).toBe('row');
    });

    it('adds no explicit ARIA roles, leaving the implicit table roles in place', () => {
      const { table } = createHost();
      const elements = [
        table,
        ...Array.from(
          table.querySelectorAll('caption, thead, tbody, tfoot, tr, th, td'),
        ),
      ];

      for (const element of elements) {
        expect(element.hasAttribute('role')).toBe(false);
      }
    });
  });

  describe('presentation inputs', () => {
    it('defaults to the default density, row hover and a bottom caption', () => {
      const { table } = createHost();

      expect(table.classList).toContain('andes-table');
      expect(table.classList).toContain('andes-table--default');
      expect(table.classList).toContain('andes-table--hoverable');
      expect(table.classList).toContain('andes-table--caption-bottom');
      expect(table.classList).not.toContain('andes-table--bordered');
    });

    it.each(['compact', 'default', 'comfortable'] as const)(
      'applies the %s density',
      (density) => {
        const { fixture, table } = createHost();
        fixture.componentInstance.density.set(density);
        fixture.detectChanges();

        expect(table.classList).toContain(`andes-table--${density}`);
      },
    );

    it('applies bordered, caption placement and disables row hover on request', () => {
      const { fixture, table } = createHost();
      fixture.componentInstance.bordered.set(true);
      fixture.componentInstance.rowHover.set(false);
      fixture.componentInstance.captionSide.set('top');
      fixture.detectChanges();

      expect(table.classList).toContain('andes-table--bordered');
      expect(table.classList).toContain('andes-table--caption-top');
      expect(table.classList).not.toContain('andes-table--hoverable');
    });

    it('applies the alignment class to matching headers and cells', () => {
      const { table, heads } = createHost();
      const firstRowCells = Array.from(
        table.querySelectorAll('tbody > tr:first-child > td'),
      );

      expect(heads[1].classList).toContain('andes-table__align--end');
      expect(heads[2].classList).toContain('andes-table__align--center');
      expect(firstRowCells[1].classList).toContain('andes-table__align--end');
      expect(firstRowCells[2].classList).toContain(
        'andes-table__align--center',
      );
    });

    it('applies the part classes to each projected section', () => {
      const { table } = createHost();

      expect(table.querySelector('caption')?.classList).toContain(
        'andes-table__caption',
      );
      expect(table.querySelector('thead')?.classList).toContain(
        'andes-table__header',
      );
      expect(table.querySelector('tbody')?.classList).toContain(
        'andes-table__body',
      );
      expect(table.querySelector('tfoot')?.classList).toContain(
        'andes-table__footer',
      );
      expect(table.querySelector('tbody > tr')?.classList).toContain(
        'andes-table__row',
      );
    });
  });

  describe('sortable headers', () => {
    it('makes only headers with a sortKey focusable and sort-aware', () => {
      const { heads } = createHost();
      const [name, score, actions] = heads;

      expect(name.getAttribute('tabindex')).toBe('0');
      expect(name.getAttribute('aria-sort')).toBe('none');
      expect(name.classList).toContain('andes-table__head--sortable');

      expect(score.getAttribute('tabindex')).toBe('0');
      expect(score.getAttribute('aria-sort')).toBe('none');

      expect(actions.hasAttribute('tabindex')).toBe(false);
      expect(actions.hasAttribute('aria-sort')).toBe(false);
      expect(actions.classList).not.toContain('andes-table__head--sortable');
    });

    it('cycles unsorted -> ascending -> descending -> unsorted and updates aria-sort', () => {
      const { fixture, heads, activate } = createHost();
      const [name] = heads;
      const host = fixture.componentInstance;

      activate(name);
      expect(host.sort()).toEqual({ columnId: 'name', direction: 'asc' });
      expect(name.getAttribute('aria-sort')).toBe('ascending');
      expect(name.getAttribute('data-sort')).toBe('asc');
      expect(name.classList).toContain('andes-table__head--sorted');

      activate(name);
      expect(host.sort()).toEqual({ columnId: 'name', direction: 'desc' });
      expect(name.getAttribute('aria-sort')).toBe('descending');
      expect(name.getAttribute('data-sort')).toBe('desc');

      activate(name);
      expect(host.sort()).toBeNull();
      expect(name.getAttribute('aria-sort')).toBe('none');
      expect(name.hasAttribute('data-sort')).toBe(false);
      expect(name.classList).not.toContain('andes-table__head--sorted');
    });

    it('ignores clicks on headers without a sortKey', () => {
      const { fixture, heads, activate } = createHost();

      activate(heads[2]);

      expect(fixture.componentInstance.sort()).toBeNull();
    });

    it.each([['Enter'], [' ']])('activates sorting with the %s key', (key) => {
      const { fixture, heads, press } = createHost();

      press(heads[0], key);

      expect(fixture.componentInstance.sort()).toEqual({
        columnId: 'name',
        direction: 'asc',
      });
    });

    it('moves the sort to another column, restarting at ascending', () => {
      const { fixture, heads, activate } = createHost();
      const [name, score] = heads;

      activate(name);
      activate(name);
      expect(fixture.componentInstance.sort()?.direction).toBe('desc');

      activate(score);

      expect(fixture.componentInstance.sort()).toEqual({
        columnId: 'score',
        direction: 'asc',
      });
      expect(score.getAttribute('aria-sort')).toBe('ascending');
      expect(name.getAttribute('aria-sort')).toBe('none');
      expect(name.hasAttribute('data-sort')).toBe(false);
    });

    it('reflects a sort state pushed in from the outside', () => {
      const { fixture, heads } = createHost();
      fixture.componentInstance.sort.set({
        columnId: 'score',
        direction: 'desc',
      });
      fixture.detectChanges();

      expect(heads[1].getAttribute('aria-sort')).toBe('descending');
      expect(heads[0].getAttribute('aria-sort')).toBe('none');
    });
  });

  describe('sorted rendering', () => {
    it('reorders the rendered rows by the sorted column', () => {
      const { heads, rowIds, activate } = createHost();

      expect(rowIds()).toEqual(['a', 'b', 'c', 'd']);

      activate(heads[0]);
      expect(rowIds()).toEqual(['b', 'c', 'a', 'd']);

      activate(heads[0]);
      expect(rowIds()).toEqual(['d', 'a', 'c', 'b']);

      activate(heads[0]);
      expect(rowIds()).toEqual(['a', 'b', 'c', 'd']);
    });

    it('is stable: tied rows keep their original relative order in both directions', () => {
      const { heads, rowIds, activate } = createHost();

      // Carla (a) and Bruno (c) both score 10 and must stay in source order.
      activate(heads[1]);
      expect(rowIds()).toEqual(['a', 'c', 'd', 'b']);

      activate(heads[1]);
      expect(rowIds()).toEqual(['b', 'd', 'a', 'c']);
    });
  });
});
