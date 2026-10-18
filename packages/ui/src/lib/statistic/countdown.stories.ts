import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesCountdown } from './countdown';

const inMs = (ms: number) => Date.now() + ms;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const meta: Meta<AndesCountdown> = {
  title: 'Countdown',
  component: AndesCountdown,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesCountdown, AndesButton] })],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    format: { control: 'text' },
    mode: { control: 'inline-radio', options: ['down', 'up'] },
    size: { control: 'inline-radio', options: ['small', 'default', 'large'] },
    autoStart: { control: 'boolean' },
    interval: { control: 'number' },
  },
  args: {
    title: 'Flash sale ends in',
    format: 'HH:mm:ss',
    mode: 'down',
    size: 'default',
    autoStart: true,
    interval: 1000,
  },
  render: (args) => ({
    props: { ...args, deadline: inMs(2 * HOUR + 15 * 60_000) },
    template: `
      <andes-countdown
        [title]="title"
        [value]="deadline"
        [format]="format"
        [mode]="mode"
        [size]="size"
        [autoStart]="autoStart"
        [interval]="interval"
      />`,
  }),
};

export default meta;

type Story = StoryObj<AndesCountdown>;

export const Default: Story = {};

export const Days: Story = {
  args: { title: 'Quarter closes in', format: 'D [days] HH:mm:ss' },
  render: (args) => ({
    props: { ...args, deadline: inMs(12 * DAY + 5 * HOUR) },
    template: `<andes-countdown [title]="title" [value]="deadline" [format]="format" />`,
  }),
};

export const DaysAndHoursOnly: Story = {
  render: () => ({
    props: { deadline: inMs(3 * DAY + 7 * HOUR) },
    template: `<andes-countdown title="Warranty ends in" [value]="deadline" format="D [d] HH [h]" />`,
  }),
};

export const Milliseconds: Story = {
  render: () => ({
    props: { deadline: inMs(90_000) },
    template: `<andes-countdown title="Auction closes in" [value]="deadline" format="mm:ss.SSS" />`,
  }),
};

export const CountUp: Story = {
  render: () => ({
    props: { since: inMs(-(3 * HOUR + 25 * 60_000)) },
    template: `<andes-countdown title="Machine running for" [value]="since" mode="up" format="HH:mm:ss" />`,
  }),
};

export const AffixesAndExtra: Story = {
  render: () => ({
    props: { deadline: inMs(45 * 60_000) },
    template: `
      <andes-countdown title="Reservation expires in" [value]="deadline" format="mm:ss" suffix="min">
        Seats are released afterwards
      </andes-countdown>`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    props: { deadline: inMs(DAY) },
    template: `
      <div style="display:flex; gap: 3rem; align-items: flex-end">
        <andes-countdown title="Small" [value]="deadline" size="small" />
        <andes-countdown title="Default" [value]="deadline" />
        <andes-countdown title="Large" [value]="deadline" size="large" />
      </div>`,
  }),
};

export const FinishEvent: Story = {
  render: () => ({
    props: {
      deadline: inMs(6000),
      message: 'Waiting...',
      done() {
        (this as { message: string }).message =
          'Finished: the offer has expired.';
      },
    },
    template: `
      <andes-countdown title="Offer ends in" [value]="deadline" format="mm:ss" (finish)="done()" />
      <p style="margin-top: 1rem; font-size: .875rem">{{ message }}</p>`,
  }),
};

export const AlreadyExpired: Story = {
  render: () => ({
    props: { deadline: inMs(-1000) },
    template: `<andes-countdown title="Promo ended" [value]="deadline" />`,
  }),
};

export const StartAndStop: Story = {
  render: () => ({
    props: { since: Date.now() },
    template: `
      <andes-countdown #timer title="Stopwatch" [value]="since" mode="up" format="mm:ss.S" [autoStart]="false" />
      <div style="display:flex; gap: .5rem; margin-top: 1rem">
        <andes-button size="sm" (click)="timer.start()">Start</andes-button>
        <andes-button size="sm" variant="outline" (click)="timer.stop()">Stop</andes-button>
      </div>
      <p style="font-size: .75rem; margin-top: .5rem">Resuming jumps to the real clock: the target is an absolute moment.</p>`,
  }),
};
