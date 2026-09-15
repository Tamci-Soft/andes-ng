import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import type { AndesToast } from './toast.types';

/**
 * Renders a single toast's chrome (title, message, optional action, optional close button)
 * and its accessibility markup. Internal to `@andes-ng/ui` - only `AndesToastViewport`
 * instantiates it, so it stays unexported from the package root; nothing about its
 * auto-dismiss/hover-pause/queueing behavior lives here, only presentation and the two
 * events (`dismissRequested`, `actionClicked`) the viewport wires to `AndesToastService`.
 */
@Component({
  selector: 'andes-toast-item',
  templateUrl: './toast-item.html',
  styleUrl: './toast-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-severity]': 'toast().severity',
    // role="status"/aria-live="polite" for everything else, role="alert"/"assertive" for
    // errors - so an error toast interrupts a screen reader immediately instead of waiting
    // for it to go idle, matching Ant Notification's documented role prop and this
    // component's own accessibility brief. See AndesToastService.announce() for the second,
    // belt-and-braces half of actually getting this announced.
    '[attr.role]': 'role()',
    '[attr.aria-live]': 'ariaLive()',
    '[attr.aria-atomic]': '"true"',
  },
})
export class AndesToastItem {
  readonly toast = input.required<AndesToast>();

  /** The close button was clicked. */
  readonly dismissRequested = output<void>();
  /** The action button was clicked. */
  readonly actionClicked = output<void>();

  protected readonly role = computed(() =>
    this.toast().severity === 'error' ? 'alert' : 'status',
  );
  protected readonly ariaLive = computed(() =>
    this.toast().severity === 'error' ? 'assertive' : 'polite',
  );
  protected readonly hostClasses = computed(
    () => `andes-toast andes-toast--${this.toast().severity}`,
  );
}
