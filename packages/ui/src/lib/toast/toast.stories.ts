import {
  Component,
  inject,
  input,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import { AndesMessageService } from './message.service';
import { provideAndesToastConfig } from './toast.config';
import { AndesToastService } from './toast.service';
import type {
  AndesToastPosition,
  AndesToastTemplateContext,
} from './toast.types';
import { AndesToastViewport } from './toast-viewport';

const BAR_STYLE =
  'display: flex; gap: 0.75rem; flex-wrap: wrap; padding: 2rem; font-family: var(--andes-font-family), sans-serif;';
const NOTE_STYLE =
  'padding: 0 2rem; font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-muted-foreground);';

/**
 * The demo triggers are plain `<button>`s, which take the UA's own font rather than
 * inheriting the bar's - point them at the library font too.
 */
const DEMO_STYLES =
  'button { font-family: var(--andes-font-family), sans-serif; }';

/**
 * Demo host: `AndesToastService`/`AndesToastViewport` are an imperative API with no visual
 * story of their own, so this wrapper provides trigger buttons the way a consuming app would.
 */
@Component({
  selector: 'andes-toast-story',
  imports: [AndesToastViewport],
  styles: DEMO_STYLES,
  template: `
    <div [style]="barStyle">
      <button
        type="button"
        (click)="toastService.success('Changes saved successfully.')"
      >
        Success
      </button>
      <button
        type="button"
        (click)="toastService.error('Could not save your changes.')"
      >
        Error
      </button>
      <button
        type="button"
        (click)="toastService.warning('Your session will expire in 5 minutes.')"
      >
        Warning
      </button>
      <button
        type="button"
        (click)="toastService.info('A new version is available.')"
      >
        Info
      </button>
      <button type="button" (click)="showWithDescription()">
        With description
      </button>
      <button type="button" (click)="toastService.loading('Loading data')">
        Loading
      </button>
      <button type="button" (click)="showPromise()">Promise</button>
      <button type="button" (click)="showWithAction()">With action</button>
      <button type="button" (click)="showPersistent()">
        Persistent (no auto-dismiss)
      </button>
      <button type="button" (click)="fireMany()">
        Fire 8 toasts (max 3 open, rest queued)
      </button>
      <button type="button" (click)="toastService.dismissAll()">
        Dismiss all
      </button>
    </div>
    <p [style]="noteStyle">Queued: {{ toastService.queuedCount() }}</p>
    <andes-toast-viewport [position]="position()" />
  `,
})
class ToastStoryHost {
  protected readonly toastService = inject(AndesToastService);
  protected readonly barStyle = BAR_STYLE;
  protected readonly noteStyle = NOTE_STYLE;

  readonly position = input<AndesToastPosition>('bottom-right');

  protected showWithDescription(): void {
    this.toastService.show({
      title: 'Event has been created',
      message: 'Sunday, December 03, 2023 at 9:00 AM',
    });
  }

  protected showPromise(): void {
    this.toastService.promise(
      new Promise<{ name: string }>((resolve) =>
        setTimeout(() => resolve({ name: 'Andes' }), 2000),
      ),
      {
        loading: 'Loading...',
        success: (data) => `${data.name} toast has been added`,
        error: 'Error',
      },
    );
  }

  protected showWithAction(): void {
    this.toastService.show({
      title: 'Item deleted',
      message: 'The item was moved to trash.',
      action: { label: 'Undo', onClick: () => alert('Undo clicked') },
    });
  }

  protected showPersistent(): void {
    this.toastService.show({
      message: 'This toast stays until you close it.',
      duration: false,
    });
  }

  protected fireMany(): void {
    this.toastService.configureMaxVisible(3);
    for (let i = 1; i <= 8; i++) {
      this.toastService.info(`Notification ${i}`);
    }
  }
}

/**
 * The everyday set side by side: a titled toast with an action, each severity, a
 * loading -> success update by key, and a confirm/cancel pair - plus switches for the tinted
 * style and the always-expanded list.
 */
@Component({
  selector: 'andes-toast-gallery-story',
  imports: [AndesToastViewport],
  styles: DEMO_STYLES,
  template: `
    <div [style]="barStyle">
      <button type="button" (click)="showDefault()">Default</button>
      <button type="button" (click)="toasts.success('Event has been created')">
        Success
      </button>
      <button
        type="button"
        (click)="toasts.info('Be at the area 10 minutes before the event time')"
      >
        Info
      </button>
      <button
        type="button"
        (click)="toasts.warning('Event start time cannot be earlier than 8am')"
      >
        Warning
      </button>
      <button
        type="button"
        (click)="toasts.error('Event has not been created')"
      >
        Error
      </button>
      <button type="button" (click)="showLoading()">Loading, then done</button>
      <button type="button" (click)="showConfirm()">Action + cancel</button>
      <button type="button" (click)="showMessage()">Message</button>
    </div>
    <div [style]="barStyle">
      <label
        ><input
          type="checkbox"
          [checked]="richColors()"
          (change)="setRichColors($any($event.target).checked)"
        />
        Rich colors</label
      >
      <label
        ><input
          type="checkbox"
          [checked]="expanded()"
          (change)="setExpanded($any($event.target).checked)"
        />
        Always expanded (stack: false)</label
      >
      <button type="button" (click)="destroyAll()">Destroy all</button>
    </div>
    <p [style]="noteStyle">
      Hover the stack to expand it and pause every countdown; drag a toast
      towards its corner to dismiss it. {{ status() }}
    </p>
    <andes-toast-viewport />
  `,
})
class GalleryStoryHost {
  protected readonly toasts = inject(AndesToastService);
  protected readonly messages = inject(AndesMessageService);
  protected readonly barStyle = `${BAR_STYLE} align-items: center; font-size: 0.875rem;`;
  protected readonly noteStyle = NOTE_STYLE;
  protected readonly status = signal('');
  protected readonly richColors = signal(false);
  protected readonly expanded = signal(false);

  protected showDefault(): void {
    this.toasts.show({
      title: 'Event has been created',
      message: 'Sunday, December 03, 2023 at 9:00 AM',
      action: { label: 'Undo', onClick: () => this.status.set('Undo.') },
    });
  }

  protected showLoading(): void {
    const ref = this.toasts.loading('Loading...', {
      duration: false,
      dismissible: false,
    });
    setTimeout(
      () =>
        ref.update({
          message: 'Event has been created',
          severity: 'success',
          duration: 4000,
          dismissible: true,
        }),
      2000,
    );
  }

  protected showConfirm(): void {
    const ref = this.toasts.show({
      title: 'Delete 3 files?',
      message: 'They will be moved to the trash.',
      duration: false,
      cancel: { label: 'Cancel', onClick: () => this.status.set('Kept.') },
      action: { label: 'Delete', onClick: () => this.status.set('Deleted.') },
    });
    void ref.afterClosed.then((reason) =>
      this.status.update((current) => `${current} (closed: ${reason})`),
    );
  }

  protected showMessage(): void {
    this.messages.success('Copied to clipboard');
  }

  protected setRichColors(on: boolean): void {
    this.richColors.set(on);
    this.toasts.config({ richColors: on });
    this.messages.config({ richColors: on });
  }

  protected setExpanded(on: boolean): void {
    this.expanded.set(on);
    this.toasts.config({ stack: !on });
  }

  protected destroyAll(): void {
    this.toasts.destroy();
    this.messages.destroy();
  }
}

/** Messages: compact, single-line, top-center, typed icons, `loading` -> `success`. */
@Component({
  selector: 'andes-message-story',
  imports: [AndesToastViewport],
  styles: DEMO_STYLES,
  template: `
    <div [style]="barStyle">
      <button type="button" (click)="messages.success('Saved')">Success</button>
      <button type="button" (click)="messages.error('Upload failed')">
        Error
      </button>
      <button type="button" (click)="messages.warning('Low disk space')">
        Warning
      </button>
      <button type="button" (click)="messages.info('Copied to clipboard')">
        Info
      </button>
      <button type="button" (click)="loadThenSucceed()">
        Loading, then success (key update)
      </button>
      <button type="button" (click)="promiseMessage()">Promise</button>
      <button type="button" (click)="messages.destroy()">Destroy all</button>
    </div>
    <p [style]="noteStyle">{{ status() }}</p>
    <andes-toast-viewport />
  `,
})
class MessageStoryHost {
  protected readonly messages = inject(AndesMessageService);
  protected readonly barStyle = BAR_STYLE;
  protected readonly noteStyle = NOTE_STYLE;
  protected readonly status = signal('');

  protected promiseMessage(): void {
    this.messages.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: 'Publishing...',
      success: 'Published',
      error: 'Failed',
    });
  }

  protected loadThenSucceed(): void {
    this.messages.loading('Uploading report.pdf...', {
      key: 'upload',
      duration: false,
    });
    setTimeout(() => {
      const ref = this.messages.success('Uploaded report.pdf', {
        key: 'upload',
      });
      void ref.afterClosed.then((reason) => {
        this.status.set(`Last message closed (${reason}).`);
      });
    }, 1500);
  }
}

/**
 * Rich notifications: title + message, loading -> success by key, actions group, onClick,
 * pauseOnHover opt-out, custom icon/close icon, per-toast placement.
 */
@Component({
  selector: 'andes-notification-story',
  imports: [AndesToastViewport],
  styles: DEMO_STYLES,
  template: `
    <div [style]="barStyle">
      <button type="button" (click)="saveWithLoading()">
        Loading, then success (key update)
      </button>
      <button type="button" (click)="withActions()">Actions group</button>
      <button type="button" (click)="countdown()">Pause on hover</button>
      <button type="button" (click)="noHoverPause()">No pause on hover</button>
      <button type="button" (click)="clickable()">Clickable body</button>
      <button type="button" (click)="customIcons()">
        Custom icon + close icon
      </button>
      <button type="button" (click)="longContent()">Long content</button>
      <button type="button" (click)="toasts.destroy()">Destroy all</button>
    </div>
    <div [style]="barStyle">
      @for (placement of placements; track placement) {
        <button type="button" (click)="at(placement)">{{ placement }}</button>
      }
    </div>
    <p [style]="noteStyle">{{ status() }}</p>
    <ng-template #rocket>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7c3aed"
        stroke-width="2"
      >
        <path d="m12 2 3 7h7l-5.5 4.5 2 7.5-6.5-4.5L5.5 21l2-7.5L2 9h7z" />
      </svg>
    </ng-template>
    <ng-template #closeGlyph
      ><span style="font-size: 0.75rem; font-weight: 600"
        >ESC</span
      ></ng-template
    >
    <andes-toast-viewport />
  `,
})
class NotificationStoryHost {
  protected readonly toasts = inject(AndesToastService);
  protected readonly barStyle = BAR_STYLE;
  protected readonly noteStyle = NOTE_STYLE;
  protected readonly placements: readonly AndesToastPosition[] = [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ];
  protected readonly status = signal('');
  private readonly rocket =
    viewChild.required<TemplateRef<AndesToastTemplateContext>>('rocket');
  private readonly closeGlyph =
    viewChild.required<TemplateRef<AndesToastTemplateContext>>('closeGlyph');

  constructor() {
    // Room for one toast per placement in the placement demo.
    this.toasts.config({ maxCount: 6 });
  }

  protected saveWithLoading(): void {
    this.toasts.loading('Your changes are being saved.', {
      key: 'save',
      title: 'Saving',
      duration: false,
      dismissible: false,
    });
    setTimeout(
      () =>
        this.toasts.success('All changes were saved.', {
          key: 'save',
          title: 'Saved',
        }),
      1500,
    );
  }

  protected withActions(): void {
    this.toasts.info('Restart the app to apply version 2.4.', {
      title: 'Update available',
      duration: false,
      actions: [
        { label: 'Later', onClick: () => this.status.set('Later clicked') },
        {
          label: 'Restart now',
          onClick: () => this.status.set('Restart clicked'),
        },
      ],
      onClose: (reason) =>
        this.status.update((current) => `${current} - closed (${reason})`),
    });
  }

  protected countdown(): void {
    this.toasts.warning('Hover to pause the countdown.', {
      title: 'Storage almost full',
      duration: 8000,
    });
  }

  protected noHoverPause(): void {
    this.toasts.info('This one keeps counting down while hovered.', {
      title: 'pauseOnHover: false',
      duration: 6000,
      pauseOnHover: false,
    });
  }

  protected clickable(): void {
    this.toasts.show({
      title: 'New comment',
      message: 'Click anywhere on this notification to open it.',
      onClick: (ref) => {
        this.status.set(`Notification ${ref.id} clicked`);
        ref.close();
      },
    });
  }

  protected customIcons(): void {
    this.toasts.show({
      title: 'Deployed',
      message: 'Custom icon and close glyph via TemplateRef.',
      icon: this.rocket(),
      closeIcon: this.closeGlyph(),
    });
  }

  protected longContent(): void {
    this.toasts.error(
      'The invoice batch could not be posted because 3 lines reference a cost centre that was closed on 30/09: INV-2024-000118, INV-2024-000124 and INV-2024-000131.',
      {
        title: 'Posting failed for the September invoice batch',
        duration: false,
        action: { label: 'Review', onClick: () => this.status.set('Review') },
      },
    );
  }

  protected at(placement: AndesToastPosition): void {
    this.toasts.info(`Placed at ${placement}.`, {
      title: 'Placement',
      placement,
    });
  }
}

/** Collapsed stack (`stack`), expanded while hovered/focused. */
@Component({
  selector: 'andes-stack-story',
  imports: [AndesToastViewport],
  styles: DEMO_STYLES,
  template: `
    <div [style]="barStyle">
      <button type="button" (click)="fire()">Fire 5 notifications</button>
      <button type="button" (click)="toasts.destroy()">Destroy all</button>
    </div>
    <p [style]="noteStyle">
      Open notifications collapse into a deck (three cards visible); hover or
      Tab into it to expand.
    </p>
    <andes-toast-viewport />
  `,
})
class StackStoryHost {
  protected readonly toasts = inject(AndesToastService);
  protected readonly barStyle = BAR_STYLE;
  protected readonly noteStyle = NOTE_STYLE;
  private count = 0;

  protected fire(): void {
    for (let i = 0; i < 5; i++) {
      this.count++;
      this.toasts.info(`Build #${this.count} finished.`, {
        title: `Build ${this.count}`,
        duration: false,
      });
    }
  }
}

/**
 * Opens a fixed set of persistent toasts on load - a still frame of the deck (collapsed until
 * hovered) for visual review, in whichever theme/placement the story picks.
 */
@Component({
  selector: 'andes-toast-gallery-story',
  imports: [AndesToastViewport],
  template: `
    <p [style]="noteStyle">
      Hover the deck to expand it; drag a toast sideways to swipe it away.
    </p>
    <andes-toast-viewport [position]="position()" />
  `,
})
class ToastGalleryStoryHost {
  private readonly toasts = inject(AndesToastService);
  protected readonly noteStyle = NOTE_STYLE;
  readonly position = input<AndesToastPosition>('bottom-right');

  constructor() {
    this.toasts.destroy();
    this.toasts.success('Event has been created', { duration: false });
    this.toasts.error('Event has not been created', { duration: false });
    this.toasts.show({
      title: 'Event has been created',
      message: 'Sunday, December 03, 2023 at 9:00 AM',
      action: { label: 'Undo', onClick: () => undefined },
      duration: false,
    });
  }
}

/**
 * Rich content and root customization: title/message templates (the plain strings stay the
 * screen-reader announcement), a message `contentTemplate`, inline `style`, `data-*`
 * `attributes`, and `closeIcon: null`.
 */
@Component({
  selector: 'andes-rich-toast-story',
  imports: [AndesToastViewport],
  styles: DEMO_STYLES,
  template: `
    <div [style]="barStyle">
      <button type="button" (click)="richNotification()">
        Template title + message
      </button>
      <button type="button" (click)="richMessage()">Template message</button>
      <button type="button" (click)="wide()">Inline style (wide)</button>
      <button type="button" (click)="noClose()">closeIcon: null</button>
      <button type="button" (click)="destroyAll()">Destroy all</button>
    </div>
    <p [style]="noteStyle">{{ status() }}</p>
    <ng-template #exportTitle let-toast>
      {{ toast.title }}
      <span [style]="badgeStyle">XLSX</span>
    </ng-template>
    <ng-template #exportBody>
      <span>
        <strong>1,284 rows</strong> exported to
        <a href="#" [style]="linkStyle" (click)="$event.preventDefault()"
          >ledger-2024-09.xlsx</a
        >.
      </span>
    </ng-template>
    <ng-template #copiedBody>
      <span>Copied <code [style]="codeStyle">INV-2024-000118</code></span>
    </ng-template>
    <andes-toast-viewport />
  `,
})
class RichToastStoryHost {
  protected readonly toasts = inject(AndesToastService);
  protected readonly messages = inject(AndesMessageService);
  protected readonly barStyle = BAR_STYLE;
  protected readonly noteStyle = NOTE_STYLE;
  protected readonly badgeStyle =
    'margin-inline-start: 0.375rem; padding: 0 0.375rem; border-radius: var(--andes-radius-sm); background: var(--andes-color-muted); color: var(--andes-color-muted-foreground); font-size: 0.75rem; font-weight: 400; line-height: 1rem; display: inline-block; vertical-align: 0.0625rem;';
  protected readonly linkStyle = 'color: var(--andes-color-primary-text);';
  protected readonly codeStyle =
    'font-family: ui-monospace, monospace; font-size: 0.8125rem;';
  protected readonly status = signal('');
  private readonly exportTitle =
    viewChild.required<TemplateRef<AndesToastTemplateContext>>('exportTitle');
  private readonly exportBody =
    viewChild.required<TemplateRef<AndesToastTemplateContext>>('exportBody');
  private readonly copiedBody =
    viewChild.required<TemplateRef<AndesToastTemplateContext>>('copiedBody');

  protected richNotification(): void {
    this.toasts.success('1,284 rows exported to ledger-2024-09.xlsx.', {
      title: 'Export ready',
      titleTemplate: this.exportTitle(),
      messageTemplate: this.exportBody(),
      attributes: { 'data-testid': 'export-toast' },
      duration: 8000,
    });
  }

  protected richMessage(): void {
    this.messages.open({
      type: 'success',
      content: 'Copied INV-2024-000118',
      contentTemplate: this.copiedBody(),
    });
  }

  protected wide(): void {
    this.toasts.info('This notification is wider via the style option.', {
      title: 'Inline style',
      style: { width: '30rem', maxWidth: 'calc(100vw - 2rem)' },
    });
  }

  protected noClose(): void {
    const ref = this.toasts.warning('No close button - closes in 4s.', {
      title: 'closeIcon: null',
      closeIcon: null,
      duration: 4000,
    });
    void ref.afterClosed.then((reason) =>
      this.status.set(`Closed (${reason}).`),
    );
  }

  protected destroyAll(): void {
    this.toasts.destroy();
    this.messages.destroy();
  }
}

/** Right-to-left content via the `rtl` option, for both flavors. */
@Component({
  selector: 'andes-rtl-toast-story',
  imports: [AndesToastViewport],
  styles: DEMO_STYLES,
  template: `
    <div [style]="barStyle">
      <button type="button" (click)="notify()">Notification</button>
      <button type="button" (click)="message()">Message</button>
    </div>
    <andes-toast-viewport />
  `,
})
class RtlToastStoryHost {
  protected readonly toasts = inject(AndesToastService);
  protected readonly messages = inject(AndesMessageService);
  protected readonly barStyle = BAR_STYLE;

  constructor() {
    this.messages.config({ rtl: true });
  }

  protected notify(): void {
    this.toasts.success('تم حفظ التغييرات بنجاح.', {
      title: 'تم الحفظ',
      duration: 8000,
      action: { label: 'تراجع', onClick: () => undefined },
    });
  }

  protected message(): void {
    this.messages.info('تم النسخ إلى الحافظة');
  }
}

const meta: Meta<ToastStoryHost> = {
  title: 'Toast',
  component: ToastStoryHost,
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: [
        'top-left',
        'top-center',
        'top-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ],
    },
  },
  args: {
    position: 'bottom-right',
  },
  render: (args) => ({
    props: args,
    template: `<andes-toast-story [position]="position" />`,
  }),
};

export default meta;

type Story = StoryObj<ToastStoryHost>;

export const Playground: Story = {};

/** The everyday set side by side, with switches for rich colors and the expanded list. */
export const Gallery: Story = {
  render: () => ({
    moduleMetadata: { imports: [GalleryStoryHost] },
    template: `<andes-toast-gallery-story />`,
  }),
};

export const TopLeft: Story = {
  args: { position: 'top-left' },
};

export const TopCenter: Story = {
  args: { position: 'top-center' },
};

export const BottomCenter: Story = {
  args: { position: 'bottom-center' },
};

/** `AndesMessageService` - compact single-line status messages. */
export const Messages: Story = {
  render: () => ({
    moduleMetadata: { imports: [MessageStoryHost] },
    template: `<andes-message-story />`,
  }),
};

/** `AndesToastService` - the full notification feature set. */
export const Notifications: Story = {
  render: () => ({
    moduleMetadata: { imports: [NotificationStoryHost] },
    template: `<andes-notification-story />`,
  }),
};

/** `stack` and `visibleToasts` via `provideAndesToastConfig()` - the app-wide config entry point. */
export const Stacked: Story = {
  decorators: [
    applicationConfig({
      providers: [
        provideAndesToastConfig({
          stack: true,
          visibleToasts: 3,
          placement: 'top-right',
        }),
      ],
    }),
  ],
  render: () => ({
    moduleMetadata: { imports: [StackStoryHost] },
    template: `<andes-stack-story />`,
  }),
};

/** A still deck of three persistent toasts - collapsed until hovered or focused. */
export const Deck: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports: [ToastGalleryStoryHost] },
    template: `<andes-toast-gallery-story [position]="position" />`,
  }),
};

/** `richColors: true` - the whole card takes a soft tint of its status color. */
export const RichColors: Story = {
  decorators: [
    applicationConfig({
      providers: [provideAndesToastConfig({ richColors: true })],
    }),
  ],
};

/** Template content, inline `style`, `attributes` and `closeIcon: null`. */
export const RichContent: Story = {
  render: () => ({
    moduleMetadata: { imports: [RichToastStoryHost] },
    template: `<andes-rich-toast-story />`,
  }),
};

/** `rtl: true` via `provideAndesToastConfig()` (notifications) and `config()` (messages). */
export const RightToLeft: Story = {
  decorators: [
    applicationConfig({
      providers: [provideAndesToastConfig({ rtl: true })],
    }),
  ],
  render: () => ({
    moduleMetadata: { imports: [RtlToastStoryHost] },
    template: `<andes-rtl-toast-story />`,
  }),
};
