import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesSlider } from './slider';
import {
  AndesSliderMarkTemplate,
  AndesSliderTooltipTemplate,
} from './slider-templates';

const meta: Meta<AndesSlider> = {
  title: 'Slider',
  component: AndesSlider,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [AndesSliderMarkTemplate, AndesSliderTooltipTemplate],
    }),
  ],
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
    tooltipPlacement: {
      control: 'select',
      options: [undefined, 'top', 'bottom', 'left', 'right'],
    },
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
          [tooltipPlacement]="tooltipPlacement"
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

const log = (label: string) => (value: unknown) =>
  console.log(label, JSON.stringify(value));

export const MarksObject: Story = {
  name: 'Marks (Ant Design keyed object, styled)',
  args: {
    value: 37,
    marks: {
      0: '0°C',
      26: '26°C',
      37: '37°C',
      100: {
        label: '100°C',
        style: { color: 'var(--andes-color-danger)', fontWeight: 600 },
      },
    },
  },
};

export const MarksPointOnly: Story = {
  name: 'Marks, point only (included: false)',
  args: {
    value: 37,
    included: false,
    marks: { 0: '0°C', 26: '26°C', 37: '37°C', 100: '100°C' },
  },
};

export const CustomMarkTemplate: Story = {
  render: () => ({
    template: `
      <div style="width: 320px;">
        <andes-slider [value]="50" [step]="null" [marks]="[0, 25, 50, 75, 100]" aria-label="Opacity">
          <ng-template andesSliderMark let-mark let-active="active">
            <span [style.font-weight]="active ? 600 : 400">{{ mark.value }}%</span>
          </ng-template>
        </andes-slider>
      </div>
    `,
  }),
};

export const DotsAtEveryStep: Story = {
  name: 'Dots at every step (dots, no marks)',
  args: { value: 40, dots: true, step: 10 },
};

export const TooltipPlacement: Story = {
  render: () => ({
    template: `
      <div style="width: 320px; display: grid; gap: 3rem; padding: 2.5rem 3rem;">
        <andes-slider [value]="30" tooltip="always" tooltipPlacement="top" aria-label="Top" />
        <andes-slider [value]="50" tooltip="always" tooltipPlacement="bottom" aria-label="Bottom" />
        <div style="height: 160px; display: flex; gap: 5rem; justify-content: center;">
          <andes-slider orientation="vertical" [value]="40" tooltip="always" tooltipPlacement="left" aria-label="Left" />
          <andes-slider orientation="vertical" [value]="60" tooltip="always" aria-label="Default (inline end)" />
        </div>
      </div>
    `,
  }),
};

export const TooltipFormatter: Story = {
  name: 'Tooltip formatter (null hides)',
  render: () => ({
    props: {
      percent: (value: number) => (value === 0 ? null : `${value}%`),
      spoken: (value: number) => `${value} percent`,
    },
    template: `
      <div style="width: 320px; padding-top: 2rem;">
        <!-- Tooltip shows "30%", aria-valuetext reads "30 percent"; drag to 0 and it hides. -->
        <andes-slider
          range
          [value]="[0, 30]"
          tooltip="always"
          [tooltipFormatter]="percent"
          [valueFormatter]="spoken"
          startAriaLabel="Start"
          endAriaLabel="End"
        />
      </div>
    `,
  }),
};

export const CustomTooltipTemplate: Story = {
  render: () => ({
    template: `
      <div style="width: 320px; padding-top: 2.5rem;">
        <andes-slider range [value]="[20, 60]" tooltip="always" startAriaLabel="From" endAriaLabel="To">
          <ng-template andesSliderTooltip let-value let-index="index">
            <strong>{{ index === 0 ? 'From' : 'To' }}</strong> {{ value }}h
          </ng-template>
        </andes-slider>
      </div>
    `,
  }),
};

export const DraggableTrack: Story = {
  args: { range: { draggableTrack: true }, value: [20, 50], step: 5 },
};

export const EditableRange: Story = {
  name: 'Editable range (click to add, Delete or drag off to remove)',
  render: () => ({
    props: {
      stops: [20, 80],
      range: { editable: true, minCount: 1, maxCount: 5 },
      label: (index: number, count: number) => `Stop ${index + 1} of ${count}`,
    },
    template: `
      <div style="width: 320px; display: grid; gap: 0.75rem;">
        <andes-slider [range]="range" [(value)]="stops" [thumbAriaLabel]="label" aria-label="Gradient stops" />
        <output style="font: 0.875rem var(--andes-font-family), sans-serif; color: var(--andes-color-foreground);">
          Stops: {{ stops.join(", ") }}
        </output>
      </div>
    `,
  }),
};

export const MultipleHandles: Story = {
  args: { range: true, value: [10, 40, 70] },
  render: (args) => ({
    props: {
      ...args,
      label: (index: number) => ['Low', 'Mid', 'High'][index] ?? 'Handle',
    },
    template: `
      <div style="width: 320px;">
        <andes-slider [range]="range" [value]="value" [thumbAriaLabel]="label" aria-label="Thresholds" />
      </div>
    `,
  }),
};

export const PerHandleDisabled: Story = {
  name: 'Per-handle disabled',
  render: () => ({
    template: `
      <div style="width: 320px;">
        <andes-slider range [value]="[20, 60]" [disabled]="[true, false]" startAriaLabel="Floor (locked)" endAriaLabel="Ceiling" />
      </div>
    `,
  }),
};

export const ChangeVsChangeComplete: Story = {
  name: 'valueChange vs valueCommit (onChangeComplete)',
  render: () => ({
    props: {
      onChange: log('valueChange'),
      onComplete: log('valueCommit'),
    },
    template: `
      <div style="width: 320px;">
        <andes-slider
          [value]="30"
          (valueChange)="onChange($event)"
          (valueCommit)="onComplete($event)"
          aria-label="Volume"
        />
      </div>
    `,
  }),
};

export const AutoFocus: Story = {
  // Kept off the docs page: it would steal focus from the other stories there.
  tags: ['!autodocs'],
  render: () => ({
    template: `
      <div style="width: 320px;">
        <andes-slider autoFocus [value]="30" aria-label="Volume" />
      </div>
    `,
  }),
};

export const CustomColors: Story = {
  name: 'Custom colors (CSS custom properties)',
  render: () => ({
    template: `
      <div
        style="
          width: 320px;
          --andes-slider-rail-color: var(--andes-color-border);
          --andes-slider-track-color: var(--andes-color-success);
          --andes-slider-handle-color: var(--andes-color-success);
          --andes-slider-handle-hover-color: var(--andes-color-success-hover);
          --andes-slider-dot-active-color: var(--andes-color-success);
        "
      >
        <andes-slider [value]="60" [step]="20" dots aria-label="Progress" />
      </div>
    `,
  }),
};
