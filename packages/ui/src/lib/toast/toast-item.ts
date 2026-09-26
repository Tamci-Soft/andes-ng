import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

import { AndesButton } from '../button/button';
import type { AndesToast, AndesToastAction } from './toast.types';

/**
 * Renders a single toast's chrome (icon, title, message, actions, close button, progress
 * bar) - purely visual, with no live-region semantics of its own. Internal to `@andes-ng/ui` -
 * only `AndesToastRegion` instantiates it, so it stays unexported from the package root;
 * nothing about its auto-dismiss/hover-pause/queueing behavior lives here, only presentation
 * and the events the region wires to the owning service.
 *
 * Deliberately has no `role`/`aria-live` on its host: this node is added to and removed from
 * the DOM dynamically (per toast, per show/dismiss), which is not a reliable way to trigger a
 * screen reader announcement in every browser/AT pairing. `AndesToastQueue.announce()`
 * covers the accessibility requirement instead, via CDK's `LiveAnnouncer` and its persistent
 * hidden node - see that method's doc comment. Duplicating a second live region here would
 * announce every toast's text twice, so don't add one back. (The toast's `role` option is
 * honored there, as the announcement's politeness.)
 */
@Component({
  selector: 'andes-toast-item',
  imports: [NgTemplateOutlet, AndesButton],
  templateUrl: './toast-item.html',
  styleUrl: './toast-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-severity]': 'toast().severity',
    '[attr.data-flavor]': 'toast().flavor',
    '[attr.data-pause-on-hover]': 'toast().pauseOnHover ? "" : null',
    '[attr.data-clickable]': 'toast().onClick ? "" : null',
    '(click)': 'onHostClick($event)',
  },
})
export class AndesToastItem {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly toast = input.required<AndesToast>();

  /** The close button was clicked. */
  readonly dismissRequested = output<void>();
  /** The inline `action` button was clicked. */
  readonly actionClicked = output<void>();
  /** A button of the `actions` group was clicked. */
  readonly groupActionClicked = output<AndesToastAction>();
  /** The toast body (anything but one of its buttons) was clicked. */
  readonly bodyClicked = output<void>();

  protected readonly hostClasses = computed(() => {
    const toast = this.toast();
    const base = `andes-toast andes-toast--${toast.severity} andes-toast--${toast.flavor}`;
    return toast.className ? `${base} ${toast.className}` : base;
  });

  protected readonly closeLabel = computed(() =>
    this.toast().flavor === 'message'
      ? 'Dismiss message'
      : 'Dismiss notification',
  );

  /** Progress bar only makes sense when there is a countdown to visualize. */
  protected readonly progressDuration = computed(() => {
    const { showProgress, duration } = this.toast();
    return showProgress && duration !== false && duration > 0 ? duration : null;
  });

  /** One-element list keyed by revision, so a key-based update restarts the bar's animation. */
  protected readonly progressRevision = computed(() => [this.toast().revision]);

  protected readonly iconContext = computed(() => ({
    $implicit: this.toast(),
  }));

  protected onHostClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    const interactive = target?.closest('button, a, andes-button');
    if (interactive && this.host.nativeElement.contains(interactive)) {
      return;
    }
    this.bodyClicked.emit();
  }
}
