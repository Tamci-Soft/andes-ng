import type { Meta, StoryObj } from '@storybook/angular';

import { AndesBadge } from './badge';

const meta: Meta<AndesBadge> = {
  title: 'Badge',
  component: AndesBadge,
  tags: ['autodocs'],
  argTypes: {
    count: { control: 'number' },
    max: { control: 'number' },
    dot: { control: 'boolean' },
    showZero: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'success', 'warning', 'info'],
    },
    standalone: { control: 'boolean' },
  },
  args: {
    count: 5,
    max: 99,
    dot: false,
    showZero: false,
    variant: 'danger',
    standalone: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <andes-badge [count]="count" [max]="max" [dot]="dot" [showZero]="showZero" [variant]="variant" [standalone]="standalone">
        <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div>
      </andes-badge>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesBadge>;

export const Count: Story = {
  args: { count: 5 },
};

export const OverflowCount: Story = {
  args: { count: 150, max: 99 },
};

export const ZeroHidden: Story = {
  args: { count: 0 },
};

export const ZeroShown: Story = {
  args: { count: 0, showZero: true },
};

export const Dot: Story = {
  args: { dot: true, count: undefined },
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 2rem;">
        <andes-badge [count]="3" variant="primary"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
        <andes-badge [count]="3" variant="secondary"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
        <andes-badge [count]="3" variant="danger"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
        <andes-badge [count]="3" variant="success"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
        <andes-badge [count]="3" variant="warning"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
        <andes-badge [count]="3" variant="info"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
      </div>
    `,
  }),
};

export const StandaloneStatus: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-badge standalone dot variant="success"><span slot="label">Online</span></andes-badge>
        <andes-badge standalone dot variant="warning"><span slot="label">Pending</span></andes-badge>
        <andes-badge standalone dot variant="danger"><span slot="label">Offline</span></andes-badge>
      </div>
    `,
  }),
};

export const OnIconButton: Story = {
  render: () => ({
    template: `
      <andes-badge [count]="8" variant="danger">
        <button style="width: 2.5rem; height: 2.5rem; border-radius: 9999px; border: 1px solid var(--andes-color-border); background: var(--andes-color-background);" aria-label="Notifications">🔔</button>
      </andes-badge>
    `,
  }),
};
