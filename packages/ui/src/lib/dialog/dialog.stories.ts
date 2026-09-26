import { signal } from '@angular/core';
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
    centered: { control: 'boolean' },
    mask: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  args: {
    size: 'md',
    closeOnEscape: true,
    closeOnOutsideClick: true,
    lockScroll: true,
    centered: true,
    mask: true,
    loading: false,
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
        [centered]="centered"
        [mask]="mask"
        [loading]="loading"
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

const LOG_STYLE =
  'font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground);';

/**
 * `footer="default"` renders Ant's built-in Cancel/OK pair. OK emits `(ok)` and does
 * not close on its own - the handler flips `confirmLoading` around the async work and
 * closes when it is done, exactly like Ant's `onOk` + `confirmLoading`. Cancel, the
 * "x", Escape and a backdrop click all emit `(cancelled)`.
 */
export const BuiltInFooter: Story = {
  render: () => {
    const open = signal(false);
    const saving = signal(false);
    const log = signal<string[]>([]);
    return {
      moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS] },
      props: {
        open,
        saving,
        log,
        push: (entry: string) => log.update((l) => [...l.slice(-5), entry]),
        save() {
          saving.set(true);
          log.update((l) => [...l.slice(-5), 'ok']);
          setTimeout(() => {
            saving.set(false);
            open.set(false);
          }, 1500);
        },
      },
      template: `
        ${TRIGGER_STYLES}
        <andes-dialog
          [(open)]="open"
          footer="default"
          okText="Save changes"
          cancelText="Cancel"
          [confirmLoading]="saving()"
          (ok)="save()"
          (cancelled)="push('cancelled: ' + $event)"
        >
          <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Edit profile</button>

          <andes-dialog-content *andesDialogContent>
            <div andesDialogHeader>
              <h2 andesDialogTitle>Edit profile</h2>
              <p andesDialogDescription>OK spins for 1.5s, then the dialog closes.</p>
            </div>

            <label class="sb-field">
              Name
              <input value="Ada Lovelace" />
            </label>
          </andes-dialog-content>
        </andes-dialog>
        <p style="${LOG_STYLE}">Events: {{ log().join(', ') || '-' }}</p>
      `,
    };
  },
};

/** `okType="danger"` - Ant's `okButtonProps={{ danger: true }}` - with focus on Cancel. */
export const DangerousAction: Story = {
  render: () => ({
    moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS] },
    template: `
      ${TRIGGER_STYLES}
      <andes-dialog
        #dialog
        size="sm"
        footer="default"
        okText="Delete"
        okType="danger"
        autoFocusButton="cancel"
        (ok)="dialog.hide()"
      >
        <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Delete file</button>

        <andes-dialog-content *andesDialogContent>
          <div andesDialogHeader>
            <h2 andesDialogTitle>Delete report.pdf?</h2>
            <p andesDialogDescription>The file moves to the bin for 30 days.</p>
          </div>
        </andes-dialog-content>
      </andes-dialog>
    `,
  }),
};

/**
 * A custom `footer` template keeps the footer box (pinning, stacking) and receives
 * `ok()`/`cancel()` - the Angular counterpart of Ant's footer render function with
 * `{ OkBtn, CancelBtn }`.
 */
export const CustomFooter: Story = {
  render: () => ({
    moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS, AndesButton] },
    props: { lastAction: '' },
    template: `
      ${TRIGGER_STYLES}
      <andes-dialog
        #dialog
        [footer]="footer"
        (ok)="lastAction = 'publish'; dialog.hide()"
        (cancelled)="lastAction = 'cancel'"
      >
        <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Publish post</button>

        <andes-dialog-content *andesDialogContent>
          <div andesDialogHeader>
            <h2 andesDialogTitle>Publish post</h2>
            <p andesDialogDescription>Publish now, or keep it as a draft.</p>
          </div>
        </andes-dialog-content>
      </andes-dialog>

      <ng-template #footer let-ok="ok" let-cancel="cancel">
        <andes-button variant="ghost" (click)="cancel()">Cancel</andes-button>
        <andes-button variant="secondary" (click)="lastAction = 'draft'; dialog.hide()">Save draft</andes-button>
        <andes-button variant="primary" (click)="ok()">Publish</andes-button>
      </ng-template>
      <p style="${LOG_STYLE}">Last action: {{ lastAction || '-' }}</p>
    `,
  }),
};

/**
 * `[centered]="false"` is Ant's default placement: parked near the top so the surface
 * does not jump as its content grows. `width` takes px, any CSS length or a
 * per-breakpoint map - resize the viewport to watch this one step.
 */
export const TopAlignedResponsiveWidth: Story = {
  render: () => ({
    moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS] },
    props: { width: { xs: '100%', md: '80%', lg: 720, xl: 960 } },
    template: `
      ${TRIGGER_STYLES}
      <andes-dialog [centered]="false" [width]="width" footer="default" okText="Done" [showCancel]="false" #dialog (ok)="dialog.hide()">
        <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Open wide dialog</button>

        <andes-dialog-content *andesDialogContent>
          <div andesDialogHeader>
            <h2 andesDialogTitle>Responsive width</h2>
            <p andesDialogDescription>
              100% below 768px, 80% up to 992px, 720px up to 1200px, 960px beyond.
            </p>
          </div>
        </andes-dialog-content>
      </andes-dialog>
    `,
  }),
};

/**
 * `loading` swaps the body for a skeleton (Ant's `loading`): the title stays so the
 * dialog is still labelled, the footer is withheld until there is something to act on.
 */
export const LoadingSkeleton: Story = {
  render: () => {
    const loading = signal(false);
    return {
      moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS] },
      props: {
        loading,
        load() {
          loading.set(true);
          setTimeout(() => loading.set(false), 2000);
        },
      },
      template: `
        ${TRIGGER_STYLES}
        <andes-dialog [loading]="loading()" footer="default" (opened)="load()" #dialog (ok)="dialog.hide()">
          <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Load invoice</button>

          <andes-dialog-content *andesDialogContent>
            <div andesDialogHeader>
              <h2 andesDialogTitle>Invoice #1042</h2>
            </div>
            <p style="margin: 0; font-size: 0.875rem;">
              Issued 3 March, due 2 April. Total: 1,240.00.
            </p>
          </andes-dialog-content>
        </andes-dialog>
      `,
    };
  },
};

/**
 * `[destroyOnClose]="false"` keeps the content alive across a close: type something,
 * close, reopen. The default destroys it, and `forceRender` builds it before the first
 * open.
 */
export const KeepContentAlive: Story = {
  render: () => ({
    moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS] },
    template: `
      ${TRIGGER_STYLES}
      <andes-dialog [destroyOnClose]="false" footer="default" okText="Close" [showCancel]="false" #dialog (ok)="dialog.hide()">
        <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Draft message</button>

        <andes-dialog-content *andesDialogContent>
          <div andesDialogHeader>
            <h2 andesDialogTitle>Draft message</h2>
            <p andesDialogDescription>What you type survives closing the dialog.</p>
          </div>

          <label class="sb-field">
            Message
            <input placeholder="Type, close, reopen" />
          </label>
        </andes-dialog-content>
      </andes-dialog>
    `,
  }),
};

/** `closeIcon` swaps the glyph; the button, its label and hit area stay the component's. */
export const CustomCloseIcon: Story = {
  render: () => ({
    moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS] },
    template: `
      ${TRIGGER_STYLES}
      <andes-dialog [mask]="false">
        <button type="button" class="sb-dialog-trigger" andesDialogTrigger>No mask, custom close</button>

        <andes-dialog-content *andesDialogContent [closeIcon]="icon" closeLabel="Dismiss">
          <div andesDialogHeader>
            <h2 andesDialogTitle>Without a mask</h2>
            <p andesDialogDescription>
              <code>[mask]="false"</code> drops the scrim; focus stays trapped and scroll stays locked.
            </p>
          </div>
        </andes-dialog-content>
      </andes-dialog>

      <ng-template #icon>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="fill: none; stroke: currentcolor; stroke-width: 2; stroke-linecap: round;">
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      </ng-template>
    `,
  }),
};

/** Lifecycle outputs: `opened`, `afterOpenChange` (after the entry transition) and `closed` (Ant's `afterClose`). */
export const LifecycleEvents: Story = {
  render: () => {
    const log = signal<string[]>([]);
    const push = (entry: string) => log.update((l) => [...l.slice(-5), entry]);
    return {
      moduleMetadata: { imports: [ANDES_DIALOG_IMPORTS] },
      props: { log, push },
      template: `
        ${TRIGGER_STYLES}
        <andes-dialog
          footer="default"
          [showCancel]="false"
          #dialog
          (ok)="dialog.hide()"
          (opened)="push('opened')"
          (afterOpenChange)="push('afterOpenChange: ' + $event)"
          (cancelled)="push('cancelled: ' + $event)"
          (closed)="push('closed: ' + $event)"
        >
          <button type="button" class="sb-dialog-trigger" andesDialogTrigger>Open</button>

          <andes-dialog-content *andesDialogContent>
            <div andesDialogHeader>
              <h2 andesDialogTitle>Lifecycle</h2>
              <p andesDialogDescription>Close it any way you like.</p>
            </div>
          </andes-dialog-content>
        </andes-dialog>
        <p style="${LOG_STYLE}">{{ log().join(' -> ') || '-' }}</p>
      `,
    };
  },
};
