import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesDescriptionItem } from './description-item';
import { AndesDescriptions } from './descriptions';
import {
  AndesDescriptionsColumns,
  AndesDescriptionsLayout,
  AndesDescriptionsSize,
  layoutDescriptionRows,
  resolveDescriptionsColumns,
} from './descriptions-types';

@Component({
  imports: [AndesDescriptions, AndesDescriptionItem],
  template: `
    <andes-descriptions
      [title]="title()"
      [extra]="extra()"
      [bordered]="bordered()"
      [layout]="layout()"
      [column]="column()"
      [size]="size()"
      [colon]="colon()"
      [ellipsis]="ellipsis()"
      aria-label="Order details"
    >
      <span andesDescriptionsExtra class="slot-extra">Edit</span>
      <andes-description-item label="Customer"
        >Lucia Paredes</andes-description-item
      >
      <andes-description-item [label]="labelTpl">Rich</andes-description-item>
      <andes-description-item label="Total" [span]="2"
        >S/ 1,284.50</andes-description-item
      >
      <andes-description-item
        label="Notes"
        span="filled"
        [ellipsis]="notesEllipsis()"
      >
        A long delivery note that should wrap or truncate
      </andes-description-item>
      @if (showExtraItem()) {
        <andes-description-item label="Extra">More</andes-description-item>
      }
    </andes-descriptions>
    <ng-template #labelTpl><b class="rich-label">Rich label</b></ng-template>
    <ng-template #titleTpl><i class="rich-title">Rich title</i></ng-template>
  `,
})
class HostComponent {
  readonly title = signal<string | TemplateRef<unknown> | undefined>(
    'Order 4012',
  );
  readonly extra = signal<string | TemplateRef<unknown> | undefined>(undefined);
  readonly bordered = signal(false);
  readonly layout = signal<AndesDescriptionsLayout>('horizontal');
  readonly column = signal<number | AndesDescriptionsColumns>(3);
  readonly size = signal<AndesDescriptionsSize>('default');
  readonly colon = signal(true);
  readonly ellipsis = signal(false);
  readonly notesEllipsis = signal<boolean | undefined>(undefined);
  readonly showExtraItem = signal(false);
  readonly titleTpl = viewChild.required<TemplateRef<unknown>>('titleTpl');
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  disconnected = false;
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  observe() {
    /* noop */
  }
  disconnect() {
    this.disconnected = true;
  }
  trigger() {
    this.callback();
  }
}

describe('layoutDescriptionRows', () => {
  const spans = (rows: ReturnType<typeof layoutDescriptionRows>) =>
    rows.map((row) => row.map((cell) => cell.span));

  it('packs single-column items into rows', () => {
    expect(spans(layoutDescriptionRows([1, 1, 1, 1, 1], 3))).toEqual([
      [1, 1, 1],
      [1, 2],
    ]);
  });

  it('fills the last item of the last row', () => {
    expect(spans(layoutDescriptionRows([1, 1], 4))).toEqual([[1, 3]]);
  });

  it('starts a new row when an item does not fit and closes the previous one', () => {
    expect(spans(layoutDescriptionRows([2, 2, 1], 3))).toEqual([[3], [2, 1]]);
  });

  it('lets filled take the rest of its row', () => {
    expect(spans(layoutDescriptionRows([1, 'filled', 1], 3))).toEqual([
      [1, 2],
      [3],
    ]);
    expect(spans(layoutDescriptionRows(['filled'], 3))).toEqual([[3]]);
  });

  it('clamps spans to the column count and to at least one', () => {
    expect(spans(layoutDescriptionRows([9, 0, -2], 2))).toEqual([[2], [1, 1]]);
  });

  it('keeps item indexes', () => {
    const rows = layoutDescriptionRows([1, 1, 1, 1], 2);

    expect(rows.map((row) => row.map((cell) => cell.index))).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('handles one column and no items', () => {
    expect(spans(layoutDescriptionRows([1, 2, 'filled'], 1))).toEqual([
      [1],
      [1],
      [1],
    ]);
    expect(layoutDescriptionRows([], 3)).toEqual([]);
  });
});

describe('resolveDescriptionsColumns', () => {
  const map = { xs: 1, md: 2, xl: 4 };

  it('returns a plain number as is', () => {
    expect(resolveDescriptionsColumns(3, 200)).toBe(3);
    expect(resolveDescriptionsColumns(0, 200)).toBe(1);
  });

  it('picks the breakpoint for the width', () => {
    expect(resolveDescriptionsColumns(map, 300)).toBe(1);
    expect(resolveDescriptionsColumns(map, 767)).toBe(1);
    expect(resolveDescriptionsColumns(map, 768)).toBe(2);
    expect(resolveDescriptionsColumns(map, 1000)).toBe(2);
    expect(resolveDescriptionsColumns(map, 1200)).toBe(4);
    expect(resolveDescriptionsColumns(map, 2000)).toBe(4);
  });

  it('inherits from smaller breakpoints and falls back when none is set', () => {
    expect(resolveDescriptionsColumns({ md: 2 }, 300)).toBe(3);
    expect(resolveDescriptionsColumns({ md: 2 }, 300, 5)).toBe(5);
    expect(resolveDescriptionsColumns({ md: 2 }, 900)).toBe(2);
  });

  it('uses the widest breakpoint while unmeasured', () => {
    expect(resolveDescriptionsColumns(map, null)).toBe(4);
  });
});

describe('AndesDescriptions', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const root = fixture.nativeElement.querySelector(
      'andes-descriptions',
    ) as HTMLElement;
    const q = <T extends HTMLElement = HTMLElement>(selector: string) =>
      fixture.nativeElement.querySelector(selector) as T | null;
    const qa = (selector: string) =>
      Array.from(
        fixture.nativeElement.querySelectorAll(selector),
      ) as HTMLElement[];
    return { fixture, host, root, q, qa };
  }

  function flush(fixture: ComponentFixture<HostComponent>) {
    fixture.detectChanges();
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    FakeResizeObserver.instances = [];
  });

  describe('plain list', () => {
    it('renders a description list with a term and a value per item', () => {
      const { q, qa } = create();

      expect(q('dl')).toBeTruthy();
      expect(q('table')).toBeNull();
      expect(qa('.andes-descriptions__item')).toHaveLength(4);
      expect(qa('dt')[0].textContent?.trim()).toBe('Customer');
      expect(qa('dd')[0].textContent?.trim()).toBe('Lucia Paredes');
    });

    it('renders a template label', () => {
      const { qa } = create();

      expect(qa('dt')[1].querySelector('.rich-label')).toBeTruthy();
    });

    it('does not render the item elements themselves', () => {
      const { root } = create();

      expect(root.querySelector('andes-description-item')).toBeNull();
    });

    it('spans items across the grid and fills the last row', () => {
      const { qa } = create();
      const items = qa('.andes-descriptions__item');

      // Rows: [Customer, Rich, Total(2 -> fits? no, 1+1+2 > 3)] -> Total moves down and fills.
      expect(items.map((el) => el.style.gridColumn)).toEqual([
        'span 1',
        'span 2',
        'span 2',
        'span 1',
      ]);
    });

    it('exposes the column count as a custom property', () => {
      const { fixture, host, root } = create();
      host.column.set(2);
      flush(fixture);

      expect(root.style.getPropertyValue('--_andes-descriptions-columns')).toBe(
        '2',
      );
    });

    it('shows the colon only for the plain horizontal form', () => {
      const { fixture, host, root } = create();

      expect(root.hasAttribute('data-colon')).toBe(true);

      host.colon.set(false);
      flush(fixture);
      expect(root.hasAttribute('data-colon')).toBe(false);

      host.colon.set(true);
      host.layout.set('vertical');
      flush(fixture);
      expect(root.hasAttribute('data-colon')).toBe(false);

      host.layout.set('horizontal');
      host.bordered.set(true);
      flush(fixture);
      expect(root.hasAttribute('data-colon')).toBe(false);
    });

    it('mirrors layout and size', () => {
      const { fixture, host, root } = create();
      host.layout.set('vertical');
      host.size.set('small');
      flush(fixture);

      expect(root.getAttribute('data-layout')).toBe('vertical');
      expect(root.getAttribute('data-size')).toBe('small');
    });

    it('reacts to items added later', () => {
      const { fixture, host, qa } = create();
      host.showExtraItem.set(true);
      flush(fixture);

      expect(qa('.andes-descriptions__item')).toHaveLength(5);
      expect(qa('dt')[4].textContent?.trim()).toBe('Extra');
    });
  });

  describe('bordered table', () => {
    function bordered() {
      const ctx = create();
      ctx.host.bordered.set(true);
      flush(ctx.fixture);
      return ctx;
    }

    it('renders a table with row-header label cells', () => {
      const { q, qa } = bordered();

      expect(q('table')).toBeTruthy();
      expect(q('dl')).toBeNull();
      expect(qa('th').every((th) => th.getAttribute('scope') === 'row')).toBe(
        true,
      );
      expect(qa('th')[0].textContent?.trim()).toBe('Customer');
      expect(qa('td')[0].textContent?.trim()).toBe('Lucia Paredes');
    });

    it('lays label and value pairs out per row with the right colspans', () => {
      const { qa } = bordered();
      const rows = qa('tbody tr');

      expect(rows).toHaveLength(2);
      expect(
        Array.from(rows[0].querySelectorAll('td')).map((td) =>
          td.getAttribute('colspan'),
        ),
      ).toEqual(['1', '3']);
      expect(rows[1].querySelectorAll('th')).toHaveLength(2);
      expect(rows[1].querySelector('td')?.getAttribute('colspan')).toBe('3');
    });

    it('declares a label column per pair', () => {
      const { qa } = bordered();

      expect(qa('col')).toHaveLength(6);
      expect(qa('col.andes-descriptions__col-label')).toHaveLength(3);
    });

    it('uses header cells over value cells for the vertical layout', () => {
      const { fixture, host, qa } = bordered();
      host.layout.set('vertical');
      flush(fixture);

      expect(qa('tbody tr')).toHaveLength(4);
      expect(qa('th').every((th) => th.getAttribute('scope') === 'col')).toBe(
        true,
      );
      expect(qa('col')).toHaveLength(3);
      expect(qa('tbody tr')[0].querySelectorAll('th')).toHaveLength(2);
      expect(qa('tbody tr')[1].querySelectorAll('td')).toHaveLength(2);
    });

    it('follows the column count', () => {
      const { fixture, host, qa } = bordered();
      host.column.set(2);
      flush(fixture);

      expect(qa('tbody tr').length).toBeGreaterThan(2);
      expect(qa('col')).toHaveLength(4);
    });
  });

  describe('header', () => {
    it('renders a title and labels the list with it', () => {
      const { q } = create();

      expect(q('.andes-descriptions__title')?.textContent?.trim()).toBe(
        'Order 4012',
      );
      expect(q('dl')?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('does not leave aria-label, aria-labelledby or title on the host', () => {
      const { root } = create();

      expect(root.hasAttribute('aria-label')).toBe(false);
      expect(root.hasAttribute('aria-labelledby')).toBe(false);
      expect(root.hasAttribute('title')).toBe(false);
    });

    it('renders template and projected title and extra', () => {
      const { fixture, host, q } = create();
      host.title.set(host.titleTpl());
      host.extra.set('Download');
      flush(fixture);

      expect(q('.andes-descriptions__title .rich-title')).toBeTruthy();
      expect(q('.andes-descriptions__extra')?.textContent).toContain(
        'Download',
      );
      expect(q('.andes-descriptions__extra .slot-extra')?.textContent).toBe(
        'Edit',
      );
    });

    it('leaves the title wrapper empty so it can collapse', () => {
      const { fixture, host, q } = create();
      host.title.set(undefined);
      flush(fixture);

      expect(q('.andes-descriptions__title')?.textContent?.trim()).toBe('');
    });

    it('labels the table too', () => {
      const { fixture, host, q } = create();
      host.bordered.set(true);
      flush(fixture);

      expect(q('table')?.getAttribute('aria-label')).toBe('Order details');
    });
  });

  describe('long content', () => {
    it('wraps by default', () => {
      const { qa } = create();

      expect(qa('.andes-descriptions__content--ellipsis')).toHaveLength(0);
    });

    it('truncates every value with ellipsis', () => {
      const { fixture, host, qa } = create();
      host.ellipsis.set(true);
      flush(fixture);

      expect(qa('.andes-descriptions__content--ellipsis')).toHaveLength(4);
    });

    it('lets an item override the group', () => {
      const { fixture, host, qa } = create();
      host.ellipsis.set(true);
      host.notesEllipsis.set(false);
      flush(fixture);

      expect(qa('.andes-descriptions__content--ellipsis')).toHaveLength(3);

      host.ellipsis.set(false);
      host.notesEllipsis.set(true);
      flush(fixture);
      expect(qa('.andes-descriptions__content--ellipsis')).toHaveLength(1);
    });
  });

  describe('responsive columns', () => {
    function stubWidth(root: HTMLElement, width: number) {
      root.getBoundingClientRect = () =>
        ({
          width,
          height: 100,
          top: 0,
          left: 0,
          right: width,
          bottom: 100,
        }) as DOMRect;
    }

    it('follows the container width, not the window', () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      const fixture = TestBed.createComponent(HostComponent);
      const root = fixture.nativeElement.querySelector(
        'andes-descriptions',
      ) as HTMLElement;
      stubWidth(root, 400);
      fixture.componentInstance.column.set({ xs: 1, md: 2, xl: 4 });
      fixture.detectChanges();
      flush(fixture);

      expect(root.style.getPropertyValue('--_andes-descriptions-columns')).toBe(
        '1',
      );

      stubWidth(root, 800);
      FakeResizeObserver.instances[0].trigger();
      flush(fixture);
      expect(root.style.getPropertyValue('--_andes-descriptions-columns')).toBe(
        '2',
      );

      stubWidth(root, 1300);
      FakeResizeObserver.instances[0].trigger();
      flush(fixture);
      expect(root.style.getPropertyValue('--_andes-descriptions-columns')).toBe(
        '4',
      );
    });

    it('re-flows the bordered table when the width changes', () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      const fixture = TestBed.createComponent(HostComponent);
      const root = fixture.nativeElement.querySelector(
        'andes-descriptions',
      ) as HTMLElement;
      stubWidth(root, 400);
      fixture.componentInstance.bordered.set(true);
      fixture.componentInstance.column.set({ xs: 1, md: 3 });
      fixture.detectChanges();
      flush(fixture);

      expect(root.querySelectorAll('tbody tr')).toHaveLength(4);

      stubWidth(root, 900);
      FakeResizeObserver.instances[0].trigger();
      flush(fixture);
      expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it('disconnects the observer on destroy', () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      fixture.destroy();

      expect(FakeResizeObserver.instances[0].disconnected).toBe(true);
    });

    it('works without ResizeObserver', () => {
      const { fixture, host, root } = create();
      host.column.set({ xs: 1, xl: 3 });
      flush(fixture);

      expect(root.style.getPropertyValue('--_andes-descriptions-columns')).toBe(
        '3',
      );
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      'packages/ui/src/lib/descriptions/descriptions.css',
      'utf8',
    );

    it('exposes the documented custom properties', () => {
      for (const name of [
        '--andes-descriptions-title-color',
        '--andes-descriptions-label-color',
        '--andes-descriptions-label-weight',
        '--andes-descriptions-label-background',
        '--andes-descriptions-label-width',
        '--andes-descriptions-content-color',
        '--andes-descriptions-border-color',
      ]) {
        expect(css).toContain(name);
      }
    });

    it('uses logical properties only', () => {
      expect(css).not.toMatch(/\b(?:margin|padding|border)-(?:left|right)\b/);
      expect(css).not.toMatch(/text-align:\s*(?:left|right)/);
    });

    it('keeps the colon out of the accessible name', () => {
      expect(css).toContain("content: ':' / ''");
    });

    it('truncates with an ellipsis', () => {
      expect(css).toContain('text-overflow: ellipsis');
    });
  });
});
