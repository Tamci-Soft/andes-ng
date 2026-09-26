import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideHouse,
  lucideSettings,
  lucideUser,
} from '@ng-icons/lucide';
import {
  applicationConfig,
  moduleMetadata,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesTabs } from './tabs';
import { AndesTabsContent, AndesTabsContentLazy } from './tabs-content';
import { AndesTabsList } from './tabs-list';
import { AndesTabsTrigger } from './tabs-trigger';
import type {
  AndesTabsEditEvent,
  AndesTabsItem,
  AndesTabsScrollEvent,
} from './tabs-types';

/** Shows how long its panel's content has been alive, and keeps a counter as local state. */
@Component({
  selector: 'andes-story-panel-state',
  imports: [AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Mounted at {{ mountedAt }}. Clicks kept in this panel: {{ clicks() }}</p>
    <andes-button size="sm" variant="outline" (click)="clicks.set(clicks() + 1)"
      >Click me</andes-button
    >
  `,
})
class StoryPanelState {
  protected readonly mountedAt = new Date().toLocaleTimeString();
  protected readonly clicks = signal(0);
}

const TABS_IMPORTS = [
  AndesTabsList,
  AndesTabsTrigger,
  AndesTabsContent,
  AndesTabsContentLazy,
  AndesButton,
  NgIcon,
  StoryPanelState,
];

const BASIC_TABS = `
  <andes-tabs-list>
    <andes-tabs-trigger value="account">Account</andes-tabs-trigger>
    <andes-tabs-trigger value="password">Password</andes-tabs-trigger>
    <andes-tabs-trigger value="team" disabled>Team (disabled)</andes-tabs-trigger>
  </andes-tabs-list>
  <andes-tabs-content value="account">
    <p>Update your account details here.</p>
  </andes-tabs-content>
  <andes-tabs-content value="password">
    <p>Change your password here.</p>
  </andes-tabs-content>
  <andes-tabs-content value="team">
    <p>Manage your team here.</p>
  </andes-tabs-content>
`;

const meta: Meta<AndesTabs> = {
  title: 'Tabs',
  component: AndesTabs,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: TABS_IMPORTS }),
    applicationConfig({
      providers: [
        provideIcons({ lucideBell, lucideHouse, lucideSettings, lucideUser }),
      ],
    }),
  ],
  argTypes: {
    type: { control: 'select', options: ['line', 'card', 'editable-card'] },
    tabPosition: {
      control: 'select',
      options: [undefined, 'top', 'bottom', 'left', 'right'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    activationMode: { control: 'select', options: ['automatic', 'manual'] },
    centered: { control: 'boolean' },
    tabBarGutter: { control: 'number' },
    animated: { control: 'boolean' },
    destroyOnHidden: { control: 'boolean' },
  },
  args: {
    type: 'line',
    size: 'md',
    orientation: 'horizontal',
    activationMode: 'automatic',
    centered: false,
    animated: true,
    destroyOnHidden: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <andes-tabs
        [type]="type"
        [tabPosition]="tabPosition"
        [size]="size"
        [orientation]="orientation"
        [activationMode]="activationMode"
        [centered]="centered"
        [tabBarGutter]="tabBarGutter"
        [animated]="animated"
        [destroyOnHidden]="destroyOnHidden"
        style="width: min(32rem, calc(100vw - 2rem));"
      >${BASIC_TABS}</andes-tabs>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesTabs>;

export const Default: Story = {};

export const ManualActivation: Story = {
  args: { activationMode: 'manual' },
};

/** `orientation="vertical"` on its own is shorthand for `tabPosition="left"`. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const ControlledValue: Story = {
  render: () => ({
    props: { activeTab: signal('password') },
    template: `
      <div style="width: min(32rem, calc(100vw - 2rem));">
        <p>Active tab: <code>{{ activeTab() }}</code></p>
        <andes-tabs [(value)]="activeTab">
          <andes-tabs-list>
            <andes-tabs-trigger value="account">Account</andes-tabs-trigger>
            <andes-tabs-trigger value="password">Password</andes-tabs-trigger>
          </andes-tabs-list>
          <andes-tabs-content value="account">
            <p>Update your account details here.</p>
          </andes-tabs-content>
          <andes-tabs-content value="password">
            <p>Change your password here. Starts active via the initial value binding.</p>
          </andes-tabs-content>
        </andes-tabs>
      </div>
    `,
  }),
};

export const Card: Story = {
  args: { type: 'card' },
};

/**
 * `editable-card` only emits `(edit)`; the consumer owns the list of tabs. Remove buttons are
 * pointer-only - from the keyboard, press `Delete` on a focused tab.
 */
export const EditableCard: Story = {
  render: () => {
    let next = 4;
    const tabList = signal([
      { key: '1', label: 'Tab 1' },
      { key: '2', label: 'Tab 2' },
      { key: '3', label: 'Tab 3 (not closable)', closable: false },
    ]);
    const activeTab = signal<string | undefined>('1');
    const handleEdit = (event: AndesTabsEditEvent) => {
      if (event.action === 'add') {
        const key = String(next++);
        tabList.update((list) => [...list, { key, label: `Tab ${key}` }]);
        activeTab.set(key);
      } else {
        tabList.update((list) => list.filter((tab) => tab.key !== event.key));
      }
    };
    return {
      props: { tabList, activeTab, handleEdit },
      template: `
        <andes-tabs type="editable-card" [(value)]="activeTab" (edit)="handleEdit($event)"
          style="width: min(32rem, calc(100vw - 2rem));">
          <andes-tabs-list>
            @for (tab of tabList(); track tab.key) {
              <andes-tabs-trigger [value]="tab.key" [closable]="tab.closable ?? true">{{ tab.label }}</andes-tabs-trigger>
            }
          </andes-tabs-list>
          @for (tab of tabList(); track tab.key) {
            <andes-tabs-content [value]="tab.key"><p>Content of {{ tab.label }}</p></andes-tabs-content>
          }
        </andes-tabs>
      `,
    };
  },
};

export const EditableCardCustomIcons: Story = {
  render: () => ({
    template: `
      <ng-template #add><ng-icon name="lucideBell" aria-hidden="true" /></ng-template>
      <ng-template #remove><span aria-hidden="true">–</span></ng-template>
      <andes-tabs type="editable-card" [addIcon]="add" [removeIcon]="remove" addLabel="New notification tab"
        style="width: min(32rem, calc(100vw - 2rem));">
        ${BASIC_TABS}
      </andes-tabs>
      <br />
      <andes-tabs type="editable-card" hideAdd style="width: min(32rem, calc(100vw - 2rem));">
        ${BASIC_TABS}
      </andes-tabs>
    `,
  }),
};

export const Positions: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 2rem; width: min(40rem, calc(100vw - 2rem));">
        @for (position of ['top', 'bottom', 'left', 'right']; track position) {
          <section>
            <h3 style="font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground); font-size: 0.875rem;">tabPosition="{{ position }}"</h3>
            <andes-tabs [tabPosition]="$any(position)">${BASIC_TABS}</andes-tabs>
          </section>
        }
        <section>
          <h3 style="font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground); font-size: 0.875rem;">type="card", tabPosition="left"</h3>
          <andes-tabs type="card" tabPosition="left">${BASIC_TABS}</andes-tabs>
        </section>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 1.5rem; width: min(32rem, calc(100vw - 2rem));">
        @for (size of ['sm', 'md', 'lg']; track size) {
          <andes-tabs [size]="$any(size)">${BASIC_TABS}</andes-tabs>
          <andes-tabs [size]="$any(size)" type="card">${BASIC_TABS}</andes-tabs>
        }
      </div>
    `,
  }),
};

export const Centered: Story = {
  args: { centered: true },
};

export const Gutter: Story = {
  args: { tabBarGutter: 32 },
};

/**
 * Tabs that don't fit scroll: the tab bar gets prev/next arrows (pointer-only - arrow-key
 * focus scrolls natively) and the selected tab is always scrolled into view. Wheel, touch
 * and arrow scrolling all emit `(tabScroll)`.
 */
export const Overflow: Story = {
  render: () => {
    const scrolls = signal<string[]>([]);
    return {
      props: {
        keys: Array.from({ length: 16 }, (_, i) => `tab-${i + 1}`),
        scrolls,
        logScroll: (event: AndesTabsScrollEvent) =>
          scrolls.update((list) => [...list.slice(-4), event.direction]),
      },
      template: `
        <div style="display: grid; gap: 2rem; width: min(24rem, calc(100vw - 2rem));">
          <andes-tabs value="tab-12" (tabScroll)="logScroll($event)">
            <andes-tabs-list>
              @for (key of keys; track key) {
                <andes-tabs-trigger [value]="key">Tab {{ key.slice(4) }}</andes-tabs-trigger>
              }
            </andes-tabs-list>
            @for (key of keys; track key) {
              <andes-tabs-content [value]="key"><p>Content of {{ key }}</p></andes-tabs-content>
            }
          </andes-tabs>
          <p style="font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground);">Last scroll directions: {{ scrolls().join(', ') || '—' }}</p>
          <andes-tabs tabPosition="left" style="height: 12rem;">
            <andes-tabs-list>
              @for (key of keys; track key) {
                <andes-tabs-trigger [value]="key">Tab {{ key.slice(4) }}</andes-tabs-trigger>
              }
            </andes-tabs-list>
            @for (key of keys; track key) {
              <andes-tabs-content [value]="key"><p>Content of {{ key }}</p></andes-tabs-content>
            }
          </andes-tabs>
        </div>
      `,
    };
  },
};

/** Project with `andesTabsExtraLeft`/`andesTabsExtraRight`, or pass `[tabBarExtraContent]`. */
export const ExtraContent: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 2rem; width: min(36rem, calc(100vw - 2rem));">
        <andes-tabs>
          <span andesTabsExtraLeft style="font-family: var(--andes-font-family), sans-serif; font-weight: 600; color: var(--andes-color-foreground); padding-inline-end: 0.5rem;">Settings</span>
          <andes-button andesTabsExtraRight size="sm" variant="outline">Save</andes-button>
          ${BASIC_TABS}
        </andes-tabs>
        <ng-template #right><andes-button size="sm">Extra action</andes-button></ng-template>
        <andes-tabs type="card" [tabBarExtraContent]="right">${BASIC_TABS}</andes-tabs>
      </div>
    `,
  }),
};

export const WithIcons: Story = {
  render: () => ({
    template: `
      <ng-template #home><ng-icon name="lucideHouse" /></ng-template>
      <ng-template #user><ng-icon name="lucideUser" /></ng-template>
      <ng-template #settings><ng-icon name="lucideSettings" /></ng-template>
      <andes-tabs style="width: min(32rem, calc(100vw - 2rem));">
        <andes-tabs-list>
          <andes-tabs-trigger value="home" [icon]="home">Home</andes-tabs-trigger>
          <andes-tabs-trigger value="profile" [icon]="user">Profile</andes-tabs-trigger>
          <andes-tabs-trigger value="settings" [icon]="settings" disabled>Settings</andes-tabs-trigger>
        </andes-tabs-list>
        <andes-tabs-content value="home"><p>Home</p></andes-tabs-content>
        <andes-tabs-content value="profile"><p>Profile</p></andes-tabs-content>
        <andes-tabs-content value="settings"><p>Settings</p></andes-tabs-content>
      </andes-tabs>
    `,
  }),
};

/** The data-driven alternative to projected triggers/panels (Ant Design's `items`). */
export const Items: Story = {
  render: () => ({
    props: {
      itemsFor: (
        home: AndesTabsItem['icon'],
        rich: AndesTabsItem['content'],
      ): AndesTabsItem[] => [
        {
          key: 'home',
          label: 'Home',
          icon: home,
          content: 'Plain string content.',
        },
        { key: 'rich', label: 'Template content', content: rich },
        {
          key: 'off',
          label: 'Disabled',
          disabled: true,
          content: 'Never shown.',
        },
      ],
    },
    template: `
      <ng-template #home><ng-icon name="lucideHouse" /></ng-template>
      <ng-template #rich><p>Rendered from a <strong>template</strong>, lazily.</p></ng-template>
      <andes-tabs [items]="itemsFor(home, rich)" style="width: min(32rem, calc(100vw - 2rem));" />
    `,
  }),
};

export const Indicator: Story = {
  render: () => ({
    props: {
      short: { size: 24, align: 'center' },
      half: { size: (origin: number) => origin / 2, align: 'start' },
    },
    template: `
      <div style="display: grid; gap: 1.5rem; width: min(32rem, calc(100vw - 2rem));">
        <andes-tabs [indicator]="short">${BASIC_TABS}</andes-tabs>
        <andes-tabs [indicator]="half">${BASIC_TABS}</andes-tabs>
        <andes-tabs [animated]="false">${BASIC_TABS}</andes-tabs>
      </div>
    `,
  }),
};

export const AnimatedPanes: Story = {
  render: () => ({
    props: { animation: { inkBar: true, tabPane: true } },
    template: `<andes-tabs [animated]="animation" style="width: min(32rem, calc(100vw - 2rem));">${BASIC_TABS}</andes-tabs>`,
  }),
};

/**
 * Content inside `<ng-template andesTabsContentLazy>` is created on first activation and then
 * kept (the counter survives switching tabs) - unless `destroyOnHidden` is set, in which case
 * each switch re-creates it. Toggle `destroyOnHidden` in the controls.
 */
export const LazyContent: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-tabs [destroyOnHidden]="destroyOnHidden" style="width: min(32rem, calc(100vw - 2rem));">
        <andes-tabs-list>
          <andes-tabs-trigger value="one">One</andes-tabs-trigger>
          <andes-tabs-trigger value="two">Two</andes-tabs-trigger>
          <andes-tabs-trigger value="three">Three (forceRender)</andes-tabs-trigger>
        </andes-tabs-list>
        <andes-tabs-content value="one">
          <ng-template andesTabsContentLazy><andes-story-panel-state /></ng-template>
        </andes-tabs-content>
        <andes-tabs-content value="two">
          <ng-template andesTabsContentLazy><andes-story-panel-state /></ng-template>
        </andes-tabs-content>
        <andes-tabs-content value="three" forceRender>
          <ng-template andesTabsContentLazy><andes-story-panel-state /></ng-template>
        </andes-tabs-content>
      </andes-tabs>
    `,
  }),
};

export const Events: Story = {
  render: () => {
    const log = signal<string[]>([]);
    const push = (entry: string) =>
      log.update((list) => [...list.slice(-5), entry]);
    return {
      props: {
        log,
        logClick: (key: string) => push(`tabClick: ${key}`),
        logChange: (value: string | undefined) => push(`valueChange: ${value}`),
      },
      template: `
        <div style="width: min(32rem, calc(100vw - 2rem));">
          <andes-tabs (tabClick)="logClick($event.key)" (valueChange)="logChange($event)">${BASIC_TABS}</andes-tabs>
          <ul style="font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground);">
            @for (entry of log(); track $index) { <li>{{ entry }}</li> }
          </ul>
        </div>
      `,
    };
  },
};
