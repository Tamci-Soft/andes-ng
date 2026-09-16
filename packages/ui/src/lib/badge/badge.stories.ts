import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell } from '@ng-icons/lucide';
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
    size: { control: 'select', options: ['default', 'small'] },
    processing: { control: 'boolean' },
    title: { control: 'text' },
    standalone: { control: 'boolean' },
  },
  args: {
    count: 5,
    max: 99,
    dot: false,
    showZero: false,
    variant: 'danger',
    size: 'default',
    processing: false,
    standalone: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <andes-badge [count]="count" [max]="max" [dot]="dot" [showZero]="showZero" [variant]="variant" [size]="size" [processing]="processing" [title]="title" [standalone]="standalone">
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

export const Small: Story = {
  args: { count: 5, size: 'small' },
};

export const Processing: Story = {
  args: { dot: true, count: undefined, processing: true, variant: 'info' },
};

export const CustomOffset: Story = {
  render: () => ({
    template: `
      <andes-badge [count]="5" [offset]="[-4, 4]">
        <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div>
      </andes-badge>
    `,
  }),
};

export const WithTitleTooltip: Story = {
  args: { count: 12, title: '12 unread notifications' },
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

/**
 * Shape progression: one character is a true circle, two or more elongate into a pill - the
 * same convention Ant Design's and shadcn's count indicators follow.
 */
export const Shapes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 2.5rem; align-items: center;">
        <andes-badge [count]="5"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
        <andes-badge [count]="42"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
        <andes-badge [count]="150" [max]="99"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
        <andes-badge dot><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
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
    moduleMetadata: {
      imports: [NgIcon],
      providers: [provideIcons({ lucideBell })],
    },
    template: `
      <andes-badge [count]="8" variant="danger">
        <button
          style="display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 9999px; border: 1px solid var(--andes-color-border); background: var(--andes-color-background); color: var(--andes-color-foreground); cursor: pointer;"
          aria-label="Notifications"
        >
          <ng-icon name="lucideBell" style="width: 1.125rem; height: 1.125rem;" />
        </button>
      </andes-badge>
    `,
  }),
};
