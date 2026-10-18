import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesResult } from './result';

const meta: Meta<AndesResult> = {
  title: 'Result',
  component: AndesResult,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesButton] })],
  parameters: { layout: 'padded' },
  argTypes: {
    status: {
      control: 'select',
      options: [
        'success',
        'error',
        'info',
        'warning',
        'processing',
        '403',
        '404',
        '500',
      ],
    },
    title: { control: 'text' },
    subTitle: { control: 'text' },
    icon: { control: false },
    role: { control: 'select', options: [undefined, 'alert', 'status'] },
    titleLevel: { control: 'inline-radio', options: [1, 2, 3, 4, 5, 6] },
    compact: { control: 'boolean' },
  },
  args: {
    status: 'success',
    title: 'Payment received',
    subTitle:
      'Invoice F001-000123 was paid in full. A receipt is on its way to the customer.',
    titleLevel: 2,
    compact: false,
  },
  render: (args) => ({
    props: args,
    template: `<andes-result [status]="status" [title]="title" [subTitle]="subTitle" [role]="role" [titleLevel]="titleLevel" [compact]="compact">
      <span slot="extra">
        <andes-button size="sm">View invoice</andes-button>
        <andes-button size="sm" variant="outline">Create another</andes-button>
      </span>
    </andes-result>`,
  }),
};

export default meta;
type Story = StoryObj<AndesResult>;

export const Success: Story = {};

export const Error: Story = {
  args: {
    status: 'error',
    title: 'Submission failed',
    subTitle:
      'The tax authority service did not accept the document. Review the details below and try again.',
  },
  render: (args) => ({
    props: args,
    template: `<andes-result [status]="status" [title]="title" [subTitle]="subTitle" [compact]="compact">
      <span slot="extra">
        <andes-button size="sm">Try again</andes-button>
        <andes-button size="sm" variant="outline">Contact support</andes-button>
      </span>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <strong>Details</strong>
        <div>Error 2335: the document number was already used.</div>
        <div>Series F001 must be sequential. Last accepted number: 000122.</div>
      </div>
    </andes-result>`,
  }),
};

export const Info: Story = {
  args: {
    status: 'info',
    title: 'Your import is queued',
    subTitle: 'We will email you when the 1,240 rows have been processed.',
  },
};

export const Warning: Story = {
  args: {
    status: 'warning',
    title: 'Some rows need your attention',
    subTitle: '12 of 1,240 rows were skipped because the tax id is missing.',
  },
};

/** A calm spinner for work that is still running; the sub title carries the live detail. */
export const Processing: Story = {
  args: {
    status: 'processing',
    title: 'Closing the period',
    subTitle:
      'This usually takes under a minute. You can leave this page; we will keep going.',
  },
  render: (args) => ({
    props: args,
    template: `<andes-result [status]="status" [title]="title" [subTitle]="subTitle">
      <span slot="extra"><andes-button size="sm" variant="outline">Run in background</andes-button></span>
    </andes-result>`,
  }),
};

export const Forbidden: Story = {
  args: {
    status: '403',
    title: '403',
    subTitle: 'You do not have permission to open the payroll module.',
  },
  render: (args) => ({
    props: args,
    template: `<andes-result [status]="status" [title]="title" [subTitle]="subTitle">
      <span slot="extra"><andes-button size="sm">Back to dashboard</andes-button></span>
    </andes-result>`,
  }),
};

export const NotFound: Story = {
  args: {
    status: '404',
    title: '404',
    subTitle: 'The page you are looking for does not exist or was moved.',
  },
  render: Forbidden.render,
};

export const ServerError: Story = {
  args: {
    status: '500',
    title: '500',
    subTitle:
      'Something went wrong on our side. Please try again in a few minutes.',
  },
  render: (args) => ({
    props: args,
    template: `<andes-result [status]="status" [title]="title" [subTitle]="subTitle">
      <span slot="extra">
        <andes-button size="sm">Reload</andes-button>
        <andes-button size="sm" variant="outline">Report a problem</andes-button>
      </span>
    </andes-result>`,
  }),
};

/** The built-in glyph is replaced through the `icon` template; it receives the status. */
export const CustomIcon: Story = {
  args: {
    status: 'success',
    title: 'Welcome aboard',
    subTitle: 'Your workspace is ready.',
  },
  render: (args) => ({
    props: args,
    template: `
      <ng-template #rocket let-status>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--andes-color-primary);">
          <path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1Z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2Z" />
          <path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0" />
          <path d="M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5" />
        </svg>
      </ng-template>
      <andes-result [status]="status" [title]="title" [subTitle]="subTitle" [icon]="rocket">
        <span slot="extra"><andes-button size="sm">Get started</andes-button></span>
      </andes-result>`,
  }),
};

/** Title and sub title can be templates when plain text is not enough. */
export const RichTitle: Story = {
  render: () => ({
    template: `
      <ng-template #title let-status><span>Order <code>#2024-118</code> placed</span></ng-template>
      <ng-template #sub><span>Paid with the card ending in <strong>4242</strong>.</span></ng-template>
      <andes-result status="success" [title]="title" [subTitle]="sub" />`,
  }),
};

/** Slots instead of inputs, for markup that needs its own elements. */
export const Slots: Story = {
  render: () => ({
    template: `<andes-result status="info">
      <span slot="title">Scheduled for <time datetime="2026-10-20">20 October</time></span>
      <span slot="subtitle">The report will be generated overnight and sent to finance@example.com.</span>
      <span slot="extra"><andes-button size="sm" variant="outline">Change schedule</andes-button></span>
    </andes-result>`,
  }),
};

/** Tighter padding for a result inside a card or a drawer. */
export const Compact: Story = {
  args: {
    compact: true,
    status: 'success',
    title: 'Saved',
    subTitle: 'Your changes are live.',
  },
  render: (args) => ({
    props: args,
    template: `<div style="max-width: 24rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-lg);">
      <andes-result [status]="status" [title]="title" [subTitle]="subTitle" [compact]="compact" />
    </div>`,
  }),
};

export const AllStatuses: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    props: {
      items: [
        ['success', 'Success', 'Everything went through.'],
        ['error', 'Error', 'The request could not be completed.'],
        ['info', 'Info', 'There is something to know.'],
        ['warning', 'Warning', 'Check this before you continue.'],
        ['processing', 'Processing', 'Working on it.'],
        ['403', '403', 'No access to this page.'],
        ['404', '404', 'Page not found.'],
        ['500', '500', 'Server error.'],
      ],
    },
    template: `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1rem; padding: 1rem;">
      @for (item of items; track item[0]) {
        <div style="border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-lg);">
          <andes-result [status]="item[0]" [title]="item[1]" [subTitle]="item[2]" [compact]="true" titleLevel="3" />
        </div>
      }
    </div>`,
  }),
};
