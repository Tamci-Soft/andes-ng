import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesStatistic } from './statistic';

const meta: Meta<AndesStatistic> = {
  title: 'Statistic',
  component: AndesStatistic,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesStatistic, AndesButton] })],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    value: { control: 'text' },
    precision: { control: 'number' },
    prefix: { control: 'text' },
    suffix: { control: 'text' },
    locale: { control: 'text' },
    size: { control: 'inline-radio', options: ['small', 'default', 'large'] },
    grouping: { control: 'boolean' },
    loading: { control: 'boolean' },
    trend: { control: 'inline-radio', options: [undefined, 'up', 'down'] },
    favorable: { control: 'inline-radio', options: ['up', 'down'] },
  },
  args: {
    title: 'Active customers',
    value: 112893,
    size: 'default',
    grouping: true,
    loading: false,
    favorable: 'up',
  },
  render: (args) => ({
    props: args,
    template: `
      <andes-statistic
        [title]="title"
        [value]="value"
        [precision]="precision"
        [prefix]="prefix"
        [suffix]="suffix"
        [locale]="locale"
        [size]="size"
        [grouping]="grouping"
        [loading]="loading"
        [trend]="trend"
        [favorable]="favorable"
      />`,
  }),
};

export default meta;

type Story = StoryObj<AndesStatistic>;

export const Default: Story = {};

export const Precision: Story = {
  args: { title: 'Average order value', value: 1284.5, precision: 2 },
};

export const Currency: Story = {
  render: () => ({
    props: { opts: { style: 'currency', currency: 'PEN' } },
    template: `
      <andes-statistic title="Revenue" [value]="1284500.5" locale="es-PE" [formatOptions]="opts" />`,
  }),
};

export const Compact: Story = {
  render: () => ({
    props: { opts: { notation: 'compact', maximumFractionDigits: 1 } },
    template: `
      <div style="display:flex; gap: 3rem">
        <andes-statistic title="Page views" [value]="1534000" locale="en-US" [formatOptions]="opts" />
        <andes-statistic title="Units shipped" [value]="48200" locale="en-US" [formatOptions]="opts" />
      </div>`,
  }),
};

export const Locales: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap: 3rem; flex-wrap: wrap">
        <andes-statistic title="en-US" [value]="1234567.891" locale="en-US" [precision]="2" />
        <andes-statistic title="de-DE" [value]="1234567.891" locale="de-DE" [precision]="2" />
        <andes-statistic title="fr-FR" [value]="1234567.891" locale="fr-FR" [precision]="2" />
        <andes-statistic title="es-PE" [value]="1234567.891" locale="es-PE" [precision]="2" />
      </div>`,
  }),
};

export const Separators: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap: 3rem; flex-wrap: wrap">
        <andes-statistic title="Custom separators" [value]="1234567.5" groupSeparator=" " decimalSeparator="," [precision]="2" />
        <andes-statistic title="No grouping" [value]="1234567" [grouping]="false" />
      </div>`,
  }),
};

export const Affixes: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap: 3rem; flex-wrap: wrap">
        <andes-statistic title="Uptime" [value]="99.982" [precision]="2" suffix="%" />
        <andes-statistic title="Balance" [value]="4120" prefix="S/" />
        <andes-statistic title="Capacity" [value]="72" [suffix]="unitTpl" />
      </div>
      <ng-template #unitTpl><span style="color: var(--andes-color-muted-foreground)">/ 100 seats</span></ng-template>`,
  }),
};

export const TemplateTitle: Story = {
  render: () => ({
    template: `
      <andes-statistic [title]="titleTpl" [value]="37" />
      <ng-template #titleTpl><span>Open tickets <em style="font-size: .75rem">(last 24h)</em></span></ng-template>`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap: 3rem; align-items: flex-end">
        <andes-statistic title="Small" [value]="1280" size="small" />
        <andes-statistic title="Default" [value]="1280" />
        <andes-statistic title="Large" [value]="1280" size="large" />
      </div>`,
  }),
};

export const Loading: Story = {
  args: { loading: true },
};

export const Trend: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap: 3rem; flex-wrap: wrap">
        <andes-statistic title="Sales" [value]="11.28" [precision]="2" suffix="%" trend="up" />
        <andes-statistic title="Returns" [value]="9.3" [precision]="1" suffix="%" trend="down" />
        <andes-statistic title="Unit cost" [value]="4.2" [precision]="2" prefix="$" trend="down" favorable="down" />
        <andes-statistic title="Without arrow" [value]="18" trend="up" [trendIcon]="false" />
      </div>`,
  }),
};

export const StyledWithProperties: Story = {
  render: () => ({
    template: `
      <andes-statistic
        title="Margin"
        [value]="38.4"
        [precision]="1"
        suffix="%"
        style="
          --andes-statistic-title-color: var(--andes-color-primary-text, #2563eb);
          --andes-statistic-value-color: var(--andes-color-primary-text, #2563eb);
          --andes-statistic-value-size: 2.5rem;
          --andes-statistic-value-line-height: 3rem;
          --andes-statistic-value-weight: 500;
          --andes-statistic-decimal-size: 1.5rem;
        "
      />`,
  }),
};

export const CustomFormatter: Story = {
  render: () => ({
    props: {
      hours: (value: string | number | bigint) => {
        const minutes = Math.round(Number(value) * 60);
        return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
      },
    },
    template: `<andes-statistic title="Time on site" [value]="2.75" [formatter]="hours" />`,
  }),
};

export const NonNumericAndEmpty: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap: 3rem">
        <andes-statistic title="Status" value="On track" />
        <andes-statistic title="Not computed" [value]="null" />
      </div>`,
  }),
};

export const DashboardRow: Story = {
  render: () => ({
    template: `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 1.5rem; max-width: 44rem; padding: 1rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-lg)">
        <andes-statistic title="Revenue" [value]="48210" prefix="$" trend="up">
          +12.4% vs last month
        </andes-statistic>
        <andes-statistic title="Refunds" [value]="1130" prefix="$" trend="down" favorable="down">
          -3.1% vs last month
        </andes-statistic>
        <andes-statistic title="Open invoices" [value]="64">
          9 overdue
        </andes-statistic>
      </div>`,
  }),
};

export const Interactive: Story = {
  render: () => ({
    props: {
      loading: true,
      value: 0,
      reload(this: { loading: boolean; value: number }) {
        this.loading = true;
        setTimeout(() => {
          this.value = Math.round(Math.random() * 90000);
          this.loading = false;
        }, 900);
      },
    },
    template: `
      <andes-statistic title="Orders today" [value]="value" [loading]="loading" />
      <andes-button style="margin-top: 1rem" variant="outline" (click)="reload()">Refresh</andes-button>`,
  }),
};
