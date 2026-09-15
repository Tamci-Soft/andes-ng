import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { ANDES_ALERT_DIALOG_IMPORTS, AndesAlertDialog } from './alert-dialog';

/**
 * The trigger is a native `<button>` rather than `<andes-button>`: the overlay
 * primitive puts `aria-haspopup`/`aria-expanded`/`aria-controls` on the element the
 * directive sits on, and those are only valid on an element with an interactive
 * role.
 */
const TRIGGER_STYLES = `
  <style>
    .sb-alert-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 2.25rem;
      padding: 0 var(--andes-space-4);
      border: 1px solid transparent;
      border-radius: var(--andes-radius-md);
      background-color: var(--andes-color-danger);
      color: var(--andes-color-danger-foreground);
      font-family: var(--andes-font-family), sans-serif;
      font-weight: var(--andes-font-weight-medium);
      font-size: 0.875rem;
      cursor: pointer;
    }
    .sb-alert-trigger:hover { background-color: var(--andes-color-danger-hover); }
    .sb-alert-trigger:focus-visible {
      outline: 2px solid var(--andes-color-danger);
      outline-offset: 2px;
    }
  </style>
`;

const meta: Meta<AndesAlertDialog> = {
  title: 'Alert Dialog',
  component: AndesAlertDialog,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    closeOnEscape: { control: 'boolean' },
    lockScroll: { control: 'boolean' },
  },
  args: {
    size: 'md',
    closeOnEscape: true,
    lockScroll: true,
  },
  render: (args) => ({
    moduleMetadata: { imports: [ANDES_ALERT_DIALOG_IMPORTS, AndesButton] },
    props: args,
    template: `
      ${TRIGGER_STYLES}
      <andes-alert-dialog
        [size]="size"
        [closeOnEscape]="closeOnEscape"
        [lockScroll]="lockScroll"
      >
        <button type="button" class="sb-alert-trigger" andesAlertDialogTrigger>
          Delete project
        </button>

        <andes-alert-dialog-content *andesAlertDialogContent>
          <div andesAlertDialogHeader>
            <h2 andesAlertDialogTitle>Delete this project?</h2>
            <p andesAlertDialogDescription>
              This permanently removes the project and everything in it. This
              action cannot be undone.
            </p>
          </div>

          <div andesAlertDialogFooter>
            <andes-button variant="secondary" andesAlertDialogCancel>Cancel</andes-button>
            <andes-button variant="danger" andesAlertDialogAction>Delete project</andes-button>
          </div>
        </andes-alert-dialog-content>
      </andes-alert-dialog>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesAlertDialog>;

/**
 * Clicking the backdrop does nothing - an alert dialog has no outside-click
 * dismissal by design, so the user has to answer it.
 */
export const Default: Story = {};

/** Escape refused as well, for a confirmation with no accidental way out. */
export const EscapeRefused: Story = {
  args: { closeOnEscape: false },
};

export const Small: Story = { args: { size: 'sm' } };

/** Reporting the outcome: `closed` carries why the dialog went away. */
export const ReportsTheOutcome: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [ANDES_ALERT_DIALOG_IMPORTS, AndesButton] },
    props: { ...args, confirmed: false, lastReason: '' },
    template: `
      ${TRIGGER_STYLES}
      <andes-alert-dialog (closed)="lastReason = $event">
        <button type="button" class="sb-alert-trigger" andesAlertDialogTrigger>
          Revoke access
        </button>

        <andes-alert-dialog-content *andesAlertDialogContent>
          <div andesAlertDialogHeader>
            <h2 andesAlertDialogTitle>Revoke access?</h2>
            <p andesAlertDialogDescription>
              The member loses access immediately.
            </p>
          </div>

          <div andesAlertDialogFooter>
            <andes-button variant="secondary" andesAlertDialogCancel>Cancel</andes-button>
            <andes-button
              variant="danger"
              andesAlertDialogAction
              (click)="confirmed = true"
            >
              Revoke
            </andes-button>
          </div>
        </andes-alert-dialog-content>
      </andes-alert-dialog>

      <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem;">
        Confirmed: {{ confirmed }} &middot; last close reason: {{ lastReason || '-' }}
      </p>
    `,
  }),
};
