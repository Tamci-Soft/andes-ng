import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesFlex, AndesFlexLayout } from './flex';

const BOX =
  'display:flex;align-items:center;justify-content:center;min-width:3rem;padding:0 0.75rem;background:var(--andes-color-muted);color:var(--andes-color-foreground);border:1px solid var(--andes-color-border);border-radius:var(--andes-radius-md);font:14px/22px var(--andes-font-family),sans-serif;';
const TALL = BOX + 'min-height:4rem;';
const PANEL =
  'padding:1rem;border:1px dashed var(--andes-color-border);border-radius:var(--andes-radius-lg);';
const CAPTION =
  'margin:0 0 0.5rem;font:12px/20px var(--andes-font-family),sans-serif;color:var(--andes-color-muted-foreground);';

const meta: Meta<AndesFlex> = {
  title: 'Flex',
  component: AndesFlex,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesFlexLayout] })],
  parameters: { layout: 'padded' },
  argTypes: {
    vertical: { control: 'boolean' },
    reverse: { control: 'boolean' },
    wrap: {
      control: 'select',
      options: [undefined, 'nowrap', 'wrap', 'wrap-reverse'],
    },
    justify: {
      control: 'select',
      options: [
        undefined,
        'flex-start',
        'center',
        'flex-end',
        'space-between',
        'space-around',
        'space-evenly',
      ],
    },
    align: {
      control: 'select',
      options: [
        undefined,
        'flex-start',
        'center',
        'flex-end',
        'stretch',
        'baseline',
      ],
    },
    gap: {
      control: 'text',
      description: '`sm`, `md`, `lg`, a number of pixels, or any CSS length.',
    },
    flex: { control: 'text' },
    inline: { control: 'boolean' },
  },
  args: {
    vertical: false,
    reverse: false,
    wrap: undefined,
    justify: undefined,
    align: undefined,
    gap: 'md',
    flex: undefined,
    inline: false,
  },
  render: (args) => ({
    props: { ...args, box: BOX, panel: PANEL },
    template: `
      <div [style]="panel" style="max-width:36rem">
        <andes-flex [vertical]="vertical" [reverse]="reverse" [wrap]="wrap" [justify]="justify" [align]="align" [gap]="gap" [flex]="flex" [inline]="inline">
          @for (n of [1, 2, 3, 4]; track n) {
            <div [style]="box">Item {{ n }}</div>
          }
        </andes-flex>
      </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesFlex>;

export const Default: Story = {};

export const Vertical: Story = {
  args: { vertical: true, gap: 'sm' },
};

/** Gap presets resolve to the spacing tokens; a number is pixels and any CSS length works too. */
export const GapSizes: Story = {
  render: () => ({
    props: { box: BOX, panel: PANEL, cap: CAPTION },
    template: `
      <div style="display:grid;gap:1rem;max-width:36rem">
        @for (g of ['sm', 'md', 'lg', 4, '2rem']; track g) {
          <div>
            <p [style]="cap">gap = {{ g }}</p>
            <andes-flex [gap]="g"><div [style]="box">A</div><div [style]="box">B</div><div [style]="box">C</div></andes-flex>
          </div>
        }
      </div>`,
  }),
};

export const Wrap: Story = {
  render: () => ({
    props: {
      box: BOX,
      panel: PANEL,
      cap: CAPTION,
      items: Array.from({ length: 14 }, (_, i) => i + 1),
    },
    template: `
      <div style="display:grid;gap:1rem;max-width:30rem">
        <div>
          <p [style]="cap">wrap = true</p>
          <andes-flex wrap gap="sm">@for (n of items; track n) {<div [style]="box">Tag {{ n }}</div>}</andes-flex>
        </div>
        <div>
          <p [style]="cap">wrap = nowrap (items shrink, content stays on one line)</p>
          <andes-flex wrap="nowrap" gap="sm" [style]="panel + 'overflow:hidden'">@for (n of items; track n) {<div [style]="box + 'white-space:nowrap'">Tag {{ n }}</div>}</andes-flex>
        </div>
        <div>
          <p [style]="cap">wrap = wrap-reverse</p>
          <andes-flex wrap="wrap-reverse" gap="sm">@for (n of items; track n) {<div [style]="box">Tag {{ n }}</div>}</andes-flex>
        </div>
      </div>`,
  }),
};

export const Justify: Story = {
  render: () => ({
    props: { box: BOX, panel: PANEL, cap: CAPTION },
    template: `
      <div style="display:grid;gap:1rem;max-width:36rem">
        @for (j of ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']; track j) {
          <div>
            <p [style]="cap">justify = {{ j }}</p>
            <andes-flex [justify]="j" gap="sm" [style]="panel"><div [style]="box">A</div><div [style]="box">B</div><div [style]="box">C</div></andes-flex>
          </div>
        }
      </div>`,
  }),
};

export const Align: Story = {
  render: () => ({
    props: { box: BOX, tall: TALL, panel: PANEL, cap: CAPTION },
    template: `
      <div style="display:grid;gap:1rem;max-width:36rem">
        @for (a of ['flex-start', 'center', 'flex-end', 'stretch', 'baseline']; track a) {
          <div>
            <p [style]="cap">align = {{ a }}</p>
            <andes-flex [align]="a" gap="sm" [style]="panel">
              <div [style]="a === 'stretch' ? box : tall">Tall</div>
              <div [style]="box">Short</div>
              <div [style]="box">Short</div>
            </andes-flex>
          </div>
        }
      </div>`,
  }),
};

/** `flex` on a child decides how it shares the leftover space, exactly as in plain CSS. */
export const GrowingChildren: Story = {
  render: () => ({
    props: { box: BOX, panel: PANEL },
    template: `
      <div [style]="panel" style="max-width:36rem">
        <andes-flex gap="sm">
          <div [style]="box">Fixed</div>
          <div [style]="box + 'flex:1'">flex: 1</div>
          <div [style]="box + 'flex:2'">flex: 2</div>
        </andes-flex>
      </div>`,
  }),
};

/** The container's own `flex` makes nested containers share a row. */
export const NestedFlex: Story = {
  render: () => ({
    props: { box: BOX, panel: PANEL },
    template: `
      <andes-flex gap="md" style="max-width:36rem">
        <andes-flex vertical gap="sm" flex="1" [style]="panel">
          <div [style]="box">Sidebar 1</div><div [style]="box">Sidebar 2</div>
        </andes-flex>
        <andes-flex vertical gap="sm" flex="2" [style]="panel">
          <div [style]="box">Main 1</div><div [style]="box">Main 2</div><div [style]="box">Main 3</div>
        </andes-flex>
      </andes-flex>`,
  }),
};

/**
 * There is no dynamic tag: put the `andesFlex` attribute on the element you need, so the markup
 * stays semantic (a list stays a list, a section a section).
 */
export const AsAnyElement: Story = {
  render: () => ({
    props: { box: BOX, cap: CAPTION },
    template: `
      <div style="display:grid;gap:1rem;max-width:36rem">
        <section andesFlex vertical gap="sm" aria-label="Notes">
          <h3 style="margin:0;font:600 16px/24px var(--andes-font-family),sans-serif">A section with a heading</h3>
          <p style="margin:0;font:14px/22px var(--andes-font-family),sans-serif;color:var(--andes-color-muted-foreground)">Laid out as a column by the attribute.</p>
        </section>
        <ul andesFlex wrap gap="sm" style="margin:0;padding:0;list-style:none">
          @for (t of ['Invoices', 'Payments', 'Suppliers', 'Reports']; track t) {
            <li [style]="box">{{ t }}</li>
          }
        </ul>
      </div>`,
  }),
};

/** A page toolbar: title on the start side, actions on the end, wrapping on narrow screens. */
export const Toolbar: Story = {
  render: () => ({
    props: { box: BOX },
    template: `
      <andes-flex wrap justify="space-between" align="center" gap="md" style="max-width:44rem;padding:0.75rem 1rem;border:1px solid var(--andes-color-border);border-radius:var(--andes-radius-lg);background:var(--andes-color-card);color:var(--andes-color-card-foreground)">
        <andes-flex vertical gap="0">
          <strong style="font:600 16px/24px var(--andes-font-family),sans-serif">Purchase orders</strong>
          <span style="font:12px/20px var(--andes-font-family),sans-serif;color:var(--andes-color-muted-foreground)">128 open, 14 awaiting approval</span>
        </andes-flex>
        <andes-flex gap="sm" align="center">
          <span [style]="box + 'height:2rem'">Filter</span>
          <span [style]="box + 'height:2rem'">Export</span>
          <span [style]="box + 'height:2rem;background:var(--andes-color-primary);color:var(--andes-color-primary-foreground);border-color:transparent'">New order</span>
        </andes-flex>
      </andes-flex>`,
  }),
};

export const Reverse: Story = {
  args: { reverse: true, gap: 'sm' },
};

export const Inline: Story = {
  render: () => ({
    props: { box: BOX },
    template: `
      <p style="font:14px/22px var(--andes-font-family),sans-serif;max-width:36rem">
        Text before
        <andes-flex inline gap="4" align="center" style="vertical-align:middle"><span [style]="box">A</span><span [style]="box">B</span></andes-flex>
        and after, on the same line.
      </p>`,
  }),
};
