import type { Meta, StoryObj } from '@storybook/angular';

import { AndesTabs } from './tabs';
import { AndesTabsContent } from './tabs-content';
import { AndesTabsList } from './tabs-list';
import { AndesTabsTrigger } from './tabs-trigger';

const meta: Meta<AndesTabs> = {
  title: 'Tabs',
  component: AndesTabs,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    activationMode: { control: 'select', options: ['automatic', 'manual'] },
  },
  args: {
    orientation: 'horizontal',
    activationMode: 'automatic',
  },
  render: (args) => ({
    moduleMetadata: {
      imports: [AndesTabsList, AndesTabsTrigger, AndesTabsContent],
    },
    props: args,
    template: `
      <andes-tabs [orientation]="orientation" [activationMode]="activationMode" style="max-width: 32rem; display: block;">
        <andes-tabs-list>
          <andes-tabs-trigger value="account">Account</andes-tabs-trigger>
          <andes-tabs-trigger value="password">Password</andes-tabs-trigger>
          <andes-tabs-trigger value="team" disabled>Team (disabled)</andes-tabs-trigger>
        </andes-tabs-list>
        <andes-tabs-content value="account">
          <p>Update your account details here.</p>
        </andes-tabs-content>
        <andes-tabs-content value="password">
          <p>Change your password here.</p>
        </andes-tabs-content>
        <andes-tabs-content value="team">
          <p>Manage your team here.</p>
        </andes-tabs-content>
      </andes-tabs>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesTabs>;

export const Default: Story = {};

export const ManualActivation: Story = {
  args: { activationMode: 'manual' },
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => ({
    moduleMetadata: {
      imports: [AndesTabsList, AndesTabsTrigger, AndesTabsContent],
    },
    props: args,
    template: `
      <andes-tabs [orientation]="orientation" [activationMode]="activationMode" style="max-width: 32rem; display: flex; gap: 1.5rem;">
        <andes-tabs-list>
          <andes-tabs-trigger value="account">Account</andes-tabs-trigger>
          <andes-tabs-trigger value="password">Password</andes-tabs-trigger>
          <andes-tabs-trigger value="team" disabled>Team (disabled)</andes-tabs-trigger>
        </andes-tabs-list>
        <div>
          <andes-tabs-content value="account">
            <p>Update your account details here.</p>
          </andes-tabs-content>
          <andes-tabs-content value="password">
            <p>Change your password here.</p>
          </andes-tabs-content>
          <andes-tabs-content value="team">
            <p>Manage your team here.</p>
          </andes-tabs-content>
        </div>
      </andes-tabs>
    `,
  }),
};

export const ControlledValue: Story = {
  render: () => ({
    template: `
      <p>Use the args table's controls to switch orientation/activationMode; this story shows binding <code>[(value)]</code> from the consumer.</p>
      <andes-tabs value="password" style="max-width: 32rem; display: block;">
        <andes-tabs-list>
          <andes-tabs-trigger value="account">Account</andes-tabs-trigger>
          <andes-tabs-trigger value="password">Password</andes-tabs-trigger>
        </andes-tabs-list>
        <andes-tabs-content value="account">
          <p>Update your account details here.</p>
        </andes-tabs-content>
        <andes-tabs-content value="password">
          <p>Change your password here. Starts active via the initial value binding.</p>
        </andes-tabs-content>
      </andes-tabs>
    `,
  }),
};
