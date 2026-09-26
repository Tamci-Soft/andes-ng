import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesSheet } from './sheet';
import { AndesSheetClose } from './sheet-close';
import { AndesSheetContent } from './sheet-content';
import {
  AndesSheetDescription,
  AndesSheetFooter,
  AndesSheetHeader,
  AndesSheetTitle,
} from './sheet-parts';
import { AndesSheetTrigger } from './sheet-trigger';

const imports = [
  AndesButton,
  AndesSheet,
  AndesSheetTrigger,
  AndesSheetHeader,
  AndesSheetTitle,
  AndesSheetDescription,
  AndesSheetFooter,
  AndesSheetClose,
  AndesSheetContent,
];

const fieldStyle =
  'display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem;';
const inputStyle =
  'padding: 0.5rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md); font-family: inherit; color: inherit; background: transparent;';

const profileForm = `
  <div style="display: flex; flex-direction: column; gap: 0.75rem;">
    <label style="${fieldStyle}">
      Name
      <input value="Jane Doe" style="${inputStyle}" />
    </label>
    <label style="${fieldStyle}">
      Username
      <input value="@janedoe" style="${inputStyle}" />
    </label>
  </div>
`;

const meta: Meta<AndesSheet> = {
  title: 'Sheet',
  component: AndesSheet,
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    size: { control: 'select', options: ['default', 'large'] },
    width: { control: 'text' },
    height: { control: 'text' },
    mask: { control: 'boolean' },
    closable: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
    closeOnOutsideClick: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  args: {
    side: 'right',
    size: 'default',
    width: null,
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
      <andes-sheet
        [side]="side"
        [size]="size"
        [width]="width"
        [height]="height"
        [mask]="mask"
        [closable]="closable"
        [closeOnEscape]="closeOnEscape"
        [closeOnOutsideClick]="closeOnOutsideClick"
        [loading]="loading"
      >
        <andes-button variant="primary" andesSheetTrigger>Open sheet</andes-button>

        <andes-sheet-header>
          <andes-sheet-title>Edit profile</andes-sheet-title>
          <andes-sheet-description>Make changes to your profile here. Click save when you're done.</andes-sheet-description>
        </andes-sheet-header>

        ${profileForm}

        <andes-sheet-footer>
          <andes-button variant="outline" andesSheetClose>Cancel</andes-button>
          <andes-button variant="primary" andesSheetClose>Save changes</andes-button>
        </andes-sheet-footer>
      </andes-sheet>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesSheet>;

export const Right: Story = {
  args: { side: 'right' },
};

export const Left: Story = {
  args: { side: 'left' },
};

export const Top: Story = {
  args: { side: 'top' },
};

export const Bottom: Story = {
  args: { side: 'bottom' },
};

export const NoOutsideDismiss: Story = {
  args: { closeOnOutsideClick: false, closeOnEscape: false },
};

/** `size="large"` is the 736px preset (capped at the viewport). */
export const Large: Story = {
  args: { size: 'large' },
};

/** `width`/`height` take a number (px) or any CSS length and win over `size`. */
export const CustomWidth: Story = {
  args: { width: '50vw' },
};

/** `mask=false` drops the backdrop and makes the sheet non-modal: the page stays usable. */
export const NoMask: Story = {
  args: { mask: false, closeOnOutsideClick: false },
};

/** `loading` swaps the body for a skeleton; header, footer and close stay usable. */
export const Loading: Story = {
  args: { loading: true },
};

/**
 * `andesSheetExtra` puts actions at the header's trailing end;
 * `[closeIcon]` swaps the X for a template; `closable=false` removes it.
 */
export const ExtraAndCloseIcon: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <ng-template #chevron>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </ng-template>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <andes-sheet [closeIcon]="chevron" closeLabel="Collapse panel">
          <andes-button variant="primary" andesSheetTrigger>Extra + custom close icon</andes-button>
          <andes-sheet-header>
            <andes-sheet-title>Order #1042</andes-sheet-title>
            <andes-sheet-description>Placed 2 hours ago</andes-sheet-description>
            <andes-button variant="outline" size="sm" andesSheetExtra>Print</andes-button>
          </andes-sheet-header>
          <p style="margin: 0;">3 items · $128.00</p>
          <andes-sheet-footer>
            <andes-button variant="primary" andesSheetClose>Done</andes-button>
          </andes-sheet-footer>
        </andes-sheet>

        <andes-sheet [closable]="false">
          <andes-button variant="outline" andesSheetTrigger>Not closable</andes-button>
          <andes-sheet-header>
            <andes-sheet-title>Confirm details</andes-sheet-title>
            <andes-sheet-description>Only the footer buttons, Escape or the backdrop close this sheet.</andes-sheet-description>
          </andes-sheet-header>
          <andes-sheet-footer>
            <andes-button variant="primary" andesSheetClose>Got it</andes-button>
          </andes-sheet-footer>
        </andes-sheet>
      </div>
    `,
  }),
};

/**
 * `<ng-template andesSheetContent>` renders the body on first open. By default it
 * is kept alive between opens (type in the field, close, reopen: the text is
 * still there); `destroyOnHidden` recreates it on every open.
 */
export const LazyContent: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <andes-sheet>
          <andes-button variant="primary" andesSheetTrigger>Kept alive</andes-button>
          <andes-sheet-header>
            <andes-sheet-title>Kept alive</andes-sheet-title>
            <andes-sheet-description>Type something, close, reopen.</andes-sheet-description>
          </andes-sheet-header>
          <ng-template andesSheetContent>${profileForm.replace('Jane Doe', '')}</ng-template>
        </andes-sheet>

        <andes-sheet destroyOnHidden>
          <andes-button variant="outline" andesSheetTrigger>destroyOnHidden</andes-button>
          <andes-sheet-header>
            <andes-sheet-title>Destroyed on close</andes-sheet-title>
            <andes-sheet-description>Type something, close, reopen: it starts fresh.</andes-sheet-description>
          </andes-sheet-header>
          <ng-template andesSheetContent>${profileForm.replace('Jane Doe', '')}</ng-template>
        </andes-sheet>
      </div>
    `,
  }),
};

/**
 * `push` on the outer sheet moves it aside while a nested sheet is open.
 * `(afterOpenChange)` fires once each slide finishes.
 */
export const NestedPush: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: { log: '' },
    template: `
      <andes-sheet push (afterOpenChange)="log = log + ' · outer ' + ($event ? 'opened' : 'closed')">
        <andes-button variant="primary" andesSheetTrigger>Open multi-level sheet</andes-button>
        <andes-sheet-header>
          <andes-sheet-title>Multi-level sheet</andes-sheet-title>
          <andes-sheet-description>Opening the second level pushes this one aside.</andes-sheet-description>
        </andes-sheet-header>

        <andes-sheet size="320" (afterOpenChange)="log = log + ' · inner ' + ($event ? 'opened' : 'closed')">
          <andes-button variant="outline" andesSheetTrigger>Open second level</andes-button>
          <andes-sheet-header>
            <andes-sheet-title>Second level</andes-sheet-title>
          </andes-sheet-header>
          <p style="margin: 0;">Close me to bring the first level back.</p>
          <andes-sheet-footer>
            <andes-button variant="primary" andesSheetClose>Close</andes-button>
          </andes-sheet-footer>
        </andes-sheet>
      </andes-sheet>
      <p data-testid="after-open-log" style="font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-muted-foreground);">
        afterOpenChange: {{ log || ' —' }}
      </p>
    `,
  }),
};
