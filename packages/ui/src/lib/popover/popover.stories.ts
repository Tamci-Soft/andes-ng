import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesPopover } from './popover';
import { AndesPopoverContent } from './popover-content';
import { AndesPopoverTrigger } from './popover-trigger';

const meta: Meta<AndesPopover> = {
  title: 'Popover',
  component: AndesPopover,
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'select', options: ['start', 'center', 'end'] },
    sideOffset: { control: 'number' },
    alignOffset: { control: 'number' },
    showArrow: { control: 'boolean' },
  },
  args: {
    side: 'bottom',
    align: 'center',
    sideOffset: 8,
    alignOffset: 0,
    showArrow: false,
  },
  decorators: [
    () => ({
      template: `<div style="padding: 8rem;"><story/></div>`,
    }),
  ],
  render: (args) => ({
    moduleMetadata: {
      imports: [AndesButton, AndesPopoverTrigger, AndesPopoverContent],
    },
    props: args,
    template: `
      <andes-popover [side]="side" [align]="align" [sideOffset]="sideOffset" [alignOffset]="alignOffset" [showArrow]="showArrow">
        <button andes-button andesPopoverTrigger>Open popover</button>
        <andes-popover-content>
          <p style="margin: 0 0 0.5rem; font-weight: 600;">Popover title</p>
          <p style="margin: 0; font-size: 0.875rem;">This is the popover body content.</p>
        </andes-popover-content>
      </andes-popover>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesPopover>;

export const Default: Story = {};

export const WithArrow: Story = {
  args: { showArrow: true },
};

export const Top: Story = {
  args: { side: 'top' },
};

export const Right: Story = {
  args: { side: 'right' },
};

export const Left: Story = {
  args: { side: 'left' },
};

export const AlignStart: Story = {
  args: { align: 'start' },
};

export const AlignEnd: Story = {
  args: { align: 'end' },
};

export const AllPlacements: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesButton, AndesPopoverTrigger, AndesPopoverContent],
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, 8rem); gap: 3rem; padding: 6rem;">
        @for (side of ['top', 'right', 'bottom', 'left']; track side) {
          @for (align of ['start', 'center', 'end']; track align) {
            <andes-popover [side]="side" [align]="align" [showArrow]="true">
              <button andes-button size="sm" andesPopoverTrigger>{{ side }}/{{ align }}</button>
              <andes-popover-content>{{ side }} · {{ align }}</andes-popover-content>
            </andes-popover>
          }
        }
      </div>
    `,
  }),
};

export const Controlled: Story = {
  render: (args) => ({
    moduleMetadata: {
      imports: [AndesButton, AndesPopoverTrigger, AndesPopoverContent],
    },
    props: { ...args, visible: false },
    template: `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <andes-button (click)="visible = !visible">Toggle from outside</andes-button>
        <andes-popover [side]="side" [align]="align" [(open)]="visible">
          <button andes-button variant="outline" andesPopoverTrigger>Or click me</button>
          <andes-popover-content>Controlled via [(open)].</andes-popover-content>
        </andes-popover>
      </div>
    `,
  }),
};
