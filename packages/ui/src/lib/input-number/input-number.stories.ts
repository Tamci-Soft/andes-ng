import { signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesInputNumber } from './input-number';

const caption =
  'font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); font-family: var(--andes-font-family), sans-serif;';
const label =
  'font-size: 0.875rem; line-height: 1.375rem; font-weight: 500; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;';
const column =
  'display: flex; flex-direction: column; gap: 1rem; width: 20rem;';

const meta: Meta<AndesInputNumber> = {
  title: 'Input Number',
  component: AndesInputNumber,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless', 'underlined'],
    },
    status: { control: 'select', options: [undefined, 'error', 'warning'] },
    mode: { control: 'select', options: ['input', 'spinner'] },
    format: {
      control: 'select',
      options: ['none', 'decimal', 'currency', 'percent'],
    },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    controls: { control: 'boolean' },
    keyboard: { control: 'boolean' },
    changeOnWheel: { control: 'boolean' },
    changeOnBlur: { control: 'boolean' },
    stringMode: { control: 'boolean' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    precision: { control: 'number' },
    placeholder: { control: 'text' },
  },
  args: {
    size: 'md',
    variant: 'outlined',
    status: undefined,
    mode: 'input',
    format: 'none',
    disabled: false,
    readOnly: false,
    required: false,
    controls: true,
    keyboard: true,
    changeOnWheel: false,
    changeOnBlur: false,
    stringMode: false,
    min: undefined,
    max: undefined,
    step: 1,
    precision: undefined,
    placeholder: 'Enter a number',
  },
  render: (args) => ({
    props: args,
    template: `<andes-input-number style="width: 12rem;" aria-label="Example number" [size]="size" [variant]="variant" [status]="status" [mode]="mode" [format]="format" [disabled]="disabled" [readOnly]="readOnly" [required]="required" [controls]="controls" [keyboard]="keyboard" [changeOnWheel]="changeOnWheel" [changeOnBlur]="changeOnBlur" [stringMode]="stringMode" [min]="min" [max]="max" [step]="step" [precision]="precision" [placeholder]="placeholder" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesInputNumber>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="${column}">
        <andes-input-number size="sm" aria-label="Small" [value]="3" />
        <andes-input-number size="md" aria-label="Medium" [value]="3" />
        <andes-input-number size="lg" aria-label="Large" [value]="3" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div style="${column}">
        <andes-input-number variant="outlined" aria-label="Outlined" [value]="10" />
        <andes-input-number variant="filled" aria-label="Filled" [value]="10" />
        <andes-input-number variant="borderless" aria-label="Borderless" [value]="10" />
        <andes-input-number variant="underlined" aria-label="Underlined" [value]="10" />
      </div>
    `,
  }),
};

export const Status: Story = {
  render: () => ({
    template: `
      <div style="${column}">
        <andes-input-number status="error" aria-label="Error" [value]="0" />
        <andes-input-number status="warning" aria-label="Warning" [value]="0" />
        <andes-input-number status="error" variant="filled" aria-label="Error, filled" [value]="0" />
        <andes-input-number status="warning" variant="underlined" aria-label="Warning, underlined" [value]="0" />
      </div>
    `,
  }),
};

export const DisabledAndReadOnly: Story = {
  render: () => ({
    template: `
      <div style="${column}">
        <andes-input-number disabled aria-label="Disabled" [value]="42" />
        <andes-input-number readOnly aria-label="Read-only" [value]="42" />
      </div>
    `,
  }),
};

/**
 * Hover or focus the field to reveal the stepper on its inline-end edge. Press and hold a
 * button to repeat; the repeat accelerates. The stepper stops at `min` and `max`.
 */
export const MinMaxStep: Story = {
  render: () => ({
    props: { quantity: signal<number | null>(5) },
    template: `
      <div style="${column}">
        <label style="${label}" for="qty-bounded">Quantity (1 to 10, step 1)</label>
        <andes-input-number id="qty-bounded" [(value)]="quantity" [min]="1" [max]="10" />
        <span style="${caption}">Value: {{ quantity() }}. Arrow keys step, Shift adds ten steps, Alt a tenth, Home and End jump to the bounds.</span>
      </div>
    `,
  }),
};

export const DecimalSteps: Story = {
  render: () => ({
    template: `
      <div style="${column}">
        <label style="${label}" for="rate">Rate (step 0.1, exact: 0.1 + 0.2 is 0.3)</label>
        <andes-input-number id="rate" [value]="0.1" [step]="0.1" />
        <label style="${label}" for="price">Price (two decimals)</label>
        <andes-input-number id="price" [value]="19.9" [step]="0.01" [precision]="2" [min]="0" />
      </div>
    `,
  }),
};

export const StringMode: Story = {
  render: () => ({
    props: { exact: signal<number | string | null>('9007199254740993.12') },
    template: `
      <div style="${column}">
        <label style="${label}" for="exact">High-precision decimal</label>
        <andes-input-number id="exact" stringMode [(value)]="exact" step="0.01" />
        <span style="${caption}">Emits the string {{ exact() }}: no digit is lost to a double.</span>
      </div>
    `,
  }),
};

export const Formatting: Story = {
  render: () => ({
    props: {
      amount: signal<number | null>(1234567.891),
      rate: signal<number | null>(0.185),
      units: signal<number | null>(1500),
    },
    template: `
      <div style="${column}">
        <label style="${label}" for="fmt-decimal">Thousands separators</label>
        <andes-input-number id="fmt-decimal" format="decimal" [(value)]="units" [step]="100" />
        <label style="${label}" for="fmt-currency">Currency</label>
        <andes-input-number id="fmt-currency" format="currency" currency="USD" [(value)]="amount" [precision]="2" [step]="10" />
        <label style="${label}" for="fmt-eur">Currency, German locale</label>
        <andes-input-number id="fmt-eur" format="currency" currency="EUR" locale="de-DE" [(value)]="amount" [precision]="2" [step]="10" />
        <label style="${label}" for="fmt-percent">Percent (stored as a fraction)</label>
        <andes-input-number id="fmt-percent" format="percent" [(value)]="rate" [step]="0.005" [precision]="3" [min]="0" [max]="1" />
        <span style="${caption}">Stored values: {{ units() }}, {{ amount() }}, {{ rate() }}</span>
      </div>
    `,
  }),
};

export const CustomFormatterAndParser: Story = {
  render: () => ({
    props: {
      withUnit: (value: number | string) => `${value} kg`,
      fromUnit: (text: string) => {
        const parsed = Number.parseFloat(text.replace(/[^\d.-]/g, ''));
        return Number.isNaN(parsed) ? undefined : parsed;
      },
    },
    template: `
      <div style="${column}">
        <label style="${label}" for="weight">Weight</label>
        <andes-input-number id="weight" [value]="12" [formatter]="withUnit" [parser]="fromUnit" [min]="0" [step]="0.5" />
      </div>
    `,
  }),
};

export const PrefixSuffixAndAddons: Story = {
  render: () => ({
    template: `
      <div style="${column}">
        <andes-input-number aria-label="Amount" [value]="250" [precision]="2">
          <span slot="prefix">$</span>
          <span slot="suffix">USD</span>
        </andes-input-number>
        <andes-input-number aria-label="Width" [value]="120" addonBefore="W" addonAfter="px" />
        <andes-input-number aria-label="Discount" [value]="15">
          <span slot="addon-after">%</span>
        </andes-input-number>
        <andes-input-number aria-label="Filled with addons" variant="filled" [value]="8" addonAfter="units" />
        <andes-input-number aria-label="Disabled with addons" disabled [value]="8" addonBefore="Qty" addonAfter="units" />
      </div>
    `,
  }),
};

export const Spinner: Story = {
  render: () => ({
    props: { seats: signal<number | null>(2) },
    template: `
      <div style="${column}">
        <label style="${label}" for="seats">Seats</label>
        <andes-input-number id="seats" mode="spinner" [(value)]="seats" [min]="1" [max]="12" />
        <andes-input-number mode="spinner" size="sm" aria-label="Small spinner" [value]="1" />
        <andes-input-number mode="spinner" size="lg" aria-label="Large spinner" [value]="1" />
      </div>
    `,
  }),
};

export const ControlsAndKeyboard: Story = {
  render: () => ({
    template: `
      <div style="${column}">
        <label style="${label}" for="no-controls">No stepper (arrow keys only)</label>
        <andes-input-number id="no-controls" [controls]="false" [value]="5" />
        <label style="${label}" for="no-keyboard">Stepper only (keyboard off)</label>
        <andes-input-number id="no-keyboard" [keyboard]="false" [value]="5" />
      </div>
    `,
  }),
};

export const MouseWheel: Story = {
  render: () => ({
    template: `
      <div style="${column}">
        <label style="${label}" for="wheel">Focus the field, then scroll over it</label>
        <andes-input-number id="wheel" changeOnWheel [value]="50" [min]="0" [max]="100" [step]="5" />
      </div>
    `,
  }),
};

export const ChangeOnBlur: Story = {
  render: () => ({
    props: { committed: signal<number | null>(5) },
    template: `
      <div style="${column}">
        <label style="${label}" for="blur">Commits when you leave the field or press Enter</label>
        <andes-input-number id="blur" changeOnBlur [(value)]="committed" [min]="0" [max]="100" />
        <span style="${caption}">Value: {{ committed() }}. Out-of-range text is pulled into 0 to 100.</span>
      </div>
    `,
  }),
};

export const StepEvents: Story = {
  render: () => ({
    props: {
      log: signal<string[]>([]),
      note: (
        log: string[],
        event: {
          direction: string;
          source: string;
          offset: string;
          value: unknown;
        },
      ) =>
        log
          .concat(
            `${event.direction} by ${event.offset} from ${event.source} to ${event.value}`,
          )
          .slice(-4),
    },
    template: `
      <div style="${column}">
        <andes-input-number aria-label="Counter" [value]="0" (stepped)="log.set(note(log(), $event))" />
        @for (entry of log(); track $index) {
          <span style="${caption}">{{ entry }}</span>
        }
      </div>
    `,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: {
      quantityControl: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(1),
      ]),
    },
    template: `
      <div style="${column}">
        <label style="${label}" for="form-qty">Quantity</label>
        <andes-input-number id="form-qty" [formControl]="quantityControl" [min]="1" [max]="99" [status]="quantityControl.invalid && quantityControl.touched ? 'error' : undefined" />
        @if (quantityControl.invalid && quantityControl.touched) {
          <span style="${caption} color: var(--andes-color-danger-text, var(--andes-color-danger));">Enter a quantity of at least 1.</span>
        }
        <span style="${caption}">Control value: {{ quantityControl.value ?? 'empty' }}</span>
      </div>
    `,
  }),
};
