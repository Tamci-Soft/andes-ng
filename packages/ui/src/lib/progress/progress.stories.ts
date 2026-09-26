import type { Meta, StoryObj } from '@storybook/angular';

import { AndesProgress } from './progress';

const meta: Meta<AndesProgress> = {
  title: 'Progress',
  component: AndesProgress,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'small', 'default'],
    },
    type: { control: 'select', options: ['line', 'circle', 'dashboard'] },
    status: {
      control: 'select',
      options: [undefined, 'normal', 'success', 'exception', 'active'],
    },
    showInfo: { control: 'boolean' },
  },
  args: {
    value: 42,
    min: 0,
    max: 100,
    variant: 'primary',
    size: 'md',
    type: 'line',
  },
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;"><andes-progress [value]="value" [min]="min" [max]="max" [variant]="variant" [size]="size" [type]="type" [status]="status" [showInfo]="showInfo" aria-label="Progress" /></div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesProgress>;

export const Determinate: Story = {
  args: { value: 42 },
};

export const Indeterminate: Story = {
  args: { value: null },
};

export const Complete: Story = {
  args: { value: 100 },
};

export const Empty: Story = {
  args: { value: 0 },
};

export const Success: Story = {
  args: { value: 100, variant: 'success' },
};

export const Warning: Story = {
  args: { value: 65, variant: 'warning' },
};

export const Danger: Story = {
  args: { value: 20, variant: 'danger' },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const CustomRange: Story = {
  args: { value: 140, min: 50, max: 200 },
};

export const WithValueText: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;"><andes-progress [value]="value" aria-label="Upload progress" aria-valuetext="56 of 100 files uploaded" /></div>`,
  }),
};

export const AllSizes: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
        <andes-progress size="sm" [value]="value" aria-label="Small progress" />
        <andes-progress size="md" [value]="value" aria-label="Medium progress" />
        <andes-progress size="lg" [value]="value" aria-label="Large progress" />
      </div>
    `,
  }),
};

export const AllVariants: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
        <andes-progress variant="primary" [value]="value" aria-label="Primary progress" />
        <andes-progress variant="success" [value]="value" aria-label="Success progress" />
        <andes-progress variant="warning" [value]="value" aria-label="Warning progress" />
        <andes-progress variant="danger" [value]="value" aria-label="Danger progress" />
      </div>
    `,
  }),
};

// --- Extended options -------------------------------------------------------

export const WithInfo: Story = {
  args: { value: 42, showInfo: true },
};

export const Circle: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <andes-progress type="circle" [percent]="75" aria-label="Circle 75%" />
        <andes-progress type="circle" [percent]="70" status="exception" aria-label="Circle failed" />
        <andes-progress type="circle" [percent]="100" status="success" aria-label="Circle done" />
        <andes-progress type="circle" aria-label="Circle loading" />
      </div>
    `,
  }),
};

export const CircleSizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <andes-progress type="circle" size="small" [percent]="30" aria-label="Small circle" />
        <andes-progress type="circle" [size]="80" [percent]="50" aria-label="80px circle" />
        <andes-progress type="circle" [percent]="70" aria-label="Default circle" />
        <andes-progress type="circle" size="lg" [percent]="90" aria-label="Large circle" />
        <span>Inline <andes-progress type="circle" [size]="14" [percent]="60" aria-label="Tiny circle" /> ring</span>
      </div>
    `,
  }),
};

export const Dashboard: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
        <andes-progress type="dashboard" [percent]="75" aria-label="Dashboard" />
        <andes-progress type="dashboard" [percent]="75" [gapDegree]="30" aria-label="Dashboard 30deg gap" />
        <andes-progress type="dashboard" [percent]="75" [gapDegree]="180" aria-label="Dashboard half" />
        <andes-progress type="dashboard" aria-label="Dashboard loading" />
      </div>
    `,
  }),
};

export const DashboardGapPlacement: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <andes-progress type="dashboard" size="small" [percent]="60" gapPlacement="top" aria-label="Gap top" />
        <andes-progress type="dashboard" size="small" [percent]="60" gapPlacement="bottom" aria-label="Gap bottom" />
        <andes-progress type="dashboard" size="small" [percent]="60" gapPlacement="start" aria-label="Gap start" />
        <andes-progress type="dashboard" size="small" [percent]="60" gapPlacement="end" aria-label="Gap end" />
      </div>
    `,
  }),
};

export const Statuses: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
        <andes-progress [percent]="30" [showInfo]="true" aria-label="Normal" />
        <andes-progress [percent]="50" status="active" [showInfo]="true" aria-label="Active" />
        <andes-progress [percent]="70" status="exception" [showInfo]="true" aria-label="Exception" aria-valuetext="70%, failed" />
        <andes-progress [percent]="100" status="success" [showInfo]="true" aria-label="Success" aria-valuetext="100%, complete" />
      </div>
    `,
  }),
};

export const SuccessSegment: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <div style="width: 320px;">
          <andes-progress [percent]="60" [success]="{ percent: 30 }" [showInfo]="true" aria-label="Line with success segment" />
        </div>
        <andes-progress type="circle" [percent]="60" [success]="{ percent: 30 }" aria-label="Circle with success segment" />
        <andes-progress type="dashboard" [percent]="60" [success]="{ percent: 30 }" aria-label="Dashboard with success segment" />
      </div>
    `,
  }),
};

export const CustomFormat: Story = {
  render: () => ({
    props: {
      days: (percent: number) => `${Math.round(percent / 10)} of 10 days`,
      withSuccess: (percent: number, success: number | undefined) =>
        `${percent}% (${success ?? 0}% verified)`,
    },
    template: `
      <ng-template #doneTpl let-percent>
        <strong>{{ percent === 100 ? 'Done' : percent + '%' }}</strong>
      </ng-template>
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <andes-progress type="circle" [percent]="75" [format]="days" aria-label="Days elapsed" />
        <andes-progress type="circle" [percent]="100" [format]="doneTpl" aria-label="Task" aria-valuetext="Done" />
        <div style="width: 320px;">
          <andes-progress [percent]="60" [success]="{ percent: 30 }" [showInfo]="true" [format]="withSuccess" aria-label="Verification" />
        </div>
      </div>
    `,
  }),
};

export const GradientStroke: Story = {
  render: () => ({
    props: {
      fromTo: { from: '#108ee9', to: '#87d068' },
      stops: { '0%': '#108ee9', '100%': '#87d068' },
    },
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
          <andes-progress [percent]="99.9" [strokeColor]="fromTo" [showInfo]="true" aria-label="Gradient line" />
          <andes-progress [percent]="50" status="active" [strokeColor]="stops" [showInfo]="true" aria-label="Gradient active line" />
        </div>
        <andes-progress type="circle" [percent]="90" [strokeColor]="stops" aria-label="Gradient circle" />
        <andes-progress type="dashboard" [percent]="90" [strokeColor]="stops" aria-label="Gradient dashboard" />
      </div>
    `,
  }),
};

export const StrokeAndTrail: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
          <andes-progress [percent]="60" strokeColor="#7c3aed" trailColor="#ede9fe" [showInfo]="true" aria-label="Custom colors" />
          <andes-progress [percent]="60" strokeLinecap="butt" [strokeWidth]="12" [showInfo]="true" aria-label="Butt linecap" />
        </div>
        <andes-progress type="circle" [percent]="75" strokeLinecap="butt" aria-label="Butt ring" />
        <andes-progress type="circle" [percent]="75" [strokeWidth]="12" aria-label="Thick ring" />
      </div>
    `,
  }),
};

export const Steps: Story = {
  render: () => ({
    props: {
      colors: ['#16a34a', '#16a34a', '#dc2626'],
    },
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <andes-progress [percent]="50" [steps]="3" [showInfo]="true" aria-label="3 steps" />
          <andes-progress [percent]="30" [steps]="5" [showInfo]="true" aria-label="5 steps" />
          <andes-progress [percent]="100" [steps]="5" size="small" strokeColor="#16a34a" [showInfo]="true" aria-label="Small steps" />
          <andes-progress [percent]="100" [steps]="3" [strokeColor]="colors" [showInfo]="true" aria-label="Colored steps" />
        </div>
        <andes-progress type="circle" [percent]="60" [steps]="{ count: 5, gap: 4 }" aria-label="Circle steps" />
        <andes-progress type="dashboard" [percent]="50" [steps]="8" aria-label="Dashboard steps" />
      </div>
    `,
  }),
};

export const FlexibleSizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 360px;">
        <andes-progress [percent]="50" size="small" [showInfo]="true" aria-label="Small" />
        <andes-progress [percent]="50" size="default" [showInfo]="true" aria-label="Default" />
        <andes-progress [percent]="50" [size]="[240, 20]" [showInfo]="true" aria-label="240 by 20" />
        <andes-progress [percent]="50" [size]="{ width: '60%', height: 4 }" [showInfo]="true" aria-label="60 percent wide" />
      </div>
    `,
  }),
};

export const PercentPosition: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 360px;">
        <andes-progress [percent]="60" [showInfo]="true" [percentPosition]="{ align: 'start', type: 'outer' }" aria-label="Outer start" />
        <andes-progress [percent]="60" [showInfo]="true" [percentPosition]="{ align: 'center', type: 'outer' }" aria-label="Outer center" />
        <andes-progress [percent]="60" [showInfo]="true" [percentPosition]="{ align: 'start', type: 'inner' }" [size]="[360, 20]" aria-label="Inner start" />
        <andes-progress [percent]="60" [showInfo]="true" [percentPosition]="{ align: 'center', type: 'inner' }" [size]="[360, 20]" variant="success" aria-label="Inner center" />
        <andes-progress [percent]="60" [showInfo]="true" [percentPosition]="{ align: 'end', type: 'inner' }" [size]="[360, 20]" variant="warning" aria-label="Inner end" />
        <andes-progress [percent]="60" [showInfo]="true" [percentPosition]="{ type: 'inner' }" [size]="[360, 20]" variant="danger" aria-label="Inner danger" />
      </div>
    `,
  }),
};
