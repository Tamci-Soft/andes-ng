import { NgTemplateOutlet } from '@angular/common';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import {
  afterEveryRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  numberAttribute,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

export type AndesListSize = 'sm' | 'md' | 'lg';
export type AndesListItemLayout = 'horizontal' | 'vertical';
export type AndesListSelectable = 'none' | 'single' | 'multiple';
export type AndesListBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** Columns per breakpoint. A missing breakpoint keeps the value of the next smaller one. */
export type AndesListColumns = Partial<Record<AndesListBreakpoint, number>>;

/** Context handed to the item template of a `dataSource` list. */
export interface AndesListItemContext<T = unknown> {
  $implicit: T;
  /** Position in the whole data source, not within the current page. */
  index: number;
}

/** Emitted when a clickable or selectable row is activated by click, Enter or Space. */
export interface AndesListActivation {
  value: unknown;
  /** Position among the rendered rows. */
  index: number;
}

/** What the list needs to know about each row. Rows register themselves on creation. */
export interface AndesListEntry {
  readonly element: HTMLElement;
  readonly value: () => unknown;
  readonly disabled: () => boolean;
}

const BREAKPOINTS: readonly AndesListBreakpoint[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'xxl',
];

function selectableAttribute(
  value: AndesListSelectable | boolean | string | null | undefined,
): AndesListSelectable {
  if (value === 'single' || value === 'multiple' || value === 'none') {
    return value;
  }
  return booleanAttribute(value) ? 'single' : 'none';
}

/**
 * A vertical collection of rows: plain, bordered, split, in a grid, selectable, virtualised.
 *
 * Compose rows with `andes-list-item` (and `andes-list-item-meta`, `andes-list-item-actions`
 * inside it), either as content or from a `dataSource` and an `itemTemplate`. Slots: `header`,
 * `footer`, `load-more` and `pagination` (the list does not depend on a pagination component:
 * it exposes `page`, `pageSize` and `total` and leaves the controls to the slot).
 */
@Component({
  selector: 'andes-list',
  imports: [
    NgTemplateOutlet,
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
  ],
  templateUrl: './list.html',
  styleUrl: './list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AndesList<T = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * An item template is usually declared outside the list, where a row could not find its
   * list through the element tree. Rendering the template with this injector makes the list
   * resolvable from the row either way.
   */
  protected readonly rowInjector = Injector.create({
    providers: [{ provide: AndesList, useValue: this }],
    parent: inject(Injector),
  });

  readonly size = input<AndesListSize>('md');
  readonly itemLayout = input<AndesListItemLayout>('horizontal');
  readonly bordered = input(false, { transform: booleanAttribute });
  /** Divider between rows. */
  readonly split = input(true, { transform: booleanAttribute });
  /** Hover feedback and keyboard activation for rows that act as a whole. */
  readonly clickable = input(false, { transform: booleanAttribute });
  /**
   * `single` or `multiple` turns the list into a listbox of options. A bare attribute means
   * `single`.
   */
  readonly selectable = input<
    AndesListSelectable,
    AndesListSelectable | boolean | string | null | undefined
  >('none', { transform: selectableAttribute });
  /** Values of the selected rows. Rows need a `value` to be selectable. */
  readonly selected = model<unknown[]>([]);
  /** Accessible name of the list. */
  readonly label = input<string | undefined>(undefined);
  readonly labelledby = input<string | undefined>(undefined);

  readonly loading = input(false, { transform: booleanAttribute });
  readonly loadingRows = input(3, {
    transform: (value: unknown) => Math.max(1, numberAttribute(value, 3)),
  });
  readonly loadingLabel = input('Loading…');

  /** Renders `itemTemplate` once per entry instead of projected rows. */
  readonly dataSource = input<readonly T[] | null | undefined>(undefined);
  readonly itemTemplate = input<
    TemplateRef<AndesListItemContext<T>> | undefined
  >(undefined);
  /** Identity of an entry across updates; defaults to the entry itself. */
  readonly trackBy = input<(index: number, item: T) => unknown>(
    (_index, item) => item,
  );

  /** Shown when there are no rows. Text or a template. */
  readonly notFoundContent = input<string | TemplateRef<unknown>>('No data');

  /** Setting `columns` lays the rows out as a grid. A number is a fixed count. */
  readonly columns = input<number | AndesListColumns | undefined>(undefined);
  /** Gap between grid cells in pixels, or `[horizontal, vertical]`. */
  readonly gutter = input<number | readonly [number, number]>(16);

  /** Current page, 1-based. Two-way. */
  readonly page = model(1);
  /**
   * Rows per page. With `dataSource` and no `total` the list slices the data itself; with a
   * `total` the data source is taken to be the current page already.
   */
  readonly pageSize = input<number | undefined>(undefined);
  readonly total = input<number | undefined>(undefined);

  /** Renders only the rows in view. Needs `dataSource`, `itemTemplate` and `itemSize`. */
  readonly virtualScroll = input(false, { transform: booleanAttribute });
  /** Row height in pixels while `virtualScroll` is on. */
  readonly itemSize = input(56, { transform: numberAttribute });
  /** Height of the scrolling area in pixels while `virtualScroll` is on. */
  readonly viewportHeight = input(400, { transform: numberAttribute });

  /** A clickable or selectable row was activated. */
  readonly itemActivated = output<AndesListActivation>();

  private readonly viewport = viewChild(CdkVirtualScrollViewport);

  private readonly registry = new Set<AndesListEntry>();
  protected readonly itemCount = signal(0);
  private readonly tabStop = signal<AndesListEntry | null>(null);

  protected readonly interactive = computed(
    () => this.clickable() || this.selectable() !== 'none',
  );

  protected readonly listRole = computed(() =>
    this.selectable() === 'none' ? 'list' : 'listbox',
  );

  /** The role of each row, read by `andes-list-item`. */
  readonly itemRole = computed(() =>
    this.selectable() === 'none' ? 'listitem' : 'option',
  );

  readonly isGrid = computed(() => this.columns() !== undefined);

  /** Entries of the current page, or null when rows are projected. */
  protected readonly pageData = computed((): readonly T[] | null => {
    const data = this.dataSource();
    if (!data) {
      return null;
    }
    const pageSize = this.pageSize();
    if (pageSize && pageSize > 0 && this.total() === undefined) {
      const start = (this.page() - 1) * pageSize;
      return data.slice(start, start + pageSize);
    }
    return data;
  });

  protected readonly pageOffset = computed(() => {
    const pageSize = this.pageSize();
    return this.dataSource() && pageSize ? (this.page() - 1) * pageSize : 0;
  });

  protected readonly isVirtual = computed(
    () => this.virtualScroll() && this.pageData() !== null,
  );

  protected readonly rowCount = computed(
    () => this.total() ?? this.dataSource()?.length ?? this.itemCount(),
  );

  protected readonly isEmpty = computed(() => {
    const data = this.pageData();
    return (
      !this.loading() && (data ? data.length === 0 : this.itemCount() === 0)
    );
  });

  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.loadingRows() }, (_, index) => index),
  );

  protected readonly notFoundText = computed(() => {
    const value = this.notFoundContent();
    return typeof value === 'string' ? value : null;
  });

  protected readonly notFoundTemplate = computed(() => {
    const value = this.notFoundContent();
    return typeof value === 'string' ? null : value;
  });

  protected readonly classes = computed(() =>
    clsx(
      'andes-list',
      `andes-list--${this.size()}`,
      `andes-list--${this.itemLayout()}`,
      this.bordered() && 'andes-list--bordered',
      this.split() && 'andes-list--split',
      this.isGrid() && 'andes-list--grid',
      this.interactive() && 'andes-list--interactive',
      this.isVirtual() && 'andes-list--virtual',
      this.loading() && 'andes-list--loading',
    ),
  );

  protected readonly gridStyle = computed((): Record<string, string> => {
    const columns = this.columns();
    if (columns === undefined) {
      return {};
    }
    const style: Record<string, string> = {};
    const gutter = this.gutter();
    const [horizontal, vertical] =
      typeof gutter === 'number' ? [gutter, gutter] : gutter;
    style['--andes-list-gutter-x'] = `${horizontal}px`;
    style['--andes-list-gutter-y'] = `${vertical}px`;

    // Every breakpoint gets a value: a missing one repeats the next smaller breakpoint.
    let previous = typeof columns === 'number' ? columns : 1;
    for (const breakpoint of BREAKPOINTS) {
      const own = typeof columns === 'number' ? columns : columns[breakpoint];
      previous = Math.max(1, Math.floor(own ?? previous));
      style[`--andes-list-columns-${breakpoint}`] = String(previous);
    }
    return style;
  });

  constructor() {
    // With a virtual window the DOM only holds some rows, so each one states where it sits in
    // the whole set (aria-posinset / aria-setsize); assistive tech then reports "3 of 5000".
    afterEveryRender(() => this.syncVirtualAria());
  }

  // --- Rows --------------------------------------------------------------------------------

  /** @internal Called by `andes-list-item`. */
  registerItem(entry: AndesListEntry): void {
    this.registry.add(entry);
    this.itemCount.set(this.registry.size);
    if (this.tabStop() === null) {
      this.tabStop.set(entry);
    }
  }

  /** @internal */
  unregisterItem(entry: AndesListEntry): void {
    this.registry.delete(entry);
    this.itemCount.set(this.registry.size);
    if (this.tabStop() === entry) {
      this.tabStop.set(null);
      queueMicrotask(() => {
        if (this.tabStop() === null) {
          this.tabStop.set(this.orderedEntries()[0] ?? null);
        }
      });
    }
  }

  /** @internal */
  isTabStop(entry: AndesListEntry): boolean {
    return this.tabStop() === entry;
  }

  /** @internal */
  setTabStop(entry: AndesListEntry): void {
    this.tabStop.set(entry);
  }

  /** @internal */
  isSelected(value: unknown): boolean {
    return (
      value !== undefined &&
      this.selected().some((item) => Object.is(item, value))
    );
  }

  /** @internal */
  activate(entry: AndesListEntry): void {
    if (!this.interactive() || entry.disabled()) {
      return;
    }
    const value = entry.value();
    const mode = this.selectable();
    if (mode !== 'none' && value !== undefined) {
      if (mode === 'single') {
        if (!this.isSelected(value)) {
          this.selected.set([value]);
        }
      } else if (this.isSelected(value)) {
        this.selected.update((items) =>
          items.filter((item) => !Object.is(item, value)),
        );
      } else {
        this.selected.update((items) => [...items, value]);
      }
    }
    this.itemActivated.emit({
      value,
      index: this.orderedEntries().indexOf(entry),
    });
  }

  private orderedEntries(): AndesListEntry[] {
    return [...this.registry].sort((a, b) =>
      a.element.compareDocumentPosition(b.element) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
    );
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) {
      return;
    }
    const entries = this.orderedEntries();
    const current = entries.findIndex(
      (entry) => entry.element === event.target,
    );
    if (current < 0) {
      return;
    }
    const enabled = (index: number) => !entries[index].disabled();
    let next = -1;
    const step = (from: number, direction: 1 | -1) => {
      for (
        let i = from + direction;
        i >= 0 && i < entries.length;
        i += direction
      ) {
        if (enabled(i)) {
          return i;
        }
      }
      return -1;
    };

    switch (event.key) {
      case 'ArrowDown':
        next = step(current, 1);
        break;
      case 'ArrowUp':
        next = step(current, -1);
        break;
      case 'Home':
        next = enabled(0) ? 0 : step(0, 1);
        break;
      case 'End':
        next = enabled(entries.length - 1)
          ? entries.length - 1
          : step(entries.length - 1, -1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activate(entries[current]);
        return;
      default:
        return;
    }

    event.preventDefault();
    if (next >= 0) {
      this.focusEntry(entries[next]);
    }
  }

  private focusEntry(entry: AndesListEntry): void {
    this.tabStop.set(entry);
    entry.element.focus();
  }

  // --- Public API --------------------------------------------------------------------------

  /** Moves focus to the nth rendered row. */
  focusItem(index: number): void {
    const entry = this.orderedEntries()[index];
    if (entry) {
      this.focusEntry(entry);
    }
  }

  /** Selects every enabled row that has a value (multiple selection only). */
  selectAll(): void {
    if (this.selectable() !== 'multiple') {
      return;
    }
    this.selected.set(
      this.orderedEntries()
        .filter((entry) => !entry.disabled() && entry.value() !== undefined)
        .map((entry) => entry.value()),
    );
  }

  clearSelection(): void {
    this.selected.set([]);
  }

  /** Scrolls the virtual window to a row. No effect without `virtualScroll`. */
  scrollToIndex(index: number, behavior: ScrollBehavior = 'auto'): void {
    this.viewport()?.scrollToIndex(index, behavior);
  }

  private syncVirtualAria(): void {
    const viewport = this.viewport();
    if (!viewport) {
      return;
    }
    const start = viewport.getRenderedRange().start;
    const setSize = this.rowCount();
    const rows = this.host.nativeElement.querySelectorAll<HTMLElement>(
      '[data-slot="list-item"]',
    );
    rows.forEach((row, index) => {
      row.setAttribute('aria-setsize', String(setSize));
      row.setAttribute('aria-posinset', String(start + index + 1));
    });
  }
}
