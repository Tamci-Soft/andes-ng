import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesCollapsible } from './collapsible';
import { AndesCollapsibleContent } from './collapsible-content';
import { AndesCollapsibleLazy } from './collapsible-lazy';
import { AndesCollapsibleTrigger } from './collapsible-trigger';

const imports = [
  AndesCollapsible,
  AndesCollapsibleTrigger,
  AndesCollapsibleContent,
  AndesCollapsibleLazy,
];

const chevron = `<svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>`;

/** Demo-only look for the trigger rows and panels; the component itself ships no chrome. */
const styles = [
  `
  .panel { width: 22rem; font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground); }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .row h4 { margin: 0; font-size: 0.875rem; line-height: 1.375rem; font-weight: 600; }
  .item { border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md); padding: 0.5rem 0.75rem; margin-top: 0.5rem; }
  .trigger-row { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0.25rem 0; border: 0; background: none; color: inherit; font: inherit; font-weight: 600; cursor: pointer; text-align: start; border-radius: var(--andes-radius-sm); }
  .trigger-row:focus-visible { outline: 2px solid var(--andes-color-focus-ring); outline-offset: 2px; }
  .trigger-row:disabled { cursor: not-allowed; opacity: 0.6; }
  .chevron { flex: none; transition: transform 200ms ease-in-out; }
  [data-state='open'] > .chevron, [data-state='open'] .chevron { transform: rotate(180deg); }
  .body { padding-top: 0.5rem; color: var(--andes-color-muted-foreground); }
  .body p { margin: 0 0 0.5rem; }
  @media (prefers-reduced-motion: reduce) { .chevron { transition: none; } }
  `,
];

const meta: Meta<AndesCollapsible> = {
  title: 'Collapsible',
  component: AndesCollapsible,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    openChange: { action: 'openChange' },
  },
  args: { open: false, disabled: false },
  render: (args) => ({
    moduleMetadata: { imports },
    props: args,
    styles,
    template: `
      <andes-collapsible class="panel" [(open)]="open" [disabled]="disabled" (openChange)="openChange($event)">
        <div class="row">
          <h4>3 repositories starred</h4>
          <button andesCollapsibleTrigger class="trigger-row" style="width:auto" aria-label="Toggle list">${chevron}</button>
        </div>
        <div class="item">andes-ng/ui</div>
        <andes-collapsible-content>
          <div class="item">andes-ng/tokens</div>
          <div class="item">andes-ng/primitives</div>
        </andes-collapsible-content>
      </andes-collapsible>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesCollapsible>;

/** A native `<button>` is the simplest trigger: Space and Enter come for free. */
export const Default: Story = {};

export const OpenByDefault: Story = { args: { open: true } };

export const Disabled: Story = { args: { disabled: true, open: false } };

export const DisabledWhileOpen: Story = {
  args: { disabled: true, open: true },
};

/** The trigger can be any element: it gets `role="button"`, a tab stop and Enter/Space handling. */
export const CustomTriggerElements: Story = {
  render: () => ({
    moduleMetadata: { imports },
    styles,
    template: `
      <div class="panel">
        <andes-collapsible class="item">
          <andes-collapsible-trigger class="trigger-row">
            Element trigger ${chevron}
          </andes-collapsible-trigger>
          <andes-collapsible-content><div class="body">Any element can toggle the region.</div></andes-collapsible-content>
        </andes-collapsible>
        <andes-collapsible class="item">
          <h4 andesCollapsibleTrigger class="trigger-row" style="margin: 0; cursor: pointer;">
            Heading trigger ${chevron}
          </h4>
          <andes-collapsible-content><div class="body">A heading with a button role keeps its text content.</div></andes-collapsible-content>
        </andes-collapsible>
      </div>
    `,
  }),
};

/** Open state is a model, so a parent can drive it and listen to changes. */
export const ControlledFromOutside: Story = {
  render: () => ({
    moduleMetadata: { imports: [...imports, AndesButton] },
    styles,
    props: { open: false, log: [] as string[] },
    template: `
      <div class="panel">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
          <andes-button size="sm" variant="outline" (click)="open = true">Expand</andes-button>
          <andes-button size="sm" variant="outline" (click)="open = false">Collapse</andes-button>
        </div>
        <andes-collapsible [(open)]="open" (openChange)="log = [($event ? 'opened' : 'closed'), ...log].slice(0, 3)">
          <button andesCollapsibleTrigger class="trigger-row">Shipping details ${chevron}</button>
          <andes-collapsible-content>
            <div class="body"><p>Ships within two business days.</p><p>Free returns for 30 days.</p></div>
          </andes-collapsible-content>
        </andes-collapsible>
        <p style="margin-top: 0.75rem; font-size: 0.75rem; line-height: 1.25rem;">State: {{ open ? 'open' : 'closed' }} - last events: {{ log.join(', ') || 'none' }}</p>
      </div>
    `,
  }),
};

/** Several triggers can share one region; each one reports the same expanded state. */
export const MultipleTriggers: Story = {
  render: () => ({
    moduleMetadata: { imports },
    styles,
    template: `
      <andes-collapsible class="panel">
        <button andesCollapsibleTrigger class="trigger-row">Top trigger ${chevron}</button>
        <andes-collapsible-content><div class="body">Shared region.</div></andes-collapsible-content>
        <button andesCollapsibleTrigger class="trigger-row">Bottom trigger ${chevron}</button>
      </andes-collapsible>
    `,
  }),
};

/** A lazy template is created on first open, so heavy content is not built until needed. */
export const LazyContent: Story = {
  render: () => ({
    moduleMetadata: { imports },
    styles,
    props: {
      renders: 0,
      count() {
        return ++this['renders'];
      },
    },
    template: `
      <andes-collapsible class="panel">
        <button andesCollapsibleTrigger class="trigger-row">Activity (loads on first open) ${chevron}</button>
        <andes-collapsible-content>
          <ng-template andesCollapsibleLazy>
            <div class="body"><p>Rendered when first opened.</p><p>Invoice 1042 paid by Acme Corp.</p><p>Invoice 1043 sent to Globex.</p></div>
          </ng-template>
        </andes-collapsible-content>
      </andes-collapsible>
    `,
  }),
};

/** `unmountOnClose` destroys the lazy template after each collapse animation. */
export const UnmountOnClose: Story = {
  render: () => ({
    moduleMetadata: { imports },
    styles,
    template: `
      <andes-collapsible class="panel">
        <button andesCollapsibleTrigger class="trigger-row">Draft notes ${chevron}</button>
        <andes-collapsible-content unmountOnClose>
          <ng-template andesCollapsibleLazy>
            <div class="body"><textarea rows="3" style="width:100%; font: inherit;" aria-label="Notes"></textarea></div>
          </ng-template>
        </andes-collapsible-content>
      </andes-collapsible>
    `,
  }),
};

/** `forceMount` builds the lazy template up front, e.g. so form fields exist before opening. */
export const ForceMount: Story = {
  render: () => ({
    moduleMetadata: { imports },
    styles,
    template: `
      <andes-collapsible class="panel">
        <button andesCollapsibleTrigger class="trigger-row">Advanced options ${chevron}</button>
        <andes-collapsible-content forceMount>
          <ng-template andesCollapsibleLazy>
            <div class="body"><label>Reference <input style="font: inherit;" /></label></div>
          </ng-template>
        </andes-collapsible-content>
      </andes-collapsible>
    `,
  }),
};

/** Common admin use: hide secondary filters until they are asked for. */
export const AdvancedFilters: Story = {
  render: () => ({
    moduleMetadata: { imports },
    styles: [
      ...styles,
      `.filters { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; padding-top: 0.75rem; }
       .btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 2rem; padding: 0 0.6875rem; border: 1px solid var(--andes-color-input); border-radius: var(--andes-radius-md); background: var(--andes-color-background); color: inherit; font: inherit; font-size: 0.875rem; cursor: pointer; }
       .btn:focus-visible { outline: 2px solid var(--andes-color-focus-ring); outline-offset: 2px; }
       .filters label { display: grid; gap: 0.25rem; font-size: 0.75rem; line-height: 1.25rem; }
       .filters input, .filters select { box-sizing: border-box; height: 2rem; padding: 0 0.6875rem; border: 1px solid var(--andes-color-input); border-radius: var(--andes-radius-md); background: var(--andes-color-background); color: inherit; font: inherit; font-size: 0.875rem; }`,
    ],
    template: `
      <andes-collapsible class="panel" style="width: 26rem;">
        <div class="row">
          <input aria-label="Search invoices" placeholder="Search invoices" style="flex:1; box-sizing: border-box; height: 2rem; padding: 0 0.6875rem; border: 1px solid var(--andes-color-input); border-radius: var(--andes-radius-md); background: var(--andes-color-background); color: inherit; font: inherit;" />
          <button andesCollapsibleTrigger class="btn">Filters ${chevron}</button>
        </div>
        <andes-collapsible-content>
          <div class="filters">
            <label>Status<select><option>Any</option><option>Paid</option><option>Overdue</option></select></label>
            <label>Customer<input placeholder="Any customer" /></label>
            <label>From<input type="date" /></label>
            <label>To<input type="date" /></label>
          </div>
        </andes-collapsible-content>
      </andes-collapsible>
    `,
  }),
};
