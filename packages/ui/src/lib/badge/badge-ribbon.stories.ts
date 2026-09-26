import type { Meta, StoryObj } from '@storybook/angular';

import { AndesBadgeRibbon } from './badge-ribbon';

const card = `<div style="width: 16rem; padding: 1rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md); background: var(--andes-color-card); color: var(--andes-color-card-foreground);">
  <strong>Pushes open the window</strong>
  <p style="margin: 0.5rem 0 0;">and raises the spyglass.</p>
</div>`;

const meta: Meta<AndesBadgeRibbon> = {
  title: 'Badge/Ribbon',
  component: AndesBadgeRibbon,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    color: { control: 'text' },
    placement: { control: 'select', options: ['start', 'end'] },
  },
  args: { text: 'Hippies', color: 'primary', placement: 'end' },
  render: (args) => ({
    props: args,
    template: `<andes-badge-ribbon [text]="text" [color]="color" [placement]="placement">${card}</andes-badge-ribbon>`,
  }),
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<AndesBadgeRibbon>;

export const Default: Story = {};

export const PlacementStart: Story = {
  args: { placement: 'start' },
};

/** Preset colors reuse the themed token pairs; arbitrary CSS colors get auto-contrast text. */
export const Colors: Story = {
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 1.5rem;">
        <andes-badge-ribbon text="primary">${card}</andes-badge-ribbon>
        <andes-badge-ribbon text="success" color="success">${card}</andes-badge-ribbon>
        <andes-badge-ribbon text="warning" color="warning">${card}</andes-badge-ribbon>
        <andes-badge-ribbon text="danger" color="danger">${card}</andes-badge-ribbon>
        <andes-badge-ribbon text="#722ed1" color="#722ed1">${card}</andes-badge-ribbon>
        <andes-badge-ribbon text="#fadb14" color="#fadb14">${card}</andes-badge-ribbon>
      </div>
    `,
  }),
};

export const Rtl: Story = {
  render: () => ({
    template: `
      <div dir="rtl" style="display: flex; gap: 1.5rem;">
        <andes-badge-ribbon text="end">${card}</andes-badge-ribbon>
        <andes-badge-ribbon text="start" placement="start" color="info">${card}</andes-badge-ribbon>
      </div>
    `,
  }),
};
