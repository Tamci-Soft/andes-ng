import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { AndesMessageService } from './message.service';
import { AndesToastRegion } from './toast-region';
import { AndesToastService } from './toast.service';
import type { AndesToast, AndesToastPosition } from './toast.types';

const PLACEMENTS: readonly AndesToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

/**
 * Mount this once, e.g. near the root of an app (`app.html`), to render both toast flavors:
 * the notifications `AndesToastService` manages (one fixed stack per placement in use) and
 * the compact messages `AndesMessageService` manages (always top-center). Fixed-position,
 * always-visible, and deliberately *not* built on `AndesOverlayPrimitive` - see the
 * ADR-style note below.
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
 * inject(AndesMessageService).success('Copied.');
 * ```
 *
 * Rendering requires this explicit mount point, which keeps toasts inside the app's own
 * component tree (SSR-safe, no `ApplicationRef` side-attachment) - the same
 * trade-off `<router-outlet>` makes.
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
  imports: [AndesToastRegion],
  templateUrl: './toast-viewport.html',
  styleUrl: './toast-viewport.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-toast-viewport',
    '[attr.data-position]': 'defaultPlacement()',
  },
})
export class AndesToastViewport {
  protected readonly toastService = inject(AndesToastService);
  protected readonly messageService = inject(AndesMessageService);

  /**
   * Where notifications without their own `placement` go. Default: the global `placement`
   * from `provideAndesToastConfig()` (built-in `'bottom-right'`).
   */
  readonly position = input<AndesToastPosition | undefined>(undefined);

  protected readonly defaultPlacement = computed(
    () => this.position() ?? this.toastService.defaults().placement,
  );

  /** Visible notifications grouped by resolved placement, in a stable placement order. */
  protected readonly regions = computed(() => {
    const fallback = this.defaultPlacement();
    const groups = new Map<AndesToastPosition, AndesToast[]>();
    for (const toast of this.toastService.visibleToasts()) {
      const placement = toast.placement ?? fallback;
      const group = groups.get(placement);
      if (group) {
        group.push(toast);
      } else {
        groups.set(placement, [toast]);
      }
    }
    return PLACEMENTS.filter((placement) => groups.has(placement)).map(
      (placement) => ({ placement, toasts: groups.get(placement) ?? [] }),
    );
  });

  protected readonly messages = this.messageService.visibleToasts;
}
