import { BidiModule } from '@angular/cdk/bidi';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesSegmented } from './segmented';
import { AndesSegmentedOption } from './segmented-option';

const list = `<svg slot="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 4h8M5 8h8M5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01"/></svg>`;
const grid = `<svg slot="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>`;
const map = `<svg slot="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2 4l4-1.5 4 1.5 4-1.5v9.5L10 13.5 6 12l-4 1.5z"/><path d="M6 2.5V12M10 4v9.5"/></svg>`;

const meta: Meta<AndesSegmented> = {
  title: 'Segmented',
  component: AndesSegmented,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    shape: { control: 'inline-radio', options: ['default', 'round'] },
    block: { control: 'boolean' },
    vertical: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    name: { control: 'text' },
    options: { control: 'object' },
    selectionChange: { action: 'selectionChange' },
  },
  args: {
    size: 'md',
    shape: 'default',
    block: false,
    vertical: false,
    disabled: false,
    options: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
    value: 'Weekly',
  },
  render: (args) => ({
    props: args,
    template: `<andes-segmented aria-label="Report period" [options]="options" [(value)]="value" [size]="size" [shape]="shape" [block]="block" [vertical]="vertical" [disabled]="disabled" [required]="required" [name]="name" (selectionChange)="selectionChange($event)" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesSegmented>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
        <andes-segmented aria-label="Small" size="sm" [options]="['Day', 'Week', 'Month']" value="Day" />
        <andes-segmented aria-label="Medium" size="md" [options]="['Day', 'Week', 'Month']" value="Week" />
        <andes-segmented aria-label="Large" size="lg" [options]="['Day', 'Week', 'Month']" value="Month" />
      </div>
    `,
  }),
};

export const Round: Story = {
  args: { shape: 'round' },
};

/** `block` stretches the control to its container and shares the width equally. */
export const Block: Story = {
  args: { block: true },
  parameters: { layout: 'padded' },
};

export const Vertical: Story = {
  args: {
    vertical: true,
    options: ['Overview', 'Invoices', 'Payments', 'Settings'],
    value: 'Invoices',
  },
};

export const NumbersAndObjects: Story = {
  render: () => ({
    props: {
      years: [2023, 2024, 2025, 2026],
      statuses: [
        { label: 'Open', value: 'open' },
        { label: 'Paid', value: 'paid' },
        { label: 'Overdue', value: 'overdue', tooltip: 'Past the due date' },
        { label: 'Void', value: 'void', disabled: true },
      ],
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
        <andes-segmented aria-label="Year" [options]="years" [value]="2025" />
        <andes-segmented aria-label="Status" [options]="statuses" value="paid" />
      </div>
    `,
  }),
};

/** Icons go in a `[slot=icon]` child of each projected option. */
export const WithIcons: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesSegmentedOption] },
    template: `
      <andes-segmented aria-label="Layout" value="list">
        <andes-segmented-option value="list">${list} List</andes-segmented-option>
        <andes-segmented-option value="grid">${grid} Grid</andes-segmented-option>
        <andes-segmented-option value="map">${map} Map</andes-segmented-option>
      </andes-segmented>
    `,
  }),
};

/** An option without text needs an accessible name; `tooltip` adds a hover hint. */
export const IconOnly: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesSegmentedOption] },
    template: `
      <andes-segmented aria-label="Layout" value="grid">
        <andes-segmented-option value="list" aria-label="List" tooltip="List">${list}</andes-segmented-option>
        <andes-segmented-option value="grid" aria-label="Grid" tooltip="Grid">${grid}</andes-segmented-option>
        <andes-segmented-option value="map" aria-label="Map" tooltip="Map">${map}</andes-segmented-option>
      </andes-segmented>
    `,
  }),
};

export const DisabledOption: Story = {
  args: {
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Review', value: 'review' },
      { label: 'Approved', value: 'approved', disabled: true },
    ],
    value: 'draft',
  },
};

export const Disabled: Story = { args: { disabled: true } };

/** `optionLabel` customises every generated option; `let-checked` reports the selection. */
export const CustomLabel: Story = {
  render: () => ({
    props: {
      plans: [
        { label: 'Starter', value: 'starter', price: '$9' },
        { label: 'Team', value: 'team', price: '$29' },
        { label: 'Business', value: 'business', price: '$99' },
      ],
    },
    template: `
      <ng-template #plan let-option let-checked="checked">
        <span style="display: inline-flex; flex-direction: column; align-items: center; line-height: 1.1; padding-block: 0.25rem;">
          <span>{{ option.label }}</span>
          <span style="font-size: 0.75rem; opacity: 0.7;">{{ option.price }}/mo</span>
        </span>
      </ng-template>
      <andes-segmented aria-label="Plan" size="lg" [options]="plans" [optionLabel]="plan" value="team" />
    `,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: { control: new FormControl('b') },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <andes-segmented aria-label="Choice" [formControl]="control" [options]="[{label: 'Alpha', value: 'a'}, {label: 'Beta', value: 'b'}, {label: 'Gamma', value: 'c'}]" name="choice" />
        <span style="font-size: 0.75rem; line-height: 1.25rem;">Control value: {{ control.value }} - {{ control.dirty ? 'dirty' : 'pristine' }}</span>
        <button type="button" (click)="control.disabled ? control.enable() : control.disable()" style="font: inherit; font-size: 0.875rem;">Toggle disabled</button>
      </div>
    `,
  }),
};

export const NgModel: Story = {
  render: () => ({
    moduleMetadata: { imports: [FormsModule] },
    props: { plan: 'monthly' },
    template: `
      <andes-segmented aria-label="Billing" [(ngModel)]="plan" [options]="[{label: 'Monthly', value: 'monthly'}, {label: 'Annual', value: 'annual'}]" />
      <p style="font-size: 0.875rem; line-height: 1.375rem;">Billing: {{ plan }}</p>
    `,
  }),
};

/** Arrow keys mirror in right-to-left layouts; the thumb follows the measured position. */
export const RightToLeft: Story = {
  render: () => ({
    moduleMetadata: { imports: [BidiModule] },
    template: `
      <div dir="rtl">
        <andes-segmented aria-label="Period" [options]="['يومي', 'أسبوعي', 'شهري']" value="أسبوعي" />
      </div>
    `,
  }),
};

export const AllDisabledStates: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesSegmentedOption] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
        <andes-segmented aria-label="Disabled group" disabled [options]="['One', 'Two', 'Three']" value="Two" />
        <andes-segmented aria-label="Round disabled option" shape="round" [options]="[{label: 'One', value: 1}, {label: 'Two', value: 2, disabled: true}, {label: 'Three', value: 3}]" [value]="1" />
      </div>
    `,
  }),
};
