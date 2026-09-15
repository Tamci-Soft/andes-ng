import type { Meta, StoryObj } from '@storybook/angular';

import { AndesProgress } from './progress';

const meta: Meta<AndesProgress> = {
  title: 'Progress',
  component: AndesProgress,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'danger'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    value: 42,
    min: 0,
    max: 100,
    variant: 'primary',
    size: 'md',
  },
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;"><andes-progress [value]="value" [min]="min" [max]="max" [variant]="variant" [size]="size" aria-label="Progress" /></div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesProgress>;

export const Determinate: Story = {
  args: { value: 42 },
};

export const Indeterminate: Story = {
  args: { value: null },
};

export const Complete: Story = {
  args: { value: 100 },
};

export const Empty: Story = {
  args: { value: 0 },
};

export const Success: Story = {
  args: { value: 100, variant: 'success' },
};

export const Warning: Story = {
  args: { value: 65, variant: 'warning' },
};

export const Danger: Story = {
  args: { value: 20, variant: 'danger' },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const CustomRange: Story = {
  args: { value: 140, min: 50, max: 200 },
};

export const WithValueText: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;"><andes-progress [value]="value" aria-label="Upload progress" aria-valuetext="56 of 100 files uploaded" /></div>`,
  }),
};

export const AllSizes: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
        <andes-progress size="sm" [value]="value" aria-label="Small progress" />
        <andes-progress size="md" [value]="value" aria-label="Medium progress" />
        <andes-progress size="lg" [value]="value" aria-label="Large progress" />
      </div>
    `,
  }),
};

export const AllVariants: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
        <andes-progress variant="primary" [value]="value" aria-label="Primary progress" />
        <andes-progress variant="success" [value]="value" aria-label="Success progress" />
        <andes-progress variant="warning" [value]="value" aria-label="Warning progress" />
        <andes-progress variant="danger" [value]="value" aria-label="Danger progress" />
      </div>
    `,
  }),
};
