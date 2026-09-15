import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';

import { AndesToastItem } from './toast-item';
import { AndesToastService } from './toast.service';
import type { AndesToast, AndesToastPosition } from './toast.types';

/**
 * Mount this once, e.g. near the root of an app (`app.html`), to render the toast stack
 * `AndesToastService` manages. Fixed-position, always-visible, and deliberately *not* built
 * on `AndesOverlayPrimitive` - see the ADR-style note below.
 *
 * ```html
 * <!-- app.html, once -->
 * <router-outlet />
 * <andes-toast-viewport position="bottom-right" />
 * ```
 *
 * ```ts
 * // anywhere else
 * private readonly toasts = inject(AndesToastService);
 * this.toasts.success('Changes saved.');
 * ```
 *
 * ## Why not `AndesOverlayPrimitive`
 *
 * The shared overlay primitive is built around one `OverlayRef` per component instance,
 * opened by a trigger and closed with focus restored to it - the shape Dialog, Popover and
 * Dropdown Menu all share. A toast stack doesn't fit that shape on any axis that matters:
 *
 * - It renders an arbitrary-length, independently-timed *list* of items, not one
 *   open/closed piece of content - there's no single `TemplateRef`/`ComponentType` to hand
 *   `open()`, and reusing the primitive would mean one `AndesOverlayPrimitive` (and one CDK
 *   `OverlayRef`, focus trap, scroll strategy) per toast, torn down and recreated constantly.
 * - It must never trap focus, show a backdrop, or lock page scroll - a toast is
 *   non-modal by definition, so most of what the primitive exists to manage
 *   (`ConfigurableFocusTrap`, backdrop styling, `disposeOnNavigation`) is dead weight here.
 * - There's no anchor to position against; the viewport just sits in a fixed corner.
 *   `position: fixed` escapes normal document flow on its own (mounting this deep in an
 *   app's component tree doesn't change where it renders on screen, aside from the same
 *   `transform`-on-an-ancestor caveat any `position: fixed` element has) - CDK's overlay
 *   container buys nothing over that for this shape.
 *
 * `--andes-z-index-toast` still comes from the same token scale the primitive's
 * `AndesOverlayLayer`s use, so a toast still stacks correctly above dialogs/popovers/etc.
 * without either side hard-coding a number.
 */
@Component({
  selector: 'andes-toast-viewport',
  imports: [AndesToastItem],
  templateUrl: './toast-viewport.html',
  styleUrl: './toast-viewport.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-toast-viewport',
    '[attr.data-position]': 'position()',
  },
})
export class AndesToastViewport {
  protected readonly toastService = inject(AndesToastService);

  /** Which corner/edge to anchor the stack to. Default `'bottom-right'`. */
  readonly position = input<AndesToastPosition>('bottom-right');

  protected readonly toasts = this.toastService.visibleToasts;

  protected onDismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  protected onHoverStart(id: string): void {
    this.toastService.pause(id);
  }

  protected onHoverEnd(id: string): void {
    this.toastService.resume(id);
  }

  protected onAction(toast: AndesToast): void {
    toast.action?.onClick();
    this.toastService.dismiss(toast.id);
  }
}
