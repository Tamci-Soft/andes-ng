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
    // `checked` is a `model()`, which - unlike `size`'s plain `input()` - doesn't support a
    // `transform` (a two-way binding's output must emit exactly the type its input accepts),
    // so a bare, bracket-less attribute isn't coerced through `booleanAttribute`; bind the
    // literal with brackets instead (same fix `AndesCheckbox`'s stories needed).
    template: `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <andes-switch size="sm" [checked]="true" aria-label="Small, checked" />
        <andes-switch size="md" [checked]="true" aria-label="Medium, checked" />
      </div>
    `,
  }),
};

export const AllStates: Story = {
  render: () => ({
    // See the note on `AllSizes` above - `checked` needs a property binding, not a bare
    // attribute; `disabled`/`readonly` stay bare since they're still plain `input()`s with a
    // `booleanAttribute` transform.
    template: `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <andes-switch aria-label="Unchecked" />
        <andes-switch [checked]="true" aria-label="Checked" />
        <andes-switch disabled aria-label="Disabled, unchecked" />
        <andes-switch disabled [checked]="true" aria-label="Disabled, checked" />
        <andes-switch readonly [checked]="true" aria-label="Readonly, checked" />
      </div>
    `,
  }),
};
