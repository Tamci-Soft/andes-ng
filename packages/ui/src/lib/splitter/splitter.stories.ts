import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesSplitter } from './splitter';
import { AndesSplitterPanel } from './splitter-panel';

const frame =
  'height: 280px; width: 100%; border: 1px solid var(--andes-color-border, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); overflow: hidden; background: var(--andes-color-background, #fff);';
const pane =
  'padding: 12px 16px; font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground, #0f172a);';
const muted = 'color: var(--andes-color-muted-foreground, #64748b);';

const meta: Meta<AndesSplitter> = {
  title: 'Splitter',
  component: AndesSplitter,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [AndesSplitter, AndesSplitterPanel] }),
  ],
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
    lazy: { control: 'boolean' },
    storageKey: { control: 'text' },
  },
  args: { orientation: 'horizontal', lazy: false },
  render: (args) => ({
    props: args,
    template: `
      <div style="${frame}">
        <andes-splitter [orientation]="orientation" [lazy]="lazy">
          <andes-splitter-panel size="30%" min="140" max="60%">
            <div style="${pane}"><strong>Orders</strong><p style="${muted}">Drag the line, or focus it and use the arrow keys (Shift for bigger steps, Home and End for the limits).</p></div>
          </andes-splitter-panel>
          <andes-splitter-panel min="200">
            <div style="${pane}"><strong>Order 10482</strong><p style="${muted}">Customer, lines, totals and the activity log live here.</p></div>
          </andes-splitter-panel>
        </andes-splitter>
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<AndesSplitter>;

export const Default: Story = {};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const Lazy: Story = {
  args: { lazy: true },
  parameters: {
    docs: {
      description: {
        story:
          'Lazy mode keeps the panes still while dragging, shows a preview line, and applies the new size on release. Useful when the panes are expensive to re-render.',
      },
    },
  },
};

export const ThreePanes: Story = {
  render: () => ({
    template: `
      <div style="${frame}">
        <andes-splitter>
          <andes-splitter-panel size="200" min="120"><div style="${pane}">Filters (200px)</div></andes-splitter-panel>
          <andes-splitter-panel><div style="${pane}">Results (takes the rest)</div></andes-splitter-panel>
          <andes-splitter-panel size="25%" min="160"><div style="${pane}">Preview (25%)</div></andes-splitter-panel>
        </andes-splitter>
      </div>`,
  }),
};

export const CollapsiblePane: Story = {
  render: () => ({
    props: { collapsed: signal(false) },
    template: `
      <div style="${frame}">
        <andes-splitter>
          <andes-splitter-panel size="240" min="160" collapsible [collapsedSize]="0" [(collapsed)]="collapsed">
            <div style="${pane}"><strong>Navigation</strong><p style="${muted}">Use the button on the handle, or press Enter while it is focused.</p></div>
          </andes-splitter-panel>
          <andes-splitter-panel><div style="${pane}">Main content</div></andes-splitter-panel>
        </andes-splitter>
      </div>
      <p style="${pane}">Navigation is {{ collapsed() ? 'collapsed' : 'open' }}.</p>`,
  }),
};

export const CollapsedRail: Story = {
  name: 'Collapsed to a rail',
  render: () => ({
    template: `
      <div style="${frame}">
        <andes-splitter>
          <andes-splitter-panel size="220" min="160" collapsible [collapsedSize]="48" [collapsed]="true">
            <div style="${pane} white-space: nowrap;">Workspaces</div>
          </andes-splitter-panel>
          <andes-splitter-panel><div style="${pane}">A collapsed pane can keep a narrow rail.</div></andes-splitter-panel>
        </andes-splitter>
      </div>`,
  }),
};

export const CollapsibleBothSides: Story = {
  render: () => ({
    template: `
      <div style="${frame}">
        <andes-splitter>
          <andes-splitter-panel size="22%" min="120" collapsible><div style="${pane}">Left</div></andes-splitter-panel>
          <andes-splitter-panel><div style="${pane}">Centre</div></andes-splitter-panel>
          <andes-splitter-panel size="22%" min="120" collapsible><div style="${pane}">Right</div></andes-splitter-panel>
        </andes-splitter>
      </div>`,
  }),
};

export const FixedPane: Story = {
  render: () => ({
    template: `
      <div style="${frame}">
        <andes-splitter>
          <andes-splitter-panel size="180" [resizable]="false"><div style="${pane}">Fixed rail - its handle cannot be dragged.</div></andes-splitter-panel>
          <andes-splitter-panel><div style="${pane}">Flexible area</div></andes-splitter-panel>
        </andes-splitter>
      </div>`,
  }),
};

export const MinAndMax: Story = {
  render: () => ({
    template: `
      <div style="${frame}">
        <andes-splitter>
          <andes-splitter-panel size="50%" min="25%" max="75%"><div style="${pane}">Between 25% and 75%</div></andes-splitter-panel>
          <andes-splitter-panel><div style="${pane}">Takes whatever is left</div></andes-splitter-panel>
        </andes-splitter>
      </div>`,
  }),
};

export const Nested: Story = {
  render: () => ({
    template: `
      <div style="${frame} height: 360px;">
        <andes-splitter>
          <andes-splitter-panel size="220" min="140"><div style="${pane}"><strong>Explorer</strong></div></andes-splitter-panel>
          <andes-splitter-panel>
            <andes-splitter orientation="vertical">
              <andes-splitter-panel size="65%" min="80"><div style="${pane}"><strong>Editor</strong></div></andes-splitter-panel>
              <andes-splitter-panel min="60"><div style="${pane}"><strong>Console</strong></div></andes-splitter-panel>
            </andes-splitter>
          </andes-splitter-panel>
        </andes-splitter>
      </div>`,
  }),
};

export const ControlledSizes: Story = {
  render: () => ({
    props: { sizes: signal<number[] | undefined>(undefined), log: signal('') },
    template: `
      <div style="${frame}">
        <andes-splitter [(sizes)]="sizes" (resizeEnd)="log.set('Released at ' + $event.sizes.map(s => s.toFixed(0)).join(' / ') + ' px')">
          <andes-splitter-panel size="40%" min="120"><div style="${pane}">A</div></andes-splitter-panel>
          <andes-splitter-panel min="120"><div style="${pane}">B</div></andes-splitter-panel>
        </andes-splitter>
      </div>
      <p style="${pane}">Sizes: {{ sizes()?.join(' / ') }} px. {{ log() }}</p>
      <button type="button" style="margin-inline-start:16px" (click)="sizes.set([200, 400])">Set 200 / 400</button>`,
  }),
};

export const Persisted: Story = {
  render: () => ({
    template: `
      <div style="${frame}">
        <andes-splitter storageKey="storybook-orders-layout">
          <andes-splitter-panel size="35%" min="140" collapsible><div style="${pane}">Resize or collapse me, then reload the page: the layout is restored from <code>storageKey</code>.</div></andes-splitter-panel>
          <andes-splitter-panel><div style="${pane}">Detail</div></andes-splitter-panel>
        </andes-splitter>
      </div>`,
  }),
};

export const RightToLeft: Story = {
  render: () => ({
    template: `
      <div dir="rtl" style="${frame}">
        <andes-splitter>
          <andes-splitter-panel size="30%" min="140" collapsible><div style="${pane}">القائمة</div></andes-splitter-panel>
          <andes-splitter-panel><div style="${pane}">المحتوى - the arrow keys follow the reading direction.</div></andes-splitter-panel>
        </andes-splitter>
      </div>`,
  }),
};
