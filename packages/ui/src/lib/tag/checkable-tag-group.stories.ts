import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBook,
  lucideFilm,
  lucideMusic,
  lucideTrophy,
} from '@ng-icons/lucide';
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

/** Single selection - clicking the selected tag clears it back to `null`. */
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

/**
 * Options can carry an `icon` template (passed to each tag's `icon` input) and a `className`
 * for the tag host. Binding `[value]` one-way only seeds the initial selection.
 */
export const WithIcons: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [NgIcon],
      providers: [
        provideIcons({ lucideFilm, lucideBook, lucideMusic, lucideTrophy }),
      ],
    },
    template: `
      <ng-template #film><ng-icon name="lucideFilm" /></ng-template>
      <ng-template #book><ng-icon name="lucideBook" /></ng-template>
      <ng-template #music><ng-icon name="lucideMusic" /></ng-template>
      <ng-template #trophy><ng-icon name="lucideTrophy" /></ng-template>
      <andes-checkable-tag-group
        aria-label="Categories"
        multiple
        [value]="['books']"
        [options]="[
          { value: 'movies', label: 'Movies', icon: film },
          { value: 'books', label: 'Books', icon: book },
          { value: 'music', label: 'Music', icon: music },
          { value: 'sports', label: 'Sports', icon: trophy, disabled: true },
        ]"
      />
    `,
  }),
};
