import { NgTemplateOutlet } from '@angular/common';
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
  model,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';

import { AndesSplitterPanel } from './splitter-panel';
import {
  collapsePanel,
  expandPanel,
  fitSizes,
  nearestOpenPanel,
  pairRange,
  parseSplitterSize,
  readStoredLayout,
  rescaleSizes,
  resizePair,
  resolveSizes,
  splitterBounds,
  writeStoredLayout,
  type AndesSplitterBounds,
  type AndesSplitterPanelSpec,
} from './splitter-layout';

export type AndesSplitterOrientation = 'horizontal' | 'vertical';

export interface AndesSplitterResizeEvent {
  /** Pixel size of every pane, in DOM order. */
  sizes: number[];
  /** Index of the handle being moved (it sits between pane `handleIndex` and the next). */
  handleIndex: number;
}

export interface AndesSplitterCollapseEvent {
  /** Index of the pane that collapsed or expanded. */
  index: number;
  collapsed: boolean;
  sizes: number[];
}

interface LayoutState {
  sizes: number[];
  collapsed: boolean[];
  available: number;
}

interface DragState {
  index: number;
  pointerId: number;
  startPosition: number;
  startSizes: number[];
  pending: number[];
}

interface HandleModel {
  controls: string;
  interactive: boolean;
  draggable: boolean;
  valueNow: number;
  valueMin: number;
  valueMax: number;
  startCollapsible: boolean;
  endCollapsible: boolean;
  startCollapsed: boolean;
  endCollapsed: boolean;
}

const KEYBOARD_STEP = 10;
const KEYBOARD_STEP_LARGE = 50;
const DEFAULT_HANDLE_LENGTH = 1;

/**
 * Resizable panes separated by draggable, keyboard-operable handles. Horizontal puts the panes
 * side by side, vertical stacks them; both follow the reading direction. Splitters nest.
 *
 * ```html
 * <andes-splitter [(sizes)]="sizes">
 *   <andes-splitter-panel size="30%" min="160" collapsible>Navigation</andes-splitter-panel>
 *   <andes-splitter-panel>Content</andes-splitter-panel>
 * </andes-splitter>
 * ```
 */
@Component({
  selector: 'andes-splitter',
  imports: [NgTemplateOutlet],
  templateUrl: './splitter.html',
  styleUrl: './splitter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'splitter',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-dir]': 'rtl() ? "rtl" : "ltr"',
    '[attr.data-dragging]': 'activeHandle() !== null ? "" : null',
    '[attr.data-lazy]': 'lazy() ? "" : null',
  },
})
export class AndesSplitter {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** `horizontal` lays panes out side by side, `vertical` stacks them. */
  readonly orientation = input<AndesSplitterOrientation>('horizontal');
  /**
   * Lazy mode keeps the panes still while dragging, shows a preview line and applies the new
   * size only when the pointer is released.
   */
  readonly lazy = input(false, { transform: booleanAttribute });
  /** When set, sizes and collapsed state persist in `localStorage` under this key. */
  readonly storageKey = input<string | undefined>(undefined);
  /** Two-way pixel size of every pane, in DOM order. */
  readonly sizes = model<number[] | undefined>(undefined);
  /** Accessible name shared by the handles. */
  readonly handleLabel = input('Resize panels');
  readonly collapseLabel = input('Collapse panel');
  readonly expandLabel = input('Expand panel');

  readonly resizeStart = output<AndesSplitterResizeEvent>();
  /** Fires continuously while a pane is being resized (once on release in lazy mode). */
  readonly resized = output<AndesSplitterResizeEvent>();
  readonly resizeEnd = output<AndesSplitterResizeEvent>();
  readonly collapse = output<AndesSplitterCollapseEvent>();

  protected readonly panels = contentChildren(AndesSplitterPanel);
  private readonly handleElements =
    viewChildren<ElementRef<HTMLElement>>('handle');

  protected readonly rtl = signal(false);
  private readonly layout = signal<LayoutState | null>(null);
  /** The layout, but only while it still describes the current set of panes. */
  private readonly activeLayout = computed(() => {
    const layout = this.layout();
    return layout && layout.sizes.length === this.panels().length
      ? layout
      : null;
  });
  protected readonly activeHandle = signal<number | null>(null);
  protected readonly previewOffset = signal<number | null>(null);
  private drag: DragState | null = null;
  /** Size a collapsed pane returns to when it is opened again. */
  private restore: (number | undefined)[] = [];
  private lastSpecSignature = '';

  protected readonly separatorOrientation = computed(() =>
    this.orientation() === 'horizontal' ? 'vertical' : 'horizontal',
  );

  private readonly specs = computed<AndesSplitterPanelSpec[]>(() =>
    this.panels().map((panel) => ({
      size: panel.size(),
      min: panel.min(),
      max: panel.max(),
      collapsed: panel.collapsible() && panel.collapsed(),
      collapsedSize: panel.collapsedSize(),
    })),
  );

  protected readonly handles = computed<HandleModel[]>(() => {
    const layout = this.activeLayout();
    const panels = this.panels();
    const specs = this.specs();
    return panels.slice(0, -1).map((panel, i) => {
      const next = panels[i + 1];
      const collapsedStart = layout?.collapsed[i] ?? specs[i].collapsed;
      const collapsedEnd = layout?.collapsed[i + 1] ?? specs[i + 1].collapsed;
      const draggable =
        panel.resizable() &&
        next.resizable() &&
        !collapsedStart &&
        !collapsedEnd;
      const startCollapsible = panel.collapsible();
      const endCollapsible = next.collapsible();
      let valueNow = 0;
      let valueMin = 0;
      let valueMax = 100;
      if (layout && layout.available > 0) {
        const bounds = layout.sizes.map((_, k) =>
          splitterBounds(specs[k], layout.available),
        );
        const range = pairRange(layout.sizes, bounds, i);
        const percent = (px: number) =>
          Math.round((Math.min(px, layout.available) / layout.available) * 100);
        valueNow = percent(layout.sizes[i]);
        valueMin = percent(range.min);
        valueMax = percent(range.max);
      }
      return {
        controls: panel.id,
        interactive: draggable || startCollapsible || endCollapsible,
        draggable,
        valueNow,
        valueMin,
        valueMax,
        startCollapsible,
        endCollapsible,
        startCollapsed: collapsedStart,
        endCollapsed: collapsedEnd,
      };
    });
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.measureAndLayout();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.measureAndLayout());
      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    // Panels that open or close through their two-way `collapsed` model.
    effect(() => {
      const flags = this.specs().map((spec) => spec.collapsed);
      untracked(() => this.syncCollapsed(flags));
    });

    // New or changed size declarations start the layout over from the declaration.
    effect(() => {
      const signature = JSON.stringify(
        this.specs().map((spec) => [spec.size, spec.collapsedSize]),
      );
      untracked(() => {
        if (this.layout() && signature !== this.lastSpecSignature) {
          this.measureAndLayout(true);
        }
      });
    });

    // Changed limits keep the current sizes but re-apply the limits.
    effect(() => {
      const signature = JSON.stringify(
        this.specs().map((spec) => [spec.min, spec.max]),
      );
      untracked(() => {
        const layout = this.layout();
        if (layout && signature) {
          this.setSizes(
            this.refit(layout.sizes, layout.collapsed, layout.available),
          );
        }
      });
    });

    // A parent pushing new pixel sizes through the two-way binding.
    effect(() => {
      const requested = this.sizes();
      untracked(() => {
        const layout = this.layout();
        if (
          !requested ||
          !layout ||
          this.drag ||
          requested.length !== layout.sizes.length ||
          requested.every((size, i) => Math.abs(size - layout.sizes[i]) < 0.5)
        ) {
          return;
        }
        this.setSizes(
          this.refit(requested, layout.collapsed, layout.available),
        );
      });
    });
  }

  // --- Public API -------------------------------------------------------------------------

  /** Current pixel size of every pane. */
  getSizes(): number[] {
    return [...(this.layout()?.sizes ?? [])];
  }

  /** Collapses pane `index` (no-op unless it is `collapsible`). */
  collapsePanel(index: number): void {
    this.setCollapsed(index, true);
  }

  /** Re-opens pane `index`. */
  expandPanel(index: number): void {
    this.setCollapsed(index, false);
  }

  togglePanel(index: number): void {
    const layout = this.layout();
    this.setCollapsed(index, !(layout?.collapsed[index] ?? false));
  }

  /** Goes back to the sizes declared on the panes and forgets any stored layout. */
  reset(): void {
    const key = this.storageKey();
    if (key) {
      try {
        globalThis.localStorage?.removeItem(`andes-splitter:${key}`);
      } catch {
        // Best effort, like every other storage access here.
      }
    }
    this.restore = [];
    for (const panel of this.panels()) {
      panel.collapsed.set(false);
    }
    this.measureAndLayout(true, true);
  }

  // --- Template helpers -------------------------------------------------------------------

  protected panelFlex(index: number): string {
    const layout = this.activeLayout();
    if (layout) {
      return `0 0 ${layout.sizes[index]}px`;
    }
    // Before the first measurement (server rendering, first paint) fall back to the declared
    // size so the page already has a sensible layout.
    const spec = this.specs()[index];
    if (spec?.collapsed) {
      return `0 0 ${spec.collapsedSize}px`;
    }
    const size = spec?.size;
    if (typeof size === 'number') {
      return `0 0 ${size}px`;
    }
    if (typeof size === 'string' && size.trim() && size.trim() !== 'auto') {
      const text = size.trim();
      return `0 0 ${/^[\d.]+$/.test(text) ? `${text}px` : text}`;
    }
    return '1 1 0%';
  }

  /** Rotation of a collapse chevron (drawn pointing at the inline start) towards its target. */
  protected chevronTurn(side: 'start' | 'end', collapsed: boolean): number {
    const towardsEnd = side === 'start' ? collapsed : !collapsed;
    if (this.orientation() === 'vertical') {
      return towardsEnd ? -90 : 90;
    }
    return towardsEnd !== this.rtl() ? 180 : 0;
  }

  protected panelState(index: number): 'collapsed' | 'expanded' {
    return (this.activeLayout()?.collapsed[index] ??
      this.specs()[index]?.collapsed)
      ? 'collapsed'
      : 'expanded';
  }

  protected panelInert(index: number): boolean {
    const spec = this.specs()[index];
    return (
      this.panelState(index) === 'collapsed' && !!spec && spec.collapsedSize < 1
    );
  }

  // --- Layout -----------------------------------------------------------------------------

  private axisLength(): number {
    const el = this.host.nativeElement;
    return this.orientation() === 'horizontal'
      ? el.clientWidth
      : el.clientHeight;
  }

  /** Space taken by the handles: measured where rendered, the default for any not yet drawn. */
  private handleLength(): number {
    const handles = this.handleElements();
    const horizontal = this.orientation() === 'horizontal';
    const measured = handles.reduce((total, handle) => {
      const el = handle.nativeElement;
      const length = horizontal ? el.offsetWidth : el.offsetHeight;
      return total + (length > 0 ? length : DEFAULT_HANDLE_LENGTH);
    }, 0);
    const missing = Math.max(0, this.panels().length - 1 - handles.length);
    return measured + missing * DEFAULT_HANDLE_LENGTH;
  }

  private detectRtl(): boolean {
    const el = this.host.nativeElement;
    const view = el.ownerDocument.defaultView;
    const computed = view?.getComputedStyle(el).direction;
    return computed === 'rtl' || !!el.closest('[dir="rtl"]');
  }

  /**
   * Reads the container, then either lays the panes out from scratch (first measurement, or
   * `force`) or scales the current sizes to the new space.
   */
  private measureAndLayout(force = false, ignoreStored = false): void {
    this.rtl.set(this.detectRtl());
    const length = this.axisLength();
    if (length <= 0 || this.panels().length === 0) {
      return;
    }
    const available = Math.max(0, length - this.handleLength());
    const specs = this.specs();
    const current = this.layout();

    if (current && !force) {
      if (this.drag || Math.abs(current.available - available) < 0.5) {
        return;
      }
      const sizes = rescaleSizes(current.sizes, specs, available);
      this.layout.set({ ...current, sizes, available });
      return;
    }

    this.lastSpecSignature = JSON.stringify(
      specs.map((spec) => [spec.size, spec.collapsedSize]),
    );
    // Saved and bound sizes only seed the very first layout; later relayouts follow the panes.
    const seed = !current && !ignoreStored;
    const key = this.storageKey();
    const stored = key && seed ? readStoredLayout(key, specs.length) : null;
    const requested = seed ? this.sizes() : undefined;
    let effective = specs;
    if (stored) {
      effective = specs.map((spec, i) => ({
        ...spec,
        size: stored.fractions[i] * available,
        collapsed: spec.collapsed || stored.collapsed[i] === true,
      }));
      this.restore = stored.restore.map((fraction) =>
        typeof fraction === 'number' ? fraction * available : undefined,
      );
      effective.forEach((spec, i) => {
        if (spec.collapsed && !specs[i].collapsed) {
          this.panels()[i].collapsed.set(true);
        }
      });
    } else if (requested && requested.length === specs.length) {
      effective = specs.map((spec, i) => ({ ...spec, size: requested[i] }));
    }
    const sizes = resolveSizes(effective, available);
    this.layout.set({
      sizes,
      collapsed: effective.map((spec) => spec.collapsed),
      available,
    });
    this.publish(sizes);
  }

  private bounds(layout: LayoutState): AndesSplitterBounds[] {
    const specs = this.specs();
    return layout.sizes.map((_, i) =>
      splitterBounds(specs[i], layout.available),
    );
  }

  private refit(
    sizes: readonly number[],
    collapsed: readonly boolean[],
    available: number,
  ): number[] {
    const specs = this.specs();
    const bounds = sizes.map((_, i) => splitterBounds(specs[i], available));
    return fitSizes(sizes, bounds, collapsed, available);
  }

  private setSizes(sizes: number[]): void {
    const layout = this.layout();
    if (!layout) {
      return;
    }
    if (sizes.every((size, i) => Math.abs(size - layout.sizes[i]) < 0.01)) {
      return;
    }
    this.layout.set({ ...layout, sizes });
    this.publish(sizes);
  }

  /** Mirrors the layout into the `sizes` model and the optional storage. */
  private publish(sizes: readonly number[]): void {
    this.sizes.set(sizes.map((size) => Math.round(size * 100) / 100));
  }

  private persist(): void {
    const key = this.storageKey();
    const layout = this.layout();
    if (!key || !layout || layout.available <= 0) {
      return;
    }
    writeStoredLayout(key, {
      v: 1,
      fractions: layout.sizes.map((size) => size / layout.available),
      restore: layout.sizes.map((_, i) => {
        const value = this.restore[i];
        return value === undefined ? null : value / layout.available;
      }),
      collapsed: layout.collapsed,
    });
  }

  private commit(handleIndex: number): void {
    const layout = this.layout();
    if (!layout) {
      return;
    }
    this.publish(layout.sizes);
    this.persist();
    this.resizeEnd.emit({ sizes: [...layout.sizes], handleIndex });
  }

  // --- Collapsing -------------------------------------------------------------------------

  private syncCollapsed(flags: readonly boolean[]): void {
    const layout = this.layout();
    if (!layout || flags.length !== layout.collapsed.length) {
      return;
    }
    flags.forEach((flag, i) => {
      if (flag !== this.layout()?.collapsed[i]) {
        this.applyCollapsed(i, flag, undefined, false);
      }
    });
  }

  private setCollapsed(
    index: number,
    collapsed: boolean,
    partner?: number,
  ): void {
    const panel = this.panels()[index];
    if (!panel?.collapsible()) {
      return;
    }
    if (!this.layout()) {
      panel.collapsed.set(collapsed);
      return;
    }
    if (this.layout()?.collapsed[index] === collapsed) {
      return;
    }
    this.applyCollapsed(index, collapsed, partner, true);
  }

  private applyCollapsed(
    index: number,
    collapsed: boolean,
    partner: number | undefined,
    writeModel: boolean,
  ): void {
    const layout = this.layout();
    const panel = this.panels()[index];
    if (!layout || !panel) {
      return;
    }
    const bounds = this.bounds(layout);
    const flags = [...layout.collapsed];
    const neighbour = partner ?? nearestOpenPanel(index, layout.collapsed);
    let sizes: number[];
    if (collapsed) {
      const result = collapsePanel(
        layout.sizes,
        bounds,
        layout.collapsed,
        index,
        neighbour,
        panel.collapsedSize(),
        layout.available,
      );
      sizes = result.sizes;
      this.restore[index] = result.restore;
    } else {
      const declared = parseSplitterSize(panel.size(), layout.available);
      const target =
        this.restore[index] ??
        declared ??
        Math.max(bounds[index].min, layout.available * 0.25);
      sizes = expandPanel(
        layout.sizes,
        bounds,
        layout.collapsed,
        index,
        neighbour,
        target,
        layout.available,
      );
    }
    flags[index] = collapsed;
    this.layout.set({ ...layout, sizes, collapsed: flags });
    if (writeModel) {
      panel.collapsed.set(collapsed);
    }
    this.publish(sizes);
    this.persist();
    this.collapse.emit({ index, collapsed, sizes: [...sizes] });
  }

  /** Enter on a handle, or its collapse buttons: folds the pane on the requested side. */
  protected toggleFromHandle(
    handleIndex: number,
    side?: 'start' | 'end',
  ): void {
    const panels = this.panels();
    const layout = this.layout();
    const before = panels[handleIndex];
    const after = panels[handleIndex + 1];
    if (!before || !after) {
      return;
    }
    let target: 'start' | 'end' | undefined = side;
    if (!target) {
      const beforeCollapsed = layout?.collapsed[handleIndex] ?? false;
      const afterCollapsed = layout?.collapsed[handleIndex + 1] ?? false;
      if (before.collapsible() && (beforeCollapsed || !after.collapsible())) {
        target = 'start';
      } else if (
        after.collapsible() &&
        (afterCollapsed || !before.collapsible())
      ) {
        target = 'end';
      } else if (before.collapsible()) {
        target = 'start';
      }
    }
    if (!target) {
      return;
    }
    const index = target === 'start' ? handleIndex : handleIndex + 1;
    const partner = target === 'start' ? handleIndex + 1 : handleIndex;
    const isCollapsed = layout?.collapsed[index] ?? false;
    this.setCollapsed(
      index,
      !isCollapsed,
      layout?.collapsed[partner] ? undefined : partner,
    );
  }

  // --- Pointer ----------------------------------------------------------------------------

  private pointerPosition(event: PointerEvent): number {
    return this.orientation() === 'horizontal' ? event.clientX : event.clientY;
  }

  protected onHandlePointerDown(event: PointerEvent, index: number): void {
    const layout = this.layout();
    if (!layout || event.button > 0 || !this.handles()[index]?.draggable) {
      return;
    }
    // Keeps the browser from starting a text selection or a native drag.
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.focus({ preventScroll: true });
    try {
      // Keeps move/up events coming even when the pointer leaves the thin handle. A pointer
      // that is already gone (synthetic or cancelled events) is not worth failing the drag.
      handle.setPointerCapture?.(event.pointerId);
    } catch {
      // Dragging still works through the events that bubble to the handle.
    }
    this.drag = {
      index,
      pointerId: event.pointerId,
      startPosition: this.pointerPosition(event),
      startSizes: [...layout.sizes],
      pending: [...layout.sizes],
    };
    this.activeHandle.set(index);
    this.resizeStart.emit({ sizes: [...layout.sizes], handleIndex: index });
  }

  protected onHandlePointerMove(event: PointerEvent): void {
    const drag = this.drag;
    const layout = this.layout();
    if (!drag || !layout || event.pointerId !== drag.pointerId) {
      return;
    }
    let delta = this.pointerPosition(event) - drag.startPosition;
    if (this.orientation() === 'horizontal' && this.rtl()) {
      delta = -delta;
    }
    const next = resizePair(
      drag.startSizes,
      this.bounds(layout),
      drag.index,
      delta,
    );
    drag.pending = next;
    if (this.lazy()) {
      const handleStart =
        drag.startSizes
          .slice(0, drag.index + 1)
          .reduce((total, size) => total + size, 0) +
        drag.index * DEFAULT_HANDLE_LENGTH;
      this.previewOffset.set(
        handleStart + (next[drag.index] - drag.startSizes[drag.index]),
      );
      return;
    }
    this.layout.set({ ...layout, sizes: next });
    this.resized.emit({ sizes: [...next], handleIndex: drag.index });
  }

  protected onHandlePointerUp(event: PointerEvent): void {
    this.finishDrag(event, true);
  }

  protected onHandlePointerCancel(event: PointerEvent): void {
    // Cancelling a lazy drag throws the preview away; a live drag keeps what is on screen.
    this.finishDrag(event, !this.lazy());
  }

  private finishDrag(event: PointerEvent, apply: boolean): void {
    const drag = this.drag;
    const layout = this.layout();
    if (!drag || !layout || event.pointerId !== drag.pointerId) {
      return;
    }
    this.drag = null;
    this.activeHandle.set(null);
    this.previewOffset.set(null);
    const handle = event.currentTarget as HTMLElement | null;
    if (handle?.hasPointerCapture?.(drag.pointerId)) {
      handle.releasePointerCapture(drag.pointerId);
    }
    if (apply && this.lazy()) {
      this.layout.set({ ...layout, sizes: drag.pending });
      this.resized.emit({ sizes: [...drag.pending], handleIndex: drag.index });
    }
    this.commit(drag.index);
  }

  // --- Keyboard ---------------------------------------------------------------------------

  protected onHandleKeydown(event: KeyboardEvent, index: number): void {
    const model = this.handles()[index];
    if (!model?.interactive || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.toggleFromHandle(index);
      return;
    }
    if (!model.draggable) {
      return;
    }
    const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
    const horizontal = this.orientation() === 'horizontal';
    const flip = horizontal && this.rtl() ? -1 : 1;
    let delta: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
        delta = horizontal ? step * flip : undefined;
        break;
      case 'ArrowLeft':
        delta = horizontal ? -step * flip : undefined;
        break;
      case 'ArrowDown':
        delta = horizontal ? undefined : step;
        break;
      case 'ArrowUp':
        delta = horizontal ? undefined : -step;
        break;
      case 'Home':
        delta = Number.NEGATIVE_INFINITY;
        break;
      case 'End':
        delta = Number.POSITIVE_INFINITY;
        break;
    }
    if (delta === undefined) {
      return;
    }
    event.preventDefault();
    this.resizeByKeyboard(index, delta);
  }

  private resizeByKeyboard(index: number, delta: number): void {
    const layout = this.layout();
    if (!layout) {
      return;
    }
    const next = resizePair(layout.sizes, this.bounds(layout), index, delta);
    if (next.every((size, i) => Math.abs(size - layout.sizes[i]) < 0.01)) {
      return;
    }
    this.resizeStart.emit({ sizes: [...layout.sizes], handleIndex: index });
    this.layout.set({ ...layout, sizes: next });
    this.resized.emit({ sizes: [...next], handleIndex: index });
    this.commit(index);
  }
}
