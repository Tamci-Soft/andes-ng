import type { Meta, StoryObj } from '@storybook/angular';
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

const imports = [
  AndesBreadcrumb,
  AndesBreadcrumbList,
  AndesBreadcrumbItem,
  AndesBreadcrumbLink,
  AndesBreadcrumbPage,
  AndesBreadcrumbSeparator,
  AndesBreadcrumbEllipsis,
];

const meta: Meta<AndesBreadcrumb> = {
  title: 'Breadcrumb',
  component: AndesBreadcrumb,
  tags: ['autodocs'],
  argTypes: {
    ariaLabel: { name: 'aria-label', control: 'text' },
  },
  args: {
    ariaLabel: 'breadcrumb',
  },
  render: (args) => ({
    moduleMetadata: { imports },
    props: args,
    template: `
      <andes-breadcrumb [aria-label]="ariaLabel">
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

type Story = StoryObj<AndesBreadcrumb>;

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
