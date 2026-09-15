import { FormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesSwitch } from './switch';

const meta: Meta<AndesSwitch> = {
  title: 'Switch',
  component: AndesSwitch,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    readonly: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md'] },
  },
  args: {
    checked: false,
    disabled: false,
    required: false,
    readonly: false,
    size: 'md',
  },
  render: (args) => ({
    props: args,
    template: `<andes-switch [checked]="checked" [disabled]="disabled" [required]="required" [readonly]="readonly" [size]="size" aria-label="Toggle setting" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesSwitch>;

export const Unchecked: Story = {
  args: { checked: false },
};

export const Checked: Story = {
  args: { checked: true },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { disabled: true, checked: true },
};

export const Readonly: Story = {
  args: { readonly: true, checked: true },
};

export const Required: Story = {
  args: { required: true },
};

export const Invalid: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-switch [checked]="checked" aria-invalid="true" aria-label="Toggle setting" />`,
  }),
};

export const WithLabel: Story = {
  render: (args) => ({
    props: args,
    template: `
      <label style="display: inline-flex; align-items: center; gap: 0.5rem; font-family: system-ui, sans-serif;">
        <andes-switch [checked]="checked" [size]="size" />
        Enable notifications
      </label>
    `,
  }),
};

export const WithTrackContent: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-switch [checked]="checked" aria-label="Toggle setting">
        <span slot="checked">On</span>
        <span slot="unchecked">Off</span>
      </andes-switch>
    `,
  }),
};

export const ReactiveWithNgModel: Story = {
  render: () => ({
    moduleMetadata: { imports: [FormsModule] },
    props: { value: false },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; font-family: system-ui, sans-serif;">
        <andes-switch [(ngModel)]="value" aria-label="Toggle setting" />
        <span>Value: {{ value }}</span>
      </div>
    `,
  }),
};

export const AllSizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <andes-switch size="sm" checked aria-label="Small, checked" />
        <andes-switch size="md" checked aria-label="Medium, checked" />
      </div>
    `,
  }),
};

export const AllStates: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <andes-switch aria-label="Unchecked" />
        <andes-switch checked aria-label="Checked" />
        <andes-switch disabled aria-label="Disabled, unchecked" />
        <andes-switch disabled checked aria-label="Disabled, checked" />
        <andes-switch readonly checked aria-label="Readonly, checked" />
      </div>
    `,
  }),
};
