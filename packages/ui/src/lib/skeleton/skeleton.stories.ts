import type { Meta, StoryObj } from '@storybook/angular';

import { AndesSkeleton } from './skeleton';

const meta: Meta<AndesSkeleton> = {
  title: 'Skeleton',
  component: AndesSkeleton,
  tags: ['autodocs'],
  argTypes: {
    shape: { control: 'select', options: ['text', 'circular', 'rectangular'] },
    width: { control: 'text' },
    height: { control: 'text' },
    animated: { control: 'boolean' },
  },
  args: {
    shape: 'text',
    animated: true,
  },
  render: (args) => ({
    props: args,
    template: `<andes-skeleton [shape]="shape" [width]="width" [height]="height" [animated]="animated" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesSkeleton>;

export const Text: Story = {
  args: { shape: 'text' },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 250px;">
        <andes-skeleton [shape]="shape" [animated]="animated" />
        <andes-skeleton [shape]="shape" [animated]="animated" width="80%" />
        <andes-skeleton [shape]="shape" [animated]="animated" width="60%" />
      </div>
    `,
  }),
};

export const Circular: Story = {
  args: { shape: 'circular' },
};

export const Rectangular: Story = {
  args: { shape: 'rectangular' },
  render: (args) => ({
    props: args,
    template: `<div style="width: 300px;"><andes-skeleton [shape]="shape" [animated]="animated" /></div>`,
  }),
};

export const CustomSize: Story = {
  args: { shape: 'circular', width: 80, height: 80 },
};

export const Static: Story = {
  args: { animated: false },
};

export const CardPlaceholder: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; align-items: center; gap: 1rem; width: 300px;">
        <andes-skeleton shape="circular" [width]="48" [height]="48" [animated]="animated" />
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
          <andes-skeleton shape="text" width="60%" [animated]="animated" />
          <andes-skeleton shape="text" width="90%" [animated]="animated" />
        </div>
      </div>
    `,
  }),
};

export const AllShapes: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; align-items: center; gap: 1.5rem;">
        <andes-skeleton shape="text" [width]="120" />
        <andes-skeleton shape="circular" />
        <andes-skeleton shape="rectangular" [width]="120" [height]="80" />
      </div>
    `,
  }),
};
