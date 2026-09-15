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
