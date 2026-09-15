import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesSheet } from './sheet';
import { AndesSheetClose } from './sheet-close';
import {
  AndesSheetDescription,
  AndesSheetFooter,
  AndesSheetHeader,
  AndesSheetTitle,
} from './sheet-parts';
import { AndesSheetTrigger } from './sheet-trigger';

const meta: Meta<AndesSheet> = {
  title: 'Sheet',
  component: AndesSheet,
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    closeOnEscape: { control: 'boolean' },
    closeOnOutsideClick: { control: 'boolean' },
  },
  args: {
    side: 'right',
    closeOnEscape: true,
    closeOnOutsideClick: true,
  },
  render: (args) => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesSheet,
        AndesSheetTrigger,
        AndesSheetHeader,
        AndesSheetTitle,
        AndesSheetDescription,
        AndesSheetFooter,
        AndesSheetClose,
      ],
    },
    props: args,
    template: `
      <andes-sheet [side]="side" [closeOnEscape]="closeOnEscape" [closeOnOutsideClick]="closeOnOutsideClick">
        <andes-button variant="primary" andesSheetTrigger>Open sheet</andes-button>

        <andes-sheet-header>
          <andes-sheet-title>Edit profile</andes-sheet-title>
          <andes-sheet-description>Make changes to your profile here. Click save when you're done.</andes-sheet-description>
        </andes-sheet-header>

        <div style="padding: 0 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <label style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem;">
            Name
            <input value="Jane Doe" style="padding: 0.5rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md);" />
          </label>
          <label style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem;">
            Username
            <input value="@janedoe" style="padding: 0.5rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md);" />
          </label>
        </div>

        <andes-sheet-footer>
          <andes-button variant="outline" andesSheetClose>Cancel</andes-button>
          <andes-button variant="primary" andesSheetClose>Save changes</andes-button>
        </andes-sheet-footer>
      </andes-sheet>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesSheet>;

export const Right: Story = {
  args: { side: 'right' },
};

export const Left: Story = {
  args: { side: 'left' },
};

export const Top: Story = {
  args: { side: 'top' },
};

export const Bottom: Story = {
  args: { side: 'bottom' },
};

export const NoOutsideDismiss: Story = {
  args: { closeOnOutsideClick: false, closeOnEscape: false },
};
