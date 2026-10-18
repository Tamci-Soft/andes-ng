import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesList } from './list';
import { AndesListItem } from './list-item';
import { AndesListItemActions } from './list-item-actions';
import { AndesListItemMeta } from './list-item-meta';

interface Person {
  id: number;
  name: string;
  role: string;
  email: string;
}

const NAMES = [
  ['Lucia Paredes', 'Finance lead'],
  ['Marco Quispe', 'Accountant'],
  ['Rosa Huaman', 'Treasury analyst'],
  ['Diego Salazar', 'Auditor'],
  ['Camila Rojas', 'Payroll specialist'],
  ['Andres Flores', 'Tax advisor'],
  ['Valeria Mendoza', 'Controller'],
  ['Jorge Castillo', 'Billing clerk'],
] as const;

const PEOPLE: Person[] = NAMES.map(([name, role], index) => ({
  id: index + 1,
  name,
  role,
  email: `${name.split(' ')[0].toLowerCase()}@example.com`,
}));

const MANY: Person[] = Array.from({ length: 5000 }, (_, index) => ({
  id: index + 1,
  name: `${NAMES[index % NAMES.length][0]} #${index + 1}`,
  role: NAMES[index % NAMES.length][1],
  email: `user${index + 1}@example.com`,
}));

/** A round initials badge, so the stories need no avatar component. */
const AVATAR =
  'display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 9999px; background: var(--andes-color-muted); color: var(--andes-color-muted-foreground); font-size: 0.875rem; font-weight: 500;';
const LINK =
  'all: unset; cursor: pointer; color: var(--andes-color-primary-text, var(--andes-color-primary)); font-size: 0.875rem;';

const meta: Meta<AndesList> = {
  title: 'List',
  component: AndesList,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        AndesListItem,
        AndesListItemMeta,
        AndesListItemActions,
        AndesButton,
      ],
    }),
  ],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    itemLayout: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
    bordered: { control: 'boolean' },
    split: { control: 'boolean' },
    clickable: { control: 'boolean' },
    selectable: {
      control: 'inline-radio',
      options: ['none', 'single', 'multiple'],
    },
    loading: { control: 'boolean' },
    loadingRows: { control: 'number' },
    notFoundContent: { control: 'text' },
    columns: { control: 'object' },
    gutter: { control: 'object' },
    dataSource: { control: false },
    itemTemplate: { control: false },
    trackBy: { control: false },
    selected: { control: false },
    virtualScroll: { control: 'boolean' },
    itemSize: { control: 'number' },
    viewportHeight: { control: 'number' },
  },
  args: {
    size: 'md',
    itemLayout: 'horizontal',
    bordered: false,
    split: true,
    clickable: false,
    selectable: 'none',
    loading: false,
    loadingRows: 3,
  },
  render: (args) => ({
    props: { ...args, people: PEOPLE.slice(0, 4) },
    template: `<andes-list style="display: block; max-width: 36rem;" label="Team" [size]="size" [itemLayout]="itemLayout" [bordered]="bordered" [split]="split" [clickable]="clickable" [selectable]="selectable" [loading]="loading" [loadingRows]="loadingRows">
      @for (person of people; track person.id) {
        <andes-list-item [value]="person.id">
          <andes-list-item-meta [title]="person.name" [description]="person.role">
            <span slot="avatar" style="${AVATAR}">{{ person.name[0] }}</span>
          </andes-list-item-meta>
        </andes-list-item>
      }
    </andes-list>`,
  }),
};

export default meta;
type Story = StoryObj<AndesList>;

export const Playground: Story = {};

export const Bordered: Story = { args: { bordered: true } };

export const Sizes: Story = {
  render: () => ({
    props: { people: PEOPLE.slice(0, 3), sizes: ['sm', 'md', 'lg'] },
    template: `<div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 36rem;">
      @for (size of sizes; track size) {
        <andes-list [size]="size" bordered [label]="'Team, size ' + size">
          <div slot="header">Size {{ size }}</div>
          @for (person of people; track person.id) {
            <andes-list-item><andes-list-item-meta [title]="person.name" [description]="person.role" /></andes-list-item>
          }
        </andes-list>
      }
    </div>`,
  }),
};

export const HeaderAndFooter: Story = {
  render: () => ({
    props: { people: PEOPLE.slice(0, 3) },
    template: `<andes-list bordered label="Team" style="display: block; max-width: 36rem;">
      <div slot="header">Finance team</div>
      @for (person of people; track person.id) {
        <andes-list-item><andes-list-item-meta [title]="person.name" [description]="person.role" /></andes-list-item>
      }
      <div slot="footer" style="color: var(--andes-color-muted-foreground);">3 of 12 members</div>
    </andes-list>`,
  }),
};

export const WithoutDividers: Story = { args: { split: false } };

export const Actions: Story = {
  render: () => ({
    props: { people: PEOPLE.slice(0, 4) },
    template: `<andes-list label="Team" style="display: block; max-width: 40rem;">
      @for (person of people; track person.id) {
        <andes-list-item>
          <andes-list-item-meta [title]="person.name" [description]="person.email">
            <span slot="avatar" style="${AVATAR}">{{ person.name[0] }}</span>
          </andes-list-item-meta>
          <andes-list-item-actions>
            <button type="button" style="${LINK}">Edit</button>
            <button type="button" style="${LINK}">More</button>
          </andes-list-item-actions>
        </andes-list-item>
      }
    </andes-list>`,
  }),
};

/** In a vertical list the actions sit under the text and `[slot=extra]` stays beside it. */
export const VerticalWithExtra: Story = {
  args: { itemLayout: 'vertical' },
  render: (args) => ({
    props: { ...args, people: PEOPLE.slice(0, 3) },
    template: `<andes-list label="Announcements" [itemLayout]="itemLayout" [size]="size" bordered style="display: block; max-width: 44rem;">
      @for (person of people; track person.id) {
        <andes-list-item>
          <andes-list-item-meta [title]="'Closing checklist for ' + person.role" description="Posted by {{ person.name }} - 2 days ago" />
          Review open invoices, reconcile the bank accounts and confirm the tax payments before Friday noon.
          <andes-list-item-actions>
            <button type="button" style="${LINK}">12 comments</button>
            <button type="button" style="${LINK}">Share</button>
          </andes-list-item-actions>
          <span slot="extra" style="display: block; width: 9rem; height: 6rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></span>
        </andes-list-item>
      }
    </andes-list>`,
  }),
};

/** Rows from an array: the item template receives the entry and its index. */
export const DataSource: Story = {
  render: () => ({
    props: {
      people: PEOPLE,
      trackById: (_: number, person: Person) => person.id,
    },
    template: `<ng-template #row let-person let-index="index">
        <andes-list-item>
          <andes-list-item-meta [title]="person.name" [description]="person.role" />
          <span style="color: var(--andes-color-muted-foreground);">#{{ index + 1 }}</span>
        </andes-list-item>
      </ng-template>
      <andes-list bordered label="Team" [dataSource]="people" [itemTemplate]="row" [trackBy]="trackById" style="display: block; max-width: 36rem;" />`,
  }),
};

export const Loading: Story = { args: { loading: true, bordered: true } };

export const Empty: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 36rem;">
      <andes-list bordered label="Empty" [dataSource]="[]" />
      <andes-list bordered label="Empty with custom text" [dataSource]="[]" notFoundContent="Nobody matches your search" />
    </div>`,
  }),
};

export const EmptyTemplate: Story = {
  render: () => ({
    template: `<ng-template #nothing>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
          <strong>No invoices yet</strong>
          <span style="color: var(--andes-color-muted-foreground);">Create the first one to see it here.</span>
          <andes-button size="sm">New invoice</andes-button>
        </div>
      </ng-template>
      <andes-list bordered label="Invoices" [dataSource]="[]" [notFoundContent]="nothing" style="display: block; max-width: 36rem;" />`,
  }),
};

/** `columns` turns the list into a grid; a map sets the count per breakpoint of the list's own width. */
export const Grid: Story = {
  render: () => ({
    props: { people: PEOPLE },
    template: `<andes-list label="Team" [columns]="{ xs: 1, sm: 2, lg: 4 }" [gutter]="16">
      @for (person of people; track person.id) {
        <andes-list-item>
          <andes-list-item-meta [title]="person.name" [description]="person.role" />
        </andes-list-item>
      }
    </andes-list>`,
  }),
  parameters: { layout: 'padded' },
};

export const GridFixedColumns: Story = {
  render: () => ({
    props: { people: PEOPLE.slice(0, 6) },
    template: `<andes-list label="Team" [columns]="3" [gutter]="[24, 12]">
      @for (person of people; track person.id) {
        <andes-list-item>
          <andes-list-item-meta [title]="person.name" [description]="person.email" />
        </andes-list-item>
      }
    </andes-list>`,
  }),
};

/** Whole rows act as buttons: hover feedback, one tab stop, arrows to move, Enter or Space to open. */
export const Clickable: Story = {
  render: () => ({
    props: { people: PEOPLE.slice(0, 5), last: signal('nothing yet') },
    template: `<div style="max-width: 36rem;">
      <andes-list bordered clickable label="Team" (itemActivated)="last.set($event.value + '')">
        @for (person of people; track person.id) {
          <andes-list-item [value]="person.name"><andes-list-item-meta [title]="person.name" [description]="person.role" /></andes-list-item>
        }
      </andes-list>
      <p style="font-size: 0.875rem; color: var(--andes-color-muted-foreground);">Opened: {{ last() }}</p>
    </div>`,
  }),
};

export const SelectableSingle: Story = {
  render: () => ({
    props: { people: PEOPLE.slice(0, 5), picked: signal<unknown[]>([2]) },
    template: `<div style="max-width: 36rem;">
      <andes-list bordered selectable="single" label="Assignee" [(selected)]="picked">
        @for (person of people; track person.id) {
          <andes-list-item [value]="person.id" [disabled]="person.id === 4"><andes-list-item-meta [title]="person.name" [description]="person.role" /></andes-list-item>
        }
      </andes-list>
      <p style="font-size: 0.875rem; color: var(--andes-color-muted-foreground);">Selected id: {{ picked() }}</p>
    </div>`,
  }),
};

export const SelectableMultiple: Story = {
  render: () => ({
    props: { people: PEOPLE.slice(0, 6), picked: signal<unknown[]>([1, 3]) },
    template: `<div style="max-width: 36rem;">
      <andes-list bordered selectable="multiple" label="Recipients" [(selected)]="picked">
        @for (person of people; track person.id) {
          <andes-list-item [value]="person.id"><andes-list-item-meta [title]="person.name" [description]="person.email" /></andes-list-item>
        }
      </andes-list>
      <p style="font-size: 0.875rem; color: var(--andes-color-muted-foreground);">{{ picked().length }} selected</p>
    </div>`,
  }),
};

/** The load-more slot takes any control; here a button appends rows and shows its own busy state. */
export const LoadMore: Story = {
  render: () => ({
    props: (() => {
      const shown = signal(3);
      const busy = signal(false);
      return {
        shown,
        busy,
        people: PEOPLE,
        more: () => {
          busy.set(true);
          setTimeout(() => {
            shown.update((value) => Math.min(value + 3, PEOPLE.length));
            busy.set(false);
          }, 600);
        },
      };
    })(),
    template: `<andes-list bordered label="Team" [loading]="busy() && shown() === 0" style="display: block; max-width: 36rem;">
      @for (person of people.slice(0, shown()); track person.id) {
        <andes-list-item><andes-list-item-meta [title]="person.name" [description]="person.role" /></andes-list-item>
      }
      @if (shown() < people.length) {
        <andes-button slot="load-more" size="sm" variant="outline" [loading]="busy()" (click)="more()">Load more</andes-button>
      }
    </andes-list>`,
  }),
};

/** `page`, `pageSize` and `total` slice the data; the pagination slot hosts whatever controls you like. */
export const PaginationSlot: Story = {
  render: () => ({
    props: { people: MANY.slice(0, 40), page: signal(1) },
    template: `<ng-template #row let-person>
        <andes-list-item><andes-list-item-meta [title]="person.name" [description]="person.role" /></andes-list-item>
      </ng-template>
      <andes-list bordered label="Team" [dataSource]="people" [itemTemplate]="row" [pageSize]="5" [(page)]="page" style="display: block; max-width: 36rem;">
        <div slot="pagination" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
          <andes-button size="sm" variant="outline" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</andes-button>
          <span>Page {{ page() }} of 8</span>
          <andes-button size="sm" variant="outline" [disabled]="page() === 8" (click)="page.set(page() + 1)">Next</andes-button>
        </div>
      </andes-list>`,
  }),
};

/** Only the rows in view exist in the DOM; each states its position in the whole set for assistive tech. */
export const VirtualScroll: Story = {
  render: () => ({
    props: { people: MANY },
    template: `<ng-template #row let-person let-index="index">
        <andes-list-item>
          <andes-list-item-meta [title]="person.name" [description]="person.role" />
          <span style="color: var(--andes-color-muted-foreground);">{{ index + 1 }}</span>
        </andes-list-item>
      </ng-template>
      <andes-list bordered label="All users, 5000 rows" [dataSource]="people" [itemTemplate]="row" virtualScroll [itemSize]="56" [viewportHeight]="360" style="display: block; max-width: 36rem;" />`,
  }),
};
