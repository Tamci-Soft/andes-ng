import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesAffix } from './affix';

const scroller =
  'height: 300px; overflow: auto; border: 1px solid var(--andes-color-border, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); padding: 0 16px 16px; font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground, #0f172a); background: var(--andes-color-background, #fff); font-family: var(--andes-font-family, system-ui), sans-serif;';
const bar =
  'display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border: 1px solid var(--andes-color-border, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); background: var(--andes-color-card, #fff); box-shadow: 0 1px 2px rgb(0 0 0 / 8%);';
const button =
  'height: 24px; padding: 0 10px; border: 1px solid var(--andes-color-input, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); background: var(--andes-color-background, #fff); color: inherit; font: inherit; cursor: pointer;';

function filler(lines: number, label = 'Row'): string {
  return Array.from(
    { length: lines },
    (_, i) =>
      `<p style="margin: 0; padding: 6px 0; border-bottom: 1px solid var(--andes-color-border, #d1d5db);">${label} ${i + 1}: purchase order line with a quantity, a unit price and a delivery date.</p>`,
  ).join('');
}

const meta: Meta<AndesAffix> = {
  title: 'Affix',
  component: AndesAffix,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesAffix] })],
  parameters: { layout: 'padded' },
  argTypes: {
    offsetTop: { control: 'number' },
    offsetBottom: { control: 'number' },
    mode: { control: 'inline-radio', options: ['auto', 'sticky', 'fixed'] },
    disabled: { control: 'boolean' },
    zIndex: { control: 'number' },
  },
  args: { offsetTop: 8, mode: 'auto', disabled: false },
  render: (args) => ({
    props: { ...args, pinned: signal(false) },
    template: `
      <div #scroller style="${scroller}">
        <p style="margin: 12px 0;">Scroll this panel: the toolbar below stays visible once it reaches the top.</p>
        <andes-affix [target]="scroller" [offsetTop]="offsetTop" [offsetBottom]="offsetBottom" [mode]="mode" [zIndex]="zIndex" [disabled]="disabled" (changed)="pinned.set($event)">
          <div style="${bar}">
            <strong>Purchase order 10482</strong>
            <span>{{ pinned() ? 'Pinned' : 'In place' }}</span>
            <button type="button" style="${button}">Approve</button>
          </div>
        </andes-affix>
        ${filler(24)}
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<AndesAffix>;

export const ScrollContainer: Story = {};

export const OffsetFromTop: Story = {
  args: { offsetTop: 40 },
};

export const PinnedToBottom: Story = {
  args: { offsetTop: undefined, offsetBottom: 8 },
  render: (args) => ({
    props: { ...args, pinned: signal(false) },
    template: `
      <div #scroller style="${scroller}">
        <div style="min-height: 380px; padding-top: 12px;">The action bar starts below the fold and pins to the bottom edge until its own place is reached.</div>
        <andes-affix [target]="scroller" [offsetBottom]="offsetBottom" (changed)="pinned.set($event)">
          <div style="${bar}"><span>{{ pinned() ? 'Pinned to the bottom' : 'In place' }}</span><button type="button" style="${button}">Save</button></div>
        </andes-affix>
        ${filler(10)}
      </div>`,
  }),
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const PageScroll: Story = {
  name: 'Page scroll',
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: args,
    template: `
      <div style="padding: 16px; font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground, #0f172a); font-family: var(--andes-font-family, system-ui), sans-serif;">
        <p>Without a target the toolbar pins to the top of the page while the page scrolls.</p>
        <andes-affix [offsetTop]="offsetTop">
          <div style="${bar}"><strong>Sales report</strong><button type="button" style="${button}">Export</button></div>
        </andes-affix>
        ${filler(40, 'Entry')}
      </div>`,
  }),
};

export const FixedStrategy: Story = {
  name: 'Fixed strategy (short parent)',
  render: () => ({
    props: { pinned: signal(false) },
    template: `
      <div #scroller style="${scroller}">
        <p style="margin: 12px 0;">The wrapper around the toolbar is only as tall as the toolbar, so native sticky positioning could not pin it. The fixed strategy pins it anyway and keeps a placeholder, so nothing below shifts.</p>
        <div style="border: 1px dashed var(--andes-color-border, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem);">
          <andes-affix [target]="scroller" [offsetTop]="8" mode="fixed" (changed)="pinned.set($event)">
            <div style="${bar}"><strong>Short parent</strong><span>{{ pinned() ? 'Pinned' : 'In place' }}</span></div>
          </andes-affix>
        </div>
        ${filler(24)}
      </div>`,
  }),
};
