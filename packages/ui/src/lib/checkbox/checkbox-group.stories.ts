import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesCheckbox } from './checkbox';
import { AndesCheckboxGroup } from './checkbox-group';
import { AndesCheckboxSelectAll } from './checkbox-select-all';
import { AndesCheckboxOptionLabel } from './checkbox-option-label';

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

const selectedText = `
  <p style="font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground); margin-top: 1rem;">
    Selected: {{ value.length ? value.join(', ') : 'none' }}
  </p>
`;

export const Options: Story = {
  name: 'Options (strings)',
  render: () => ({
    props: {
      options: ['Apple', 'Banana', 'Cherry'],
      value: ['Banana'] as readonly string[],
    },
    template: `
      <andes-checkbox-group aria-label="Fruits" [options]="options" [(value)]="value" />
      ${selectedText}
    `,
  }),
};

export const OptionObjects: Story = {
  name: 'Options (objects, disabled + title)',
  render: () => ({
    props: {
      options: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana', disabled: true, title: 'Sold out' },
        { label: 'Cherry', value: 'cherry' },
      ],
      value: [] as readonly string[],
    },
    template: `
      <andes-checkbox-group aria-label="Fruits" orientation="horizontal" [options]="options" [(value)]="value" />
      ${selectedText}
    `,
  }),
};

export const OptionsWithSelectAll: Story = {
  name: 'Options + select all',
  render: () => ({
    moduleMetadata: { imports: [AndesCheckbox, AndesCheckboxSelectAll] },
    props: {
      options: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana', disabled: true },
        { label: 'Cherry', value: 'cherry' },
      ],
      value: ['apple'] as readonly string[],
    },
    // Projected content renders before the options, so select-all sits on top.
    template: `
      <andes-checkbox-group aria-label="Fruits" [options]="options" [(value)]="value">
        <andes-checkbox andesSelectAll>Select all</andes-checkbox>
      </andes-checkbox-group>
      ${selectedText}
    `,
  }),
};

export const OptionLabelTemplate: Story = {
  name: 'Options with a label template',
  render: () => ({
    moduleMetadata: { imports: [AndesCheckboxOptionLabel] },
    props: {
      options: [
        { label: 'Starter', value: 'starter' },
        { label: 'Pro', value: 'pro' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
      value: [] as readonly string[],
    },
    template: `
      <andes-checkbox-group aria-label="Plans" [options]="options" [(value)]="value">
        <ng-template andesCheckboxOptionLabel let-option let-i="index">
          <strong>{{ option.label }}</strong>
          <span style="color: var(--andes-color-muted-foreground);"> - tier {{ i + 1 }}</span>
        </ng-template>
      </andes-checkbox-group>
      ${selectedText}
    `,
  }),
};

export const ChangeEvent: Story = {
  name: 'Change event + name',
  render: () => ({
    props: {
      options: ['Apple', 'Banana', 'Cherry'],
      value: [] as readonly string[],
      last: 'none yet',
    },
    // `(changed)` fires only for user changes, with the selected values array. `name` lands on
    // every rendered input, so a native form post sends `fruit=Apple&fruit=Cherry`.
    template: `
      <andes-checkbox-group
        aria-label="Fruits"
        name="fruit"
        [options]="options"
        [(value)]="value"
        (changed)="last = '[' + $event.join(', ') + ']'"
      />
      <p style="font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground); margin-top: 1rem;">
        Last change: {{ last }}
      </p>
    `,
  }),
};

export const SkipGroup: Story = {
  name: 'skipGroup',
  render: () => ({
    moduleMetadata: { imports: [AndesCheckbox, AndesCheckboxSelectAll] },
    props: { value: [] as readonly string[], notify: false },
    template: `
      <andes-checkbox-group aria-label="Fruits" [(value)]="value">
        <andes-checkbox andesSelectAll>Select all</andes-checkbox>
        <andes-checkbox value="apple">Apple</andes-checkbox>
        <andes-checkbox value="banana">Banana</andes-checkbox>
        <andes-checkbox value="notify" skipGroup [(checked)]="notify">Notify me about new fruit (not part of the group)</andes-checkbox>
      </andes-checkbox-group>
      <p style="font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground); margin-top: 1rem;">
        Selected: {{ value.length ? value.join(', ') : 'none' }} - notify: {{ notify }}
      </p>
    `,
  }),
};
