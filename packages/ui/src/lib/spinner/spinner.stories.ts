import type { Meta, StoryObj } from '@storybook/angular';

import { AndesSpinner } from './spinner';

const meta: Meta<AndesSpinner> = {
  title: 'Spinner',
  component: AndesSpinner,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['ring', 'dots', 'bars'] },
    size: { control: 'text' },
    tip: { control: 'text' },
    label: { control: 'text' },
    percent: { control: 'text' },
  },
  args: { variant: 'ring', size: 'md', label: 'Loading' },
  render: (args) => ({
    props: args,
    template: `<andes-spinner [variant]="variant" [size]="size" [tip]="tip" [label]="label" [percent]="percent" />`,
  }),
};

export default meta;
type Story = StoryObj<AndesSpinner>;

const row =
  'display: flex; align-items: flex-end; gap: 2rem; flex-wrap: wrap; font: 14px/22px var(--andes-font-family, system-ui), sans-serif; color: var(--andes-color-foreground);';

export const Playground: Story = {};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A ring (default), three dots or three bars. All of them loop slowly and keep a small footprint.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="${row}">
        <andes-spinner variant="ring" />
        <andes-spinner variant="dots" />
        <andes-spinner variant="bars" />
      </div>`,
  }),
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`sm` 16px, `md` 24px (default), `lg` 40px, or any pixel number / CSS length.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="${row}">
        <andes-spinner size="sm" />
        <andes-spinner size="md" />
        <andes-spinner size="lg" />
        <andes-spinner [size]="64" />
        <andes-spinner size="3rem" variant="dots" />
        <andes-spinner [size]="56" variant="bars" />
      </div>`,
  }),
};

export const WithTip: Story = {
  render: () => ({
    template: `
      <div style="${row}">
        <andes-spinner tip="Loading invoices..." />
        <andes-spinner variant="dots" size="lg" tip="Syncing" />
      </div>`,
  }),
};

export const Determinate: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A `percent` turns the ring into a fill that starts at 12 o'clock. The host becomes a progress bar (`aria-valuenow`).",
      },
    },
  },
  render: () => ({
    template: `
      <div style="${row}">
        <andes-spinner size="lg" [percent]="0" />
        <andes-spinner size="lg" [percent]="35" tip="Uploading" />
        <andes-spinner size="lg" [percent]="72" />
        <andes-spinner size="lg" [percent]="100" />
      </div>`,
  }),
};

export const SimulatedProgress: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`percent="auto"` advances on its own, slowing down towards the end, and never reaches 100 by itself.',
      },
    },
  },
  render: () => ({
    template: `<andes-spinner size="lg" percent="auto" tip="Preparing report" />`,
  }),
};

export const CustomColor: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Colour and track are CSS custom properties: `--andes-spinner-color`, `--andes-spinner-track-color`.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="${row}">
        <andes-spinner size="lg" style="--andes-spinner-color: var(--andes-color-success);" />
        <andes-spinner size="lg" variant="dots" style="--andes-spinner-color: var(--andes-color-danger);" />
        <andes-spinner size="lg" variant="bars" style="--andes-spinner-color: var(--andes-color-muted-foreground);" />
      </div>`,
  }),
};

export const InlineWithText: Story = {
  render: () => ({
    template: `
      <p style="margin: 0; font: 14px/22px var(--andes-font-family, system-ui), sans-serif; color: var(--andes-color-foreground);">
        Saving changes <andes-spinner size="sm" label="Saving changes" />
      </p>`,
  }),
};
