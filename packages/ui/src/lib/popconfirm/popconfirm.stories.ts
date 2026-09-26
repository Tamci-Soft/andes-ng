import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesPopconfirmTrigger } from '../popover/popover-trigger';
import { ANDES_POPOVER_PLACEMENTS } from '../popover/popover-types';
import { AndesPopconfirm } from './popconfirm';

const imports = [AndesButton, AndesPopconfirmTrigger];

const meta: Meta<AndesPopconfirm> = {
  title: 'Popconfirm',
  component: AndesPopconfirm,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    okText: { control: 'text' },
    cancelText: { control: 'text' },
    okType: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'outline', 'dashed', 'ghost'],
    },
    okDisabled: { control: 'boolean' },
    okLoading: { control: 'boolean' },
    showCancel: { control: 'boolean' },
    disabled: { control: 'boolean' },
    placement: {
      control: 'select',
      options: [undefined, ...Object.keys(ANDES_POPOVER_PLACEMENTS)],
    },
    showArrow: { control: 'boolean' },
  },
  args: {
    title: 'Delete the task',
    description: 'Are you sure to delete this task?',
    okText: 'OK',
    cancelText: 'Cancel',
    okType: 'primary',
    okDisabled: false,
    okLoading: false,
    showCancel: true,
    disabled: false,
    placement: undefined,
    showArrow: true,
  },
  render: (args) => ({
    moduleMetadata: { imports },
    props: { ...args, result: '' },
    template: `
      <div style="padding: 10rem 6rem 4rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <andes-popconfirm
          [title]="title"
          [description]="description"
          [okText]="okText"
          [cancelText]="cancelText"
          [okType]="okType"
          [okDisabled]="okDisabled"
          [okLoading]="okLoading"
          [showCancel]="showCancel"
          [disabled]="disabled"
          [placement]="placement"
          [showArrow]="showArrow"
          (confirm)="result = 'Confirmed'"
          (cancelled)="result = 'Cancelled'"
        >
          <andes-button variant="danger" andesPopconfirmTrigger>Delete</andes-button>
        </andes-popconfirm>
        <span role="status" style="min-height: 1.25rem; font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground);">{{ result }}</span>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesPopconfirm>;

export const Default: Story = {};

/** A destructive confirmation: danger OK button with its own label. */
export const Danger: Story = {
  args: { okType: 'danger', okText: 'Delete', cancelText: 'Keep it' },
};

export const TitleOnly: Story = {
  args: { description: undefined, title: 'Archive this project?' },
};

export const WithoutCancel: Story = {
  args: {
    showCancel: false,
    title: 'Got it?',
    description: 'This action only needs an acknowledgement.',
  },
};

export const OkDisabled: Story = {
  args: { okDisabled: true, description: 'You do not have permission.' },
};

/** `disabled` never opens the popconfirm. */
export const Disabled: Story = {
  args: { disabled: true },
};

/** `icon` takes a template; `null` removes it. */
export const CustomIcon: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="padding: 10rem 4rem 4rem; display: flex; gap: 2rem;">
        <andes-popconfirm title="Send the invoice?" description="The customer is emailed right away." [icon]="info" okText="Send">
          <andes-button variant="outline" andesPopconfirmTrigger>Custom icon</andes-button>
        </andes-popconfirm>
        <andes-popconfirm title="Leave without saving?" [icon]="null">
          <andes-button variant="outline" andesPopconfirmTrigger>No icon</andes-button>
        </andes-popconfirm>
        <ng-template #info>
          <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" fill-rule="evenodd" style="color: var(--andes-color-info);">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 5.75h1.5v5h-1.5v-5ZM8 3.75a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75Z" />
          </svg>
        </ng-template>
      </div>
    `,
  }),
};

/**
 * `onConfirm` returning a promise keeps OK loading and closes once it
 * resolves; a rejection leaves the popconfirm open.
 */
export const AsyncConfirm: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: {
      save: () => new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      fail: () =>
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Server said no')), 1500),
        ),
    },
    template: `
      <div style="padding: 10rem 4rem 4rem; display: flex; gap: 2rem;">
        <andes-popconfirm title="Publish now?" description="OK stays busy while the request runs." [onConfirm]="save" okText="Publish">
          <andes-button andesPopconfirmTrigger>Resolves in 1.5s</andes-button>
        </andes-popconfirm>
        <andes-popconfirm title="Publish now?" description="This request fails - the popconfirm stays open." [onConfirm]="fail" okText="Publish">
          <andes-button variant="outline" andesPopconfirmTrigger>Rejects in 1.5s</andes-button>
        </andes-popconfirm>
      </div>
    `,
  }),
};

/** Shares all twelve placements with Popover. */
export const Placements: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: { placements: Object.keys(ANDES_POPOVER_PLACEMENTS) },
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, 8rem); gap: 3rem; padding: 10rem 14rem;">
        @for (placement of placements; track placement) {
          <andes-popconfirm [placement]="placement" [title]="placement + '?'">
            <andes-button size="sm" variant="outline" andesPopconfirmTrigger>{{ placement }}</andes-button>
          </andes-popconfirm>
        }
      </div>
    `,
  }),
};

export const Controlled: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: { visible: false },
    template: `
      <div style="padding: 10rem 4rem 4rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <andes-button variant="outline" (click)="visible = !visible">Toggle from outside</andes-button>
        <andes-popconfirm title="Controlled" description="Driven by [(open)]." [(open)]="visible">
          <andes-button andesPopconfirmTrigger>Trigger</andes-button>
        </andes-popconfirm>
      </div>
    `,
  }),
};
