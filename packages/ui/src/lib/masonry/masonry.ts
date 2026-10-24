import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  TemplateRef,
  untracked,
  viewChildren,
} from '@angular/core';

import { AndesMasonryItem } from './masonry-item';
import {
  andesMasonryBreakpoint,
  andesMasonryGutterPair,
  andesMasonryLayout,
  andesMasonryResolve,
  ANDES_MASONRY_BREAKPOINT_ORDER,
  type AndesMasonryGutter,
  type AndesMasonryResponsive,
} from './masonry-layout';
import { ANDES_MASONRY, type AndesMasonryHost } from './masonry-token';

export type {
  AndesMasonryBreakpoint,
  AndesMasonryGutter,
  AndesMasonryResponsive,
} from './masonry-layout';

/** One entry of the data-driven `items` input. */
export interface AndesMasonryItemConfig<T = unknown> {
  /** Stable identity: it is how an item keeps its column between layouts. */
  key: string | number;
  /** Estimated height in pixels, used until the rendered item can be measured. */
  height?: number;
  /** Pins the item to a column (0-based). */
  column?: number;
  /** Anything the `itemTemplate` needs to render the item. */
  data?: T;
}

export interface AndesMasonryItemContext<T = unknown> {
  $implicit: AndesMasonryItemConfig<T>;
  index: number;
}

/** Column an item ended up in, reported by `layoutChanged`. */
export interface AndesMasonryLayoutItem {
  key: string | number;
  column: number;
}

const TRANSITION =
  'transform var(--andes-motion-duration-slow, 200ms) var(--andes-motion-ease-out, cubic-bezier(0.2, 0, 0, 1))';

interface Collected {
  element: HTMLElement;
  id: unknown;
  key: string | number | undefined;
  estimate: number | undefined;
  column: number | undefined;
}

/**
 * Packs items of different heights into columns, always placing the next item into the
 * shortest column. Items keep their source order in the DOM (screen readers and the tab order
 * read them in that order); only their visual position is computed.
 *
 * The host should not have padding. Without JavaScript (server rendering, before the first
 * measurement) the items flow through CSS columns instead.
 */
@Component({
  selector: 'andes-masonry',
  imports: [NgTemplateOutlet],
  templateUrl: './masonry.html',
  styleUrl: './masonry.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ANDES_MASONRY, useExisting: AndesMasonry }],
  host: {
    role: 'list',
    'data-slot': 'masonry',
    '[attr.data-layout]': 'layoutMode()',
    '[attr.data-columns]': 'columnCount()',
    '[style]': 'cssVariables()',
  },
})
export class AndesMasonry implements AndesMasonryHost {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  /** Number of columns, or a map by breakpoint (`xs` 0, `sm` 576, `md` 768, `lg` 992, `xl` 1200, `xxl` 1600). */
  readonly columns = input<AndesMasonryResponsive<number>>(3);
  /** Space between items in pixels: one number, `[horizontal, vertical]`, or a map by breakpoint. */
  readonly gutter = input<AndesMasonryResponsive<AndesMasonryGutter>>(16);
  /** Data-driven items, rendered with `itemTemplate`. */
  readonly items = input<AndesMasonryItemConfig[]>([]);
  readonly itemTemplate = input<
    TemplateRef<AndesMasonryItemContext> | undefined
  >(undefined);
  /**
   * Stable placement (the default) keeps every item in the column it was first given, so
   * appending or resizing items never makes the rest jump. `fresh` re-packs everything from
   * scratch on every pass.
   */
  readonly fresh = input(false, { transform: booleanAttribute });

  /** Emits the column of every data-driven item whenever any of them moves to another one. */
  readonly layoutChanged = output<AndesMasonryLayoutItem[]>();

  private readonly dataItems =
    viewChildren<ElementRef<HTMLElement>>('dataItem');
  private readonly projected = contentChildren(AndesMasonryItem);

  private readonly viewportWidth = signal(
    this.browser
      ? (this.host.nativeElement.ownerDocument.defaultView?.innerWidth ?? 0)
      : 0,
  );
  private readonly breakpoint = computed(() =>
    andesMasonryBreakpoint(this.viewportWidth()),
  );

  protected readonly columnCount = computed(() =>
    Math.max(
      1,
      Math.floor(andesMasonryResolve(this.columns(), this.breakpoint()) || 1),
    ),
  );
  private readonly gutterPair = computed(() =>
    andesMasonryGutterPair(
      andesMasonryResolve(this.gutter(), this.breakpoint()),
    ),
  );

  /** `css` until the first measurement succeeds, then `js` (absolute positioning). */
  readonly layoutMode = signal<'css' | 'js'>('css');

  /** Every breakpoint's column count and gutter, for the CSS-columns fallback's media queries. */
  protected readonly cssVariables = computed(() => {
    const vars: Record<string, string> = {};
    for (const name of ANDES_MASONRY_BREAKPOINT_ORDER) {
      const columns = Math.max(
        1,
        Math.floor(andesMasonryResolve(this.columns(), name) || 1),
      );
      const [x, y] = andesMasonryGutterPair(
        andesMasonryResolve(this.gutter(), name),
      );
      vars[`--andes-masonry-columns-${name}`] = String(columns);
      vars[`--andes-masonry-gutter-x-${name}`] = `${x}px`;
      vars[`--andes-masonry-gutter-y-${name}`] = `${y}px`;
    }
    return vars;
  });

  private attached = false;
  private frame: number | null = null;
  private resizeObserver: ResizeObserver | undefined;
  private readonly observed = new Set<Element>();
  private readonly placed = new WeakSet<Element>();
  private assignments = new Map<unknown, number>();
  private lastColumns = 0;
  private lastReported = '';
  private animating = false;

  constructor() {
    afterNextRender(() => {
      this.attached = true;
      const view = this.host.nativeElement.ownerDocument.defaultView;
      this.viewportWidth.set(view?.innerWidth ?? 0);
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.requestLayout());
        this.resizeObserver.observe(this.host.nativeElement);
      }
      const onResize = () => {
        this.viewportWidth.set(view?.innerWidth ?? 0);
        this.requestLayout();
      };
      view?.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() =>
        view?.removeEventListener('resize', onResize),
      );
      this.relayout();
    });

    effect(() => {
      this.columnCount();
      this.gutterPair();
      this.items();
      this.fresh();
      this.dataItems();
      this.projected();
      untracked(() => this.requestLayout());
    });

    this.destroyRef.onDestroy(() => {
      this.attached = false;
      this.resizeObserver?.disconnect();
      if (this.frame !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.frame);
      }
      this.frame = null;
    });
  }

  /** Asks for a layout pass; passes requested within one frame are merged into one. */
  requestLayout(): void {
    if (!this.browser || !this.attached || this.frame !== null) {
      return;
    }
    if (typeof requestAnimationFrame !== 'function') {
      this.relayout();
      return;
    }
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.relayout();
    });
  }

  /** Measures and positions every item right now. */
  relayout(): void {
    if (!this.browser || !this.attached) {
      return;
    }
    const host = this.host.nativeElement;
    const width = host.clientWidth;
    if (width <= 0) {
      return;
    }
    const entries = this.collect();
    const columns = this.columnCount();
    const [gutterX, gutterY] = this.gutterPair();
    if (columns !== this.lastColumns) {
      // Remembered columns belong to the old column count.
      this.assignments.clear();
      this.lastColumns = columns;
    }

    // Every width is written before any height is read, so the browser lays out once.
    const columnWidth = Math.max(
      0,
      (width - gutterX * (columns - 1)) / columns,
    );
    for (const entry of entries) {
      entry.element.style.width = `${columnWidth}px`;
    }
    const heights = entries.map(
      (entry) => entry.element.offsetHeight || entry.estimate || 0,
    );

    const result = andesMasonryLayout({
      entries: entries.map((entry, i) => ({
        id: entry.id,
        height: heights[i],
        column: entry.column,
      })),
      columns,
      width,
      gutterX,
      gutterY,
      previous: this.assignments,
      fresh: this.fresh(),
    });
    this.assignments = result.assignments;

    const rtl = this.isRtl();
    const animate = this.animating && !this.prefersReducedMotion();
    entries.forEach((entry, i) => {
      const placement = result.placements[i];
      const el = entry.element;
      el.style.position = 'absolute';
      el.style.insetBlockStart = '0';
      el.style.insetInlineStart = '0';
      el.style.margin = '0';
      el.style.transition =
        animate && this.placed.has(el) ? TRANSITION : 'none';
      el.style.transform = `translate(${rtl ? -placement.x : placement.x}px, ${placement.y}px)`;
      this.placed.add(el);
    });
    host.style.height = `${result.height}px`;
    this.syncObservers(entries);
    this.layoutMode.set('js');
    // The very first pass jumps into place; only later passes slide.
    this.animating = true;
    this.report(
      entries,
      result.placements.map((p) => p.column),
    );
  }

  // --- Helpers ----------------------------------------------------------------------------

  private collect(): Collected[] {
    const out: Collected[] = [];
    const configs = this.items();
    this.dataItems().forEach((ref, i) => {
      const config = configs[i];
      if (config) {
        out.push({
          element: ref.nativeElement,
          id: `d:${config.key}`,
          key: config.key,
          estimate: config.height,
          column: config.column,
        });
      }
    });
    for (const item of this.projected()) {
      const key = item.itemKey();
      out.push({
        element: item.element,
        id: key === undefined ? item.element : `p:${key}`,
        key: undefined,
        estimate: item.height(),
        column: item.column(),
      });
    }
    // Source order, whichever mix of data-driven and projected items there is.
    return out.sort((a, b) =>
      a.element.compareDocumentPosition(b.element) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
    );
  }

  private syncObservers(entries: readonly Collected[]): void {
    const observer = this.resizeObserver;
    if (!observer) {
      return;
    }
    const current = new Set<Element>(entries.map((entry) => entry.element));
    for (const element of this.observed) {
      if (!current.has(element)) {
        observer.unobserve(element);
        this.observed.delete(element);
      }
    }
    for (const element of current) {
      if (!this.observed.has(element)) {
        observer.observe(element);
        this.observed.add(element);
      }
    }
  }

  private report(
    entries: readonly Collected[],
    columns: readonly number[],
  ): void {
    const changed: AndesMasonryLayoutItem[] = [];
    entries.forEach((entry, i) => {
      if (entry.key !== undefined) {
        changed.push({ key: entry.key, column: columns[i] });
      }
    });
    const signature = JSON.stringify(changed);
    if (changed.length > 0 && signature !== this.lastReported) {
      this.lastReported = signature;
      this.layoutChanged.emit(changed);
    }
  }

  private isRtl(): boolean {
    const el = this.host.nativeElement;
    const direction =
      el.ownerDocument.defaultView?.getComputedStyle(el).direction;
    return direction === 'rtl' || !!el.closest('[dir="rtl"]');
  }

  private prefersReducedMotion(): boolean {
    const view = this.host.nativeElement.ownerDocument.defaultView;
    return !!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }
}
