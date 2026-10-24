import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesMasonry, type AndesMasonryItemConfig } from './masonry';
import { AndesMasonryItem } from './masonry-item';

const base =
  'font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground, #0f172a); font-family: var(--andes-font-family, system-ui), sans-serif;';
const card = `${base} box-sizing: border-box; padding: 12px 14px; border: 1px solid var(--andes-color-border, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); background: var(--andes-color-card, #fff);`;
const title =
  'margin: 0 0 4px; font-size: 1rem; line-height: 1.5rem; font-weight: 600;';
const muted = 'margin: 0; color: var(--andes-color-muted-foreground, #64748b);';
const button = `height: 24px; padding: 0 10px; border: 1px solid var(--andes-color-input, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); background: var(--andes-color-background, #fff); color: inherit; font: inherit; cursor: pointer;`;

const TOPICS = [
  'Quarterly stock count',
  'Supplier onboarding',
  'Credit note approval',
  'Warehouse transfer',
  'Payroll closing',
  'Price list update',
  'Customer statement',
  'Tax declaration',
  'Asset depreciation',
  'Purchase requisition',
  'Bank reconciliation',
  'Production order',
];

/** Cards with a deterministic spread of lengths so the columns visibly interlock. */
const ITEMS: AndesMasonryItemConfig<{ title: string; lines: number }>[] =
  TOPICS.map((name, i) => ({
    key: i + 1,
    data: { title: name, lines: 1 + ((i * 7) % 5) },
  }));

const range = (count: number) => Array.from({ length: count }, (_, i) => i);
const more = (existing: number) =>
  range(3).map((i) => ({
    key: existing + i + 1,
    data: {
      title: TOPICS[(existing + i) % TOPICS.length],
      lines: 1 + (((existing + i) * 5) % 5),
    },
  }));

const meta: Meta<AndesMasonry> = {
  title: 'Masonry',
  component: AndesMasonry,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesMasonry, AndesMasonryItem] })],
  parameters: { layout: 'padded' },
  argTypes: {
    columns: { control: 'object' },
    gutter: { control: 'object' },
    fresh: { control: 'boolean' },
  },
  args: { columns: 3, gutter: 16, fresh: false },
  render: (args) => ({
    props: { ...args, items: ITEMS, range },
    template: `
      <andes-masonry [columns]="columns" [gutter]="gutter" [fresh]="fresh" [items]="items" [itemTemplate]="tpl" />
      <ng-template #tpl let-item>
        <article style="${card}">
          <h3 style="${title}">{{ item.data.title }}</h3>
          @for (n of range(item.data.lines); track n) {
            <p style="${muted}">Line {{ n + 1 }} of document {{ item.key }}.</p>
          }
        </article>
      </ng-template>`,
  }),
};

export default meta;
type Story = StoryObj<AndesMasonry>;

export const Default: Story = {};

export const ResponsiveColumns: Story = {
  name: 'Responsive columns',
  args: { columns: { xs: 1, sm: 2, lg: 3, xl: 4 } },
  parameters: {
    docs: {
      description: {
        story:
          'The column count follows the viewport: 1 from 0px, 2 from 576px, 3 from 992px, 4 from 1200px. Before the first measurement the same counts drive a plain CSS-columns layout.',
      },
    },
  },
};

export const GutterPerAxis: Story = {
  name: 'Horizontal and vertical gutter',
  args: { gutter: [24, 8] },
};

export const FreshPlacement: Story = {
  name: 'Stable and fresh placement',
  args: { columns: 3 },
  render: (args) => ({
    props: {
      ...args,
      items: signal<AndesMasonryItemConfig<{ title: string; lines: number }>[]>(
        ITEMS.slice(0, 6),
      ),
      big: signal(false),
      range,
      more,
    },
    template: `
      <div style="${base} display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        <button type="button" style="${button}" (click)="items.update(list => [...list, ...more(list.length)])">Append 3 cards</button>
        <button type="button" style="${button}" (click)="big.set(!big())">{{ big() ? 'Shrink' : 'Grow' }} the first card</button>
        <span style="${muted}">Stable placement keeps every card in its column; turn on <code>fresh</code> in the controls to re-pack on every change.</span>
      </div>
      <andes-masonry [columns]="columns" [fresh]="fresh" [items]="items()" [itemTemplate]="tpl" />
      <ng-template #tpl let-item>
        <article style="${card}">
          <h3 style="${title}">{{ item.data.title }}</h3>
          @for (n of range(item.key === 1 && big() ? 9 : item.data.lines); track n) {
            <p style="${muted}">Line {{ n + 1 }} of document {{ item.key }}.</p>
          }
        </article>
      </ng-template>`,
  }),
};

export const ProjectedItems: Story = {
  name: 'Projected items with pinned columns',
  render: () => ({
    template: `
      <andes-masonry [columns]="3" [gutter]="12">
        <andes-masonry-item [column]="0"><div style="${card}"><h3 style="${title}">Pinned to column 1</h3><p style="${muted}">Pinned items still count towards the column's height.</p></div></andes-masonry-item>
        <andes-masonry-item><div style="${card}"><h3 style="${title}">Order 10482</h3><p style="${muted}">Ready to ship.</p></div></andes-masonry-item>
        <andes-masonry-item><div style="${card}"><h3 style="${title}">Order 10483</h3><p style="${muted}">Waiting for payment.</p><p style="${muted}">Reminder sent yesterday.</p><p style="${muted}">Customer asked for a call.</p></div></andes-masonry-item>
        <andes-masonry-item [column]="2"><div style="${card}"><h3 style="${title}">Pinned to column 3</h3></div></andes-masonry-item>
        <andes-masonry-item><div style="${card}"><h3 style="${title}">Order 10484</h3><p style="${muted}">Partially delivered.</p></div></andes-masonry-item>
        <andes-masonry-item><div style="${card}"><h3 style="${title}">Order 10485</h3><p style="${muted}">Backordered.</p><p style="${muted}">Two lines pending.</p></div></andes-masonry-item>
      </andes-masonry>`,
  }),
};

export const ContentThatGrows: Story = {
  name: 'Content that changes height',
  render: () => ({
    props: { open: signal<number[]>([]) },
    template: `
      <andes-masonry [columns]="3" [gutter]="12">
        @for (n of [1, 2, 3, 4, 5, 6]; track n) {
          <andes-masonry-item>
            <div style="${card}">
              <h3 style="${title}">Ticket {{ n }}</h3>
              <button type="button" style="${button}" [attr.aria-expanded]="open().includes(n)" (click)="open.set(open().includes(n) ? open().filter(x => x !== n) : [...open(), n])">{{ open().includes(n) ? 'Hide' : 'Show' }} details</button>
              @if (open().includes(n)) {
                <p style="${muted} margin-top: 8px;">The layout follows: items below slide into their new place without a jump.</p>
                <p style="${muted}">Opened tickets push the next ones down in their own column only.</p>
              }
            </div>
          </andes-masonry-item>
        }
      </andes-masonry>`,
  }),
};
