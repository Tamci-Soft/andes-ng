import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesCheckbox } from './checkbox';

const meta: Meta<AndesCheckbox> = {
  title: 'Checkbox',
  component: AndesCheckbox,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    required: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    name: { control: 'text' },
    value: { control: 'text' },
  },
  args: {
    checked: false,
    disabled: false,
    indeterminate: false,
    required: false,
    readOnly: false,
  },
  render: (args) => ({
    props: args,
    template: `<andes-checkbox [checked]="checked" [disabled]="disabled" [indeterminate]="indeterminate" [required]="required" [readOnly]="readOnly" [name]="name" [value]="value">Accept terms and conditions</andes-checkbox>`,
  }),
};

export default meta;

type Story = StoryObj<AndesCheckbox>;

export const Unchecked: Story = {
  args: { checked: false },
};

export const Checked: Story = {
  args: { checked: true },
};

export const Indeterminate: Story = {
  args: { indeterminate: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { disabled: true, checked: true },
};

export const DisabledIndeterminate: Story = {
  args: { disabled: true, indeterminate: true },
};

export const ReadOnly: Story = {
  args: { readOnly: true, checked: true },
};

export const Invalid: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-checkbox [checked]="checked" aria-invalid="true">Accept terms and conditions</andes-checkbox>`,
  }),
};

export const WithoutLabel: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-checkbox [checked]="checked" aria-label="Select row" />`,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: { control: new FormControl(false, { nonNullable: true }) },
    template: `<andes-checkbox [formControl]="control">Subscribe to newsletter</andes-checkbox>`,
  }),
};

export const TemplateDrivenForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [FormsModule] },
    props: { value: false },
    template: `<andes-checkbox [(ngModel)]="value">Subscribe to newsletter</andes-checkbox>`,
  }),
};

export const AllStates: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <andes-checkbox>Unchecked</andes-checkbox>
        <andes-checkbox checked>Checked</andes-checkbox>
        <andes-checkbox indeterminate>Indeterminate</andes-checkbox>
        <andes-checkbox disabled>Disabled unchecked</andes-checkbox>
        <andes-checkbox disabled checked>Disabled checked</andes-checkbox>
        <andes-checkbox disabled indeterminate>Disabled indeterminate</andes-checkbox>
        <andes-checkbox readOnly checked>Read-only checked</andes-checkbox>
        <andes-checkbox aria-invalid="true">Invalid</andes-checkbox>
      </div>
    `,
  }),
};
