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

const profileForm = `
  <div style="display: flex; flex-direction: column; gap: 0.75rem;">
    <label style="${fieldStyle}">
      Name
      <input value="Jane Doe" class="sb-field-input" />
    </label>
    <label style="${fieldStyle}">
      Username
      <input value="@janedoe" class="sb-field-input" />
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
    closePlacement: { control: 'inline-radio', options: ['start', 'end'] },
    closeDisabled: { control: 'boolean' },
    maskBlur: { control: 'boolean' },
    resizable: { control: 'boolean' },
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
    closePlacement: 'end',
    closeDisabled: false,
    maskBlur: false,
    resizable: false,
  },
  render: (args) => ({
    moduleMetadata: { imports },
    props: args,
    template: `${FIELD_STYLES}
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
        [closePlacement]="closePlacement"
        [closeDisabled]="closeDisabled"
        [maskBlur]="maskBlur"
        [resizable]="resizable"
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
 * still there); `forceRender` creates it before the first open instead, and
 * `destroyOnHidden` recreates it on every open.
 */
export const LazyContent: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `${FIELD_STYLES}
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <andes-sheet>
          <andes-button variant="primary" andesSheetTrigger>Kept alive</andes-button>
          <andes-sheet-header>
            <andes-sheet-title>Kept alive</andes-sheet-title>
            <andes-sheet-description>Type something, close, reopen.</andes-sheet-description>
          </andes-sheet-header>
          <ng-template andesSheetContent>${profileForm.replace('Jane Doe', '')}</ng-template>
        </andes-sheet>

        <andes-sheet forceRender>
          <andes-button variant="outline" andesSheetTrigger>forceRender</andes-button>
          <andes-sheet-header>
            <andes-sheet-title>Rendered up front</andes-sheet-title>
            <andes-sheet-description>Created with the page, before the first open, and kept alive.</andes-sheet-description>
          </andes-sheet-header>
          <ng-template andesSheetContent>${profileForm}</ng-template>
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

/** `closePlacement="start"` moves the close button to the header's leading corner. */
export const ClosePlacementStart: Story = {
  args: { closePlacement: 'start' },
};

/** `closeDisabled` keeps the close button visible but inert; Escape and the backdrop still close. */
export const CloseDisabled: Story = {
  args: { closeDisabled: true },
};

/** `maskBlur` blurs the page behind the backdrop. */
export const MaskBlur: Story = {
  args: { maskBlur: true },
};

/**
 * `resizable` adds a handle on the inner edge: drag it, or focus it and use the
 * arrow keys (Shift for larger steps). `maxSize` caps it; `(resizeStart)`,
 * `(resizing)` and `(resizeEnd)` report the size in px.
 */
export const Resizable: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: { last: null },
    template: `
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
        @for (edge of ['right', 'left', 'bottom']; track edge) {
          <andes-sheet [side]="edge" resizable [maxSize]="720" (resizeEnd)="last = $event">
            <andes-button variant="outline" andesSheetTrigger>Resizable ({{ edge }})</andes-button>
            <andes-sheet-header>
              <andes-sheet-title>Order lines</andes-sheet-title>
              <andes-sheet-description>Drag the inner edge to make room for more columns (up to 720px).</andes-sheet-description>
            </andes-sheet-header>
            <p style="margin: 0;">Last size: {{ last ?? '—' }}{{ last ? 'px' : '' }}</p>
          </andes-sheet>
        }
      </div>
    `,
  }),
};
