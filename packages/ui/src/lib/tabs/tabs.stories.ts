import { moveItemInArray } from '@angular/cdk/drag-drop';
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
  AndesTabsReorderEvent,
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
  args: { tabBarGutter: 16 },
};

/**
 * Tabs that don't fit scroll: the tab bar gets prev/next arrows (pointer-only - arrow-key
 * focus scrolls natively) and a "more" button listing the tabs out of view, and the selected
 * tab is always scrolled into view. Wheel, touch and arrow scrolling all emit `(tabScroll)`.
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
          <andes-tabs type="card" value="tab-8" dir="rtl">
            <andes-tabs-list>
              @for (key of keys; track key) {
                <andes-tabs-trigger [value]="key">Tab {{ key.slice(4) }}</andes-tabs-trigger>
              }
            </andes-tabs-list>
            @for (key of keys; track key) {
              <andes-tabs-content [value]="key"><p>Right-to-left: the start edge is on the right.</p></andes-tabs-content>
            }
          </andes-tabs>
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

/**
 * Card tabs on a raised surface: `--andes-tabs-card-selected-background` (the selected card,
 * which opens into the panel) and `--andes-tabs-card-background` (the other cards) match the
 * tabs to the surface they sit on. Compare in the dark theme, where the page background is
 * darker than a card.
 */
export const CardSurfaces: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 1.5rem; width: min(32rem, calc(100vw - 2rem));">
        @for (surface of ['Page default', 'On a card surface']; track surface; let onCard = $index) {
          <div [style]="onCard ? '--andes-tabs-card-selected-background: var(--andes-color-card); --andes-tabs-card-background: color-mix(in srgb, var(--andes-color-card-foreground) 5%, var(--andes-color-card)); padding: 1rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-lg); background: var(--andes-color-card); color: var(--andes-color-card-foreground);' : ''">
            <p style="margin: 0 0 0.75rem; font: 600 0.875rem/1.375rem var(--andes-font-family), sans-serif;">{{ surface }}</p>
            <andes-tabs type="card" value="b">
              <andes-tabs-list>
                <andes-tabs-trigger value="a">Overview</andes-tabs-trigger>
                <andes-tabs-trigger value="b">Activity</andes-tabs-trigger>
                <andes-tabs-trigger value="c">Settings</andes-tabs-trigger>
              </andes-tabs-list>
              <andes-tabs-content value="a"><p>Overview panel</p></andes-tabs-content>
              <andes-tabs-content value="b"><p>Activity panel</p></andes-tabs-content>
              <andes-tabs-content value="c"><p>Settings panel</p></andes-tabs-content>
            </andes-tabs>
          </div>
        }
      </div>
    `,
  }),
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

/** The data-driven alternative to projected triggers/panels (`items`). */
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

/**
 * The overflow menu in its variants: a search field that filters the hidden tabs
 * (`moreSearch`), opening on hover (`moreTrigger="hover"`), and a custom `moreTemplate` that
 * receives the hidden tabs plus `select`/`close`. `[more]="false"` leaves only the arrows.
 */
export const OverflowMenu: Story = {
  render: () => ({
    props: {
      keys: Array.from({ length: 24 }, (_, i) => `tab-${i + 1}`),
    },
    template: `
      <ng-template #customMore let-hidden let-select="select">
        <p style="margin: 0.25rem 0.5rem; color: var(--andes-color-muted-foreground);">{{ hidden.length }} tabs out of view</p>
        @for (tab of hidden; track tab.key) {
          <andes-button size="sm" variant="ghost" style="width: 100%;" (click)="select(tab.key)">{{ tab.label }}</andes-button>
        }
      </ng-template>
      <div style="display: grid; gap: 2rem; width: min(28rem, calc(100vw - 2rem)); font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground);">
        @for (variant of ['search', 'hover', 'custom', 'off']; track variant) {
          <section style="min-width: 0;">
            <p style="margin: 0 0 0.5rem; font-weight: 600;">{{ variant }}</p>
            <andes-tabs
              [moreSearch]="variant === 'search'"
              [moreTrigger]="variant === 'hover' ? 'hover' : 'click'"
              [moreTemplate]="variant === 'custom' ? customMore : undefined"
              [more]="variant !== 'off'"
            >
              <andes-tabs-list>
                @for (key of keys; track key) {
                  <andes-tabs-trigger [value]="key">Tab {{ key.slice(4) }}</andes-tabs-trigger>
                }
              </andes-tabs-list>
              @for (key of keys; track key) {
                <andes-tabs-content [value]="key"><p>Content of {{ key }}</p></andes-tabs-content>
              }
            </andes-tabs>
          </section>
        }
      </div>
    `,
  }),
};

/**
 * With `draggable`, tabs can be dragged along the bar - or moved one step with
 * `Alt`+`Shift`+arrow key on a focused tab. `(reorder)` only reports the move; the consumer
 * applies it to its own list (here with `moveItemInArray`).
 */
export const Draggable: Story = {
  render: () => {
    const tabList = signal([
      { key: 'orders', label: 'Orders' },
      { key: 'invoices', label: 'Invoices' },
      { key: 'customers', label: 'Customers' },
      { key: 'products', label: 'Products' },
      { key: 'reports', label: 'Reports' },
    ]);
    const handleReorder = (event: AndesTabsReorderEvent) =>
      tabList.update((list) => {
        const next = [...list];
        moveItemInArray(next, event.previousIndex, event.currentIndex);
        return next;
      });
    return {
      props: { tabList, handleReorder },
      template: `
        <div style="display: grid; gap: 2rem; width: min(36rem, calc(100vw - 2rem));">
          @for (type of ['line', 'card']; track type) {
            <andes-tabs draggable [type]="type" (reorder)="handleReorder($event)">
              <andes-tabs-list>
                @for (tab of tabList(); track tab.key) {
                  <andes-tabs-trigger [value]="tab.key">{{ tab.label }}</andes-tabs-trigger>
                }
              </andes-tabs-list>
              @for (tab of tabList(); track tab.key) {
                <andes-tabs-content [value]="tab.key"><p>{{ tab.label }}</p></andes-tabs-content>
              }
            </andes-tabs>
          }
          <andes-tabs draggable tabPosition="left" (reorder)="handleReorder($event)">
            <andes-tabs-list>
              @for (tab of tabList(); track tab.key) {
                <andes-tabs-trigger [value]="tab.key">{{ tab.label }}</andes-tabs-trigger>
              }
            </andes-tabs-list>
            @for (tab of tabList(); track tab.key) {
              <andes-tabs-content [value]="tab.key"><p>{{ tab.label }}</p></andes-tabs-content>
            }
          </andes-tabs>
        </div>
      `,
    };
  },
};

/**
 * `tabBarStyle` (and `tabBarClass`) style the bar itself - here a sticky bar that stays in
 * view while a long panel scrolls inside its container.
 */
export const StickyBar: Story = {
  render: () => ({
    props: {
      barStyle: {
        position: 'sticky',
        top: '0',
        zIndex: 1,
        background: 'var(--andes-color-background)',
      },
      rows: Array.from({ length: 40 }, (_, i) => i + 1),
    },
    template: `
      <div style="height: 16rem; overflow: auto; width: min(32rem, calc(100vw - 2rem)); border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md); padding: 0 0.75rem;">
        <andes-tabs [tabBarStyle]="barStyle">
          <andes-tabs-list>
            <andes-tabs-trigger value="lines">Order lines</andes-tabs-trigger>
            <andes-tabs-trigger value="notes">Notes</andes-tabs-trigger>
          </andes-tabs-list>
          <andes-tabs-content value="lines">
            @for (row of rows; track row) { <p style="margin: 0.5rem 0;">Line {{ row }}</p> }
          </andes-tabs-content>
          <andes-tabs-content value="notes"><p>No notes.</p></andes-tabs-content>
        </andes-tabs>
      </div>
    `,
  }),
};

/**
 * With `hideAdd`, an `editable-card` Tabs has no add button of its own; any other control
 * can add tabs - the list is the consumer's either way.
 */
export const CustomAddTrigger: Story = {
  render: () => {
    let next = 3;
    const tabList = signal([
      { key: '1', label: 'Tab 1' },
      { key: '2', label: 'Tab 2' },
    ]);
    const activeTab = signal<string | undefined>('1');
    const add = () => {
      const key = String(next++);
      tabList.update((list) => [...list, { key, label: `Tab ${key}` }]);
      activeTab.set(key);
    };
    const handleEdit = (event: AndesTabsEditEvent) => {
      if (event.action === 'remove') {
        tabList.update((list) => list.filter((tab) => tab.key !== event.key));
      }
    };
    return {
      props: { tabList, activeTab, add, handleEdit },
      template: `
        <div style="display: grid; gap: 1rem; justify-items: start; width: min(32rem, calc(100vw - 2rem));">
          <andes-button size="sm" variant="outline" (click)="add()">Add tab</andes-button>
          <andes-tabs type="editable-card" hideAdd [(value)]="activeTab" (edit)="handleEdit($event)" style="width: 100%;">
            <andes-tabs-list>
              @for (tab of tabList(); track tab.key) {
                <andes-tabs-trigger [value]="tab.key">{{ tab.label }}</andes-tabs-trigger>
              }
            </andes-tabs-list>
            @for (tab of tabList(); track tab.key) {
              <andes-tabs-content [value]="tab.key"><p>Content of {{ tab.label }}</p></andes-tabs-content>
            }
          </andes-tabs>
        </div>
      `,
    };
  },
};

/** Tabs nest: each `andes-tabs` owns its own selection and keyboard navigation. */
export const Nested: Story = {
  render: () => ({
    template: `
      <andes-tabs tabPosition="left" style="width: min(36rem, calc(100vw - 2rem));">
        <andes-tabs-list>
          <andes-tabs-trigger value="sales">Sales</andes-tabs-trigger>
          <andes-tabs-trigger value="stock">Stock</andes-tabs-trigger>
        </andes-tabs-list>
        <andes-tabs-content value="sales">
          <andes-tabs type="card" size="sm">${BASIC_TABS}</andes-tabs>
        </andes-tabs-content>
        <andes-tabs-content value="stock"><p>Stock levels.</p></andes-tabs-content>
      </andes-tabs>
    `,
  }),
};
