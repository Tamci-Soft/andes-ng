import { Component, DestroyRef, inject, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesCommand } from './command';
import { AndesCommandDialog } from './command-dialog';
import type {
  AndesCommandEntry,
  AndesCommandItem,
  AndesCommandSelectEvent,
} from './command-types';

const NAVIGATION: AndesCommandEntry[] = [
  {
    heading: 'Suggestions',
    items: [
      { value: 'dashboard', label: 'Dashboard', icon: '▦', shortcut: 'G D' },
      {
        value: 'orders',
        label: 'Sales orders',
        icon: '🧾',
        shortcut: ['G', 'O'],
      },
      {
        value: 'customers',
        label: 'Customers',
        icon: '👥',
        keywords: ['clients', 'accounts'],
      },
      {
        value: 'invoices',
        label: 'Invoices',
        icon: '💳',
        description: 'Billing',
      },
    ],
  },
  { separator: true },
  {
    heading: 'Settings',
    items: [
      { value: 'profile', label: 'Profile', icon: '👤', shortcut: 'Mod+P' },
      {
        value: 'appearance',
        label: 'Appearance',
        icon: '🎨',
        keywords: ['theme', 'dark', 'light'],
      },
      { value: 'billing', label: 'Billing', icon: '🧮', disabled: true },
      {
        value: 'shortcuts',
        label: 'Keyboard shortcuts',
        icon: '⌨',
        shortcut: 'Mod+/',
      },
    ],
  },
];

const WITH_PAGES: AndesCommandEntry[] = [
  {
    heading: 'Actions',
    items: [
      {
        value: 'new-order',
        label: 'Create sales order',
        icon: '➕',
        shortcut: 'Mod+N',
      },
      {
        value: 'projects',
        label: 'Search projects…',
        icon: '📁',
        placeholder: 'Find a project',
        children: [
          { value: 'alpha', label: 'Project Alpha', description: 'Warehouse' },
          { value: 'beta', label: 'Project Beta', description: 'Finance' },
          {
            value: 'archive',
            label: 'Archived…',
            placeholder: 'Find an archived project',
            children: [
              { value: 'old-1', label: 'Legacy rollout' },
              { value: 'old-2', label: 'Migration 2019' },
            ],
          },
        ],
      },
      {
        value: 'team',
        label: 'Find a teammate…',
        icon: '🙋',
        children: [
          { value: 'ana', label: 'Ana Torres' },
          { value: 'luis', label: 'Luis Rojas' },
          { value: 'maria', label: 'Maria Soto' },
        ],
      },
    ],
  },
  { separator: true },
  {
    heading: 'Help',
    items: [{ value: 'docs', label: 'Documentation', icon: '📖' }],
  },
];

const CAPTION =
  'font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground);';

/** Server-side filtering: the list is replaced a moment after each keystroke. */
@Component({
  selector: 'andes-story-async-command',
  imports: [AndesCommand],
  template: `
    <div style="width: 30rem;">
      <andes-command
        [items]="items()"
        [shouldFilter]="false"
        [loading]="loading()"
        [(search)]="search"
        placeholder="Search customers on the server…"
        label="Customers"
        (itemSelected)="last.set($event.item.label ?? $event.item.value)"
      />
      <p style="${CAPTION}">Selected: {{ last() || 'nothing yet' }}</p>
    </div>
  `,
})
class StoryAsyncCommand {
  private static readonly CUSTOMERS = [
    'Acme Corporation',
    'Andes Logistics',
    'Bright Foods',
    'Cordillera Mining',
    'Delta Textiles',
    'Pacifico Energy',
    'Quipu Software',
  ];
  protected readonly search = signal('');
  protected readonly items = signal<AndesCommandEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly last = signal('');
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    this.query('');
  }

  protected query(search: string): void {
    clearTimeout(this.timer);
    this.loading.set(true);
    this.timer = setTimeout(() => {
      const needle = search.toLowerCase();
      this.items.set(
        StoryAsyncCommand.CUSTOMERS.filter((name) =>
          name.toLowerCase().includes(needle),
        ).map((name) => ({ value: name, label: name })),
      );
      this.loading.set(false);
    }, 600);
  }
}

/** The palette in a dialog, with the global shortcut and a trigger that shows it. */
@Component({
  selector: 'andes-story-command-dialog',
  imports: [AndesButton, AndesCommandDialog],
  template: `
    <div
      style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start; width: 26rem;"
    >
      <andes-button variant="outline" (click)="open.set(true)">
        Open command menu
      </andes-button>
      <p style="${CAPTION}">
        Press Ctrl+K (Command+K on a Mac) anywhere on this page. Escape or a
        click on the backdrop closes it.
      </p>
      <p style="${CAPTION}">Last command: {{ last() || 'none' }}</p>
    </div>
    <andes-command-dialog
      [(open)]="open"
      [items]="items"
      label="Command menu"
      (itemSelected)="onSelected($event)"
    />
  `,
})
class StoryCommandDialog {
  protected readonly open = signal(false);
  protected readonly last = signal('');
  protected readonly items = WITH_PAGES;

  protected onSelected(event: AndesCommandSelectEvent): void {
    const trail = event.pages.map((page) => page.label ?? page.value);
    this.last.set([...trail, event.item.label ?? event.item.value].join(' / '));
  }
}

/** A controlled active item: the buttons move it, the arrow keys follow. */
@Component({
  selector: 'andes-story-controlled-command',
  imports: [AndesButton, AndesCommand],
  template: `
    <div
      style="display: flex; flex-direction: column; gap: 0.75rem; width: 30rem;"
    >
      <div style="display: flex; gap: 0.5rem;">
        <andes-button
          size="sm"
          variant="outline"
          (click)="value.set('appearance')"
          >Appearance</andes-button
        >
        <andes-button
          size="sm"
          variant="outline"
          (click)="value.set('invoices')"
          >Invoices</andes-button
        >
      </div>
      <andes-command [items]="items" [(value)]="value" [autoFocus]="false" />
      <p style="${CAPTION}">Active item: {{ value() }}</p>
    </div>
  `,
})
class StoryControlledCommand {
  protected readonly items = NAVIGATION;
  protected readonly value = signal<string | null>('profile');
}

const meta: Meta<AndesCommand> = {
  title: 'Command',
  component: AndesCommand,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A searchable list of commands: a search box over items grouped under headings, filtered and ranked as you type with a fuzzy match, with the matched letters highlighted. Focus stays in the search box while the arrow keys move through the list (Home and End jump to the ends, Enter selects). Items can carry icons, keywords, shortcuts and a nested page; the command dialog opens the same list over a scrim with a global shortcut.',
      },
    },
  },
  argTypes: {
    shouldFilter: { control: 'boolean' },
    loop: { control: 'boolean' },
    highlight: { control: 'boolean' },
    loading: { control: 'boolean' },
    vimBindings: { control: 'boolean' },
    placeholder: { control: 'text' },
    emptyText: { control: 'text' },
    loadingText: { control: 'text' },
    label: { control: 'text' },
  },
  args: {
    shouldFilter: true,
    loop: true,
    highlight: true,
    loading: false,
    vimBindings: false,
    placeholder: 'Type a command or search…',
    emptyText: 'No results found.',
    loadingText: 'Loading…',
    label: 'Command menu',
  },
  render: (args) => ({
    props: { ...args, items: NAVIGATION },
    template: `
      <div style="width: 30rem;">
        <andes-command
          [items]="items"
          [shouldFilter]="shouldFilter"
          [loop]="loop"
          [highlight]="highlight"
          [loading]="loading"
          [vimBindings]="vimBindings"
          [placeholder]="placeholder"
          [emptyText]="emptyText"
          [loadingText]="loadingText"
          [label]="label"
          [autoFocus]="false"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesCommand>;

/** Type "ord", "dark" (a keyword) or "gh"-style initials: matches are fuzzy and ranked. */
export const Default: Story = {};

/** Without the surrounding rounding and with a custom empty text. */
export const EmptyState: Story = {
  args: { emptyText: 'Nothing here. Try another word.' },
  render: (args) => ({
    props: { ...args, items: NAVIGATION },
    template: `
      <div style="width: 30rem;">
        <andes-command [items]="items" [emptyText]="emptyText" [autoFocus]="false" />
      </div>
    `,
  }),
};

/** `loading` shows a row while results are on their way. */
export const Loading: Story = {
  args: { loading: true },
};

/** Icons, descriptions, keyboard shortcuts at the end of the row and a disabled item. */
export const IconsAndShortcuts: Story = {};

/** `keywords` match words that are not shown: type "theme" to find "Appearance". */
export const Keywords: Story = {
  render: () => ({
    props: { items: NAVIGATION },
    template: `
      <div style="width: 30rem;">
        <andes-command [items]="items" [autoFocus]="false" />
        <p style="${CAPTION}">Try "theme", "clients" or "dark".</p>
      </div>
    `,
  }),
};

/** An item with `children` opens a page. Backspace in an empty box, or Escape, goes back. */
export const NestedPages: Story = {
  render: () => ({
    props: { items: WITH_PAGES },
    template: `
      <div style="width: 30rem;">
        <andes-command [items]="items" [autoFocus]="false" label="Actions" />
        <p style="${CAPTION}">Open "Search projects…", then "Archived…"; press Backspace to go back.</p>
      </div>
    `,
  }),
};

/** `shouldFilter="false"`: the list is whatever the server returned; `search` reports the text. */
export const ServerSideFiltering: Story = {
  render: () => ({
    moduleMetadata: { imports: [StoryAsyncCommand] },
    template: `<andes-story-async-command />`,
  }),
};

/** A custom row template: a coloured status dot and the label cut into matched slices. */
export const CustomItem: Story = {
  render: () => ({
    props: {
      items: [
        { value: 'ok', label: 'Warehouse north', data: 'ok' },
        { value: 'late', label: 'Warehouse south', data: 'late' },
        { value: 'off', label: 'Warehouse east', data: 'off' },
      ] as AndesCommandItem[],
    },
    template: `
      <div style="width: 30rem;">
        <andes-command [items]="items" [itemTemplate]="row" [autoFocus]="false" />
        <ng-template #row let-item let-segments="segments">
          <span aria-hidden="true" style="width: 0.5rem; height: 0.5rem; border-radius: 9999px;"
            [style.background]="item.data === 'ok' ? 'var(--andes-color-success)' : item.data === 'late' ? 'var(--andes-color-warning)' : 'var(--andes-color-muted-foreground)'"></span>
          <span style="flex: 1;">
            @for (segment of segments; track $index) {
              @if (segment.match) { <mark style="background: transparent; color: inherit; font-weight: 700;">{{ segment.text }}</mark> } @else { {{ segment.text }} }
            }
          </span>
          <span style="font-size: 0.75rem; color: var(--andes-color-muted-foreground);">{{ item.data }}</span>
        </ng-template>
      </div>
    `,
  }),
};

/** A custom `filter` ranks by anything you like: here, only names that start with the text. */
export const CustomFilter: Story = {
  render: () => ({
    props: {
      items: NAVIGATION,
      startsWith: (item: AndesCommandItem, search: string) =>
        (item.label ?? item.value)
          .toLowerCase()
          .startsWith(search.toLowerCase())
          ? 1
          : 0,
    },
    template: `
      <div style="width: 30rem;">
        <andes-command [items]="items" [filter]="startsWith" [autoFocus]="false" />
      </div>
    `,
  }),
};

/** The active item is a two-way `value`. */
export const ControlledValue: Story = {
  render: () => ({
    moduleMetadata: { imports: [StoryControlledCommand] },
    template: `<andes-story-controlled-command />`,
  }),
};

/** In a dialog: Ctrl+K or Command+K anywhere opens it, focus is trapped, Escape closes it. */
export const InADialog: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    moduleMetadata: { imports: [StoryCommandDialog] },
    template: `<andes-story-command-dialog />`,
  }),
};

/** Right-to-left: the field, shortcuts and chevrons mirror. */
export const RightToLeft: Story = {
  render: () => ({
    props: {
      items: [
        { value: 'home', label: 'الرئيسية', shortcut: 'G H' },
        { value: 'orders', label: 'الطلبات' },
        {
          value: 'more',
          label: 'المزيد',
          children: [{ value: 'x', label: 'عنصر' }],
        },
      ] as AndesCommandItem[],
    },
    template: `
      <div dir="rtl" style="width: 30rem;">
        <andes-command [items]="items" placeholder="اكتب أمرا أو ابحث…" [autoFocus]="false" />
      </div>
    `,
  }),
};
