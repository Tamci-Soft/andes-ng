import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesAnchor, type AndesAnchorItem } from './anchor';
import { AndesAnchorLink } from './anchor-link';

const base =
  'font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground, #0f172a); font-family: var(--andes-font-family, system-ui), sans-serif;';
const scroller = `height: 320px; overflow: auto; position: relative; border: 1px solid var(--andes-color-border, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); padding: 0 16px; background: var(--andes-color-background, #fff); ${base}`;
const row = `display: flex; gap: 24px; align-items: flex-start; ${base}`;

const SECTIONS = [
  ['overview', 'Overview'],
  ['install', 'Installation'],
  ['usage', 'Usage'],
  ['config', 'Configuration'],
  ['faq', 'FAQ'],
];

function sections(entries: string[][] = SECTIONS): string {
  return entries
    .map(
      ([id, title]) => `
      <section id="${id}" style="min-height: 260px; padding-top: 16px;">
        <h3 style="margin: 0 0 8px; font-size: 1rem; line-height: 1.5rem; font-weight: 600;">${title}</h3>
        <p style="margin: 0; color: var(--andes-color-muted-foreground, #64748b);">Approval workflows, document series, tax codes and warehouse rules are configured here. Scroll the panel to see the link of the section being read follow along.</p>
      </section>`,
    )
    .join('');
}

const ITEMS: AndesAnchorItem[] = SECTIONS.map(([id, title]) => ({
  key: id,
  href: `#${id}`,
  title,
}));

const NESTED: AndesAnchorItem[] = [
  { key: 'overview', href: '#overview', title: 'Overview' },
  {
    key: 'install',
    href: '#install',
    title: 'Installation',
    children: [
      { key: 'usage', href: '#usage', title: 'Usage' },
      { key: 'config', href: '#config', title: 'Configuration' },
    ],
  },
  { key: 'faq', href: '#faq', title: 'FAQ' },
];

const meta: Meta<AndesAnchor> = {
  title: 'Anchor',
  component: AndesAnchor,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesAnchor, AndesAnchorLink] })],
  parameters: { layout: 'padded' },
  argTypes: {
    direction: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    offsetTop: { control: 'number' },
    bounds: { control: 'number' },
    targetOffset: { control: 'number' },
    affix: { control: 'boolean' },
    updateHash: { control: 'boolean' },
    smooth: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    direction: 'vertical',
    offsetTop: 0,
    bounds: 5,
    affix: false,
    updateHash: false,
    smooth: true,
    label: 'On this page',
  },
  render: (args) => ({
    props: { ...args, items: ITEMS },
    template: `
      <div style="${row}">
        <andes-anchor style="width: 180px; flex: none;" [items]="items" [container]="scroller" [direction]="direction" [offsetTop]="offsetTop" [bounds]="bounds" [targetOffset]="targetOffset" [updateHash]="updateHash" [smooth]="smooth" [label]="label" />
        <div #scroller style="${scroller} flex: 1;">${sections()}</div>
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<AndesAnchor>;

export const Default: Story = {};

export const NestedLinks: Story = {
  render: () => ({
    props: { items: NESTED },
    template: `
      <div style="${row}">
        <andes-anchor style="width: 200px; flex: none;" [items]="items" [container]="scroller" />
        <div #scroller style="${scroller} flex: 1;">${sections()}</div>
      </div>`,
  }),
};

export const Horizontal: Story = {
  render: () => ({
    props: { items: ITEMS },
    template: `
      <div style="${base}">
        <andes-anchor direction="horizontal" [items]="items" [container]="scroller" style="margin-bottom: 12px;" />
        <div #scroller style="${scroller}">${sections()}</div>
      </div>`,
  }),
};

export const ProjectedLinks: Story = {
  render: () => ({
    template: `
      <div style="${row}">
        <andes-anchor style="width: 200px; flex: none;" [container]="scroller">
          <andes-anchor-link href="#overview" title="Overview" />
          <andes-anchor-link href="#install" title="Installation">
            <andes-anchor-link href="#usage" title="Usage" />
            <andes-anchor-link href="#config" title="Configuration" />
          </andes-anchor-link>
          <andes-anchor-link href="#faq" title="FAQ" />
        </andes-anchor>
        <div #scroller style="${scroller} flex: 1;">${sections()}</div>
      </div>`,
  }),
};

export const OffsetUnderAFixedHeader: Story = {
  name: 'Offset under a fixed header',
  render: () => ({
    props: { items: ITEMS },
    template: `
      <div style="${row}">
        <andes-anchor style="width: 180px; flex: none;" [items]="items" [container]="scroller" [offsetTop]="56" />
        <div #scroller style="${scroller} flex: 1; padding-top: 0;">
          <div style="position: sticky; top: 0; z-index: 2; height: 48px; margin: 0 -16px; padding: 0 16px; display: flex; align-items: center; font-weight: 600; background: var(--andes-color-card, #fff); border-bottom: 1px solid var(--andes-color-border, #d1d5db);">Sticky page header (48px)</div>
          ${sections()}
        </div>
      </div>`,
  }),
};

export const Affixed: Story = {
  render: () => ({
    props: { items: ITEMS },
    template: `
      <div #scroller style="${scroller}">
        <div style="${row}">
          <andes-anchor style="width: 180px; flex: none;" affix [offsetTop]="16" [items]="items" [container]="scroller" />
          <div style="flex: 1;">${sections()}</div>
        </div>
      </div>`,
  }),
};

export const ChangeAndClickEvents: Story = {
  name: 'Events and URL hash',
  render: () => ({
    props: {
      items: ITEMS,
      active: signal<string | undefined>(undefined),
      clickLog: signal(''),
    },
    template: `
      <div style="${row}">
        <andes-anchor style="width: 180px; flex: none;" [items]="items" [container]="scroller" updateHash [(activeLink)]="active" (clicked)="clickLog.set('Clicked ' + $event.link.title)" />
        <div style="flex: 1;">
          <div #scroller style="${scroller}">${sections()}</div>
          <p style="margin: 8px 0 0;">Active: {{ active() ?? 'none' }}. {{ clickLog() }}</p>
          <button type="button" style="height: 24px; padding: 0 10px; border: 1px solid var(--andes-color-input, #d1d5db); border-radius: var(--andes-radius-md, 0.375rem); background: var(--andes-color-background, #fff); color: inherit; font: inherit; cursor: pointer;" (click)="active.set('#faq')">Highlight FAQ</button>
        </div>
      </div>`,
  }),
};
