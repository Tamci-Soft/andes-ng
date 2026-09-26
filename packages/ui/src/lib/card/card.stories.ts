import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEllipsis, lucidePencil, lucideSettings } from '@ng-icons/lucide';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import {
  AndesCard,
  AndesCardAction,
  AndesCardActions,
  AndesCardContent,
  AndesCardDescription,
  AndesCardFooter,
  AndesCardGrid,
  AndesCardHeader,
  AndesCardMeta,
  AndesCardTab,
  AndesCardTitle,
} from './card';

/** No Avatar component exists in this package yet - a plain initials badge stands in for one. */
const AVATAR_STYLE =
  'display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;' +
  ' border-radius: 9999px; background: var(--andes-color-primary);' +
  ' color: var(--andes-color-primary-foreground); font-size: 0.875rem; font-weight: 500;';

const ACTION_BUTTONS = `
  <andes-button variant="ghost" size="icon-sm" aria-label="Settings"><ng-icon name="lucideSettings" /></andes-button>
  <andes-button variant="ghost" size="icon-sm" aria-label="Edit"><ng-icon name="lucidePencil" /></andes-button>
  <andes-button variant="ghost" size="icon-sm" aria-label="More options"><ng-icon name="lucideEllipsis" /></andes-button>
`;

const meta: Meta<AndesCard> = {
  title: 'Card',
  component: AndesCard,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      // AndesButton is imported here rather than per-story so every story that needs a card
      // action uses the library's own button. Card's demos double as living documentation, so
      // they should show the two components composing the way a consumer is meant to use them
      // - a raw <button> would render unstyled browser chrome and quietly document the wrong
      // pattern.
      imports: [
        AndesCardHeader,
        AndesCardTitle,
        AndesCardDescription,
        AndesCardAction,
        AndesCardContent,
        AndesCardFooter,
        AndesCardMeta,
        AndesCardGrid,
        AndesCardActions,
        AndesButton,
        NgIcon,
      ],
      // Story-local rather than in preview.ts: only the Card demos use these icons.
      providers: [
        provideIcons({ lucideSettings, lucidePencil, lucideEllipsis }),
      ],
    }),
  ],
  argTypes: {
    variant: { control: 'select', options: ['outlined', 'borderless'] },
    size: { control: 'select', options: ['default', 'sm'] },
    type: { control: 'select', options: ['default', 'inner'] },
    hoverable: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  args: {
    variant: 'outlined',
    size: 'default',
    type: 'default',
    hoverable: false,
    loading: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <andes-card [variant]="variant" [size]="size" [type]="type" [hoverable]="hoverable" [loading]="loading" style="max-width: 360px;">
        <andes-card-header>
          <andes-card-title>Team members</andes-card-title>
          <andes-card-description>Manage who has access to this project.</andes-card-description>
        </andes-card-header>
        <andes-card-content>
          <p style="margin: 0;">Invite teammates by email and assign them a role.</p>
        </andes-card-content>
        <andes-card-footer>
          <andes-button>Invite member</andes-button>
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
            <andes-button variant="outline" size="sm">Edit</andes-button>
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
          <andes-card-description>Placed before the header so it runs edge to edge.</andes-card-description>
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
          <andes-card-footer><andes-button size="sm">Action</andes-button></andes-card-footer>
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
            <andes-card-action>
              <andes-button variant="ghost" size="icon-sm" aria-label="More options">⋯</andes-button>
            </andes-card-action>
          </andes-card-header>
          <andes-card-content><p style="margin:0;">Hover to see the elevation.</p></andes-card-content>
        </andes-card>
      </div>
    `,
  }),
};

/** A cover, an `AndesCardMeta` body and a divided actions bar. */
export const MetaWithActions: Story = {
  render: (args) => ({
    props: { ...args, avatarStyle: AVATAR_STYLE },
    template: `
      <andes-card [variant]="variant" [size]="size" [hoverable]="hoverable" [loading]="loading" style="max-width: 320px;">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640&h=280&fit=crop"
          alt=""
          style="display: block; width: 100%; height: 160px; object-fit: cover;"
        />
        <andes-card-content>
          <andes-card-meta>
            <span slot="avatar" [style]="avatarStyle">AB</span>
            <andes-card-title>Ada Byron</andes-card-title>
            <andes-card-description>Mapping the Andes, one ridge at a time.</andes-card-description>
          </andes-card-meta>
        </andes-card-content>
        <andes-card-actions>${ACTION_BUTTONS}</andes-card-actions>
      </andes-card>
    `,
  }),
};

export const Actions: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-card [variant]="variant" [size]="size" style="max-width: 360px;">
        <andes-card-header>
          <andes-card-title>Deployment</andes-card-title>
          <andes-card-description>Each child of the actions bar becomes one equal-width cell.</andes-card-description>
        </andes-card-header>
        <andes-card-content>
          <p style="margin: 0;">Last deployed 2 hours ago.</p>
        </andes-card-content>
        <andes-card-actions>
          <andes-button variant="ghost" size="sm">Logs</andes-button>
          <andes-button variant="ghost" size="sm">Redeploy</andes-button>
          <andes-button variant="ghost" size="sm">Settings</andes-button>
        </andes-card-actions>
      </andes-card>
    `,
  }),
};

export const MetaWithoutAvatar: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-card [variant]="variant" [size]="size" style="max-width: 320px;">
        <andes-card-content>
          <andes-card-meta>
            <andes-card-title>Europe Street beat</andes-card-title>
            <andes-card-description>www.instagram.com</andes-card-description>
          </andes-card-meta>
        </andes-card-content>
      </andes-card>
    `,
  }),
};

/** Toggle `loading` in the controls: the header and actions stay, only the body becomes a skeleton. */
export const Loading: Story = {
  args: { loading: true },
  render: (args) => ({
    props: { ...args, avatarStyle: AVATAR_STYLE },
    template: `
      <andes-card [variant]="variant" [size]="size" [loading]="loading" style="width: min(320px, calc(100vw - 3rem));">
        <andes-card-header>
          <andes-card-title>Card title</andes-card-title>
          <andes-card-action><andes-button variant="link" size="sm">More</andes-button></andes-card-action>
        </andes-card-header>
        <andes-card-content>
          <andes-card-meta>
            <span slot="avatar" [style]="avatarStyle">AB</span>
            <andes-card-title>Ada Byron</andes-card-title>
            <andes-card-description>This is the loaded body.</andes-card-description>
          </andes-card-meta>
        </andes-card-content>
        <andes-card-actions>${ACTION_BUTTONS}</andes-card-actions>
      </andes-card>
    `,
  }),
};

export const Grid: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-card [variant]="variant" [size]="size" style="width: min(560px, calc(100vw - 3rem));">
        <andes-card-header>
          <andes-card-title>Card grid</andes-card-title>
          <andes-card-description>Cells lift on hover by default; the second one opts out.</andes-card-description>
        </andes-card-header>
        <andes-card-content style="text-align: center;">
          <andes-card-grid>Content</andes-card-grid>
          <andes-card-grid [hoverable]="false">Not hoverable</andes-card-grid>
          <andes-card-grid>Content</andes-card-grid>
          <andes-card-grid>Content</andes-card-grid>
          <andes-card-grid>Content</andes-card-grid>
          <andes-card-grid>Content</andes-card-grid>
          <andes-card-grid>Content</andes-card-grid>
        </andes-card-content>
      </andes-card>
    `,
  }),
};

export const GridFourColumns: Story = {
  render: () => ({
    template: `
      <andes-card style="width: min(560px, calc(100vw - 3rem)); --andes-card-grid-columns: 4;">
        <andes-card-content style="text-align: center;">
          <andes-card-grid>1</andes-card-grid>
          <andes-card-grid>2</andes-card-grid>
          <andes-card-grid>3</andes-card-grid>
          <andes-card-grid>4</andes-card-grid>
          <andes-card-grid>5</andes-card-grid>
          <andes-card-grid>6</andes-card-grid>
          <andes-card-grid>7</andes-card-grid>
          <andes-card-grid>8</andes-card-grid>
        </andes-card-content>
      </andes-card>
    `,
  }),
};

export const InnerCard: Story = {
  render: (args) => ({
    props: args,
    template: `
      <andes-card [variant]="variant" [size]="size" style="width: min(480px, calc(100vw - 3rem));">
        <andes-card-header>
          <andes-card-title [level]="2">Project settings</andes-card-title>
        </andes-card-header>
        <andes-card-content style="display: flex; flex-direction: column; gap: 1rem;">
          <andes-card type="inner">
            <andes-card-header>
              <andes-card-title>General</andes-card-title>
              <andes-card-action><andes-button variant="link" size="sm">Edit</andes-button></andes-card-action>
            </andes-card-header>
            <andes-card-content><p style="margin: 0;">Name, description and visibility.</p></andes-card-content>
          </andes-card>
          <andes-card type="inner">
            <andes-card-header>
              <andes-card-title>Members</andes-card-title>
              <andes-card-action><andes-button variant="link" size="sm">Edit</andes-button></andes-card-action>
            </andes-card-header>
            <andes-card-content><p style="margin: 0;">3 people have access.</p></andes-card-content>
          </andes-card>
        </andes-card-content>
      </andes-card>
    `,
  }),
};

const TABS: AndesCardTab[] = [
  { key: 'article', label: 'Article' },
  { key: 'app', label: 'App' },
  { key: 'project', label: 'Project' },
  { key: 'archived', label: 'Archived', disabled: true },
];

const TAB_BODIES: Record<string, string> = {
  article: 'Article content',
  app: 'App content',
  project: 'Project content',
};

/**
 * `[(activeTabKey)]` is two-way; the card only switches the selected tab - rendering the
 * matching body is up to the consumer. Arrow keys, Home and End move between enabled tabs.
 */
export const WithTabs: Story = {
  render: (args) => ({
    props: { ...args, tabs: TABS, bodies: TAB_BODIES, active: 'article' },
    template: `
      <andes-card
        [variant]="variant"
        [size]="size"
        [type]="type"
        [loading]="loading"
        [tabList]="tabs"
        [(activeTabKey)]="active"
        [tabBarExtraContent]="extra"
        style="width: min(420px, calc(100vw - 3rem));"
      >
        <andes-card-header>
          <andes-card-title>Card with tabs</andes-card-title>
        </andes-card-header>
        <andes-card-content>
          <p style="margin: 0;">{{ bodies[active] }}</p>
        </andes-card-content>
      </andes-card>
      <ng-template #extra><andes-button variant="link" size="sm">More</andes-button></ng-template>
      <p style="margin: 0.75rem 0 0; font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground);">activeTabKey: <code>{{ active }}</code></p>
    `,
  }),
};

export const TabsWithoutTitle: Story = {
  render: () => ({
    props: { tabs: TABS, bodies: TAB_BODIES, active: 'app' },
    template: `
      <andes-card [tabList]="tabs" [(activeTabKey)]="active" style="width: min(420px, calc(100vw - 3rem));">
        <andes-card-header />
        <andes-card-content>
          <p style="margin: 0;">{{ bodies[active] }}</p>
        </andes-card-content>
      </andes-card>
    `,
  }),
};
