import { AndesOverlayContentPrimitive } from '@andes-ng/primitives';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AndesPopover } from './popover';

/**
 * The popover's panel surface. Wraps its own `[andesOverlayContent]`-decorated
 * element (the `id`/`role`/`aria-modal`/`tabindex`/`data-state` wiring) the same
 * way `AndesButton` wraps `[andesButtonPrimitive]` - a real element component
 * owning the DOM node the shared primitive attaches to, rather than a directive
 * applied to arbitrary consumer markup, so it can carry its own scoped styles
 * (surface background/border/radius/shadow, entrance transition) and render the
 * optional arrow.
 *
 * `data-side`/`data-align` reflect the *requested* side/align (`AndesPopover`'s
 * own inputs), not the position CDK ultimately resolved after a collision flip -
 * `AndesOverlayPrimitive` does not currently expose the resolved connection pair.
 * See the "Notes for andes-ng implementation" follow-up in the popover research
 * doc.
 */
@Component({
  selector: 'andes-popover-content',
  imports: [AndesOverlayContentPrimitive],
  templateUrl: './popover-content.html',
  styleUrl: './popover-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesPopoverContent {
  protected readonly popover = inject(AndesPopover);
}
