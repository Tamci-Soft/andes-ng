import { signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesRate } from './rate';
import { AndesRateCharacter } from './rate-character';

const meta: Meta<AndesRate> = {
  title: 'Rate',
  component: AndesRate,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [AndesRateCharacter, ReactiveFormsModule] }),
  ],
  parameters: { layout: 'padded' },
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 10, step: 0.5 } },
    count: { control: 'number' },
    allowHalf: { control: 'boolean' },
    allowClear: { control: 'boolean' },
    readonly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    size: { control: 'text' },
    color: { control: 'color' },
    tooltips: { control: 'object' },
  },
  args: {
    value: 3,
    count: 5,
    allowHalf: false,
    allowClear: true,
    readonly: false,
    disabled: false,
    size: 'md',
    tooltips: [],
  },
  render: (args) => ({
    props: args,
    template: `<andes-rate [value]="value" [count]="count" [allowHalf]="allowHalf" [allowClear]="allowClear" [readonly]="readonly" [disabled]="disabled" [size]="size" [color]="color" [tooltips]="tooltips" aria-label="Rating" />`,
  }),
};

export default meta;
type Story = StoryObj<AndesRate>;

const surface =
  'font: 14px/22px var(--andes-font-family, system-ui), sans-serif; color: var(--andes-color-foreground);';
const col = `${surface} display: grid; gap: 1rem; justify-items: start;`;
const caption =
  'font-size: 12px; line-height: 20px; color: var(--andes-color-muted-foreground);';

export const Playground: Story = {};

export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Click, hover to preview, or use the keyboard: arrows move by one, Home and End jump to 0 and the last character, a digit key sets that number.',
      },
    },
  },
  render: () => ({
    props: { score: signal(3) },
    template: `
      <div style="${col}">
        <andes-rate [(value)]="score" aria-label="Rate this order" />
        <span style="${caption}">Selected: {{ score() }}</span>
      </div>`,
  }),
};

export const HalfStars: Story = {
  render: () => ({
    props: { score: signal(2.5) },
    template: `
      <div style="${col}">
        <andes-rate [(value)]="score" allowHalf aria-label="Rate this order" />
        <span style="${caption}">Selected: {{ score() }} (arrows move by half)</span>
      </div>`,
  }),
};

export const AllowClear: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'By default, clicking the character that already matches the value clears the rating. Turn it off to keep the choice.',
      },
    },
  },
  render: () => ({
    props: { a: signal(3), b: signal(3) },
    template: `
      <div style="${col}">
        <div><andes-rate [(value)]="a" aria-label="Clearable" /> <span style="${caption}">clears on a second click</span></div>
        <div><andes-rate [(value)]="b" [allowClear]="false" aria-label="Not clearable" /> <span style="${caption}">stays selected</span></div>
      </div>`,
  }),
};

export const ReadonlyAverage: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Read-only shows any value with partial fill: 3.7 fills 70% of the fourth character. It stays focusable and reads "3.7 of 5".',
      },
    },
  },
  render: () => ({
    template: `
      <div style="${col}">
        <div style="display: flex; align-items: center; gap: 0.5rem;"><andes-rate [value]="4.5" readonly aria-label="Average rating" /> <span>4.5</span></div>
        <div style="display: flex; align-items: center; gap: 0.5rem;"><andes-rate [value]="3.7" readonly aria-label="Average rating" /> <span>3.7</span></div>
        <div style="display: flex; align-items: center; gap: 0.5rem;"><andes-rate [value]="1.2" readonly aria-label="Average rating" /> <span>1.2</span></div>
      </div>`,
  }),
};

export const Disabled: Story = {
  render: () => ({
    template: `<andes-rate [value]="3" disabled aria-label="Rating (unavailable)" />`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="${col}">
        <andes-rate [value]="3" size="sm" aria-label="Small" />
        <andes-rate [value]="3" size="md" aria-label="Medium" />
        <andes-rate [value]="3" size="lg" aria-label="Large" />
        <andes-rate [value]="3" [size]="40" aria-label="40 pixels" />
      </div>`,
  }),
};

export const CustomCount: Story = {
  render: () => ({
    props: { score: signal(7) },
    template: `
      <div style="${col}">
        <andes-rate [(value)]="score" [count]="10" aria-label="Likelihood to recommend" />
        <span style="${caption}">{{ score() }} / 10</span>
      </div>`,
  }),
};

export const Tooltips: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'One text per character: shown in a bubble on hover and focus, and used as the value read by screen readers.',
      },
    },
  },
  render: () => ({
    props: {
      score: signal(3),
      labels: ['Terrible', 'Bad', 'Fair', 'Good', 'Excellent'],
    },
    template: `
      <div style="${col}; padding-top: 2rem;">
        <andes-rate [(value)]="score" [tooltips]="labels" aria-label="Rate the service" />
        <span style="${caption}">{{ score() ? labels[score() - 1] : 'No rating yet' }}</span>
      </div>`,
  }),
};

export const Color: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`color` (or the `--andes-rate-color` / `--andes-rate-empty-color` custom properties) changes the fill.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="${col}">
        <andes-rate [value]="4" color="var(--andes-color-danger)" aria-label="Red" />
        <andes-rate [value]="4" color="var(--andes-color-success)" aria-label="Green" />
        <andes-rate [value]="4" style="--andes-rate-color: var(--andes-color-primary);" aria-label="Primary" />
      </div>`,
  }),
};

export const CustomCharacter: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`character` takes text, a function of the position, or a template; the `andesRateCharacter` template child does the same declaratively.',
      },
    },
  },
  render: () => ({
    props: {
      letters: (index: number) => 'ABCDE'[index],
    },
    template: `
      <div style="${col}">
        <andes-rate [value]="3" character="♥" size="lg" color="var(--andes-color-danger)" aria-label="Hearts" />
        <andes-rate [value]="3" [character]="letters" size="lg" aria-label="Grades" />
        <andes-rate [value]="2" size="lg" aria-label="Numbers">
          <ng-template andesRateCharacter let-index>{{ index + 1 }}</ng-template>
        </andes-rate>
        <andes-rate [value]="3" size="lg" aria-label="Thumbs">
          <ng-template andesRateCharacter let-filled="filled">
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [attr.fill]="filled ? 'currentColor' : 'none'" aria-hidden="true">
              <path d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.5l-1.7 7a2 2 0 0 1-1.9 1.5H7V10l4-8a3 3 0 0 1 4 3.9Z" />
            </svg>
          </ng-template>
        </andes-rate>
      </div>`,
  }),
};

export const HoverEvents: Story = {
  render: () => ({
    props: { hover: signal<number | undefined>(undefined), score: signal(0) },
    template: `
      <div style="${col}">
        <andes-rate [(value)]="score" allowHalf (hoverChange)="hover.set($event)" aria-label="Rate" />
        <span style="${caption}">Hovering: {{ hover() ?? 'nothing' }} - selected: {{ score() }}</span>
      </div>`,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    props: { control: new FormControl(4) },
    template: `
      <div style="${col}">
        <andes-rate [formControl]="control" aria-label="Satisfaction" />
        <span style="${caption}">Control value: {{ control.value }} - touched: {{ control.touched }}</span>
        <button type="button" style="font: inherit; padding: 0 12px; height: 32px; border-radius: var(--andes-radius-md, 8px); border: 1px solid var(--andes-color-input); background: var(--andes-color-background); color: inherit; cursor: pointer;" (click)="control.disabled ? control.enable() : control.disable()">Toggle disabled</button>
      </div>`,
  }),
};

export const RightToLeft: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'In a right-to-left layout the fill starts from the right, a half character is the right half, and Left / Right swap.',
      },
    },
  },
  render: () => ({
    template: `
      <div dir="rtl" style="${col}">
        <andes-rate [value]="2.5" allowHalf aria-label="التقييم" />
        <andes-rate [value]="3.7" readonly aria-label="المتوسط" />
      </div>`,
  }),
};
