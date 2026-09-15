import type { Meta, StoryObj } from '@storybook/angular';

import { AndesTag } from './tag';

const meta: Meta<AndesTag> = {
  title: 'Tag',
  component: AndesTag,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'primary',
        'secondary',
        'success',
        'warning',
        'danger',
        'info',
        'outline',
      ],
    },
    bordered: { control: 'boolean' },
    disabled: { control: 'boolean' },
    closable: { control: 'boolean' },
    checkable: { control: 'boolean' },
    checked: { control: 'boolean' },
    clickable: { control: 'boolean' },
  },
  args: {
    variant: 'default',
    bordered: true,
    disabled: false,
    closable: false,
    checkable: false,
    checked: false,
    clickable: false,
  },
  render: (args) => ({
    props: args,
    template: `<andes-tag [variant]="variant" [bordered]="bordered" [disabled]="disabled" [closable]="closable" [checkable]="checkable" [checked]="checked" [clickable]="clickable">Tag</andes-tag>`,
  }),
};

export default meta;

type Story = StoryObj<AndesTag>;

export const Default: Story = {};

export const Borderless: Story = {
  args: { bordered: false },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Closable: Story = {
  args: { closable: true },
};

export const Checkable: Story = {
  args: { checkable: true },
};

export const CheckedByDefault: Story = {
  args: { checkable: true, checked: true },
};

export const Clickable: Story = {
  args: { clickable: true },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-tag variant="default">Default</andes-tag>
        <andes-tag variant="primary">Primary</andes-tag>
        <andes-tag variant="secondary">Secondary</andes-tag>
        <andes-tag variant="success">Success</andes-tag>
        <andes-tag variant="warning">Warning</andes-tag>
        <andes-tag variant="danger">Danger</andes-tag>
        <andes-tag variant="info">Info</andes-tag>
        <andes-tag variant="outline">Outline</andes-tag>
      </div>
    `,
  }),
};

export const ClosableList: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-tag variant="primary" closable>Angular</andes-tag>
        <andes-tag variant="success" closable>TypeScript</andes-tag>
        <andes-tag variant="info" closable>Storybook</andes-tag>
      </div>
    `,
  }),
};

export const CheckableGroup: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-tag checkable>Movies</andes-tag>
        <andes-tag checkable [checked]="true">Music</andes-tag>
        <andes-tag checkable>Books</andes-tag>
      </div>
    `,
  }),
};

export const WithIcon: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-tag [variant]="variant" closable>
        <span slot="icon">⭐</span>
        Starred
      </andes-tag>
    `,
  }),
};
