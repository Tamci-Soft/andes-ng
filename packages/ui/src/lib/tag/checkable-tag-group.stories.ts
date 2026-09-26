import type { Meta, StoryObj } from '@storybook/angular';

import { AndesCheckableTagGroup } from './checkable-tag-group';

const meta: Meta<AndesCheckableTagGroup> = {
  title: 'Tag/CheckableTagGroup',
  component: AndesCheckableTagGroup,
  tags: ['autodocs'],
  argTypes: {
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    options: [
      { value: 'movies', label: 'Movies' },
      { value: 'books', label: 'Books' },
      { value: 'music', label: 'Music' },
      { value: 'sports', label: 'Sports' },
    ],
    multiple: false,
    disabled: false,
    value: null,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-checkable-tag-group aria-label="Categories" [options]="options" [multiple]="multiple" [disabled]="disabled" [(value)]="value" />
        <small style="font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-muted-foreground);">value: {{ value === null ? 'null' : value }}</small>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesCheckableTagGroup>;

/** Single selection - clicking the selected tag clears it back to `null`, like Ant. */
export const Single: Story = {
  args: { value: 'books' },
};

export const Multiple: Story = {
  args: { multiple: true, value: ['movies', 'music'] },
};

/** Bare values are their own labels; per-option `disabled` is supported. */
export const PrimitiveAndDisabledOptions: Story = {
  args: {
    options: [
      'Angular',
      'React',
      { value: 'vue', label: 'Vue', disabled: true },
    ],
    multiple: true,
    value: ['Angular'],
  },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'music' },
};
