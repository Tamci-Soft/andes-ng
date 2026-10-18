import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesSpin } from './spin';

const meta: Meta<AndesSpin> = {
  title: 'Spin',
  component: AndesSpin,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    spinning: { control: 'boolean' },
    delay: { control: 'number' },
    tip: { control: 'text' },
    variant: { control: 'select', options: ['ring', 'dots', 'bars'] },
    size: { control: 'text' },
    percent: { control: 'text' },
    fullscreen: { control: 'boolean' },
  },
  args: { spinning: true, delay: 0, variant: 'ring', size: 'md' },
  render: (args) => ({
    props: args,
    template: `
      <andes-spin [spinning]="spinning" [delay]="delay" [tip]="tip" [variant]="variant" [size]="size" [percent]="percent">
        ${card}
      </andes-spin>`,
  }),
};

export default meta;
type Story = StoryObj<AndesSpin>;

const surface =
  'font: 14px/22px var(--andes-font-family, system-ui), sans-serif; color: var(--andes-color-foreground);';

const btn =
  'font: inherit; padding: 0 12px; height: 32px; border-radius: var(--andes-radius-md, 8px); border: 1px solid var(--andes-color-input); background: var(--andes-color-background); color: inherit; cursor: pointer;';

const card = `
  <div style="${surface} max-width: 28rem; padding: 1rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md, 8px); background: var(--andes-color-card, transparent);">
    <h3 style="margin: 0 0 0.25rem; font-size: 16px; line-height: 24px; font-weight: 600;">Quarterly report</h3>
    <p style="margin: 0 0 0.75rem; color: var(--andes-color-muted-foreground);">Revenue grew 12% compared with the previous quarter.</p>
    <button type="button" style="${btn}">Download</button>
  </div>`;

export const Playground: Story = {};

export const Toggle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The content is dimmed and cannot be clicked while spinning; the host reports `aria-busy`.',
      },
    },
  },
  render: () => ({
    props: { spinning: true },
    template: `
      <div style="${surface} display: grid; gap: 0.75rem; justify-items: start;">
        <label><input type="checkbox" [checked]="spinning" (change)="spinning = !spinning" /> Loading</label>
        <andes-spin [spinning]="spinning" tip="Loading report...">${card}</andes-spin>
      </div>`,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));">
        <andes-spin variant="ring" tip="Ring">${card}</andes-spin>
        <andes-spin variant="dots" tip="Dots">${card}</andes-spin>
        <andes-spin variant="bars" tip="Bars">${card}</andes-spin>
      </div>`,
  }),
};

export const Delay: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'With `delay`, a load that finishes inside that window never shows the indicator. Press "Fast" (200 ms) and "Slow" (1.5 s) with a 500 ms delay.',
      },
    },
  },
  render: () => ({
    props: (() => {
      const spinning = signal(false);
      return {
        spinning,
        run(ms: number) {
          spinning.set(true);
          setTimeout(() => spinning.set(false), ms);
        },
      };
    })(),
    template: `
      <div style="${surface} display: grid; gap: 0.75rem; justify-items: start;">
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" style="${btn}" (click)="run(200)">Fast (200 ms)</button>
          <button type="button" style="${btn}" (click)="run(1500)">Slow (1.5 s)</button>
        </div>
        <andes-spin [spinning]="spinning()" [delay]="500" tip="Loading...">${card}</andes-spin>
      </div>`,
  }),
};

export const Percent: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));">
        <andes-spin size="lg" [percent]="64" tip="Uploading">${card}</andes-spin>
        <andes-spin size="lg" percent="auto" tip="Preparing">${card}</andes-spin>
      </div>`,
  }),
};

export const TallContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Inside a scrolling area the indicator stays at the centre of what is visible, not in the middle of the whole list. Scroll the box.',
      },
    },
  },
  render: () => ({
    props: { items: Array.from({ length: 40 }, (_, index) => 1000 + index) },
    template: `
      <div style="${surface} height: 20rem; overflow: auto; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md, 8px);">
        <andes-spin tip="Refreshing orders...">
          <ul style="margin: 0; padding: 0.5rem 1rem; list-style: none;">
            @for (id of items; track id) {
              <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--andes-color-border);">Order #{{ id }} - ready to ship</li>
            }
          </ul>
        </andes-spin>
      </div>`,
  }),
};

export const Fullscreen: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          '`fullscreen` covers the viewport with a scrim and the indicator. Here it closes by itself after two seconds.',
      },
    },
  },
  render: () => ({
    props: (() => {
      const spinning = signal(false);
      return {
        spinning,
        start() {
          spinning.set(true);
          setTimeout(() => spinning.set(false), 2000);
        },
      };
    })(),
    template: `
      <div style="${surface}">
        <button type="button" style="${btn}" (click)="start()">Show for 2 seconds</button>
        <andes-spin fullscreen [spinning]="spinning()" tip="Please wait..." />
      </div>`,
  }),
};
