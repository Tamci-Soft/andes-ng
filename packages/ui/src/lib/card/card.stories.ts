import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import {
  AndesCard,
  AndesCardAction,
  AndesCardContent,
  AndesCardDescription,
  AndesCardFooter,
  AndesCardHeader,
  AndesCardTitle,
} from './card';

const meta: Meta<AndesCard> = {
  title: 'Card',
  component: AndesCard,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        AndesCardHeader,
        AndesCardTitle,
        AndesCardDescription,
        AndesCardAction,
        AndesCardContent,
        AndesCardFooter,
      ],
    }),
  ],
  argTypes: {
    variant: { control: 'select', options: ['outlined', 'borderless'] },
    size: { control: 'select', options: ['default', 'sm'] },
    hoverable: { control: 'boolean' },
  },
  args: {
    variant: 'outlined',
    size: 'default',
    hoverable: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <andes-card [variant]="variant" [size]="size" [hoverable]="hoverable" style="max-width: 360px;">
        <andes-card-header>
          <andes-card-title>Team members</andes-card-title>
          <andes-card-description>Manage who has access to this project.</andes-card-description>
        </andes-card-header>
        <andes-card-content>
          <p style="margin: 0;">Invite teammates by email and assign them a role.</p>
        </andes-card-content>
        <andes-card-footer>
          <button type="button">Invite member</button>
        </andes-card-footer>
      </andes-card>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesCard>;

export const Outlined: Story = {
  args: { variant: 'outlined' },
};

export const Borderless: Story = {
  args: { variant: 'borderless' },
};

export const SmallSize: Story = {
  args: { size: 'sm' },
};

export const Hoverable: Story = {
  args: { hoverable: true },
};

export const HeaderWithAction: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-card [variant]="variant" [size]="size" style="max-width: 360px;">
        <andes-card-header>
          <andes-card-title>Team members</andes-card-title>
          <andes-card-description>Manage who has access to this project.</andes-card-description>
          <andes-card-action>
            <button type="button">Edit</button>
          </andes-card-action>
        </andes-card-header>
        <andes-card-content>
          <p style="margin: 0;">3 people have access.</p>
        </andes-card-content>
      </andes-card>
    `,
  }),
};

export const HeadingLevels: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 360px;">
        <andes-card>
          <andes-card-header>
            <andes-card-title [level]="2">Section heading (h2)</andes-card-title>
            <andes-card-description>Use a lower level when a card is a page's main section.</andes-card-description>
          </andes-card-header>
        </andes-card>
        <andes-card>
          <andes-card-header>
            <andes-card-title>Default heading (h3)</andes-card-title>
            <andes-card-description>The default level fits most nested-card usage.</andes-card-description>
          </andes-card-header>
        </andes-card>
      </div>
    `,
  }),
};

export const WithCoverImage: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-card [variant]="variant" [size]="size" style="max-width: 320px;">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640&h=280&fit=crop"
          alt=""
          style="display: block; width: 100%; height: 160px; object-fit: cover;"
        />
        <andes-card-header>
          <andes-card-title>Mountain view</andes-card-title>
          <andes-card-description>Placed before the header, as documented by both reference libraries.</andes-card-description>
        </andes-card-header>
        <andes-card-content>
          <p style="margin: 0;">No dedicated cover sub-component is needed - the card's own overflow clipping does the work.</p>
        </andes-card-content>
      </andes-card>
    `,
  }),
};

export const ContentOnly: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-card [variant]="variant" [size]="size" style="max-width: 320px;">
        <andes-card-content>
          <p style="margin: 0;">A card doesn't need a header or footer - any combination of parts is valid.</p>
        </andes-card-content>
      </andes-card>
    `,
  }),
};

export const Overview: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1.5rem;">
        <andes-card style="max-width: 300px;">
          <andes-card-header>
            <andes-card-title>Outlined (default)</andes-card-title>
            <andes-card-description>variant="outlined"</andes-card-description>
          </andes-card-header>
          <andes-card-content><p style="margin:0;">Body content.</p></andes-card-content>
          <andes-card-footer><button type="button">Action</button></andes-card-footer>
        </andes-card>

        <andes-card variant="borderless" style="max-width: 300px;">
          <andes-card-header>
            <andes-card-title>Borderless</andes-card-title>
            <andes-card-description>variant="borderless"</andes-card-description>
          </andes-card-header>
          <andes-card-content><p style="margin:0;">Body content.</p></andes-card-content>
        </andes-card>

        <andes-card size="sm" hoverable style="max-width: 300px;">
          <andes-card-header>
            <andes-card-title>Small + hoverable</andes-card-title>
            <andes-card-description>size="sm" hoverable</andes-card-description>
            <andes-card-action><button type="button">⋯</button></andes-card-action>
          </andes-card-header>
          <andes-card-content><p style="margin:0;">Hover to see the elevation.</p></andes-card-content>
        </andes-card>
      </div>
    `,
  }),
};
