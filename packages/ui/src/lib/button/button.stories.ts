import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideSearch } from '@ng-icons/lucide';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from './button';
import { AndesButtonGroup } from './button-group';

const extraIcons = provideIcons({ lucideChevronDown, lucideSearch });

const meta: Meta<AndesButton> = {
  title: 'Button',
  component: AndesButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'danger',
        'outline',
        'dashed',
        'filled',
        'ghost',
        'link',
      ],
    },
    color: {
      control: 'select',
      options: [undefined, 'primary', 'danger', 'success', 'warning', 'info'],
    },
    danger: { control: 'boolean' },
    ripple: { control: 'boolean' },
    size: {
      control: 'select',
      options: [
        'xs',
        'sm',
        'md',
        'lg',
        'icon-xs',
        'icon-sm',
        'icon',
        'icon-lg',
      ],
    },
    shape: {
      control: 'select',
      options: ['default', 'full', 'round', 'circle'],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    loadingDelay: { control: 'number' },
    fullWidth: { control: 'boolean' },
    href: { control: 'text' },
    target: { control: 'text' },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
    ghost: { control: 'boolean' },
  },
  args: {
    variant: 'primary',
    size: 'md',
    shape: 'default',
    disabled: false,
    loading: false,
    loadingDelay: 0,
    fullWidth: false,
    type: 'button',
    ghost: false,
    danger: false,
    ripple: true,
  },
  render: (args) => ({
    props: args,
    template: `<andes-button [variant]="variant" [size]="size" [shape]="shape" [disabled]="disabled" [loading]="loading" [loadingDelay]="loadingDelay" [fullWidth]="fullWidth" [href]="href" [target]="target" [type]="type" [ghost]="ghost" [color]="color" [danger]="danger" [ripple]="ripple">Save</andes-button>`,
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

export const Dashed: Story = {
  args: { variant: 'dashed' },
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

export const Invalid: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-button [variant]="variant" [size]="size" aria-invalid="true">Save</andes-button>`,
  }),
};

export const Loading: Story = {
  args: { loading: true },
};

/**
 * The spinner is exactly the size of the icon it replaces, so switching `loading` on and off
 * never resizes the button. Each pair below is the same button with loading off, then on.
 */
export const LoadingKeepsSize: Story = {
  render: () => ({
    moduleMetadata: { imports: [NgIcon], providers: [extraIcons] },
    props: {
      sizes: ['xs', 'sm', 'md', 'lg'],
      iconSizes: ['icon-xs', 'icon-sm', 'icon', 'icon-lg'],
      states: [false, true],
      variants: [
        'primary',
        'secondary',
        'danger',
        'outline',
        'dashed',
        'filled',
        'ghost',
      ],
      colors: [undefined, 'primary', 'danger', 'success', 'warning', 'info'],
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        @for (size of sizes; track size) {
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            @for (on of states; track on) {
              <andes-button [size]="size" [loading]="on" [attr.data-case]="size + '-icon-' + on"><ng-icon slot="icon-start" name="lucideSearch" />Search</andes-button>
            }
            @for (on of states; track on) {
              <andes-button [size]="size" variant="outline" [loading]="on" [attr.data-case]="size + '-icon-outline-' + on"><ng-icon slot="icon-start" name="lucideSearch" />Search</andes-button>
            }
            @for (on of states; track on) {
              <andes-button [size]="size" [loading]="on" [attr.data-case]="size + '-text-' + on">Save</andes-button>
            }
          </div>
        }
        @for (size of iconSizes; track size) {
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            @for (on of states; track on) {
              <andes-button [size]="size" [loading]="on" aria-label="Search" [attr.data-case]="size + '-' + on"><ng-icon name="lucideSearch" /></andes-button>
            }
            @for (on of states; track on) {
              <andes-button [size]="size" shape="circle" variant="outline" [loading]="on" aria-label="Search" [attr.data-case]="size + '-circle-' + on"><ng-icon name="lucideSearch" /></andes-button>
            }
          </div>
        }
        <div style="display: grid; grid-template-columns: repeat(7, max-content); gap: 0.5rem;">
          @for (color of colors; track $index) {
            @for (variant of variants; track variant) {
              <span style="display: inline-flex; gap: 0.25rem;">
                @for (on of states; track on) {
                  <andes-button [variant]="variant" [color]="color" [loading]="on" [attr.data-case]="'v-' + variant + '-' + (color ?? 'none') + '-' + on"><ng-icon slot="icon-start" name="lucideSearch" />Go</andes-button>
                }
              </span>
            }
          }
        </div>
      </div>
    `,
  }),
};

export const CustomLoadingIcon: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [NgIcon] },
    props: args,
    template: `
      <ng-template #spinningLoader>
        <ng-icon name="lucideLoaderCircle" class="spinning-loader" />
      </ng-template>
      <andes-button [variant]="variant" [loading]="true" [loadingIcon]="spinningLoader">Save</andes-button>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinning-loader ::ng-deep svg { animation: spin 0.8s linear infinite; }
      </style>
    `,
  }),
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

export const AsLinkNewTab: Story = {
  args: { href: 'https://andes-ng.dev', target: '_blank' },
};

export const Submit: Story = {
  args: { type: 'submit' },
};

export const GhostMode: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; gap: 1rem; padding: 2rem; background: #0f172a;">
        <andes-button variant="primary" ghost>Primary</andes-button>
        <andes-button variant="secondary" ghost>Secondary</andes-button>
        <andes-button variant="danger" ghost>Danger</andes-button>
      </div>
    `,
  }),
};

export const WithIcons: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [NgIcon] },
    props: args,
    template: `
      <div style="display: flex; gap: 1rem;">
        <andes-button [variant]="variant">
          <ng-icon slot="icon-start" name="lucideArrowLeft" />
          Back
        </andes-button>
        <andes-button [variant]="variant">
          Next
          <ng-icon slot="icon-end" name="lucideArrowRight" />
        </andes-button>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [NgIcon] },
    props: args,
    template: `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <andes-button size="xs" [variant]="variant">Extra small</andes-button>
        <andes-button size="sm" [variant]="variant">Small</andes-button>
        <andes-button size="md" [variant]="variant">Medium</andes-button>
        <andes-button size="lg" [variant]="variant">Large</andes-button>
        <andes-button size="icon-xs" [variant]="variant" aria-label="Add (extra small)"><ng-icon name="lucidePlus" /></andes-button>
        <andes-button size="icon-sm" [variant]="variant" aria-label="Add (small)"><ng-icon name="lucidePlus" /></andes-button>
        <andes-button size="icon" [variant]="variant" aria-label="Add"><ng-icon name="lucidePlus" /></andes-button>
        <andes-button size="icon-lg" [variant]="variant" aria-label="Add (large)"><ng-icon name="lucidePlus" /></andes-button>
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
        <andes-button variant="dashed">Dashed</andes-button>
        <andes-button variant="ghost">Ghost</andes-button>
        <andes-button variant="link">Link</andes-button>
      </div>
    `,
  }),
};

export const Filled: Story = {
  args: { variant: 'filled' },
};

/** `color` tints every variant except `secondary` and `danger`, which keep their palette. */
export const ColorsAndVariants: Story = {
  render: () => ({
    props: {
      colors: [undefined, 'primary', 'danger', 'success', 'warning', 'info'],
      variants: ['primary', 'outline', 'dashed', 'filled', 'ghost', 'link'],
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(6, max-content); gap: 0.75rem;">
        @for (color of colors; track $index) {
          @for (variant of variants; track variant) {
            <andes-button [variant]="variant" [color]="color">{{ color ?? 'default' }}</andes-button>
          }
        }
      </div>
    `,
  }),
};

/** `danger` marks a destructive action without leaving the variant the layout calls for. */
export const DangerInEveryVariant: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-button danger>Delete</andes-button>
        <andes-button variant="outline" danger>Delete</andes-button>
        <andes-button variant="dashed" danger>Delete</andes-button>
        <andes-button variant="filled" danger>Delete</andes-button>
        <andes-button variant="ghost" danger>Delete</andes-button>
        <andes-button variant="link" danger>Delete</andes-button>
      </div>
      <div style="display: flex; gap: 0.75rem; padding: 1.5rem; margin-top: 1rem; background: #0f172a;">
        <andes-button ghost>Primary</andes-button>
        <andes-button ghost danger>Delete</andes-button>
        <andes-button ghost color="success">Approve</andes-button>
      </div>
    `,
  }),
};

export const Shapes: Story = {
  render: () => ({
    moduleMetadata: { imports: [NgIcon], providers: [extraIcons] },
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <andes-button shape="default">Default</andes-button>
        <andes-button shape="round">Round</andes-button>
        <andes-button shape="circle" size="icon" aria-label="Search"><ng-icon name="lucideSearch" /></andes-button>
        <andes-button shape="circle" variant="outline" size="icon" aria-label="Search"><ng-icon name="lucideSearch" /></andes-button>
        <andes-button shape="circle" variant="outline">A</andes-button>
        <andes-button shape="circle" size="lg" variant="dashed" aria-label="Add"><ng-icon name="lucidePlus" /></andes-button>
      </div>
    `,
  }),
};

export const WithoutRipple: Story = {
  args: { ripple: false },
};

/** Adjacent buttons joined into one segmented control; the group's size reaches every button. */
export const Group: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesButtonGroup, NgIcon],
      providers: [extraIcons],
    },
    template: `
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 1rem;">
        <andes-button-group aria-label="Pages">
          <andes-button variant="outline"><ng-icon slot="icon-start" name="lucideArrowLeft" />Previous</andes-button>
          <andes-button variant="outline">Today</andes-button>
          <andes-button variant="outline">Next<ng-icon slot="icon-end" name="lucideArrowRight" /></andes-button>
        </andes-button-group>
        <andes-button-group size="sm" aria-label="Alignment">
          <andes-button variant="outline">Left</andes-button>
          <andes-button variant="outline">Center</andes-button>
          <andes-button variant="outline">Right</andes-button>
        </andes-button-group>
        <andes-button-group size="lg" aria-label="Actions">
          <andes-button>Save</andes-button>
          <andes-button>Save and close</andes-button>
        </andes-button-group>
      </div>
    `,
  }),
};

/** A primary action with a joined icon button for the secondary choices. */
export const SplitButton: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesButtonGroup, NgIcon],
      providers: [extraIcons],
    },
    template: `
      <div style="display: flex; gap: 1rem;">
        <andes-button-group aria-label="Post invoice">
          <andes-button>Post invoice</andes-button>
          <andes-button size="icon" aria-label="More posting options"><ng-icon name="lucideChevronDown" /></andes-button>
        </andes-button-group>
        <andes-button-group aria-label="Export">
          <andes-button variant="outline">Export</andes-button>
          <andes-button variant="outline" size="icon" aria-label="More export formats"><ng-icon name="lucideChevronDown" /></andes-button>
        </andes-button-group>
      </div>
    `,
  }),
};

export const VerticalGroup: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesButtonGroup] },
    template: `
      <andes-button-group orientation="vertical" aria-label="Record actions" style="width: 180px;">
        <andes-button variant="outline">Duplicate</andes-button>
        <andes-button variant="outline">Archive</andes-button>
        <andes-button variant="outline" danger>Delete</andes-button>
      </andes-button-group>
    `,
  }),
};
