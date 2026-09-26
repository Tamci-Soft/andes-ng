import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import {
  type AndesDialogMethodKind,
  AndesDialogService,
} from './dialog.service';

/**
 * Demo host for the imperative API. The service needs an injection context, so the
 * stories drive it from a small component rather than from a template alone.
 */
@Component({
  selector: 'andes-dialog-service-demo',
  imports: [AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sb-demo">
      <div class="sb-demo__row">
        <andes-button variant="danger" (click)="confirmDelete()"
          >confirm (async OK)</andes-button
        >
        @for (kind of kinds; track kind) {
          <andes-button variant="outline" (click)="acknowledge(kind)">{{
            kind
          }}</andes-button>
        }
      </div>
      <div class="sb-demo__row">
        <andes-button variant="secondary" (click)="countdown()"
          >update() countdown</andes-button
        >
        <andes-button variant="secondary" (click)="rich()"
          >template content</andes-button
        >
        <andes-button variant="secondary" (click)="failing()"
          >rejecting onOk</andes-button
        >
      </div>
      <p class="sb-demo__log">Last result: {{ last() }}</p>
    </div>

    <ng-template #richContent>
      <ul style="margin: 0; padding-inline-start: 1.25rem;">
        <li>3 files changed</li>
        <li>1 reviewer requested</li>
      </ul>
    </ng-template>
  `,
  styles: `
    .sb-demo {
      display: flex;
      flex-direction: column;
      gap: var(--andes-space-3);
      font-family: var(--andes-font-family), sans-serif;
    }
    .sb-demo__row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--andes-space-2);
    }
    .sb-demo__log {
      margin: 0;
      font-size: 0.875rem;
      color: var(--andes-color-foreground);
    }
  `,
})
class DialogServiceDemo {
  private readonly dialogs = inject(AndesDialogService);
  private readonly richContent =
    viewChild.required<TemplateRef<unknown>>('richContent');

  protected readonly kinds: AndesDialogMethodKind[] = [
    'info',
    'success',
    'warning',
    'error',
  ];
  protected readonly last = signal('-');

  protected async confirmDelete(): Promise<void> {
    const ref = this.dialogs.confirm({
      title: 'Delete this project?',
      content: 'OK spins for 1.5s while the deletion runs, then closes.',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => new Promise((resolve) => setTimeout(resolve, 1500)),
    });
    this.last.set(`confirm -> ${await ref.result}`);
  }

  protected async acknowledge(kind: AndesDialogMethodKind): Promise<void> {
    const ref = this.dialogs[kind]({
      title: `This is a ${kind} message`,
      content: 'Some descriptive text about what just happened.',
    });
    this.last.set(`${kind} -> ${await ref.result}`);
  }

  protected countdown(): void {
    let seconds = 5;
    const ref = this.dialogs.success({
      title: 'Saved',
      content: `This dialog closes in ${seconds} seconds.`,
    });
    const timer = setInterval(() => {
      seconds -= 1;
      ref.update({ content: `This dialog closes in ${seconds} seconds.` });
      if (seconds <= 0) {
        clearInterval(timer);
        ref.destroy();
      }
    }, 1000);
    void ref.result.then(() => clearInterval(timer));
  }

  protected rich(): void {
    this.dialogs.info({
      title: 'Pull request summary',
      content: this.richContent() as TemplateRef<never>,
      closable: true,
      centered: false,
    });
  }

  protected failing(): void {
    let attempts = 0;
    this.dialogs.confirm({
      title: 'Sync now?',
      content:
        'The first attempt fails and the dialog stays open; retry succeeds.',
      okText: 'Sync',
      onOk: () =>
        new Promise((resolve, reject) =>
          setTimeout(
            () =>
              ++attempts === 1
                ? reject(new Error('Network error'))
                : resolve(1),
            800,
          ),
        ),
    });
  }
}

/**
 * `AndesDialogService` opens dialogs imperatively through `confirm()` / `info()` /
 * `success()` / `error()` / `warning()`. Each call returns a ref with
 * `update()`, `destroy()` and an awaitable `result`; an `onOk` that returns a promise
 * holds OK in its loading state until it settles (reject to keep the dialog open).
 */
const meta: Meta<DialogServiceDemo> = {
  title: 'Dialog/Service',
  component: DialogServiceDemo,
};

export default meta;

type Story = StoryObj<DialogServiceDemo>;

export const Imperative: Story = {};
