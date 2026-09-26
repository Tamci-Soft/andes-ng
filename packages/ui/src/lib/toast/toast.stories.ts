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
  'display: flex; gap: 0.75rem; flex-wrap: wrap; padding: 2rem; font-family: system-ui, sans-serif;';
const NOTE_STYLE =
  'padding: 0 2rem; font-family: system-ui, sans-serif; color: #64748b;';

/**
 * Demo host: `AndesToastService`/`AndesToastViewport` are an imperative API with no visual
 * story of their own, so this wrapper provides trigger buttons the way a consuming app would.
 */
@Component({
  selector: 'andes-toast-story',
  imports: [AndesToastViewport],
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
      <button type="button" (click)="showWithAction()">With action</button>
      <button type="button" (click)="showPersistent()">
        Persistent (no auto-dismiss)
      </button>
      <button type="button" (click)="fireMany()">
        Fire 8 toasts (max 3 visible)
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

/** Ant's `message`: compact, single-line, top-center, typed icons, `loading` -> `success`. */
@Component({
  selector: 'andes-message-story',
  imports: [AndesToastViewport],
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
 * progress bar, pauseOnHover opt-out, custom icon/close icon, per-toast placement.
 */
@Component({
  selector: 'andes-notification-story',
  imports: [AndesToastViewport],
  template: `
    <div [style]="barStyle">
      <button type="button" (click)="saveWithLoading()">
        Loading, then success (key update)
      </button>
      <button type="button" (click)="withActions()">Actions group</button>
      <button type="button" (click)="withProgress()">Progress bar</button>
      <button type="button" (click)="noHoverPause()">
        Progress, no pause on hover
      </button>
      <button type="button" (click)="clickable()">Clickable body</button>
      <button type="button" (click)="customIcons()">
        Custom icon + close icon
      </button>
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
          showProgress: true,
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

  protected withProgress(): void {
    this.toasts.warning('Hover to pause the countdown.', {
      title: 'Storage almost full',
      duration: 8000,
      showProgress: true,
    });
  }

  protected noHoverPause(): void {
    this.toasts.info('This one keeps counting down while hovered.', {
      title: 'pauseOnHover: false',
      duration: 6000,
      showProgress: true,
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

  protected at(placement: AndesToastPosition): void {
    this.toasts.info(`Placed at ${placement}.`, {
      title: 'Placement',
      placement,
    });
  }
}

/** Collapsed stack (Ant's `stack`), expanded while hovered/focused. */
@Component({
  selector: 'andes-stack-story',
  imports: [AndesToastViewport],
  template: `
    <div [style]="barStyle">
      <button type="button" (click)="fire()">Fire 5 notifications</button>
      <button type="button" (click)="toasts.destroy()">Destroy all</button>
    </div>
    <p [style]="noteStyle">
      More than 3 open notifications collapse into a stack; hover or Tab into it
      to expand.
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

export const TopLeft: Story = {
  args: { position: 'top-left' },
};

export const TopCenter: Story = {
  args: { position: 'top-center' },
};

export const BottomCenter: Story = {
  args: { position: 'bottom-center' },
};

/** `AndesMessageService` - Ant Design's `message`. */
export const Messages: Story = {
  render: () => ({
    moduleMetadata: { imports: [MessageStoryHost] },
    template: `<andes-message-story />`,
  }),
};

/** `AndesToastService` - Ant Design's `notification` feature set. */
export const Notifications: Story = {
  render: () => ({
    moduleMetadata: { imports: [NotificationStoryHost] },
    template: `<andes-notification-story />`,
  }),
};

/** `stack: true` via `provideAndesToastConfig()` - the app-wide config entry point. */
export const Stacked: Story = {
  decorators: [
    applicationConfig({
      providers: [
        provideAndesToastConfig({ stack: true, placement: 'top-right' }),
      ],
    }),
  ],
  render: () => ({
    moduleMetadata: { imports: [StackStoryHost] },
    template: `<andes-stack-story />`,
  }),
};
