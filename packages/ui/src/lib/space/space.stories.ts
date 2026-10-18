import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesSpace } from './space';
import { AndesSpaceCompact } from './space-compact';
import { AndesSpaceItem } from './space-item';

const BOX =
  'display:flex;align-items:center;justify-content:center;min-width:3rem;height:2rem;padding:0 0.75rem;background:var(--andes-color-muted);color:var(--andes-color-foreground);border:1px solid var(--andes-color-border);border-radius:var(--andes-radius-md);font:14px/22px var(--andes-font-family),sans-serif;';
const CAPTION =
  'margin:0 0 0.5rem;font:12px/20px var(--andes-font-family),sans-serif;color:var(--andes-color-muted-foreground);';
const LINK =
  'color:var(--andes-color-primary-text, var(--andes-color-primary));font:14px/22px var(--andes-font-family),sans-serif;text-decoration:none;';

/**
 * Plain-looking controls for the compact demos. They carry no component classes on purpose: the
 * grouping rules only look at the group's children, so the same markup works with any control.
 */
const DEMO_CONTROLS = `
  .demo-btn, .demo-select, .demo-field {
    box-sizing: border-box; height: 2rem; margin: 0;
    border: 1px solid var(--andes-color-input);
    border-radius: var(--andes-radius-md);
    background: var(--andes-color-background);
    color: var(--andes-color-foreground);
    font: 14px/22px var(--andes-font-family), sans-serif;
  }
  .demo-btn, .demo-select { padding: 0 0.75rem; cursor: pointer; }
  .demo-btn { display: inline-flex; align-items: center; }
  .demo-btn:hover, .demo-select:hover { border-color: color-mix(in srgb, var(--andes-color-primary) 65%, var(--andes-color-input)); }
  .demo-btn:focus-visible, .demo-select:focus-visible { outline: 2px solid var(--andes-color-focus-ring); outline-offset: 0; }
  .demo-btn--primary { background: var(--andes-color-primary); border-color: var(--andes-color-primary); color: var(--andes-color-primary-foreground); }
  .demo-btn--icon { width: 2rem; padding: 0; justify-content: center; }
  .demo-field { display: inline-flex; align-items: center; padding: 0 0.75rem; min-width: 0; }
  .demo-field:focus-within { border-color: var(--andes-color-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--andes-color-primary) 20%, transparent); }
  .demo-field input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; padding: 0; font: inherit; color: inherit; }
  .demo-field input::placeholder { color: var(--andes-color-muted-foreground); }
  .demo-addon { display: inline-flex; align-items: center; height: 2rem; padding: 0 0.75rem; box-sizing: border-box; border: 1px solid var(--andes-color-input); border-radius: var(--andes-radius-md); background: var(--andes-color-muted); color: var(--andes-color-muted-foreground); font: 14px/22px var(--andes-font-family), sans-serif; }
`;

const meta: Meta<AndesSpace> = {
  title: 'Space',
  component: AndesSpace,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [AndesSpaceItem, AndesSpaceCompact, AndesButton],
    }),
  ],
  parameters: { layout: 'padded' },
  argTypes: {
    direction: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    size: {
      control: 'text',
      description:
        '`sm`, `md`, `lg`, a number of pixels, a CSS length or `[h, v]`.',
    },
    align: {
      control: 'select',
      options: [undefined, 'start', 'end', 'center', 'baseline'],
    },
    wrap: { control: 'boolean' },
    split: {
      control: 'text',
      description: 'Text or a template drawn between items.',
    },
  },
  args: {
    direction: 'horizontal',
    size: 'sm',
    align: undefined,
    wrap: false,
    split: undefined,
  },
  render: (args) => ({
    props: { ...args, box: BOX },
    template: `
      <andes-space [direction]="direction" [size]="size" [align]="align" [wrap]="wrap" [split]="split || null">
        @for (n of [1, 2, 3, 4]; track n) {
          <div andesSpaceItem [style]="box">Item {{ n }}</div>
        }
      </andes-space>`,
  }),
};

export default meta;

type Story = StoryObj<AndesSpace>;

export const Default: Story = {};

export const Vertical: Story = {
  args: { direction: 'vertical' },
};

export const Sizes: Story = {
  render: () => ({
    props: { box: BOX, cap: CAPTION },
    template: `
      <div style="display:grid;gap:1rem">
        @for (s of ['sm', 'md', 'lg', 4, '2rem']; track s) {
          <div>
            <p [style]="cap">size = {{ s }}</p>
            <andes-space [size]="s"><div [style]="box">A</div><div [style]="box">B</div><div [style]="box">C</div></andes-space>
          </div>
        }
      </div>`,
  }),
};

/** A pair sets the horizontal and the vertical gap separately; the vertical one shows once items wrap. */
export const PairedGap: Story = {
  render: () => ({
    props: { box: BOX, items: Array.from({ length: 12 }, (_, i) => i + 1) },
    template: `
      <andes-space [size]="[8, 24]" wrap style="max-width:22rem">
        @for (n of items; track n) {<div [style]="box">Tag {{ n }}</div>}
      </andes-space>`,
  }),
};

export const Align: Story = {
  render: () => ({
    props: { box: BOX, cap: CAPTION },
    template: `
      <div style="display:grid;gap:1rem">
        @for (a of ['start', 'center', 'end', 'baseline']; track a) {
          <div>
            <p [style]="cap">align = {{ a }}</p>
            <andes-space [align]="a" style="padding:0.5rem;border:1px dashed var(--andes-color-border);border-radius:var(--andes-radius-md)">
              <div [style]="box + 'height:4rem'">Tall</div>
              <div [style]="box">Short</div>
              <div [style]="box">Short</div>
            </andes-space>
          </div>
        }
      </div>`,
  }),
};

export const Wrap: Story = {
  render: () => ({
    props: { box: BOX, items: Array.from({ length: 14 }, (_, i) => i + 1) },
    template: `
      <andes-space wrap size="md" style="max-width:24rem">
        @for (n of items; track n) {<div [style]="box">Tag {{ n }}</div>}
      </andes-space>`,
  }),
};

/**
 * `split` draws a separator between items. Mark each child with `andesSpaceItem`: the separator
 * is rendered as a real, `aria-hidden` sibling after every item except the last.
 */
export const SplitText: Story = {
  render: () => ({
    props: { link: LINK },
    template: `
      <andes-space split="|" size="md">
        <a andesSpaceItem href="#edit" [style]="link">Edit</a>
        <a andesSpaceItem href="#duplicate" [style]="link">Duplicate</a>
        <a andesSpaceItem href="#archive" [style]="link">Archive</a>
      </andes-space>`,
  }),
};

export const SplitTemplate: Story = {
  render: () => ({
    props: { link: LINK },
    template: `
      <ng-template #dot><span style="display:block;width:4px;height:4px;border-radius:50%;background:var(--andes-color-muted-foreground)"></span></ng-template>
      <andes-space [split]="dot" size="md">
        <a andesSpaceItem href="#a" [style]="link">Purchase orders</a>
        <a andesSpaceItem href="#b" [style]="link">Goods receipts</a>
        <a andesSpaceItem href="#c" [style]="link">Invoices</a>
      </andes-space>

      <ng-template #rule><div style="height:1px;background:var(--andes-color-border);align-self:stretch;width:12rem"></div></ng-template>
      <andes-space direction="vertical" [split]="rule" size="md" style="margin-top:1.5rem">
        <span andesSpaceItem style="font:14px/22px var(--andes-font-family),sans-serif">First section</span>
        <span andesSpaceItem style="font:14px/22px var(--andes-font-family),sans-serif">Second section</span>
        <span andesSpaceItem style="font:14px/22px var(--andes-font-family),sans-serif">Third section</span>
      </andes-space>`,
  }),
};

/** Items that come and go: the separators always sit between what is currently shown. */
export const SplitWithConditionalItems: Story = {
  render: () => {
    const showArchive = signal(true);
    return {
      props: { showArchive, link: LINK },
      template: `
        <label style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem;font:14px/22px var(--andes-font-family),sans-serif">
          <input type="checkbox" [checked]="showArchive()" (change)="showArchive.set(!showArchive())" />
          Show "Archive"
        </label>
        <andes-space split="/" size="md">
          <a andesSpaceItem href="#edit" [style]="link">Edit</a>
          @if (showArchive()) {
            <a andesSpaceItem href="#archive" [style]="link">Archive</a>
          }
          <a andesSpaceItem href="#delete" [style]="link">Delete</a>
        </andes-space>`,
    };
  },
};

/** Compact group: squared inner corners, shared borders, raised on hover and focus. */
export const Compact: Story = {
  render: () => ({
    styles: [DEMO_CONTROLS],
    template: `
      <div style="display:grid;gap:1.5rem;justify-items:start">
        <andes-space-compact aria-label="Actions">
          <button class="demo-btn" type="button">Day</button>
          <button class="demo-btn" type="button">Week</button>
          <button class="demo-btn" type="button">Month</button>
        </andes-space-compact>

        <andes-space-compact aria-label="Search">
          <label class="demo-field"><input type="search" placeholder="Search invoices" aria-label="Search invoices" /></label>
          <button class="demo-btn demo-btn--primary" type="button">Search</button>
        </andes-space-compact>

        <andes-space-compact aria-label="Amount">
          <select class="demo-select" aria-label="Currency"><option>PEN</option><option>USD</option></select>
          <label class="demo-field"><input type="text" inputmode="decimal" placeholder="0.00" aria-label="Amount" /></label>
          <span class="demo-addon">per unit</span>
        </andes-space-compact>

        <andes-space-compact aria-label="Pagination">
          <button class="demo-btn demo-btn--icon" type="button" aria-label="Previous page">&lsaquo;</button>
          <button class="demo-btn demo-btn--icon" type="button" aria-label="Page 1">1</button>
          <button class="demo-btn demo-btn--icon" type="button" aria-label="Page 2">2</button>
          <button class="demo-btn demo-btn--icon" type="button" aria-label="Next page">&rsaquo;</button>
        </andes-space-compact>
      </div>`,
  }),
};

export const CompactVertical: Story = {
  render: () => ({
    styles: [DEMO_CONTROLS],
    template: `
      <andes-space-compact direction="vertical" aria-label="Zoom" style="width:8rem">
        <button class="demo-btn" type="button">Zoom in</button>
        <button class="demo-btn" type="button">Zoom out</button>
        <button class="demo-btn" type="button">Reset</button>
      </andes-space-compact>`,
  }),
};

/** In block mode text fields take the remaining width; `data-grow` does the same for any child. */
export const CompactBlock: Story = {
  render: () => ({
    styles: [DEMO_CONTROLS],
    template: `
      <div style="max-width:32rem;display:grid;gap:1rem">
        <andes-space-compact block aria-label="Subscribe">
          <label class="demo-field" data-grow><input type="email" placeholder="you@company.com" aria-label="Email" /></label>
          <button class="demo-btn demo-btn--primary" type="button">Subscribe</button>
        </andes-space-compact>
        <andes-space-compact block aria-label="Filter">
          <select class="demo-select" aria-label="Field"><option>Supplier</option><option>Status</option></select>
          <label class="demo-field" data-grow><input type="text" placeholder="contains…" aria-label="Value" /></label>
          <button class="demo-btn" type="button">Apply</button>
        </andes-space-compact>
      </div>`,
  }),
};

/** A compact group sits inside a space like any other child. */
export const CompactInsideSpace: Story = {
  render: () => ({
    styles: [DEMO_CONTROLS],
    template: `
      <andes-space size="md" wrap>
        <andes-space-compact aria-label="View">
          <button class="demo-btn" type="button">List</button>
          <button class="demo-btn" type="button">Grid</button>
        </andes-space-compact>
        <andes-space-compact aria-label="Search">
          <label class="demo-field"><input type="search" placeholder="Search" aria-label="Search" /></label>
          <button class="demo-btn demo-btn--primary" type="button">Go</button>
        </andes-space-compact>
        <button class="demo-btn" type="button">Export</button>
      </andes-space>`,
  }),
};

/** The design system's own button works in a group unchanged: its inner `<button>` is the first element the rules reach. */
export const CompactWithButtons: Story = {
  render: () => ({
    template: `
      <div style="display:grid;gap:1.5rem;justify-items:start">
        <andes-space-compact aria-label="Range">
          <andes-button variant="outline">Day</andes-button>
          <andes-button variant="outline">Week</andes-button>
          <andes-button variant="outline">Month</andes-button>
        </andes-space-compact>
        <andes-space-compact aria-label="Save">
          <andes-button>Save</andes-button>
          <andes-button variant="outline" aria-label="More save options">&#9662;</andes-button>
        </andes-space-compact>
        <andes-space-compact direction="vertical" aria-label="Order" style="width:8rem">
          <andes-button variant="outline">Move up</andes-button>
          <andes-button variant="outline">Move down</andes-button>
        </andes-space-compact>
      </div>`,
  }),
};
