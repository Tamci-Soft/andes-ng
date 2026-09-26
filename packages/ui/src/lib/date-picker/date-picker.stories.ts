import { JsonPipe } from '@angular/common';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
    picker: {
      control: 'select',
      options: ['date', 'week', 'month', 'quarter', 'year'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    status: { control: 'select', options: [null, 'error', 'warning'] },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless', 'underlined'],
    },
    placement: {
      control: 'select',
      options: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'],
    },
    allowClear: { control: 'boolean' },
    locale: {
      control: 'select',
      options: ['en-US', 'es-PE', 'es-ES', 'fr-FR', 'ja-JP'],
    },
    weekStartsOn: { control: 'select', options: [0, 1, 6] },
    disabled: { control: 'boolean' },
    showOutsideDays: { control: 'boolean' },
    fixedWeeks: { control: 'boolean' },
  },
  args: {
    mode: 'single',
    picker: 'date',
    size: 'md',
    status: null,
    variant: 'outlined',
    placement: 'bottomLeft',
    allowClear: true,
    locale: 'en-US',
    weekStartsOn: 0,
    disabled: false,
    showOutsideDays: true,
    fixedWeeks: false,
  },
  render: (args) => ({
    props: args,
    template: `<div style="min-height: 26rem;">
      <andes-date-picker
        [mode]="mode"
        [picker]="picker"
        [size]="size"
        [status]="status"
        [variant]="variant"
        [placement]="placement"
        [allowClear]="allowClear"
        [locale]="locale"
        [weekStartsOn]="weekStartsOn"
        [disabled]="disabled"
        [showOutsideDays]="showOutsideDays"
        [fixedWeeks]="fixedWeeks" />
    </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesDatePicker>;

export const Single: Story = {};

/**
 * `mode="range"`: two inputs in one field and two months side by side. After the
 * first pick, hovering previews the range the second pick would close.
 */
export const Range: Story = {
  args: { mode: 'range' },
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
      <andes-date-picker mode="range" locale="en-US" [formControl]="control" />
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
      <andes-date-picker locale="es-PE" [weekStartsOn]="1" mode="range" [placeholder]="['Desde', 'Hasta']" startInputLabel="Desde" endInputLabel="Hasta" />
    </div>`,
  }),
};

const FEB_15 = new Date(2024, 1, 15);

/** Shown open, so the panel is visible without a click. */
export const RangeOpen: Story = {
  render: () => ({
    props: {
      value: [new Date(2024, 1, 10), new Date(2024, 2, 5)] as const,
    },
    template: `<div style="min-height: 26rem;">
      <andes-date-picker mode="range" locale="en-US" [open]="true" [ngModel]="value" />
    </div>`,
    moduleMetadata: { imports: [FormsModule] },
  }),
};

/**
 * `picker` selects weeks, months, quarters or years; the value is the first day of
 * the chosen period and the display format follows the picker.
 */
export const Pickers: Story = {
  render: () => ({
    template: `<div style="min-height: 22rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start;">
      <andes-date-picker picker="week" locale="en-US" [weekStartsOn]="1" />
      <andes-date-picker picker="month" locale="en-US" />
      <andes-date-picker picker="quarter" locale="en-US" />
      <andes-date-picker picker="year" locale="en-US" />
      <andes-date-picker picker="month" mode="range" locale="en-US" />
    </div>`,
  }),
};

/** The month picker, open. */
export const MonthPickerOpen: Story = {
  render: () => ({
    props: { value: new Date(2024, 4, 1) },
    moduleMetadata: { imports: [FormsModule] },
    template: `<div style="min-height: 20rem;">
      <andes-date-picker picker="month" locale="en-US" [open]="true" [ngModel]="value" />
    </div>`,
  }),
};

/**
 * `format` (a token pattern) drives both display and typing. With a list, the
 * first pattern displays and every pattern parses — type `15/02/2024`,
 * `15/02/24` or ISO `2024-02-15`, then Enter or Tab.
 */
export const TypedFormat: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule, JsonPipe] },
    props: {
      control: new FormControl<Date | null>(FEB_15),
      format: ['DD/MM/YYYY', 'DD/MM/YY', 'D MMM YYYY'],
    },
    template: `<div style="min-height: 26rem; display: flex; flex-direction: column; gap: 1rem;">
      <andes-date-picker locale="en-GB" [weekStartsOn]="1" [format]="format" [formControl]="control" aria-label="Due date" />
      <pre style="font: 0.75rem/1.5 ui-monospace, monospace;">value: {{ control.value | json }}</pre>
    </div>`,
  }),
};

/**
 * `showTime` adds hour/minute columns; `needConfirm` is then on by default, so
 * picks stay pending until OK. `showNow` adds a "Now" shortcut.
 */
export const WithTime: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule, JsonPipe] },
    props: {
      control: new FormControl<Date | null>(new Date(2024, 1, 15, 9, 30)),
    },
    template: `<div style="min-height: 28rem; display: flex; flex-direction: column; gap: 1rem;">
      <andes-date-picker locale="en-US" showTime showNow [open]="true" [formControl]="control" aria-label="Meeting time" />
      <pre style="font: 0.75rem/1.5 ui-monospace, monospace;">value: {{ control.value | json }}</pre>
    </div>`,
  }),
};

/** Time columns with a 15-minute step and seconds, in a range. */
export const RangeWithTime: Story = {
  render: () => ({
    props: {
      showTime: { minuteStep: 15, showSecond: true },
      defaultMonth: new Date(2024, 1, 1),
    },
    template: `<div style="min-height: 28rem;">
      <andes-date-picker mode="range" locale="en-GB" [showTime]="showTime" [defaultMonth]="defaultMonth" />
    </div>`,
  }),
};

/** `presets` list one-click values beside the calendar; functions stay current. */
export const Presets: Story = {
  render: () => ({
    props: {
      presets: [
        { label: 'Today', value: () => [new Date(), new Date()] },
        {
          label: 'Last 7 days',
          value: () => [new Date(Date.now() - 6 * 86_400_000), new Date()],
        },
        {
          label: 'This month',
          value: () => {
            const now = new Date();
            return [
              new Date(now.getFullYear(), now.getMonth(), 1),
              new Date(now.getFullYear(), now.getMonth() + 1, 0),
            ];
          },
        },
        {
          label: 'Q1 2024',
          value: [new Date(2024, 0, 1), new Date(2024, 2, 31)],
        },
      ],
      defaultMonth: new Date(2024, 1, 1),
    },
    template: `<div style="min-height: 26rem;">
      <andes-date-picker mode="range" locale="en-US" [presets]="presets" [defaultMonth]="defaultMonth" [open]="true" />
    </div>`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    props: { value: FEB_15 },
    moduleMetadata: { imports: [FormsModule] },
    template: `<div style="display: flex; flex-direction: column; gap: 0.75rem; width: 16rem;">
      <andes-date-picker size="sm" locale="en-US" [ngModel]="value" aria-label="Small" />
      <andes-date-picker size="md" locale="en-US" [ngModel]="value" aria-label="Medium" />
      <andes-date-picker size="lg" locale="en-US" [ngModel]="value" aria-label="Large" />
    </div>`,
  }),
};

/** `status` colors the field; `error` also sets `aria-invalid`. */
export const Status: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 0.75rem; width: 16rem;">
      <andes-date-picker status="error" locale="en-US" aria-label="Error" />
      <andes-date-picker status="warning" locale="en-US" aria-label="Warning" />
      <andes-date-picker status="error" mode="range" locale="en-US" aria-label="Range error" />
    </div>`,
  }),
};

export const Variants: Story = {
  render: () => ({
    props: { value: FEB_15 },
    moduleMetadata: { imports: [FormsModule] },
    template: `<div style="display: flex; flex-direction: column; gap: 0.75rem; width: 16rem;">
      <andes-date-picker variant="outlined" locale="en-US" [ngModel]="value" aria-label="Outlined" />
      <andes-date-picker variant="filled" locale="en-US" [ngModel]="value" aria-label="Filled" />
      <andes-date-picker variant="borderless" locale="en-US" [ngModel]="value" aria-label="Borderless" />
      <andes-date-picker variant="underlined" locale="en-US" [ngModel]="value" aria-label="Underlined" />
    </div>`,
  }),
};

/** `placement` picks the corner the panel opens from; it still flips to fit. */
export const Placement: Story = {
  render: () => ({
    template: `<div style="min-height: 46rem; display: flex; align-items: center; justify-content: center;">
      <div style="display: grid; grid-template-columns: repeat(2, 14rem); gap: 1rem;">
        <andes-date-picker placement="topLeft" locale="en-US" placeholder="topLeft" />
        <andes-date-picker placement="topRight" locale="en-US" placeholder="topRight" />
        <andes-date-picker placement="bottomLeft" locale="en-US" placeholder="bottomLeft" />
        <andes-date-picker placement="bottomRight" locale="en-US" placeholder="bottomRight" />
      </div>
    </div>`,
  }),
};

/** `[(open)]` drives the panel from outside; `openChange` reports its own closes. */
export const ControlledOpen: Story = {
  render: () => ({
    props: { open: false },
    template: `<div style="min-height: 26rem; display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
      <button type="button" (click)="open = !open">{{ open ? 'Close' : 'Open' }} the picker</button>
      <andes-date-picker locale="en-US" [(open)]="open" aria-label="Controlled" />
      <span style="font: 0.75rem ui-monospace, monospace;">open: {{ open }}</span>
    </div>`,
  }),
};

/** `dateDisabled` also receives the picker type: here, no past months. */
export const DisabledMonths: Story = {
  render: () => ({
    props: {
      dateDisabled: (date: Date, info: { type: string }) =>
        info.type === 'month' && date < new Date(2024, 3, 1),
      value: new Date(2024, 5, 1),
    },
    moduleMetadata: { imports: [FormsModule] },
    template: `<div style="min-height: 20rem;">
      <andes-date-picker picker="month" locale="en-US" [dateDisabled]="dateDisabled" [ngModel]="value" [open]="true" />
    </div>`,
  }),
};

/** `prefix`, `suffixIcon` and `extraFooter` are template hooks. */
export const Slots: Story = {
  render: () => ({
    props: {
      weekends: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
    },
    template: `
      <ng-template #prefix><span style="font-size: 0.875rem;">Due</span></ng-template>
      <ng-template #suffix>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20" /></svg>
      </ng-template>
      <ng-template #footer><span>Weekends are closed.</span></ng-template>
      <div style="min-height: 26rem;">
        <andes-date-picker locale="en-US" showNow [prefix]="prefix" [suffixIcon]="suffix" [extraFooter]="footer" [dateDisabled]="weekends" aria-label="Due date" />
      </div>
    `,
  }),
};
