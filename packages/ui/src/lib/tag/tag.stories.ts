import type { Meta, StoryObj } from '@storybook/angular';

import { AndesTag } from './tag';

const meta: Meta<AndesTag> = {
  title: 'Tag',
  component: AndesTag,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: [
        'default',
        'primary',
        'secondary',
        'success',
        'warning',
        'danger',
        'info',
      ],
    },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'solid'],
    },
    disabled: { control: 'boolean' },
    closable: { control: 'boolean' },
    href: { control: 'text' },
    target: { control: 'text' },
    checkable: { control: 'boolean' },
    checked: { control: 'boolean' },
    clickable: { control: 'boolean' },
  },
  args: {
    color: 'default',
    variant: 'outlined',
    disabled: false,
    closable: false,
    checkable: false,
    checked: false,
    clickable: false,
  },
  render: (args) => ({
    props: args,
    template: `<andes-tag [color]="color" [variant]="variant" [disabled]="disabled" [closable]="closable" [href]="href" [target]="target" [checkable]="checkable" [checked]="checked" [clickable]="clickable">Tag</andes-tag>`,
  }),
};

export default meta;

type Story = StoryObj<AndesTag>;

export const Outlined: Story = {};

export const Filled: Story = {
  args: { color: 'primary', variant: 'filled' },
};

export const Solid: Story = {
  args: { color: 'primary', variant: 'solid' },
};

export const Disabled: Story = {
  args: { color: 'primary', disabled: true },
};

export const Closable: Story = {
  args: { color: 'primary', closable: true },
};

export const AsLink: Story = {
  args: { color: 'primary', href: 'https://andes-ng.dev' },
};

export const AsLinkNewTab: Story = {
  args: {
    color: 'primary',
    href: 'https://andes-ng.dev',
    target: '_blank',
  },
};

export const Checkable: Story = {
  args: { checkable: true },
};

export const CheckedByDefault: Story = {
  args: { checkable: true, checked: true },
};

export const Clickable: Story = {
  args: { color: 'primary', clickable: true },
};

export const AllColorsOutlined: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-tag color="default">Default</andes-tag>
        <andes-tag color="primary">Primary</andes-tag>
        <andes-tag color="secondary">Secondary</andes-tag>
        <andes-tag color="success">Success</andes-tag>
        <andes-tag color="warning">Warning</andes-tag>
        <andes-tag color="danger">Danger</andes-tag>
        <andes-tag color="info">Info</andes-tag>
      </div>
    `,
  }),
};

export const AllColorsFilled: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-tag color="default" variant="filled">Default</andes-tag>
        <andes-tag color="primary" variant="filled">Primary</andes-tag>
        <andes-tag color="secondary" variant="filled">Secondary</andes-tag>
        <andes-tag color="success" variant="filled">Success</andes-tag>
        <andes-tag color="warning" variant="filled">Warning</andes-tag>
        <andes-tag color="danger" variant="filled">Danger</andes-tag>
        <andes-tag color="info" variant="filled">Info</andes-tag>
      </div>
    `,
  }),
};

export const AllColorsSolid: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-tag color="default" variant="solid">Default</andes-tag>
        <andes-tag color="primary" variant="solid">Primary</andes-tag>
        <andes-tag color="secondary" variant="solid">Secondary</andes-tag>
        <andes-tag color="success" variant="solid">Success</andes-tag>
        <andes-tag color="warning" variant="solid">Warning</andes-tag>
        <andes-tag color="danger" variant="solid">Danger</andes-tag>
        <andes-tag color="info" variant="solid">Info</andes-tag>
      </div>
    `,
  }),
};

export const ClosableList: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-tag color="primary" closable>Angular</andes-tag>
        <andes-tag color="success" closable>TypeScript</andes-tag>
        <andes-tag color="info" closable>Storybook</andes-tag>
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
      <andes-tag [color]="color" [variant]="variant" closable>
        <span slot="icon">⭐</span>
        Starred
      </andes-tag>
    `,
  }),
};
