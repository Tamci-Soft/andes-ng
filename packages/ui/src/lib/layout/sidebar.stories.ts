import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesSidebar } from './sidebar';
import { AndesSidebarMenuButton } from './sidebar-menu-button';
import {
  AndesSidebarContent,
  AndesSidebarFooter,
  AndesSidebarGroup,
  AndesSidebarGroupLabel,
  AndesSidebarHeader,
  AndesSidebarInset,
  AndesSidebarMenu,
  AndesSidebarMenuBadge,
  AndesSidebarMenuItem,
  AndesSidebarMenuSub,
  AndesSidebarSeparator,
} from './sidebar-parts';
import { AndesSidebarProvider } from './sidebar-provider';
import { AndesSidebarTrigger } from './sidebar-trigger';

const ICON = (path: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const HOME = ICON(
  '<path d="M2.5 7.5 8 3l5.5 4.5V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5z"/><path d="M6.5 13.5v-4h3v4"/>',
);
const BOX = ICON(
  '<path d="m8 2 5.5 3v6L8 14l-5.5-3V5z"/><path d="M2.5 5 8 8l5.5-3M8 8v6"/>',
);
const CART = ICON(
  '<path d="M2 2.5h1.7l1.4 7h6.3l1.1-4.8H4.3"/><circle cx="6" cy="12.8" r=".9"/><circle cx="11" cy="12.8" r=".9"/>',
);
const CHART = ICON(
  '<path d="M3 13.5V3M3 13.5h10.5"/><path d="M6 11V8M9 11V5M12 11V7"/>',
);
const USERS = ICON(
  '<circle cx="6" cy="5.5" r="2.2"/><path d="M2 13c.4-2.2 2-3.4 4-3.4s3.6 1.2 4 3.4"/><path d="M10.5 3.6a2.2 2.2 0 0 1 0 3.8M12 9.8c1 .5 1.8 1.5 2 3.2"/>',
);
const GEAR = ICON(
  '<circle cx="8" cy="8" r="2"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M12.2 3.8l-1 1M4.8 11.2l-1 1"/>',
);
const SEARCH = ICON('<circle cx="7" cy="7" r="4"/><path d="m10 10 3.5 3.5"/>');

const STYLES = `
  .stage { height: 30rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-lg); overflow: hidden; }
  .brand { display: flex; align-items: center; gap: 0.5rem; height: 2rem; padding: 0 0.5rem; overflow: hidden; white-space: nowrap; font: 600 14px/22px var(--andes-font-family), sans-serif; }
  .brand__mark { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: var(--andes-radius-md); background: var(--andes-color-primary); color: var(--andes-color-primary-foreground); font-size: 12px; }
  .bar { display: flex; align-items: center; gap: 0.5rem; height: 3rem; padding: 0 0.75rem; border-bottom: 1px solid var(--andes-color-border); flex: none; }
  .bar__title { font: 600 16px/24px var(--andes-font-family), sans-serif; }
  .page { padding: 1rem; font: 14px/22px var(--andes-font-family), sans-serif; }
  .who { display: flex; align-items: center; gap: 0.5rem; padding: 0 0.5rem; height: 2.5rem; overflow: hidden; white-space: nowrap; font: 14px/22px var(--andes-font-family), sans-serif; }
  .who__avatar { flex: none; width: 1.5rem; height: 1.5rem; border-radius: 9999px; background: var(--andes-color-muted); border: 1px solid var(--andes-color-border); }
  .who__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 1rem; }
  .card { padding: 1rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-lg); background: var(--andes-color-card); color: var(--andes-color-card-foreground); }
  .card__label { color: var(--andes-color-muted-foreground); font-size: 12px; line-height: 20px; }
  .card__value { font: 600 24px/32px var(--andes-font-family), sans-serif; }
  .search { display: flex; align-items: center; gap: 0.5rem; box-sizing: border-box; height: 2rem; min-width: 12rem; padding: 0 0.75rem; border: 1px solid var(--andes-color-input); border-radius: var(--andes-radius-md); background: var(--andes-color-background); color: var(--andes-color-muted-foreground); font: 14px/22px var(--andes-font-family), sans-serif; }
  .search:focus-within { border-color: var(--andes-color-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--andes-color-primary) 20%, transparent); }
  .search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; padding: 0; font: inherit; color: var(--andes-color-foreground); }
  .grow { flex: 1; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { padding: 0.5rem 0.75rem; text-align: start; border-bottom: 1px solid var(--andes-color-border); }
  th { color: var(--andes-color-muted-foreground); font-weight: 500; font-size: 12px; line-height: 20px; }
`;

const MENU = `
  <andes-sidebar-header>
    <div class="brand"><span class="brand__mark">A</span><span>Acme ERP</span></div>
  </andes-sidebar-header>
  <andes-sidebar-content>
    <andes-sidebar-group>
      <andes-sidebar-group-label>Platform</andes-sidebar-group-label>
      <andes-sidebar-menu>
        <andes-sidebar-menu-item>
          <andes-sidebar-menu-button href="#dashboard" [active]="true" tooltip="Dashboard">${HOME}<span>Dashboard</span></andes-sidebar-menu-button>
        </andes-sidebar-menu-item>
        <andes-sidebar-menu-item>
          <andes-sidebar-menu-button href="#orders" tooltip="Orders">${CART}<span>Orders</span><andes-sidebar-menu-badge>12</andes-sidebar-menu-badge></andes-sidebar-menu-button>
          <andes-sidebar-menu-sub>
            <andes-sidebar-menu-item><andes-sidebar-menu-button href="#open" size="sm"><span>Open</span></andes-sidebar-menu-button></andes-sidebar-menu-item>
            <andes-sidebar-menu-item><andes-sidebar-menu-button href="#shipped" size="sm"><span>Shipped</span></andes-sidebar-menu-button></andes-sidebar-menu-item>
          </andes-sidebar-menu-sub>
        </andes-sidebar-menu-item>
        <andes-sidebar-menu-item>
          <andes-sidebar-menu-button href="#inventory" tooltip="Inventory">${BOX}<span>Inventory</span></andes-sidebar-menu-button>
        </andes-sidebar-menu-item>
      </andes-sidebar-menu>
    </andes-sidebar-group>
    <andes-sidebar-group>
      <andes-sidebar-group-label>Insights</andes-sidebar-group-label>
      <andes-sidebar-menu>
        <andes-sidebar-menu-item>
          <andes-sidebar-menu-button href="#reports" tooltip="Reports">${CHART}<span>Reports</span></andes-sidebar-menu-button>
        </andes-sidebar-menu-item>
        <andes-sidebar-menu-item>
          <andes-sidebar-menu-button href="#customers" tooltip="Customers">${USERS}<span>Customers</span></andes-sidebar-menu-button>
        </andes-sidebar-menu-item>
      </andes-sidebar-menu>
    </andes-sidebar-group>
  </andes-sidebar-content>
  <andes-sidebar-separator />
  <andes-sidebar-footer>
    <andes-sidebar-menu>
      <andes-sidebar-menu-item>
        <andes-sidebar-menu-button tooltip="Settings">${GEAR}<span>Settings</span></andes-sidebar-menu-button>
      </andes-sidebar-menu-item>
    </andes-sidebar-menu>
  </andes-sidebar-footer>`;

const PAGE = `
  <div class="bar"><andes-sidebar-trigger /><span class="bar__title">Dashboard</span></div>
  <main class="page">
    <p style="margin:0">Press <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>B</kbd> or use the button to toggle the sidebar.</p>
  </main>`;

const meta: Meta<AndesSidebar> = {
  title: 'Layout/Sidebar',
  component: AndesSidebar,
  subcomponents: {
    AndesSidebarProvider,
    AndesSidebarInset,
    AndesSidebarTrigger,
    AndesSidebarMenuButton,
  },
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        AndesSidebarProvider,
        AndesSidebarInset,
        AndesSidebarTrigger,
        AndesSidebarHeader,
        AndesSidebarContent,
        AndesSidebarFooter,
        AndesSidebarGroup,
        AndesSidebarGroupLabel,
        AndesSidebarMenu,
        AndesSidebarMenuItem,
        AndesSidebarMenuSub,
        AndesSidebarMenuBadge,
        AndesSidebarMenuButton,
        AndesSidebarSeparator,
      ],
    }),
  ],
  parameters: { layout: 'padded' },
  argTypes: {
    side: { control: 'inline-radio', options: ['start', 'end'] },
    variant: {
      control: 'inline-radio',
      options: ['sidebar', 'floating', 'inset'],
    },
    collapsible: {
      control: 'inline-radio',
      options: ['icon', 'offcanvas', 'none'],
    },
  },
  args: { side: 'start', variant: 'sidebar', collapsible: 'icon' },
  render: (args) => ({
    props: args,
    styles: [STYLES],
    template: `
      <div class="stage">
        <andes-sidebar-provider contained>
          <andes-sidebar [side]="side" [variant]="variant" [collapsible]="collapsible">${MENU}</andes-sidebar>
          <andes-sidebar-inset>${PAGE}</andes-sidebar-inset>
        </andes-sidebar-provider>
      </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesSidebar>;

/** Collapses to an icon rail; hover or focus an icon to see its tooltip. */
export const IconCollapsible: Story = {};

/** Slides fully out of view; the page takes the freed space with no jump. */
export const Offcanvas: Story = { args: { collapsible: 'offcanvas' } };

export const Floating: Story = { args: { variant: 'floating' } };

/** The page becomes a rounded card on the sidebar's background. */
export const Inset: Story = { args: { variant: 'inset' } };

export const EndSide: Story = { args: { side: 'end' } };

/** Always expanded: no trigger needed. */
export const NotCollapsible: Story = { args: { collapsible: 'none' } };

/** `storageKey` remembers the state: collapse it, reload the story and it stays collapsed. */
export const Persisted: Story = {
  render: () => ({
    styles: [STYLES],
    template: `
      <div class="stage">
        <andes-sidebar-provider contained storageKey="andes-story-sidebar">
          <andes-sidebar collapsible="icon">${MENU}</andes-sidebar>
          <andes-sidebar-inset>${PAGE}</andes-sidebar-inset>
        </andes-sidebar-provider>
      </div>`,
  }),
};

/** Two-way `open` lets the app drive the state. */
export const Controlled: Story = {
  render: () => {
    const open = signal(true);
    return {
      styles: [STYLES],
      props: { open },
      template: `
        <p class="page" style="padding:0 0 0.5rem">open = {{ open() }}
          <button type="button" (click)="open.set(!open())" style="margin-inline-start:0.5rem">Toggle from outside</button>
        </p>
        <div class="stage">
          <andes-sidebar-provider contained [(open)]="open">
            <andes-sidebar collapsible="icon">${MENU}</andes-sidebar>
            <andes-sidebar-inset>${PAGE}</andes-sidebar-inset>
          </andes-sidebar-provider>
        </div>`,
    };
  },
};

/**
 * Below `mobileBreakpoint` the sidebar is a modal overlay: scrim, focus trap, Escape closes. Here the
 * breakpoint is raised so the overlay shows at any width - open it with the button.
 */
export const MobileOverlay: Story = {
  render: () => ({
    styles: [STYLES],
    template: `
      <div class="stage">
        <andes-sidebar-provider contained [mobileBreakpoint]="100000">
          <andes-sidebar>${MENU}</andes-sidebar>
          <andes-sidebar-inset>${PAGE}</andes-sidebar-inset>
        </andes-sidebar-provider>
      </div>`,
  }),
};

export const RightToLeft: Story = {
  render: () => ({
    styles: [STYLES],
    template: `
      <div dir="rtl" class="stage">
        <andes-sidebar-provider contained>
          <andes-sidebar collapsible="icon">${MENU}</andes-sidebar>
          <andes-sidebar-inset>${PAGE}</andes-sidebar-inset>
        </andes-sidebar-provider>
      </div>`,
  }),
};

/**
 * A complete admin shell: header with the trigger and search, a collapsible sidebar with groups,
 * badges and a submenu, and a page of cards and a table. Resize below 768px for the overlay.
 */
export const AdminLayout: Story = {
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false, iframeHeight: 640 } },
  },
  render: () => ({
    styles: [STYLES],
    template: `
      <andes-sidebar-provider storageKey="andes-story-admin-sidebar">
        <andes-sidebar collapsible="icon" label="Main navigation">
          ${MENU.replace(
            /<andes-sidebar-footer>[\s\S]*<\/andes-sidebar-footer>/,
            `
          <andes-sidebar-footer>
            <div class="who"><span class="who__avatar" aria-hidden="true"></span><span class="who__name">Rosa Quispe</span></div>
          </andes-sidebar-footer>`,
          )}
        </andes-sidebar>
        <andes-sidebar-inset>
          <header class="bar">
            <andes-sidebar-trigger />
            <span class="bar__title">Dashboard</span>
            <span class="grow"></span>
            <label class="search">${SEARCH}<input type="search" placeholder="Search orders" aria-label="Search orders" /></label>
          </header>
          <main class="page">
            <div class="cards">
              <div class="card"><div class="card__label">Revenue</div><div class="card__value">S/ 84,200</div></div>
              <div class="card"><div class="card__label">Open orders</div><div class="card__value">128</div></div>
              <div class="card"><div class="card__label">Low stock</div><div class="card__value">14</div></div>
              <div class="card"><div class="card__label">Customers</div><div class="card__value">2,310</div></div>
            </div>
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                <tr><td>#1042</td><td>Minera Andina</td><td>Shipped</td><td>S/ 4,820</td></tr>
                <tr><td>#1041</td><td>Textiles del Sur</td><td>Open</td><td>S/ 1,260</td></tr>
                <tr><td>#1040</td><td>Café Selva</td><td>Open</td><td>S/ 9,075</td></tr>
                <tr><td>#1039</td><td>Constructora Inti</td><td>Shipped</td><td>S/ 2,340</td></tr>
              </tbody>
            </table>
          </main>
        </andes-sidebar-inset>
      </andes-sidebar-provider>`,
  }),
};
