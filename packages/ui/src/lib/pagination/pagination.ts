import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  TemplateRef,
} from '@angular/core';

import { AndesButton } from '../button/button';
import {
  AndesPaginationItem,
  getAndesPaginationRange,
} from './pagination-range';

export type { AndesPaginationItem } from './pagination-range';

export type AndesPaginationAlign = 'start' | 'center' | 'end';
export type AndesPaginationSize = 'default' | 'small';

/** Which control an `itemRender` template is being asked to render. */
export type AndesPaginationItemType =
  'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next';

/** Context of the default item content, handed to `itemRender` as `originalElement`. */
export interface AndesPaginationOriginalItemContext {
  $implicit: number;
  type: AndesPaginationItemType;
}

/**
 * Context of an `itemRender` template. The template replaces the *content* of the
 * control, never the control itself - the pagination keeps owning the focusable
 * `<button>`, its click handling, `aria-current`, `aria-label` and `disabled` state,
 * so a custom template can't accidentally drop the accessible semantics.
 */
export interface AndesPaginationItemRenderContext {
  /** The page the control navigates to. */
  $implicit: number;
  page: number;
  type: AndesPaginationItemType;
  /**
   * The default content. Render it with
   * `*ngTemplateOutlet="originalElement; context: { $implicit: page, type }"`.
   */
  originalElement: TemplateRef<AndesPaginationOriginalItemContext>;
}

/** Context of a `showTotal` template. */
export interface AndesPaginationTotalContext {
  /** Total item count. */
  $implicit: number;
  total: number;
  /** 1-indexed `[from, to]` item range of the current page (`[0, 0]` when empty). */
  range: [number, number];
}

/** Emitted by `pageChange` whenever the page or the page size changes (Ant's `onChange`). */
export interface AndesPaginationChange {
  page: number;
  pageSize: number;
}

/** Emitted by `showSizeChange` when the page size changes (Ant's `onShowSizeChange`). */
export interface AndesPaginationSizeChange {
  current: number;
  pageSize: number;
}

/** Normalized form of the `simple` input. */
export interface AndesPaginationSimpleConfig {
  enabled: boolean;
  readOnly: boolean;
}

function toSimpleConfig(
  value: boolean | string | { readOnly?: boolean } | null | undefined,
): AndesPaginationSimpleConfig {
  if (value !== null && typeof value === 'object') {
    return { enabled: true, readOnly: !!value.readOnly };
  }
  return { enabled: booleanAttribute(value), readOnly: false };
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return value === undefined || value === null
    ? undefined
    : booleanAttribute(value);
}

/**
 * Parses what the user typed into the quick jumper / simple input. Returns `null`
 * for anything that isn't a number, so the caller can ignore it rather than jump
 * somewhere surprising.
 */
function parsePageInput(text: string): number | null {
  const trimmed = text.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  return Number.parseInt(trimmed, 10);
}

/** Matches Ant Design's `xs` breakpoint (`max-width: 575px`). */
const RESPONSIVE_QUERY = '(max-width: 575.98px)';

@Component({
  selector: 'andes-pagination',
  imports: [AndesButton, NgTemplateOutlet],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesPagination {
  /** 1-indexed current page. Two-way bindable: `[(current)]`. */
  readonly current = model(1);

  /** Items per page. Two-way bindable: `[(pageSize)]`. */
  readonly pageSize = model(10);

  /** Total item count. Drives the page count together with `pageSize`. */
  readonly total = input(0, { transform: numberAttribute });

  /**
   * Explicit page count, for when the item count isn't known. Takes precedence over
   * `total`/`pageSize` when provided.
   */
  readonly totalPages = input<number | undefined>(undefined);

  /** Page buttons kept visible on either side of the current page. */
  readonly siblingCount = input(1, { transform: numberAttribute });

  /** Page buttons kept visible at the very start and end of the range. */
  readonly boundaryCount = input(1, { transform: numberAttribute });

  /** Shows one fewer sibling page on each side, and jumpers move 3 pages instead of 5. */
  readonly showLessItems = input(false, { transform: booleanAttribute });

  /**
   * Renders collapsed ranges as buttons that jump 5 (or 3, with `showLessItems`) pages.
   * When `false` they're a purely decorative ellipsis.
   */
  readonly showPrevNextJumpers = input(true, { transform: booleanAttribute });

  /** Adds a native `title` tooltip to every item. */
  readonly showTitle = input(true, { transform: booleanAttribute });

  /** Hides the whole control when there is at most one page. */
  readonly hideOnSinglePage = input(false, { transform: booleanAttribute });

  readonly disabled = input(false, { transform: booleanAttribute });

  readonly size = input<AndesPaginationSize>('default');

  /** Horizontal alignment of the whole control. */
  readonly align = input<AndesPaginationAlign>('start');

  /**
   * Compact `‹ [current] / total ›` layout. Pass `{ readOnly: true }` to show the
   * current page as text instead of an editable input.
   */
  readonly simple = input<
    AndesPaginationSimpleConfig,
    boolean | string | { readOnly?: boolean } | null | undefined
  >(toSimpleConfig(false), { transform: toSimpleConfig });

  /** Collapses to the small, simple layout on viewports narrower than 576px. */
  readonly responsive = input(false, { transform: booleanAttribute });

  /**
   * Shows the page-size changer. Left unset, it appears automatically once `total`
   * exceeds `totalBoundaryShowSizeChanger` (Ant Design's default behavior).
   */
  readonly showSizeChanger = input<boolean | undefined, unknown>(undefined, {
    transform: toOptionalBoolean,
  });

  readonly totalBoundaryShowSizeChanger = input(50, {
    transform: numberAttribute,
  });

  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50, 100]);

  /** Shows a "Go to [ ]" page input. */
  readonly showQuickJumper = input(false, { transform: booleanAttribute });

  /**
   * Adds a confirm button to the quick jumper: `true` for the default
   * (`jumpToConfirmLabel`), a string for a custom label, or a template for custom
   * content. Without it, the jumper commits on Enter or blur.
   */
  readonly goButton = input<boolean | string | TemplateRef<void>>(false);

  /** Template for the "x-y of z items" text. Context: `AndesPaginationTotalContext`. */
  readonly showTotal = input<TemplateRef<AndesPaginationTotalContext> | null>(
    null,
  );

  /** Template that replaces the content of page/prev/next/jumper items. */
  readonly itemRender =
    input<TemplateRef<AndesPaginationItemRenderContext> | null>(null);

  // Labels (Ant's `locale` object, as individual inputs).
  readonly ariaLabel = input('Pagination', { alias: 'aria-label' });
  readonly previousLabel = input('Previous page');
  readonly nextLabel = input('Next page');
  /** Prefix of each page button's accessible name: "Page 3". */
  readonly pageLabel = input('Page');
  /** `{count}` is replaced by the jump distance. */
  readonly jumpPrevLabel = input('Previous {count} pages');
  /** `{count}` is replaced by the jump distance. */
  readonly jumpNextLabel = input('Next {count} pages');
  /** Suffix of each size-changer option: "10 / page". */
  readonly itemsPerPageLabel = input('/ page');
  /** Accessible name of the size changer. */
  readonly pageSizeLabel = input('Items per page');
  readonly jumpToLabel = input('Go to');
  readonly jumpToConfirmLabel = input('Go');
  /** Accessible name of the simple-mode page input. */
  readonly currentPageLabel = input('Current page');

  /** Emits `{ page, pageSize }` whenever either changes through the UI. */
  readonly pageChange = output<AndesPaginationChange>();

  /** Emits `{ current, pageSize }` when the size changer picks a new size. */
  readonly showSizeChange = output<AndesPaginationSizeChange>();

  private readonly isNarrowViewport = signal(false);

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    if (view && typeof view.matchMedia === 'function') {
      const query = view.matchMedia(RESPONSIVE_QUERY);
      this.isNarrowViewport.set(query.matches);
      const listener = (event: MediaQueryListEvent) =>
        this.isNarrowViewport.set(event.matches);
      query.addEventListener('change', listener);
      inject(DestroyRef).onDestroy(() =>
        query.removeEventListener('change', listener),
      );
    }
  }

  protected readonly resolvedPageSize = computed(() =>
    Math.max(1, Math.trunc(Number(this.pageSize())) || 1),
  );

  protected readonly resolvedTotal = computed(() =>
    Math.max(0, Math.trunc(this.total()) || 0),
  );

  /** `0` when there is nothing to paginate (`total` of 0 and no `totalPages`). */
  protected readonly resolvedTotalPages = computed(() => {
    const explicitTotalPages = this.totalPages();
    if (explicitTotalPages !== undefined && explicitTotalPages !== null) {
      return Math.max(0, Math.trunc(explicitTotalPages) || 0);
    }
    return Math.ceil(this.resolvedTotal() / this.resolvedPageSize());
  });

  protected readonly isEmpty = computed(() => this.resolvedTotalPages() === 0);

  protected readonly clampedCurrentPage = computed(() =>
    Math.min(
      Math.max(1, Math.trunc(Number(this.current())) || 1),
      Math.max(1, this.resolvedTotalPages()),
    ),
  );

  protected readonly isHidden = computed(
    () => this.hideOnSinglePage() && this.resolvedTotalPages() <= 1,
  );

  protected readonly isCollapsed = computed(
    () => this.responsive() && this.isNarrowViewport(),
  );

  protected readonly isSimple = computed(
    () => this.simple().enabled || this.isCollapsed(),
  );

  protected readonly isSmall = computed(
    () => this.size() === 'small' || this.isCollapsed(),
  );

  protected readonly jumpSize = computed(() => (this.showLessItems() ? 3 : 5));

  protected readonly items = computed(() =>
    this.isEmpty()
      ? []
      : getAndesPaginationRange(
          this.clampedCurrentPage(),
          this.resolvedTotalPages(),
          Math.max(0, this.siblingCount() - (this.showLessItems() ? 1 : 0)),
          this.boundaryCount(),
        ),
  );

  protected readonly isFirstPage = computed(
    () => this.clampedCurrentPage() <= 1,
  );

  protected readonly isLastPage = computed(
    () => this.clampedCurrentPage() >= this.resolvedTotalPages(),
  );

  protected readonly totalRange = computed<[number, number]>(() => {
    const total = this.resolvedTotal();
    if (total === 0) {
      return [0, 0];
    }
    const from = (this.clampedCurrentPage() - 1) * this.resolvedPageSize() + 1;
    return [
      Math.min(from, total),
      Math.min(from - 1 + this.resolvedPageSize(), total),
    ];
  });

  protected readonly totalContext = computed<AndesPaginationTotalContext>(
    () => ({
      $implicit: this.resolvedTotal(),
      total: this.resolvedTotal(),
      range: this.totalRange(),
    }),
  );

  protected readonly isSizeChangerVisible = computed(
    () =>
      this.showSizeChanger() ??
      this.resolvedTotal() > this.totalBoundaryShowSizeChanger(),
  );

  /** `pageSizeOptions`, plus the current size if it isn't one of them, sorted. */
  protected readonly sizeOptions = computed(() => {
    const options = new Set(
      this.pageSizeOptions()
        .map((option) => Math.trunc(Number(option)))
        .filter((option) => option > 0),
    );
    options.add(this.resolvedPageSize());
    return [...options].sort((a, b) => a - b);
  });

  protected readonly isQuickJumperVisible = computed(
    () => this.showQuickJumper() && !this.isSimple(),
  );

  /** What the simple-mode input shows when it isn't being edited. */
  protected readonly simpleInputValue = computed(() =>
    String(this.isEmpty() ? 0 : this.clampedCurrentPage()),
  );

  protected readonly goButtonTemplate = computed(() => {
    const goButton = this.goButton();
    return goButton instanceof TemplateRef ? goButton : null;
  });

  protected readonly goButtonText = computed(() => {
    const goButton = this.goButton();
    if (goButton instanceof TemplateRef || goButton === false) {
      return null;
    }
    return typeof goButton === 'string' && goButton !== ''
      ? goButton
      : this.jumpToConfirmLabel();
  });

  protected readonly hasGoButton = computed(
    () => this.goButtonTemplate() !== null || this.goButtonText() !== null,
  );

  protected isEllipsis(
    item: AndesPaginationItem,
  ): item is 'start-ellipsis' | 'end-ellipsis' {
    return item === 'start-ellipsis' || item === 'end-ellipsis';
  }

  protected jumpTarget(item: 'start-ellipsis' | 'end-ellipsis'): number {
    return item === 'start-ellipsis'
      ? Math.max(1, this.clampedCurrentPage() - this.jumpSize())
      : Math.min(
          this.resolvedTotalPages(),
          this.clampedCurrentPage() + this.jumpSize(),
        );
  }

  protected jumpLabel(item: 'start-ellipsis' | 'end-ellipsis'): string {
    const template =
      item === 'start-ellipsis' ? this.jumpPrevLabel() : this.jumpNextLabel();
    return template.replace('{count}', String(this.jumpSize()));
  }

  protected itemContext(
    page: number,
    type: AndesPaginationItemType,
    originalElement: TemplateRef<AndesPaginationOriginalItemContext>,
  ): AndesPaginationItemRenderContext {
    return { $implicit: page, page, type, originalElement };
  }

  protected goToPage(page: number): void {
    if (this.disabled() || this.isEmpty()) {
      return;
    }
    const target = Math.min(Math.max(1, page), this.resolvedTotalPages());
    if (target === this.clampedCurrentPage()) {
      return;
    }
    this.current.set(target);
    this.pageChange.emit({ page: target, pageSize: this.resolvedPageSize() });
  }

  protected goToPrevious(): void {
    if (!this.isFirstPage()) {
      this.goToPage(this.clampedCurrentPage() - 1);
    }
  }

  protected goToNext(): void {
    if (!this.isLastPage()) {
      this.goToPage(this.clampedCurrentPage() + 1);
    }
  }

  protected onSizeSelected(value: string): void {
    const size = Math.trunc(Number(value));
    if (this.disabled() || !(size > 0) || size === this.resolvedPageSize()) {
      return;
    }

    // Same rule as Ant: keep the current page unless it no longer exists at the new
    // size, in which case land on the new last page.
    const explicitTotalPages = this.totalPages();
    const newTotalPages =
      explicitTotalPages !== undefined && explicitTotalPages !== null
        ? this.resolvedTotalPages()
        : Math.ceil(this.resolvedTotal() / size);
    const current = this.clampedCurrentPage();
    const nextCurrent =
      newTotalPages > 0 && current > newTotalPages ? newTotalPages : current;

    this.pageSize.set(size);
    if (nextCurrent !== current) {
      this.current.set(nextCurrent);
    }
    this.showSizeChange.emit({ current: nextCurrent, pageSize: size });
    this.pageChange.emit({ page: nextCurrent, pageSize: size });
  }

  // The quick jumper and simple-mode input keep their uncommitted text in the DOM
  // only. Resetting them is done on the element directly: a `[value]` binding can't
  // be relied on for that, since the bound value often hasn't changed (e.g. invalid
  // text reverting to the same current page), so Angular would never rewrite it.

  protected onJumperKeydown(
    event: KeyboardEvent,
    field: HTMLInputElement,
  ): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitJumper(field);
    }
  }

  protected onJumperBlur(field: HTMLInputElement): void {
    // With a go button, blurring (e.g. tabbing to that button) must not jump yet.
    if (!this.hasGoButton()) {
      this.commitJumper(field);
    }
  }

  protected commitJumper(field: HTMLInputElement): void {
    const page = parsePageInput(field.value);
    field.value = '';
    if (page !== null) {
      this.goToPage(page);
    }
  }

  protected onSimpleKeydown(
    event: KeyboardEvent,
    field: HTMLInputElement,
  ): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.commitSimple(field);
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.goToNext();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.goToPrevious();
        break;
      default:
        return;
    }
    field.value = this.simpleInputValue();
  }

  protected commitSimple(field: HTMLInputElement): void {
    const page = parsePageInput(field.value);
    if (page !== null) {
      this.goToPage(page);
    }
    field.value = this.simpleInputValue();
  }
}
