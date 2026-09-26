import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleX, lucideTag } from '@ng-icons/lucide';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesTag, AndesTagCloseEvent } from './tag';

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
    bordered: { control: 'boolean' },
    disabled: { control: 'boolean' },
    closable: { control: 'boolean' },
    hideOnClose: { control: 'boolean' },
    href: { control: 'text' },
    target: { control: 'text' },
    checkable: { control: 'boolean' },
    checked: { control: 'boolean' },
    clickable: { control: 'boolean' },
  },
  args: {
    color: 'default',
    variant: 'outlined',
    bordered: true,
    disabled: false,
    closable: false,
    hideOnClose: false,
    checkable: false,
    checked: false,
    clickable: false,
  },
  render: (args) => ({
    props: args,
    template: `<andes-tag [color]="color" [variant]="variant" [bordered]="bordered" [disabled]="disabled" [closable]="closable" [hideOnClose]="hideOnClose" [href]="href" [target]="target" [checkable]="checkable" [checked]="checked" [clickable]="clickable">Tag</andes-tag>`,
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

/**
 * Any CSS color works as `color`. Solid picks black or white text by the background's
 * luminance; outlined/filled keep the hue but clamp its lightness so the text stays readable
 * in both themes.
 */
export const CustomColors: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        @for (variant of ['outlined', 'filled', 'solid']; track variant) {
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <andes-tag color="#f50" [variant]="variant">#f50</andes-tag>
            <andes-tag color="#2db7f5" [variant]="variant">#2db7f5</andes-tag>
            <andes-tag color="#87d068" [variant]="variant">#87d068</andes-tag>
            <andes-tag color="#108ee9" [variant]="variant">#108ee9</andes-tag>
            <andes-tag color="#fadb14" [variant]="variant">#fadb14</andes-tag>
            <andes-tag color="rebeccapurple" [variant]="variant">rebeccapurple</andes-tag>
          </div>
        }
      </div>
    `,
  }),
};

/** `bordered=false` (Ant's `bordered={false}`) - same box size, no visible border. */
export const Borderless: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <andes-tag [bordered]="false">Default</andes-tag>
          <andes-tag [bordered]="false" color="primary" variant="filled">Primary</andes-tag>
          <andes-tag [bordered]="false" color="success" variant="filled">Success</andes-tag>
          <andes-tag [bordered]="false" color="danger" variant="filled">Danger</andes-tag>
          <andes-tag [bordered]="false" color="#722ed1" variant="filled">#722ed1</andes-tag>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <andes-tag color="primary" variant="filled">Bordered</andes-tag>
          <andes-tag [bordered]="false" color="primary" variant="filled" closable>Borderless closable</andes-tag>
        </div>
      </div>
    `,
  }),
};

/** `closeIcon` - a custom close-button template; setting it implies `closable`. */
export const CustomCloseIcon: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [NgIcon],
      providers: [provideIcons({ lucideCircleX })],
    },
    template: `
      <ng-template #closeIcon><ng-icon name="lucideCircleX" /></ng-template>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <andes-tag color="primary" [closeIcon]="closeIcon">Custom icon</andes-tag>
        <andes-tag color="danger" variant="filled" [closeIcon]="closeIcon" closeAriaLabel="Delete filter">Filter</andes-tag>
      </div>
    `,
  }),
};

/**
 * `hideOnClose` - uncontrolled mode: the tag hides itself after `closed`, unless the handler
 * calls `event.preventDefault()`. The second tag vetoes every close.
 */
export const HideOnClosePreventable: Story = {
  render: () => ({
    props: {
      veto: (event: AndesTagCloseEvent) => event.preventDefault(),
    },
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <andes-tag color="primary" closable hideOnClose>Closes itself</andes-tag>
        <andes-tag color="warning" closable hideOnClose (closed)="veto($event)">Vetoed - stays</andes-tag>
      </div>
    `,
  }),
};

/** The `slot=icon` leading icon in every rendering form (span, closable, link, checkable). */
export const IconInEveryForm: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [NgIcon],
      providers: [provideIcons({ lucideTag })],
    },
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-tag color="primary"><ng-icon slot="icon" name="lucideTag" />Static</andes-tag>
        <andes-tag color="success" closable><ng-icon slot="icon" name="lucideTag" />Closable</andes-tag>
        <andes-tag color="info" href="https://andes-ng.dev"><ng-icon slot="icon" name="lucideTag" />Link</andes-tag>
        <andes-tag checkable [checked]="true"><ng-icon slot="icon" name="lucideTag" />Checkable</andes-tag>
      </div>
    `,
  }),
};
