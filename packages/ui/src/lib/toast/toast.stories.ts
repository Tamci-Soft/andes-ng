import { Component, inject, input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesToastService } from './toast.service';
import type { AndesToastPosition } from './toast.types';
import { AndesToastViewport } from './toast-viewport';

/**
 * Demo host: `AndesToastService`/`AndesToastViewport` are an imperative API with no visual
 * story of their own, so this wrapper provides trigger buttons the way a consuming app would.
 */
@Component({
  selector: 'andes-toast-story',
  imports: [AndesToastViewport],
  template: `
    <div
      style="display: flex; gap: 0.75rem; flex-wrap: wrap; padding: 2rem; font-family: system-ui, sans-serif;"
    >
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
    <p
      style="padding: 0 2rem; font-family: system-ui, sans-serif; color: #64748b;"
    >
      Queued: {{ toastService.queuedCount() }}
    </p>
    <andes-toast-viewport [position]="position()" />
  `,
})
class ToastStoryHost {
  protected readonly toastService = inject(AndesToastService);

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
