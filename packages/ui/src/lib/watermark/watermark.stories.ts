import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesWatermark } from './watermark';
import { andesWatermarkDataUrl } from './watermark-canvas';
import { AndesWatermarkInherit } from './watermark-inherit';

const base =
  'font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground, #0f172a); font-family: var(--andes-font-family, system-ui), sans-serif;';
const sheet = `${base} box-sizing: border-box; padding: 24px; border: 1px solid var(--andes-color-border, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); background: var(--andes-color-card, #fff);`;
const button =
  'height: 24px; padding: 0 10px; border: 1px solid var(--andes-color-input, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); background: var(--andes-color-background, #fff); color: inherit; font: inherit; cursor: pointer;';

const document_ = `
  <h3 style="margin: 0 0 4px; font-size: 1rem; line-height: 1.5rem; font-weight: 600;">Purchase order 10482</h3>
  <p style="margin: 0 0 16px; color: var(--andes-color-muted-foreground, #64748b);">Supplier: Andes Logistics S.A.C. - issued 14 March</p>
  <table style="width: 100%; border-collapse: collapse;">
    <tr style="text-align: start; border-bottom: 1px solid var(--andes-color-border, #d1d5db);"><th>Item</th><th>Qty</th><th>Unit price</th></tr>
    <tr><td>Pallet wrap 500 mm</td><td>40</td><td>12.50</td></tr>
    <tr><td>Thermal labels 100x150</td><td>120</td><td>3.80</td></tr>
    <tr><td>Strapping band 12 mm</td><td>25</td><td>18.00</td></tr>
    <tr><td>Corrugated boxes M</td><td>300</td><td>1.15</td></tr>
  </table>
  <p style="margin: 16px 0 0;"><button type="button" style="${button}">Approve</button> <span style="color: var(--andes-color-muted-foreground, #64748b);">The watermark never blocks this button.</span></p>`;

const LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120"><rect x="2" y="2" width="236" height="116" rx="16" fill="none" stroke="#64748b" stroke-width="4"/><text x="120" y="72" font-family="sans-serif" font-size="40" font-weight="700" text-anchor="middle" fill="#64748b">ANDES</text></svg>',
)}`;

const meta: Meta<AndesWatermark> = {
  title: 'Watermark',
  component: AndesWatermark,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [AndesWatermark, AndesWatermarkInherit] }),
  ],
  parameters: { layout: 'padded' },
  argTypes: {
    content: { control: 'object' },
    rotate: { control: 'number' },
    gap: { control: 'object' },
    offset: { control: 'object' },
    zIndex: { control: 'number' },
    width: { control: 'number' },
    height: { control: 'number' },
    font: { control: 'object' },
    inherit: { control: 'boolean' },
  },
  args: {
    content: 'Confidential',
    rotate: -22,
    gap: [100, 100],
    offset: [0, 0],
    zIndex: 9,
    inherit: true,
  },
  render: (args) => ({
    props: args,
    template: `
      <andes-watermark [content]="content" [rotate]="rotate" [gap]="gap" [offset]="offset" [zIndex]="zIndex" [width]="width" [height]="height" [font]="font" [inherit]="inherit">
        <div style="${sheet}">${document_}</div>
      </andes-watermark>`,
  }),
};

export default meta;
type Story = StoryObj<AndesWatermark>;

export const Default: Story = {};

export const MultiLine: Story = {
  name: 'Multi-line with the user',
  args: {
    content: [
      'Internal use only',
      'm.quispe@andes.example',
      '14 Mar 2026 09:41',
    ],
  },
};

export const CustomFont: Story = {
  args: {
    content: 'DRAFT',
    font: { size: 28, weight: 700, color: 'rgba(220, 38, 38, 0.18)' },
    gap: [60, 60],
  },
};

export const ImageMark: Story = {
  name: 'Image mark',
  render: () => ({
    props: { logo: LOGO },
    template: `
      <andes-watermark [image]="logo" [width]="96" [gap]="[80, 80]" [rotate]="-15">
        <div style="${sheet}">${document_}</div>
      </andes-watermark>`,
  }),
};

export const RotationAndGap: Story = {
  name: 'Rotation, gap and offset',
  args: { content: 'Copy', rotate: 0, gap: [40, 24], offset: [20, 10] },
};

export const FullPage: Story = {
  name: 'Full page',
  parameters: { layout: 'fullscreen' },
  render: () => ({
    template: `
      <andes-watermark [fullPage]="true" content="Preview build">
        <div style="padding: 24px;"><div style="${sheet}">${document_}</div></div>
      </andes-watermark>`,
  }),
};

export const InheritedByOverlays: Story = {
  name: 'Inherited by dialogs and panels',
  render: () => ({
    template: `
      <andes-watermark content="Confidential">
        <div style="${sheet} min-height: 260px;">
          ${document_}
        </div>
      </andes-watermark>
      <div andesWatermarkInherit role="dialog" aria-label="Example dialog" style="${sheet} width: 280px; margin: -150px 0 0 48px; position: relative; box-shadow: 0 8px 24px rgb(0 0 0 / 18%); z-index: 20;">
        <strong>Dialog outside the watermark</strong>
        <p style="margin: 4px 0 0; color: var(--andes-color-muted-foreground, #64748b);">Overlays render in the page body, so they opt in with <code>andesWatermarkInherit</code> to show the same mark.</p>
      </div>`,
  }),
};

export const TamperProtection: Story = {
  name: 'Tamper protection',
  render: () => {
    const status = signal('Overlay in place.');
    const overlayIn = (box: HTMLElement) =>
      box.querySelector<HTMLElement>('[data-slot="watermark-overlay"]');
    // The restore runs in a microtask, so the outcome is read right after it.
    const settle = async () => {
      await Promise.resolve();
      await Promise.resolve();
    };
    return {
      props: {
        status,
        async removeOverlay(box: HTMLElement) {
          const node = overlayIn(box);
          node?.remove();
          await settle();
          status.set(
            node?.isConnected ? 'Removed it, and it came back.' : 'It is gone.',
          );
        },
        async hideOverlay(box: HTMLElement) {
          const node = overlayIn(box);
          node?.style.setProperty('display', 'none');
          await settle();
          status.set(
            node && getComputedStyle(node).display !== 'none'
              ? 'Hid it with display: none, and it is visible again.'
              : 'It stayed hidden.',
          );
        },
      },
      template: `
        <div #box>
          <andes-watermark content="Do not remove">
            <div style="${sheet}">
              <p style="margin: 0 0 12px;">Removing or restyling the overlay (here, or in the element inspector) puts it straight back.</p>
              <button type="button" style="${button}" (click)="removeOverlay(box)">Remove the overlay</button>
              <button type="button" style="${button}" (click)="hideOverlay(box)">Hide the overlay</button>
              <p style="margin: 12px 0 0;" aria-live="polite">{{ status() }}</p>
            </div>
          </andes-watermark>
        </div>`,
    };
  },
};

export const ReusableDataUrl: Story = {
  name: 'Reusable data URL',
  render: () => {
    const url = signal<string | null>(null);
    void andesWatermarkDataUrl({
      content: 'Draft',
      font: { color: '#64748b' },
    }).then((value) => url.set(value));
    return {
      props: { url },
      template: `
        <div style="${sheet}">
          <p style="margin: 0 0 8px;">andesWatermarkDataUrl() renders the tile without any component, for exports, printing or a custom overlay.</p>
          @if (url(); as src) {
            <div style="height: 160px; border: 1px solid var(--andes-color-border, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); background-repeat: repeat;" [style.background-image]="'url(' + src + ')'"></div>
          }
        </div>`,
    };
  },
};
