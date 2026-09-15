import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesRadio } from './radio';
import { AndesRadioGroup } from './radio-group';

const meta: Meta<AndesRadioGroup> = {
  title: 'RadioGroup',
  component: AndesRadioGroup,
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
  },
  args: {
    disabled: false,
    required: false,
    orientation: 'vertical',
  },
  render: (args) => ({
    moduleMetadata: { imports: [AndesRadio] },
    props: args,
    template: `
      <andes-radio-group aria-label="Plan" [name]="name" [disabled]="disabled" [required]="required" [orientation]="orientation">
        <andes-radio value="starter">Starter</andes-radio>
        <andes-radio value="pro">Pro</andes-radio>
        <andes-radio value="enterprise">Enterprise</andes-radio>
      </andes-radio-group>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesRadioGroup>;

export const Default: Story = {};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const Preselected: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio, FormsModule] },
    props: { value: 'pro' },
    template: `
      <andes-radio-group aria-label="Plan" [(ngModel)]="value">
        <andes-radio value="starter">Starter</andes-radio>
        <andes-radio value="pro">Pro</andes-radio>
        <andes-radio value="enterprise">Enterprise</andes-radio>
      </andes-radio-group>
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledItem: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesRadio] },
    props: args,
    template: `
      <andes-radio-group aria-label="Plan" [orientation]="orientation">
        <andes-radio value="starter">Starter</andes-radio>
        <andes-radio value="pro" disabled>Pro (sold out)</andes-radio>
        <andes-radio value="enterprise">Enterprise</andes-radio>
      </andes-radio-group>
    `,
  }),
};

export const Required: Story = {
  args: { required: true },
};

export const WithReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio, ReactiveFormsModule] },
    props: { control: new FormControl('pro') },
    template: `
      <andes-radio-group aria-label="Plan" [formControl]="control">
        <andes-radio value="starter">Starter</andes-radio>
        <andes-radio value="pro">Pro</andes-radio>
        <andes-radio value="enterprise">Enterprise</andes-radio>
      </andes-radio-group>
    `,
  }),
};

export const AllStates: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio] },
    template: `
      <div style="display: flex; gap: 3rem; flex-wrap: wrap;">
        <div>
          <p style="margin: 0 0 0.5rem;">Vertical</p>
          <andes-radio-group aria-label="Plan (vertical)">
            <andes-radio value="starter">Starter</andes-radio>
            <andes-radio value="pro">Pro</andes-radio>
            <andes-radio value="enterprise">Enterprise</andes-radio>
          </andes-radio-group>
        </div>
        <div>
          <p style="margin: 0 0 0.5rem;">Horizontal</p>
          <andes-radio-group aria-label="Plan (horizontal)" orientation="horizontal">
            <andes-radio value="starter">Starter</andes-radio>
            <andes-radio value="pro">Pro</andes-radio>
            <andes-radio value="enterprise">Enterprise</andes-radio>
          </andes-radio-group>
        </div>
        <div>
          <p style="margin: 0 0 0.5rem;">Disabled group</p>
          <andes-radio-group aria-label="Plan (disabled)" disabled>
            <andes-radio value="starter">Starter</andes-radio>
            <andes-radio value="pro">Pro</andes-radio>
          </andes-radio-group>
        </div>
        <div>
          <p style="margin: 0 0 0.5rem;">One disabled item</p>
          <andes-radio-group aria-label="Plan (one item disabled)">
            <andes-radio value="starter">Starter</andes-radio>
            <andes-radio value="pro" disabled>Pro (sold out)</andes-radio>
          </andes-radio-group>
        </div>
      </div>
    `,
  }),
};
