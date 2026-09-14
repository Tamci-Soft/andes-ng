import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from './button';

const meta: Meta<AndesButton> = {
  title: 'Button',
  component: AndesButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'outline', 'ghost', 'link'],
    },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'icon-sm', 'icon', 'icon-lg'] },
    shape: { control: 'select', options: ['default', 'full'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    loadingDelay: { control: 'number' },
    fullWidth: { control: 'boolean' },
    href: { control: 'text' },
  },
  args: {
    variant: 'primary',
    size: 'md',
    shape: 'default',
    disabled: false,
    loading: false,
    loadingDelay: 0,
    fullWidth: false,
  },
  render: (args) => ({
    props: args,
    template: `<andes-button [variant]="variant" [size]="size" [shape]="shape" [disabled]="disabled" [loading]="loading" [loadingDelay]="loadingDelay" [fullWidth]="fullWidth" [href]="href">Save</andes-button>`,
  }),
};

export default meta;

type Story = StoryObj<AndesButton>;

export const Primary: Story = {
  args: { variant: 'primary' },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Danger: Story = {
  args: { variant: 'danger' },
};

export const Outline: Story = {
  args: { variant: 'outline' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const Link: Story = {
  args: { variant: 'link' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Loading: Story = {
  args: { loading: true },
};

export const Pill: Story = {
  args: { shape: 'full' },
};

export const FullWidth: Story = {
  args: { fullWidth: true },
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;"><andes-button [variant]="variant" [fullWidth]="fullWidth">Save</andes-button></div>`,
  }),
};

export const AsLink: Story = {
  args: { href: 'https://andes-ng.dev' },
};

export const WithIcons: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; gap: 1rem;">
        <andes-button [variant]="variant">
          <span slot="icon-start">←</span>
          Back
        </andes-button>
        <andes-button [variant]="variant">
          Next
          <span slot="icon-end">→</span>
        </andes-button>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <andes-button size="xs" [variant]="variant">Extra small</andes-button>
        <andes-button size="sm" [variant]="variant">Small</andes-button>
        <andes-button size="md" [variant]="variant">Medium</andes-button>
        <andes-button size="lg" [variant]="variant">Large</andes-button>
        <andes-button size="icon-sm" [variant]="variant">+</andes-button>
        <andes-button size="icon" [variant]="variant">+</andes-button>
        <andes-button size="icon-lg" [variant]="variant">+</andes-button>
      </div>
    `,
  }),
};

export const AllVariants: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <andes-button variant="primary">Primary</andes-button>
        <andes-button variant="secondary">Secondary</andes-button>
        <andes-button variant="danger">Danger</andes-button>
        <andes-button variant="outline">Outline</andes-button>
        <andes-button variant="ghost">Ghost</andes-button>
        <andes-button variant="link">Link</andes-button>
      </div>
    `,
  }),
};
