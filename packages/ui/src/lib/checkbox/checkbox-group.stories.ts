import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesCheckbox } from './checkbox';
import { AndesCheckboxGroup } from './checkbox-group';
import { AndesCheckboxSelectAll } from './checkbox-select-all';

const meta: Meta<AndesCheckboxGroup> = {
  title: 'CheckboxGroup',
  component: AndesCheckboxGroup,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
  },
  args: {
    disabled: false,
    orientation: 'vertical',
  },
  render: (args) => ({
    moduleMetadata: { imports: [AndesCheckbox, AndesCheckboxSelectAll] },
    props: args,
    template: `
      <andes-checkbox-group aria-label="Fruits" [disabled]="disabled" [orientation]="orientation">
        <andes-checkbox value="apple">Apple</andes-checkbox>
        <andes-checkbox value="banana">Banana</andes-checkbox>
        <andes-checkbox value="cherry">Cherry</andes-checkbox>
      </andes-checkbox-group>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesCheckboxGroup>;

export const Default: Story = {};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const Preselected: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesCheckbox] },
    props: { value: ['banana'] },
    template: `
      <andes-checkbox-group aria-label="Fruits" [(value)]="value">
        <andes-checkbox value="apple">Apple</andes-checkbox>
        <andes-checkbox value="banana">Banana</andes-checkbox>
        <andes-checkbox value="cherry">Cherry</andes-checkbox>
      </andes-checkbox-group>
    `,
  }),
};

export const SelectAll: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesCheckbox, AndesCheckboxSelectAll] },
    props: { value: [] as readonly string[] },
    template: `
      <andes-checkbox-group aria-label="Fruits" [(value)]="value">
        <andes-checkbox andesSelectAll>Select all</andes-checkbox>
        <andes-checkbox value="apple">Apple</andes-checkbox>
        <andes-checkbox value="banana">Banana</andes-checkbox>
        <andes-checkbox value="cherry">Cherry</andes-checkbox>
      </andes-checkbox-group>
      <p style="font-family: var(--andes-font-family), sans-serif; margin-top: 1rem;">
        Selected: {{ value.length ? value.join(', ') : 'none' }}
      </p>
    `,
  }),
};

export const SelectAllPartiallySelected: Story = {
  name: 'Select all (indeterminate)',
  render: () => ({
    moduleMetadata: { imports: [AndesCheckbox, AndesCheckboxSelectAll] },
    props: { value: ['apple'] as readonly string[] },
    template: `
      <andes-checkbox-group aria-label="Fruits" [(value)]="value">
        <andes-checkbox andesSelectAll>Select all</andes-checkbox>
        <andes-checkbox value="apple">Apple</andes-checkbox>
        <andes-checkbox value="banana">Banana</andes-checkbox>
        <andes-checkbox value="cherry">Cherry</andes-checkbox>
      </andes-checkbox-group>
    `,
  }),
};

export const WithDisabledItem: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesCheckbox, AndesCheckboxSelectAll] },
    props: { value: [] as readonly string[] },
    template: `
      <andes-checkbox-group aria-label="Fruits" [(value)]="value">
        <andes-checkbox andesSelectAll>Select all</andes-checkbox>
        <andes-checkbox value="apple">Apple</andes-checkbox>
        <andes-checkbox value="banana" disabled>Banana (unavailable)</andes-checkbox>
        <andes-checkbox value="cherry">Cherry</andes-checkbox>
      </andes-checkbox-group>
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesCheckbox, AndesCheckboxSelectAll, ReactiveFormsModule],
    },
    props: {
      control: new FormControl<readonly string[]>(['apple'], {
        nonNullable: true,
      }),
    },
    template: `
      <andes-checkbox-group aria-label="Fruits" [formControl]="control">
        <andes-checkbox andesSelectAll>Select all</andes-checkbox>
        <andes-checkbox value="apple">Apple</andes-checkbox>
        <andes-checkbox value="banana">Banana</andes-checkbox>
        <andes-checkbox value="cherry">Cherry</andes-checkbox>
      </andes-checkbox-group>
      <p style="font-family: var(--andes-font-family), sans-serif; margin-top: 1rem;">
        Control value: {{ control.value.join(', ') || 'none' }}
      </p>
    `,
  }),
};
