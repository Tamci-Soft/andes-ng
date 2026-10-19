import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesAccordion, type AndesAccordionItemConfig } from './accordion';
import { AndesAccordionContent } from './accordion-content';
import { AndesAccordionItem } from './accordion-item';
import { AndesAccordionLazy } from './accordion-lazy';
import { AndesAccordionTrigger } from './accordion-trigger';

const PARTS = [
  AndesAccordionItem,
  AndesAccordionTrigger,
  AndesAccordionContent,
  AndesAccordionLazy,
];

const WIDTH = 'width: 28rem; max-width: 100%;';

/** The three FAQ panels most stories share. */
const FAQ_ITEMS = `
  <andes-accordion-item value="what-is">
    <andes-accordion-trigger>What is Andes NG?</andes-accordion-trigger>
    <andes-accordion-content>
      A zoneless Angular component library published under the MIT license.
    </andes-accordion-content>
  </andes-accordion-item>
  <andes-accordion-item value="styling">
    <andes-accordion-trigger>How is it styled?</andes-accordion-trigger>
    <andes-accordion-content>
      Entirely through CSS custom properties defined in @andes-ng/tokens - no
      component-specific tokens, no runtime theming library.
    </andes-accordion-content>
  </andes-accordion-item>
  <andes-accordion-item value="a11y">
    <andes-accordion-trigger>Is it accessible?</andes-accordion-trigger>
    <andes-accordion-content>
      Each trigger is a native button with aria-expanded and aria-controls; each panel is
      a role="region" cross-linked back to its trigger via aria-labelledby.
    </andes-accordion-content>
  </andes-accordion-item>
`;

/**
 * Demo text field styled like the library's own fields: one focus indicator (primary
 * border plus a soft 2px ring), never the browser's outline drawn as a second frame.
 */
const FIELD_STYLES = `
  <style>
    .sb-field-input {
      box-sizing: border-box;
      height: 2rem;
      margin-inline-start: var(--andes-space-2);
      padding: 0 0.6875rem;
      border: 1px solid var(--andes-color-input);
      border-radius: var(--andes-radius-md);
      background-color: var(--andes-color-background);
      color: var(--andes-color-foreground);
      font: inherit;
      line-height: 1.375rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
    }
    .sb-field-input:hover {
      border-color: color-mix(in srgb, var(--andes-color-primary) 65%, var(--andes-color-input));
    }
    .sb-field-input:focus {
      border-color: var(--andes-color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--andes-color-primary) 20%, transparent);
      outline: none;
    }
  </style>
`;

const meta: Meta<AndesAccordion> = {
  title: 'Accordion',
  component: AndesAccordion,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['single', 'multiple'] },
    disabled: { control: 'boolean' },
    bordered: { control: 'boolean' },
    ghost: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    collapsible: {
      control: 'select',
      options: ['(whole row)', 'header', 'icon', 'disabled'],
      mapping: { '(whole row)': undefined },
    },
    expandIconPosition: { control: 'select', options: ['start', 'end'] },
    destroyOnHidden: { control: 'boolean' },
    arrowNavigation: { control: 'boolean' },
    headingLevel: { control: 'select', options: [2, 3, 4, 5, 6] },
  },
  args: {
    type: 'single',
    disabled: false,
    bordered: false,
    ghost: false,
    size: 'md',
    expandIconPosition: 'end',
    destroyOnHidden: false,
    arrowNavigation: false,
    headingLevel: 3,
  },
  render: (args) => ({
    moduleMetadata: { imports: PARTS },
    props: args,
    template: `
      <andes-accordion
        [type]="type"
        [disabled]="disabled"
        [bordered]="bordered"
        [ghost]="ghost"
        [size]="size"
        [collapsible]="collapsible"
        [expandIconPosition]="expandIconPosition"
        [destroyOnHidden]="destroyOnHidden"
        [arrowNavigation]="arrowNavigation"
        [headingLevel]="headingLevel"
        style="${WIDTH}"
      >${FAQ_ITEMS}</andes-accordion>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesAccordion>;

export const Single: Story = {
  args: { type: 'single' },
};

export const Multiple: Story = {
  args: { type: 'multiple' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledItem: Story = {
  render: (args) => ({
    moduleMetadata: { imports: PARTS },
    props: args,
    template: `
      <andes-accordion [type]="type" style="${WIDTH}">
        <andes-accordion-item value="one">
          <andes-accordion-trigger>Available section</andes-accordion-trigger>
          <andes-accordion-content>This one can be toggled normally.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="two" disabled>
          <andes-accordion-trigger>Disabled section</andes-accordion-trigger>
          <andes-accordion-content>This content is not reachable while disabled.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="three">
          <andes-accordion-trigger>Another available section</andes-accordion-trigger>
          <andes-accordion-content>More content here.</andes-accordion-content>
        </andes-accordion-item>
      </andes-accordion>
    `,
  }),
};

export const Preopened: Story = {
  name: 'Pre-opened item (multiple mode)',
  render: () => ({
    moduleMetadata: { imports: PARTS },
    template: `
      <andes-accordion type="multiple" [activeKey]="['one']" style="${WIDTH}">
        <andes-accordion-item value="one">
          <andes-accordion-trigger>First section</andes-accordion-trigger>
          <andes-accordion-content>
            Opened initially through a one-way [activeKey] binding (an initial
            value only). Click any trigger to expand/collapse it independently.
          </andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="two">
          <andes-accordion-trigger>Second section</andes-accordion-trigger>
          <andes-accordion-content>
            Multiple mode lets several panels stay open at the same time.
          </andes-accordion-content>
        </andes-accordion-item>
      </andes-accordion>
    `,
  }),
};

export const ControlledActiveKey: Story = {
  name: 'Controlled activeKey (two-way)',
  render: () => ({
    moduleMetadata: { imports: PARTS },
    props: { keys: ['styling'], changes: 0 },
    template: `
      <div style="${WIDTH} display: grid; gap: 0.75rem;">
        <andes-accordion
          type="multiple"
          [(activeKey)]="keys"
          (activeKeyChange)="changes = changes + 1"
        >${FAQ_ITEMS}</andes-accordion>
        <p style="margin: 0; font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-muted-foreground);">
          activeKey: [{{ keys.join(', ') }}] - activeKeyChange fired {{ changes }} time(s)
        </p>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" (click)="keys = ['what-is', 'styling', 'a11y']">Open all</button>
          <button type="button" (click)="keys = []">Close all</button>
        </div>
      </div>
    `,
  }),
};

export const Bordered: Story = {
  args: { bordered: true, type: 'multiple' },
  render: (args) => ({
    moduleMetadata: { imports: PARTS },
    props: args,
    template: `
      <andes-accordion bordered [type]="type" [activeKey]="['styling']" style="${WIDTH}">
        ${FAQ_ITEMS}
      </andes-accordion>
    `,
  }),
};

export const Ghost: Story = {
  render: () => ({
    moduleMetadata: { imports: PARTS },
    template: `
      <andes-accordion ghost [activeKey]="['what-is']" style="${WIDTH}">${FAQ_ITEMS}</andes-accordion>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    moduleMetadata: { imports: PARTS },
    template: `
      <div style="${WIDTH} display: grid; gap: 1.5rem;">
        <andes-accordion bordered size="sm" [activeKey]="['what-is']">${FAQ_ITEMS}</andes-accordion>
        <andes-accordion bordered size="md" [activeKey]="['what-is']">${FAQ_ITEMS}</andes-accordion>
        <andes-accordion bordered size="lg" [activeKey]="['what-is']">${FAQ_ITEMS}</andes-accordion>
      </div>
    `,
  }),
};

export const CustomExpandIcon: Story = {
  name: 'Custom expandIcon (receives isActive)',
  render: () => ({
    moduleMetadata: { imports: PARTS },
    template: `
      <ng-template #plusMinus let-active>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          @if (!active) { <line x1="12" y1="5" x2="12" y2="19" /> }
        </svg>
      </ng-template>
      <andes-accordion bordered [expandIcon]="plusMinus" style="${WIDTH}">${FAQ_ITEMS}</andes-accordion>
    `,
  }),
};

export const IconAtStart: Story = {
  name: 'expandIconPosition="start"',
  args: { expandIconPosition: 'start', bordered: true },
};

export const CollapsibleModes: Story = {
  name: 'collapsible (header / icon / disabled)',
  render: () => ({
    moduleMetadata: { imports: PARTS },
    template: `
      <andes-accordion bordered type="multiple" style="${WIDTH}">
        <andes-accordion-item value="row">
          <andes-accordion-trigger>Default: the whole row toggles</andes-accordion-trigger>
          <andes-accordion-content>Click anywhere on the header row.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="header" collapsible="header">
          <andes-accordion-trigger>header: only the text (and icon) toggle</andes-accordion-trigger>
          <andes-accordion-content>The blank part of the row does nothing.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="icon" collapsible="icon">
          <andes-accordion-trigger>icon: only the icon toggles</andes-accordion-trigger>
          <andes-accordion-content>The icon is the button, named by the header text.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="disabled" collapsible="disabled">
          <andes-accordion-trigger>disabled: cannot be toggled</andes-accordion-trigger>
          <andes-accordion-content>Never reachable.</andes-accordion-content>
        </andes-accordion-item>
      </andes-accordion>
    `,
  }),
};

export const Extra: Story = {
  name: 'Extra slot and showArrow',
  render: () => ({
    moduleMetadata: { imports: [...PARTS, AndesButton] },
    props: { edits: 0 },
    template: `
      <andes-accordion bordered type="multiple" style="${WIDTH}">
        <andes-accordion-item value="projected">
          <andes-accordion-trigger>
            Projected extra
            <andes-button andesAccordionExtra variant="ghost" size="xs" (click)="edits = edits + 1">
              Edit ({{ edits }})
            </andes-button>
          </andes-accordion-trigger>
          <andes-accordion-content>Clicking the extra button does not toggle the panel.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="input">
          <andes-accordion-trigger extra="3 files">Extra via the input</andes-accordion-trigger>
          <andes-accordion-content>Plain text extra, muted.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="no-arrow" [showArrow]="false">
          <andes-accordion-trigger>No arrow (showArrow=false)</andes-accordion-trigger>
          <andes-accordion-content>Still toggles from the whole row.</andes-accordion-content>
        </andes-accordion-item>
      </andes-accordion>
    `,
  }),
};

export const LazyContent: Story = {
  name: 'Lazy content, forceRender and destroyOnHidden',
  args: { destroyOnHidden: false },
  render: (args) => ({
    moduleMetadata: { imports: PARTS },
    props: args,
    template: `${FIELD_STYLES}
      <andes-accordion type="multiple" [destroyOnHidden]="destroyOnHidden" style="${WIDTH}">
        <andes-accordion-item value="eager">
          <andes-accordion-trigger>Projected (always rendered)</andes-accordion-trigger>
          <andes-accordion-content>
            <label>Type something, close, reopen: <input class="sb-field-input" aria-label="Eager field" /></label>
          </andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="lazy">
          <andes-accordion-trigger>Lazy template (rendered on first open)</andes-accordion-trigger>
          <andes-accordion-content>
            <ng-template andesAccordionLazy>
              <label>Kept after close unless destroyOnHidden: <input class="sb-field-input" aria-label="Lazy field" /></label>
            </ng-template>
          </andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="forced" forceRender>
          <andes-accordion-trigger>Lazy + forceRender (rendered up front)</andes-accordion-trigger>
          <andes-accordion-content>
            <ng-template andesAccordionLazy>Rendered before the first open.</ng-template>
          </andes-accordion-content>
        </andes-accordion-item>
      </andes-accordion>
    `,
  }),
};

const ITEMS: AndesAccordionItemConfig[] = [
  {
    key: 'profile',
    label: 'Profile',
    content: 'Name, avatar and bio.',
    extra: 'Complete',
  },
  {
    key: 'billing',
    label: 'Billing',
    content: 'Invoices and payment methods.',
    collapsible: 'header',
  },
  {
    key: 'danger',
    label: 'Danger zone',
    content: 'Delete the workspace.',
    disabled: true,
  },
];

export const ItemsInput: Story = {
  name: 'items input (data-driven panels)',
  render: () => ({
    props: { items: ITEMS },
    template: `
      <andes-accordion bordered [items]="items" [activeKey]="['profile']" style="${WIDTH}" />
    `,
  }),
};

export const ArrowNavigation: Story = {
  name: 'arrowNavigation (opt-in)',
  args: { arrowNavigation: true, bordered: true },
};

export const Nested: Story = {
  name: 'Nested accordions',
  render: () => ({
    moduleMetadata: { imports: PARTS },
    props: { outer: ['orders'], inner: [] as string[] },
    template: `
      <div style="${WIDTH} display: grid; gap: 0.75rem;">
        <andes-accordion bordered type="multiple" [(activeKey)]="outer">
          <andes-accordion-item value="orders">
            <andes-accordion-trigger>Orders</andes-accordion-trigger>
            <andes-accordion-content>
              <andes-accordion size="sm" [(activeKey)]="inner">
                <andes-accordion-item value="open">
                  <andes-accordion-trigger extra="12">Open orders</andes-accordion-trigger>
                  <andes-accordion-content>Awaiting fulfilment.</andes-accordion-content>
                </andes-accordion-item>
                <andes-accordion-item value="closed">
                  <andes-accordion-trigger extra="48">Closed orders</andes-accordion-trigger>
                  <andes-accordion-content>Shipped and invoiced.</andes-accordion-content>
                </andes-accordion-item>
              </andes-accordion>
            </andes-accordion-content>
          </andes-accordion-item>
          <andes-accordion-item value="customers">
            <andes-accordion-trigger>Customers</andes-accordion-trigger>
            <andes-accordion-content>Each accordion keeps its own open state.</andes-accordion-content>
          </andes-accordion-item>
        </andes-accordion>
        <p style="margin: 0; font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-muted-foreground);">
          outer: [{{ outer.join(', ') }}] - inner: [{{ inner.join(', ') }}]
        </p>
      </div>
    `,
  }),
};

const CARD_STYLE =
  'margin-bottom: 0.75rem; padding-inline: var(--andes-space-4); border: none; border-radius: var(--andes-radius-lg); background-color: var(--andes-color-muted);';

const CARD_ITEMS: AndesAccordionItemConfig[] = [
  {
    key: 'shipping',
    label: 'Shipping address',
    content: 'Warehouse 3, North Industrial Park.',
    style: CARD_STYLE,
  },
  {
    key: 'payment',
    label: 'Payment terms',
    content: 'Net 30, invoiced at the end of each month.',
    style: CARD_STYLE,
  },
  {
    key: 'notes',
    label: 'Internal notes',
    content: 'Prefers deliveries before noon.',
    style: CARD_STYLE,
  },
];

export const CustomPanels: Story = {
  name: 'Custom panels (per-item class/style)',
  render: () => ({
    props: { items: CARD_ITEMS },
    template: `
      <ng-template #caret let-active>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
             [style.transform]="active ? 'rotate(90deg)' : null"
             style="transition: transform 0.2s ease;">
          <path d="M8 5l10 7-10 7z" />
        </svg>
      </ng-template>
      <andes-accordion
        ghost
        expandIconPosition="start"
        [expandIcon]="caret"
        [items]="items"
        [activeKey]="['shipping']"
        style="${WIDTH}"
      />
    `,
  }),
};

export const HeaderIcon: Story = {
  name: 'Header with a leading icon',
  render: () => ({
    moduleMetadata: { imports: PARTS },
    template: `
      <andes-accordion bordered [activeKey]="['sales']" style="${WIDTH}">
        <andes-accordion-item value="sales">
          <andes-accordion-trigger>
            <span style="display: flex; align-items: center; gap: 0.5rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 3 3 5-6" />
              </svg>
              Sales report
            </span>
          </andes-accordion-trigger>
          <andes-accordion-content>Monthly revenue by branch.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="stock">
          <andes-accordion-trigger>
            <span style="display: flex; align-items: center; gap: 0.5rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 8l-9-5-9 5 9 5 9-5z" />
                <path d="M3 8v8l9 5 9-5V8" />
              </svg>
              Stock levels
            </span>
          </andes-accordion-trigger>
          <andes-accordion-content>Units on hand per warehouse.</andes-accordion-content>
        </andes-accordion-item>
      </andes-accordion>
    `,
  }),
};
