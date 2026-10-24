import { Component, input, signal } from '@angular/core';
import { type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { AndesNavigationMenu } from './navigation-menu';
import { AndesNavigationMenuContent } from './navigation-menu-content';
import { AndesNavigationMenuItem } from './navigation-menu-item';
import {
  AndesNavigationMenuLink,
  AndesNavigationMenuLinkDescription,
  AndesNavigationMenuLinkTitle,
} from './navigation-menu-link';
import { AndesNavigationMenuTrigger } from './navigation-menu-trigger';

/** The application navigation most stories share. */
@Component({
  selector: 'andes-story-nav',
  imports: [
    AndesNavigationMenu,
    AndesNavigationMenuItem,
    AndesNavigationMenuTrigger,
    AndesNavigationMenuContent,
    AndesNavigationMenuLink,
    AndesNavigationMenuLinkTitle,
    AndesNavigationMenuLinkDescription,
  ],
  template: `
    <andes-navigation-menu
      ariaLabel="Main"
      [align]="align()"
      [indicator]="indicator()"
      [delayDuration]="delayDuration()"
      [closeDelay]="closeDelay()"
      [mobileBreakpoint]="mobileBreakpoint()"
      [(value)]="value"
    >
      <andes-navigation-menu-item value="modules">
        <button type="button" andesNavigationMenuTrigger>Modules</button>
        <andes-navigation-menu-content [columns]="2" width="34rem">
          <a
            andesNavigationMenuLink
            href="#sales"
            [active]="current() === 'sales'"
          >
            <span andesNavigationMenuLinkTitle>Sales</span>
            <span andesNavigationMenuLinkDescription>
              Quotes, orders and invoices in one flow.
            </span>
          </a>
          <a andesNavigationMenuLink href="#inventory">
            <span andesNavigationMenuLinkTitle>Inventory</span>
            <span andesNavigationMenuLinkDescription>
              Stock levels, transfers and counts per warehouse.
            </span>
          </a>
          <a andesNavigationMenuLink href="#purchasing">
            <span andesNavigationMenuLinkTitle>Purchasing</span>
            <span andesNavigationMenuLinkDescription>
              Supplier orders, receipts and approvals.
            </span>
          </a>
          <a andesNavigationMenuLink href="#accounting">
            <span andesNavigationMenuLinkTitle>Accounting</span>
            <span andesNavigationMenuLinkDescription>
              Ledgers, reconciliation and period close.
            </span>
          </a>
        </andes-navigation-menu-content>
      </andes-navigation-menu-item>

      <andes-navigation-menu-item value="resources">
        <button type="button" andesNavigationMenuTrigger>Resources</button>
        <andes-navigation-menu-content>
          <a andesNavigationMenuLink href="#guides">
            <span andesNavigationMenuLinkTitle>Guides</span>
            <span andesNavigationMenuLinkDescription
              >Step by step how-tos.</span
            >
          </a>
          <a andesNavigationMenuLink href="#api">
            <span andesNavigationMenuLinkTitle>API reference</span>
            <span andesNavigationMenuLinkDescription
              >Endpoints and payloads.</span
            >
          </a>
          <a andesNavigationMenuLink href="#changelog">
            <span andesNavigationMenuLinkTitle>Changelog</span>
            <span andesNavigationMenuLinkDescription
              >What shipped, and when.</span
            >
          </a>
        </andes-navigation-menu-content>
      </andes-navigation-menu-item>

      <andes-navigation-menu-item value="company">
        <button type="button" andesNavigationMenuTrigger>Company</button>
        <andes-navigation-menu-content width="14rem">
          <a andesNavigationMenuLink href="#about">About</a>
          <a andesNavigationMenuLink href="#careers">Careers</a>
          <a andesNavigationMenuLink href="#contact">Contact</a>
        </andes-navigation-menu-content>
      </andes-navigation-menu-item>

      <andes-navigation-menu-item>
        <a
          andesNavigationMenuLink
          href="#pricing"
          [active]="current() === 'pricing'"
        >
          Pricing
        </a>
      </andes-navigation-menu-item>
      <andes-navigation-menu-item value="soon" [disabled]="true">
        <button type="button" andesNavigationMenuTrigger>Marketplace</button>
        <andes-navigation-menu-content>
          <a andesNavigationMenuLink href="#market">Browse</a>
        </andes-navigation-menu-content>
      </andes-navigation-menu-item>
    </andes-navigation-menu>
  `,
})
class StoryNav {
  readonly align = input<'start' | 'center' | 'end'>('start');
  readonly indicator = input(true);
  readonly delayDuration = input(150);
  readonly closeDelay = input(150);
  readonly mobileBreakpoint = input(768);
  readonly current = input<string | null>(null);
  readonly value = signal<string | null>(null);
}

/** Drives the two-way `value` from outside. */
@Component({
  selector: 'andes-story-controlled',
  imports: [
    AndesNavigationMenu,
    AndesNavigationMenuItem,
    AndesNavigationMenuTrigger,
    AndesNavigationMenuContent,
    AndesNavigationMenuLink,
  ],
  template: `
    <div
      style="display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: center; font-size: 0.875rem;"
    >
      <button type="button" (click)="value.set('alpha')" class="story-button">
        Open Alpha
      </button>
      <button type="button" (click)="value.set('beta')" class="story-button">
        Open Beta
      </button>
      <button type="button" (click)="value.set(null)" class="story-button">
        Close
      </button>
      <span
        >value: <code>{{ value() ?? 'null' }}</code></span
      >
    </div>
    <andes-navigation-menu ariaLabel="Controlled" [(value)]="value">
      <andes-navigation-menu-item value="alpha">
        <button type="button" andesNavigationMenuTrigger>Alpha</button>
        <andes-navigation-menu-content>
          <a andesNavigationMenuLink href="#a1">First</a>
          <a andesNavigationMenuLink href="#a2">Second</a>
        </andes-navigation-menu-content>
      </andes-navigation-menu-item>
      <andes-navigation-menu-item value="beta">
        <button type="button" andesNavigationMenuTrigger>Beta</button>
        <andes-navigation-menu-content width="18rem">
          <a andesNavigationMenuLink href="#b1">Another entry</a>
          <a andesNavigationMenuLink href="#b2">And one more</a>
        </andes-navigation-menu-content>
      </andes-navigation-menu-item>
    </andes-navigation-menu>
    <style>
      .story-button {
        font: inherit;
        font-size: 0.875rem;
        padding: 0.25rem 0.75rem;
        border: 1px solid var(--andes-color-input);
        border-radius: 0.375rem;
        background: var(--andes-color-background);
        color: var(--andes-color-foreground);
        cursor: pointer;
      }
    </style>
  `,
})
class StoryControlled {
  protected readonly value = signal<string | null>(null);
}

const meta: Meta<AndesNavigationMenu> = {
  title: 'Navigation Menu',
  component: AndesNavigationMenu,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [StoryNav, StoryControlled] })],
  parameters: { layout: 'padded' },
  argTypes: {
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    indicator: { control: 'boolean' },
    delayDuration: { control: 'number' },
    closeDelay: { control: 'number' },
    mobileBreakpoint: { control: 'number' },
    closeOnNavigate: { control: 'boolean' },
  },
  args: {
    align: 'start',
    indicator: true,
    delayDuration: 150,
    closeDelay: 150,
    mobileBreakpoint: 768,
  },
  render: (args) => ({
    props: args,
    template: `<andes-story-nav
      [align]="align"
      [indicator]="indicator"
      [delayDuration]="delayDuration"
      [closeDelay]="closeDelay"
      [mobileBreakpoint]="mobileBreakpoint"
    />`,
  }),
};

export default meta;

type Story = StoryObj<AndesNavigationMenu>;

/**
 * Hover (or click, or press Down) a trigger. Moving between triggers keeps one panel
 * that resizes to its content, and the arrow follows the active trigger.
 */
export const Default: Story = {};

/** The current page is marked on its link with `aria-current="page"` and a tint. */
export const ActiveLink: Story = {
  render: () => ({
    template: `<andes-story-nav current="pricing" />`,
  }),
};

/** Center the panel under its trigger instead of aligning its start. */
export const CenteredPanel: Story = {
  args: { align: 'center' },
};

export const WithoutIndicator: Story = {
  args: { indicator: false },
};

/** A slower hover intent: 400ms to open, 300ms of grace before it closes. */
export const SlowIntent: Story = {
  args: { delayDuration: 400, closeDelay: 300 },
};

/**
 * Under `mobileBreakpoint` the bar becomes a stacked list and content opens inline below
 * its trigger. Here the breakpoint is set high so it shows at any width.
 */
export const StackedLayout: Story = {
  args: { mobileBreakpoint: 5000 },
  render: (args) => ({
    props: args,
    template: `<div style="max-width: 22rem;"><andes-story-nav [mobileBreakpoint]="mobileBreakpoint" /></div>`,
  }),
};

/** `value` is two-way: open and close the content from your own controls. */
export const ControlledValue: Story = {
  render: () => ({
    template: `<andes-story-controlled />`,
  }),
};

/** Right-to-left: the bar, the arrow keys and the panel mirror. */
export const RightToLeft: Story = {
  render: () => ({
    template: `<div dir="rtl"><andes-story-nav /></div>`,
  }),
};
