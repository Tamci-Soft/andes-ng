import { AndesListNavigation } from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';

import {
  andesCommandMatch,
  andesCommandSegments,
  type AndesCommandSegment,
} from './command-score';
import { andesCommandShortcutKeys } from './command-keys';
import { AndesCommandOption } from './command-option';
import { ANDES_COMMAND } from './command-token';
import {
  andesCommandIsGroup,
  andesCommandIsSeparator,
  type AndesCommandEntry,
  type AndesCommandFilter,
  type AndesCommandItem,
  type AndesCommandItemContext,
  type AndesCommandSelectEvent,
} from './command-types';

/** A visible item: the item, how it matched and what to show. */
export interface AndesCommandItemRow {
  readonly kind: 'item';
  readonly key: string;
  readonly item: AndesCommandItem;
  readonly score: number;
  readonly segments: readonly AndesCommandSegment[];
  readonly keys: readonly string[];
}

export interface AndesCommandGroupRow {
  readonly kind: 'group';
  readonly key: string;
  readonly heading: string;
  readonly headingId: string;
  readonly items: readonly AndesCommandItemRow[];
  readonly score: number;
}

export interface AndesCommandSeparatorRow {
  readonly kind: 'separator';
  readonly key: string;
}

export type AndesCommandRow =
  AndesCommandItemRow | AndesCommandGroupRow | AndesCommandSeparatorRow;

let nextId = 0;
/**
 * Stamped on every row of a freshly computed list, so the rows are created anew whenever the
 * list changes. The list navigation orders its items as they register, so rows that were only
 * moved around (sorted by score) would keep a stale order and arrow keys would jump about.
 */
let generation = 0;

/**
 * A searchable list of commands: a search box over items grouped under headings, filtered and
 * ranked as you type, with keyboard navigation that keeps focus in the search box.
 *
 * ```html
 * <andes-command [items]="items" (itemSelected)="run($event.item)" />
 * ```
 *
 * `items` is a list of entries: items (`value`, `label`, `keywords`, `icon`, `shortcut`,
 * `disabled`), groups (`heading` and `items`) and separators. Typing filters them with a fuzzy
 * match (every word of the query has to match, accents and case are ignored, "gh" finds "GitHub
 * Home"), ranks the best first and highlights what matched. Set `shouldFilter` to `false` when
 * the server filters: the list is shown as given while `search` still reports what was typed.
 *
 * An item with `children` opens a nested page; `pages` is the stack of the items opened so far.
 * Backspace in an empty search box (or Escape) goes back one page.
 *
 * ## Keyboard
 *
 * Focus stays in the search box. `ArrowDown`/`ArrowUp` move through the items (wrapping,
 * unless `loop` is off, and skipping disabled ones), `Home`/`End` or `Meta+ArrowUp`/`Down` jump
 * to the ends, `Enter` selects. The list is announced as a combobox with
 * `aria-activedescendant` pointing at the active row.
 */
@Component({
  selector: 'andes-command',
  imports: [NgTemplateOutlet, AndesCommandOption],
  templateUrl: './command.html',
  styleUrl: './command.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AndesListNavigation,
    { provide: ANDES_COMMAND, useExisting: forwardRef(() => AndesCommand) },
  ],
})
export class AndesCommand {
  private readonly navigation = inject(AndesListNavigation);
  private readonly inputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly listRef =
    viewChild.required<ElementRef<HTMLElement>>('list');

  /** The entries of the root page: items, groups and separators. */
  readonly items = input<readonly AndesCommandEntry[]>([]);
  /**
   * The nested pages that are open, outermost first (each is the item that opened it). Two-way
   * bindable: set it to open a page from code, or clear it to go back to the root.
   */
  readonly pages = model<readonly AndesCommandItem[]>([]);
  /** What is typed in the search box. Two-way bindable. */
  readonly search = model('');
  /** The `value` of the active item. Two-way bindable. */
  readonly value = model<string | null>(null);

  /**
   * Filter and rank by the search. Turn it off when the list is already filtered (server-side):
   * it is shown as given, in the order given.
   */
  readonly shouldFilter = input(true, { transform: booleanAttribute });
  /**
   * Replaces the built-in scoring: return `0` to hide an item, or a score to rank it (higher
   * first). Matches in the label are still highlighted.
   */
  readonly filter = input<AndesCommandFilter | null | undefined>(undefined);
  /** Wrap from the last item to the first and back. Default `true`. */
  readonly loop = input(true, { transform: booleanAttribute });
  /** Show a loading row (and mark the list busy) while results are on their way. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Highlight the part of each label the search matched. Default `true`. */
  readonly highlight = input(true, { transform: booleanAttribute });
  /** Also move with Ctrl+N / Ctrl+J (next) and Ctrl+P / Ctrl+K (previous). */
  readonly vimBindings = input(false, { transform: booleanAttribute });
  /** Focus the search box when the command first renders. Default `true`. */
  readonly autoFocus = input(true, { transform: booleanAttribute });

  readonly placeholder = input('Type a command or search…');
  readonly emptyText = input('No results found.');
  readonly loadingText = input('Loading…');
  /** The accessible name of the search box and the list. */
  readonly label = input('Command menu');
  /** The accessible name of the button that leaves a nested page. */
  readonly backLabel = input('Back');
  /** What assistive tech hears as the results change. */
  readonly resultsLabel = input<(count: number) => string>((count) =>
    count === 1 ? '1 result' : `${count} results`,
  );
  /** Custom markup for the content of a row. */
  readonly itemTemplate = input<
    TemplateRef<AndesCommandItemContext> | null | undefined
  >(undefined);

  /** An item was selected (an item that opens a page is not "selected", the page opens). */
  readonly itemSelected = output<AndesCommandSelectEvent>();

  protected readonly listId = `andes-command-list-${nextId++}`;
  private readonly headingPrefix = `andes-command-heading-${nextId++}`;

  /** @internal */
  readonly activeDescendantId = this.navigation.activeDescendantId;

  protected readonly placeholderText = computed(
    () => this.pages().at(-1)?.placeholder ?? this.placeholder(),
  );

  /** The entries of the page being shown. */
  private readonly entries = computed<readonly AndesCommandEntry[]>(
    () => this.pages().at(-1)?.children ?? this.items(),
  );

  private readonly filtering = computed(
    () => this.shouldFilter() && this.search().trim() !== '',
  );

  /** What is shown: filtered, ranked and cut into highlight segments. */
  protected readonly rows = computed<readonly AndesCommandRow[]>(() => {
    const stamp = ++generation;
    const search = this.search().trim();
    const filtering = this.filtering();
    const highlight = this.highlight();
    const custom = this.filter();

    const itemRow = (
      item: AndesCommandItem,
      index: string,
    ): AndesCommandItemRow | null => {
      const label = item.label ?? item.value;
      const keywords = [
        ...(item.keywords ?? []),
        ...(item.description ? [item.description] : []),
        ...(item.label ? [item.value] : []),
      ];
      let score = 1;
      let ranges: readonly (readonly [number, number])[] = [];
      if (filtering) {
        const match = andesCommandMatch(label, search, keywords);
        score = custom ? custom(item, search) : match.score;
        ranges = match.ranges;
      }
      if (filtering && !(score > 0)) {
        return null;
      }
      return {
        kind: 'item',
        key: `${stamp}:${index}:${item.value}`,
        item,
        score,
        segments: andesCommandSegments(
          label,
          filtering && highlight ? ranges : [],
        ),
        keys: andesCommandShortcutKeys(item.shortcut),
      };
    };

    const units: { row: AndesCommandRow; score: number; order: number }[] = [];
    this.entries().forEach((entry, order) => {
      if (andesCommandIsSeparator(entry)) {
        if (!filtering) {
          units.push({
            row: {
              kind: 'separator',
              key: `${stamp}:sep:${entry.key ?? order}`,
            },
            score: 0,
            order,
          });
        }
        return;
      }
      if (andesCommandIsGroup(entry)) {
        let children = entry.items
          .map((item, i) => itemRow(item, `${order}.${i}`))
          .filter((row): row is AndesCommandItemRow => row !== null);
        if (children.length === 0) {
          return;
        }
        if (filtering) {
          children = children
            .map((row, i) => ({ row, i }))
            .sort((a, b) => b.row.score - a.row.score || a.i - b.i)
            .map(({ row }) => row);
        }
        const key = entry.key ?? `${order}`;
        const score = Math.max(...children.map((row) => row.score));
        units.push({
          row: {
            kind: 'group',
            key: `${stamp}:group:${key}`,
            heading: entry.heading,
            headingId: `${this.headingPrefix}-${key}`,
            items: children,
            score,
          },
          score,
          order,
        });
        return;
      }
      const row = itemRow(entry, `${order}`);
      if (row) {
        units.push({ row, score: row.score, order });
      }
    });

    if (filtering) {
      units.sort((a, b) => b.score - a.score || a.order - b.order);
    }
    return units.map((unit) => unit.row);
  });

  protected readonly itemCount = computed(() =>
    this.rows().reduce(
      (count, row) =>
        count +
        (row.kind === 'item' ? 1 : row.kind === 'group' ? row.items.length : 0),
      0,
    ),
  );

  protected readonly hasItems = computed(() => this.itemCount() > 0);

  protected readonly announcement = computed(() => {
    if (this.loading()) {
      return this.loadingText();
    }
    if (!this.hasItems()) {
      return this.emptyText();
    }
    return this.search().trim() ? this.resultsLabel()(this.itemCount()) : '';
  });

  private lastSearch: string | null = null;

  constructor() {
    this.navigation.configure({
      orientation: 'vertical',
      focusMode: 'active-descendant',
      homeAndEnd: true,
      // Typed characters are search text, not a list shortcut.
      typeahead: false,
    });
    // Builds the key manager now, outside any reactive context (see AndesCombobox).
    this.navigation.clearActive();

    effect(() => {
      this.navigation.configure({ wrap: this.loop() });
    });

    afterNextRender(() => {
      if (this.autoFocus()) {
        this.focus();
      }
    });

    // Rows are created anew whenever the list changes, so the active row is chosen again each
    // time: the first one after a new search, otherwise the one the `value` names (when it is
    // still there) or the first.
    effect(() => {
      const registered = this.navigation.items();
      const search = this.search();
      untracked(() => {
        const searchChanged = search !== this.lastSearch;
        this.lastSearch = search;
        if (registered.length === 0) {
          this.navigation.clearActive();
          return;
        }
        const options = registered.filter(
          (item): item is AndesCommandOption =>
            item instanceof AndesCommandOption && !item.isDisabled(),
        );
        const wanted = searchChanged
          ? undefined
          : options.find((item) => item.item().value === this.value());
        const target = wanted ?? options[0];
        if (searchChanged) {
          this.listRef().nativeElement.scrollTop = 0;
        }
        if (target) {
          this.navigation.focusItem(target);
        } else {
          this.navigation.clearActive();
        }
      });
    });

    // The active row is the `value`.
    effect(() => {
      const active = this.navigation.activeItem();
      const next =
        active instanceof AndesCommandOption ? active.item().value : null;
      untracked(() => {
        if (this.value() !== next) {
          this.value.set(next);
        }
      });
    });

    // A `value` written from outside moves the active row.
    effect(() => {
      const value = this.value();
      const registered = this.navigation.items();
      untracked(() => {
        if (value === null) {
          return;
        }
        const active = this.navigation.activeItem();
        if (
          active instanceof AndesCommandOption &&
          active.item().value === value
        ) {
          return;
        }
        const target = registered.find(
          (item) =>
            item instanceof AndesCommandOption &&
            item.item().value === value &&
            !item.isDisabled(),
        );
        if (target) {
          this.navigation.focusItem(target);
        }
      });
    });
  }

  /** Focuses the search box. */
  focus(options?: FocusOptions): void {
    this.inputRef().nativeElement.focus(options);
  }

  /** Leaves the current nested page; a no-op on the root page. */
  goBack(): void {
    if (this.pages().length === 0) {
      return;
    }
    this.pages.update((pages) => pages.slice(0, -1));
    this.search.set('');
    this.focus();
  }

  /** Back to the root page with an empty search. */
  reset(): void {
    this.pages.set([]);
    this.search.set('');
  }

  /**
   * Selects an item as Enter or a click does: opens its nested page if it has one, otherwise
   * runs its `action` and emits `itemSelected`. A disabled item does nothing.
   */
  selectItem(item: AndesCommandItem): void {
    if (item.disabled) {
      return;
    }
    if (item.children) {
      this.pages.update((pages) => [...pages, item]);
      this.search.set('');
      this.focus();
      return;
    }
    item.action?.(item);
    this.itemSelected.emit({ item, pages: this.pages() });
  }

  protected isTemplate(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef;
  }

  protected onInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

    if (
      this.vimBindings() &&
      event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const next = event.key === 'n' || event.key === 'j';
      const previous = event.key === 'p' || event.key === 'k';
      if (next || previous) {
        event.preventDefault();
        if (next) {
          this.navigation.focusNext();
        } else {
          this.navigation.focusPrevious();
        }
        return;
      }
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (event.metaKey) {
          event.preventDefault();
          if (event.key === 'ArrowDown') {
            this.navigation.focusLast();
          } else {
            this.navigation.focusFirst();
          }
          return;
        }
        if (this.navigation.items().length > 0) {
          event.preventDefault();
          this.navigation.onKeydown(event);
        }
        return;
      case 'Home':
      case 'End':
        // Jump to the first or last item; with a modifier they stay with the caret.
        if (
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          if (this.navigation.items().length > 0) {
            event.preventDefault();
            this.navigation.onKeydown(event);
          }
        }
        return;
      case 'Enter': {
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
          return;
        }
        const active = this.navigation.activeItem();
        if (active instanceof AndesCommandOption) {
          event.preventDefault();
          this.selectItem(active.item());
        }
        return;
      }
      case 'Backspace':
        if (
          this.search() === '' &&
          this.pages().length > 0 &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          this.goBack();
        }
        return;
      case 'Escape':
        // Leaves a nested page; with none open the event goes on (a dialog closes on it).
        if (this.pages().length > 0) {
          event.preventDefault();
          event.stopPropagation();
          this.goBack();
        }
    }
  }
}
