import { signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
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
    loading: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md'] },
    checkedChildren: { control: 'text' },
    unCheckedChildren: { control: 'text' },
  },
  args: {
    checked: false,
    disabled: false,
    required: false,
    readonly: false,
    loading: false,
    size: 'md',
    checkedChildren: '',
    unCheckedChildren: '',
  },
  render: (args) => ({
    props: args,
    template: `<andes-switch [checked]="checked" [disabled]="disabled" [required]="required" [readonly]="readonly" [loading]="loading" [size]="size" [checkedChildren]="checkedChildren" [unCheckedChildren]="unCheckedChildren" aria-label="Toggle setting" />`,
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

export const Loading: Story = {
  args: { loading: true },
};

export const LoadingChecked: Story = {
  args: { loading: true, checked: true },
};

export const LoadingAllSizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <andes-switch size="sm" loading aria-label="Small, loading" />
        <andes-switch size="sm" loading [checked]="true" aria-label="Small, loading, checked" />
        <andes-switch loading aria-label="Medium, loading" />
        <andes-switch loading [checked]="true" aria-label="Medium, loading, checked" />
      </div>
    `,
  }),
};

/**
 * The async-save pattern: the switch goes busy while a (fake) request runs, ignoring
 * further clicks, then settles. `[(checked)]` keeps the parent's state and the switch's in step.
 */
export const AsyncToggle: Story = {
  render: () => {
    // Signals, not plain props: the story is zoneless, so a setTimeout write to a plain field
    // would never be rendered.
    const busy = signal(false);
    return {
      props: {
        value: false,
        busy,
        save: () => {
          busy.set(true);
          setTimeout(() => busy.set(false), 1200);
        },
      },
      template: `
      <label style="display: inline-flex; align-items: center; gap: 0.5rem; font-family: system-ui, sans-serif;">
        <andes-switch [(checked)]="value" [loading]="busy()" (changed)="save()" />
        Sync to cloud ({{ busy() ? 'saving...' : value ? 'on' : 'off' }})
      </label>
    `,
    };
  },
};

export const TrackText: Story = {
  args: { checkedChildren: 'On', unCheckedChildren: 'Off', checked: true },
};

export const LongTrackText: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <andes-switch [checked]="true" checkedChildren="Enabled" unCheckedChildren="Disabled" aria-label="Feature, checked" />
        <andes-switch [checked]="false" checkedChildren="Enabled" unCheckedChildren="Disabled" aria-label="Feature, unchecked" />
        <andes-switch size="sm" [checked]="true" checkedChildren="Yes" unCheckedChildren="No" aria-label="Small, checked" />
        <andes-switch size="sm" [checked]="false" checkedChildren="Yes" unCheckedChildren="No" aria-label="Small, unchecked" />
      </div>
    `,
  }),
};

/** A projected `[slot=*]` element wins over the string input for that state. */
export const SlotOverridesText: Story = {
  render: () => ({
    template: `
      <andes-switch [checked]="true" checkedChildren="ignored" unCheckedChildren="Off" aria-label="Toggle setting">
        <span slot="checked">&#10003;</span>
      </andes-switch>
    `,
  }),
};

export const AutoFocus: Story = {
  render: () => ({
    template: `<andes-switch autoFocus aria-label="Focused on mount" />`,
  }),
};

export const FocusAndBlurMethods: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesButton] },
    template: `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <andes-switch #sw aria-label="Toggle setting" />
        <andes-button variant="outline" size="sm" (click)="sw.focus()">focus()</andes-button>
        <andes-button variant="outline" size="sm" (click)="sw.blur()">blur()</andes-button>
      </div>
    `,
  }),
};

export const Events: Story = {
  render: () => ({
    props: { value: false, log: [] as string[] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; font-family: system-ui, sans-serif;">
        <andes-switch
          [(checked)]="value"
          (changed)="log = ['changed: ' + $event.checked + ' (' + $event.event.type + ')'].concat(log)"
          (clicked)="log = ['clicked: ' + $event.checked].concat(log)"
          aria-label="Toggle setting"
        />
        @for (line of log; track $index) {
          <code>{{ line }}</code>
        }
      </div>
    `,
  }),
};
