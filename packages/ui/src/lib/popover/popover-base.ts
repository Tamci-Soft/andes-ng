import {
  andesOverlayPreset,
  AndesOverlayPrimitive,
  type AndesOverlayAlign,
  type AndesOverlayAutoFocus,
  type AndesOverlayCloseReason,
  type AndesOverlayConfig,
  type AndesOverlayRole,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  numberAttribute,
  signal,
  untracked,
  ViewContainerRef,
  type EmbeddedViewRef,
  type Signal,
  type TemplateRef,
} from '@angular/core';

import {
  ANDES_POPOVER_DEFAULT_HOVER_DELAY,
  ANDES_POPOVER_PLACEMENTS,
  type AndesPopoverPlacement,
  type AndesPopoverRenderable,
  type AndesPopoverTriggerAction,
} from './popover-types';

/** How the panel was opened - decides whether it may move focus. */
type AndesPopoverOpenSource = 'click' | 'hover' | 'focus' | 'programmatic';

interface FocusPolicy {
  readonly autoFocus: AndesOverlayAutoFocus;
  readonly restoreFocus: boolean;
}

const OPPOSITE_SIDE: Readonly<Record<AndesOverlaySide, AndesOverlaySide>> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/** Distance, in px, from a panel edge to the arrow's center for `start`/`end` alignment. */
const ARROW_EDGE_INSET = 16;
/** The arrow never points closer than this (px) to the trigger's own edges. */
const ARROW_ANCHOR_INSET = 8;
/** Mirrors the overlay primitive's default `viewportMargin`. */
const VIEWPORT_MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Everything `AndesPopover` and `AndesPopconfirm` have in common: placement, the
 * trigger modes, hover timing, collision handling, the arrow, focus policy and the
 * keep-alive cache for template content. Each subclass provides one overlay
 * (`provideAndesOverlay()`), registers itself under this class as a DI token, and
 * supplies the panel template.
 *
 * `AndesPopoverTrigger`, `AndesPopoverContent` and `AndesPopoverOutlet` inject this
 * class rather than a concrete component, so both components share them.
 */
@Directive()
export abstract class AndesPopoverBase {
  protected readonly overlay = inject(AndesOverlayPrimitive);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /** The `<ng-template>` rendered into the overlay. */
  protected abstract readonly panelTemplate: Signal<
    TemplateRef<unknown> | undefined
  >;

  /** ARIA role of the panel. `dialog` for Popover; Popconfirm overrides it. */
  protected readonly panelRole: AndesOverlayRole = 'dialog';

  /**
   * Single-value shorthand for `side` + `align` (`'bottomLeft'` = `side="bottom"
   * align="start"`). Takes precedence over `side`/`align` when set.
   */
  readonly placement = input<AndesPopoverPlacement | undefined>(undefined);
  /** Side of the trigger the panel prefers to render on. Default `'bottom'`. */
  readonly side = input<AndesOverlaySide>('bottom');
  /** Alignment along that side. Default `'center'`. */
  readonly align = input<AndesOverlayAlign>('center');
  /** Gap in px between the trigger and the panel. Default `8`. */
  readonly sideOffset = input(8);
  /** Extra px offset along the alignment axis. Default `0`. */
  readonly alignOffset = input(0);
  /** Renders a small pointer element on the panel, on the anchored side. Default `false`. */
  readonly showArrow = input(false, { transform: booleanAttribute });
  /**
   * Shifts `start`/`end`-aligned panels so the arrow points at the trigger's
   * center rather than near its edge.
   * Only meaningful with `showArrow`. Default `false`.
   */
  readonly arrowPointAtCenter = input(false, { transform: booleanAttribute });
  /**
   * Flip to the opposite side when the preferred one does not fit in the
   * viewport, and shift along the cross axis to stay on screen. Default `true`.
   */
  readonly autoAdjustOverflow = input(true, { transform: booleanAttribute });
  /**
   * What opens the panel: `'click'`, `'hover'`, `'focus'`, `'contextMenu'`, or an
   * array combining several. Default `'click'`.
   */
  readonly trigger = input<
    AndesPopoverTriggerAction | readonly AndesPopoverTriggerAction[]
  >('click');
  /** Hover-trigger delay in ms before opening. Default `100`. */
  readonly openDelay = input(ANDES_POPOVER_DEFAULT_HOVER_DELAY, {
    transform: numberAttribute,
  });
  /** Hover-trigger delay in ms before closing once the pointer leaves. Default `100`. */
  readonly closeDelay = input(ANDES_POPOVER_DEFAULT_HOVER_DELAY, {
    transform: numberAttribute,
  });
  /** Never opens while set; closes if already open. Default `false`. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Destroy template content (`title`/`content`/`description` passed as a
   * `TemplateRef`) on close instead of keeping its view alive for the next open.
   * Default `false`. Projected `<andes-popover-content>` children are created by
   * the consumer's template and always keep their state.
   */
  readonly destroyOnHidden = input(false, { transform: booleanAttribute });
  /** Explicit stacking order, overriding the `--andes-z-index-popover` layer. */
  readonly zIndex = input<number | undefined>(undefined);
  /**
   * Extra classes on the overlay pane - the hook for scoping the
   * `--andes-popover-*` custom properties to one instance.
   */
  readonly panelClass = input<string | readonly string[] | null>(null);

  /**
   * Open state. Two-way bindable for controlled usage; uncontrolled otherwise.
   * Its `openChange` output fires whenever the component itself changes the
   * state (trigger, Escape, outside click, confirm/cancel) - not when the parent
   * writes `[open]`.
   */
  readonly open = model(false);

  /** The side requested through `placement` or `side`. */
  readonly preferredSide = computed(() => {
    const placement = this.placement();
    return placement ? ANDES_POPOVER_PLACEMENTS[placement].side : this.side();
  });

  /** The alignment requested through `placement` or `align`. */
  readonly resolvedAlign = computed(() => {
    const placement = this.placement();
    return placement ? ANDES_POPOVER_PLACEMENTS[placement].align : this.align();
  });

  private readonly _resolvedSide = linkedSignal(() => this.preferredSide());
  /** The side the panel actually renders on, after any collision flip. */
  readonly resolvedSide = this._resolvedSide.asReadonly();

  private readonly _arrowOffset = signal<number | null>(null);
  /**
   * Arrow position in px along the panel's cross axis, measured so it keeps
   * pointing at the trigger after a flip or shift. `null` = CSS default (center).
   */
  readonly arrowOffset = this._arrowOffset.asReadonly();

  /** Header rendered by the shared panel shell above its projected content. */
  readonly panelTitle: Signal<AndesPopoverRenderable | null | undefined> =
    signal(null);
  /** Body rendered by the shared panel shell, below the header. */
  readonly panelBody: Signal<AndesPopoverRenderable | null | undefined> =
    signal(null);
  /** `aria-labelledby` of the panel. */
  readonly panelLabelledBy: Signal<string | null> = signal(null);
  /** `aria-describedby` of the panel. */
  readonly panelDescribedBy: Signal<string | null> = signal(null);

  /** Stable ids for the structured title / body parts. */
  readonly titleId = `${this.overlay.contentId}-title`;
  readonly bodyId = `${this.overlay.contentId}-body`;

  private readonly centerShift = signal(0);
  private readonly focusPolicy = signal<FocusPolicy>({
    autoFocus: 'first-tabbable',
    restoreFocus: true,
  });
  private readonly triggerActions = computed(() => {
    const value = this.trigger();
    return new Set<AndesPopoverTriggerAction>(
      typeof value === 'string' ? [value] : value,
    );
  });

  private pendingSource: AndesPopoverOpenSource = 'programmatic';
  private openedBy: AndesPopoverOpenSource | null = null;
  private triggerHost: HTMLElement | null = null;
  private pointerDownOnTrigger = false;
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private frame: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly cachedViews = new Map<
    string,
    { template: TemplateRef<unknown>; view: EmbeddedViewRef<unknown> }
  >();

  constructor() {
    effect(() => {
      this.overlay.configure(this.buildConfig());
      this.applyZIndex();
    });

    effect(() => {
      const shouldShow = this.open() && !this.disabled();
      const template = this.panelTemplate();
      if (!template) {
        return;
      }
      untracked(() => {
        if (shouldShow) {
          this.show(template);
        } else {
          this.overlay.close();
        }
      });
    });

    // The overlay can close itself (Escape, outside click, its own close
    // affordance) without the model ever being told - keep it in sync so a
    // controlled consumer's `visible` signal doesn't lie.
    this.overlay.closed
      .pipe(takeUntilDestroyed())
      .subscribe((reason) => this.onOverlayClosed(reason));

    this.overlay.outsidePointerEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.keepFocusWhereTheUserPutIt(event));

    inject(DestroyRef).onDestroy(() => {
      this.clearTimers();
      this.stopTracking();
    });
  }

  /** Opens if closed, closes if open. */
  toggle(): void {
    if (this.open()) {
      this.requestClose();
    } else {
      this.requestOpen('click');
    }
  }

  // ---------------------------------------------------------------------------
  // Trigger / panel event entry points (called by the trigger and panel shell).
  // ---------------------------------------------------------------------------

  /** @internal */
  registerTriggerHost(element: HTMLElement): void {
    this.triggerHost = element;
  }

  /** @internal */
  handleTriggerPointerDown(): void {
    this.pointerDownOnTrigger = true;
  }

  /** @internal */
  handleTriggerClick(blocked: boolean): void {
    this.pointerDownOnTrigger = false;
    if (blocked || !this.triggerActions().has('click')) {
      return;
    }
    if (!this.open()) {
      this.requestOpen('click');
    } else if (this.openedBy === 'hover' || this.openedBy === 'focus') {
      // Clicking a hover/focus-opened panel pins it instead of closing it.
      this.pin();
    } else {
      this.requestClose();
    }
  }

  /** @internal */
  handleTriggerContextMenu(event: Event, blocked: boolean): void {
    if (blocked || !this.triggerActions().has('contextMenu')) {
      return;
    }
    event.preventDefault();
    if (!this.open()) {
      this.requestOpen('click');
    } else if (this.openedBy === 'hover' || this.openedBy === 'focus') {
      this.pin();
    }
  }

  /** @internal */
  handleTriggerEnter(blocked: boolean): void {
    if (blocked || !this.triggerActions().has('hover')) {
      return;
    }
    this.cancelClose();
    if (!this.open()) {
      this.scheduleOpen();
    }
  }

  /** @internal */
  handleTriggerLeave(): void {
    if (!this.triggerActions().has('hover')) {
      return;
    }
    this.cancelOpen();
    if (this.openedBy === 'hover') {
      this.scheduleClose();
    }
  }

  /** @internal */
  handleTriggerFocusIn(blocked: boolean): void {
    const viaPointer = this.pointerDownOnTrigger;
    this.pointerDownOnTrigger = false;
    if (blocked || !this.triggerActions().has('focus')) {
      return;
    }
    // A mouse click focuses the trigger first; let the click decide instead of
    // opening on focus and then immediately toggling closed.
    if (viaPointer && this.triggerActions().has('click')) {
      return;
    }
    this.cancelClose();
    if (!this.open()) {
      this.requestOpen('focus');
    }
  }

  /** @internal */
  handleFocusOut(event: FocusEvent): void {
    if (
      this.openedBy !== 'focus' ||
      this.isWithinPopover(event.relatedTarget)
    ) {
      return;
    }
    this.requestClose();
  }

  /** @internal */
  handlePanelEnter(): void {
    if (this.openedBy === 'hover') {
      this.cancelClose();
    }
  }

  /** @internal */
  handlePanelLeave(): void {
    if (this.openedBy === 'hover' && this.triggerActions().has('hover')) {
      this.scheduleClose();
    }
  }

  /**
   * Renders `template` into `host`, re-using the view created on a previous open
   * unless `destroyOnHidden` is set. The view lives in this component's own view
   * container (so it is change-detected as part of the consumer's tree) and only
   * its DOM nodes are moved into the panel - the same technique CDK's
   * `DomPortalOutlet` uses.
   *
   * @internal
   */
  attachTemplate(
    key: string,
    template: TemplateRef<unknown>,
    host: HTMLElement,
  ): void {
    let entry = this.cachedViews.get(key);
    if (entry && (entry.template !== template || entry.view.destroyed)) {
      entry.view.destroy();
      entry = undefined;
    }
    if (!entry) {
      entry = {
        template,
        view: this.viewContainerRef.createEmbeddedView(template),
      };
      this.cachedViews.set(key, entry);
    }
    for (const node of entry.view.rootNodes) {
      host.appendChild(node);
    }
    entry.view.detectChanges();
  }

  // ---------------------------------------------------------------------------
  // Subclass hooks.
  // ---------------------------------------------------------------------------

  /** Called after the overlay closed, for whatever reason. */
  protected handleClosed(reason: AndesOverlayCloseReason): void {
    void reason;
  }

  /** Opens through the same path the trigger uses (honours `disabled`). */
  protected requestOpen(source: AndesPopoverOpenSource): void {
    this.clearTimers();
    if (this.disabled() || this.open()) {
      return;
    }
    this.pendingSource = source;
    this.open.set(true);
  }

  /** Closes and notifies `openChange`. */
  protected requestClose(): void {
    this.clearTimers();
    if (this.open()) {
      this.open.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Internals.
  // ---------------------------------------------------------------------------

  private buildConfig(): Partial<AndesOverlayConfig> {
    const policy = this.focusPolicy();
    return {
      ...andesOverlayPreset('popover'),
      role: this.panelRole,
      panelClass: this.panelClass(),
      autoFocus: policy.autoFocus,
      restoreFocus: policy.restoreFocus,
      positioning: {
        kind: 'anchored',
        side: this._resolvedSide(),
        align: this.resolvedAlign(),
        sideOffset: this.sideOffset(),
        alignOffset: this.alignOffset() + this.centerShift(),
        // Flipping is decided here (main axis only, see `chooseSide`) rather
        // than by CDK, whose fallback list would jump to a perpendicular side
        // before shifting along the cross axis.
        flip: false,
        shift: this.autoAdjustOverflow(),
      },
    };
  }

  private show(template: TemplateRef<unknown>): void {
    if (this.overlay.isOpen()) {
      return;
    }
    const source = this.pendingSource;
    this.pendingSource = 'programmatic';
    this.openedBy = source;

    // Hover/focus-opened panels are passive: they must not pull focus away from
    // where the user is, nor push it back to the trigger on close.
    const passive = source === 'hover' || source === 'focus';
    this.focusPolicy.set({
      autoFocus: passive ? 'none' : 'first-tabbable',
      restoreFocus: !passive,
    });
    this._resolvedSide.set(this.preferredSide());
    this.centerShift.set(this.measureCenterShift());
    this._arrowOffset.set(null);

    this.overlay.configure(this.buildConfig());
    this.overlay.open(template);
    this.applyZIndex();
    this.startTracking();
    afterNextRender(
      { read: () => this.reposition() },
      {
        injector: this.injector,
      },
    );
  }

  private onOverlayClosed(reason: AndesOverlayCloseReason): void {
    this.clearTimers();
    this.stopTracking();
    this.openedBy = null;
    if (this.open()) {
      this.open.set(false);
    }
    if (this.destroyOnHidden()) {
      for (const { view } of this.cachedViews.values()) {
        view.destroy();
      }
      this.cachedViews.clear();
    }
    this.handleClosed(reason);
  }

  private pin(): void {
    this.clearTimers();
    this.openedBy = 'click';
    this.focusPolicy.update((policy) => ({ ...policy, restoreFocus: true }));
  }

  /**
   * An outside click that landed on something focusable (another input, say)
   * already moved focus there; restoring it to the trigger would steal it back.
   */
  private keepFocusWhereTheUserPutIt(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && this.isWithinPopover(target)) {
      return;
    }
    const active = this.document.activeElement;
    const pane = this.overlay.panelElement();
    if (
      active instanceof HTMLElement &&
      active !== this.document.body &&
      !pane?.contains(active)
    ) {
      this.focusPolicy.update((policy) => ({ ...policy, restoreFocus: false }));
      this.overlay.configure({ restoreFocus: false });
    }
  }

  private isWithinPopover(node: EventTarget | null): boolean {
    if (!(node instanceof Node)) {
      return false;
    }
    return !!(
      this.overlay.panelElement()?.contains(node) ||
      this.triggerHost?.contains(node) ||
      this.overlay.anchor()?.contains(node)
    );
  }

  private applyZIndex(): void {
    const zIndex = this.zIndex();
    const host = this.overlay.panelElement()?.parentElement;
    if (host && zIndex !== undefined && zIndex !== null) {
      host.style.setProperty('z-index', String(zIndex));
    }
  }

  private scheduleOpen(): void {
    clearTimeout(this.openTimer);
    const delay = this.openDelay();
    if (delay <= 0) {
      this.requestOpen('hover');
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      this.requestOpen('hover');
    }, delay);
  }

  private scheduleClose(): void {
    clearTimeout(this.closeTimer);
    const delay = this.closeDelay();
    if (delay <= 0) {
      this.requestClose();
      return;
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      this.requestClose();
    }, delay);
  }

  private cancelOpen(): void {
    clearTimeout(this.openTimer);
    this.openTimer = undefined;
  }

  private cancelClose(): void {
    clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
  }

  private clearTimers(): void {
    this.cancelOpen();
    this.cancelClose();
  }

  // --- Collision handling + arrow ---------------------------------------------

  private startTracking(): void {
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    view.addEventListener('scroll', this.scheduleReposition, {
      capture: true,
      passive: true,
    });
    view.addEventListener('resize', this.scheduleReposition, { passive: true });

    const content = this.overlay.contentElement();
    if (content && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.scheduleReposition);
      this.resizeObserver.observe(content);
    }
  }

  private stopTracking(): void {
    const view = this.document.defaultView;
    view?.removeEventListener('scroll', this.scheduleReposition, {
      capture: true,
    });
    view?.removeEventListener('resize', this.scheduleReposition);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.frame !== null) {
      view?.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  private readonly scheduleReposition = (): void => {
    const view = this.document.defaultView;
    if (!view || this.frame !== null) {
      return;
    }
    this.frame = view.requestAnimationFrame(() => {
      this.frame = null;
      this.overlay.updatePosition();
      this.reposition();
    });
  };

  /**
   * Re-evaluates the side (flip) and the arrow position against the live
   * geometry. A no-op without layout (e.g. jsdom), where the requested side is
   * kept.
   *
   * The panel is measured through the CDK pane rather than the surface itself:
   * the surface's entrance animation scales it, and `getBoundingClientRect()`
   * includes transforms, which would skew the arrow by a few pixels.
   */
  private reposition(): void {
    const anchor = this.overlay.anchor();
    const pane = this.overlay.panelElement();
    const panel = this.overlay.contentElement();
    if (!anchor || !pane || !panel || !this.overlay.isOpen()) {
      return;
    }
    let panelRect = pane.getBoundingClientRect();
    if (!panelRect.width && !panelRect.height) {
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();

    if (this.autoAdjustOverflow()) {
      const side = this.chooseSide(anchorRect, panelRect);
      if (side !== this._resolvedSide()) {
        this._resolvedSide.set(side);
        this.overlay.configure(this.buildConfig());
        this.applyZIndex();
        panelRect = pane.getBoundingClientRect();
      }
    }

    this._arrowOffset.set(
      this.showArrow()
        ? this.computeArrowOffset(anchorRect, panelRect, panel)
        : null,
    );
  }

  /**
   * Main-axis flip: keep the preferred side if it fits, else take the opposite
   * one if that fits, else whichever has more room. Cross-axis overflow is
   * CDK's push (`shift`), not a reason to change sides.
   */
  private chooseSide(anchor: DOMRect, panel: DOMRect): AndesOverlaySide {
    const root = this.document.documentElement;
    const view = this.document.defaultView;
    const width = root.clientWidth || view?.innerWidth || 0;
    const height = root.clientHeight || view?.innerHeight || 0;
    const preferred = this.preferredSide();
    const opposite = OPPOSITE_SIDE[preferred];

    const space: Record<AndesOverlaySide, number> = {
      top: anchor.top,
      bottom: height - anchor.bottom,
      left: anchor.left,
      right: width - anchor.right,
    };
    const needs = (side: AndesOverlaySide) =>
      (side === 'top' || side === 'bottom' ? panel.height : panel.width) +
      this.sideOffset() +
      VIEWPORT_MARGIN;

    if (space[preferred] >= needs(preferred)) {
      return preferred;
    }
    if (space[opposite] >= needs(opposite)) {
      return opposite;
    }
    return space[opposite] > space[preferred] ? opposite : preferred;
  }

  private computeArrowOffset(
    anchor: DOMRect,
    panel: DOMRect,
    panelElement: HTMLElement,
  ): number {
    const side = this._resolvedSide();
    const horizontal = side === 'top' || side === 'bottom';
    const panelStart = horizontal ? panel.left : panel.top;
    const panelSize = horizontal ? panel.width : panel.height;
    const anchorStart = horizontal ? anchor.left : anchor.top;
    const anchorSize = horizontal ? anchor.width : anchor.height;
    const anchorCenter = anchorStart + anchorSize / 2;
    const align = this.resolvedAlign();

    let target =
      this.arrowPointAtCenter() || align === 'center'
        ? anchorCenter
        : align === 'start'
          ? panelStart + ARROW_EDGE_INSET
          : panelStart + panelSize - ARROW_EDGE_INSET;

    // Always point at the trigger (matters once CDK has shifted the panel)...
    const anchorInset = Math.min(ARROW_ANCHOR_INSET, anchorSize / 2);
    target = clamp(
      target,
      anchorStart + anchorInset,
      anchorStart + anchorSize - anchorInset,
    );
    // ...without leaving the panel's rounded corners.
    target =
      panelSize <= ARROW_EDGE_INSET * 2
        ? panelStart + panelSize / 2
        : clamp(
            target,
            panelStart + ARROW_EDGE_INSET,
            panelStart + panelSize - ARROW_EDGE_INSET,
          );

    const border = horizontal
      ? panelElement.clientLeft
      : panelElement.clientTop;
    return Math.round(target - panelStart - border);
  }

  /** Extra align offset that puts a `start`/`end` arrow over the trigger's center. */
  private measureCenterShift(): number {
    const align = this.resolvedAlign();
    const anchor = this.overlay.anchor();
    if (
      !this.showArrow() ||
      !this.arrowPointAtCenter() ||
      align === 'center' ||
      !anchor
    ) {
      return 0;
    }
    const side = this.preferredSide();
    const rect = anchor.getBoundingClientRect();
    const size = side === 'top' || side === 'bottom' ? rect.width : rect.height;
    if (!size) {
      return 0;
    }
    const shift = size / 2 - ARROW_EDGE_INSET;
    return align === 'start' ? shift : -shift;
  }
}
