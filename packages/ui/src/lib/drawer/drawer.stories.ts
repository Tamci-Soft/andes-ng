import type { Meta, StoryObj } from '@storybook/angular';

import { AndesDrawer } from './drawer';
import { AndesDrawerClose } from './drawer-close';
import {
  AndesDrawerDescription,
  AndesDrawerFooter,
  AndesDrawerHeader,
  AndesDrawerTitle,
} from './drawer-parts';
import { AndesDrawerTrigger } from './drawer-trigger';

const meta: Meta<AndesDrawer> = {
  title: 'Drawer',
  component: AndesDrawer,
  tags: ['autodocs'],
  argTypes: {
    closeOnEscape: { control: 'boolean' },
    closeOnOutsideClick: { control: 'boolean' },
  },
  args: {
    closeOnEscape: true,
    closeOnOutsideClick: true,
  },
  render: (args) => ({
    moduleMetadata: {
      imports: [
        AndesDrawer,
        AndesDrawerTrigger,
        AndesDrawerHeader,
        AndesDrawerTitle,
        AndesDrawerDescription,
        AndesDrawerFooter,
        AndesDrawerClose,
      ],
    },
    props: args,
    template: `
      <andes-drawer [closeOnEscape]="closeOnEscape" [closeOnOutsideClick]="closeOnOutsideClick">
        <button type="button" andesDrawerTrigger>Open drawer</button>

        <andes-drawer-header>
          <andes-drawer-title>Move goal</andes-drawer-title>
          <andes-drawer-description>Set your daily activity goal.</andes-drawer-description>
        </andes-drawer-header>

        <div style="padding: 0 1rem; display: flex; align-items: center; justify-content: center; gap: 1rem;">
          <span style="font-size: 2rem; font-weight: 600;">350</span>
          <span style="color: var(--andes-color-muted-foreground);">calories/day</span>
        </div>

        <andes-drawer-footer>
          <button type="button" andesDrawerClose>Submit</button>
          <button type="button" andesDrawerClose>Cancel</button>
        </andes-drawer-footer>
      </andes-drawer>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesDrawer>;

export const Default: Story = {};

export const NoOutsideDismiss: Story = {
  args: { closeOnOutsideClick: false, closeOnEscape: false },
};
