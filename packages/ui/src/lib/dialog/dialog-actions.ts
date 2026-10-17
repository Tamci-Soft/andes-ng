import { NgTemplateOutlet } from '@angular/common';
import {
  type AfterViewInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  type TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesButton, type AndesButtonVariant } from '../button/button';
import type {
  AndesDialogAutoFocusButton,
  AndesDialogButtonProps,
  AndesDialogFooterContext,
} from './dialog-base';

/**
 * The built-in footer both dialog surfaces and the imperative service render: a
 * Cancel/OK pair, or a consumer's custom footer template laid out in the same box.
 * A custom template is handed the built-in buttons as templates too
 * (`okButton`, `cancelButton`, `defaultButtons`), so it can extend the pair.
 *
 * It only reports activations; what OK and Cancel *do* (emit an output, await a
 * promise, close) is the caller's business, which is what lets the declarative roots
 * and `AndesDialogService` share it.
 *
 * The host is the footer box itself (`andes-dialog__footer`), so it sits directly in
 * the surface's scroll viewport and gets the same pinning and narrow-screen stacking
 * as a consumer's own `andesDialogFooter`. Cancel comes first in the DOM - the focus
 * trap then opens on the safe choice - and the stylesheet shows OK first when the
 * pair stacks.
 *
 * Internal: not exported from the package entry point.
 */
@Component({
  selector: 'andes-dialog-actions',
  imports: [AndesButton, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-dialog__footer',
    '[attr.data-slot]': 'slot()',
  },
  template: `
    @if (template(); as custom) {
      <ng-container
        *ngTemplateOutlet="
          custom;
          context: {
            $implicit: context().$implicit,
            ok: context().ok,
            cancel: context().cancel,
            okButton: okTpl,
            cancelButton: cancelTpl,
            defaultButtons: buttonsTpl,
          }
        "
      />
    } @else {
      <ng-container *ngTemplateOutlet="buttonsTpl" />
    }

    <ng-template #buttonsTpl>
      @if (showCancel()) {
        <ng-container *ngTemplateOutlet="cancelTpl" />
      }
      <ng-container *ngTemplateOutlet="okTpl" />
    </ng-template>

    <ng-template #cancelTpl>
      @let cancelProps = cancelButtonProps();
      <andes-button
        #cancelButton
        data-slot="dialog-cancel"
        [class]="cancelProps?.className ?? ''"
        [variant]="cancelProps?.variant ?? 'secondary'"
        [size]="cancelProps?.size ?? 'md'"
        [ghost]="cancelProps?.ghost ?? false"
        [aria-label]="cancelProps?.ariaLabel"
        [disabled]="cancelBlocked()"
        [loading]="cancelBusy()"
        (click)="activate('cancel')"
      >
        {{ cancelText() }}
      </andes-button>
    </ng-template>

    <ng-template #okTpl>
      @let okProps = okButtonProps();
      <andes-button
        #okButton
        data-slot="dialog-ok"
        [class]="okProps?.className ?? ''"
        [variant]="okProps?.variant ?? okType()"
        [size]="okProps?.size ?? 'md'"
        [ghost]="okProps?.ghost ?? false"
        [aria-label]="okProps?.ariaLabel"
        [disabled]="okBlocked()"
        [loading]="okBusy()"
        (click)="activate('ok')"
      >
        {{ okText() }}
      </andes-button>
    </ng-template>
  `,
})
export class AndesDialogActions implements AfterViewInit {
  /** `data-slot` for the footer box, so each surface keeps its own slot vocabulary. */
  readonly slot = input('dialog-footer');
  readonly okText = input('OK');
  readonly cancelText = input('Cancel');
  readonly okType = input<AndesButtonVariant>('primary');
  readonly okDisabled = input(false, { transform: booleanAttribute });
  readonly cancelDisabled = input(false, { transform: booleanAttribute });
  readonly okLoading = input(false, { transform: booleanAttribute });
  readonly cancelLoading = input(false, { transform: booleanAttribute });
  readonly showCancel = input(true, { transform: booleanAttribute });
  readonly autoFocusButton = input<AndesDialogAutoFocusButton>(null);
  /** Extra settings for the OK button. */
  readonly okButtonProps = input<AndesDialogButtonProps | null>(null);
  /** Extra settings for the Cancel button. */
  readonly cancelButtonProps = input<AndesDialogButtonProps | null>(null);
  /** A custom footer, rendered in place of the button pair. */
  readonly template = input<TemplateRef<AndesDialogFooterContext> | null>(null);
  /** The actions handed to `template`, alongside the built-in button templates. */
  readonly context = input.required<AndesDialogFooterContext>();

  /** OK was activated. */
  readonly okClick = output<void>();
  /** Cancel was activated. */
  readonly cancelClick = output<void>();

  protected readonly okBlocked = computed(
    () => this.okDisabled() || !!this.okButtonProps()?.disabled,
  );
  protected readonly cancelBlocked = computed(
    () => this.cancelDisabled() || !!this.cancelButtonProps()?.disabled,
  );
  protected readonly okBusy = computed(
    () => this.okLoading() || !!this.okButtonProps()?.loading,
  );
  protected readonly cancelBusy = computed(
    () => this.cancelLoading() || !!this.cancelButtonProps()?.loading,
  );

  private readonly okButton = viewChild('okButton', { read: ElementRef });
  private readonly cancelButton = viewChild('cancelButton', {
    read: ElementRef,
  });

  ngAfterViewInit(): void {
    // Marks the real <button> inside AndesButton - its host is a non-focusable
    // wrapper - with the attribute CDK's focus trap honours for initial focus. This
    // runs inside the overlay's synchronous attach, before the trap looks for its
    // initial target, so no render-timing race is involved.
    const choice = this.autoFocusButton();
    const host =
      choice === 'ok'
        ? this.okButton()
        : choice === 'cancel'
          ? this.cancelButton()
          : undefined;
    (host?.nativeElement as HTMLElement | undefined)
      ?.querySelector('button')
      ?.setAttribute('cdkFocusInitial', '');
  }

  protected activate(which: 'ok' | 'cancel'): void {
    // A disabled or loading <button> never dispatches the click, but the host
    // wrapper can still be clicked around it (padding, a programmatic click).
    const blocked =
      which === 'ok'
        ? this.okBlocked() || this.okBusy()
        : this.cancelBlocked() || this.cancelBusy();
    if (blocked) {
      return;
    }
    if (which === 'ok') {
      this.okClick.emit();
    } else {
      this.cancelClick.emit();
    }
  }
}
