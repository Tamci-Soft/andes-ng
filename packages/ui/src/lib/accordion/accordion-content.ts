import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
} from '@angular/core';

import { AndesAccordionItemState } from './accordion-item-state';
import { AndesAccordionLazy } from './accordion-lazy';
import { AndesAccordionState } from './accordion-state';

/** Fallback for `destroyOnHidden` when no `transitionend` arrives (transitions disabled, reduced
 *  motion, a detached panel) - comfortably longer than the 0.2s collapse in
 *  accordion-content.css. */
const DESTROY_FALLBACK_MS = 300;

/**
 * The collapsible panel for one accordion item. Exposed as a `region` landmark, labelled by its
 * own trigger (`aria-labelledby`) and cross-linked back from the trigger via `aria-controls` -
 * neither reference implementation's fetched docs confirmed this wiring exists automatically,
 * so it's implemented explicitly here rather than assumed (see accordion-collapse.md, section 4).
 *
 * Stays mounted in the DOM at all times and is purely visually collapsed via CSS (see
 * accordion-content.css) rather than toggling `hidden`/`display: none` - `inert` is applied
 * instead while closed, so its content is skipped by Tab and hidden from assistive tech without
 * losing the animated collapse/expand transition.
 *
 * Two kinds of body content, freely combined:
 * - projected content (`<ng-content>`) is always rendered and always keeps its state;
 * - an `<ng-template andesAccordionLazy>` is rendered on first open and then kept (Ant Design's
 *   default), up front with the item's `forceRender`, or removed again after every close with
 *   the root's `destroyOnHidden` - once the collapse animation has finished, so the panel
 *   doesn't visibly empty out while it's still closing.
 */
@Component({
  selector: 'andes-accordion-content',
  imports: [NgTemplateOutlet],
  templateUrl: './accordion-content.html',
  styleUrl: './accordion-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'region',
    '[id]': 'contentId',
    '[attr.aria-labelledby]': 'triggerId',
    '[attr.data-state]': "isOpen() ? 'open' : 'closed'",
    '[attr.inert]': "isOpen() ? null : ''",
    '(transitionend)': 'onTransitionEnd($event)',
  },
})
export class AndesAccordionContent {
  private readonly rootState = inject(AndesAccordionState);
  private readonly itemState = inject(AndesAccordionItemState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly triggerId = this.itemState.triggerId;
  protected readonly contentId = this.itemState.contentId;

  protected readonly lazy = contentChild(AndesAccordionLazy);
  protected readonly size = this.rootState.size;
  protected readonly variant = this.rootState.variant;

  protected readonly isOpen = computed(() =>
    this.rootState.isOpen(this.itemState.value()),
  );

  private readonly hasOpened = signal(false);
  /** True between a close and the end of its collapse animation under `destroyOnHidden`. */
  private readonly closing = signal(false);

  protected readonly shouldRenderLazy = computed(() => {
    if (this.isOpen() || this.closing()) {
      return true;
    }
    if (this.rootState.destroyOnHidden()) {
      return false;
    }
    return this.hasOpened() || this.itemState.forceRender();
  });

  constructor() {
    let wasOpen = false;
    effect((onCleanup) => {
      const open = this.isOpen();
      const closedNow = wasOpen && !open;
      wasOpen = open;

      untracked(() => {
        if (open) {
          this.hasOpened.set(true);
          this.closing.set(false);
          return;
        }
        if (closedNow && this.rootState.destroyOnHidden()) {
          this.closing.set(true);
          const timer = setTimeout(
            () => this.closing.set(false),
            DESTROY_FALLBACK_MS,
          );
          onCleanup(() => clearTimeout(timer));
        }
      });
    });
  }

  protected onTransitionEnd(event: Event): void {
    // Only the panel's own collapse, not a transition bubbling up from the body's content.
    if (event.target === this.host.nativeElement && !this.isOpen()) {
      this.closing.set(false);
    }
  }
}
