import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideClock } from '@ng-icons/lucide';
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
    color: { control: 'text' },
    processing: { control: 'boolean' },
    status: {
      control: 'select',
      options: [
        undefined,
        'success',
        'processing',
        'default',
        'error',
        'warning',
      ],
    },
    text: { control: 'text' },
    overflowCount: { control: 'number' },
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
      <andes-badge [count]="count" [max]="max" [overflowCount]="overflowCount" [dot]="dot" [showZero]="showZero" [variant]="variant" [color]="color" [size]="size" [processing]="processing" [status]="status" [text]="text" [title]="title" [standalone]="standalone">
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
 * same convention shadcn's count indicators follow.
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

/** `overflowCount` - an alias of `max` that wins when both are set. */
export const OverflowCountAlias: Story = {
  args: { count: 15, overflowCount: 9 },
};

/**
 * `status` + `text`: an inline status indicator. Implies `standalone` + `dot`;
 * `processing` pulses.
 */
export const Status: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-badge status="success" text="Success" />
        <andes-badge status="error" text="Error" />
        <andes-badge status="default" text="Default" />
        <andes-badge status="processing" text="Processing" />
        <andes-badge status="warning" text="Warning" />
      </div>
    `,
  }),
};

/** `text` also accepts a TemplateRef for rich labels. */
export const StatusTextTemplate: Story = {
  render: () => ({
    template: `
      <ng-template #label><strong>Deploying</strong> &middot; 3 of 5 pods</ng-template>
      <andes-badge status="processing" [text]="label" />
    `,
  }),
};

/**
 * `color`: preset names reuse the themed variants; any other CSS color is applied as-is with
 * black or white text, whichever contrasts more.
 */
export const Colors: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div style="display: flex; gap: 2rem; align-items: center;">
          <andes-badge [count]="7" color="primary"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
          <andes-badge [count]="7" color="#722ed1"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
          <andes-badge [count]="7" color="#fadb14"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
          <andes-badge [count]="42" color="hsl(180 70% 35%)"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
          <andes-badge [count]="120" color="lime"><div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div></andes-badge>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <andes-badge standalone dot color="#eb2f96" text="#eb2f96" />
          <andes-badge standalone dot color="rgb(250 140 22)" text="rgb(250 140 22)" />
          <andes-badge standalone dot color="rebeccapurple" text="rebeccapurple" />
        </div>
      </div>
    `,
  }),
};

/** `count` as a TemplateRef - a custom indicator (here an icon) instead of the count bubble. */
export const CustomCountTemplate: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [NgIcon],
      providers: [provideIcons({ lucideClock })],
    },
    template: `
      <ng-template #clock>
        <ng-icon name="lucideClock" style="width: 1rem; height: 1rem; color: var(--andes-color-danger-active); background: var(--andes-color-background); border-radius: 9999px;" />
      </ng-template>
      <andes-badge [count]="clock" title="Pending review">
        <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--andes-color-muted);"></div>
      </andes-badge>
    `,
  }),
};
