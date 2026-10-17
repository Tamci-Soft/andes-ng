import {
  andesOverlayPreset,
  AndesListNavigation,
  AndesListNavigationItemRef,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  AndesOverlayTriggerPrimitive,
  provideAndesOverlay,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  model,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import { AndesTabsContent, AndesTabsContentLazy } from './tabs-content';
import { AndesTabsList } from './tabs-list';
import { AndesTabsMoreMenu } from './tabs-more-menu';
import { AndesTabsTrigger } from './tabs-trigger';
import {
  ANDES_TABS,
  AndesTabsActivationMode,
  AndesTabsAnimated,
  AndesTabsClickEvent,
  AndesTabsContext,
  AndesTabsEditEvent,
  AndesTabsExtraContent,
  AndesTabsIndicator,
  AndesTabsItem,
  AndesTabsMoreContext,
  AndesTabsMoreTab,
  AndesTabsMoreTrigger,
  AndesTabsOrientation,
  AndesTabsPosition,
  AndesTabsReorderEvent,
  AndesTabsScrollEvent,
  AndesTabsSize,
  AndesTabsTriggerRef,
  AndesTabsType,
} from './tabs-types';

let nextTabsId = 0;

/** `Node.DOCUMENT_POSITION_FOLLOWING`, inlined so this file never touches the `Node` global. */
const DOCUMENT_POSITION_FOLLOWING = 4;

/** How far one click on a scroll arrow moves the tab bar, as a fraction of its visible length. */
const SCROLL_PAGE_FRACTION = 0.8;

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

/** Where the ink bar sits along the tab bar's main axis, in px from the nav's start edge. */
interface InkBarGeometry {
  offset: number;
  length: number;
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i]);
}

/** How long the pointer may be outside a hover-opened overflow menu before it closes. */
const MORE_HOVER_CLOSE_DELAY = 150;

function sameInkBar(a: InkBarGeometry | null, b: InkBarGeometry | null) {
  return (
    a === b || (!!a && !!b && a.offset === b.offset && a.length === b.length)
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
 * …or, data-driven, `<andes-tabs [items]="tabs" />` (see {@link AndesTabsItem}).
 *
 * `AndesTabs` owns the selected `value` and provides the shared {@link AndesListNavigation}
 * that `AndesTabsList`/`AndesTabsTrigger` use for roving-tabindex keyboard navigation;
 * `AndesTabsContent` reads `activeValue` to decide whether it is the shown panel. It also
 * renders the tab bar's chrome around the projected `<andes-tabs-list>`: the divider, the
 * `line`-type ink bar, scroll arrows once the tabs overflow, the `editable-card` add button
 * and the `tabBarExtraContent` slots - all *outside* the `role="tablist"` element, which
 * keeps nothing but tabs in it.
 *
 * Once the tabs overflow, a "more" button next to the scroll arrows opens a menu of the tabs
 * scrolled out of view (optionally with a search field, or a consumer template). With
 * `draggable`, tabs can be dragged to a new place - or moved with `Alt`+`Shift`+arrow key -
 * and `(reorder)` reports the move for the consumer to apply.
 */
@Component({
  selector: 'andes-tabs',
  imports: [
    NgTemplateOutlet,
    CdkScrollable,
    AndesOverlayTriggerPrimitive,
    AndesOverlayContentPrimitive,
    AndesTabsMoreMenu,
    AndesTabsList,
    AndesTabsTrigger,
    AndesTabsContent,
    AndesTabsContentLazy,
  ],
  providers: [
    AndesListNavigation,
    provideAndesOverlay(),
    { provide: ANDES_TABS, useExisting: forwardRef(() => AndesTabs) },
  ],
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-position]': 'position()',
    '[attr.data-type]': 'type()',
  },
})
export class AndesTabs implements AndesTabsContext {
  private readonly navigation = inject(AndesListNavigation);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly overlay = inject(AndesOverlayPrimitive);

  /** The active tab's value. Two-way bindable (`[(value)]`) for a controlled Tabs; when left
   * unbound, `AndesTabs` manages it itself, defaulting to the first enabled tab. A one-way
   * `[value]` sets the initially active tab. */
  readonly value = model<string | undefined>(undefined);

  /** Which arrow keys navigate between tabs. Default `'horizontal'`. Superseded by
   * {@link tabPosition} when that is set: `left`/`right` always mean vertical. On its own,
   * `'vertical'` is shorthand for `tabPosition="left"`. */
  readonly orientation = input<AndesTabsOrientation>('horizontal');

  /** Which side of the panels the tab bar sits on. Default: `'left'` when
   * {@link orientation} is `'vertical'`, otherwise `'top'`. */
  readonly tabPosition = input<AndesTabsPosition | undefined>(undefined);

  /** Whether arrow-key focus also selects a tab (`'automatic'`) or only `Enter`/`Space` does
   * (`'manual'`). Default `'automatic'`, per the WAI-ARIA APG's recommendation for simple
   * tabs whose panels are cheap to show. */
  readonly activationMode = input<AndesTabsActivationMode>('automatic');

  /** Visual style of the tab bar. Default `'line'`. */
  readonly type = input<AndesTabsType>('line');

  /** Preset tab size. Default `'md'`. */
  readonly size = input<AndesTabsSize>('md');

  /** Centers the tabs within the bar. */
  readonly centered = input(false, { transform: booleanAttribute });

  /** Gap between tabs, in px. Default: the type's own spacing. */
  readonly tabBarGutter = input<number | undefined>(undefined);

  /** Whether switching tabs animates. `true`/`false` toggles both parts; the object form sets
   * them individually. Default `{ inkBar: true, tabPane: false }`. Both honor
   * `prefers-reduced-motion`. */
  readonly animated = input<boolean | AndesTabsAnimated>({
    inkBar: true,
    tabPane: false,
  });

  /** Customizes the `line`-type ink bar's length and alignment. */
  readonly indicator = input<AndesTabsIndicator | undefined>(undefined);

  /** Destroy an inactive panel's lazy content (see `AndesTabsContentLazy`) instead of keeping
   * it - and its state - alive once it has been shown. Default `false`. */
  readonly destroyOnHidden = input(false, { transform: booleanAttribute });

  /** Data-driven tabs, rendered in place of projected `<andes-tabs-list>`/`<andes-tabs-content>`. */
  readonly items = input<readonly AndesTabsItem[] | undefined>(undefined);

  /** Extra content inside the tab bar: a template (placed at the end) or `{ left, right }`.
   * Projecting an element with `andesTabsExtraLeft`/`andesTabsExtraRight` works too. */
  readonly tabBarExtraContent = input<
    TemplateRef<unknown> | AndesTabsExtraContent | undefined
  >(undefined);

  /** Hides the `editable-card` add button. */
  readonly hideAdd = input(false, { transform: booleanAttribute });

  /** Custom icon for the `editable-card` add button. */
  readonly addIcon = input<TemplateRef<unknown> | undefined>(undefined);

  /** Custom icon for every `editable-card` remove button (a trigger's `closeIcon` wins). */
  readonly removeIcon = input<TemplateRef<unknown> | undefined>(undefined);

  /** Accessible name of the `editable-card` add button. */
  readonly addLabel = input('Add tab');

  /** Inline styles for the tab bar (e.g. `{ position: 'sticky', top: 0 }` for a bar that
   * stays visible while a long panel scrolls). */
  readonly tabBarStyle = input<
    Record<string, string | number> | string | null | undefined
  >(undefined);

  /** Extra classes for the tab bar. */
  readonly tabBarClass = input<string | readonly string[] | undefined>(
    undefined,
  );

  /** Lets the user reorder tabs by dragging them, or with `Alt`+`Shift`+arrow key on a
   * focused tab. Only emits `(reorder)`; the consumer moves the tab in its own list. */
  readonly draggable = input(false, { transform: booleanAttribute });

  /** Shows the "more" button that lists the tabs scrolled out of view once the bar
   * overflows. Default `true`. */
  readonly more = input(true, { transform: booleanAttribute });

  /** Custom icon for the "more" button. Default: a horizontal ellipsis. */
  readonly moreIcon = input<TemplateRef<unknown> | undefined>(undefined);

  /** Whether the overflow menu opens on click or on hover (a click still opens it, and
   * moves focus into it). Default `'click'`. */
  readonly moreTrigger = input<AndesTabsMoreTrigger>('click');

  /** Accessible name of the "more" button and its menu. */
  readonly moreLabel = input('More tabs');

  /** Adds a search field that filters the overflow menu. */
  readonly moreSearch = input(false, { transform: booleanAttribute });

  /** Placeholder (and accessible name) of the overflow menu's search field. */
  readonly moreSearchPlaceholder = input('Search tabs');

  /** Replaces the overflow menu's content with a template; see {@link AndesTabsMoreContext}. */
  readonly moreTemplate = input<TemplateRef<AndesTabsMoreContext> | undefined>(
    undefined,
  );

  /** `editable-card` only: `{ action: 'add' }` from the add button, `{ action: 'remove', key }`
   * from a tab's remove button or the `Delete` key on a focused closable tab. */
  readonly edit = output<AndesTabsEditEvent>();

  /** Fires when a tab is clicked, before it is selected. */
  readonly tabClick = output<AndesTabsClickEvent>();

  /** Fires whenever an overflowing tab bar scrolls (arrows, wheel, touch or focus). */
  readonly tabScroll = output<AndesTabsScrollEvent>();

  /** `draggable` only: a tab was dropped at a new index, or moved with the keyboard. */
  readonly reorder = output<AndesTabsReorderEvent>();

  readonly position = computed<AndesTabsPosition>(
    () =>
      this.tabPosition() ??
      (this.orientation() === 'vertical' ? 'left' : 'top'),
  );

  readonly resolvedOrientation = computed<AndesTabsOrientation>(() =>
    this.position() === 'left' || this.position() === 'right'
      ? 'vertical'
      : 'horizontal',
  );

  readonly editable = computed(() => this.type() === 'editable-card');

  private readonly resolvedAnimated = computed(() => {
    const animated = this.animated();
    return typeof animated === 'boolean'
      ? { inkBar: animated, tabPane: animated }
      : { inkBar: animated.inkBar ?? true, tabPane: animated.tabPane ?? false };
  });

  readonly tabPaneAnimated = computed(() => this.resolvedAnimated().tabPane);

  protected readonly showAdd = computed(
    () => this.editable() && !this.hideAdd(),
  );

  protected readonly extraLeft = computed(() => {
    const extra = this.tabBarExtraContent();
    return extra instanceof TemplateRef ? undefined : extra?.left;
  });

  protected readonly extraRight = computed(() => {
    const extra = this.tabBarExtraContent();
    return extra instanceof TemplateRef ? extra : extra?.right;
  });

  protected readonly barClasses = computed(() =>
    clsx(
      'andes-tabs__bar',
      `andes-tabs__bar--${this.position()}`,
      this.resolvedOrientation() === 'vertical' && 'andes-tabs__bar--vertical',
      this.type() !== 'line' && 'andes-tabs__bar--card',
      `andes-tabs__bar--${this.size()}`,
      this.centered() && 'andes-tabs__bar--centered',
      this.tabBarClass(),
    ),
  );

  private readonly _triggers = signal<readonly AndesTabsTriggerRef[]>([]);

  /** Bumped by {@link syncOrder} when existing tabs moved without re-registering. */
  private readonly orderVersion = signal(0);

  private readonly _sorting = signal(false);
  readonly sorting = this._sorting.asReadonly();

  // Sorted lazily, on read, rather than at registration time: triggers register from their
  // own `ngOnInit`, which for content-projected components can run before their element
  // is actually attached under its final parent, when `compareDocumentPosition` cannot yet
  // tell DOM order apart. By the time anything reads this computed (e.g. after the initial
  // `ApplicationRef.tick()`), rendering has settled and document order is reliable.
  private readonly sortedTriggers = computed(() => {
    this.orderVersion();
    return sortByDocumentOrder(this._triggers());
  });

  private readonly firstEnabledValue = computed(() =>
    this.sortedTriggers()
      .find((trigger) => !trigger.disabled())
      ?.value(),
  );

  /** The value that should currently be shown: the controlled/uncontrolled {@link value}, or
   * the first enabled tab before anything has ever been explicitly selected - or once
   * `value` names a tab that no longer exists (e.g. an `editable-card` tab the consumer just
   * removed), so the tablist is never left with no selected tab. This is a derived
   * fallback: it does not write `value` or emit `valueChange` by itself. */
  readonly activeValue = computed(() => {
    const value = this.value();
    const triggers = this._triggers();
    if (
      triggers.length === 0 ||
      (value !== undefined && triggers.some((t) => t.value() === value))
    ) {
      return value;
    }
    return this.firstEnabledValue() ?? value;
  });

  private readonly tabsId = `andes-tabs-${nextTabsId++}`;

  // ---- Tab bar layout: overflow scrolling and the ink bar -------------------------------

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly nav = viewChild<ElementRef<HTMLElement>>('nav');

  /** Bumped by a `ResizeObserver` so the layout effect re-measures on any size change. */
  private readonly layoutVersion = signal(0);

  protected readonly overflowing = signal(false);
  protected readonly canScrollPrev = signal(false);
  protected readonly canScrollNext = signal(false);
  private readonly inkBar = signal<InkBarGeometry | null>(null, {
    equal: sameInkBar,
  });

  /** Values of the tabs at least partly scrolled out of view, in bar order. */
  private readonly hiddenKeys = signal<readonly string[]>([], {
    equal: sameKeys,
  });

  // The ink bar would mark the dragged tab's old place, so it steps aside during a drag.
  protected readonly showInkBar = computed(
    () => this.type() === 'line' && this.inkBar() !== null && !this.sorting(),
  );

  protected readonly showMore = computed(
    () => this.more() && this.overflowing(),
  );

  protected readonly moreOpen = this.overlay.isOpen;

  private readonly moreMenuTemplate =
    viewChild.required<TemplateRef<unknown>>('moreMenu');

  /** The tabs listed in the overflow menu. */
  protected readonly moreTabs = computed<readonly AndesTabsMoreTab[]>(() => {
    const hidden = new Set(this.hiddenKeys());
    const active = this.activeValue();
    // Re-read when the menu opens, so labels changed since the last scroll show up.
    this.moreOpen();
    return this.sortedTriggers()
      .filter((trigger) => hidden.has(trigger.value()))
      .map((trigger) => ({
        key: trigger.value(),
        label: untracked(() => trigger.labelText()),
        icon: trigger.icon(),
        disabled: trigger.disabled(),
        removable: trigger.removable(),
        selected: trigger.value() === active,
      }));
  });

  protected readonly moreContext = computed<AndesTabsMoreContext>(() => ({
    $implicit: this.moreTabs(),
    select: this.pickFromMore,
    close: this.closeMore,
  }));

  private moreOpenedByHover = false;
  private moreHoverTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly inkBarClasses = computed(() =>
    clsx(
      'andes-tabs__ink-bar',
      this.resolvedAnimated().inkBar && 'andes-tabs__ink-bar--animated',
    ),
  );

  protected readonly inkBarStyle = computed(() => {
    const ink = this.inkBar();
    if (!ink) {
      return {};
    }
    return this.resolvedOrientation() === 'vertical'
      ? { top: `${ink.offset}px`, height: `${ink.length}px` }
      : { left: `${ink.offset}px`, width: `${ink.length}px` };
  });

  private lastScrollPosition = 0;
  private lastScrollIntoViewKey: string | undefined;

  constructor() {
    // Force-builds `AndesListNavigation`'s underlying CDK key manager now, synchronously,
    // while the constructor is running outside any reactive context. The CDK key manager
    // calls Angular's own `effect()` the first time it is constructed (to watch the items
    // signal); if that first construction were instead triggered lazily from inside one of
    // *our own* effects below, Angular would throw NG0602 ("effect() cannot be called from
    // within a reactive context"). `clearActive` is a no-op on the already-clear initial
    // state; it is only ever called here for this side effect.
    this.navigation.clearActive();

    effect(() => {
      this.navigation.configure({
        orientation: this.resolvedOrientation(),
        focusMode: 'roving-tabindex',
        wrap: true,
        homeAndEnd: true,
        // Typeahead is a listbox/menu convention, not part of the WAI-ARIA Tabs pattern.
        typeahead: false,
      });
    });

    // Keeps `AndesListNavigation`'s roving-tabindex target pointed at the selected tab - on
    // first render, and whenever `value` changes from outside (a consumer setting `[value]`
    // programmatically) - rather than left at the primitive's own default of "the first
    // enabled item". Per the WAI-ARIA APG, Tab must move focus to the active/selected tab,
    // not merely to the first one. See {@link syncActiveItem} for why the actual
    // read-compare-and-set against `navigation.activeItem()` happens `untracked`.
    //
    // Tracks `navigation.items()` (not just `activeValue()`/the triggers list) because a
    // trigger's own `AndesListNavigationItem` finishes registering with `AndesListNavigation`
    // slightly *after* this component's effects get their first flush - by design this
    // effect is a no-op until the selected trigger's item has actually registered, and
    // re-running once `items()` changes is what lets it catch up.
    effect(() => {
      const value = this.activeValue();
      const items = this.navigation.items();
      const item = this.sortedTriggers()
        .find((trigger) => trigger.value() === value)
        ?.navigationItem();
      if (item && items.includes(item)) {
        this.syncActiveItem(item);
      }
    });

    // Measures the rendered tab bar after every render that could have moved a tab: a new
    // selection, tabs added/removed, a layout input changing, or (via `layoutVersion`) any
    // resize the `ResizeObserver` below reports. Writes only when a measurement actually
    // changed (`sameInkBar`, plain booleans), so it settles after one extra pass.
    afterRenderEffect(() => {
      this.layoutVersion();
      this.type();
      this.size();
      this.tabBarGutter();
      this.items();
      this.measure();
    });

    // The overflow menu hangs off the "more" button on the panels' side of the bar.
    effect(() => {
      const position = this.position();
      const side: AndesOverlaySide =
        position === 'top'
          ? 'bottom'
          : position === 'bottom'
            ? 'top'
            : position === 'left'
              ? 'right'
              : 'left';
      this.overlay.configure({
        ...andesOverlayPreset('menu'),
        role: this.moreTemplate() || this.moreSearch() ? 'dialog' : 'menu',
        positioning: { kind: 'anchored', side, align: 'end', sideOffset: 4 },
      });
    });

    // The "more" button only exists while the bar overflows; its menu goes with it.
    effect(() => {
      if (!this.showMore() && untracked(this.moreOpen)) {
        untracked(() => this.overlay.close('imperative'));
      }
    });

    this.destroyRef.onDestroy(() => clearTimeout(this.moreHoverTimer));

    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() =>
        this.layoutVersion.update((v) => v + 1),
      );
      const scroller = this.scroller()?.nativeElement;
      const nav = this.nav()?.nativeElement;
      if (scroller) observer.observe(scroller);
      if (nav) observer.observe(nav);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** @internal Called by `AndesTabsTrigger` on init, once its inputs are bound. */
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

  /** @internal Called by `AndesTabsTrigger` when its tab is clicked. */
  handleTabClick(value: string, event: MouseEvent): void {
    this.tabClick.emit({ key: value, event });
    this.select(value);
  }

  /**
   * @internal Called by `AndesTabsTrigger` from its remove button or the `Delete` key.
   *
   * Only emits `(edit)` - the consumer owns the list of tabs and removes the one asked for.
   * When the request came from the keyboard, focus would otherwise be dropped on `<body>`
   * along with the removed tab's button; per the WAI-ARIA APG it moves to the following tab
   * instead (the preceding one for the last tab), once the consumer has actually removed it.
   * Under automatic activation that focus move selects the new tab too, as the APG allows.
   */
  requestRemove(value: string, event: Event, fromKeyboard: boolean): void {
    const enabled = this.sortedTriggers().filter((t) => !t.disabled());
    const index = enabled.findIndex((t) => t.value() === value);
    const neighbor =
      index === -1 ? undefined : (enabled[index + 1] ?? enabled[index - 1]);

    this.edit.emit({ action: 'remove', key: value, event });

    if (fromKeyboard && neighbor) {
      afterNextRender(
        () => {
          const stillThere = this._triggers().some((t) => t.value() === value);
          if (!stillThere) {
            neighbor.navigationItem()?.focus();
          }
        },
        { injector: this.injector },
      );
    }
  }

  /** @internal Called by `AndesTabsTrigger` when a drag starts or ends. */
  setSorting(sorting: boolean): void {
    this._sorting.set(sorting);
  }

  /** @internal Called by `AndesTabsList` when a dragged tab is dropped at a new index. */
  requestReorder(
    value: string,
    previousIndex: number,
    currentIndex: number,
  ): void {
    this.reorder.emit({ key: value, previousIndex, currentIndex });
  }

  /**
   * @internal Called by `AndesTabsTrigger` on `Alt`+`Shift`+arrow key. Once the consumer has
   * moved the tab, focus is put back on it: moving a focused element in the DOM can drop
   * focus on `<body>`.
   */
  moveByKeyboard(value: string, step: -1 | 1): void {
    const sorted = this.sortedTriggers();
    const previousIndex = sorted.findIndex((t) => t.value() === value);
    const currentIndex = previousIndex + step;
    if (
      previousIndex === -1 ||
      currentIndex < 0 ||
      currentIndex >= sorted.length
    ) {
      return;
    }
    const trigger = sorted[previousIndex];
    this.reorder.emit({ key: value, previousIndex, currentIndex });
    afterNextRender(() => trigger.navigationItem()?.focus(), {
      injector: this.injector,
    });
  }

  /**
   * @internal Called by `AndesTabsList` whenever its children change. Tabs moved in the DOM
   * without re-registering (a consumer reordering its list) would leave both this
   * component's and `AndesListNavigation`'s registries - each sorted at registration - in
   * the old order, so arrow keys and the ink bar would follow it. Re-registering the
   * navigation items re-sorts them; the active item is carried over.
   */
  syncOrder(): void {
    const current = untracked(this.sortedTriggers);
    const fresh = sortByDocumentOrder(untracked(this._triggers));
    if (fresh.every((trigger, i) => trigger === current[i])) {
      return;
    }
    this.orderVersion.update((v) => v + 1);

    const items = untracked(this.navigation.items);
    const active = untracked(this.navigation.activeItem);
    items.forEach((item) => this.navigation.unregister(item));
    items.forEach((item) => this.navigation.register(item));
    if (active && items.includes(active)) {
      this.navigation.setActiveItemSilently(active);
    }
  }

  // ---- Overflow menu ------------------------------------------------------------------------

  protected onMoreClick(): void {
    if (!this.moreOpen()) {
      this.openMore(true);
      return;
    }
    if (this.moreOpenedByHover) {
      // A click on a hover-opened menu keeps it open and hands it the keyboard.
      this.moreOpenedByHover = false;
      clearTimeout(this.moreHoverTimer);
      this.overlay.configure({ restoreFocus: true });
      this.overlay
        .contentElement()
        ?.querySelector<HTMLElement>('input, [tabindex="0"], button')
        ?.focus();
      return;
    }
    this.overlay.close('trigger');
  }

  protected onMorePointerEnter(): void {
    if (this.moreTrigger() !== 'hover') {
      return;
    }
    clearTimeout(this.moreHoverTimer);
    if (!this.moreOpen()) {
      this.openMore(false);
    }
  }

  protected onMorePointerLeave(): void {
    if (this.moreTrigger() !== 'hover' || !this.moreOpenedByHover) {
      return;
    }
    clearTimeout(this.moreHoverTimer);
    this.moreHoverTimer = setTimeout(() => {
      if (this.moreOpenedByHover) {
        this.overlay.close('imperative');
      }
    }, MORE_HOVER_CLOSE_DELAY);
  }

  protected cancelMoreClose(): void {
    clearTimeout(this.moreHoverTimer);
  }

  /** Opens the overflow menu; `withFocus` = moved into it, and back to the button after. */
  private openMore(withFocus: boolean): void {
    this.moreOpenedByHover = !withFocus;
    this.overlay.configure({
      autoFocus: withFocus ? 'first-tabbable' : 'none',
      restoreFocus: withFocus,
    });
    this.overlay.open(this.moreMenuTemplate());
  }

  /** Closes the overflow menu. */
  readonly closeMore = (): void => {
    this.overlay.close('imperative');
  };

  /** Selects a tab from the overflow menu, closes it and focuses the tab. */
  readonly pickFromMore = (value: string): void => {
    const trigger = this.sortedTriggers().find((t) => t.value() === value);
    if (!trigger || trigger.disabled()) {
      return;
    }
    this.select(value);
    this.overlay.close('imperative');
    trigger.navigationItem()?.focus();
  };

  protected removeFromMore(value: string, event: Event): void {
    this.edit.emit({ action: 'remove', key: value, event });
  }

  protected onAdd(event: MouseEvent): void {
    this.edit.emit({ action: 'add', event });
  }

  /** Scrolls the overflowing tab bar by most of one visible length; `-1` = toward the start. */
  protected scrollByPage(direction: -1 | 1): void {
    const scroller = this.scroller()?.nativeElement;
    if (!scroller) {
      return;
    }
    if (this.resolvedOrientation() === 'vertical') {
      scroller.scrollTop +=
        direction * scroller.clientHeight * SCROLL_PAGE_FRACTION;
    } else {
      // In RTL `scrollLeft` runs from 0 at the start edge toward negative values.
      const sign = this.isRtl(scroller) ? -1 : 1;
      scroller.scrollLeft +=
        sign * direction * scroller.clientWidth * SCROLL_PAGE_FRACTION;
    }
  }

  protected onScroll(): void {
    const scroller = this.scroller()?.nativeElement;
    if (!scroller) {
      return;
    }
    const vertical = this.resolvedOrientation() === 'vertical';
    const position = vertical ? scroller.scrollTop : scroller.scrollLeft;
    if (position !== this.lastScrollPosition) {
      const forward = position > this.lastScrollPosition;
      this.lastScrollPosition = position;
      this.tabScroll.emit({
        direction: vertical
          ? forward
            ? 'bottom'
            : 'top'
          : forward
            ? 'right'
            : 'left',
      });
    }
    this.updateScrollState(scroller);
    this.updateHidden(scroller, vertical);
  }

  protected asTemplate(
    value: string | TemplateRef<unknown> | undefined,
  ): TemplateRef<unknown> | undefined {
    return value instanceof TemplateRef ? value : undefined;
  }

  private isRtl(element: HTMLElement): boolean {
    return getComputedStyle(element).direction === 'rtl';
  }

  private measure(): void {
    const scroller = this.scroller()?.nativeElement;
    const nav = this.nav()?.nativeElement;
    if (!scroller || !nav) {
      return;
    }
    const vertical = this.resolvedOrientation() === 'vertical';

    this.overflowing.set(
      vertical
        ? scroller.scrollHeight > scroller.clientHeight + 1
        : scroller.scrollWidth > scroller.clientWidth + 1,
    );
    this.updateScrollState(scroller);
    this.updateHidden(scroller, vertical);

    const activeValue = this.activeValue();
    const active = this.sortedTriggers().find(
      (trigger) => trigger.value() === activeValue,
    );
    if (!active) {
      this.inkBar.set(null);
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const tabRect = active.element.getBoundingClientRect();
    const origin = vertical ? tabRect.height : tabRect.width;
    const start = vertical
      ? tabRect.top - navRect.top
      : tabRect.left - navRect.left;

    const { size, align = 'center' } = this.indicator() ?? {};
    const requested =
      typeof size === 'function' ? size(origin) : (size ?? origin);
    const length = Math.max(0, Math.min(requested, origin));
    const offset =
      start +
      (align === 'start'
        ? 0
        : align === 'end'
          ? origin - length
          : (origin - length) / 2);
    this.inkBar.set(origin > 0 ? { offset, length } : null);

    // Re-checked when the selection changes *and* when the visible length does - the scroll
    // arrows appearing on the first overflow shrink the viewport right after this first
    // ran, which would otherwise leave a just-scrolled-to tab half hidden behind them.
    const scrollKey = `${activeValue}|${vertical ? scroller.clientHeight : scroller.clientWidth}`;
    if (scrollKey !== this.lastScrollIntoViewKey) {
      this.lastScrollIntoViewKey = scrollKey;
      this.scrollIntoView(scroller, active.element, vertical);
    }
  }

  /** Brings a newly selected tab into view without scrolling the page itself. */
  private scrollIntoView(
    scroller: HTMLElement,
    tab: HTMLElement,
    vertical: boolean,
  ): void {
    const view = scroller.getBoundingClientRect();
    const rect = tab.getBoundingClientRect();
    if (vertical) {
      if (rect.top < view.top) scroller.scrollTop -= view.top - rect.top;
      else if (rect.bottom > view.bottom)
        scroller.scrollTop += rect.bottom - view.bottom;
    } else {
      if (rect.left < view.left) scroller.scrollLeft -= view.left - rect.left;
      else if (rect.right > view.right)
        scroller.scrollLeft += rect.right - view.right;
    }
  }

  /** Records which tabs are (partly) outside the scroller's visible area. */
  private updateHidden(scroller: HTMLElement, vertical: boolean): void {
    if (!this.overflowing()) {
      this.hiddenKeys.set([]);
      return;
    }
    const view = scroller.getBoundingClientRect();
    this.hiddenKeys.set(
      this.sortedTriggers()
        .filter((trigger) => {
          const rect = trigger.element.getBoundingClientRect();
          return vertical
            ? rect.top < view.top - 1 || rect.bottom > view.bottom + 1
            : rect.left < view.left - 1 || rect.right > view.right + 1;
        })
        .map((trigger) => trigger.value()),
    );
  }

  private updateScrollState(scroller: HTMLElement): void {
    const vertical = this.resolvedOrientation() === 'vertical';
    const position = Math.abs(
      vertical ? scroller.scrollTop : scroller.scrollLeft,
    );
    const max = vertical
      ? scroller.scrollHeight - scroller.clientHeight
      : scroller.scrollWidth - scroller.clientWidth;
    this.canScrollPrev.set(position > 1);
    this.canScrollNext.set(position < max - 1);
  }

  /**
   * Points {@link AndesListNavigation}'s roving-tabindex target at `item`, the registered
   * `AndesListNavigationItem` for whichever trigger is currently selected - see the
   * constructor effect that calls this.
   *
   * Delegates to `setActiveItemSilently` specifically because it updates the primitive's
   * active-item pointer without moving real DOM focus or scrolling - this can run before the
   * user has interacted at all - and, just as importantly, it does not go through the same
   * "focus moved, so select" path that automatic activation reacts to, which would otherwise
   * feed back into `select` on every sync.
   *
   * The read-compare-and-set against `navigation.activeItem()` is deliberately `untracked`:
   * the calling effect tracks `activeValue()`/`navigation.items()` (i.e. *selection*, and
   * whether the target item has registered yet), not `navigation.activeItem()` itself.
   * Tracking the latter would make that effect re-run on every focus move - including ones
   * arrow-key navigation just made for a *different*, newly-active tab - and it would stomp
   * that move straight back before the newly-active trigger's own automatic-activation effect
   * gets a chance to update `value` to match.
   */
  private syncActiveItem(item: AndesListNavigationItemRef): void {
    untracked(() => {
      if (this.navigation.activeItem() !== item) {
        this.navigation.setActiveItemSilently(item);
      }
    });
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
