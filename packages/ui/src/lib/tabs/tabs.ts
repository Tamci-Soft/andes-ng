import { AndesListNavigation } from '@andes-ng/primitives';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

import {
  AndesTabsActivationMode,
  AndesTabsOrientation,
  AndesTabsTriggerRef,
} from './tabs-types';

let nextTabsId = 0;

/** `Node.DOCUMENT_POSITION_FOLLOWING`, inlined so this file never touches the `Node` global. */
const DOCUMENT_POSITION_FOLLOWING = 4;

/** Sorts registered triggers into DOM order, mirroring `AndesListNavigation`'s own registry. */
function sortByDocumentOrder(
  triggers: readonly AndesTabsTriggerRef[],
): AndesTabsTriggerRef[] {
  return [...triggers].sort((a, b) =>
    a.element.compareDocumentPosition(b.element) & DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1,
  );
}

/**
 * Root of a compound Tabs widget implementing the WAI-ARIA APG "Tabs" pattern:
 *
 * ```html
 * <andes-tabs [(value)]="activeTab">
 *   <andes-tabs-list>
 *     <andes-tabs-trigger value="account">Account</andes-tabs-trigger>
 *     <andes-tabs-trigger value="password" disabled>Password</andes-tabs-trigger>
 *   </andes-tabs-list>
 *   <andes-tabs-content value="account">Account settings…</andes-tabs-content>
 *   <andes-tabs-content value="password">Password settings…</andes-tabs-content>
 * </andes-tabs>
 * ```
 *
 * `AndesTabs` owns the selected `value` and provides the shared {@link AndesListNavigation}
 * that `AndesTabsList`/`AndesTabsTrigger` use for roving-tabindex keyboard navigation;
 * `AndesTabsContent` reads `activeValue` to decide whether it is the shown panel.
 */
@Component({
  selector: 'andes-tabs',
  providers: [AndesListNavigation],
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTabs {
  private readonly navigation = inject(AndesListNavigation);

  /** The active tab's value. Two-way bindable (`[(value)]`) for a controlled Tabs; when left
   * unbound, `AndesTabs` manages it itself, defaulting to the first enabled tab. */
  readonly value = model<string | undefined>(undefined);

  /** Which arrow keys navigate between tabs. Default `'horizontal'`. */
  readonly orientation = input<AndesTabsOrientation>('horizontal');

  /** Whether arrow-key focus also selects a tab (`'automatic'`) or only `Enter`/`Space` does
   * (`'manual'`). Default `'automatic'`, per the WAI-ARIA APG's recommendation for simple
   * tabs whose panels are cheap to show. */
  readonly activationMode = input<AndesTabsActivationMode>('automatic');

  private readonly _triggers = signal<readonly AndesTabsTriggerRef[]>([]);

  // Sorted lazily, on read, rather than at registration time: triggers register from their
  // own constructors, which for content-projected components can run before their element
  // is actually attached under its final parent, when `compareDocumentPosition` cannot yet
  // tell DOM order apart. By the time anything reads this computed (e.g. after the initial
  // `ApplicationRef.tick()`), rendering has settled and document order is reliable.
  private readonly sortedTriggers = computed(() =>
    sortByDocumentOrder(this._triggers()),
  );

  private readonly firstEnabledValue = computed(() =>
    this.sortedTriggers()
      .find((trigger) => !trigger.disabled())
      ?.value(),
  );

  /** The value that should currently be shown: the controlled/uncontrolled {@link value}, or
   * the first enabled tab before anything has ever been explicitly selected. */
  readonly activeValue = computed(
    () => this.value() ?? this.firstEnabledValue(),
  );

  private readonly tabsId = `andes-tabs-${nextTabsId++}`;

  constructor() {
    effect(() => {
      this.navigation.configure({
        orientation: this.orientation(),
        focusMode: 'roving-tabindex',
        wrap: true,
        homeAndEnd: true,
        // Typeahead is a listbox/menu convention, not part of the WAI-ARIA Tabs pattern.
        typeahead: false,
      });
    });
  }

  /** @internal Called by `AndesTabsTrigger` on construction. */
  registerTrigger(trigger: AndesTabsTriggerRef): void {
    this._triggers.update((triggers) => [...triggers, trigger]);
  }

  /** @internal Called by `AndesTabsTrigger` on destroy. */
  unregisterTrigger(trigger: AndesTabsTriggerRef): void {
    this._triggers.update((triggers) => triggers.filter((t) => t !== trigger));
  }

  /** Makes `value` the active tab - called on click, on `Enter`/`Space`, and by the
   * automatic-activation effect in `AndesTabsTrigger` when arrow-key focus itself should
   * move selection too. */
  select(value: string): void {
    this.value.set(value);
  }

  /** @internal The `id` for the content panel matching `value`. */
  panelId(value: string): string {
    return `${this.tabsId}-panel-${value}`;
  }

  /**
   * @internal The real DOM `id` of the trigger button for `value`, once it has one - read by
   * `AndesTabsContent` for `aria-labelledby`. See the comment in `tabs-trigger.ts` for why
   * this is sourced from the trigger's own registered ref instead of a name `AndesTabs`
   * mints itself: the button's `id` is already owned by `andesListNavigationItem`.
   */
  triggerElementId(value: string): string | undefined {
    return this._triggers()
      .find((trigger) => trigger.value() === value)
      ?.elementId();
  }
}
