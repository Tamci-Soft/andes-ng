import type { Meta, StoryObj } from '@storybook/angular';

import { AndesBackTop } from './back-top';
import { AndesFloatButton } from './float-button';
import { AndesFloatButtonGroup } from './float-button-group';

const chat = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"/></svg>`;
const help = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M6.2 6.3a1.9 1.9 0 1 1 2.6 1.8c-.5.3-.8.6-.8 1.2M8 11.4h.01"/></svg>`;
const doc = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M4 2h5l3 3v9H4z"/><path d="M9 2v3h3"/></svg>`;
const mail = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.5 4.5 5.5 4.5 5.5-4.5"/></svg>`;

/** Fixed elements are positioned against this stage (a transformed box), not the whole viewport,
 *  so several examples can share a page. */
const styles = [
  `
  .stage { position: relative; transform: translateZ(0); width: 28rem; height: 18rem; overflow: hidden; border: 1px dashed var(--andes-color-border); border-radius: var(--andes-radius-md); background: var(--andes-color-background); color: var(--andes-color-muted-foreground); font-size: 0.875rem; line-height: 1.375rem; }
  .stage p { margin: 0; padding: 0.75rem 1rem; }
  .row { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-start; }
  `,
];

const meta: Meta<AndesFloatButton> = {
  title: 'FloatButton',
  component: AndesFloatButton,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'inline-radio', options: ['default', 'primary'] },
    shape: { control: 'inline-radio', options: ['circle', 'square'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    description: { control: 'text' },
    tooltip: { control: 'text' },
    href: { control: 'text' },
    target: { control: 'text' },
    badgeCount: { control: 'text' },
    badgeDot: { control: 'boolean' },
    right: { control: 'text' },
    bottom: { control: 'text' },
  },
  args: {
    type: 'default',
    shape: 'circle',
    size: 'md',
    disabled: false,
    tooltip: 'Chat with support',
    badgeDot: false,
  },
  render: (args) => ({
    props: args,
    styles,
    template: `
      <div class="stage"><p>Page content. The button is fixed to the bottom corner of the page (here, of this box).</p>
        <andes-float-button aria-label="Chat with support" [type]="type" [shape]="shape" [size]="size" [disabled]="disabled" [description]="description" [tooltip]="tooltip" [href]="href" [target]="target" [badgeCount]="badgeCount" [badgeDot]="badgeDot" [right]="right" [bottom]="bottom">${chat}</andes-float-button>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesFloatButton>;

export const Default: Story = {};

export const Primary: Story = { args: { type: 'primary' } };

export const Square: Story = { args: { shape: 'square' } };

export const Sizes: Story = {
  render: () => ({
    styles,
    template: `
      <div class="row">
        <andes-float-button [fixed]="false" size="sm" aria-label="Small">${chat}</andes-float-button>
        <andes-float-button [fixed]="false" size="md" aria-label="Medium">${chat}</andes-float-button>
        <andes-float-button [fixed]="false" size="lg" aria-label="Large">${chat}</andes-float-button>
        <andes-float-button [fixed]="false" size="sm" type="primary" shape="square" aria-label="Small">${chat}</andes-float-button>
        <andes-float-button [fixed]="false" size="md" type="primary" shape="square" aria-label="Medium">${chat}</andes-float-button>
        <andes-float-button [fixed]="false" size="lg" type="primary" shape="square" aria-label="Large">${chat}</andes-float-button>
      </div>
    `,
  }),
};

/** A caption under the icon turns the button into a rounded rectangle. */
export const WithDescription: Story = {
  render: () => ({
    styles,
    template: `
      <div class="row">
        <andes-float-button [fixed]="false" description="Help" aria-label="Help">${help}</andes-float-button>
        <andes-float-button [fixed]="false" description="Docs" type="primary" shape="square" aria-label="Documentation">${doc}</andes-float-button>
        <andes-float-button [fixed]="false" description="Feedback" size="lg" aria-label="Feedback">${mail}</andes-float-button>
      </div>
    `,
  }),
};

/** A count, a capped count, and a dot. */
export const Badges: Story = {
  render: () => ({
    styles,
    template: `
      <div class="row">
        <andes-float-button [fixed]="false" [badgeCount]="3" aria-label="Messages, 3 unread">${mail}</andes-float-button>
        <andes-float-button [fixed]="false" [badgeCount]="250" aria-label="Messages, many unread">${mail}</andes-float-button>
        <andes-float-button [fixed]="false" [badgeCount]="250" [badgeOverflowCount]="999" aria-label="Messages">${mail}</andes-float-button>
        <andes-float-button [fixed]="false" badgeDot type="primary" aria-label="Messages, new">${mail}</andes-float-button>
      </div>
    `,
  }),
};

/** With `href` the button is an anchor; `target="_blank"` adds a safe `rel`. */
export const AsLink: Story = {
  render: () => ({
    styles,
    template: `
      <div class="row">
        <andes-float-button [fixed]="false" href="https://example.com/docs" target="_blank" tooltip="Open the docs" aria-label="Open the docs">${doc}</andes-float-button>
        <andes-float-button [fixed]="false" href="https://example.com/docs" disabled aria-label="Docs (unavailable)">${doc}</andes-float-button>
      </div>
    `,
  }),
};

export const Disabled: Story = { args: { disabled: true } };

/** `right`, `bottom`, `left` and `top` are CSS lengths; safe-area insets are added automatically. */
export const CustomPosition: Story = {
  render: () => ({
    styles,
    template: `
      <div class="stage"><p>Anchored 2rem from the start edge and 1rem from the top.</p>
        <andes-float-button left="2rem" top="1rem" type="primary" aria-label="Chat">${chat}</andes-float-button>
      </div>
    `,
  }),
};

export const GroupStack: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesFloatButtonGroup] },
    styles,
    template: `
      <div class="row">
        <div class="stage" style="width: 12rem;"><p>Circles</p>
          <andes-float-button-group aria-label="Support" right="1rem" bottom="1rem">
            <andes-float-button aria-label="Chat">${chat}</andes-float-button>
            <andes-float-button aria-label="Help">${help}</andes-float-button>
            <andes-float-button aria-label="Docs">${doc}</andes-float-button>
          </andes-float-button-group>
        </div>
        <div class="stage" style="width: 12rem;"><p>Squares</p>
          <andes-float-button-group aria-label="Support" shape="square" right="1rem" bottom="1rem">
            <andes-float-button aria-label="Chat">${chat}</andes-float-button>
            <andes-float-button aria-label="Help">${help}</andes-float-button>
            <andes-float-button aria-label="Docs">${doc}</andes-float-button>
          </andes-float-button-group>
        </div>
      </div>
    `,
  }),
};

/** Click the trigger to open a menu; Escape or a press outside closes it. */
export const GroupClickTrigger: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesFloatButtonGroup] },
    styles,
    props: { open: false },
    template: `
      <div class="stage"><p>{{ open ? 'Menu open' : 'Menu closed' }}</p>
        <andes-float-button-group trigger="click" type="primary" aria-label="Support actions" [(open)]="open">
          <andes-float-button aria-label="Chat" tooltip="Chat">${chat}</andes-float-button>
          <andes-float-button aria-label="Help" tooltip="Help">${help}</andes-float-button>
          <andes-float-button aria-label="Docs" tooltip="Docs">${doc}</andes-float-button>
        </andes-float-button-group>
      </div>
    `,
  }),
};

/** Hover (or keyboard focus) opens the menu; leaving closes it after a short grace period. */
export const GroupHoverTrigger: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesFloatButtonGroup] },
    styles,
    template: `
      <div class="stage"><p>Hover or Tab to the trigger.</p>
        <andes-float-button-group trigger="hover" shape="square" aria-label="Quick actions">
          <andes-float-button aria-label="Chat">${chat}</andes-float-button>
          <andes-float-button aria-label="Help">${help}</andes-float-button>
          <andes-float-button aria-label="Docs">${doc}</andes-float-button>
        </andes-float-button-group>
      </div>
    `,
  }),
};

/** The menu can open up, down, towards the start edge or towards the end edge. */
export const GroupPlacements: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesFloatButtonGroup] },
    styles,
    template: `
      <div class="row">
        <div class="stage" style="width: 13rem;"><p>up</p>
          <andes-float-button-group trigger="click" placement="up" [open]="true" right="1rem" bottom="1rem" aria-label="Actions (up)">
            <andes-float-button aria-label="Chat">${chat}</andes-float-button>
            <andes-float-button aria-label="Help">${help}</andes-float-button>
          </andes-float-button-group>
        </div>
        <div class="stage" style="width: 13rem;"><p>down</p>
          <andes-float-button-group trigger="click" placement="down" [open]="true" right="1rem" top="1rem" aria-label="Actions (down)">
            <andes-float-button aria-label="Chat">${chat}</andes-float-button>
            <andes-float-button aria-label="Help">${help}</andes-float-button>
          </andes-float-button-group>
        </div>
        <div class="stage" style="width: 13rem;"><p>start</p>
          <andes-float-button-group trigger="click" placement="start" [open]="true" right="1rem" bottom="1rem" aria-label="Actions (start)">
            <andes-float-button aria-label="Chat">${chat}</andes-float-button>
            <andes-float-button aria-label="Help">${help}</andes-float-button>
          </andes-float-button-group>
        </div>
        <div class="stage" style="width: 13rem;"><p>end</p>
          <andes-float-button-group trigger="click" placement="end" [open]="true" left="1rem" bottom="1rem" aria-label="Actions (end)">
            <andes-float-button aria-label="Chat">${chat}</andes-float-button>
            <andes-float-button aria-label="Help">${help}</andes-float-button>
          </andes-float-button-group>
        </div>
      </div>
    `,
  }),
};

export const GroupCustomTriggerIcons: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesFloatButtonGroup] },
    styles,
    template: `
      <ng-template #closed>${help}</ng-template>
      <ng-template #opened>${chat}</ng-template>
      <div class="stage"><p>Custom trigger icons.</p>
        <andes-float-button-group trigger="click" [triggerIcon]="closed" [closeIcon]="opened" aria-label="Support">
          <andes-float-button aria-label="Docs">${doc}</andes-float-button>
          <andes-float-button aria-label="Mail" [badgeDot]="true">${mail}</andes-float-button>
        </andes-float-button-group>
      </div>
    `,
  }),
};

/** Appears after 150px of scroll inside the box and eases back to the top over 450ms. */
export const BackTop: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesBackTop] },
    styles: [
      ...styles,
      `.scroller { height: 100%; overflow: auto; } .scroller p { padding: 0.5rem 1rem; }`,
    ],
    props: { rows: Array.from({ length: 40 }, (_, i) => i + 1) },
    template: `
      <div class="stage">
        <div class="scroller" #scroller tabindex="0" role="region" aria-label="Long list">
          @for (row of rows; track row) { <p>Row {{ row }} - scroll down</p> }
        </div>
        <andes-back-top [target]="scroller" [visibilityHeight]="150" tooltip="Back to top" />
      </div>
    `,
  }),
};

export const BackTopCustom: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesBackTop] },
    styles: [
      ...styles,
      `.scroller { height: 100%; overflow: auto; } .scroller p { padding: 0.5rem 1rem; }`,
    ],
    props: { rows: Array.from({ length: 40 }, (_, i) => i + 1), count: 0 },
    template: `
      <div class="stage">
        <div class="scroller" #scroller tabindex="0" role="region" aria-label="Long list">
          @for (row of rows; track row) { <p>Row {{ row }} - scroll down</p> }
        </div>
        <andes-back-top [target]="scroller" [visibilityHeight]="80" [duration]="0" type="primary" shape="square" size="lg" aria-label="Jump to the top" (clicked)="count = count + 1" />
        <span style="position: absolute; inset-block-start: 0.25rem; inset-inline-end: 0.75rem; font-size: 0.75rem;">clicks: {{ count }}</span>
      </div>
    `,
  }),
};
