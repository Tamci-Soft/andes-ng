import { provideRouter, RouterLink, withHashLocation } from '@angular/router';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { action } from 'storybook/actions';

import {
  AndesBreadcrumb,
  AndesBreadcrumbEllipsis,
  AndesBreadcrumbItem,
  AndesBreadcrumbLink,
  AndesBreadcrumbList,
  AndesBreadcrumbPage,
  AndesBreadcrumbSeparator,
} from './breadcrumb';
import type {
  AndesBreadcrumbItemClickEvent,
  AndesBreadcrumbItemType,
  AndesBreadcrumbMenuClickEvent,
} from './breadcrumb-items';

const imports = [
  AndesBreadcrumb,
  AndesBreadcrumbList,
  AndesBreadcrumbItem,
  AndesBreadcrumbLink,
  AndesBreadcrumbPage,
  AndesBreadcrumbSeparator,
  AndesBreadcrumbEllipsis,
];

/**
 * The story arg is deliberately NOT named `ariaLabel`: Storybook assigns args whose key matches a
 * component property but not an input name (the input's public name is its `aria-label` alias)
 * straight onto the component instance, which replaced the `ariaLabel` signal with a string and
 * threw `ctx.ariaLabel is not a function` on every change detection.
 */
interface BreadcrumbStoryArgs {
  navLabel: string;
}

const meta: Meta<BreadcrumbStoryArgs> = {
  title: 'Breadcrumb',
  component: AndesBreadcrumb,
  tags: ['autodocs'],
  argTypes: {
    navLabel: { name: 'aria-label', control: 'text' },
  },
  args: {
    navLabel: 'breadcrumb',
  },
  render: (args) => ({
    moduleMetadata: { imports },
    props: args,
    template: `
      <andes-breadcrumb [aria-label]="navLabel">
        <ol andesBreadcrumbList>
          <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Home</a></li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem><a andesBreadcrumbLink href="/components">Components</a></li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem><span andesBreadcrumbPage>Breadcrumb</span></li>
        </ol>
      </andes-breadcrumb>
    `,
  }),
};

export default meta;

type Story = StoryObj<BreadcrumbStoryArgs>;

export const Overview: Story = {};

export const TwoLevels: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <andes-breadcrumb>
        <ol andesBreadcrumbList>
          <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Home</a></li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem><span andesBreadcrumbPage>Settings</span></li>
        </ol>
      </andes-breadcrumb>
    `,
  }),
};

export const SingleCrumb: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <andes-breadcrumb>
        <ol andesBreadcrumbList>
          <li andesBreadcrumbItem><span andesBreadcrumbPage>Home</span></li>
        </ol>
      </andes-breadcrumb>
    `,
  }),
};

export const CustomSeparator: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <andes-breadcrumb>
        <ol andesBreadcrumbList>
          <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Home</a></li>
          <li andesBreadcrumbSeparator>/</li>
          <li andesBreadcrumbItem><a andesBreadcrumbLink href="/docs">Docs</a></li>
          <li andesBreadcrumbSeparator>/</li>
          <li andesBreadcrumbItem><span andesBreadcrumbPage>Breadcrumb</span></li>
        </ol>
      </andes-breadcrumb>
    `,
  }),
};

export const CollapsedWithEllipsis: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <andes-breadcrumb>
        <ol andesBreadcrumbList>
          <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Home</a></li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem><andes-breadcrumb-ellipsis></andes-breadcrumb-ellipsis></li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem>
            <a andesBreadcrumbLink href="/docs/components">Components</a>
          </li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem><span andesBreadcrumbPage>Breadcrumb</span></li>
        </ol>
      </andes-breadcrumb>
    `,
  }),
};

/**
 * Passing the collapsed crumbs to `[items]` turns the "..." into a dropdown menu trigger, so the
 * hidden middle of the trail stays reachable instead of being dead text. Escape, an outside click
 * and arrow-key/typeahead navigation all come from `AndesDropdownMenu`.
 */
export const CollapsedWithDropdown: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: {
      hiddenCrumbs: [
        { label: 'Documentation', href: '/docs' },
        { label: 'Building Your Application', href: '/docs/building' },
        { label: 'Data Fetching', href: '/docs/building/data-fetching' },
      ],
    },
    template: `
      <andes-breadcrumb>
        <ol andesBreadcrumbList>
          <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Home</a></li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem>
            <andes-breadcrumb-ellipsis [items]="hiddenCrumbs"></andes-breadcrumb-ellipsis>
          </li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem>
            <a andesBreadcrumbLink href="/docs/components">Components</a>
          </li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem><span andesBreadcrumbPage>Breadcrumb</span></li>
        </ol>
      </andes-breadcrumb>
    `,
  }),
};

/**
 * Crumbs without an `href` render as plain menu entries; handle navigation yourself from
 * `(itemSelected)` - e.g. to hand the crumb to a router. `[label]` localizes the trigger's
 * accessible name, and `disabled` greys an entry out.
 */
export const CollapsedWithDropdownWithoutHrefs: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: {
      hiddenCrumbs: [
        { label: 'Documentación' },
        { label: 'Componentes' },
        { label: 'Archivado', disabled: true },
      ],
      onSelect: (item: { label: string }) => action('itemSelected')(item),
    },
    template: `
      <andes-breadcrumb aria-label="Ruta de navegación">
        <ol andesBreadcrumbList>
          <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Inicio</a></li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem>
            <andes-breadcrumb-ellipsis
              label="Más"
              [items]="hiddenCrumbs"
              (itemSelected)="onSelect($event)"
            ></andes-breadcrumb-ellipsis>
          </li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem><span andesBreadcrumbPage>Breadcrumb</span></li>
        </ol>
      </andes-breadcrumb>
    `,
  }),
};

export const LocalizedLabel: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <andes-breadcrumb aria-label="Ruta de navegación">
        <ol andesBreadcrumbList>
          <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Inicio</a></li>
          <li andesBreadcrumbSeparator></li>
          <li andesBreadcrumbItem><span andesBreadcrumbPage>Componentes</span></li>
        </ol>
      </andes-breadcrumb>
    `,
  }),
};

export const WrappingOnNarrowContainers: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="max-width: 220px; border: 1px dashed var(--andes-color-border); padding: 0.5rem;">
        <andes-breadcrumb>
          <ol andesBreadcrumbList>
            <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Home</a></li>
            <li andesBreadcrumbSeparator></li>
            <li andesBreadcrumbItem><a andesBreadcrumbLink href="/docs">Docs</a></li>
            <li andesBreadcrumbSeparator></li>
            <li andesBreadcrumbItem><a andesBreadcrumbLink href="/docs/components">Components</a></li>
            <li andesBreadcrumbSeparator></li>
            <li andesBreadcrumbItem><span andesBreadcrumbPage>Breadcrumb</span></li>
          </ol>
        </andes-breadcrumb>
      </div>
    `,
  }),
};

/**
 * `[items]` is the data-driven API: the root renders the list, joins each `path` onto the
 * previous ones (`/users`, `/users/42`), interpolates `:param`s from `[params]` into paths and
 * titles, and renders the last crumb as the current page (`aria-current="page"`).
 */
export const Items: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: {
      items: [
        { title: 'Home', href: '/' },
        { title: 'Users', path: 'users' },
        { title: 'User :id', path: ':id' },
        { title: 'Settings', path: 'settings' },
      ] satisfies AndesBreadcrumbItemType[],
      params: { id: 42 },
    },
    template: `<andes-breadcrumb [items]="items" [params]="params" />`,
  }),
};

/**
 * `separator` takes a string or a template, in `[items]` mode and for every empty
 * `andesBreadcrumbSeparator` in projected mode. A `{ type: 'separator' }` entry (or
 * `[andesBreadcrumbSeparator]="..."` on one projected separator) overrides a single position.
 */
export const Separators: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: {
      items: [
        { title: 'Home', href: '/' },
        { title: 'Application Center', href: '/apps' },
        { title: 'Application List', href: '/apps/list' },
        { title: 'An Application' },
      ] satisfies AndesBreadcrumbItemType[],
      overridden: [
        { title: 'Location' },
        { type: 'separator', separator: ':' },
        { title: 'Application Center', href: '/apps' },
        { title: 'Application List', href: '/apps/list' },
        { title: 'An Application' },
      ] satisfies AndesBreadcrumbItemType[],
    },
    template: `
      <ng-template #dot><span style="font-size: 1.25em; line-height: 1">&middot;</span></ng-template>
      <div style="display: grid; gap: 1rem;">
        <andes-breadcrumb [items]="items" />
        <andes-breadcrumb [items]="items" separator="/" />
        <andes-breadcrumb [items]="items" separator=">" />
        <andes-breadcrumb [items]="items" [separator]="dot" />
        <andes-breadcrumb [items]="overridden" separator="/" />
        <andes-breadcrumb separator="/">
          <ol andesBreadcrumbList>
            <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Projected</a></li>
            <li andesBreadcrumbSeparator></li>
            <li andesBreadcrumbItem><a andesBreadcrumbLink href="/docs">inherits "/"</a></li>
            <li [andesBreadcrumbSeparator]="dot"></li>
            <li andesBreadcrumbItem><span andesBreadcrumbPage>one position overridden</span></li>
          </ol>
        </andes-breadcrumb>
      </div>
    `,
  }),
};

/**
 * A crumb with `menu.items` renders its label with a caret that opens a dropdown (the shared
 * `AndesDropdownMenu`). Entries with an `href` stay real links; `(menuClick)` and each entry's
 * `onClick` report activations. `[dropdownIcon]` replaces the caret.
 */
export const ItemWithMenu: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: {
      items: [
        { title: 'Home', href: '/' },
        { title: 'Components', href: '/components' },
        {
          title: 'General',
          menu: {
            items: [
              { label: 'General', href: '/components/general' },
              { label: 'Layout', href: '/components/layout' },
              { label: 'Navigation' },
              { label: 'Deprecated', disabled: true },
            ],
          },
        },
        { title: 'Button' },
      ] satisfies AndesBreadcrumbItemType[],
      onMenuClick: (event: AndesBreadcrumbMenuClickEvent) => {
        event.event.preventDefault();
        action('menuClick')({
          item: event.item.title,
          menuItem: event.menuItem.label,
        });
      },
    },
    template: `
      <ng-template #plus><span aria-hidden="true">+</span></ng-template>
      <div style="display: grid; gap: 1rem;">
        <andes-breadcrumb [items]="items" (menuClick)="onMenuClick($event)" />
        <andes-breadcrumb [items]="items" [dropdownIcon]="plus" (menuClick)="onMenuClick($event)" />
      </div>
    `,
  }),
};

/**
 * `maxItems` collapses the middle of a long trail into the ellipsis dropdown, keeping
 * `itemsBeforeCollapse` crumbs before it and `itemsAfterCollapse` after it.
 */
export const CollapsedItems: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: {
      items: [
        { title: 'Home', href: '/' },
        { title: 'Documentation', path: 'docs' },
        { title: 'Building Your Application', path: 'building' },
        { title: 'Data Fetching', path: 'data-fetching' },
        { title: 'Caching', path: 'caching' },
        { title: 'Revalidating' },
      ] satisfies AndesBreadcrumbItemType[],
      onItemClick: (event: AndesBreadcrumbItemClickEvent) => {
        event.event.preventDefault();
        action('itemClick')({ title: event.item.title, index: event.index });
      },
    },
    template: `
      <div style="display: grid; gap: 1rem;">
        <andes-breadcrumb [items]="items" [maxItems]="3" (itemClick)="onItemClick($event)" />
        <andes-breadcrumb
          aria-label="Ruta de navegación"
          ellipsisLabel="Más"
          [items]="items"
          [maxItems]="4"
          [itemsBeforeCollapse]="2"
          [itemsAfterCollapse]="2"
          (itemClick)="onItemClick($event)"
        />
      </div>
    `,
  }),
};

/**
 * `(itemClick)` and each item's `onClick` receive the crumb and the `MouseEvent` -
 * `preventDefault()` it to route in-app. A crumb with `onClick` and no `href` renders as a
 * keyboard-reachable `<button>` styled like a link; one with neither is plain text.
 */
export const ClickHandling: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: {
      items: [
        { title: 'Home', href: '/' },
        {
          title: 'Reports (onClick)',
          onClick: () => action('onClick')('Reports'),
        },
        { title: 'Plain text' },
        { title: 'Q3' },
      ] satisfies AndesBreadcrumbItemType[],
      onItemClick: (event: AndesBreadcrumbItemClickEvent) => {
        event.event.preventDefault();
        action('itemClick')({ title: event.item.title, index: event.index });
      },
    },
    template: `<andes-breadcrumb [items]="items" (itemClick)="onItemClick($event)" />`,
  }),
};

/**
 * `[itemRender]` hands each crumb (with its interpolated `title`, `params`, accumulated `paths`
 * and `last`) to a template - here to render Angular Router `routerLink`s (hash location, so
 * clicking only changes this iframe's hash).
 */
export const ItemRenderWithRouterLink: Story = {
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([{ path: '**', children: [] }], withHashLocation()),
      ],
    }),
  ],
  render: () => ({
    moduleMetadata: { imports: [...imports, RouterLink] },
    props: {
      items: [
        { title: 'Home', path: '' },
        { title: 'Projects', path: 'projects' },
        { title: 'Project :projectId', path: ':projectId' },
        { title: 'Board', path: 'board' },
      ] satisfies AndesBreadcrumbItemType[],
      params: { projectId: 'andes' },
    },
    template: `
      <ng-template #crumb let-title="title" let-paths="paths" let-last="last">
        @if (last) {
          <span andesBreadcrumbPage>{{ title }}</span>
        } @else {
          <a andesBreadcrumbLink [routerLink]="['/'].concat(paths)">{{ title }}</a>
        }
      </ng-template>
      <andes-breadcrumb [items]="items" [params]="params" [itemRender]="crumb" separator="/" />
    `,
  }),
};

export const ItemsWrappingOnNarrowContainers: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: {
      items: [
        { title: 'Home', href: '/' },
        { title: 'Documentation', href: '/docs' },
        {
          title: 'Components',
          menu: {
            items: [
              { label: 'Button', href: '/docs/button' },
              { label: 'Breadcrumb', href: '/docs/breadcrumb' },
            ],
          },
        },
        { title: 'Breadcrumb with a long title' },
      ] satisfies AndesBreadcrumbItemType[],
    },
    template: `
      <div style="max-width: 220px; border: 1px dashed var(--andes-color-border); padding: 0.5rem;">
        <andes-breadcrumb [items]="items" />
      </div>
    `,
  }),
};
