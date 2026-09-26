import type { Meta, StoryObj } from '@storybook/angular';

import { AndesCalendar } from './calendar';

/** Pinned so the docs render the same grid regardless of when they are built. */
const FEBRUARY_2024 = new Date(2024, 1, 1);

const meta: Meta<AndesCalendar> = {
  title: 'Calendar',
  component: AndesCalendar,
  tags: ['autodocs'],
  argTypes: {
    mode: { control: 'select', options: ['single', 'range'] },
    locale: {
      control: 'select',
      options: ['en-US', 'es-PE', 'es-ES', 'fr-FR', 'ja-JP'],
    },
    weekStartsOn: { control: 'select', options: [0, 1, 6] },
    showOutsideDays: { control: 'boolean' },
    fixedWeeks: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    mode: 'single',
    locale: 'en-US',
    weekStartsOn: 0,
    showOutsideDays: true,
    fixedWeeks: false,
    disabled: false,
  },
  render: (args) => ({
    props: { ...args, defaultMonth: FEBRUARY_2024 },
    template: `<andes-calendar
      [mode]="mode"
      [locale]="locale"
      [weekStartsOn]="weekStartsOn"
      [showOutsideDays]="showOutsideDays"
      [fixedWeeks]="fixedWeeks"
      [disabled]="disabled"
      [defaultMonth]="defaultMonth" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesCalendar>;

export const Single: Story = {};

export const Range: Story = {
  args: { mode: 'range' },
};

/**
 * A pre-selected range, to show the boundary and interior treatments without
 * having to click through the selection first.
 */
export const RangePreselected: Story = {
  render: (args) => ({
    props: {
      ...args,
      defaultMonth: FEBRUARY_2024,
      value: { start: new Date(2024, 1, 10), end: new Date(2024, 1, 18) },
    },
    template: `<andes-calendar mode="range" [locale]="locale" [value]="value" [defaultMonth]="defaultMonth" />`,
  }),
};

export const WithSelection: Story = {
  render: (args) => ({
    props: { ...args, value: new Date(2024, 1, 15) },
    template: `<andes-calendar [locale]="locale" [value]="value" />`,
  }),
};

/** February 2024 is a leap February: the grid must run to the 29th. */
export const LeapFebruary: Story = {
  render: (args) => ({
    props: { ...args, defaultMonth: FEBRUARY_2024 },
    template: `<andes-calendar [locale]="locale" [defaultMonth]="defaultMonth" />`,
  }),
};

/** December 2024, whose trailing cells belong to January *2025*. */
export const MonthRollover: Story = {
  render: (args) => ({
    props: { ...args, defaultMonth: new Date(2024, 11, 1) },
    template: `<andes-calendar [locale]="locale" [defaultMonth]="defaultMonth" />`,
  }),
};

/** `min`/`max` landing exactly on the visible month's first and last day. */
export const BoundsOnMonthEdges: Story = {
  render: (args) => ({
    props: {
      ...args,
      defaultMonth: FEBRUARY_2024,
      min: new Date(2024, 1, 1),
      max: new Date(2024, 1, 29),
    },
    template: `<andes-calendar [locale]="locale" [defaultMonth]="defaultMonth" [min]="min" [max]="max" />`,
  }),
};

export const WithBounds: Story = {
  render: (args) => ({
    props: {
      ...args,
      defaultMonth: FEBRUARY_2024,
      min: new Date(2024, 1, 8),
      max: new Date(2024, 1, 22),
    },
    template: `<andes-calendar [locale]="locale" [defaultMonth]="defaultMonth" [min]="min" [max]="max" />`,
  }),
};

/** Weekends blocked through the `dateDisabled` predicate. */
export const WeekendsDisabled: Story = {
  render: (args) => ({
    props: {
      ...args,
      defaultMonth: FEBRUARY_2024,
      dateDisabled: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
    },
    template: `<andes-calendar [locale]="locale" [defaultMonth]="defaultMonth" [dateDisabled]="dateDisabled" />`,
  }),
};

export const MondayFirst: Story = {
  args: { weekStartsOn: 1 },
};

export const HideOutsideDays: Story = {
  args: { showOutsideDays: false },
};

export const FixedWeeks: Story = {
  args: { fixedWeeks: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/** Month and weekday names come from `Intl`, so no locale is hard-coded. */
export const Locales: Story = {
  render: () => ({
    props: { defaultMonth: FEBRUARY_2024 },
    template: `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <andes-calendar locale="en-US" [defaultMonth]="defaultMonth" />
        <andes-calendar locale="es-PE" [weekStartsOn]="1" [defaultMonth]="defaultMonth" />
        <andes-calendar locale="ja-JP" [defaultMonth]="defaultMonth" />
      </div>
    `,
  }),
};

/**
 * `picker` sets the selection granularity, as Ant's `picker`. The caption climbs
 * to the coarser grid (days → months → years); picking there drills back down.
 */
export const PickerModes: Story = {
  render: () => ({
    props: {
      week: new Date(2024, 1, 12),
      month: new Date(2024, 1, 1),
      quarter: new Date(2024, 3, 1),
      year: new Date(2024, 0, 1),
    },
    template: `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start;">
        <andes-calendar locale="en-US" picker="week" [weekStartsOn]="1" [value]="week" aria-label="Week picker" />
        <andes-calendar locale="en-US" picker="month" [value]="month" aria-label="Month picker" />
        <andes-calendar locale="en-US" picker="quarter" [value]="quarter" aria-label="Quarter picker" />
        <andes-calendar locale="en-US" picker="year" [value]="year" aria-label="Year picker" />
      </div>
    `,
  }),
};

/** ISO week numbers (Monday-first), in their own row-header column. */
export const WeekNumbers: Story = {
  render: () => ({
    props: { defaultMonth: new Date(2024, 11, 1) },
    template: `<andes-calendar locale="en-GB" [weekStartsOn]="1" showWeek [defaultMonth]="defaultMonth" />`,
  }),
};

/**
 * Two months side by side, as the range picker shows them. With the start picked,
 * hovering (or arrowing) previews the range the next pick would close.
 */
export const TwoMonthRange: Story = {
  render: () => ({
    props: {
      defaultMonth: FEBRUARY_2024,
      value: { start: new Date(2024, 1, 20), end: null },
    },
    template: `<andes-calendar mode="range" locale="en-US" [numberOfMonths]="2" [defaultMonth]="defaultMonth" [(value)]="value" />`,
  }),
};

/** A range of months, picked in the month grid. */
export const MonthRange: Story = {
  render: () => ({
    props: {
      value: { start: new Date(2024, 2, 1), end: new Date(2024, 7, 1) },
    },
    template: `<andes-calendar mode="range" picker="month" locale="en-US" [(value)]="value" />`,
  }),
};

/**
 * `cellTemplate` (Ant's `cellRender`) customises each cell. The context carries
 * the date, the resolved cell state and the grid it belongs to.
 */
export const CustomCells: Story = {
  render: () => ({
    props: {
      defaultMonth: FEBRUARY_2024,
      busy: (date: Date) => [5, 12, 13, 21].includes(date.getDate()),
    },
    template: `
      <ng-template #cell let-date let-cell="cell">
        <span style="display: inline-flex; flex-direction: column; align-items: center; line-height: 1;">
          {{ cell.text }}
          <span [style.visibility]="busy(date) && !cell.outside ? 'visible' : 'hidden'"
                style="width: 4px; height: 4px; margin-top: 2px; border-radius: 50%; background: currentColor;"></span>
        </span>
      </ng-template>
      <andes-calendar locale="en-US" [defaultMonth]="defaultMonth" [cellTemplate]="cell" />
    `,
  }),
};

/**
 * `fullscreen` (Ant's default `Calendar` look): a full-width grid whose cells hold
 * `cellTemplate` content under the day number.
 */
export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    props: {
      defaultMonth: FEBRUARY_2024,
      value: new Date(2024, 1, 14),
      events: {
        '2024-02-05': ['Sprint planning'],
        '2024-02-14': ['Design review', 'Release 2.4'],
        '2024-02-21': ['Retro'],
      } as Record<string, string[]>,
      key: (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    },
    template: `
      <ng-template #cell let-date let-cell="cell">
        @if (cell.view === 'date') {
          @for (event of events[key(date)] ?? []; track event) {
            <div style="overflow: hidden; margin-top: 2px; padding: 1px 4px; border-radius: 4px; background: var(--andes-color-accent); color: var(--andes-color-accent-foreground); white-space: nowrap; text-overflow: ellipsis;">{{ event }}</div>
          }
        }
      </ng-template>
      <div style="padding: 1rem;">
        <andes-calendar fullscreen locale="en-US" [defaultMonth]="defaultMonth" [(value)]="value" [cellTemplate]="cell" />
      </div>
    `,
  }),
};

/**
 * `headerTemplate` (Ant's `headerRender`) replaces the navigation header. The
 * context exposes the visible month plus `goTo` and `setView`.
 */
export const CustomHeader: Story = {
  render: () => ({
    props: {
      defaultMonth: FEBRUARY_2024,
      months: Array.from({ length: 12 }, (_, month) =>
        new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
          new Date(2024, month, 1),
        ),
      ),
      years: [2022, 2023, 2024, 2025, 2026],
      toDate: (year: string | number, month: string | number) =>
        new Date(Number(year), Number(month), 1),
    },
    template: `
      <ng-template #header let-month let-goTo="goTo">
        <div style="display: flex; gap: 0.5rem; font: 0.875rem var(--andes-font-family), sans-serif;">
          <select aria-label="Month" (change)="goTo(toDate(month.getFullYear(), $any($event.target).value))">
            @for (name of months; track $index) { <option [value]="$index" [selected]="$index === month.getMonth()">{{ name }}</option> }
          </select>
          <select aria-label="Year" (change)="goTo(toDate($any($event.target).value, month.getMonth()))">
            @for (year of years; track year) { <option [value]="year" [selected]="year === month.getFullYear()">{{ year }}</option> }
          </select>
        </div>
      </ng-template>
      <andes-calendar locale="en-US" [defaultMonth]="defaultMonth" [headerTemplate]="header" />
    `,
  }),
};
