import {
  provideAndesOverlay,
  type AndesOverlayCloseReason,
  type AndesOverlayRole,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ErrorHandler,
  inject,
  Injector,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesButton, type AndesButtonVariant } from '../button/button';
import { AndesPopoverBase } from '../popover/popover-base';
import { AndesPopoverContent } from '../popover/popover-content';
import { AndesPopoverOutlet } from '../popover/popover-outlet';
import type { AndesPopoverRenderable } from '../popover/popover-types';

/**
 * Called when OK is pressed. Returning a promise keeps the OK button loading
 * until it settles: the popconfirm closes on resolve and stays open on reject.
 */
export type AndesPopconfirmHandler = () => unknown;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

/**
 * A small confirmation bubble anchored to the element that triggered an action
 * (Ant's `Popconfirm`) - lighter than an alert dialog for "are you sure?" checks
 * on reversible or low-stakes actions.
 *
 * ```html
 * <andes-popconfirm
 *   title="Delete the task"
 *   description="Are you sure to delete this task?"
 *   okType="danger"
 *   okText="Delete"
 *   [onConfirm]="deleteTask"
 *   (cancelled)="log('kept')"
 * >
 *   <button andes-button variant="danger" andesPopconfirmTrigger>Delete</button>
 * </andes-popconfirm>
 * ```
 *
 * Shares placement, triggers, arrow, collision handling and `[(open)]` with
 * `AndesPopover`, with Ant's defaults for a confirmation: `placement` top, arrow
 * on, `click` trigger. The panel is a non-modal `alertdialog` labelled by the
 * title and described by the description; focus starts on Cancel (on OK when
 * `showCancel` is off), Escape counts as Cancel, and an outside click simply
 * dismisses it.
 */
@Component({
  selector: 'andes-popconfirm',
  imports: [
    AndesButton,
    AndesPopoverContent,
    AndesPopoverOutlet,
    NgTemplateOutlet,
  ],
  providers: [
    provideAndesOverlay(),
    { provide: AndesPopoverBase, useExisting: AndesPopconfirm },
  ],
  templateUrl: './popconfirm.html',
  styleUrl: './popconfirm.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // `title` is also a global HTML attribute - see `AndesPopover`.
    '[attr.title]': 'null',
  },
})
export class AndesPopconfirm extends AndesPopoverBase {
  private readonly errorHandler = inject(ErrorHandler);
  private readonly popconfirmInjector = inject(Injector);

  protected override readonly panelRole: AndesOverlayRole = 'alertdialog';

  /** Side of the trigger the panel prefers to render on. Default `'top'`. */
  override readonly side = input<AndesOverlaySide>('top');
  /** Renders the pointer on the panel. Default `true`. */
  override readonly showArrow = input(true, { transform: booleanAttribute });

  /** The question - text or a template. Labels the alert dialog. */
  readonly title = input<AndesPopoverRenderable | null | undefined>(undefined);
  /** Supporting text under the title - text or a template. */
  readonly description = input<AndesPopoverRenderable | null | undefined>(
    undefined,
  );
  /**
   * Icon before the text. `undefined` (default) renders the warning icon, a
   * template replaces it, `null` removes it.
   */
  readonly icon = input<TemplateRef<unknown> | null | undefined>(undefined);
  /** OK button label. Default `'OK'`. */
  readonly okText = input('OK');
  /** Cancel button label. Default `'Cancel'`. */
  readonly cancelText = input('Cancel');
  /** OK button variant - `'danger'` for destructive actions. Default `'primary'`. */
  readonly okType = input<AndesButtonVariant>('primary');
  /** Disables the OK button. Default `false`. */
  readonly okDisabled = input(false, { transform: booleanAttribute });
  /** Shows the OK button's loading state. Default `false`. */
  readonly okLoading = input(false, { transform: booleanAttribute });
  /** Renders the Cancel button. Default `true`. */
  readonly showCancel = input(true, { transform: booleanAttribute });
  /**
   * Async-aware confirm handler (Ant's `onConfirm` returning a promise). The
   * `confirm` output still fires first on every OK press.
   */
  readonly onConfirm = input<AndesPopconfirmHandler | undefined>(undefined);

  /** OK was pressed. */
  readonly confirm = output<void>();
  /** Cancel was pressed, or Escape dismissed the popconfirm (Ant's `onCancel`). */
  readonly cancelled = output<void>();

  protected readonly panelTemplate = viewChild<TemplateRef<unknown>>('panel');

  protected readonly pending = signal(false);
  protected readonly okBusy = computed(
    () => this.okLoading() || this.pending(),
  );

  override readonly panelLabelledBy = computed(() =>
    this.title() ? this.titleId : null,
  );
  override readonly panelDescribedBy = computed(() =>
    this.description() ? this.bodyId : null,
  );

  /** Invalidates an in-flight `onConfirm` once the panel has closed. */
  private confirmRun = 0;

  protected isTemplate(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef;
  }

  protected async handleOk(): Promise<void> {
    if (this.okDisabled() || this.okBusy()) {
      return;
    }
    const run = this.confirmRun;
    this.confirm.emit();

    const result = this.onConfirm()?.();
    if (isPromiseLike(result)) {
      this.pending.set(true);
      try {
        await result;
      } catch (error) {
        if (run === this.confirmRun) {
          this.pending.set(false);
          this.refocusOk();
        }
        this.errorHandler.handleError(error);
        return;
      }
      if (run !== this.confirmRun) {
        return;
      }
      this.pending.set(false);
    }
    this.requestClose();
  }

  /**
   * The loading OK button is disabled, which drops focus to `<body>` while the
   * promise runs. Once it is re-enabled after a rejection, put keyboard users
   * back where they were so they can retry or cancel.
   */
  private refocusOk(): void {
    afterNextRender(
      {
        write: () =>
          this.overlay
            .contentElement()
            ?.querySelector<HTMLElement>('.andes-popconfirm-ok button')
            ?.focus(),
      },
      { injector: this.popconfirmInjector },
    );
  }

  protected handleCancel(): void {
    this.cancelled.emit();
    this.requestClose();
  }

  protected override handleClosed(reason: AndesOverlayCloseReason): void {
    this.confirmRun++;
    this.pending.set(false);
    if (reason === 'escape-key') {
      this.cancelled.emit();
    }
  }
}
