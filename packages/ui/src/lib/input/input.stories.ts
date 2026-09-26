import { signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesInput } from './input';
import { AndesInputOtp } from './input-otp';
import { AndesInputPassword } from './input-password';
import { AndesInputSearch } from './input-search';

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
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless', 'underlined'],
    },
    status: { control: 'select', options: [undefined, 'error', 'warning'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    clearable: { control: 'boolean' },
    showCount: { control: 'boolean' },
    maxLength: { control: 'number' },
    addonBefore: { control: 'text' },
    addonAfter: { control: 'text' },
    placeholder: { control: 'text' },
  },
  args: {
    type: 'text',
    size: 'md',
    variant: 'outlined',
    status: undefined,
    disabled: false,
    required: false,
    readOnly: false,
    clearable: false,
    showCount: false,
    maxLength: undefined,
    addonBefore: undefined,
    addonAfter: undefined,
    placeholder: 'Enter some text…',
  },
  render: (args) => ({
    props: args,
    template: `<andes-input aria-label="Example input" [type]="type" [size]="size" [variant]="variant" [status]="status" [disabled]="disabled" [required]="required" [readOnly]="readOnly" [clearable]="clearable" [showCount]="showCount" [maxLength]="maxLength" [addonBefore]="addonBefore" [addonAfter]="addonAfter" [placeholder]="placeholder" />`,
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
    // Bound under a name distinct from AndesInput's own `value` model input -
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
    // Bound under a name distinct from AndesInput's own `value` model input -
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

export const TwoWayBinding: Story = {
  render: () => ({
    // `[(value)]` is a model() - no Angular Forms needed. Bound under a name distinct from
    // AndesInput's own `value` input (Storybook forwards matching story props onto it).
    props: { boundText: signal('Edit me') },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 20rem;">
        <andes-input aria-label="Two-way bound" [(value)]="boundText" />
        <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">Value: {{ boundText() }}</span>
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input aria-label="Outlined" variant="outlined" placeholder="Outlined" />
        <andes-input aria-label="Filled" variant="filled" placeholder="Filled" />
        <andes-input aria-label="Borderless" variant="borderless" placeholder="Borderless" />
        <andes-input aria-label="Underlined" variant="underlined" placeholder="Underlined" />
      </div>
    `,
  }),
};

export const Status: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input aria-label="Error" status="error" placeholder="Error (also sets aria-invalid)" />
        <andes-input aria-label="Warning" status="warning" placeholder="Warning" />
        <andes-input aria-label="Error, filled" status="error" variant="filled" placeholder="Error, filled" />
        <andes-input aria-label="Warning, underlined" status="warning" variant="underlined" placeholder="Warning, underlined" />
      </div>
    `,
  }),
};

export const ShowCount: Story = {
  render: () => ({
    props: {
      remaining: ({
        count,
        maxLength,
      }: {
        count: number;
        maxLength?: number;
      }) => `${(maxLength ?? 0) - count} characters left`,
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input aria-label="Nickname" showCount [maxLength]="20" placeholder="Max 20 characters" />
        <andes-input aria-label="Bio" showCount placeholder="No limit" />
        <andes-input aria-label="Tweet" showCount [maxLength]="40" [countFormatter]="remaining" placeholder="Custom formatter" />
      </div>
    `,
  }),
};

export const Addons: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 24rem;">
        <andes-input aria-label="Website" addonBefore="https://" addonAfter=".com" placeholder="mysite" />
        <andes-input aria-label="Phone number" type="tel" placeholder="987 654 321">
          <span slot="addon-before">+51</span>
        </andes-input>
        <andes-input aria-label="Weight" placeholder="0" clearable>
          <span slot="prefix">≈</span>
          <span slot="addon-after">kg</span>
        </andes-input>
        <andes-input aria-label="Website, filled" variant="filled" addonBefore="https://" placeholder="filled variant" />
        <andes-input aria-label="Website, disabled" addonBefore="https://" addonAfter=".com" disabled placeholder="disabled" />
      </div>
    `,
  }),
};

export const ClearEvents: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: {
      clearControl: new FormControl('Clear me'),
      log: signal<string[]>([]),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 20rem;">
        <andes-input aria-label="Clearable" clearable [formControl]="clearControl"
          (cleared)="log.set(log().concat('cleared - control value: &quot;' + clearControl.value + '&quot;'))" />
        @for (entry of log(); track $index) {
          <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">{{ entry }}</span>
        }
      </div>
    `,
  }),
};

export const PressEnter: Story = {
  render: () => ({
    props: { entered: signal<string[]>([]), enterText: signal('') },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 20rem;">
        <andes-input aria-label="Press Enter" placeholder="Type and press Enter" [(value)]="enterText"
          (pressEnter)="entered.set(entered().concat(enterText()))" />
        @for (entry of entered(); track $index) {
          <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">Enter: "{{ entry }}"</span>
        }
      </div>
    `,
  }),
};

export const Password: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesInputPassword] },
    props: { passwordVisible: signal(false) },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input-password aria-label="Password" placeholder="Password" autocomplete="current-password" />
        <andes-input-password aria-label="Password, controlled" placeholder="Controlled visibility" [(visible)]="passwordVisible" />
        <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">Visible: {{ passwordVisible() }}</span>
        <andes-input-password aria-label="Password, no toggle" placeholder="visibilityToggle = false" [visibilityToggle]="false" />
        <andes-input-password aria-label="Password, disabled" placeholder="Disabled" disabled />
      </div>
    `,
  }),
};

export const Search: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesInputSearch] },
    props: { searches: signal<string[]>([]) },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 24rem;">
        <andes-input-search aria-label="Search" placeholder="Default search button" clearable
          (searched)="searches.set(searches().concat($event.source + ': ' + $event.value))" />
        <andes-input-search aria-label="Search, primary" placeholder="enterButton" enterButton
          (searched)="searches.set(searches().concat($event.source + ': ' + $event.value))" />
        <andes-input-search aria-label="Search, labelled" placeholder="enterButton = 'Search'" enterButton="Search" addonBefore="https://"
          (searched)="searches.set(searches().concat($event.source + ': ' + $event.value))" />
        <andes-input-search aria-label="Search, loading" placeholder="loading" enterButton loading />
        <andes-input-search aria-label="Search, small" placeholder="Small" size="sm" enterButton />
        <andes-input-search aria-label="Search, large" placeholder="Large" size="lg" />
        @for (entry of searches(); track $index) {
          <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">{{ entry }}</span>
        }
      </div>
    `,
  }),
};

export const OTP: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesInputOtp] },
    props: {
      otpCode: signal(''),
      completedCode: signal(''),
      digitsOnly: (text: string) => text.replace(/\D/g, ''),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <andes-input-otp aria-label="Verification code" inputMode="numeric" [formatter]="digitsOnly"
          [(value)]="otpCode" (complete)="completedCode.set($event)" />
        <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">Value: "{{ otpCode() }}" · Completed: "{{ completedCode() }}"</span>
        <andes-input-otp aria-label="Masked code" [length]="4" mask />
        <andes-input-otp aria-label="Code with separator" [length]="6" separator="-" variant="filled" size="sm" />
        <andes-input-otp aria-label="Invalid code" [length]="4" status="error" variant="underlined" size="lg" />
        <andes-input-otp aria-label="Disabled code" [length]="4" disabled />
      </div>
    `,
  }),
};
