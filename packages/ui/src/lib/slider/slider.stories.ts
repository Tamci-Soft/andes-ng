import type { Meta, StoryObj } from '@storybook/angular';

import { AndesSlider } from './slider';

const meta: Meta<AndesSlider> = {
  title: 'Slider',
  component: AndesSlider,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'object' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    largeStep: { control: 'number' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    range: { control: 'boolean' },
    disabled: { control: 'boolean' },
    keyboard: { control: 'boolean' },
    dots: { control: 'boolean' },
    included: { control: 'boolean' },
    reverse: { control: 'boolean' },
    tooltip: { control: 'select', options: ['hover', 'always', 'never'] },
    marks: { control: 'object' },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    largeStep: 10,
    orientation: 'horizontal',
    range: false,
    disabled: false,
    keyboard: true,
    dots: false,
    included: true,
    reverse: false,
    tooltip: 'hover',
    marks: [],
  },
  render: (args) => ({
    props: { ...args, value: args.value ?? 40 },
    template: `
      <div style="width: 320px;">
        <andes-slider
          [value]="value"
          [min]="min"
          [max]="max"
          [step]="step"
          [largeStep]="largeStep"
          [orientation]="orientation"
          [range]="range"
          [disabled]="disabled"
          [keyboard]="keyboard"
          [dots]="dots"
          [included]="included"
          [reverse]="reverse"
          [tooltip]="tooltip"
          [marks]="marks"
          aria-label="Volume"
          startAriaLabel="Minimum"
          endAriaLabel="Maximum"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesSlider>;

export const Default: Story = {};

export const Range: Story = {
  args: { range: true, value: [20, 70] },
};

export const Steps: Story = {
  args: { step: 10, value: 30 },
};

export const FractionalStep: Story = {
  args: { min: 0, max: 1, step: 0.1, value: 0.4 },
};

export const Disabled: Story = {
  args: { disabled: true, value: 35 },
};

export const TooltipAlwaysVisible: Story = {
  args: { tooltip: 'always', value: 55 },
};

export const TooltipHidden: Story = {
  args: { tooltip: 'never', value: 55 },
};

export const Marks: Story = {
  args: {
    value: 50,
    marks: [
      { value: 0, label: '0°C' },
      { value: 25, label: '25°C' },
      { value: 50, label: '50°C' },
      { value: 75, label: '75°C' },
      { value: 100, label: '100°C' },
    ],
  },
};

export const MarksOnly: Story = {
  name: 'Marks only (step: null)',
  args: {
    value: 40,
    step: null,
    marks: [
      { value: 0, label: 'Off' },
      { value: 20, label: 'Low' },
      { value: 60, label: 'Mid' },
      { value: 100, label: 'Max' },
    ],
  },
};

export const Dots: Story = {
  args: {
    value: 40,
    dots: true,
    marks: [0, 20, 40, 60, 80, 100],
  },
};

export const NotIncluded: Story = {
  name: 'Point only (included: false)',
  args: { included: false, value: 60 },
};

export const Reversed: Story = {
  args: { reverse: true, value: 25 },
};

export const Vertical: Story = {
  args: { orientation: 'vertical', value: 40 },
  render: (args) => ({
    props: args,
    template: `
      <div style="height: 220px; display: flex; gap: 2rem;">
        <andes-slider orientation="vertical" [value]="40" aria-label="Volume" />
        <andes-slider
          orientation="vertical"
          range
          [value]="[20, 70]"
          startAriaLabel="Minimum"
          endAriaLabel="Maximum"
        />
      </div>
    `,
  }),
};

export const FormattedValue: Story = {
  render: () => ({
    props: { currency: (value: number) => `$${value}` },
    template: `
      <div style="width: 320px;">
        <andes-slider
          range
          [value]="[200, 800]"
          [min]="0"
          [max]="1000"
          [step]="50"
          [valueFormatter]="currency"
          tooltip="always"
          startAriaLabel="Minimum price"
          endAriaLabel="Maximum price"
        />
      </div>
    `,
  }),
};

export const RightToLeft: Story = {
  render: () => ({
    template: `
      <div dir="rtl" style="width: 320px;">
        <andes-slider [value]="25" tooltip="always" aria-label="مستوى الصوت" />
      </div>
    `,
  }),
};

export const WithReactiveForm: Story = {
  render: () => ({
    template: `
      <div style="width: 320px; display: grid; gap: 0.75rem;">
        <andes-slider [(value)]="volume" tooltip="always" aria-label="Volume" />
        <output style="font: 0.875rem var(--andes-font-family, system-ui); color: var(--andes-color-foreground);">
          Value: {{ volume }}
        </output>
      </div>
    `,
    props: { volume: 40 },
  }),
};
