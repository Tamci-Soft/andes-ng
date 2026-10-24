import { BidiModule } from '@angular/cdk/bidi';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesScrollArea } from './scroll-area';

const styles = [
  `
  .box { box-sizing: border-box; width: 18rem; height: 14rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md); background: var(--andes-color-background); color: var(--andes-color-foreground); font-size: 0.875rem; line-height: 1.375rem; }
  .pad { padding: 0.75rem 1rem; }
  .row { padding: 0.375rem 0; border-block-end: 1px solid var(--andes-color-border); }
  .wide { display: flex; gap: 0.75rem; padding: 0.75rem; }
  .card { flex: none; width: 9rem; height: 6rem; display: grid; place-items: center; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md); background: var(--andes-color-muted); }
  .grid { display: grid; grid-template-columns: repeat(12, 6rem); gap: 0.5rem; padding: 0.75rem; width: max-content; }
  .grid div { height: 3rem; display: grid; place-items: center; border-radius: var(--andes-radius-sm); background: var(--andes-color-muted); font-size: 0.75rem; }
  .gallery { display: flex; flex-wrap: wrap; gap: 2rem; align-items: flex-start; }
  .caption { margin: 0 0 0.25rem; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); }
  `,
];

const rows = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  name: `Invoice INV-${1000 + i}`,
}));

const meta: Meta<AndesScrollArea> = {
  title: 'ScrollArea',
  component: AndesScrollArea,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'inline-radio',
      options: ['auto', 'always', 'scroll', 'hover'],
    },
    orientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal', 'both'],
    },
    hideDelay: { control: 'number' },
    minThumbSize: { control: 'number' },
    edgeShadow: { control: 'boolean' },
    focusable: { control: 'boolean' },
    scrolled: { action: 'scrolled' },
  },
  args: {
    type: 'auto',
    orientation: 'vertical',
    hideDelay: 600,
    minThumbSize: 24,
    edgeShadow: false,
    focusable: true,
  },
  render: (args) => ({
    props: { ...args, rows },
    styles,
    template: `
      <andes-scroll-area class="box" aria-label="Invoices" [type]="type" [orientation]="orientation" [hideDelay]="hideDelay" [minThumbSize]="minThumbSize" [edgeShadow]="edgeShadow" [focusable]="focusable" (scrolled)="scrolled($event)">
        <div class="pad">
          @for (row of rows; track row.id) { <div class="row">{{ row.name }}</div> }
        </div>
      </andes-scroll-area>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesScrollArea>;

export const Default: Story = {};

/** `type` decides when the bars show: auto, always, scroll or hover. */
export const Types: Story = {
  render: () => ({
    props: { rows },
    styles,
    template: `
      <div class="gallery">
        @for (type of ['auto', 'always', 'scroll', 'hover']; track type) {
          <div>
            <p class="caption">type="{{ type }}"</p>
            <andes-scroll-area class="box" [aria-label]="'Invoices, ' + type" [type]="$any(type)">
              <div class="pad">@for (row of rows; track row.id) { <div class="row">{{ row.name }}</div> }</div>
            </andes-scroll-area>
          </div>
        }
      </div>
    `,
  }),
};

export const Horizontal: Story = {
  render: () => ({
    props: { cards: Array.from({ length: 12 }, (_, i) => i + 1) },
    styles,
    template: `
      <andes-scroll-area class="box" style="height: auto;" orientation="horizontal" aria-label="Gallery">
        <div class="wide">@for (card of cards; track card) { <div class="card">Card {{ card }}</div> }</div>
      </andes-scroll-area>
    `,
  }),
};

/** Both axes, with a corner so the bars never overlap. */
export const Both: Story = {
  render: () => ({
    props: { cells: Array.from({ length: 12 * 14 }, (_, i) => i + 1) },
    styles,
    template: `
      <andes-scroll-area class="box" orientation="both" type="always" aria-label="Spreadsheet">
        <div class="grid">@for (cell of cells; track cell) { <div>{{ cell }}</div> }</div>
      </andes-scroll-area>
    `,
  }),
};

/** Soft shadows show which edges still have content beyond them. */
export const EdgeShadows: Story = {
  render: () => ({
    props: { rows },
    styles,
    template: `
      <andes-scroll-area class="box" edgeShadow aria-label="Invoices with edge shadows">
        <div class="pad">@for (row of rows; track row.id) { <div class="row">{{ row.name }}</div> }</div>
      </andes-scroll-area>
    `,
  }),
};

/** A `max-height` is enough; short content simply shows no bar. */
export const MaxHeight: Story = {
  render: () => ({
    props: { few: rows.slice(0, 3), many: rows },
    styles,
    template: `
      <div class="gallery">
        <andes-scroll-area class="box" style="height: auto; max-height: 10rem;" aria-label="Three invoices">
          <div class="pad">@for (row of few; track row.id) { <div class="row">{{ row.name }}</div> }</div>
        </andes-scroll-area>
        <andes-scroll-area class="box" style="height: auto; max-height: 10rem;" aria-label="Thirty invoices">
          <div class="pad">@for (row of many; track row.id) { <div class="row">{{ row.name }}</div> }</div>
        </andes-scroll-area>
      </div>
    `,
  }),
};

/** The imperative API and the position output. */
export const ProgrammaticScroll: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesButton] },
    props: { rows, position: null as unknown },
    styles,
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="display: flex; gap: 0.5rem;">
          <andes-button size="sm" variant="outline" (click)="area.scrollToTop('smooth')">Top</andes-button>
          <andes-button size="sm" variant="outline" (click)="area.scrollBy({ top: 120, behavior: 'smooth' })">Down 120px</andes-button>
          <andes-button size="sm" variant="outline" (click)="area.scrollToBottom('smooth')">Bottom</andes-button>
        </div>
        <andes-scroll-area #area class="box" aria-label="Invoices" (scrolled)="position = $event">
          <div class="pad">@for (row of rows; track row.id) { <div class="row">{{ row.name }}</div> }</div>
        </andes-scroll-area>
        <span style="font-size: 0.75rem; line-height: 1.25rem;">
          top: {{ position?.top ?? 0 }}px - {{ position?.atBottom ? 'at the bottom' : 'more below' }}
        </span>
      </div>
    `,
  }),
};

export const CustomStyling: Story = {
  render: () => ({
    props: { rows },
    styles: [
      ...styles,
      `.box { --andes-scroll-area-thumb-color: var(--andes-color-primary); --andes-scroll-area-thumb-hover-color: var(--andes-color-primary-hover); --andes-scroll-area-size: 0.875rem; }
       .brand-bar { background: color-mix(in srgb, var(--andes-color-primary) 10%, transparent); }`,
    ],
    template: `
      <andes-scroll-area class="box" type="always" scrollbarClass="brand-bar" aria-label="Styled invoices">
        <div class="pad">@for (row of rows; track row.id) { <div class="row">{{ row.name }}</div> }</div>
      </andes-scroll-area>
    `,
  }),
};

export const RightToLeft: Story = {
  render: () => ({
    moduleMetadata: { imports: [BidiModule] },
    props: { cells: Array.from({ length: 12 * 14 }, (_, i) => i + 1) },
    styles,
    template: `
      <div dir="rtl">
        <andes-scroll-area class="box" orientation="both" type="always" edgeShadow aria-label="Spreadsheet">
          <div class="grid">@for (cell of cells; track cell) { <div>{{ cell }}</div> }</div>
        </andes-scroll-area>
      </div>
    `,
  }),
};
