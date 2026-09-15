import type { Meta, StoryObj } from '@storybook/angular';

import { AndesAlert } from './alert';

const meta: Meta<AndesAlert> = {
  title: 'Alert',
  component: AndesAlert,
  tags: ['autodocs'],
  argTypes: {
    severity: {
      control: 'select',
      options: ['success', 'info', 'warning', 'danger'],
    },
    closable: { control: 'boolean' },
    showIcon: { control: 'boolean' },
    role: { control: 'select', options: [undefined, 'alert', 'status'] },
    closeLabel: { control: 'text' },
  },
  args: {
    severity: 'info',
    closable: false,
    showIcon: true,
    closeLabel: 'Close',
  },
  render: (args) => ({
    props: args,
    template: `<andes-alert [severity]="severity" [closable]="closable" [showIcon]="showIcon" [closeLabel]="closeLabel">
      <span slot="title">Heads up</span>
      This is an alert message with some more detail underneath the title.
    </andes-alert>`,
  }),
};

export default meta;

type Story = StoryObj<AndesAlert>;

export const Success: Story = {
  args: { severity: 'success' },
};

export const Info: Story = {
  args: { severity: 'info' },
};

export const Warning: Story = {
  args: { severity: 'warning' },
};

export const Danger: Story = {
  args: { severity: 'danger' },
};

export const Closable: Story = {
  args: { closable: true },
};

export const WithoutIcon: Story = {
  args: { showIcon: false },
};

export const WithoutTitle: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-alert [severity]="severity" [closable]="closable" [showIcon]="showIcon">
      A description-only alert, with no title slot content projected.
    </andes-alert>`,
  }),
};

export const WithAction: Story = {
  args: { severity: 'warning' },
  render: (args) => ({
    props: args,
    template: `<andes-alert [severity]="severity" [closable]="closable" [showIcon]="showIcon">
      <span slot="title">Your plan expires soon</span>
      Renew before the end of the month to avoid any interruption.
      <button slot="action" type="button" style="all: unset; cursor: pointer; font-weight: 500; text-decoration: underline;">Renew now</button>
    </andes-alert>`,
  }),
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 32rem;">
        <andes-alert severity="success">
          <span slot="title">Success</span>
          Your changes have been saved.
        </andes-alert>
        <andes-alert severity="info">
          <span slot="title">Info</span>
          A new version of the app is available.
        </andes-alert>
        <andes-alert severity="warning">
          <span slot="title">Warning</span>
          Your session will expire in 5 minutes.
        </andes-alert>
        <andes-alert severity="danger">
          <span slot="title">Danger</span>
          Something went wrong while saving your changes.
        </andes-alert>
      </div>
    `,
  }),
};
