import { AndesOverlayContentPrimitive } from '@andes-ng/primitives';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
} from '@angular/core';

import { AndesPopoverBase } from './popover-base';
import { AndesPopoverOutlet } from './popover-outlet';

/**
 * The popover's panel surface. Wraps its own `[andesOverlayContent]`-decorated
 * element (the `id`/`role`/`aria-modal`/`tabindex`/`data-state` wiring) the same
 * way `AndesButton` wraps `[andesButtonPrimitive]` - a real element component
 * owning the DOM node the shared primitive attaches to, rather than a directive
 * applied to arbitrary consumer markup, so it can carry its own scoped styles
 * (surface background/border/radius/shadow, entrance transition) and render the
 * optional arrow.
 *
 * It also renders the structured parts driven by the owning component's inputs -
 * the `title` header and the `content` body - above any projected children.
 * `AndesPopover` renders one automatically when none is projected, and
 * `AndesPopconfirm` uses it as its own surface.
 *
 * `data-side` reflects the side the panel actually renders on (after a collision
 * flip); `data-align` the requested alignment. Both are styling hooks.
 *
 * Theming: every visual property reads an `--andes-popover-*` custom property
 * first (`padding`, `min-width`, `max-width`, `radius`, `background`,
 * `foreground`, `border-color`, `shadow`), falling back to the theme tokens. Set
 * them on this element (`style="--andes-popover-padding: 0"`), on a `panelClass`,
 * or globally.
 */
@Component({
  selector: 'andes-popover-content',
  imports: [AndesOverlayContentPrimitive, AndesPopoverOutlet],
  templateUrl: './popover-content.html',
  styleUrl: './popover-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesPopoverContent {
  protected readonly popover = inject(AndesPopoverBase);

  protected isTemplate(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef;
  }
}
