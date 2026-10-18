import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesDivider } from './divider';

const meta: Meta<AndesDivider> = {
  title: 'Divider',
  component: AndesDivider,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesButton] })],
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    variant: { control: 'select', options: ['solid', 'dashed', 'dotted'] },
    dashed: { control: 'boolean' },
    dotted: { control: 'boolean' },
    align: { control: 'select', options: ['start', 'center', 'end'] },
    orientationMargin: { control: 'text' },
    plain: { control: 'boolean' },
    size: { control: 'text' },
    decorative: { control: 'boolean' },
  },
  args: {
    orientation: 'horizontal',
    variant: 'solid',
    dashed: false,
    dotted: false,
    align: 'center',
    plain: false,
    size: 'md',
    decorative: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 32rem; font: 14px/22px var(--andes-font-family, system-ui), sans-serif; color: var(--andes-color-foreground);">
        <p style="margin: 0;">Invoices are issued on the first business day of each month.</p>
        <andes-divider
          [orientation]="orientation"
          [variant]="variant"
          [dashed]="dashed"
          [dotted]="dotted"
          [align]="align"
          [orientationMargin]="orientationMargin"
          [plain]="plain"
          [size]="size"
          [decorative]="decorative"
        >Billing</andes-divider>
        <p style="margin: 0;">Payments received after the due date accrue late fees.</p>
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<AndesDivider>;

const wrap = (inner: string) =>
  `<div style="max-width: 32rem; font: 14px/22px var(--andes-font-family, system-ui), sans-serif; color: var(--andes-color-foreground);">${inner}</div>`;

export const Playground: Story = {};

export const Horizontal: Story = {
  render: () => ({
    template: wrap(`
      <p style="margin: 0;">Order summary</p>
      <andes-divider />
      <p style="margin: 0;">Shipping details</p>
      <andes-divider />
      <p style="margin: 0;">Payment method</p>`),
  }),
};

export const WithText: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Projected content is the label. `align` moves it to the start or end; `orientationMargin` sets how far the short line runs before the text.',
      },
    },
  },
  render: () => ({
    template: wrap(`
      <andes-divider>Centered</andes-divider>
      <andes-divider align="start">Start</andes-divider>
      <andes-divider align="end">End</andes-divider>
      <andes-divider align="start" [orientationMargin]="0">No offset</andes-divider>
      <andes-divider align="start" [orientationMargin]="48">48px offset</andes-divider>
      <andes-divider align="end" orientationMargin="20%">20% offset</andes-divider>`),
  }),
};

export const PlainText: Story = {
  render: () => ({
    template: wrap(`
      <andes-divider>Medium weight (default)</andes-divider>
      <andes-divider plain>Plain text</andes-divider>`),
  }),
};

export const LineStyles: Story = {
  render: () => ({
    template: wrap(`
      <andes-divider>Solid</andes-divider>
      <andes-divider variant="dashed">Dashed</andes-divider>
      <andes-divider variant="dotted">Dotted</andes-divider>
      <andes-divider dashed />
      <andes-divider dotted />`),
  }),
};

export const Spacing: Story = {
  render: () => ({
    template: wrap(`
      <p style="margin: 0;">sm (8px)</p>
      <andes-divider size="sm" />
      <p style="margin: 0;">md (16px, default)</p>
      <andes-divider />
      <p style="margin: 0;">lg (24px)</p>
      <andes-divider size="lg" />
      <p style="margin: 0;">custom (40px)</p>
      <andes-divider [size]="40" />
      <p style="margin: 0;">end</p>`),
  }),
};

export const VerticalBetweenText: Story = {
  render: () => ({
    template: wrap(`
      <p style="margin: 0;">
        Overview<andes-divider orientation="vertical" />
        Activity<andes-divider orientation="vertical" variant="dashed" />
        Settings<andes-divider orientation="vertical" variant="dotted" />
        Billing
      </p>`),
  }),
};

export const VerticalBetweenButtons: Story = {
  render: () => ({
    template: wrap(`
      <div style="display: flex; align-items: center;">
        <andes-button variant="ghost" size="sm">Edit</andes-button>
        <andes-divider orientation="vertical" decorative />
        <andes-button variant="ghost" size="sm">Duplicate</andes-button>
        <andes-divider orientation="vertical" decorative />
        <andes-button variant="ghost" size="sm">Archive</andes-button>
      </div>`),
  }),
};

export const Decorative: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A decorative divider has `role="none"` and no ARIA, so assistive technology skips it. Leave it off when the line really separates two regions.',
      },
    },
  },
  render: () => ({
    template: wrap(`
      <p style="margin: 0;">Visible rhythm only</p>
      <andes-divider decorative />
      <p style="margin: 0;">Not announced as a separator</p>`),
  }),
};

export const SeparatorAlias: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`andes-separator` is the same component under its other common name.',
      },
    },
  },
  render: () => ({
    template: wrap(`
      <p style="margin: 0;">Above</p>
      <andes-separator />
      <p style="margin: 0;">Below</p>`),
  }),
};

export const CustomColor: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Colour, thickness and spacing are CSS custom properties: `--andes-divider-color`, `--andes-divider-thickness`, `--andes-divider-margin`, `--andes-divider-text-gap`.',
      },
    },
  },
  render: () => ({
    template: wrap(`
      <andes-divider style="--andes-divider-color: var(--andes-color-primary); --andes-divider-thickness: 2px;">Primary</andes-divider>`),
  }),
};
