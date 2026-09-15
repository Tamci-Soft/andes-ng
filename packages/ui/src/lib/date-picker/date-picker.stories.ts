import { JsonPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesDatePicker } from './date-picker';

const meta: Meta<AndesDatePicker> = {
  title: 'Date Picker',
  component: AndesDatePicker,
  tags: ['autodocs'],
  parameters: {
    // The panel is absolutely positioned under the trigger, so give it somewhere
    // to open into rather than letting it flip against the viewport edge.
    layout: 'padded',
  },
  argTypes: {
    mode: { control: 'select', options: ['single', 'range'] },
    locale: {
      control: 'select',
      options: ['en-US', 'es-PE', 'es-ES', 'fr-FR', 'ja-JP'],
    },
    weekStartsOn: { control: 'select', options: [0, 1, 6] },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    showOutsideDays: { control: 'boolean' },
    fixedWeeks: { control: 'boolean' },
  },
  args: {
    mode: 'single',
    locale: 'en-US',
    weekStartsOn: 0,
    placeholder: 'Select a date',
    disabled: false,
    showOutsideDays: true,
    fixedWeeks: false,
  },
  render: (args) => ({
    props: args,
    template: `<div style="min-height: 26rem;">
      <andes-date-picker
        [mode]="mode"
        [locale]="locale"
        [weekStartsOn]="weekStartsOn"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [showOutsideDays]="showOutsideDays"
        [fixedWeeks]="fixedWeeks" />
    </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesDatePicker>;

export const Single: Story = {};

export const Range: Story = {
  args: { mode: 'range', placeholder: 'Select a date range' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithBounds: Story = {
  render: (args) => ({
    props: {
      ...args,
      min: new Date(2024, 1, 8),
      max: new Date(2024, 1, 22),
      defaultMonth: new Date(2024, 1, 1),
    },
    template: `<div style="min-height: 26rem;">
      <andes-date-picker
        [locale]="locale"
        [min]="min"
        [max]="max"
        [defaultMonth]="defaultMonth" />
    </div>`,
  }),
};

export const WeekendsDisabled: Story = {
  render: (args) => ({
    props: {
      ...args,
      dateDisabled: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
    },
    template: `<div style="min-height: 26rem;">
      <andes-date-picker [locale]="locale" [dateDisabled]="dateDisabled" />
    </div>`,
  }),
};

/**
 * The trigger takes its accessible name from `aria-labelledby` pointing at the
 * visible label. A `<label for>` would not work: the id would land on the host
 * element rather than on the inner input.
 */
export const WithLabel: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="min-height: 26rem; display: flex; flex-direction: column; gap: 0.5rem;">
      <span id="start-date-label" style="font: 500 0.875rem var(--andes-font-family, system-ui);">
        Start date
      </span>
      <andes-date-picker aria-labelledby="start-date-label" [locale]="locale" />
    </div>`,
  }),
};

/** Any `Intl.DateTimeFormat` options can drive the trigger's display value. */
export const CustomDisplayFormat: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: {
      ...args,
      control: new FormControl<Date | null>(new Date(2024, 1, 15)),
      displayFormat: {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      } satisfies Intl.DateTimeFormatOptions,
    },
    template: `<div style="min-height: 26rem;">
      <andes-date-picker [locale]="locale" [displayFormat]="displayFormat" [formControl]="control" />
    </div>`,
  }),
};

/** Reactive forms: the control holds a `Date` and reflects touched/dirty state. */
export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule, JsonPipe] },
    props: { control: new FormControl<Date | null>(new Date(2024, 1, 15)) },
    template: `<div style="min-height: 28rem; display: flex; flex-direction: column; gap: 1rem;">
      <andes-date-picker locale="en-US" [formControl]="control" />
      <pre style="font: 0.75rem/1.5 ui-monospace, monospace;">value: {{ control.value | json }}
touched: {{ control.touched }}  dirty: {{ control.dirty }}</pre>
    </div>`,
  }),
};

/** A required range stays invalid until both boundaries are chosen. */
export const RequiredRange: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule, JsonPipe] },
    props: {
      control: new FormControl<readonly [Date, Date] | null>(null, [
        Validators.required,
      ]),
    },
    template: `<div style="min-height: 28rem; display: flex; flex-direction: column; gap: 1rem;">
      <andes-date-picker mode="range" locale="en-US" [formControl]="control" placeholder="Select a date range" />
      <pre style="font: 0.75rem/1.5 ui-monospace, monospace;">valid: {{ control.valid }}
value: {{ control.value | json }}</pre>
    </div>`,
  }),
};

export const Locales: Story = {
  render: () => ({
    template: `<div style="min-height: 26rem; display: flex; gap: 1rem; flex-wrap: wrap;">
      <andes-date-picker locale="en-US" placeholder="en-US" />
      <andes-date-picker locale="es-PE" [weekStartsOn]="1" placeholder="es-PE" />
      <andes-date-picker locale="ja-JP" placeholder="ja-JP" />
    </div>`,
  }),
};
