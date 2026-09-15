import { AndesListNavigationItem } from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import { AndesTabs } from './tabs';
import { AndesTabsTriggerRef } from './tabs-types';

/**
 * One `role="tab"` trigger inside an `AndesTabsList`. Renders the real, focusable `<button>`
 * in its own template (the `andesListNavigationItem` primitive needs to sit on a genuinely
 * focusable element) and reacts to the shared `AndesListNavigation`'s active item to
 * implement "automatic activation": in that mode, arrow-key focus lands here and selection
 * follows it, with no click or `Enter`/`Space` required.
 *
 * The button's `id` is left entirely to `andesListNavigationItem` (it assigns one whether or
 * not this component also tried to); `AndesTabsContent` reads it back via {@link elementId}
 * for `aria-labelledby` rather than this component minting a competing one.
 */
@Component({
  selector: 'andes-tabs-trigger',
  imports: [AndesListNavigationItem],
  templateUrl: './tabs-trigger.html',
  styleUrl: './tabs-trigger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTabsTrigger implements AndesTabsTriggerRef {
  private readonly tabs = inject(AndesTabs);
  private readonly destroyRef = inject(DestroyRef);

  /** Identifies which panel this trigger controls; matches an `AndesTabsContent`'s `value`. */
  readonly value = input.required<string>();

  /** Disables the trigger: skipped by keyboard navigation and by the default-tab fallback. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** @internal Satisfies `AndesTabsTriggerRef`, used only to keep the tabs registry in DOM order. */
  readonly element: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;

  protected readonly isSelected = computed(
    () => this.tabs.activeValue() === this.value(),
  );
  protected readonly panelId = computed(() => this.tabs.panelId(this.value()));

  protected readonly classes = computed(() =>
    clsx(
      'andes-tabs__trigger',
      this.isSelected() && 'andes-tabs__trigger--selected',
    ),
  );

  private readonly navItem = viewChild(AndesListNavigationItem);

  /** @internal See the class doc comment; consumed by `AndesTabsContent`. */
  readonly elementId = computed(() => this.navItem()?.itemId);

  /** @internal The registered `AndesListNavigationItem` behind this trigger's button, once
   * its view has initialized - `undefined` before then. Read by `AndesTabs` to keep the
   * shared `AndesListNavigation`'s roving-tabindex target in sync with whichever tab is
   * currently selected; see the comment on `AndesTabs.syncActiveItem` for why that lives
   * there instead of in a per-trigger effect here. */
  readonly navigationItem = this.navItem;

  constructor() {
    this.tabs.registerTrigger(this);
    this.destroyRef.onDestroy(() => this.tabs.unregisterTrigger(this));

    // Automatic activation (the default, and the WAI-ARIA APG's recommendation for plain
    // tabs): once this trigger becomes the list's active (focused) item, select it too,
    // exactly as documented on `AndesListNavigation` itself. In "manual" mode this effect
    // does nothing, and selection is left entirely to the (click)/(keydown.enter|space)
    // handlers in the template.
    effect(() => {
      const item = this.navItem();
      if (this.tabs.activationMode() === 'automatic' && item?.active()) {
        this.tabs.select(this.value());
      }
    });
  }

  protected onSelect(): void {
    this.tabs.select(this.value());
  }
}
