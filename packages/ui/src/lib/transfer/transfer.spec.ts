import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  AndesTransfer,
  type AndesTransferChange,
  type AndesTransferFilterOption,
  type AndesTransferItem,
  type AndesTransferPagination,
  type AndesTransferScroll,
  type AndesTransferSearch,
  type AndesTransferSelection,
  type AndesTransferStatus,
} from './transfer';

const ITEMS: AndesTransferItem[] = [
  { key: 'a', title: 'Alpha', description: 'First letter' },
  { key: 'b', title: 'Bravo' },
  { key: 'c', title: 'Charlie', disabled: true },
  { key: 'd', title: 'Delta' },
  { key: 'e', title: 'Echo' },
];

@Component({
  imports: [AndesTransfer],
  template: `
    <ng-template #itemTemplate let-item let-direction="direction">
      <b class="custom-item">{{ item.title }}@{{ direction }}</b>
    </ng-template>
    <ng-template #footerTemplate let-direction>
      <i class="custom-footer">footer {{ direction }}</i>
    </ng-template>
    <ng-template #emptyTemplate let-direction>
      <i class="custom-empty">nothing in {{ direction }}</i>
    </ng-template>
    <andes-transfer
      aria-label="Roles"
      [dataSource]="dataSource()"
      [(targetKeys)]="targetKeys"
      [(selectedKeys)]="selectedKeys"
      [titles]="titles()"
      [operations]="operations()"
      [showSearch]="showSearch()"
      [filterOption]="filterOption()"
      [oneWay]="oneWay()"
      [pagination]="pagination()"
      [showSelectAll]="showSelectAll()"
      [status]="status()"
      [disabled]="disabled()"
      [render]="useRender() ? itemTemplate : undefined"
      [footer]="useFooter() ? footerTemplate : undefined"
      [empty]="useEmpty() ? emptyTemplate : undefined"
      [announce]="announce()"
      (transferred)="changes.push($event)"
      (selectionChange)="selections.push($event)"
      (searched)="searches.push($event)"
      (scrolled)="scrolls.push($event)"
    />
  `,
})
class HostComponent {
  readonly dataSource = signal<readonly AndesTransferItem[]>(ITEMS);
  readonly targetKeys = signal<readonly string[]>(['e']);
  readonly selectedKeys = signal<readonly string[]>([]);
  readonly titles = signal<readonly [string, string]>([
    'Available',
    'Selected',
  ]);
  readonly operations = signal<readonly [string, string] | undefined>(
    undefined,
  );
  readonly showSearch = signal(false);
  readonly filterOption = signal<AndesTransferFilterOption | undefined>(
    undefined,
  );
  readonly oneWay = signal(false);
  readonly pagination = signal<boolean | AndesTransferPagination>(false);
  readonly showSelectAll = signal(true);
  readonly status = signal<AndesTransferStatus | undefined>(undefined);
  readonly disabled = signal(false);
  readonly useRender = signal(false);
  readonly useFooter = signal(false);
  readonly useEmpty = signal(false);
  readonly announce = signal<
    ((info: { count: number; title: string }) => string) | undefined
  >(undefined);
  readonly changes: AndesTransferChange[] = [];
  readonly selections: AndesTransferSelection[] = [];
  readonly searches: AndesTransferSearch[] = [];
  readonly scrolls: AndesTransferScroll[] = [];
  readonly transfer = viewChild.required(AndesTransfer);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.componentInstance;
  const root = fixture.nativeElement as HTMLElement;
  const settle = () => fixture.detectChanges();

  const section = (direction: 'source' | 'target') =>
    root.querySelector(`[data-list="${direction}"]`) as HTMLElement;
  const options = (direction: 'source' | 'target') =>
    Array.from(
      section(direction).querySelectorAll<HTMLElement>(
        '[data-slot="transfer-item"]',
      ),
    );
  const titlesOf = (direction: 'source' | 'target') =>
    options(direction).map(
      (option) =>
        option
          .querySelector('.andes-transfer__item-title')
          ?.textContent?.trim() ?? option.textContent?.trim(),
    );
  const listbox = (direction: 'source' | 'target') =>
    section(direction).querySelector(
      '[data-slot="transfer-items"]',
    ) as HTMLElement;
  const forward = () =>
    root.querySelector(
      '[data-slot="transfer-move-forward"]',
    ) as HTMLButtonElement;
  const back = () =>
    root.querySelector('[data-slot="transfer-move-back"]') as HTMLButtonElement;
  const selectAll = (direction: 'source' | 'target') =>
    section(direction).querySelector(
      '[data-slot="transfer-select-all"]',
    ) as HTMLInputElement;
  const count = (direction: 'source' | 'target') =>
    section(direction)
      .querySelector('[data-slot="transfer-count"]')
      ?.textContent?.trim();
  const click = (element: HTMLElement, init: MouseEventInit = {}) => {
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
    );
    settle();
  };
  const press = (
    direction: 'source' | 'target',
    key: string,
    init: KeyboardEventInit = {},
  ) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    listbox(direction).dispatchEvent(event);
    settle();
    return event;
  };
  const focusList = (direction: 'source' | 'target') => {
    listbox(direction).focus();
    settle();
  };
  const search = (direction: 'source' | 'target', value: string) => {
    const input = section(direction).querySelector(
      '.andes-transfer__search-input',
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    settle();
    return input;
  };
  return {
    fixture,
    host,
    root,
    settle,
    section,
    options,
    titlesOf,
    listbox,
    forward,
    back,
    selectAll,
    count,
    click,
    press,
    focusList,
    search,
  };
}

describe('AndesTransfer', () => {
  describe('lists', () => {
    it('splits the data source by target keys and keeps the target order', () => {
      const { host, titlesOf, settle } = setup();

      expect(titlesOf('source')).toEqual([
        'Alpha',
        'Bravo',
        'Charlie',
        'Delta',
      ]);
      expect(titlesOf('target')).toEqual(['Echo']);

      host.targetKeys.set(['d', 'a']);
      settle();
      expect(titlesOf('target')).toEqual(['Delta', 'Alpha']);
      expect(titlesOf('source')).toEqual(['Bravo', 'Charlie', 'Echo']);
    });

    it('titles both lists and counts their items', () => {
      const { root, host, count, settle } = setup();

      expect(root.textContent).toContain('Available');
      expect(root.textContent).toContain('Selected');
      expect(count('source')).toBe('4 items');
      expect(count('target')).toBe('1 item');

      host.titles.set(['Roles', 'Granted']);
      settle();
      expect(root.textContent).toContain('Granted');
    });

    it('shows descriptions under the title', () => {
      const { section } = setup();

      expect(section('source').textContent).toContain('First letter');
    });

    it('ignores target keys that are not in the data source', () => {
      const { host, titlesOf, settle } = setup();

      host.targetKeys.set(['zzz', 'e']);
      settle();

      expect(titlesOf('target')).toEqual(['Echo']);
    });
  });

  describe('semantics', () => {
    it('exposes each list as a multi-selectable listbox of options', () => {
      const { listbox, options } = setup();
      const box = listbox('source');

      expect(box.getAttribute('role')).toBe('listbox');
      expect(box.getAttribute('aria-multiselectable')).toBe('true');
      expect(box.getAttribute('aria-label')).toBe('Available');
      expect(box.getAttribute('tabindex')).toBe('0');
      expect(
        options('source').every((o) => o.getAttribute('role') === 'option'),
      ).toBe(true);
    });

    it('reports selection and disabled state on the options', () => {
      const { host, options, settle } = setup();
      host.selectedKeys.set(['a']);
      settle();
      const [alpha, bravo, charlie] = options('source');

      expect(alpha.getAttribute('aria-selected')).toBe('true');
      expect(bravo.getAttribute('aria-selected')).toBe('false');
      expect(charlie.getAttribute('aria-disabled')).toBe('true');
      expect(bravo.hasAttribute('aria-disabled')).toBe(false);
    });

    it('groups the whole control with its label and names each section by its title', () => {
      const { root, section } = setup();
      const group = root.querySelector('[data-slot="transfer"]') as HTMLElement;

      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe('Roles');
      const labelled = section('source').getAttribute('aria-labelledby') ?? '';
      expect(root.querySelector(`[id="${labelled}"]`)?.textContent).toContain(
        'Available',
      );
    });

    it('names the move buttons after the destination list', () => {
      const { forward, back } = setup();

      expect(forward().getAttribute('aria-label')).toBe(
        'Move selected to Selected',
      );
      expect(back().getAttribute('aria-label')).toBe(
        'Move selected to Available',
      );
    });

    it('shows custom operation texts and uses them as names', () => {
      const { host, forward, back, settle } = setup();
      host.operations.set(['Add', 'Remove']);
      settle();

      expect(forward().textContent).toContain('Add');
      expect(back().getAttribute('aria-label')).toBe('Remove');
    });
  });

  describe('selecting', () => {
    it('toggles an item on click and updates the two-way model', () => {
      const { host, options, count, click } = setup();

      click(options('source')[0]);
      expect(host.selectedKeys()).toEqual(['a']);
      expect(count('source')).toBe('1/4 items');
      expect(options('source')[0].getAttribute('aria-selected')).toBe('true');

      click(options('source')[0]);
      expect(host.selectedKeys()).toEqual([]);
    });

    it('emits the selection of both lists', () => {
      const { host, options, click } = setup();

      click(options('source')[1]);
      click(options('target')[0]);

      expect(host.selections.at(-1)).toEqual({ source: ['b'], target: ['e'] });
    });

    it('does not select disabled items', () => {
      const { host, options, click } = setup();

      click(options('source')[2]);

      expect(host.selectedKeys()).toEqual([]);
    });

    it('selects a range with shift-click', () => {
      const { host, options, click } = setup();

      click(options('source')[0]);
      click(options('source')[3], { shiftKey: true });

      // The disabled item inside the range stays out of it.
      expect(host.selectedKeys()).toEqual(['a', 'b', 'd']);
    });

    it('ignores every interaction while disabled', () => {
      const { host, options, forward, click, settle } = setup();
      host.disabled.set(true);
      settle();

      click(options('source')[0]);

      expect(host.selectedKeys()).toEqual([]);
      expect(forward().disabled).toBe(true);
    });

    describe('select all', () => {
      it('checks, clears and shows the indeterminate state', () => {
        const { host, selectAll, options, click, settle } = setup();
        const box = selectAll('source');
        expect(box.checked).toBe(false);
        expect(box.indeterminate).toBe(false);

        click(options('source')[0]);
        expect(selectAll('source').indeterminate).toBe(true);
        expect(selectAll('source').checked).toBe(false);

        selectAll('source').click();
        settle();
        // Disabled items are not part of "all".
        expect(host.selectedKeys()).toEqual(['a', 'b', 'd']);
        expect(selectAll('source').checked).toBe(true);
        expect(selectAll('source').indeterminate).toBe(false);

        selectAll('source').click();
        settle();
        expect(host.selectedKeys()).toEqual([]);
      });

      it('only touches the items that match the search', () => {
        const { host, selectAll, search, settle } = setup();
        host.showSearch.set(true);
        settle();

        search('source', 'br');
        selectAll('source').click();
        settle();

        expect(host.selectedKeys()).toEqual(['b']);
      });

      it('is hidden with showSelectAll off and is disabled with nothing to select', () => {
        const { host, section, selectAll, settle } = setup();
        host.targetKeys.set(['a', 'b', 'c', 'd', 'e']);
        settle();
        expect(selectAll('source').disabled).toBe(true);

        host.showSelectAll.set(false);
        settle();
        expect(
          section('source').querySelector('[data-slot="transfer-select-all"]'),
        ).toBeNull();
      });
    });
  });

  describe('moving', () => {
    it('moves the selected items to the target and reports it', () => {
      const { host, titlesOf, options, forward, click } = setup();
      click(options('source')[0]);
      click(options('source')[1]);

      click(forward());

      expect(host.targetKeys()).toEqual(['e', 'a', 'b']);
      expect(titlesOf('target')).toEqual(['Echo', 'Alpha', 'Bravo']);
      expect(host.changes).toEqual([
        {
          targetKeys: ['e', 'a', 'b'],
          direction: 'target',
          moveKeys: ['a', 'b'],
        },
      ]);
    });

    it('moves selected target items back', () => {
      const { host, titlesOf, options, back, click } = setup();
      click(options('target')[0]);

      click(back());

      expect(host.targetKeys()).toEqual([]);
      expect(titlesOf('source')).toContain('Echo');
      expect(host.changes[0]).toEqual({
        targetKeys: [],
        direction: 'source',
        moveKeys: ['e'],
      });
    });

    it('clears the selection of what moved and keeps the rest', () => {
      const { host, options, forward, click } = setup();
      click(options('source')[0]);
      click(options('target')[0]);

      click(forward());

      expect(host.selectedKeys()).toEqual(['e']);
    });

    it('disables the buttons when there is nothing to move', () => {
      const { forward, back, options, click } = setup();
      expect(forward().disabled).toBe(true);
      expect(back().disabled).toBe(true);

      click(options('source')[0]);
      expect(forward().disabled).toBe(false);
      expect(back().disabled).toBe(true);
    });

    it('never moves a disabled item, even when its key is selected', () => {
      const { host, forward, settle } = setup();
      host.selectedKeys.set(['c']);
      settle();

      expect(forward().disabled).toBe(true);
      host.transfer().moveKeys(['c'], 'target');
      expect(host.changes).toHaveLength(0);
    });

    it('moves keys programmatically from whichever list they are in', () => {
      const { host, settle } = setup();

      host.transfer().moveKeys(['a', 'e', 'zzz'], 'target');
      settle();

      expect(host.targetKeys()).toEqual(['e', 'a']);
      expect(host.changes[0].moveKeys).toEqual(['a']);
    });

    it('offers imperative selection helpers', () => {
      const { host, settle } = setup();

      host.transfer().selectAll('source');
      settle();
      expect(host.selectedKeys()).toEqual(['a', 'b', 'd']);

      host.transfer().moveSelectedToTarget();
      settle();
      expect(host.targetKeys()).toEqual(['e', 'a', 'b', 'd']);

      host.transfer().moveSelectedToSource();
      host.transfer().clearSelection();
      settle();
      expect(host.selectedKeys()).toEqual([]);
    });
  });

  describe('announcements', () => {
    it('tells a screen reader what moved and where', () => {
      const { root, options, forward, click } = setup();
      const live = root.querySelector('[role="status"]') as HTMLElement;
      expect(live.getAttribute('aria-live')).toBe('polite');
      click(options('source')[0]);

      click(forward());

      expect(live.textContent).toContain('1 item moved to Selected');
    });

    it('lets the application word the message', () => {
      const { root, host, options, forward, click, settle } = setup();
      host.announce.set(({ count, title }) => `${count} -> ${title}`);
      settle();
      click(options('source')[0]);
      click(options('source')[1]);

      click(forward());

      expect(root.querySelector('[role="status"]')?.textContent).toContain(
        '2 -> Selected',
      );
    });
  });

  describe('search', () => {
    it('shows a search box per list only when asked', () => {
      const { root, host, settle } = setup();
      expect(
        root.querySelectorAll('.andes-transfer__search-input'),
      ).toHaveLength(0);

      host.showSearch.set(true);
      settle();

      expect(
        root.querySelectorAll('.andes-transfer__search-input'),
      ).toHaveLength(2);
    });

    it('filters by title or description and reports it', () => {
      const { host, titlesOf, search, settle } = setup();
      host.showSearch.set(true);
      settle();

      search('source', 'ALP');
      expect(titlesOf('source')).toEqual(['Alpha']);
      search('source', 'letter');
      expect(titlesOf('source')).toEqual(['Alpha']);
      expect(host.searches.at(-1)).toEqual({
        direction: 'source',
        value: 'letter',
      });
    });

    it('searches each list on its own', () => {
      const { host, titlesOf, search, settle } = setup();
      host.targetKeys.set(['d', 'e']);
      host.showSearch.set(true);
      settle();

      search('target', 'ech');

      expect(titlesOf('target')).toEqual(['Echo']);
      expect(titlesOf('source')).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('uses a custom filter and tells it which list it is asked about', () => {
      const { host, titlesOf, search, settle } = setup();
      const seen: string[] = [];
      host.filterOption.set((query, item, direction) => {
        seen.push(direction);
        return item.key === query;
      });
      host.showSearch.set(true);
      settle();

      search('source', 'b');

      expect(titlesOf('source')).toEqual(['Bravo']);
      expect(seen).toContain('source');
    });

    it('keeps hidden items selected', () => {
      const { host, options, search, click, settle } = setup();
      host.showSearch.set(true);
      settle();
      click(options('source')[0]);

      search('source', 'bravo');

      expect(host.selectedKeys()).toEqual(['a']);
    });

    it('explains an empty result and clears with the button or Escape', () => {
      const { host, section, titlesOf, search, click, settle } = setup();
      host.showSearch.set(true);
      settle();

      const input = search('source', 'zzz');
      expect(section('source').textContent).toContain('No results');
      click(
        section('source').querySelector(
          '.andes-transfer__search-clear',
        ) as HTMLElement,
      );
      expect(titlesOf('source')).toHaveLength(4);

      search('source', 'zzz');
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      settle();
      expect(input.value).toBe('');
      expect(titlesOf('source')).toHaveLength(4);
    });
  });

  describe('empty state', () => {
    it('shows the default text for an empty list', () => {
      const { host, section, settle } = setup();
      host.targetKeys.set([]);
      settle();

      expect(section('target').textContent).toContain('No data');
      expect(section('target').querySelector('[role="listbox"]')).toBeNull();
    });

    it('renders a custom empty template', () => {
      const { host, section, settle } = setup();
      host.targetKeys.set([]);
      host.useEmpty.set(true);
      settle();

      expect(
        section('target').querySelector('.custom-empty')?.textContent,
      ).toContain('nothing in target');
    });
  });

  describe('templates', () => {
    it('draws items with the render template', () => {
      const { host, section, settle } = setup();
      host.useRender.set(true);
      settle();

      expect(section('source').querySelector('.custom-item')?.textContent).toBe(
        'Alpha@source',
      );
      expect(section('target').querySelector('.custom-item')?.textContent).toBe(
        'Echo@target',
      );
    });

    it('draws a footer under each list', () => {
      const { host, root, settle } = setup();
      host.useFooter.set(true);
      settle();

      const footers = Array.from(root.querySelectorAll('.custom-footer')).map(
        (f) => f.textContent,
      );
      expect(footers).toEqual(['footer source', 'footer target']);
    });
  });

  describe('one way', () => {
    function oneWay() {
      const context = setup();
      context.host.oneWay.set(true);
      context.settle();
      return context;
    }

    it('drops the back button and the target selection controls', () => {
      const { back, section, listbox } = oneWay();

      expect(back()).toBeNull();
      expect(
        section('target').querySelector('[data-slot="transfer-select-all"]'),
      ).toBeNull();
      expect(listbox('target').getAttribute('role')).toBe('list');
      expect(listbox('target').hasAttribute('aria-multiselectable')).toBe(
        false,
      );
    });

    it('removes a target item with its x button', () => {
      const { host, section, click } = oneWay();
      const remove = section('target').querySelector(
        '.andes-transfer__remove',
      ) as HTMLButtonElement;
      expect(remove.getAttribute('aria-label')).toBe('Remove Echo');

      click(remove);

      expect(host.targetKeys()).toEqual([]);
      expect(host.changes[0]).toEqual({
        targetKeys: [],
        direction: 'source',
        moveKeys: ['e'],
      });
    });

    it('does not select target items by clicking them', () => {
      const { host, options, click } = oneWay();

      click(options('target')[0]);

      expect(host.selectedKeys()).toEqual([]);
    });
  });

  describe('pagination', () => {
    function paged(
      pagination: boolean | AndesTransferPagination = { pageSize: 2 },
    ) {
      const context = setup();
      context.host.pagination.set(pagination);
      context.host.targetKeys.set([]);
      context.settle();
      return context;
    }

    it('shows one page at a time with a page counter', () => {
      const { titlesOf, section } = paged();

      expect(titlesOf('source')).toEqual(['Alpha', 'Bravo']);
      expect(section('source').textContent).toContain('1 / 3');
    });

    it('turns pages with the buttons', () => {
      const { titlesOf, section, click } = paged();
      const next = section('source').querySelectorAll<HTMLButtonElement>(
        '.andes-transfer__page-button',
      )[1];

      click(next);
      expect(titlesOf('source')).toEqual(['Charlie', 'Delta']);
      click(next);
      expect(titlesOf('source')).toEqual(['Echo']);
      expect(next.disabled).toBe(true);
    });

    it('hides the pager when everything fits and defaults the size to ten', () => {
      const { section } = paged(true);

      expect(
        section('source').querySelector('[data-slot="transfer-pagination"]'),
      ).toBeNull();
    });

    it('counts and selects across all pages', () => {
      const { host, selectAll, count, settle } = paged();

      selectAll('source').click();
      settle();

      expect(host.selectedKeys()).toEqual(['a', 'b', 'd', 'e']);
      expect(count('source')).toBe('4/5 items');
    });

    it('goes back to the first page when the search changes', () => {
      const { host, section, titlesOf, search, click, settle } = paged();
      host.showSearch.set(true);
      settle();
      click(
        section('source').querySelectorAll<HTMLButtonElement>(
          '.andes-transfer__page-button',
        )[1],
      );

      search('source', 'a');

      expect(titlesOf('source')[0]).toBe('Alpha');
    });
  });

  describe('keyboard', () => {
    it('gives the list a roving active option through aria-activedescendant', () => {
      const { listbox, options, focusList, press } = setup();
      focusList('source');

      expect(listbox('source').getAttribute('aria-activedescendant')).toBe(
        options('source')[0].id,
      );
      press('source', 'ArrowDown');
      expect(listbox('source').getAttribute('aria-activedescendant')).toBe(
        options('source')[1].id,
      );
      press('source', 'ArrowUp');
      expect(listbox('source').getAttribute('aria-activedescendant')).toBe(
        options('source')[0].id,
      );
    });

    it('skips disabled items and stops at the ends', () => {
      const { listbox, options, focusList, press } = setup();
      focusList('source');

      press('source', 'ArrowDown');
      press('source', 'ArrowDown');
      expect(listbox('source').getAttribute('aria-activedescendant')).toBe(
        options('source')[3].id,
      );
      press('source', 'ArrowDown');
      expect(listbox('source').getAttribute('aria-activedescendant')).toBe(
        options('source')[3].id,
      );
      press('source', 'Home');
      expect(listbox('source').getAttribute('aria-activedescendant')).toBe(
        options('source')[0].id,
      );
      press('source', 'End');
      expect(listbox('source').getAttribute('aria-activedescendant')).toBe(
        options('source')[3].id,
      );
    });

    it('toggles the active option with Space', () => {
      const { host, focusList, press } = setup();
      focusList('source');

      const space = press('source', ' ');
      expect(space.defaultPrevented).toBe(true);
      expect(host.selectedKeys()).toEqual(['a']);
      press('source', ' ');
      expect(host.selectedKeys()).toEqual([]);
    });

    it('extends the selection with Shift and the arrows', () => {
      const { host, focusList, press } = setup();
      focusList('source');

      press('source', ' ');
      press('source', 'ArrowDown', { shiftKey: true });
      press('source', 'ArrowDown', { shiftKey: true });

      expect(host.selectedKeys()).toEqual(['a', 'b', 'd']);
    });

    it('selects everything selectable with Ctrl+A', () => {
      const { host, focusList, press } = setup();
      focusList('source');

      press('source', 'a', { ctrlKey: true });

      expect(host.selectedKeys()).toEqual(['a', 'b', 'd']);
    });

    it('moves the selection with Enter', () => {
      const { host, focusList, press } = setup();
      focusList('source');
      press('source', ' ');
      press('source', 'ArrowDown');
      press('source', ' ');

      press('source', 'Enter');

      expect(host.targetKeys()).toEqual(['e', 'a', 'b']);
    });

    it('moves just the active item with Enter when nothing is selected', () => {
      const { host, focusList, press } = setup();
      focusList('source');
      press('source', 'ArrowDown');

      press('source', 'Enter');

      expect(host.targetKeys()).toEqual(['e', 'b']);
    });

    it('moves target items back with Enter', () => {
      const { host, focusList, press } = setup();
      focusList('target');

      press('target', 'Enter');

      expect(host.targetKeys()).toEqual([]);
    });

    it('does nothing while disabled', () => {
      const { host, focusList, press, settle } = setup();
      focusList('source');
      host.disabled.set(true);
      settle();

      press('source', ' ');

      expect(host.selectedKeys()).toEqual([]);
    });

    it('lets Tab through to the next control', () => {
      const { focusList, press } = setup();
      focusList('source');

      expect(press('source', 'Tab').defaultPrevented).toBe(false);
    });
  });

  describe('events', () => {
    it('reports scrolling with the list it happened in', () => {
      const { host, listbox, settle } = setup();

      listbox('target').dispatchEvent(new Event('scroll'));
      settle();

      expect(host.scrolls).toHaveLength(1);
      expect(host.scrolls[0].direction).toBe('target');
    });
  });

  describe('status', () => {
    it('marks the lists for the error and warning statuses', () => {
      const { host, root, settle } = setup();
      const group = root.querySelector('.andes-transfer') as HTMLElement;

      host.status.set('error');
      settle();
      expect(group.classList).toContain('andes-transfer--error');
      expect(
        root
          .querySelector('[data-slot="transfer"]')
          ?.getAttribute('aria-invalid'),
      ).toBe('true');

      host.status.set('warning');
      settle();
      expect(group.classList).toContain('andes-transfer--warning');
      expect(group.hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('forms', () => {
    @Component({
      imports: [AndesTransfer, ReactiveFormsModule],
      template: `<andes-transfer
        [dataSource]="items"
        [formControl]="control"
      />`,
    })
    class FormHost {
      readonly items = ITEMS;
      readonly control = new FormControl<readonly string[]>(['a']);
    }

    function formSetup() {
      const fixture = TestBed.createComponent(FormHost);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const options = (side: string) =>
        Array.from(
          root.querySelectorAll<HTMLElement>(
            `[data-list="${side}"] [data-slot="transfer-item"]`,
          ),
        );
      return {
        fixture,
        root,
        control: fixture.componentInstance.control,
        options,
      };
    }

    it('writes the control value as the target keys', () => {
      const { fixture, control, options } = formSetup();
      expect(options('target')).toHaveLength(1);
      expect(options('target')[0].textContent).toContain('Alpha');

      control.setValue(['b', 'd']);
      fixture.detectChanges();

      expect(options('target')).toHaveLength(2);
      control.setValue(null);
      fixture.detectChanges();
      expect(options('target')).toHaveLength(0);
    });

    it('sends moves to the control', () => {
      const { fixture, root, control, options } = formSetup();
      options('source')[0].click();
      fixture.detectChanges();

      (
        root.querySelector(
          '[data-slot="transfer-move-forward"]',
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();

      expect(control.value).toEqual(['a', 'b']);
      expect(control.dirty).toBe(true);
    });

    it('follows the control being disabled and marks it touched on leaving', () => {
      const { fixture, root, control } = formSetup();

      control.disable();
      fixture.detectChanges();
      expect(root.querySelector('.andes-transfer--disabled')).not.toBeNull();
      control.enable();
      fixture.detectChanges();

      root
        .querySelector('section')
        ?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      expect(control.touched).toBe(true);
    });
  });

  describe('stylesheet contract', () => {
    const css = () =>
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), 'transfer.css'),
        'utf-8',
      ).replace(/\/\*[\s\S]*?\*\//g, '');

    it('sizes the lists through custom properties', () => {
      expect(css()).toContain(
        '--_list-width: var(--andes-transfer-list-width, 15rem)',
      );
      expect(css()).toContain(
        '--_list-height: var(--andes-transfer-list-height, 18rem)',
      );
    });

    it('gives the search box the single-ring field look', () => {
      const focus =
        /\.andes-transfer__field:focus-within\s*{([^}]*)}/.exec(css())?.[1] ??
        '';

      expect(focus).toContain('box-shadow: 0 0 0 2px');
      expect(focus).toContain('outline: none');
      expect(css()).toMatch(
        /\.andes-transfer__search-input\s*{[^}]*outline: 0/,
      );
    });

    it('uses an inset ring on the active row instead of a box around the list', () => {
      expect(css()).toMatch(
        /\.andes-transfer__items:focus-visible \.andes-transfer__item--active\s*{[^}]*outline-offset: -2px/,
      );
    });

    it('never breaks a selector onto a line that starts with a combinator', () => {
      expect(css()).not.toMatch(/^\s*[>+~]/m);
      expect(css()).not.toMatch(/[>+~]\s*\n\s*[.:\w]/);
    });

    it('keeps rules with attribute selectors off ::ng-deep', () => {
      expect(css()).not.toContain('::ng-deep');
    });

    it('turns motion off for reduced-motion users', () => {
      expect(css()).toMatch(
        /@media \(prefers-reduced-motion: reduce\)\s*{[^}]*transition: none/,
      );
    });

    it('is right-to-left safe: logical properties and mirrored arrows', () => {
      expect(css()).not.toMatch(/\b(?:left|right)\s*:/);
      expect(css()).not.toMatch(/(?:margin|padding|border)-(?:left|right)/);
      expect(css()).toContain(
        '.andes-transfer:dir(rtl) .andes-transfer__move-icon',
      );
    });

    it('carries the font family on the root', () => {
      expect(css()).toMatch(
        /\.andes-transfer\s*{[^}]*font-family: var\(--andes-font-family\), sans-serif/,
      );
    });
  });
});
