import { NgTemplateOutlet } from '@angular/common';
import {
  type AfterViewInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  type TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesButton, type AndesButtonVariant } from '../button/button';
import type {
  AndesDialogAutoFocusButton,
  AndesDialogFooterContext,
} from './dialog-base';

/**
 * The built-in footer both dialog surfaces and the imperative service render: a
 * Cancel/OK pair, or a consumer's custom footer template laid out in the same box.
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
      <ng-container *ngTemplateOutlet="custom; context: context()" />
    } @else {
      @if (showCancel()) {
        <andes-button
          #cancelButton
          variant="secondary"
          data-slot="dialog-cancel"
          [disabled]="cancelDisabled()"
          [loading]="cancelLoading()"
          (click)="activate('cancel')"
        >
          {{ cancelText() }}
        </andes-button>
      }
      <andes-button
        #okButton
        data-slot="dialog-ok"
        [variant]="okType()"
        [disabled]="okDisabled()"
        [loading]="okLoading()"
        (click)="activate('ok')"
      >
        {{ okText() }}
      </andes-button>
    }
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
  /** A custom footer, rendered in place of the button pair. */
  readonly template = input<TemplateRef<AndesDialogFooterContext> | null>(null);
  /** Context for `template`. */
  readonly context = input<AndesDialogFooterContext | null>(null);

  /** OK was activated. */
  readonly okClick = output<void>();
  /** Cancel was activated. */
  readonly cancelClick = output<void>();

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
        ? this.okDisabled() || this.okLoading()
        : this.cancelDisabled() || this.cancelLoading();
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
