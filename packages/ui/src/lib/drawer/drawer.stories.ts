import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesDrawer } from './drawer';
import { AndesDrawerClose } from './drawer-close';
import { AndesDrawerContent } from './drawer-content';
import {
  AndesDrawerDescription,
  AndesDrawerFooter,
  AndesDrawerHeader,
  AndesDrawerTitle,
} from './drawer-parts';
import { AndesDrawerTrigger } from './drawer-trigger';

const imports = [
  AndesButton,
  AndesDrawer,
  AndesDrawerTrigger,
  AndesDrawerHeader,
  AndesDrawerTitle,
  AndesDrawerDescription,
  AndesDrawerFooter,
  AndesDrawerClose,
  AndesDrawerContent,
];

const goalBody = `
  <div style="display: flex; align-items: center; justify-content: center; gap: 1rem;">
    <span style="font-size: 2rem; font-weight: 600;">350</span>
    <span style="color: var(--andes-color-muted-foreground);">calories/day</span>
  </div>
`;

const meta: Meta<AndesDrawer> = {
  title: 'Drawer',
  component: AndesDrawer,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['default', 'large'] },
    height: { control: 'text' },
    mask: { control: 'boolean' },
    closable: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
    closeOnOutsideClick: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  args: {
    size: 'default',
    height: null,
    mask: true,
    closable: true,
    closeOnEscape: true,
    closeOnOutsideClick: true,
    loading: false,
  },
  render: (args) => ({
    moduleMetadata: { imports },
    props: args,
    template: `
      <andes-drawer
        [size]="size"
        [height]="height"
        [mask]="mask"
        [closable]="closable"
        [closeOnEscape]="closeOnEscape"
        [closeOnOutsideClick]="closeOnOutsideClick"
        [loading]="loading"
      >
        <andes-button variant="primary" andesDrawerTrigger>Open drawer</andes-button>

        <andes-drawer-header>
          <andes-drawer-title>Move goal</andes-drawer-title>
          <andes-drawer-description>Set your daily activity goal.</andes-drawer-description>
        </andes-drawer-header>

        ${goalBody}

        <andes-drawer-footer>
          <andes-button variant="primary" fullWidth andesDrawerClose>Submit</andes-button>
          <andes-button variant="outline" fullWidth andesDrawerClose>Cancel</andes-button>
        </andes-drawer-footer>
      </andes-drawer>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesDrawer>;

export const Default: Story = {};

export const NoOutsideDismiss: Story = {
  args: { closeOnOutsideClick: false, closeOnEscape: false },
};

/** `size="large"` is Ant's 736px preset, capped at the viewport height. */
export const Large: Story = {
  args: { size: 'large' },
};

/** `height` takes a number (px) or any CSS length and wins over `size`. */
export const CustomHeight: Story = {
  args: { height: '60vh' },
};

/** `loading` swaps the body for a skeleton; header, footer and close stay usable. */
export const Loading: Story = {
  args: { loading: true },
};

/** `mask=false` drops the backdrop and makes the drawer non-modal. */
export const NoMask: Story = {
  args: { mask: false, closeOnOutsideClick: false },
};

/**
 * `andesDrawerExtra` puts an action at the header's trailing end (Ant's
 * `extra`), and `<ng-template andesDrawerContent>` renders the body lazily on
 * first open (kept alive between opens unless `destroyOnHidden`).
 */
export const ExtraAndLazyContent: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <andes-drawer>
        <andes-button variant="primary" andesDrawerTrigger>Open drawer</andes-button>
        <andes-drawer-header>
          <andes-drawer-title>Share note</andes-drawer-title>
          <andes-button variant="outline" size="sm" andesDrawerExtra>Copy link</andes-button>
        </andes-drawer-header>
        <ng-template andesDrawerContent>
          <label style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem;">
            Message (kept between opens)
            <textarea rows="3" style="padding: 0.5rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md); font-family: inherit; color: inherit; background: transparent;"></textarea>
          </label>
        </ng-template>
        <andes-drawer-footer>
          <andes-button variant="primary" fullWidth andesDrawerClose>Send</andes-button>
        </andes-drawer-footer>
      </andes-drawer>
    `,
  }),
};

/**
 * `push` on the outer drawer lifts it while a nested drawer is open, like Ant's
 * nested drawers. `(afterOpenChange)` fires once each slide finishes.
 */
export const NestedPush: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: { log: '' },
    template: `
      <andes-drawer push="120" (afterOpenChange)="log = log + ' · outer ' + ($event ? 'opened' : 'closed')">
        <andes-button variant="primary" andesDrawerTrigger>Open multi-level drawer</andes-button>
        <andes-drawer-header>
          <andes-drawer-title>First level</andes-drawer-title>
          <andes-drawer-description>Opening the second level lifts this one.</andes-drawer-description>
        </andes-drawer-header>

        <andes-drawer height="260" (afterOpenChange)="log = log + ' · inner ' + ($event ? 'opened' : 'closed')">
          <andes-button variant="outline" fullWidth andesDrawerTrigger>Open second level</andes-button>
          <andes-drawer-header>
            <andes-drawer-title>Second level</andes-drawer-title>
          </andes-drawer-header>
          <andes-drawer-footer>
            <andes-button variant="primary" fullWidth andesDrawerClose>Close</andes-button>
          </andes-drawer-footer>
        </andes-drawer>
      </andes-drawer>
      <p data-testid="after-open-log" style="font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-muted-foreground);">
        afterOpenChange: {{ log || ' —' }}
      </p>
    `,
  }),
};
