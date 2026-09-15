import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { ANDES_DIALOG_IMPORTS, AndesDialog } from './dialog';

/**
 * Buttons inside the stories are `AndesButton` wherever the element is not the
 * trigger. The trigger itself is a native `<button>`: the overlay primitive puts
 * `aria-haspopup`/`aria-expanded`/`aria-controls` on the element the directive sits
 * on, and those attributes are only valid on an element with an interactive role -
 * putting the directive on the `<andes-button>` host wrapper would land them on a
 * roleless element and fail axe's `aria-allowed-attr`.
 */
const TRIGGER_STYLES = `
  <style>
    /* Metrics copied from .andes-button--md rather than invented: 2.25rem/0.875rem was a
       step that does not exist in the button scale, so the trigger read as a button from
       a different system than the AndesButtons it opens. */
    .sb-dialog-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--andes-space-2);
      height: 2.5rem;
      padding: 0 var(--andes-space-4);
      border: 1px solid transparent;
      border-radius: var(--andes-radius-md);
      background-color: var(--andes-color-primary);
      color: var(--andes-color-primary-foreground);
      font-family: var(--andes-font-family), sans-serif;
      font-weight: var(--andes-font-weight-medium);
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .sb-dialog-trigger:hover { background-color: var(--andes-color-primary-hover); }
    .sb-dialog-trigger:focus-visible {
      outline: 2px solid var(--andes-color-focus-ring);
      outline-offset: 2px;
    }
    .sb-field {
      display: flex;
      flex-direction: column;
      gap: var(--andes-space-1);
      font-family: var(--andes-font-family), sans-serif;
      font-size: 0.875rem;
      color: var(--andes-color-foreground);
    }
    .sb-field input {
      height: 2.25rem;
      padding: 0 var(--andes-space-3);
      border: 1px solid var(--andes-color-input);
      border-radius: var(--andes-radius-md);
      background-color: var(--andes-color-background);
      color: var(--andes-color-foreground);
      font: inherit;
    }
    /* The library has no Input component yet, so this demo field is a native input. It
       still needs the design system's focus ring: without one the browser draws its own
       default ring inside the border, which reads as a second, mismatched border. */
    .sb-field input:focus-visible {
      border-color: var(--andes-color-focus-ring);
      outline: 2px solid var(--andes-color-focus-ring);
      outline-offset: 2px;
    }
  </style>
`;

const meta: Meta<AndesDialog> = {
  title: 'Dialog',
  component: AndesDialog,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    closeOnEscape: { control: 'boolean' },
    closeOnOutsideClick: { control: 'boolean' },
    lockScroll: { control: 'boolean' },
  },
  args: {
    size: 'md',
    closeOnEscape: true,
    closeOnOutsideClick: true,
    lockScroll: true,
  },
  render: (args) => ({
    moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS, AndesButton] },
    props: args,
    template: `
      ${TRIGGER_STYLES}
      <andes-dialog
        [size]="size"
        [closeOnEscape]="closeOnEscape"
        [closeOnOutsideClick]="closeOnOutsideClick"
        [lockScroll]="lockScroll"
      >
        <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Edit profile</button>

        <andes-dialog-content *andesDialogContent>
          <div andesDialogHeader>
            <h2 andesDialogTitle>Edit profile</h2>
            <p andesDialogDescription>
              Make changes to your profile here. Click save when you are done.
            </p>
          </div>

          <label class="sb-field">
            Name
            <input value="Ada Lovelace" />
          </label>

          <div andesDialogFooter>
            <andes-button variant="secondary" andesDialogClose>Cancel</andes-button>
            <andes-button variant="primary" andesDialogClose>Save changes</andes-button>
          </div>
        </andes-dialog-content>
      </andes-dialog>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesDialog>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

/** `showCloseButton` drops the built-in "x", for a dialog that must be answered. */
export const WithoutCloseButton: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS, AndesButton] },
    props: args,
    template: `
      ${TRIGGER_STYLES}
      <andes-dialog [size]="size">
        <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Terms of service</button>

        <andes-dialog-content *andesDialogContent [showCloseButton]="false">
          <div andesDialogHeader>
            <h2 andesDialogTitle>Terms of service</h2>
            <p andesDialogDescription>Please accept the terms to continue.</p>
          </div>

          <div andesDialogFooter>
            <andes-button variant="secondary" andesDialogClose>Decline</andes-button>
            <andes-button variant="primary" andesDialogClose>Accept</andes-button>
          </div>
        </andes-dialog-content>
      </andes-dialog>
    `,
  }),
};

/** Neither Escape nor an outside click dismisses this one - only its own actions do. */
export const NotDismissible: Story = {
  args: { closeOnEscape: false, closeOnOutsideClick: false },
};

/** Driving `[(open)]` from outside, with no trigger of its own inside the dialog. */
export const ControlledOpenState: Story = {
  render: () => ({
    moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS, AndesButton] },
    props: { open: false },
    template: `
      ${TRIGGER_STYLES}
      <button type="button" class="sb-dialog-trigger" (click)="open = true">Open from outside</button>

      <andes-dialog [(open)]="open">
        <andes-dialog-content *andesDialogContent>
          <div andesDialogHeader>
            <h2 andesDialogTitle>Controlled dialog</h2>
            <p andesDialogDescription>
              Open state lives in the host component, not in the dialog.
            </p>
          </div>

          <div andesDialogFooter>
            <andes-button variant="primary" andesDialogClose>Done</andes-button>
          </div>
        </andes-dialog-content>
      </andes-dialog>
    `,
  }),
};

/** A long body scrolls inside the surface while the page behind stays locked. */
export const ScrollingContent: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS, AndesButton] },
    props: { ...args, paragraphs: Array.from({ length: 14 }, (_, i) => i + 1) },
    template: `
      ${TRIGGER_STYLES}
      <andes-dialog>
        <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Release notes</button>

        <andes-dialog-content *andesDialogContent>
          <div andesDialogHeader>
            <h2 andesDialogTitle>Release notes</h2>
            <p andesDialogDescription>Everything that changed in this version.</p>
          </div>

          @for (paragraph of paragraphs; track paragraph) {
            <p style="margin: 0; font-size: 0.875rem;">
              Section {{ paragraph }} - the surface scrolls, the page behind it does not.
            </p>
          }

          <div andesDialogFooter>
            <andes-button variant="primary" andesDialogClose>Close</andes-button>
          </div>
        </andes-dialog-content>
      </andes-dialog>
    `,
  }),
};
