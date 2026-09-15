import type { Meta, StoryObj } from '@storybook/angular';

import { AndesTooltip } from './tooltip';
import { AndesTooltipContent } from './tooltip-content';
import { AndesTooltipTrigger } from './tooltip-trigger';

const meta: Meta<AndesTooltip> = {
  title: 'Tooltip',
  component: AndesTooltip,
  tags: ['autodocs'],
  argTypes: {
    content: { control: 'text' },
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'select', options: ['start', 'center', 'end'] },
    sideOffset: { control: 'number' },
    alignOffset: { control: 'number' },
    disabled: { control: 'boolean' },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
    instantReopenWindow: { control: 'number' },
  },
  args: {
    content: 'Helpful hint',
    side: 'top',
    align: 'center',
    sideOffset: 6,
    alignOffset: 0,
    disabled: false,
    openDelay: 600,
    closeDelay: 0,
    instantReopenWindow: 400,
  },
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div style="padding: 6rem;">
        <andes-tooltip
          [content]="content"
          [side]="side"
          [align]="align"
          [sideOffset]="sideOffset"
          [alignOffset]="alignOffset"
          [disabled]="disabled"
          [openDelay]="openDelay"
          [closeDelay]="closeDelay"
          [instantReopenWindow]="instantReopenWindow"
        >
          <button type="button" andesTooltipTrigger>Hover or focus me</button>
        </andes-tooltip>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesTooltip>;

export const Default: Story = {};

export const Sides: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div style="display: flex; gap: 4rem; padding: 6rem;">
        <andes-tooltip content="Top" side="top">
          <button type="button" andesTooltipTrigger>Top</button>
        </andes-tooltip>
        <andes-tooltip content="Right" side="right">
          <button type="button" andesTooltipTrigger>Right</button>
        </andes-tooltip>
        <andes-tooltip content="Bottom" side="bottom">
          <button type="button" andesTooltipTrigger>Bottom</button>
        </andes-tooltip>
        <andes-tooltip content="Left" side="left">
          <button type="button" andesTooltipTrigger>Left</button>
        </andes-tooltip>
      </div>
    `,
  }),
};

export const RichContent: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger, AndesTooltipContent] },
    props: args,
    template: `
      <div style="padding: 6rem;">
        <andes-tooltip>
          <button type="button" andesTooltipTrigger>Sync status</button>
          <ng-template andesTooltipContent>
            Last synced <strong>2 minutes ago</strong>
          </ng-template>
        </andes-tooltip>
      </div>
    `,
  }),
};

export const InstantReopenGroup: Story = {
  name: 'Instant reopen (toolbar)',
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div style="display: flex; gap: 0.5rem; padding: 6rem;">
        <andes-tooltip content="Cut">
          <button type="button" andesTooltipTrigger aria-label="Cut">✂️</button>
        </andes-tooltip>
        <andes-tooltip content="Copy">
          <button type="button" andesTooltipTrigger aria-label="Copy">📋</button>
        </andes-tooltip>
        <andes-tooltip content="Paste">
          <button type="button" andesTooltipTrigger aria-label="Paste">📌</button>
        </andes-tooltip>
      </div>
      <p style="max-width: 32rem; color: var(--andes-color-accent-foreground, #475569);">
        Hover the first icon and wait for its tooltip, then move to the next
        one - it opens instantly instead of paying the open delay again.
      </p>
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true, content: 'You will not see me' },
};

export const CustomTiming: Story = {
  args: { openDelay: 0, closeDelay: 300 },
};
