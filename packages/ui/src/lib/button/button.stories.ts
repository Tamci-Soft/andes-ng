import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import {
  AndesButton,
  type AndesButtonSize,
  type AndesButtonVariant,
} from './button';

interface ButtonStoryArgs {
  disabled: boolean;
  label: string;
  size: AndesButtonSize;
  variant: AndesButtonVariant;
}

const meta: Meta<ButtonStoryArgs> = {
  title: 'Components/Button',
  decorators: [moduleMetadata({ imports: [AndesButton] })],
  render: (args) => ({
    props: args,
    template: `
      <button
        andesButton
        type="button"
        [disabled]="disabled"
        [size]="size"
        [variant]="variant"
      >
        {{ label }}
      </button>
    `,
  }),
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    disabled: false,
    label: 'Guardar cambios',
    size: 'md',
    variant: 'primary',
  },
};

export default meta;
type Story = StoryObj<ButtonStoryArgs>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Danger: Story = { args: { variant: 'danger' } };
export const Disabled: Story = { args: { disabled: true } };

export const KeyboardFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole('button')).toHaveFocus();
  },
};
