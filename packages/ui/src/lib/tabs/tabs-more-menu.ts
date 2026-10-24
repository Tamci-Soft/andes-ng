import {
  AndesListNavigation,
  AndesListNavigationItem,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';

import type { AndesTabsMoreTab } from './tabs-types';

let nextMoreMenuId = 0;

/**
 * @internal The overflow menu `AndesTabs` opens from its "more" button: the tabs currently
 * scrolled out of view, so a pointer user can reach one without scrolling the bar.
 *
 * Two keyboard models, depending on `search`:
 *
 * - Without search it is a WAI-ARIA menu: real focus moves between `role="menuitem"` rows
 *   (roving tabindex, arrow keys, `Home`/`End`, typeahead), `Enter`/`Space` picks one.
 * - With search, focus stays in a `role="combobox"` text field that filters a
 *   `role="listbox"`; the arrow keys move the active option (`aria-activedescendant`) and
 *   `Enter` picks it.
 *
 * Either way `Escape` and `Tab` close it (the first via the overlay, the second here), and
 * a removable tab gets the same pointer-only remove button as in the bar - `Delete` on the
 * focused menu item is its keyboard equivalent.
 */
@Component({
  selector: 'andes-tabs-more-menu',
  imports: [AndesListNavigationItem, NgTemplateOutlet],
  providers: [AndesListNavigation],
  templateUrl: './tabs-more-menu.html',
  styleUrl: './tabs-more-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-label]': 'label()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AndesTabsMoreMenu {
  protected readonly navigation = inject(AndesListNavigation);
  private readonly injector = inject(Injector);

  /** The tabs to list. */
  readonly tabs = input.required<readonly AndesTabsMoreTab[]>();

  /** Adds a text field that filters the list. */
  readonly search = input(false, { transform: booleanAttribute });

  /** Placeholder and accessible name of the search field. */
  readonly searchPlaceholder = input('Search tabs');

  /** Accessible name of the menu. */
  readonly label = input('More tabs');

  /** Shown when no tab matches the search. */
  readonly emptyText = input('No matching tabs');

  /** A tab was picked. */
  readonly pick = output<string>();

  /** A tab's remove button (or `Delete` on its menu item) was used. */
  readonly remove = output<{ key: string; event: Event }>();

  /** `Tab` was pressed: the menu should close and let focus move on. */
  readonly dismiss = output<void>();

  protected readonly listId = `andes-tabs-more-${nextMoreMenuId++}`;

  protected readonly query = signal('');

  protected readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    const tabs = this.tabs();
    return query && this.search()
      ? tabs.filter((tab) => tab.label.toLowerCase().includes(query))
      : tabs;
  });

  constructor() {
    effect(() => {
      const search = this.search();
      this.navigation.configure({
        orientation: 'vertical',
        focusMode: search ? 'active-descendant' : 'roving-tabindex',
        wrap: true,
        // A text field needs `Home`/`End` and printable keys for itself.
        homeAndEnd: !search,
        typeahead: !search,
      });
    });

    const tabOut = this.navigation.tabOut.subscribe(() => this.dismiss.emit());
    inject(DestroyRef).onDestroy(() => tabOut.unsubscribe());

    afterNextRender(() => {
      if (this.search()) {
        this.navigation.focusFirst();
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    this.navigation.onKeydown(event);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    afterNextRender(() => this.navigation.focusFirst(), {
      injector: this.injector,
    });
  }

  /** `Enter` in the search field picks the active option. */
  protected pickActive(event: Event): void {
    const key = this.navigation.activeItem()?.element.dataset['key'];
    const tab = this.filtered().find((entry) => entry.key === key);
    if (tab) {
      event.preventDefault();
      this.onPick(tab);
    }
  }

  protected onPick(tab: AndesTabsMoreTab): void {
    if (!tab.disabled) {
      this.pick.emit(tab.key);
    }
  }

  protected onItemKey(tab: AndesTabsMoreTab, event: Event): void {
    event.preventDefault();
    this.onPick(tab);
  }

  protected onRemove(tab: AndesTabsMoreTab, event: Event): void {
    event.stopPropagation();
    this.remove.emit({ key: tab.key, event });
  }

  /** `Delete` on a focused menu item; focus then moves to the item now in its place. */
  protected onDeleteKey(tab: AndesTabsMoreTab, event: Event): void {
    if (!tab.removable) {
      return;
    }
    event.preventDefault();
    const index = this.navigation.activeIndex();
    this.remove.emit({ key: tab.key, event });
    afterNextRender(
      () => {
        const count = this.navigation.items().length;
        if (count > 0) {
          this.navigation.focusItem(Math.min(Math.max(index, 0), count - 1));
        }
      },
      { injector: this.injector },
    );
  }
}
