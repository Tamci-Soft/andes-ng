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

/**
 * Demo text fields styled like the library's own fields: one focus indicator (primary
 * border plus a soft 2px ring), never the browser's outline drawn as a second frame.
 */
const FIELD_STYLES = `
  <style>
    .sb-field-input {
      box-sizing: border-box;
      min-height: 2rem;
      padding: 0.25rem 0.6875rem;
      border: 1px solid var(--andes-color-input);
      border-radius: var(--andes-radius-md);
      background-color: var(--andes-color-background);
      color: var(--andes-color-foreground);
      font: inherit;
      line-height: 1.375rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
    }
    .sb-field-input::placeholder { color: var(--andes-color-muted-foreground); }
    .sb-field-input:hover {
      border-color: color-mix(in srgb, var(--andes-color-primary) 65%, var(--andes-color-input));
    }
    .sb-field-input:focus {
      border-color: var(--andes-color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--andes-color-primary) 20%, transparent);
      outline: none;
    }
  </style>
`;

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
    closePlacement: { control: 'inline-radio', options: ['start', 'end'] },
    closeDisabled: { control: 'boolean' },
    maskBlur: { control: 'boolean' },
    resizable: { control: 'boolean' },
  },
  args: {
    size: 'default',
    height: null,
    mask: true,
    closable: true,
    closeOnEscape: true,
    closeOnOutsideClick: true,
    loading: false,
    closePlacement: 'end',
    closeDisabled: false,
    maskBlur: false,
    resizable: false,
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
        [closePlacement]="closePlacement"
        [closeDisabled]="closeDisabled"
        [maskBlur]="maskBlur"
        [resizable]="resizable"
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

/** `size="large"` is the 736px preset, capped at the viewport height. */
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
 * `andesDrawerExtra` puts an action at the header's trailing end, and
 * `<ng-template andesDrawerContent>` renders the body lazily on first open
 * (kept alive between opens unless `destroyOnHidden`).
 */
export const ExtraAndLazyContent: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `${FIELD_STYLES}
      <andes-drawer>
        <andes-button variant="primary" andesDrawerTrigger>Open drawer</andes-button>
        <andes-drawer-header>
          <andes-drawer-title>Share note</andes-drawer-title>
          <andes-button variant="outline" size="sm" andesDrawerExtra>Copy link</andes-button>
        </andes-drawer-header>
        <ng-template andesDrawerContent>
          <label style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem;">
            Message (kept between opens)
            <textarea rows="3" class="sb-field-input"></textarea>
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
 * `push` on the outer drawer lifts it while a nested drawer is open.
 * `(afterOpenChange)` fires once each slide finishes.
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

/** `closePlacement="start"` moves the close button to the header's leading corner. */
export const ClosePlacementStart: Story = {
  args: { closePlacement: 'start' },
};

/** `maskBlur` blurs the page behind the backdrop. */
export const MaskBlur: Story = {
  args: { maskBlur: true },
};

/**
 * `resizable` adds a grip on the top edge: drag it, or focus it and use the
 * arrow keys (Shift for larger steps). `maxSize` caps the height in px.
 */
export const Resizable: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: { last: null },
    template: `
      <andes-drawer resizable [maxSize]="640" (resizeEnd)="last = $event">
        <andes-button variant="primary" andesDrawerTrigger>Open resizable drawer</andes-button>
        <andes-drawer-header>
          <andes-drawer-title>Activity log</andes-drawer-title>
          <andes-drawer-description>Pull the grip up for more rows (up to 640px).</andes-drawer-description>
        </andes-drawer-header>
        <p style="margin: 0; text-align: center;">Last height: {{ last ?? '—' }}{{ last ? 'px' : '' }}</p>
      </andes-drawer>
    `,
  }),
};
