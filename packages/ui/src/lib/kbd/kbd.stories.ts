import type { Meta, StoryObj } from '@storybook/angular';

import { AndesKbd } from './kbd';
import { AndesKbdGroup } from './kbd-group';

const meta: Meta<AndesKbd> = {
  title: 'Kbd',
  component: AndesKbd,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['default', 'outline'] },
    platform: {
      control: 'inline-radio',
      options: ['auto', 'mac', 'windows', 'linux'],
    },
    separator: { control: 'text' },
    key: { control: 'text' },
    shortcut: { control: 'text' },
  },
  args: {
    size: 'md',
    variant: 'default',
    platform: 'mac',
    separator: '+',
    key: undefined,
    shortcut: 'Mod+K',
  },
  render: (args) => ({
    moduleMetadata: { imports: [AndesKbdGroup] },
    props: args,
    template: `<andes-kbd [size]="size" [variant]="variant" [platform]="platform" [separator]="separator" [key]="key" [shortcut]="shortcut" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesKbd>;

/** `shortcut` renders a whole combination; the glyphs follow `platform` (`auto` detects it). */
export const Shortcut: Story = {};

export const ProjectedText: Story = {
  render: () => ({
    template: `<andes-kbd>Esc</andes-kbd>`,
  }),
};

export const SingleKey: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <andes-kbd key="Mod" platform="mac" />
        <andes-kbd key="Shift" platform="mac" />
        <andes-kbd key="Alt" platform="mac" />
        <andes-kbd key="Ctrl" platform="mac" />
        <andes-kbd key="Enter" platform="mac" />
        <andes-kbd key="Esc" platform="mac" />
        <andes-kbd key="ArrowUp" />
        <andes-kbd key="ArrowDown" />
        <andes-kbd key="ArrowLeft" />
        <andes-kbd key="ArrowRight" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <andes-kbd size="sm" shortcut="Mod+K" platform="mac" />
        <andes-kbd size="md" shortcut="Mod+K" platform="mac" />
        <andes-kbd size="lg" shortcut="Mod+K" platform="mac" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <andes-kbd variant="default" shortcut="Mod+S" platform="windows" />
        <andes-kbd variant="outline" shortcut="Mod+S" platform="windows" />
      </div>
    `,
  }),
};

export const PerPlatform: Story = {
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: auto auto; gap: 0.75rem 2rem; align-items: center; font-size: 0.875rem; line-height: 1.375rem;">
        <span>Mac</span><andes-kbd shortcut="Mod+Shift+P" platform="mac" />
        <span>Windows</span><andes-kbd shortcut="Mod+Shift+P" platform="windows" />
        <span>Linux</span><andes-kbd shortcut="Meta+Alt+T" platform="linux" />
      </div>
    `,
  }),
};

export const Sequence: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-kbd shortcut="G then I" />
        <andes-kbd shortcut="G I" separator="none" />
      </div>
    `,
  }),
};

export const GroupFromKeys: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesKbdGroup] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-kbd-group aria-label="Open the command palette" [keys]="['Mod', 'K']" platform="windows" />
        <andes-kbd-group aria-label="Open the command palette" [keys]="['Mod', 'Shift', 'P']" platform="mac" separator="none" />
        <andes-kbd-group aria-label="Go to inbox" [keys]="['G', 'I']" separator="then" />
      </div>
    `,
  }),
};

export const GroupFromProjectedKeys: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesKbdGroup] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-kbd-group>
          <andes-kbd>Ctrl</andes-kbd>
          <andes-kbd>Alt</andes-kbd>
          <andes-kbd>Del</andes-kbd>
        </andes-kbd-group>
        <andes-kbd-group separator="then">
          <andes-kbd>G</andes-kbd>
          <andes-kbd>D</andes-kbd>
        </andes-kbd-group>
      </div>
    `,
  }),
};

/** Where shortcuts usually live: next to the command they trigger. */
export const InMenuRows: Story = {
  render: () => ({
    template: `
      <div style="width: 18rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md); padding: 0.25rem; font-size: 0.875rem; line-height: 1.375rem;">
        @for (row of rows; track row.label) {
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.25rem 0.5rem;">
            <span>{{ row.label }}</span>
            <andes-kbd size="sm" [shortcut]="row.shortcut" platform="mac" separator="none" />
          </div>
        }
      </div>
    `,
    props: {
      rows: [
        { label: 'New invoice', shortcut: 'Mod+N' },
        { label: 'Search customers', shortcut: 'Mod+K' },
        { label: 'Export report', shortcut: 'Mod+Shift+E' },
        { label: 'Close panel', shortcut: 'Esc' },
      ],
    },
  }),
};

/** Re-skinned for an inverted surface through the colour custom properties. */
export const OnInvertedSurface: Story = {
  render: () => ({
    template: `
      <div style="display: inline-flex; gap: 0.5rem; align-items: center; padding: 0.375rem 0.75rem; border-radius: var(--andes-radius-md); background: var(--andes-color-foreground); color: var(--andes-color-background); font-size: 0.75rem; line-height: 1.25rem;">
        Save changes
        <andes-kbd
          shortcut="Mod+S"
          platform="mac"
          separator="none"
          style="--andes-kbd-bg: color-mix(in srgb, var(--andes-color-background) 15%, transparent); --andes-kbd-border: transparent; --andes-kbd-color: var(--andes-color-background);"
        />
      </div>
    `,
  }),
};

export const InsideText: Story = {
  render: () => ({
    template: `
      <p style="max-width: 28rem; font-size: 0.875rem; line-height: 1.375rem; margin: 0;">
        Press <andes-kbd size="sm" shortcut="Mod+K" platform="windows" /> to search, or
        <andes-kbd size="sm">Esc</andes-kbd> to dismiss the dialog.
      </p>
    `,
  }),
};
