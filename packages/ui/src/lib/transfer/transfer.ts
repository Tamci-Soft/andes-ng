import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  type Signal,
  TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

/** One entry of `dataSource`. `data` is free for the `render` template to read. */
export interface AndesTransferItem {
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly data?: unknown;
}

/** Names a list: the one items come from (`source`) or the one they are moved into (`target`). */
export type AndesTransferDirection = 'source' | 'target';

export type AndesTransferStatus = 'error' | 'warning';

/** Payload of `transferred`. `direction` is the list the items were moved INTO. */
export interface AndesTransferChange {
  /** The new `targetKeys`. */
  readonly targetKeys: readonly string[];
  readonly direction: AndesTransferDirection;
  /** The keys that moved, in list order. */
  readonly moveKeys: readonly string[];
}

/** Payload of `selectionChange`: the selected keys of each list. */
export interface AndesTransferSelection {
  readonly source: readonly string[];
  readonly target: readonly string[];
}

export interface AndesTransferSearch {
  readonly direction: AndesTransferDirection;
  readonly value: string;
}

export interface AndesTransferScroll {
  readonly direction: AndesTransferDirection;
  readonly event: Event;
}

/** Context of the `render` template: `let-item`, plus `direction` and `selected`. */
export interface AndesTransferItemContext {
  readonly $implicit: AndesTransferItem;
  readonly direction: AndesTransferDirection;
  readonly selected: boolean;
}

/** Context of the `footer` template: `let-direction`, plus the list's visible items and selection. */
export interface AndesTransferFooterContext {
  readonly $implicit: AndesTransferDirection;
  readonly direction: AndesTransferDirection;
  readonly items: readonly AndesTransferItem[];
  readonly selectedKeys: readonly string[];
}

/** Context of the `empty` template: `let-direction`, plus the active search text. */
export interface AndesTransferEmptyContext {
  readonly $implicit: AndesTransferDirection;
  readonly direction: AndesTransferDirection;
  readonly search: string;
}

/** Decides whether `item` shows for the search `query` in the list named by `direction`. */
export type AndesTransferFilterOption = (
  query: string,
  item: AndesTransferItem,
  direction: AndesTransferDirection,
) => boolean;

export interface AndesTransferPagination {
  /** Items per page; 10 by default. */
  readonly pageSize?: number;
}

/** What the live region announces after a move. */
export interface AndesTransferAnnouncement {
  readonly count: number;
  readonly direction: AndesTransferDirection;
  /** Title of the list the items went into. */
  readonly title: string;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_JUMP = 10;
const INVISIBLE_TOGGLE = String.fromCharCode(0x200b);

let nextId = 0;

/** Everything one of the two lists needs, as signals derived from the transfer's state. */
interface ListState {
  readonly direction: AndesTransferDirection;
  readonly search: WritableSignal<string>;
  readonly page: WritableSignal<number>;
  readonly active: WritableSignal<string | null>;
  readonly items: Signal<readonly AndesTransferItem[]>;
  readonly filtered: Signal<readonly AndesTransferItem[]>;
  readonly pageItems: Signal<readonly AndesTransferItem[]>;
  readonly pageCount: Signal<number>;
  readonly currentPage: Signal<number>;
  readonly selectable: Signal<readonly AndesTransferItem[]>;
  readonly selectedKeys: Signal<readonly string[]>;
  readonly allChecked: Signal<boolean>;
  readonly someChecked: Signal<boolean>;
  readonly countText: Signal<string>;
  readonly title: Signal<string>;
}

@Component({
  selector: 'andes-transfer',
  imports: [NgTemplateOutlet],
  templateUrl: './transfer.html',
  styleUrl: './transfer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesTransfer),
      multi: true,
    },
  ],
  host: {
    '(focusout)': 'onFocusOut($event)',
    '[attr.id]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesTransfer implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Every item, in display order. Items whose key is in `targetKeys` live in the target list. */
  readonly dataSource = input<readonly AndesTransferItem[]>([]);
  /** Keys of the items in the target list, in the order that list shows them. Two-way. */
  readonly targetKeys = model<readonly string[]>([]);
  /** Keys of the selected items in both lists. Two-way. */
  readonly selectedKeys = model<readonly string[]>([]);

  /** Titles of the source and target lists. */
  readonly titles = input<readonly [string, string]>(['Available', 'Selected']);
  /**
   * Text for the two move buttons (source to target first). Shown beside the arrow icons; the
   * buttons are icon-only, named by `titles`, when omitted.
   */
  readonly operations = input<readonly [string, string] | undefined>(undefined);
  readonly showSearch = input(false, { transform: booleanAttribute });
  readonly searchPlaceholder = input('Search');
  /** Replaces the default match (case-insensitive containment in the title or description). */
  readonly filterOption = input<AndesTransferFilterOption | undefined>(
    undefined,
  );
  /** Items in the target list get a remove button instead of a checkbox; there is no way to select them. */
  readonly oneWay = input(false, { transform: booleanAttribute });
  /** Pages each list; pass `{ pageSize }` to choose the size (10 by default). */
  readonly pagination = input<boolean | AndesTransferPagination>(false);
  readonly showSelectAll = input(true, { transform: booleanAttribute });
  readonly status = input<AndesTransferStatus | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Draws each item in place of its title and description. */
  readonly render = input<TemplateRef<AndesTransferItemContext> | undefined>(
    undefined,
  );
  /** Drawn at the bottom of each list. */
  readonly footer = input<TemplateRef<AndesTransferFooterContext> | undefined>(
    undefined,
  );
  /** Replaces the text shown when a list has nothing to show. */
  readonly empty = input<TemplateRef<AndesTransferEmptyContext> | undefined>(
    undefined,
  );
  readonly emptyText = input('No data');
  readonly noMatchText = input('No results');
  readonly itemUnit = input('item');
  readonly itemsUnit = input('items');
  readonly removeLabel = input('Remove');
  readonly previousPageLabel = input('Previous page');
  readonly nextPageLabel = input('Next page');
  readonly clearSearchLabel = input('Clear search');
  /** Builds the text a screen reader hears after a move. */
  readonly announce = input<
    ((info: AndesTransferAnnouncement) => string) | undefined
  >(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  /** Items were moved between the lists. */
  readonly transferred = output<AndesTransferChange>();
  /** The selection changed in either list. */
  readonly selectionChange = output<AndesTransferSelection>();
  /** The search text of a list changed. */
  readonly searched = output<AndesTransferSearch>();
  /** A list was scrolled. */
  readonly scrolled = output<AndesTransferScroll>();

  private readonly disabledByForm = signal(false);
  protected readonly uid = `andes-transfer-${nextId++}`;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  private readonly itemByKey = computed(
    () => new Map(this.dataSource().map((item) => [item.key, item])),
  );
  private readonly indexByKey = computed(
    () => new Map(this.dataSource().map((item, index) => [item.key, index])),
  );
  private readonly targetSet = computed(() => new Set(this.targetKeys()));
  private readonly selectedSet = computed(() => new Set(this.selectedKeys()));

  private readonly sourceItems = computed(() =>
    this.dataSource().filter((item) => !this.targetSet().has(item.key)),
  );
  private readonly targetItems = computed(() => {
    const byKey = this.itemByKey();
    const items: AndesTransferItem[] = [];
    for (const key of this.targetKeys()) {
      const item = byKey.get(key);
      if (item) {
        items.push(item);
      }
    }
    return items;
  });

  private readonly pageSize = computed(() => {
    const config = this.pagination();
    if (!config) {
      return 0;
    }
    const size = typeof config === 'object' ? config.pageSize : undefined;
    return size && size > 0 ? Math.floor(size) : DEFAULT_PAGE_SIZE;
  });

  protected readonly paged = computed(() => this.pageSize() > 0);

  /** The two lists, source first. */
  protected readonly lists: readonly ListState[] = [
    this.createList('source'),
    this.createList('target'),
  ];

  private readonly announcement = signal({ text: '', count: 0 });
  protected readonly liveText = computed(() => {
    const { text, count } = this.announcement();
    // Alternating an invisible character makes a repeated message count as a change.
    return count % 2 ? text + INVISIBLE_TOGGLE : text;
  });

  /** Whether the forward / back buttons can do anything right now. */
  protected readonly canMoveForward = computed(
    () => !this.isDisabled() && this.movable('source').length > 0,
  );
  protected readonly canMoveBack = computed(
    () => !this.isDisabled() && this.movable('target').length > 0,
  );

  protected readonly rootClasses = computed(() =>
    clsx(
      'andes-transfer',
      this.isDisabled() && 'andes-transfer--disabled',
      this.oneWay() && 'andes-transfer--one-way',
      this.invalid() && 'andes-transfer--error',
      this.status() === 'warning' &&
        !this.invalid() &&
        'andes-transfer--warning',
    ),
  );

  protected readonly invalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );

  /** Kept for the `Shift` range: the item a range starts from, per list. */
  private readonly anchors: Record<AndesTransferDirection, string | null> = {
    source: null,
    target: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: readonly string[]) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: readonly string[] | null | undefined): void {
    this.targetKeys.set(Array.isArray(value) ? [...value] : []);
  }

  registerOnChange(fn: (value: readonly string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  /** Moves every selected item of the source list into the target list, as the forward button does. */
  moveSelectedToTarget(): void {
    this.move('target');
  }

  /** Moves every selected item of the target list back to the source list. */
  moveSelectedToSource(): void {
    if (!this.oneWay()) {
      this.move('source');
    }
  }

  /** Moves the given keys into the named list, whichever list they are in. */
  moveKeys(keys: readonly string[], direction: AndesTransferDirection): void {
    this.applyMove(keys, direction);
  }

  /** Selects every selectable item of a list that matches its search. */
  selectAll(direction: AndesTransferDirection): void {
    this.setListSelection(direction, this.list(direction).selectable(), true);
  }

  /** Clears the selection of one list, or both. */
  clearSelection(direction?: AndesTransferDirection): void {
    for (const state of this.lists) {
      if (!direction || direction === state.direction) {
        this.setListSelection(state.direction, state.items(), false);
      }
    }
  }

  /** Focuses the item list of a given side. */
  focusList(direction: AndesTransferDirection): void {
    this.host.nativeElement
      .querySelector<HTMLElement>(`[data-list="${direction}"] [role="listbox"]`)
      ?.focus();
  }

  protected optionId(
    item: AndesTransferItem,
    direction: AndesTransferDirection,
  ) {
    return `${this.uid}-${direction}-${this.indexByKey().get(item.key) ?? 0}`;
  }

  protected titleId(direction: AndesTransferDirection): string {
    return `${this.uid}-${direction}-title`;
  }

  protected activeDescendant(list: ListState): string | null {
    const key = list.active();
    const item = key === null ? undefined : this.itemByKey().get(key);
    return item && list.pageItems().includes(item)
      ? this.optionId(item, list.direction)
      : null;
  }

  protected isSelected(key: string): boolean {
    return this.selectedSet().has(key);
  }

  protected isItemDisabled(item: AndesTransferItem): boolean {
    return this.isDisabled() || item.disabled === true;
  }

  protected moveLabel(direction: AndesTransferDirection): string {
    const operations = this.operations();
    if (operations) {
      return operations[direction === 'target' ? 0 : 1];
    }
    const titles = this.titles();
    return direction === 'target'
      ? `Move selected to ${titles[1]}`
      : `Move selected to ${titles[0]}`;
  }

  protected emptyContext(list: ListState): AndesTransferEmptyContext {
    return {
      $implicit: list.direction,
      direction: list.direction,
      search: list.search(),
    };
  }

  protected footerContext(list: ListState): AndesTransferFooterContext {
    return {
      $implicit: list.direction,
      direction: list.direction,
      items: list.filtered(),
      selectedKeys: list.selectedKeys(),
    };
  }

  protected itemContext(
    item: AndesTransferItem,
    list: ListState,
  ): AndesTransferItemContext {
    return {
      $implicit: item,
      direction: list.direction,
      selected: this.isSelected(item.key),
    };
  }

  protected onSearchInput(list: ListState, value: string): void {
    list.search.set(value);
    list.page.set(1);
    this.searched.emit({ direction: list.direction, value });
  }

  protected clearSearch(list: ListState, input: HTMLInputElement): void {
    input.value = '';
    this.onSearchInput(list, '');
    input.focus();
  }

  protected onSearchKeydown(
    event: KeyboardEvent,
    list: ListState,
    input: HTMLInputElement,
  ): void {
    if (event.key === 'Escape' && input.value !== '') {
      event.preventDefault();
      event.stopPropagation();
      this.clearSearch(list, input);
    }
  }

  protected onScroll(event: Event, list: ListState): void {
    this.scrolled.emit({ direction: list.direction, event });
  }

  protected goToPage(list: ListState, page: number): void {
    list.page.set(Math.min(Math.max(1, page), list.pageCount()));
  }

  protected toggleAll(list: ListState): void {
    if (this.isDisabled()) {
      return;
    }
    this.setListSelection(
      list.direction,
      list.selectable(),
      !list.allChecked(),
    );
  }

  /** One handler on the list: finds the clicked row through its `data-index`. */
  protected onListClick(event: MouseEvent, list: ListState): void {
    const row = (event.target as Element | null)?.closest<HTMLElement>(
      '[data-slot="transfer-item"]',
    );
    const item = row
      ? list.pageItems()[Number(row.dataset['index'])]
      : undefined;
    if (item) {
      this.onItemClick(event, list, item);
    }
  }

  private onItemClick(
    event: MouseEvent,
    list: ListState,
    item: AndesTransferItem,
  ): void {
    if (this.isItemDisabled(item) || this.isRemovable(list)) {
      return;
    }
    list.active.set(item.key);
    if (event.shiftKey && this.anchors[list.direction] !== null) {
      this.selectRange(list, this.anchors[list.direction], item.key);
    } else {
      this.toggleItem(list, item);
    }
  }

  protected onRemove(event: Event, item: AndesTransferItem): void {
    event.stopPropagation();
    if (!this.isItemDisabled(item)) {
      this.applyMove([item.key], 'source');
    }
  }

  protected isRemovable(list: ListState): boolean {
    return this.oneWay() && list.direction === 'target';
  }

  protected onListFocus(list: ListState): void {
    if (
      list.active() === null ||
      !list.filtered().some((i) => i.key === list.active())
    ) {
      const first =
        list.pageItems().find((i) => this.isSelected(i.key) && !i.disabled) ??
        list.pageItems().find((i) => !i.disabled);
      list.active.set(first?.key ?? null);
    }
  }

  protected onListKeydown(event: KeyboardEvent, list: ListState): void {
    if (this.isDisabled() || event.isComposing) {
      return;
    }
    if (list.active() === null) {
      this.onListFocus(list);
    }
    const enabled = list.filtered().filter((item) => !item.disabled);
    const current = enabled.findIndex((item) => item.key === list.active());
    const key = event.key;
    const extend = event.shiftKey;
    let target: number | null = null;

    if (key === 'ArrowDown') {
      target = Math.min(enabled.length - 1, current + 1);
    } else if (key === 'ArrowUp') {
      target = Math.max(0, current < 0 ? 0 : current - 1);
    } else if (key === 'PageDown') {
      target = Math.min(enabled.length - 1, Math.max(0, current) + PAGE_JUMP);
    } else if (key === 'PageUp') {
      target = Math.max(0, current - PAGE_JUMP);
    } else if (key === 'Home') {
      target = 0;
    } else if (key === 'End') {
      target = enabled.length - 1;
    } else if (key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      const item = enabled[current];
      if (item && !this.isRemovable(list)) {
        if (extend && this.anchors[list.direction] !== null) {
          this.selectRange(list, this.anchors[list.direction], item.key);
        } else {
          this.toggleItem(list, item);
        }
      }
      return;
    } else if (
      (key === 'a' || key === 'A') &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      if (!this.isRemovable(list)) {
        this.setListSelection(list.direction, list.selectable(), true);
      }
      return;
    } else if (key === 'Enter') {
      event.preventDefault();
      this.moveFromKeyboard(list, enabled[current]);
      return;
    } else {
      return;
    }

    event.preventDefault();
    const next = enabled[target];
    if (!next) {
      return;
    }
    if (extend && !this.isRemovable(list)) {
      const anchor = this.anchors[list.direction] ?? list.active() ?? next.key;
      this.anchors[list.direction] = anchor;
      this.selectRange(list, anchor, next.key);
    }
    this.activate(list, next);
  }

  private moveFromKeyboard(
    list: ListState,
    activeItem: AndesTransferItem | undefined,
  ): void {
    if (this.isRemovable(list)) {
      if (activeItem) {
        this.applyMove([activeItem.key], 'source');
      }
      return;
    }
    const into: AndesTransferDirection =
      list.direction === 'source' ? 'target' : 'source';
    if (list.selectedKeys().length === 0 && activeItem) {
      this.applyMove([activeItem.key], into);
      return;
    }
    this.move(into);
  }

  private activate(list: ListState, item: AndesTransferItem): void {
    list.active.set(item.key);
    const size = this.pageSize();
    if (size > 0) {
      const index = list.filtered().indexOf(item);
      list.page.set(Math.floor(index / size) + 1);
    }
    queueMicrotask(() => {
      this.host.nativeElement
        .querySelector<HTMLElement>(
          `[id="${this.optionId(item, list.direction)}"]`,
        )
        ?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  private toggleItem(list: ListState, item: AndesTransferItem): void {
    this.anchors[list.direction] = item.key;
    this.setListSelection(list.direction, [item], !this.isSelected(item.key));
  }

  /** Selects the items between two keys of the visible list, both included. */
  private selectRange(
    list: ListState,
    fromKey: string | null,
    toKey: string,
  ): void {
    const items = list.filtered();
    const from = items.findIndex((item) => item.key === (fromKey ?? toKey));
    const to = items.findIndex((item) => item.key === toKey);
    if (from < 0 || to < 0) {
      return;
    }
    const slice = items
      .slice(Math.min(from, to), Math.max(from, to) + 1)
      .filter((item) => !item.disabled);
    this.setListSelection(list.direction, slice, true);
  }

  private setListSelection(
    direction: AndesTransferDirection,
    items: readonly AndesTransferItem[],
    selected: boolean,
  ): void {
    if (this.isDisabled()) {
      return;
    }
    const keys = new Set(
      items.filter((item) => !item.disabled).map((item) => item.key),
    );
    const current = this.selectedKeys();
    const next = selected
      ? [...current, ...[...keys].filter((key) => !this.selectedSet().has(key))]
      : current.filter((key) => !keys.has(key));
    if (
      next.length === current.length &&
      next.every((key, i) => key === current[i])
    ) {
      return;
    }
    this.commitSelection(next);
  }

  private commitSelection(next: readonly string[]): void {
    this.selectedKeys.set(next);
    this.selectionChange.emit({
      source: this.list('source').selectedKeys(),
      target: this.list('target').selectedKeys(),
    });
  }

  /** The keys of a list's selected items that can actually move. */
  private movable(direction: AndesTransferDirection): readonly string[] {
    return this.list(direction)
      .items()
      .filter((item) => this.isSelected(item.key) && !item.disabled)
      .map((item) => item.key);
  }

  private move(into: AndesTransferDirection): void {
    if (this.isDisabled()) {
      return;
    }
    this.applyMove(this.movable(into === 'target' ? 'source' : 'target'), into);
  }

  private applyMove(
    requested: readonly string[],
    into: AndesTransferDirection,
  ): void {
    if (this.isDisabled()) {
      return;
    }
    const inTarget = this.targetSet();
    const byKey = this.itemByKey();
    const moveKeys = requested.filter((key) => {
      const item = byKey.get(key);
      return (
        item !== undefined &&
        !item.disabled &&
        inTarget.has(key) === (into === 'source')
      );
    });
    if (moveKeys.length === 0) {
      return;
    }
    const moved = new Set(moveKeys);
    const targetKeys =
      into === 'target'
        ? [...this.targetKeys(), ...moveKeys]
        : this.targetKeys().filter((key) => !moved.has(key));
    this.targetKeys.set(targetKeys);
    this.onChange(targetKeys);
    this.transferred.emit({ targetKeys, direction: into, moveKeys });

    const remaining = this.selectedKeys().filter((key) => !moved.has(key));
    if (remaining.length !== this.selectedKeys().length) {
      this.commitSelection(remaining);
    }
    for (const state of this.lists) {
      this.anchors[state.direction] = null;
      if (state.active() !== null && moved.has(state.active() as string)) {
        state.active.set(null);
      }
    }

    const title = this.titles()[into === 'target' ? 1 : 0];
    const info = { count: moveKeys.length, direction: into, title };
    const unit = moveKeys.length === 1 ? this.itemUnit() : this.itemsUnit();
    this.announcement.update(({ count }) => ({
      text:
        this.announce()?.(info) ??
        `${moveKeys.length} ${unit} moved to ${title}`,
      count: count + 1,
    }));
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.nativeElement.contains(next)) {
      this.onTouched();
    }
  }

  private list(direction: AndesTransferDirection): ListState {
    return direction === 'source' ? this.lists[0] : this.lists[1];
  }

  private matches(
    query: string,
    item: AndesTransferItem,
    direction: AndesTransferDirection,
  ): boolean {
    const custom = this.filterOption();
    if (custom) {
      return custom(query, item, direction);
    }
    const needle = query.trim().toLowerCase();
    return (
      item.title.toLowerCase().includes(needle) ||
      (item.description ?? '').toLowerCase().includes(needle)
    );
  }

  private createList(direction: AndesTransferDirection): ListState {
    const search = signal('');
    const page = signal(1);
    const active = signal<string | null>(null);
    const items = direction === 'source' ? this.sourceItems : this.targetItems;
    const filtered = computed(() => {
      const query = search();
      return query.trim() === ''
        ? items()
        : items().filter((item) => this.matches(query, item, direction));
    });
    const pageCount = computed(() => {
      const size = this.pageSize();
      return size > 0 ? Math.max(1, Math.ceil(filtered().length / size)) : 1;
    });
    const currentPage = computed(() => Math.min(page(), pageCount()));
    const pageItems = computed(() => {
      const size = this.pageSize();
      if (size === 0) {
        return filtered();
      }
      const start = (currentPage() - 1) * size;
      return filtered().slice(start, start + size);
    });
    const selectable = computed(() =>
      this.isDisabled() ? [] : filtered().filter((item) => !item.disabled),
    );
    const selectedKeys = computed(() =>
      items()
        .filter((item) => this.selectedSet().has(item.key))
        .map((item) => item.key),
    );
    const allChecked = computed(() => {
      const options = selectable();
      return (
        options.length > 0 &&
        options.every((item) => this.selectedSet().has(item.key))
      );
    });
    const someChecked = computed(
      () =>
        !allChecked() &&
        selectable().some((item) => this.selectedSet().has(item.key)),
    );
    const countText = computed(() => {
      const total = items().length;
      const chosen = selectedKeys().length;
      const unit = total === 1 ? this.itemUnit() : this.itemsUnit();
      return `${chosen > 0 ? `${chosen}/` : ''}${total} ${unit}`;
    });
    const title = computed(() => this.titles()[direction === 'source' ? 0 : 1]);
    return {
      direction,
      search,
      page,
      active,
      items,
      filtered,
      pageItems,
      pageCount,
      currentPage,
      selectable,
      selectedKeys,
      allChecked,
      someChecked,
      countText,
      title,
    };
  }
}
