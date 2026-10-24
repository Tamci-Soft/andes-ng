import { AndesListNavigationKeys } from '@andes-ng/primitives';
import { CdkDropList } from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
} from '@angular/core';

import { ANDES_TABS } from './tabs-types';

/**
 * The `role="tablist"` container for a set of `AndesTabsTrigger`s.
 *
 * Hosts `AndesListNavigationKeys` directly on its own host element (via `hostDirectives`),
 * which is the element that owns real DOM focus in roving-tabindex mode - so this is where
 * `keydown` is captured and forwarded to the shared `AndesListNavigation`.
 *
 * The parent `AndesTabs` projects this element into its tab bar (inside the scrollable nav,
 * next to the ink bar); the divider line, scroll arrows and add button all live in the bar
 * around it, so this element only ever contains tabs.
 *
 * It is also the drop list of a `draggable` Tabs. The CDK drop list is always attached (a
 * host directive cannot be conditional) but stays disabled unless the parent Tabs is
 * `draggable`, so an ordinary tab bar never starts a drag.
 */
@Component({
  selector: 'andes-tabs-list',
  hostDirectives: [AndesListNavigationKeys, CdkDropList],
  host: {
    role: 'tablist',
    '[attr.aria-orientation]': 'tabs.resolvedOrientation()',
    '[attr.data-variant]': 'tabs.type() === "line" ? "line" : "card"',
    '[style.gap.px]': 'tabs.tabBarGutter()',
  },
  template: `<ng-content />`,
  styleUrl: './tabs-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTabsList {
  protected readonly tabs = inject(ANDES_TABS);

  constructor() {
    const dropList = inject(CdkDropList, { self: true });
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const vertical = this.tabs.resolvedOrientation() === 'vertical';
      dropList.disabled = !this.tabs.draggable();
      dropList.orientation = vertical ? 'vertical' : 'horizontal';
      dropList.lockAxis = vertical ? 'y' : 'x';
    });

    const dropped = dropList.dropped.subscribe((event) => {
      const key = event.item.data;
      if (
        typeof key === 'string' &&
        event.previousIndex !== event.currentIndex
      ) {
        this.tabs.requestReorder(key, event.previousIndex, event.currentIndex);
      }
    });
    destroyRef.onDestroy(() => dropped.unsubscribe());

    // Tabs keep their own registries in DOM order, sorted when a tab registers. A consumer
    // reordering its tabs (after `(reorder)`, or for any other reason) moves existing tab
    // elements without re-registering them, so the order is re-checked on every change to
    // this list's children.
    afterNextRender(() => {
      if (typeof MutationObserver === 'undefined') {
        return;
      }
      const observer = new MutationObserver(() => this.tabs.syncOrder());
      observer.observe(element, { childList: true });
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
