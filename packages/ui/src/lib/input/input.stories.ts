import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesInput } from './input';

const meta: Meta<AndesInput> = {
  title: 'Input',
  component: AndesInput,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    clearable: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
  args: {
    type: 'text',
    size: 'md',
    disabled: false,
    required: false,
    readOnly: false,
    clearable: false,
    placeholder: 'Enter some text…',
  },
  render: (args) => ({
    props: args,
    template: `<andes-input [type]="type" [size]="size" [disabled]="disabled" [required]="required" [readOnly]="readOnly" [clearable]="clearable" [placeholder]="placeholder" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesInput>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input size="sm" placeholder="Small" />
        <andes-input size="md" placeholder="Medium" />
        <andes-input size="lg" placeholder="Large" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled' },
};

export const ReadOnly: Story = {
  render: () => ({
    moduleMetadata: { imports: [FormsModule] },
    // Bound under a name distinct from AndesInput's own internal `value` field -
    // Storybook's Angular renderer forwards story props onto any matching
    // property of a `meta.component` instance it finds in the rendered tree.
    props: { readOnlyValue: 'Read-only value' },
    template: `<andes-input readOnly [(ngModel)]="readOnlyValue" placeholder="Read-only" />`,
  }),
};

export const Required: Story = {
  args: { required: true, placeholder: 'Required field' },
};

export const Invalid: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.375rem; width: 20rem;">
        <label for="invalid-email" style="font-size: 0.875rem; font-weight: 500;">Email address</label>
        <andes-input id="invalid-email" type="email" aria-invalid="true" aria-describedby="email-error" placeholder="you@example.com" />
        <span id="email-error" style="color: var(--andes-color-danger); font-size: 0.875rem;">
          Please enter a valid email address.
        </span>
      </div>
    `,
  }),
};

export const Clearable: Story = {
  render: () => ({
    moduleMetadata: { imports: [FormsModule] },
    // Bound under a name distinct from AndesInput's own internal `value` field -
    // Storybook's Angular renderer forwards story props onto any matching
    // property of a `meta.component` instance it finds in the rendered tree.
    props: { clearableValue: 'Clear me' },
    template: `<andes-input clearable [(ngModel)]="clearableValue" placeholder="Clearable" />`,
  }),
};

export const WithPrefixAndSuffix: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input placeholder="0.00">
          <span slot="prefix">$</span>
          <span slot="suffix">USD</span>
        </andes-input>
        <andes-input type="url" placeholder="andes-ng.dev">
          <span slot="prefix">https://</span>
        </andes-input>
      </div>
    `,
  }),
};

export const Types: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input type="text" placeholder="Text" />
        <andes-input type="email" placeholder="Email" />
        <andes-input type="password" placeholder="Password" />
        <andes-input type="number" placeholder="Number" />
        <andes-input type="search" placeholder="Search" clearable />
        <andes-input type="tel" placeholder="Phone" />
        <andes-input type="url" placeholder="URL" />
      </div>
    `,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: { control: new FormControl('Bound via FormControl') },
    template: `<andes-input [formControl]="control" placeholder="Reactive form" />`,
  }),
};
