import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesEmpty } from './empty';

const meta: Meta<AndesEmpty> = {
  title: 'Empty',
  component: AndesEmpty,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesButton] })],
  parameters: { layout: 'padded' },
  argTypes: {
    preset: {
      control: 'select',
      options: ['default', 'select', 'table', 'list', 'search'],
    },
    image: { control: 'text' },
    imageAlt: { control: 'text' },
    description: { control: 'text' },
    size: { control: 'select', options: [undefined, 'default', 'small'] },
    announce: { control: 'boolean' },
    imageStyle: { control: 'object' },
  },
  args: { preset: 'default', announce: false },
  render: (args) => ({
    props: args,
    template: `<andes-empty [preset]="preset" [image]="image" [imageAlt]="imageAlt" [imageStyle]="imageStyle" [description]="description" [size]="size" [announce]="announce" />`,
  }),
};

export default meta;
type Story = StoryObj<AndesEmpty>;

const surface =
  'font: 14px/22px var(--andes-font-family, system-ui), sans-serif; color: var(--andes-color-foreground);';
const panel =
  'border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md, 8px); background: var(--andes-color-card, var(--andes-color-background));';

export const Playground: Story = {};

export const Default: Story = {
  render: () => ({ template: `<andes-empty />` }),
};

export const Simple: Story = {
  render: () => ({ template: `<andes-empty image="simple" />` }),
};

export const Illustrations: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Both illustrations are inline SVG drawn with theme tokens, so they follow light and dark mode. Switch the toolbar theme to compare.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="${surface} display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem;">
        <div style="${panel}"><andes-empty image="default" description="default" /></div>
        <div style="${panel}"><andes-empty image="simple" description="simple" /></div>
      </div>`,
  }),
};

export const CustomDescription: Story = {
  render: () => ({
    template: `<andes-empty description="No invoices match your filters" />`,
  }),
};

export const DescriptionTemplate: Story = {
  render: () => ({
    template: `
      <andes-empty [description]="text">
        <ng-template #text>
          <span style="${surface}">No members yet. <a href="#" style="color: var(--andes-color-primary-text, var(--andes-color-primary));">Learn how to invite people</a></span>
        </ng-template>
      </andes-empty>`,
  }),
};

export const NoDescription: Story = {
  render: () => ({
    template: `<andes-empty [description]="false" />`,
  }),
};

export const WithActions: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Projected content becomes the actions area under the message.',
      },
    },
  },
  render: () => ({
    template: `
      <andes-empty description="You have not created any invoices yet">
        <andes-button size="md">Create invoice</andes-button>
        <andes-button variant="outline" size="md">Import from file</andes-button>
      </andes-empty>`,
  }),
};

export const Small: Story = {
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem; ${panel}">
        <andes-empty size="small" />
        <andes-empty size="small" image="simple" />
      </div>`,
  }),
};

export const CustomImageUrl: Story = {
  render: () => ({
    props: {
      art:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><rect x="10" y="20" width="100" height="60" rx="10" fill="#94a3b8" fill-opacity=".25" stroke="#94a3b8" stroke-width="3"/><path d="M10 40l50 22 50-22" fill="none" stroke="#94a3b8" stroke-width="3"/></svg>',
        ),
    },
    template: `<andes-empty [image]="art" imageAlt="An empty mailbox" description="Your inbox is empty" />`,
  }),
};

export const CustomImageTemplate: Story = {
  render: () => ({
    template: `
      <andes-empty description="No chart data for this period">
        <ng-template #art>
          <svg viewBox="0 0 120 70" width="120" height="70" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="color: var(--andes-color-muted-foreground);">
            <path d="M8 62h104M20 52V38M44 52V26M68 52V44M92 52V18" />
          </svg>
        </ng-template>
      </andes-empty>`,
  }),
};

export const ImageSize: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Resize the picture with `--andes-empty-image-size`, either on the element or through `imageStyle`.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem; ${panel}">
        <andes-empty style="--andes-empty-image-size: 64px;" description="64px" />
        <andes-empty [imageStyle]="{ '--andes-empty-image-size': '140px' }" description="140px" />
      </div>`,
  }),
};

export const Presets: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`preset` picks the illustration, size and message for a common place. Any explicit input still wins.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="${surface} display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem;">
        @for (preset of presets; track preset) {
        <div style="${panel}">
          <andes-empty [preset]="preset" />
          <div style="text-align: center; padding-bottom: 0.75rem; font-size: 12px; line-height: 20px; color: var(--andes-color-muted-foreground);">preset="{{ preset }}"</div>
        </div>
        }
      </div>`,
    props: { presets: ['default', 'select', 'table', 'list', 'search'] },
  }),
};

export const InCard: Story = {
  render: () => ({
    template: `
      <div style="${surface} max-width: 28rem; ${panel}">
        <div style="padding: 1rem; border-bottom: 1px solid var(--andes-color-border); font-size: 16px; line-height: 24px; font-weight: 600;">Recent activity</div>
        <andes-empty description="Nothing has happened yet">
          <andes-button variant="outline" size="sm">Refresh</andes-button>
        </andes-empty>
      </div>`,
  }),
};

export const InTableBody: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Use the `table` preset inside a cell that spans every column. The same applies to a table component's empty-state slot.",
      },
    },
  },
  render: () => ({
    template: `
      <div style="${surface} ${panel} overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: var(--andes-color-muted); text-align: start;">
              <th style="padding: 10px 16px; font-weight: 600; text-align: start;">Invoice</th>
              <th style="padding: 10px 16px; font-weight: 600; text-align: start;">Customer</th>
              <th style="padding: 10px 16px; font-weight: 600; text-align: start;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="3" style="padding: 0; border-top: 1px solid var(--andes-color-border);">
                <andes-empty preset="table" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>`,
  }),
};

export const InListbox: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The `select` preset is a compact state for a dropdown with no options; `announce` lets screen readers hear it after a search.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="${surface} width: 16rem; ${panel} box-shadow: var(--andes-shadow-md, 0 4px 12px rgb(0 0 0 / 0.12)); padding: 4px;">
        <div style="padding: 0 8px; height: 32px; display: flex; align-items: center; border: 1px solid var(--andes-color-input); border-radius: var(--andes-radius-md, 8px); color: var(--andes-color-muted-foreground);">zzz</div>
        <andes-empty preset="select" description="No matches for “zzz”" announce />
      </div>`,
  }),
};
