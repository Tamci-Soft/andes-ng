import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  AndesList,
  AndesListActivation,
  AndesListColumns,
  AndesListItemLayout,
  AndesListSelectable,
  AndesListSize,
} from './list';
import { AndesListItem } from './list-item';
import { AndesListItemActions } from './list-item-actions';
import { AndesListItemMeta } from './list-item-meta';

interface Person {
  id: number;
  name: string;
  role: string;
}

const PEOPLE: Person[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  name: `Person ${index + 1}`,
  role: `Role ${index + 1}`,
}));

@Component({
  imports: [AndesList, AndesListItem, AndesListItemMeta, AndesListItemActions],
  template: `<andes-list
    [size]="size()"
    [itemLayout]="itemLayout()"
    [bordered]="bordered()"
    [split]="split()"
    [clickable]="clickable()"
    [selectable]="selectable()"
    [(selected)]="selected"
    [label]="'Team'"
    [loading]="loading()"
    [loadingRows]="2"
    [columns]="columns()"
    [gutter]="gutter()"
    [notFoundContent]="notFound()"
    (itemActivated)="activations.push($event)"
  >
    <div slot="header">Team</div>
    @for (person of people(); track person.id) {
      <andes-list-item [value]="person.id" [disabled]="person.id === 3">
        <andes-list-item-meta
          [title]="person.name"
          [description]="person.role"
        />
        <andes-list-item-actions>
          <button type="button" class="edit">Edit</button>
          <button type="button">More</button>
        </andes-list-item-actions>
        <span slot="extra" class="extra">img</span>
      </andes-list-item>
    }
    <div slot="footer">8 people</div>
    <button slot="load-more" type="button">Load more</button>
    <nav slot="pagination">pages</nav>
  </andes-list>`,
})
class ProjectedHostComponent {
  readonly size = signal<AndesListSize>('md');
  readonly itemLayout = signal<AndesListItemLayout>('horizontal');
  readonly bordered = signal(false);
  readonly split = signal(true);
  readonly clickable = signal(false);
  readonly selectable = signal<AndesListSelectable>('none');
  readonly selected = signal<unknown[]>([]);
  readonly loading = signal(false);
  readonly columns = signal<number | AndesListColumns | undefined>(undefined);
  readonly gutter = signal<number | readonly [number, number]>(16);
  readonly notFound = signal<string>('No data');
  readonly people = signal<Person[]>(PEOPLE.slice(0, 5));
  readonly activations: AndesListActivation[] = [];
}

@Component({
  imports: [AndesList, AndesListItem, AndesListItemMeta],
  template: `
    <ng-template #row let-person let-index="index">
      <andes-list-item [value]="person.id"
        ><andes-list-item-meta
          [title]="person.name"
          [description]="'#' + index"
      /></andes-list-item>
    </ng-template>
    <ng-template #empty
      ><em class="custom-empty">Nothing here yet</em></ng-template
    >
    <andes-list
      [dataSource]="data()"
      [itemTemplate]="row"
      [trackBy]="trackBy"
      [pageSize]="pageSize()"
      [total]="total()"
      [(page)]="page"
      [notFoundContent]="useTemplate() ? empty : 'No people'"
      [virtualScroll]="virtual()"
      [itemSize]="40"
      [viewportHeight]="200"
    />
  `,
})
class DataHostComponent {
  readonly data = signal<Person[] | null>(PEOPLE);
  readonly pageSize = signal<number | undefined>(undefined);
  readonly total = signal<number | undefined>(undefined);
  readonly page = signal(1);
  readonly useTemplate = signal(false);
  readonly virtual = signal(false);
  trackCalls = 0;
  readonly trackBy = (_index: number, item: Person) => {
    this.trackCalls++;
    return item.id;
  };
}

@Component({
  imports: [AndesListItemMeta],
  template: `
    <andes-list-item-meta title="Plain title" description="Plain description">
      <span slot="avatar" class="avatar">A</span>
    </andes-list-item-meta>
    <andes-list-item-meta>
      <span slot="title" class="slotted-title">Slotted title</span>
      <span slot="description" class="slotted-description"
        >Slotted description</span
      >
    </andes-list-item-meta>
    <andes-list-item-meta />
  `,
})
class MetaHostComponent {}

function setup<T>(component: new () => T) {
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return {
    fixture,
    host: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
  };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const rows = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLElement>('andes-list-item'));

function key(target: HTMLElement, name: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('AndesList', () => {
  describe('projected rows', () => {
    it('is a list of listitems with an accessible name', () => {
      const { el } = setup(ProjectedHostComponent);
      const list = el.querySelector('[data-slot="list-items"]') as HTMLElement;

      expect(list.getAttribute('role')).toBe('list');
      expect(list.getAttribute('aria-label')).toBe('Team');
      expect(rows(el)).toHaveLength(5);
      expect(
        rows(el).every((row) => row.getAttribute('role') === 'listitem'),
      ).toBe(true);
      expect(list.querySelector('[data-slot="list-header"]')).toBeNull();
    });

    it('keeps aria-label off the host element', () => {
      const { el } = setup(ProjectedHostComponent);

      expect(el.querySelector('andes-list')?.hasAttribute('aria-label')).toBe(
        false,
      );
    });

    it('projects the header, footer, load-more and pagination slots', () => {
      const { el } = setup(ProjectedHostComponent);

      expect(
        el.querySelector('[data-slot="list-header"]')?.textContent,
      ).toContain('Team');
      expect(
        el.querySelector('[data-slot="list-footer"]')?.textContent,
      ).toContain('8 people');
      expect(
        el.querySelector('[data-slot="list-load-more"] button'),
      ).toBeTruthy();
      expect(
        el.querySelector('[data-slot="list-pagination"] nav'),
      ).toBeTruthy();
    });

    it('reflects size, border, split and layout as classes', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      const root = () => el.querySelector('[data-slot="list"]') as HTMLElement;

      expect(root().classList).toContain('andes-list--md');
      expect(root().classList).toContain('andes-list--split');
      expect(root().classList).not.toContain('andes-list--bordered');

      host.size.set('lg');
      host.bordered.set(true);
      host.split.set(false);
      host.itemLayout.set('vertical');
      fixture.detectChanges();

      expect(root().classList).toContain('andes-list--lg');
      expect(root().classList).toContain('andes-list--bordered');
      expect(root().classList).not.toContain('andes-list--split');
      expect(root().classList).toContain('andes-list--vertical');
      expect(rows(el)[0].getAttribute('data-layout')).toBe('vertical');
    });

    it('renders meta title and description and the actions group', () => {
      const { el } = setup(ProjectedHostComponent);
      const first = rows(el)[0];

      expect(
        first.querySelector('[data-slot="list-item-meta-title"]')?.textContent,
      ).toContain('Person 1');
      expect(
        first.querySelector('[data-slot="list-item-meta-description"]')
          ?.textContent,
      ).toContain('Role 1');
      expect(
        first.querySelector('andes-list-item-actions')?.getAttribute('role'),
      ).toBe('group');
    });

    it('places the actions after the text in a horizontal row and inside it in a vertical one', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      const first = () => rows(el)[0];
      const actions = () =>
        first().querySelector('andes-list-item-actions') as HTMLElement;
      const main = () =>
        first().querySelector('.andes-list-item__main') as HTMLElement;

      expect(main().contains(actions())).toBe(false);

      host.itemLayout.set('vertical');
      fixture.detectChanges();
      expect(main().contains(actions())).toBe(true);
      expect(
        first().querySelector('.andes-list-item__extra .extra'),
      ).toBeTruthy();
    });

    it('shows the empty state when no rows exist', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      host.people.set([]);
      fixture.detectChanges();

      expect(
        el.querySelector('[data-slot="list-empty"]')?.textContent,
      ).toContain('No data');
      expect(
        (el.querySelector('[data-slot="list-items"]') as HTMLElement).hidden,
      ).toBe(true);

      host.notFound.set('Nobody yet');
      fixture.detectChanges();
      expect(
        el.querySelector('[data-slot="list-empty"]')?.textContent,
      ).toContain('Nobody yet');

      host.people.set(PEOPLE.slice(0, 1));
      fixture.detectChanges();
      expect(el.querySelector('[data-slot="list-empty"]')).toBeNull();
    });
  });

  describe('loading', () => {
    it('replaces the rows with skeleton rows and marks the body busy', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      host.loading.set(true);
      fixture.detectChanges();

      expect(el.querySelectorAll('.andes-list__skeleton-row')).toHaveLength(2);
      expect(
        el.querySelector('.andes-list__body')?.getAttribute('aria-busy'),
      ).toBe('true');
      expect(el.querySelector('[role="status"]')?.textContent).toContain(
        'Loading',
      );
      expect(
        (el.querySelector('[data-slot="list-items"]') as HTMLElement).hidden,
      ).toBe(true);
      expect(el.querySelector('[data-slot="list-empty"]')).toBeNull();

      host.loading.set(false);
      fixture.detectChanges();
      expect(el.querySelector('.andes-list__skeleton')).toBeNull();
      expect(
        el.querySelector('.andes-list__body')?.hasAttribute('aria-busy'),
      ).toBe(false);
    });
  });

  describe('grid', () => {
    const style = (el: HTMLElement) =>
      (el.querySelector('[data-slot="list-items"]') as HTMLElement).style;

    it('is not a grid without columns', () => {
      const { el } = setup(ProjectedHostComponent);

      expect(el.querySelector('.andes-list__items--grid')).toBeNull();
    });

    it('applies a fixed column count to every breakpoint', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      host.columns.set(3);
      fixture.detectChanges();

      expect(el.querySelector('.andes-list__items--grid')).toBeTruthy();
      for (const bp of ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']) {
        expect(style(el).getPropertyValue(`--andes-list-columns-${bp}`)).toBe(
          '3',
        );
      }
      expect(rows(el)[0].classList).toContain('andes-list-item--grid');
    });

    it('lets a missing breakpoint repeat the next smaller one', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      host.columns.set({ xs: 1, md: 2, xl: 4 });
      fixture.detectChanges();

      const read = (bp: string) =>
        style(el).getPropertyValue(`--andes-list-columns-${bp}`);
      expect(['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].map(read)).toEqual([
        '1',
        '1',
        '2',
        '2',
        '4',
        '4',
      ]);
    });

    it('sets the gutter from a number or a pair', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      host.columns.set(2);
      host.gutter.set(24);
      fixture.detectChanges();
      expect(style(el).getPropertyValue('--andes-list-gutter-x')).toBe('24px');
      expect(style(el).getPropertyValue('--andes-list-gutter-y')).toBe('24px');

      host.gutter.set([8, 16]);
      fixture.detectChanges();
      expect(style(el).getPropertyValue('--andes-list-gutter-x')).toBe('8px');
      expect(style(el).getPropertyValue('--andes-list-gutter-y')).toBe('16px');
    });
  });

  describe('clickable rows', () => {
    it('keeps list semantics and gives the rows a single tab stop', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      host.clickable.set(true);
      fixture.detectChanges();

      expect(rows(el)[0].getAttribute('role')).toBe('listitem');
      expect(rows(el).map((row) => row.getAttribute('tabindex'))).toEqual([
        '0',
        '-1',
        null,
        '-1',
        '-1',
      ]);
    });

    it('emits itemActivated on click and on Enter or Space', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      host.clickable.set(true);
      fixture.detectChanges();

      rows(el)[1].click();
      key(rows(el)[1], 'Enter');
      key(rows(el)[1], ' ');

      expect(host.activations.map((item) => item.value)).toEqual([2, 2, 2]);
      expect(host.selected()).toEqual([]);
    });

    it('does not activate a disabled row', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      host.clickable.set(true);
      fixture.detectChanges();

      rows(el)[2].click();

      expect(host.activations).toEqual([]);
      expect(rows(el)[2].getAttribute('aria-disabled')).toBe('true');
    });

    it('ignores clicks that land on a control inside the row', () => {
      const { fixture, host, el } = setup(ProjectedHostComponent);
      host.clickable.set(true);
      fixture.detectChanges();

      (rows(el)[0].querySelector('.edit') as HTMLButtonElement).click();

      expect(host.activations).toEqual([]);
    });
  });

  describe('selectable rows', () => {
    async function selectable(mode: AndesListSelectable) {
      const result = setup(ProjectedHostComponent);
      result.host.selectable.set(mode);
      await settle(result.fixture);
      return result;
    }

    it('turns into a listbox of options', async () => {
      const { el } = await selectable('multiple');
      const list = el.querySelector('[data-slot="list-items"]') as HTMLElement;

      expect(list.getAttribute('role')).toBe('listbox');
      expect(list.getAttribute('aria-multiselectable')).toBe('true');
      expect(
        rows(el).every((row) => row.getAttribute('role') === 'option'),
      ).toBe(true);
      expect(rows(el)[0].getAttribute('aria-selected')).toBe('false');
    });

    it('is not multiselectable in single mode', async () => {
      const { el } = await selectable('single');

      expect(
        el
          .querySelector('[data-slot="list-items"]')
          ?.hasAttribute('aria-multiselectable'),
      ).toBe(false);
    });

    it('selects one row at a time in single mode', async () => {
      const { fixture, host, el } = await selectable('single');

      rows(el)[0].click();
      rows(el)[1].click();
      await settle(fixture);

      expect(host.selected()).toEqual([2]);
      expect(rows(el)[1].getAttribute('aria-selected')).toBe('true');
      expect(rows(el)[1].getAttribute('data-state')).toBe('selected');
      expect(rows(el)[0].getAttribute('aria-selected')).toBe('false');
    });

    it('keeps a single selection when the selected row is clicked again', async () => {
      const { fixture, host, el } = await selectable('single');

      rows(el)[0].click();
      rows(el)[0].click();
      await settle(fixture);

      expect(host.selected()).toEqual([1]);
    });

    it('toggles rows in multiple mode', async () => {
      const { fixture, host, el } = await selectable('multiple');

      rows(el)[0].click();
      rows(el)[3].click();
      await settle(fixture);
      expect(host.selected()).toEqual([1, 4]);

      rows(el)[0].click();
      await settle(fixture);
      expect(host.selected()).toEqual([4]);
    });

    it('treats a bare selectable attribute as single', () => {
      @Component({
        imports: [AndesList, AndesListItem],
        template: `<andes-list selectable
          ><andes-list-item value="a">A</andes-list-item></andes-list
        >`,
      })
      class BareHost {}
      const { el } = setup(BareHost);

      expect(el.querySelector('[role="listbox"]')).toBeTruthy();
    });

    it('does not select a disabled row or a row without a value', async () => {
      const { fixture, host, el } = await selectable('multiple');

      rows(el)[2].click();
      await settle(fixture);

      expect(host.selected()).toEqual([]);
    });

    it('moves focus with the arrow keys, skipping disabled rows, and wraps neither end', async () => {
      const { fixture, el } = await selectable('single');
      rows(el)[0].focus();

      key(rows(el)[0], 'ArrowDown');
      expect(document.activeElement).toBe(rows(el)[1]);
      key(rows(el)[1], 'ArrowDown');
      expect(document.activeElement).toBe(rows(el)[3]);
      key(rows(el)[3], 'ArrowUp');
      expect(document.activeElement).toBe(rows(el)[1]);

      key(rows(el)[1], 'End');
      expect(document.activeElement).toBe(rows(el)[4]);
      key(rows(el)[4], 'ArrowDown');
      expect(document.activeElement).toBe(rows(el)[4]);
      key(rows(el)[4], 'Home');
      expect(document.activeElement).toBe(rows(el)[0]);
      key(rows(el)[0], 'ArrowUp');
      expect(document.activeElement).toBe(rows(el)[0]);
      await settle(fixture);
    });

    it('rolls the tab stop to the focused row', async () => {
      const { fixture, el } = await selectable('single');

      rows(el)[3].focus();
      await settle(fixture);

      expect(rows(el).map((row) => row.getAttribute('tabindex'))).toEqual([
        '-1',
        '-1',
        null,
        '0',
        '-1',
      ]);
    });

    it('selects the focused row with Enter and Space and prevents scrolling', async () => {
      const { fixture, host, el } = await selectable('multiple');
      rows(el)[1].focus();

      const space = key(rows(el)[1], ' ');
      key(rows(el)[3], 'Enter');
      await settle(fixture);

      expect(space.defaultPrevented).toBe(true);
      expect(host.selected()).toEqual([2, 4]);
    });

    it('ignores keys pressed on a control inside the row', async () => {
      const { host, el } = await selectable('multiple');

      const event = key(
        rows(el)[0].querySelector('.edit') as HTMLElement,
        'Enter',
      );

      expect(event.defaultPrevented).toBe(false);
      expect(host.selected()).toEqual([]);
    });

    it('selects all and clears through the public methods', async () => {
      const { fixture, host, el } = await selectable('multiple');
      const list = fixture.debugElement.query(
        (node) => node.name === 'andes-list',
      ).componentInstance as AndesList;

      list.selectAll();
      await settle(fixture);
      expect(host.selected()).toEqual([1, 2, 4, 5]);
      expect(rows(el)[0].getAttribute('aria-selected')).toBe('true');

      list.clearSelection();
      await settle(fixture);
      expect(host.selected()).toEqual([]);
    });

    it('focuses a row by index', async () => {
      const { fixture } = await selectable('single');
      const list = fixture.debugElement.query(
        (node) => node.name === 'andes-list',
      ).componentInstance as AndesList;

      list.focusItem(3);

      expect(document.activeElement).toBe(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          'andes-list-item',
        )[3],
      );
    });

    it('moves the tab stop when the row that had it is removed', async () => {
      const { fixture, host, el } = await selectable('single');

      host.people.set(PEOPLE.slice(1, 5));
      await settle(fixture);
      await Promise.resolve();
      await settle(fixture);

      const stops = rows(el).filter(
        (row) => row.getAttribute('tabindex') === '0',
      );
      expect(stops).toHaveLength(1);
    });
  });

  describe('dataSource', () => {
    it('renders the item template once per entry with index context', () => {
      const { el } = setup(DataHostComponent);

      expect(rows(el)).toHaveLength(8);
      expect(
        rows(el)[2].querySelector('[data-slot="list-item-meta-description"]')
          ?.textContent,
      ).toContain('#2');
    });

    it('gives rows from a template declared outside the list their list context', () => {
      const { el } = setup(DataHostComponent);

      expect(rows(el)[0].getAttribute('role')).toBe('listitem');
      expect(rows(el)[0].getAttribute('data-layout')).toBe('horizontal');
    });

    it('uses the trackBy function', () => {
      const { host } = setup(DataHostComponent);

      expect(host.trackCalls).toBeGreaterThan(0);
    });

    it('shows the empty state for an empty or missing data source', () => {
      const { fixture, host, el } = setup(DataHostComponent);

      host.data.set([]);
      fixture.detectChanges();
      expect(
        el.querySelector('[data-slot="list-empty"]')?.textContent,
      ).toContain('No people');

      host.data.set(null);
      fixture.detectChanges();
      expect(rows(el)).toHaveLength(0);
    });

    it('renders a template for the empty state', () => {
      const { fixture, host, el } = setup(DataHostComponent);
      host.data.set([]);
      host.useTemplate.set(true);
      fixture.detectChanges();

      expect(
        el.querySelector('[data-slot="list-empty"] .custom-empty'),
      ).toBeTruthy();
    });

    it('slices the data by page when only a page size is given', () => {
      const { fixture, host, el } = setup(DataHostComponent);
      host.pageSize.set(3);
      fixture.detectChanges();
      expect(rows(el)).toHaveLength(3);

      host.page.set(3);
      fixture.detectChanges();
      expect(rows(el)).toHaveLength(2);
      expect(
        rows(el)[0].querySelector('[data-slot="list-item-meta-title"]')
          ?.textContent,
      ).toContain('Person 7');
      expect(
        rows(el)[0].querySelector('[data-slot="list-item-meta-description"]')
          ?.textContent,
      ).toContain('#6');
    });

    it('takes the data as the current page when a total is given', () => {
      const { fixture, host, el } = setup(DataHostComponent);
      host.pageSize.set(3);
      host.total.set(100);
      host.page.set(2);
      host.data.set(PEOPLE.slice(0, 3));
      fixture.detectChanges();

      expect(rows(el)).toHaveLength(3);
      expect(
        rows(el)[0].querySelector('[data-slot="list-item-meta-description"]')
          ?.textContent,
      ).toContain('#3');
    });
  });

  describe('virtual scrolling', () => {
    it('renders a viewport that carries the list role and a fixed height', () => {
      const { fixture, host, el } = setup(DataHostComponent);
      host.virtual.set(true);
      fixture.detectChanges();
      const viewport = el.querySelector(
        'cdk-virtual-scroll-viewport',
      ) as HTMLElement;

      expect(viewport).toBeTruthy();
      expect(viewport.getAttribute('role')).toBe('list');
      expect(viewport.style.blockSize).toBe('200px');
      expect(
        (el.querySelector('[data-slot="list"]') as HTMLElement).classList,
      ).toContain('andes-list--virtual');
    });

    it('states position and set size on every rendered row', async () => {
      const { fixture, host, el } = setup(DataHostComponent);
      host.virtual.set(true);
      await settle(fixture);
      await settle(fixture);

      const rendered = rows(el);
      expect(rendered.length).toBeGreaterThan(0);
      rendered.forEach((row, index) => {
        expect(row.getAttribute('aria-setsize')).toBe('8');
        expect(row.getAttribute('aria-posinset')).toBe(String(index + 1));
        expect(row.style.blockSize).toBe('40px');
      });
    });

    it('does not set position attributes on a plain list', () => {
      const { el } = setup(DataHostComponent);

      expect(rows(el)[0].hasAttribute('aria-setsize')).toBe(false);
    });
  });

  describe('AndesListItemMeta', () => {
    it('renders text inputs, the avatar slot and slotted title and description', () => {
      const { el } = setup(MetaHostComponent);
      const metas = Array.from(el.querySelectorAll('andes-list-item-meta'));

      expect(
        metas[0].querySelector('.andes-list-item-meta__title')?.textContent,
      ).toContain('Plain title');
      expect(metas[0].querySelector('.avatar')).toBeTruthy();
      expect(metas[1].querySelector('.slotted-title')).toBeTruthy();
      expect(metas[1].querySelector('.slotted-description')).toBeTruthy();
    });

    it('hides empty parts and keeps the title attribute off the host', () => {
      const { el } = setup(MetaHostComponent);
      const empty = el.querySelectorAll('andes-list-item-meta')[2];

      expect(
        empty.querySelector('.andes-list-item-meta__title')?.matches(':empty'),
      ).toBe(true);
      expect(
        empty.querySelector('.andes-list-item-meta__avatar')?.matches(':empty'),
      ).toBe(true);
      expect(empty.hasAttribute('title')).toBe(false);
    });
  });

  describe('stylesheet contract', () => {
    const dir = join(process.cwd(), 'packages/ui/src/lib/list');
    const files = readdirSync(dir).filter((file) => file.endsWith('.css'));
    const read = (file: string) => readFileSync(join(dir, file), 'utf8');

    it('never starts a line with a combinator, which emulated encapsulation would mis-scope', () => {
      for (const file of files) {
        const offending = read(file)
          .split('\n')
          .filter((line) => /^\s*[>+~]/.test(line));
        expect(offending, file).toEqual([]);
      }
    });

    it('draws action dividers without a universal selector before a pseudo-element', () => {
      const css = read('list-item-actions.css');

      expect(css).toMatch(/> :not\(:first-child\)::before/);
      expect(css).not.toMatch(/\*::before/);
    });

    it('stops the skeleton pulse under prefers-reduced-motion', () => {
      expect(read('list.css')).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{[^}]*\{\s*animation: none/,
      );
    });

    it('stops the row transition under prefers-reduced-motion', () => {
      expect(read('list-item.css')).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{\s*:host \{\s*transition: none/,
      );
    });

    it('uses logical properties only', () => {
      for (const file of files) {
        const css = read(file);
        expect(css, file).not.toMatch(
          /(margin|padding)-(left|right|top|bottom)\s*:/,
        );
        expect(css, file).not.toMatch(/border-(left|right|top|bottom)\s*:/);
      }
    });

    it('draws the focus ring on interactive rows', () => {
      expect(read('list-item.css')).toMatch(
        /:host\(\.andes-list-item--interactive:focus-visible\)\s*\{[^}]*outline: 2px solid var\(--andes-color-focus-ring\)/,
      );
    });

    it('limits container queries to grid lists', () => {
      expect(read('list.css')).toMatch(
        /\.andes-list--grid\s*\{\s*container: andes-list \/ inline-size/,
      );
    });
  });
});
