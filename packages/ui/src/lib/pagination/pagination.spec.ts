import { NgTemplateOutlet } from '@angular/common';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesPagination,
  AndesPaginationAlign,
  AndesPaginationChange,
  AndesPaginationSize,
  AndesPaginationSizeChange,
} from './pagination';

@Component({
  imports: [AndesPagination, NgTemplateOutlet],
  template: `<andes-pagination
      [(current)]="current"
      [(pageSize)]="pageSize"
      [total]="total()"
      [totalPages]="totalPages()"
      [siblingCount]="siblingCount()"
      [boundaryCount]="boundaryCount()"
      [disabled]="disabled()"
      [showLessItems]="showLessItems()"
      [showPrevNextJumpers]="showPrevNextJumpers()"
      [showTitle]="showTitle()"
      [hideOnSinglePage]="hideOnSinglePage()"
      [showSizeChanger]="showSizeChanger()"
      [pageSizeOptions]="pageSizeOptions()"
      [showQuickJumper]="showQuickJumper()"
      [goButton]="goButton()"
      [simple]="simple()"
      [responsive]="responsive()"
      [size]="size()"
      [align]="align()"
      [showTotal]="withTotal() ? totalTpl : null"
      [itemRender]="withItemRender() ? itemTpl : null"
      (pageChange)="changes.push($event)"
      (showSizeChange)="sizeChanges.push($event)"
    />
    <ng-template #totalTpl let-total let-range="range"
      >{{ range[0] }}-{{ range[1] }} of {{ total }} items</ng-template
    >
    <ng-template
      #itemTpl
      let-page
      let-type="type"
      let-originalElement="originalElement"
    >
      @if (type === 'prev') {
        <span class="custom">Previous</span>
      } @else if (type === 'next') {
        <span class="custom">Next</span>
      } @else {
        <ng-container
          *ngTemplateOutlet="
            originalElement;
            context: { $implicit: page, type: type }
          "
        />
      }
    </ng-template>`,
})
class HostComponent {
  readonly current = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal<number | undefined>(10);
  readonly siblingCount = signal(1);
  readonly boundaryCount = signal(1);
  readonly disabled = signal(false);
  readonly showLessItems = signal(false);
  readonly showPrevNextJumpers = signal(true);
  readonly showTitle = signal(true);
  readonly hideOnSinglePage = signal(false);
  readonly showSizeChanger = signal<boolean | undefined>(undefined);
  readonly pageSizeOptions = signal<number[]>([10, 20, 50, 100]);
  readonly showQuickJumper = signal(false);
  readonly goButton = signal<boolean | string>(false);
  readonly simple = signal<boolean | { readOnly?: boolean }>(false);
  readonly responsive = signal(false);
  readonly size = signal<AndesPaginationSize>('default');
  readonly align = signal<AndesPaginationAlign>('start');
  readonly withTotal = signal(false);
  readonly withItemRender = signal(false);
  readonly changes: AndesPaginationChange[] = [];
  readonly sizeChanges: AndesPaginationSizeChange[] = [];
}

type Host = HostComponent;

@Component({
  imports: [AndesPagination],
  template: `<andes-pagination
      [(current)]="current"
      [totalPages]="10"
      [showQuickJumper]="true"
      [goButton]="goTpl"
    />
    <ng-template #goTpl
      ><button type="button" class="custom-go">Jump</button></ng-template
    >`,
})
class GoTemplateHostComponent {
  readonly current = signal(1);
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

describe('AndesPagination', () => {
  function createHost(setup?: (host: Host) => void) {
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;
    setup?.(host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const nav = () => root.querySelector('nav') as HTMLElement | null;
    const q = <T extends Element>(selector: string) =>
      root.querySelector(selector) as T | null;
    const pageButtons = () =>
      Array.from(
        root.querySelectorAll<HTMLButtonElement>('.andes-pagination__page'),
      );
    const pageLabels = () =>
      pageButtons().map((button) => button.textContent?.trim());
    const pageButton = (label: number) =>
      pageButtons().find(
        (button) => button.textContent?.trim() === String(label),
      );
    const prev = () =>
      required(q<HTMLButtonElement>('.andes-pagination__item--prev'));
    const next = () =>
      required(q<HTMLButtonElement>('.andes-pagination__item--next'));
    const jumpers = () =>
      Array.from(
        root.querySelectorAll<HTMLButtonElement>('.andes-pagination__jumper'),
      );
    const update = (fn: (host: Host) => void) => {
      fn(host);
      fixture.detectChanges();
    };
    return {
      fixture,
      host,
      root,
      nav,
      q,
      pageButtons,
      pageLabels,
      pageButton,
      prev,
      next,
      jumpers,
      update,
    };
  }

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function key(element: HTMLElement, keyName: string) {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: keyName, bubbles: true }),
    );
  }

  describe('basics', () => {
    it('renders a nav with an accessible label', () => {
      const { nav } = createHost();
      expect(nav()?.getAttribute('aria-label')).toBe('Pagination');
    });

    it('renders page buttons collapsing the rest when there are many pages', () => {
      const { pageLabels, jumpers } = createHost();
      // 1 2 3 4 5 [jump] 10
      expect(pageLabels()).toEqual(['1', '2', '3', '4', '5', '10']);
      expect(jumpers().length).toBe(1);
    });

    it('marks the active page with aria-current="page" and no others', () => {
      const { update, pageButton } = createHost();
      update((h) => h.current.set(3));

      expect(pageButton(3)?.getAttribute('aria-current')).toBe('page');
      expect(pageButton(2)?.hasAttribute('aria-current')).toBe(false);
      expect(pageButton(10)?.hasAttribute('aria-current')).toBe(false);
    });

    it('gives each page an accessible name', () => {
      const { pageButton } = createHost();
      expect(pageButton(2)?.getAttribute('aria-label')).toBe('Page 2');
    });

    it('disables previous on the first page and next on the last', () => {
      const { update, prev, next } = createHost();
      expect(prev().disabled).toBe(true);
      expect(next().disabled).toBe(false);

      update((h) => h.current.set(10));
      expect(prev().disabled).toBe(false);
      expect(next().disabled).toBe(true);
    });

    it('clamps an out-of-range current page', () => {
      const { update, pageButton } = createHost();
      update((h) => h.current.set(99));
      expect(pageButton(10)?.getAttribute('aria-current')).toBe('page');
    });
  });

  describe('two-way current', () => {
    it('updates current and emits change when a page is clicked', () => {
      const { fixture, host, pageButton } = createHost();
      pageButton(3)?.click();
      fixture.detectChanges();

      expect(host.current()).toBe(3);
      expect(host.changes).toEqual([{ page: 3, pageSize: 10 }]);
      expect(pageButton(3)?.getAttribute('aria-current')).toBe('page');
    });

    it('moves by one with previous/next', () => {
      const { fixture, host, update, prev, next } = createHost();
      update((h) => h.current.set(5));

      prev().click();
      fixture.detectChanges();
      expect(host.current()).toBe(4);

      next().click();
      next().click();
      fixture.detectChanges();
      expect(host.current()).toBe(6);
    });

    it('does not emit for the already-active page or at the edges', () => {
      const { host, pageButton, prev } = createHost();
      pageButton(1)?.click();
      prev().click();
      expect(host.changes).toEqual([]);
    });
  });

  describe('total / pageSize', () => {
    it('derives the page count from total and pageSize', () => {
      const { pageLabels } = createHost((h) => {
        h.totalPages.set(undefined);
        h.total.set(45);
      });
      expect(pageLabels()).toEqual(['1', '2', '3', '4', '5']);
    });

    it('renders no pages and disables everything when total is 0', () => {
      const { pageButtons, prev, next } = createHost((h) => {
        h.totalPages.set(undefined);
        h.total.set(0);
      });
      expect(pageButtons().length).toBe(0);
      expect(prev().disabled).toBe(true);
      expect(next().disabled).toBe(true);
    });
  });

  describe('disabled', () => {
    it('disables every control, including the options', () => {
      const { root } = createHost((h) => {
        h.current.set(5);
        h.disabled.set(true);
        h.showSizeChanger.set(true);
        h.showQuickJumper.set(true);
        h.goButton.set(true);
      });
      const controls = Array.from(
        root.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
          'button, input, select',
        ),
      );
      expect(controls.length).toBeGreaterThan(0);
      expect(controls.every((control) => control.disabled)).toBe(true);
    });

    it('does not emit clicks while disabled', () => {
      const { host, pageButton } = createHost((h) => h.disabled.set(true));
      pageButton(2)?.click();
      expect(host.changes).toEqual([]);
    });
  });

  describe('range shape', () => {
    it('collapses the head near the end of a long range', () => {
      const { pageLabels } = createHost((h) => h.current.set(10));
      expect(pageLabels()).toEqual(['1', '6', '7', '8', '9', '10']);
    });

    it('collapses both sides in the middle of a long range', () => {
      const { pageLabels, jumpers } = createHost((h) => {
        h.totalPages.set(20);
        h.current.set(10);
      });
      expect(pageLabels()).toEqual(['1', '9', '10', '11', '20']);
      expect(jumpers().length).toBe(2);
    });

    it('shows more sibling pages when siblingCount is increased', () => {
      const { pageLabels } = createHost((h) => {
        h.totalPages.set(20);
        h.current.set(10);
        h.siblingCount.set(2);
      });
      expect(pageLabels()).toEqual(['1', '8', '9', '10', '11', '12', '20']);
    });

    it('shows fewer items with showLessItems', () => {
      const { pageLabels } = createHost((h) => {
        h.totalPages.set(20);
        h.current.set(10);
        h.siblingCount.set(2);
        h.showLessItems.set(true);
      });
      expect(pageLabels()).toEqual(['1', '9', '10', '11', '20']);
    });
  });

  describe('prev/next jumpers', () => {
    it('jumps 5 pages and is labelled accordingly', () => {
      const { fixture, host, jumpers } = createHost((h) => {
        h.totalPages.set(20);
        h.current.set(10);
      });
      const [jumpPrev, jumpNext] = jumpers();
      expect(jumpPrev.getAttribute('aria-label')).toBe('Previous 5 pages');
      expect(jumpNext.getAttribute('aria-label')).toBe('Next 5 pages');

      jumpNext.click();
      fixture.detectChanges();
      expect(host.current()).toBe(15);
    });

    it('jumps 3 pages with showLessItems, clamped to the range', () => {
      const { fixture, host, jumpers } = createHost((h) => {
        h.totalPages.set(20);
        h.current.set(10);
        h.showLessItems.set(true);
      });
      expect(jumpers()[0].getAttribute('aria-label')).toBe('Previous 3 pages');
      jumpers()[0].click();
      fixture.detectChanges();
      expect(host.current()).toBe(7);
    });

    it('renders a decorative ellipsis when showPrevNextJumpers is false', () => {
      const { q, jumpers } = createHost((h) =>
        h.showPrevNextJumpers.set(false),
      );
      expect(jumpers().length).toBe(0);
      expect(
        q('.andes-pagination__ellipsis')?.getAttribute('aria-hidden'),
      ).toBe('true');
    });
  });

  describe('showTitle', () => {
    it('adds title attributes by default and removes them when off', () => {
      const { update, pageButton, prev } = createHost();
      expect(pageButton(2)?.getAttribute('title')).toBe('2');
      expect(prev().getAttribute('title')).toBe('Previous page');

      update((h) => h.showTitle.set(false));
      expect(pageButton(2)?.hasAttribute('title')).toBe(false);
      expect(prev().hasAttribute('title')).toBe(false);
    });
  });

  describe('hideOnSinglePage', () => {
    it('hides the control with one page or none', () => {
      const { update, nav } = createHost((h) => {
        h.hideOnSinglePage.set(true);
        h.totalPages.set(1);
      });
      expect(nav()).toBeNull();

      update((h) => {
        h.totalPages.set(undefined);
        h.total.set(0);
      });
      expect(nav()).toBeNull();

      update((h) => h.total.set(11));
      expect(nav()).not.toBeNull();
    });
  });

  describe('size changer', () => {
    const select = (q: <T extends Element>(s: string) => T | null) =>
      q<HTMLSelectElement>('.andes-pagination__size-changer');

    it('is hidden by default for small totals and shown automatically above 50', () => {
      const { update, q } = createHost((h) => {
        h.totalPages.set(undefined);
        h.total.set(50);
      });
      expect(select(q)).toBeNull();

      update((h) => h.total.set(51));
      expect(select(q)).not.toBeNull();
    });

    it('can be forced on or off', () => {
      const { update, q } = createHost((h) => h.showSizeChanger.set(true));
      expect(select(q)).not.toBeNull();

      update((h) => {
        h.totalPages.set(undefined);
        h.total.set(500);
        h.showSizeChanger.set(false);
      });
      expect(select(q)).toBeNull();
    });

    it('lists the options, adding the current size when missing', () => {
      const { q } = createHost((h) => {
        h.showSizeChanger.set(true);
        h.pageSize.set(15);
      });
      const options = Array.from(required(select(q)).options);
      expect(options.map((option) => option.textContent?.trim())).toEqual([
        '10 / page',
        '15 / page',
        '20 / page',
        '50 / page',
        '100 / page',
      ]);
      expect(required(select(q)).value).toBe('15');
      expect(required(select(q)).getAttribute('aria-label')).toBe(
        'Items per page',
      );
    });

    it('updates pageSize, clamps current and emits both events', () => {
      const { fixture, host, q } = createHost((h) => {
        h.totalPages.set(undefined);
        h.total.set(95);
        h.current.set(8);
        h.showSizeChanger.set(true);
      });
      const el = required(select(q));
      el.value = '50';
      el.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(host.pageSize()).toBe(50);
      expect(host.current()).toBe(2);
      expect(host.sizeChanges).toEqual([{ current: 2, pageSize: 50 }]);
      expect(host.changes).toEqual([{ page: 2, pageSize: 50 }]);
    });

    it('keeps the current page when it still exists', () => {
      const { fixture, host, q } = createHost((h) => {
        h.totalPages.set(undefined);
        h.total.set(95);
        h.current.set(2);
        h.showSizeChanger.set(true);
      });
      const el = required(select(q));
      el.value = '20';
      el.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(host.current()).toBe(2);
      expect(host.sizeChanges).toEqual([{ current: 2, pageSize: 20 }]);
    });
  });

  describe('quick jumper', () => {
    const jumper = (q: <T extends Element>(s: string) => T | null) =>
      required(q<HTMLInputElement>('.andes-pagination__jump-input'));

    it('has a visible "Go to" label', () => {
      const { q } = createHost((h) => h.showQuickJumper.set(true));
      expect(q('.andes-pagination__jump-label')?.textContent).toContain(
        'Go to',
      );
    });

    it('jumps on Enter and clears the input', () => {
      const { fixture, host, q } = createHost((h) =>
        h.showQuickJumper.set(true),
      );
      type(jumper(q), '7');
      key(jumper(q), 'Enter');
      fixture.detectChanges();

      expect(host.current()).toBe(7);
      expect(jumper(q).value).toBe('');
    });

    it('jumps on blur when there is no go button', () => {
      const { fixture, host, q } = createHost((h) =>
        h.showQuickJumper.set(true),
      );
      type(jumper(q), '4');
      jumper(q).dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(host.current()).toBe(4);
    });

    it('clamps out-of-range input and ignores garbage', () => {
      const { fixture, host, q } = createHost((h) =>
        h.showQuickJumper.set(true),
      );
      type(jumper(q), 'abc');
      key(jumper(q), 'Enter');
      expect(host.changes).toEqual([]);

      type(jumper(q), '999');
      key(jumper(q), 'Enter');
      fixture.detectChanges();
      expect(host.current()).toBe(10);
    });

    it('waits for the go button instead of jumping on blur', () => {
      const { fixture, host, q } = createHost((h) => {
        h.showQuickJumper.set(true);
        h.goButton.set('Jump');
      });
      type(jumper(q), '6');
      jumper(q).dispatchEvent(new Event('blur'));
      expect(host.changes).toEqual([]);

      const go = required(q<HTMLButtonElement>('.andes-pagination__go button'));
      expect(go.textContent?.trim()).toBe('Jump');
      go.click();
      fixture.detectChanges();
      expect(host.current()).toBe(6);
    });

    it('uses the confirm label for goButton=true', () => {
      const { q } = createHost((h) => {
        h.showQuickJumper.set(true);
        h.goButton.set(true);
      });
      expect(q('.andes-pagination__go button')?.textContent?.trim()).toBe('Go');
    });

    it('renders a goButton template and jumps when its button is clicked', () => {
      const fixture = TestBed.createComponent(GoTemplateHostComponent);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const field = required(
        root.querySelector<HTMLInputElement>('.andes-pagination__jump-input'),
      );
      type(field, '8');
      field.dispatchEvent(new Event('blur'));
      expect(fixture.componentInstance.current()).toBe(1);

      required(root.querySelector<HTMLButtonElement>('.custom-go')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.current()).toBe(8);
    });
  });

  describe('showTotal', () => {
    it('renders the total and current range', () => {
      const { update, q } = createHost((h) => {
        h.totalPages.set(undefined);
        h.total.set(85);
        h.withTotal.set(true);
      });
      const text = () => q('.andes-pagination__total')?.textContent?.trim();
      expect(text()).toBe('1-10 of 85 items');

      update((h) => h.current.set(9));
      expect(text()).toBe('81-85 of 85 items');
    });

    it('reports an empty range for total 0', () => {
      const { q } = createHost((h) => {
        h.totalPages.set(undefined);
        h.withTotal.set(true);
      });
      expect(q('.andes-pagination__total')?.textContent?.trim()).toBe(
        '0-0 of 0 items',
      );
    });
  });

  describe('simple mode', () => {
    const input = (q: <T extends Element>(s: string) => T | null) =>
      required(q<HTMLInputElement>('.andes-pagination__simple-input'));

    it('renders prev, "current / total" and next without page buttons', () => {
      const { q, pageButtons } = createHost((h) => {
        h.simple.set(true);
        h.current.set(3);
      });
      expect(pageButtons().length).toBe(0);
      expect(input(q).value).toBe('3');
      expect(q('.andes-pagination__simple')?.textContent).toContain('10');
    });

    it('commits typed pages on Enter and on blur', () => {
      const { fixture, host, q } = createHost((h) => h.simple.set(true));
      type(input(q), '6');
      key(input(q), 'Enter');
      fixture.detectChanges();
      expect(host.current()).toBe(6);

      type(input(q), '2');
      input(q).dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(host.current()).toBe(2);
    });

    it('reverts invalid input to the current page', () => {
      const { fixture, host, q } = createHost((h) => {
        h.simple.set(true);
        h.current.set(4);
      });
      type(input(q), 'x');
      key(input(q), 'Enter');
      fixture.detectChanges();
      expect(host.changes).toEqual([]);
      expect(input(q).value).toBe('4');
    });

    it('steps with ArrowUp/ArrowDown', () => {
      const { fixture, host, q } = createHost((h) => {
        h.simple.set(true);
        h.current.set(4);
      });
      key(input(q), 'ArrowUp');
      fixture.detectChanges();
      expect(host.current()).toBe(5);

      key(input(q), 'ArrowDown');
      key(input(q), 'ArrowDown');
      fixture.detectChanges();
      expect(host.current()).toBe(3);
    });

    it('shows plain text in readOnly mode', () => {
      const { q } = createHost((h) => {
        h.simple.set({ readOnly: true });
        h.current.set(3);
      });
      expect(q('.andes-pagination__simple-input')).toBeNull();
      expect(q('.andes-pagination__simple-current')?.textContent?.trim()).toBe(
        '3',
      );
    });

    it('does not render the quick jumper', () => {
      const { q } = createHost((h) => {
        h.simple.set(true);
        h.showQuickJumper.set(true);
      });
      expect(q('.andes-pagination__jump-input')).toBeNull();
    });
  });

  describe('size / align', () => {
    it('applies the small modifier', () => {
      const { update, nav } = createHost();
      expect(nav()?.classList).not.toContain('andes-pagination--small');
      update((h) => h.size.set('small'));
      expect(nav()?.classList).toContain('andes-pagination--small');
    });

    it('exposes the alignment', () => {
      const { update, nav } = createHost();
      expect(nav()?.getAttribute('data-align')).toBe('start');
      update((h) => h.align.set('end'));
      expect(nav()?.getAttribute('data-align')).toBe('end');
    });
  });

  describe('responsive', () => {
    let matches = false;
    const originalMatchMedia = window.matchMedia;

    beforeEach(() => {
      matches = true;
      window.matchMedia = ((query: string) => ({
        matches,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      })) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('collapses to small + simple on narrow viewports', () => {
      const { nav, q } = createHost((h) => h.responsive.set(true));
      expect(nav()?.classList).toContain('andes-pagination--small');
      expect(q('.andes-pagination__simple-input')).not.toBeNull();
    });

    it('stays expanded without responsive', () => {
      const { nav, q } = createHost();
      expect(nav()?.classList).not.toContain('andes-pagination--small');
      expect(q('.andes-pagination__simple-input')).toBeNull();
    });
  });

  describe('itemRender', () => {
    it('replaces item content while keeping the accessible button', () => {
      const { fixture, host, prev, next, pageButton } = createHost((h) =>
        h.withItemRender.set(true),
      );
      expect(prev().textContent?.trim()).toBe('Previous');
      expect(next().textContent?.trim()).toBe('Next');
      expect(next().getAttribute('aria-label')).toBe('Next page');
      // Falls back to originalElement for pages.
      expect(pageButton(2)).toBeTruthy();

      next().click();
      fixture.detectChanges();
      expect(host.current()).toBe(2);
    });
  });

  describe('labels', () => {
    it('lets every label be replaced', () => {
      const fixture = TestBed.createComponent(AndesPagination);
      fixture.componentRef.setInput('totalPages', 20);
      fixture.componentRef.setInput('current', 10);
      fixture.componentRef.setInput('previousLabel', 'Anterior');
      fixture.componentRef.setInput('nextLabel', 'Siguiente');
      fixture.componentRef.setInput('pageLabel', 'Página');
      fixture.componentRef.setInput('jumpPrevLabel', '{count} anteriores');
      fixture.componentRef.setInput('aria-label', 'Paginación');
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;

      expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe(
        'Paginación',
      );
      expect(
        root
          .querySelector('.andes-pagination__item--prev')
          ?.getAttribute('aria-label'),
      ).toBe('Anterior');
      expect(
        root
          .querySelector('.andes-pagination__item--next')
          ?.getAttribute('aria-label'),
      ).toBe('Siguiente');
      expect(
        root
          .querySelector('.andes-pagination__page')
          ?.getAttribute('aria-label'),
      ).toBe('Página 1');
      expect(
        root
          .querySelector('.andes-pagination__jumper')
          ?.getAttribute('aria-label'),
      ).toBe('5 anteriores');
    });
  });
});
