import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesLayout } from './layout';
import { AndesLayoutContent } from './layout-content';
import { AndesLayoutFooter } from './layout-footer';
import { AndesLayoutHeader } from './layout-header';
import { AndesLayoutSider } from './layout-sider';

const ICON = (path: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const HOME = ICON(
  '<path d="M2.5 7.5 8 3l5.5 4.5V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5z"/><path d="M6.5 13.5v-4h3v4"/>',
);
const BOX = ICON(
  '<path d="m8 2 5.5 3v6L8 14l-5.5-3V5z"/><path d="M2.5 5 8 8l5.5-3M8 8v6"/>',
);
const CHART = ICON(
  '<path d="M3 13.5V3M3 13.5h10.5"/><path d="M6 11V8M9 11V5M12 11V7"/>',
);
const GEAR = ICON(
  '<circle cx="8" cy="8" r="2"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M12.2 3.8l-1 1M4.8 11.2l-1 1"/>',
);

const NAV = `
  <nav class="nav" aria-label="Sections">
    <a class="nav__item nav__item--active" href="#home">${HOME}<span class="label">Dashboard</span></a>
    <a class="nav__item" href="#orders">${BOX}<span class="label">Orders</span></a>
    <a class="nav__item" href="#reports">${CHART}<span class="label">Reports</span></a>
    <a class="nav__item" href="#settings">${GEAR}<span class="label">Settings</span></a>
  </nav>`;

const STYLES = `
  .frame { display: flex; height: 22rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-lg); overflow: hidden; }
  .frame--scroll { overflow: auto; display: block; }
  .pad { padding: 1rem; }
  .title { font: 600 16px/24px var(--andes-font-family), sans-serif; }
  .nav { display: flex; flex-direction: column; gap: 2px; padding: 0.5rem; }
  .nav__item { display: flex; align-items: center; gap: 0.5rem; height: 2rem; padding: 0 0.5rem; border-radius: var(--andes-radius-md); color: inherit; text-decoration: none; white-space: nowrap; overflow: hidden; font: 14px/22px var(--andes-font-family), sans-serif; }
  .nav__item:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
  .nav__item--active { font-weight: 500; background: color-mix(in srgb, currentColor 12%, transparent); }
  .nav__item:focus-visible { outline: 2px solid var(--andes-color-focus-ring); outline-offset: -2px; }
  .nav svg { flex: none; }
  andes-layout-sider[data-collapsed] .label { display: none; }
  andes-layout-sider[data-collapsed] .nav__item { justify-content: center; padding: 0; }
  .tall { height: 60rem; }
  .menu { display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; font-weight: 600; }
`;

const meta: Meta<AndesLayout> = {
  title: 'Layout/Classic',
  component: AndesLayout,
  subcomponents: {
    AndesLayoutHeader,
    AndesLayoutContent,
    AndesLayoutFooter,
    AndesLayoutSider,
  },
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        AndesLayoutHeader,
        AndesLayoutContent,
        AndesLayoutFooter,
        AndesLayoutSider,
      ],
    }),
  ],
  parameters: { layout: 'padded' },
  render: () => ({
    styles: [STYLES],
    template: `
      <div class="frame">
        <andes-layout>
          <andes-layout-header><span class="title">Acme ERP</span></andes-layout-header>
          <andes-layout-content class="pad">Content</andes-layout-content>
          <andes-layout-footer>Acme ERP ©2026</andes-layout-footer>
        </andes-layout>
      </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesLayout>;

/** Header, content and footer in a column. */
export const Basic: Story = {};

/** A sider makes the outer layout a row; the inner layout holds the header, content and footer. */
export const WithSider: Story = {
  render: () => ({
    styles: [STYLES],
    props: { nav: NAV },
    template: `
      <div class="frame">
        <andes-layout>
          <andes-layout-sider aria-label="Main">${NAV}</andes-layout-sider>
          <andes-layout>
            <andes-layout-header><span class="title">Dashboard</span></andes-layout-header>
            <andes-layout-content class="pad">Content</andes-layout-content>
            <andes-layout-footer>Acme ERP ©2026</andes-layout-footer>
          </andes-layout>
        </andes-layout>
      </div>`,
  }),
};

/** The built-in toggle collapses the sider to a 64px rail; the width animates for 200ms. */
export const Collapsible: Story = {
  render: () => {
    const collapsed = signal(false);
    return {
      styles: [STYLES],
      props: { collapsed },
      template: `
        <p style="margin:0 0 0.5rem;font:14px/22px var(--andes-font-family),sans-serif">collapsed = {{ collapsed() }}</p>
        <div class="frame">
          <andes-layout>
            <andes-layout-sider collapsible [(collapsed)]="collapsed">${NAV}</andes-layout-sider>
            <andes-layout>
              <andes-layout-header><span class="title">Dashboard</span></andes-layout-header>
              <andes-layout-content class="pad">Content</andes-layout-content>
            </andes-layout>
          </andes-layout>
        </div>`,
    };
  },
};

/** With a collapsed width of 0 the sider disappears and a tab at its edge brings it back. */
export const ZeroWidthTrigger: Story = {
  render: () => {
    const collapsed = signal(true);
    return {
      styles: [STYLES],
      props: { collapsed },
      template: `
        <div class="frame">
          <andes-layout>
            <andes-layout-sider collapsible [collapsedWidth]="0" [(collapsed)]="collapsed">${NAV}</andes-layout-sider>
            <andes-layout>
              <andes-layout-header><span class="title">Dashboard</span></andes-layout-header>
              <andes-layout-content class="pad">Content</andes-layout-content>
            </andes-layout>
          </andes-layout>
        </div>`,
    };
  },
};

export const DarkSider: Story = {
  render: () => ({
    styles: [STYLES],
    template: `
      <div class="frame">
        <andes-layout>
          <andes-layout-sider theme="dark" collapsible>${NAV}</andes-layout-sider>
          <andes-layout>
            <andes-layout-header><span class="title">Dashboard</span></andes-layout-header>
            <andes-layout-content class="pad">Content</andes-layout-content>
          </andes-layout>
        </andes-layout>
      </div>`,
  }),
};

/** Below the breakpoint the sider collapses by itself (resize the window); the user can still toggle it. */
export const BreakpointCollapse: Story = {
  render: () => {
    const collapsed = signal(false);
    const broken = signal(false);
    return {
      styles: [STYLES],
      props: { collapsed, broken },
      template: `
        <p style="margin:0 0 0.5rem;font:14px/22px var(--andes-font-family),sans-serif">
          Collapses below 992px. Below the breakpoint: {{ broken() }}
        </p>
        <div class="frame">
          <andes-layout>
            <andes-layout-sider collapsible breakpoint="lg" [(collapsed)]="collapsed" (breakpointChange)="broken.set($event)">${NAV}</andes-layout-sider>
            <andes-layout>
              <andes-layout-header><span class="title">Dashboard</span></andes-layout-header>
              <andes-layout-content class="pad">Content</andes-layout-content>
            </andes-layout>
          </andes-layout>
        </div>`,
    };
  },
};

/** The toggle can be any content; pass it as a template. Use non-interactive content - it sits inside the toggle button. */
export const CustomTrigger: Story = {
  render: () => ({
    styles: [STYLES],
    template: `
      <ng-template #trigger><span style="font:500 12px/20px var(--andes-font-family),sans-serif">Toggle menu</span></ng-template>
      <div class="frame">
        <andes-layout>
          <andes-layout-sider collapsible [trigger]="trigger">${NAV}</andes-layout-sider>
          <andes-layout><andes-layout-content class="pad">Content</andes-layout-content></andes-layout>
        </andes-layout>
      </div>`,
  }),
};

/** A sider on the end side: `side="end"` moves its border, `reverseArrow` flips the arrow. */
export const EndSide: Story = {
  render: () => ({
    styles: [STYLES],
    template: `
      <div class="frame">
        <andes-layout>
          <andes-layout>
            <andes-layout-header><span class="title">Dashboard</span></andes-layout-header>
            <andes-layout-content class="pad">Content</andes-layout-content>
          </andes-layout>
          <andes-layout-sider side="end" collapsible reverseArrow>${NAV}</andes-layout-sider>
        </andes-layout>
      </div>`,
  }),
};

/** The header stays at the top while the content scrolls. */
export const StickyHeader: Story = {
  render: () => ({
    styles: [STYLES],
    template: `
      <div class="frame frame--scroll">
        <andes-layout-header position="sticky"><span class="title">Sticky header</span></andes-layout-header>
        <div class="pad tall">Scroll this box: the header stays put.</div>
        <andes-layout-footer position="sticky">Sticky footer</andes-layout-footer>
      </div>`,
  }),
};

export const RightToLeft: Story = {
  render: () => ({
    styles: [STYLES],
    template: `
      <div dir="rtl">
        <div class="frame">
          <andes-layout>
            <andes-layout-sider collapsible>${NAV}</andes-layout-sider>
            <andes-layout>
              <andes-layout-header><span class="title">لوحة التحكم</span></andes-layout-header>
              <andes-layout-content class="pad">المحتوى</andes-layout-content>
            </andes-layout>
          </andes-layout>
        </div>
      </div>`,
  }),
};
