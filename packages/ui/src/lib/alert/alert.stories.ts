import type { Meta, StoryObj } from '@storybook/angular';
import { fn } from 'storybook/test';

import { AndesAlert } from './alert';

const meta: Meta<AndesAlert> = {
  title: 'Alert',
  component: AndesAlert,
  tags: ['autodocs'],
  argTypes: {
    severity: {
      control: 'select',
      options: [undefined, 'success', 'info', 'warning', 'danger'],
    },
    closable: { control: 'boolean' },
    showIcon: { control: 'boolean' },
    banner: { control: 'boolean' },
    role: { control: 'select', options: [undefined, 'alert', 'status'] },
    closeLabel: { control: 'text' },
  },
  args: {
    severity: 'info',
    closable: false,
    showIcon: true,
    banner: false,
    closeLabel: 'Close',
    closing: fn(),
    afterClose: fn(),
  },
  render: (args) => ({
    props: args,
    template: `<andes-alert [severity]="severity" [closable]="closable" [showIcon]="showIcon" [banner]="banner" [role]="role" [closeLabel]="closeLabel" (closing)="closing($event)" (afterClose)="afterClose()">
      <span slot="title">Heads up</span>
      This is an alert message with some more detail underneath the title.
    </andes-alert>`,
  }),
};

export default meta;

type Story = StoryObj<AndesAlert>;

export const Success: Story = {
  args: { severity: 'success' },
};

export const Info: Story = {
  args: { severity: 'info' },
};

export const Warning: Story = {
  args: { severity: 'warning' },
};

export const Danger: Story = {
  args: { severity: 'danger' },
};

export const Closable: Story = {
  args: { closable: true },
};

export const WithoutIcon: Story = {
  args: { showIcon: false },
};

export const WithoutTitle: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-alert [severity]="severity" [closable]="closable" [showIcon]="showIcon">
      A description-only alert, with no title slot content projected.
    </andes-alert>`,
  }),
};

export const WithAction: Story = {
  args: { severity: 'warning' },
  render: (args) => ({
    props: args,
    template: `<andes-alert [severity]="severity" [closable]="closable" [showIcon]="showIcon">
      <span slot="title">Your plan expires soon</span>
      Renew before the end of the month to avoid any interruption.
      <button slot="action" type="button" style="all: unset; cursor: pointer; font-weight: 500; text-decoration: underline;">Renew now</button>
    </andes-alert>`,
  }),
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 32rem;">
        <andes-alert severity="success">
          <span slot="title">Success</span>
          Your changes have been saved.
        </andes-alert>
        <andes-alert severity="info">
          <span slot="title">Info</span>
          A new version of the app is available.
        </andes-alert>
        <andes-alert severity="warning">
          <span slot="title">Warning</span>
          Your session will expire in 5 minutes.
        </andes-alert>
        <andes-alert severity="danger">
          <span slot="title">Danger</span>
          Something went wrong while saving your changes.
        </andes-alert>
      </div>
    `,
  }),
};

/**
 * Full-width strip for the top of a page or panel. Same quiet surface as the card - it only
 * drops the radius and the side borders. An unset severity resolves to `warning` in banner
 * mode.
 */
export const Banner: Story = {
  parameters: { layout: 'fullscreen' },
  args: { banner: true, severity: undefined, closable: true },
  render: (args) => ({
    props: args,
    template: `<div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <andes-alert [banner]="banner" [severity]="severity" [closable]="closable" [showIcon]="showIcon" [closeLabel]="closeLabel" (closing)="closing($event)" (afterClose)="afterClose()">
        Scheduled maintenance tonight from 22:00 to 23:00. Saving may be unavailable.
      </andes-alert>
      <andes-alert banner severity="info" title="Read-only mode" description="You are viewing an archived project." />
    </div>`,
  }),
};

/** `icon` takes a template; it still sits in the severity-tinted 1rem slot. */
export const CustomIcon: Story = {
  args: { severity: 'success' },
  render: (args) => ({
    props: args,
    template: `<ng-template #bell>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </ng-template>
      <andes-alert [severity]="severity" [icon]="bell" [closable]="closable">
        <span slot="title">Reminder set</span>
        We'll notify you when the report is ready.
      </andes-alert>`,
  }),
};

/** `closeIcon` swaps the glyph; the button keeps `closeLabel` as its accessible name. */
export const CustomCloseIcon: Story = {
  args: { closable: true, closeLabel: 'Dismiss notice' },
  render: (args) => ({
    props: args,
    template: `<ng-template #minus>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14" /></svg>
      </ng-template>
      <andes-alert [severity]="severity" closable [closeIcon]="minus" [closeLabel]="closeLabel" (closing)="closing($event)" (afterClose)="afterClose()">
        <span slot="title">Heads up</span>
        This alert uses a custom close glyph.
      </andes-alert>`,
  }),
};

/**
 * `title` / `description` accept plain text or a template (which receives the resolved severity
 * as its implicit context); `action` accepts a template. Each wins over its projection slot.
 */
export const ContentInputs: Story = {
  args: { severity: 'danger' },
  render: (args) => ({
    props: args,
    template: `<ng-template #richTitle let-severity>Payment failed <span style="font-weight: 400;">({{ severity }})</span></ng-template>
      <ng-template #richDescription>Your card was declined. <strong>No charge was made.</strong></ng-template>
      <ng-template #retry><button type="button" style="all: unset; cursor: pointer; font-weight: 500; text-decoration: underline;">Try another card</button></ng-template>
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 32rem;">
        <andes-alert severity="info" title="Plain-text title" description="Plain-text description, passed as inputs instead of projected content." />
        <andes-alert [severity]="severity" [title]="richTitle" [description]="richDescription" [action]="retry" />
      </div>`,
  }),
};

/**
 * `closing` fires first (before anything hides) and can be vetoed with `preventDefault()`;
 * the alert then collapses (skipped under prefers-reduced-motion) and `afterClose` fires once
 * it is gone. The first alert here always refuses to close.
 */
export const CloseLifecycle: Story = {
  args: { closable: true },
  render: (args) => ({
    props: {
      ...args,
      log: [] as string[],
      onClosing(
        this: { log: string[]; closing: (e: unknown) => void },
        name: string,
        event: { preventDefault(): void },
        veto: boolean,
      ) {
        if (veto) event.preventDefault();
        this.log = [
          ...this.log,
          `closing: ${name}${veto ? ' (prevented)' : ''}`,
        ];
        this.closing(event);
      },
      onAfterClose(
        this: { log: string[]; afterClose: () => void },
        name: string,
      ) {
        this.log = [...this.log, `afterClose: ${name}`];
        this.afterClose();
      },
    },
    template: `<div style="display: flex; flex-direction: column; gap: 1rem; width: 32rem; max-width: 100%;">
      <andes-alert severity="warning" closable (closing)="onClosing('locked', $event, true)">
        <span slot="title">Can't be dismissed</span>
        closing calls preventDefault(), so this stays.
      </andes-alert>
      <andes-alert severity="info" closable (closing)="onClosing('first', $event, false)" (afterClose)="onAfterClose('first')">
        <span slot="title">First</span>
        Close me and watch the alerts below slide up.
      </andes-alert>
      <andes-alert severity="success" closable (closing)="onClosing('second', $event, false)" (afterClose)="onAfterClose('second')">
        <span slot="title">Second</span>
        Another dismissible alert.
      </andes-alert>
      <ol aria-label="Close event log" style="margin: 0; padding-inline-start: 1.25rem; font-family: var(--andes-font-family), sans-serif; font-size: 0.8125rem; color: var(--andes-color-muted-foreground);">
        @for (entry of log; track $index) { <li>{{ entry }}</li> }
      </ol>
    </div>`,
  }),
};
