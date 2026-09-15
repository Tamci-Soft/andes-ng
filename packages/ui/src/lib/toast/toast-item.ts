import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import type { AndesToast } from './toast.types';

/**
 * Renders a single toast's chrome (title, message, optional action, optional close button) -
 * purely visual, with no live-region semantics of its own. Internal to `@andes-ng/ui` - only
 * `AndesToastViewport` instantiates it, so it stays unexported from the package root; nothing
 * about its auto-dismiss/hover-pause/queueing behavior lives here, only presentation and the
 * two events (`dismissRequested`, `actionClicked`) the viewport wires to `AndesToastService`.
 *
 * Deliberately has no `role`/`aria-live` on its host: this node is added to and removed from
 * the DOM dynamically (per toast, per show/dismiss), which is not a reliable way to trigger a
 * screen reader announcement in every browser/AT pairing. `AndesToastService.announce()`
 * covers the accessibility requirement instead, via CDK's `LiveAnnouncer` and its persistent
 * hidden node - see that method's doc comment. Duplicating a second live region here would
 * announce every toast's text twice, so don't add one back.
 */
@Component({
  selector: 'andes-toast-item',
  templateUrl: './toast-item.html',
  styleUrl: './toast-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-severity]': 'toast().severity',
  },
})
export class AndesToastItem {
  readonly toast = input.required<AndesToast>();

  /** The close button was clicked. */
  readonly dismissRequested = output<void>();
  /** The action button was clicked. */
  readonly actionClicked = output<void>();

  protected readonly hostClasses = computed(
    () => `andes-toast andes-toast--${this.toast().severity}`,
  );
}
