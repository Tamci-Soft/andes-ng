import {
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  Injectable,
  Injector,
  signal,
  TemplateRef,
  ViewContainerRef,
  type Provider,
} from '@angular/core';
import {
  ConfigurableFocusTrapFactory,
  type ConfigurableFocusTrap,
} from '@angular/cdk/a11y';
import { ESCAPE, hasModifierKey } from '@angular/cdk/keycodes';
import {
  createBlockScrollStrategy,
  createNoopScrollStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
  type OverlayConfig,
  type OverlayRef,
  type ScrollStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import { Subject, Subscription, type Observable } from 'rxjs';

import {
  andesOverlayZIndex,
  ANDES_OVERLAY_BACKDROP_CLASS,
  ANDES_OVERLAY_CLOSING_ATTRIBUTE,
  ANDES_OVERLAY_DEFAULT_CONFIG,
  ANDES_OVERLAY_EXIT_TIMEOUT_MS,
  ANDES_OVERLAY_PANE_CLASS,
  ANDES_OVERLAY_SCRIM,
  type AndesOverlayCloseReason,
  type AndesOverlayConfig,
  type AndesOverlayContent,
} from './overlay-config';
import {
  AndesOverlayInertRegistry,
  type AndesOverlayInertHandle,
} from './overlay-inert';
import {
  andesImpliedSize,
  createAndesPositionStrategy,
} from './overlay-positioning';

let nextUniqueId = 0;

/** Options accepted when opening an overlay. */
export interface AndesOverlayOpenOptions<C = unknown> {
  /** Template context, for `TemplateRef` content. */
  readonly context?: C;
  /**
   * View container used to instantiate `TemplateRef` content. Defaults to the one
   * available where `AndesOverlayPrimitive` was provided, which is what a compound
   * component wants; pass it explicitly only when opening a template that lives in
   * some other view.
   */
  readonly viewContainerRef?: ViewContainerRef;
  /** Injector for `ComponentType` content, so the component can inject the overlay. */
  readonly injector?: Injector;
  /**
   * Element focus returns to on close, overriding the registered trigger.
   */
  readonly restoreFocusTo?: HTMLElement | ElementRef<HTMLElement> | null;
}

function toElement(
  value: HTMLElement | ElementRef<HTMLElement> | null | undefined,
): HTMLElement | null {
  if (!value) {
    return null;
  }
  return value instanceof ElementRef ? value.nativeElement : value;
}

/** A close that has been requested but whose pane is not detached yet. */
interface AndesOverlayPendingExit {
  readonly reason: AndesOverlayCloseReason;
  readonly restoreFocus: boolean;
  /** Elements carrying the closing attribute, to clear if the close is cancelled. */
  readonly marked: Element[];
  /** Inline `pointer-events` values overridden for the exit, to put back. */
  readonly pointerEvents: Map<HTMLElement, string>;
  readonly subscription: Subscription;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Only animations that will actually end are worth waiting for: one that already
 * finished (an enter animation held by `fill-mode`), was cancelled, or loops
 * forever (a spinner inside a dialog) would only ever run into the timeout.
 */
function isSettling(animation: Animation): boolean {
  if (animation.playState !== 'running') {
    return false;
  }
  const endTime = animation.effect?.getComputedTiming().endTime;
  return typeof endTime === 'number' && Number.isFinite(endTime);
}

function toClassList(
  value: string | readonly string[] | null | undefined,
): string[] {
  if (!value) {
    return [];
  }
  return typeof value === 'string' ? [value] : [...value];
}

/**
 * The shared overlay behavior primitive: portal rendering, positioning, focus
 * management, dismissal and stacking for every andes-ng overlay component.
 *
 * It is a thin, tokens-integrated wrapper around Angular CDK's `Overlay` and
 * `ConfigurableFocusTrap` rather than a reimplementation — the failure modes here
 * (focus escaping a trap, focus returning to the wrong element, stacking-context
 * bugs) are exactly the ones CDK already solves.
 *
 * ## Consuming it
 *
 * `AndesOverlayPrimitive` is deliberately *not* `providedIn: 'root'`. A compound
 * component provides one instance for itself, and its own sub-directives inject it
 * — Angular's equivalent of React context:
 *
 * ```ts
 * @Component({
 *   selector: 'andes-dialog',
 *   providers: [provideAndesOverlay()],
 *   template: `
 *     <ng-content select="[andesOverlayTrigger]" />
 *     <ng-template #content>
 *       <div andesOverlayContent>
 *         <h2 id="title">Delete project</h2>
 *         <button andesOverlayClose>Cancel</button>
 *       </div>
 *     </ng-template>
 *   `,
 * })
 * export class AndesDialog {
 *   private readonly overlay = inject(AndesOverlayPrimitive);
 *   private readonly content = viewChild.required<TemplateRef<unknown>>('content');
 *
 *   constructor() {
 *     this.overlay.configure(andesOverlayPreset('dialog'));
 *   }
 *
 *   open() {
 *     this.overlay.open(this.content());
 *   }
 * }
 * ```
 *
 * ## Stacking
 *
 * Overlays are rendered inside CDK's overlay container (never as a native
 * `popover`, which would move them to the top layer where `z-index` is ignored and
 * ordering is by call time). `z-index` comes from `--andes-z-index-*` per layer, so
 * a Popover opened from inside a Dialog stacks above it without either component
 * hard-coding a number.
 *
 * ## Modality
 *
 * A modal overlay needs three separate things, and `aria-modal` is only the weakest
 * of them: `trapFocus` for Tab, `ariaModal` as a hint, and `inertBackground` to
 * actually mark every other body child `inert` so a screen reader's browse mode
 * cannot walk into the page behind it. The modal presets turn on all three.
 *
 * ## Exit animations
 *
 * `close()` does not always detach at once. It sets
 * {@link ANDES_OVERLAY_CLOSING_ATTRIBUTE} on the pane, its direct element children
 * and the backdrop, and detaches once the animations that starts have finished
 * (capped at {@link ANDES_OVERLAY_EXIT_TIMEOUT_MS}). With no exit animation, with
 * reduced motion, or where the browser cannot report animations, the close is
 * synchronous. `isOpen()` turns `false` immediately either way.
 */
@Injectable()
export class AndesOverlayPrimitive {
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  private readonly inertRegistry = inject(AndesOverlayInertRegistry);
  private readonly hostViewContainerRef = inject(ViewContainerRef, {
    optional: true,
  });

  private readonly _config = signal<AndesOverlayConfig>(
    ANDES_OVERLAY_DEFAULT_CONFIG,
  );
  private readonly _isOpen = signal(false);
  private readonly _anchor = signal<HTMLElement | null>(null);
  private readonly _panelElement = signal<HTMLElement | null>(null);
  private readonly _backdropElement = signal<HTMLElement | null>(null);
  private readonly _contentElement = signal<HTMLElement | null>(null);
  private readonly _isBackgroundInert = signal(false);

  /** The resolved behavior configuration. */
  readonly config = this._config.asReadonly();
  /**
   * Whether the overlay is open. Turns `false` as soon as a close is requested,
   * even while the pane is still attached playing its exit animation.
   */
  readonly isOpen = this._isOpen.asReadonly();
  /** The registered trigger element, if any. */
  readonly anchor = this._anchor.asReadonly();
  /** The CDK overlay pane, while attached (including during its exit animation). */
  readonly panelElement = this._panelElement.asReadonly();
  /** The backdrop scrim, while open and if the config renders one. */
  readonly backdropElement = this._backdropElement.asReadonly();
  /** The element carrying `andesOverlayContent`, while open. */
  readonly contentElement = this._contentElement.asReadonly();
  /**
   * Whether this overlay currently holds the page's background inert. False for a
   * non-modal overlay, and false again as soon as it closes — even if an outer
   * overlay still keeps the background inert for its own sake.
   */
  readonly isBackgroundInert = this._isBackgroundInert.asReadonly();

  /**
   * Stable id shared by the trigger's `aria-controls`/`aria-describedby` and the
   * content element's `id`, so assistive tech can relate the two.
   */
  readonly contentId = `andes-overlay-${nextUniqueId++}`;

  private readonly _opened = new Subject<void>();
  private readonly _closed = new Subject<AndesOverlayCloseReason>();
  private readonly _keydown = new Subject<KeyboardEvent>();
  private readonly _outsidePointer = new Subject<MouseEvent>();

  /** Emits after the overlay has been attached. */
  readonly opened: Observable<void> = this._opened.asObservable();
  /**
   * Emits the reason after the overlay has been detached — after its exit
   * animation, if it has one. Not emitted for a close cancelled by re-opening.
   */
  readonly closed: Observable<AndesOverlayCloseReason> =
    this._closed.asObservable();
  /**
   * Keydown events reaching the open overlay. Only the topmost overlay receives
   * them. Dropdown Menu builds its arrow-key/typeahead navigation on this.
   */
  readonly keydownEvents: Observable<KeyboardEvent> =
    this._keydown.asObservable();
  /** Pointer events outside the open overlay, whether or not they close it. */
  readonly outsidePointerEvents: Observable<MouseEvent> =
    this._outsidePointer.asObservable();

  private overlayRef: OverlayRef | null = null;
  private focusTrap: ConfigurableFocusTrap | null = null;
  private inertHandle: AndesOverlayInertHandle | null = null;
  private focusOrigin: HTMLElement | null = null;
  private explicitRestoreTarget: HTMLElement | null = null;
  private openSubscriptions = new Subscription();
  private pendingExit: AndesOverlayPendingExit | null = null;
  private attachedContent: AndesOverlayContent<unknown> | null = null;
  private attachedContext: unknown = undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      // No exit animation for a host that is going away: detach now, including
      // an overlay that was already part-way through closing.
      this.beginClose('destroyed', false);
      this.completeClose();
      this._opened.complete();
      this._closed.complete();
      this._keydown.complete();
      this._outsidePointer.complete();
    });
  }

  /**
   * Merges a partial configuration in. Intended to be called from a consuming
   * component's constructor with a preset, then again from an `effect` as its own
   * inputs change.
   *
   * While the overlay is open, `positioning`, `size` and `layer` are re-applied
   * immediately. The structural flags (`hasBackdrop`, `trapFocus`, `lockScroll`,
   * `inertBackground`, `autoFocus`) take effect on the next `open()`; the
   * dismissal flags (`closeOnEscape`, `closeOnOutsideClick`) are read at event
   * time and so apply immediately.
   */
  configure(patch: Partial<AndesOverlayConfig>): void {
    this._config.update((current) => ({ ...current, ...patch }));

    const ref = this.overlayRef;
    if (!ref) {
      return;
    }

    const config = this._config();
    this.applyLayerStyles(ref, config);
    ref.updateSize({ ...andesImpliedSize(config.positioning), ...config.size });
    ref.updatePositionStrategy(
      createAndesPositionStrategy(
        this.injector,
        config.positioning,
        this._anchor(),
      ),
    );
  }

  /**
   * Registers the element anchored positioning measures against, and the element
   * focus returns to on close. `AndesOverlayTriggerPrimitive` calls this for you.
   */
  registerAnchor(
    element: HTMLElement | ElementRef<HTMLElement> | null | undefined,
  ): void {
    this._anchor.set(toElement(element));
  }

  /** Registers the content element. `AndesOverlayContentPrimitive` calls this. */
  registerContent(
    element: HTMLElement | ElementRef<HTMLElement> | null | undefined,
  ): void {
    this._contentElement.set(toElement(element));
  }

  /**
   * Opens the overlay with the given content. A no-op if already open.
   *
   * Called while the overlay is still playing its exit animation with the same
   * content and context, it cancels the close and keeps the same pane, so the
   * panel does not flicker; with different content the old pane is detached first.
   */
  open<C>(
    content: AndesOverlayContent<C>,
    options: AndesOverlayOpenOptions<C> = {},
  ): void {
    if (this._isOpen()) {
      return;
    }

    if (this.pendingExit) {
      if (
        this.overlayRef &&
        content === this.attachedContent &&
        options.context === this.attachedContext
      ) {
        this.cancelExit(this.overlayRef, this.pendingExit, options);
        return;
      }
      this.completeClose();
    }

    const config = this._config();
    this.focusOrigin = this.activeElement();
    this.explicitRestoreTarget = toElement(options.restoreFocusTo);

    const ref = createOverlayRef(
      this.injector,
      this.buildOverlayConfig(config),
    );
    this.overlayRef = ref;
    this.applyLayerStyles(ref, config);

    if (content instanceof TemplateRef) {
      const viewContainerRef =
        options.viewContainerRef ?? this.hostViewContainerRef;
      if (!viewContainerRef) {
        ref.dispose();
        this.overlayRef = null;
        throw new Error(
          'AndesOverlayPrimitive: opening a TemplateRef needs a ViewContainerRef. ' +
            'Provide the primitive on a component or directive, or pass ' +
            '`viewContainerRef` to open().',
        );
      }
      ref.attach(
        new TemplatePortal(content, viewContainerRef, options.context),
      );
    } else {
      ref.attach(
        new ComponentPortal(content, null, options.injector ?? this.injector),
      );
    }

    ref.addPanelClass([
      ANDES_OVERLAY_PANE_CLASS,
      ...toClassList(config.panelClass),
    ]);
    this.styleBackdrop(ref, config);
    this.attachedContent = content;
    this.attachedContext = options.context;
    this._panelElement.set(ref.overlayElement);
    this._backdropElement.set(ref.backdropElement);
    this._isOpen.set(true);

    this.applyInertBackground(ref, config);
    this.wireDismissal(ref);
    this.installFocusManagement(ref, config);

    this._opened.next();
  }

  /**
   * Closes the overlay. A no-op if already closed or closing.
   *
   * `isOpen()` turns `false` at once. If the closing attribute starts an exit
   * animation, the pane stays attached until it ends; focus restoration and the
   * `closed` emission follow the detach.
   */
  close(reason: AndesOverlayCloseReason = 'imperative'): void {
    this.beginClose(reason, true);
  }

  /** Opens the overlay if closed, closes it if open. */
  toggle<C>(
    content: AndesOverlayContent<C>,
    options: AndesOverlayOpenOptions<C> = {},
  ): void {
    if (this._isOpen()) {
      this.close('trigger');
    } else {
      this.open(content, options);
    }
  }

  /** Recomputes the overlay's position. Cheap to call on resize or content change. */
  updatePosition(): void {
    this.overlayRef?.updatePosition();
  }

  /**
   * Moves focus to the first tabbable element inside the overlay. Exposed for
   * consumers that focus lazily — a Dropdown Menu opened by keyboard, say.
   */
  focusFirstTabbable(): void {
    this.focusTrap?.focusFirstTabbableElementWhenReady();
  }

  private beginClose(reason: AndesOverlayCloseReason, animate: boolean): void {
    if (!this._isOpen()) {
      return;
    }
    this._isOpen.set(false);

    this.openSubscriptions.unsubscribe();
    this.openSubscriptions = new Subscription();

    // Before restoring focus: an element inside an inert subtree cannot be
    // focused, so releasing late would silently drop focus on `document.body`.
    // Released at once rather than after the exit, so the page responds while
    // the overlay fades out.
    this.releaseInertBackground();

    this.focusTrap?.destroy();
    this.focusTrap = null;

    const exit: AndesOverlayPendingExit = {
      reason,
      restoreFocus: this._config().restoreFocus,
      marked: [],
      pointerEvents: new Map(),
      subscription: new Subscription(),
      timer: null,
    };
    this.pendingExit = exit;

    const ref = this.overlayRef;
    const running = ref && animate ? this.startExit(ref, exit) : [];
    if (!ref || running.length === 0) {
      this.completeClose();
      return;
    }

    const settle = () => {
      if (this.pendingExit === exit) {
        this.completeClose();
      }
    };
    // Something else detaching the overlay mid-exit (navigation, the content
    // view being destroyed) ends the wait.
    exit.subscription.add(ref.detachments().subscribe(settle));
    exit.timer = setTimeout(settle, ANDES_OVERLAY_EXIT_TIMEOUT_MS);
    void Promise.allSettled(
      running.map((animation) => animation.finished),
    ).then(settle);
  }

  /**
   * Marks the pane, its direct element children and the backdrop as closing and
   * returns the animations that marking started. Nothing is marked when the exit
   * would be skipped anyway: reduced motion, or no `getAnimations` (SSR, jsdom).
   */
  private startExit(
    ref: OverlayRef,
    exit: AndesOverlayPendingExit,
  ): Animation[] {
    const pane = ref.overlayElement;
    const backdrop = ref.backdropElement;
    if (
      typeof pane.getAnimations !== 'function' ||
      this.prefersReducedMotion()
    ) {
      return [];
    }

    const targets: Element[] = [pane, ...Array.from(pane.children)];
    if (backdrop) {
      targets.push(backdrop);
    }
    for (const target of targets) {
      target.setAttribute(ANDES_OVERLAY_CLOSING_ATTRIBUTE, '');
      exit.marked.push(target);
    }
    for (const element of [pane, backdrop]) {
      if (element) {
        exit.pointerEvents.set(
          element,
          element.style.getPropertyValue('pointer-events'),
        );
        element.style.setProperty('pointer-events', 'none');
      }
    }

    // `getAnimations()` flushes pending style changes, so animations and
    // transitions the attribute just triggered are already reported here.
    const animations = [
      ...pane.getAnimations({ subtree: true }),
      ...(backdrop?.getAnimations() ?? []),
    ];
    return animations.filter(isSettling);
  }

  /** Re-opening during the exit: undo the close on the pane that is still there. */
  private cancelExit<C>(
    ref: OverlayRef,
    exit: AndesOverlayPendingExit,
    options: AndesOverlayOpenOptions<C>,
  ): void {
    this.pendingExit = null;
    if (exit.timer !== null) {
      clearTimeout(exit.timer);
    }
    exit.subscription.unsubscribe();
    this.clearExitMarks(exit);

    const config = this._config();
    const pane = ref.overlayElement;
    // Focus usually never left the pane during the exit; then the original
    // origin is still the right place to return to later.
    const active = this.activeElement();
    const focusInside = !!active && pane.contains(active);
    if (active && !focusInside) {
      this.focusOrigin = active;
    }
    this.explicitRestoreTarget = toElement(options.restoreFocusTo);
    this._isOpen.set(true);

    this.applyInertBackground(ref, config);
    this.wireDismissal(ref);
    this.installFocusManagement(ref, config, !focusInside);
  }

  /** Undoes what `startExit` did to the elements it marked. */
  private clearExitMarks(exit: AndesOverlayPendingExit): void {
    for (const element of exit.marked) {
      element.removeAttribute(ANDES_OVERLAY_CLOSING_ATTRIBUTE);
    }
    for (const [element, value] of exit.pointerEvents) {
      if (value) {
        element.style.setProperty('pointer-events', value);
      } else {
        element.style.removeProperty('pointer-events');
      }
    }
  }

  /** Detaches the overlay and finishes a requested close. */
  private completeClose(): void {
    const exit = this.pendingExit;
    if (!exit) {
      return;
    }
    this.pendingExit = null;
    // Only a close that actually waited on an exit animation can have lost focus
    // to the page in the meantime; measured while the pane is still attached.
    const focusMovedAway =
      exit.timer !== null && this.focusMovedOutside(this.overlayRef);
    if (exit.timer !== null) {
      clearTimeout(exit.timer);
    }
    exit.subscription.unsubscribe();

    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.attachedContent = null;
    this.attachedContext = undefined;
    // After the dispose, so the panel cannot paint un-faded for a frame. Projected
    // content belongs to the consumer's view and is moved into the next pane as is:
    // left marked, it would replay the exit animation there and stay invisible.
    this.clearExitMarks(exit);

    this._panelElement.set(null);
    this._backdropElement.set(null);
    this._contentElement.set(null);

    // Someone clicked or tabbed to something else on the page while the overlay
    // was fading out: pulling focus back to the trigger would undo that.
    if (exit.restoreFocus && !focusMovedAway) {
      this.restoreFocus();
    }
    this.focusOrigin = null;
    this.explicitRestoreTarget = null;

    this._closed.next(exit.reason);
  }

  /**
   * Whether focus now sits on a page element outside the pane. Focus inside the
   * pane (an Escape or close-button close) or dropped on `body` still restores.
   */
  private focusMovedOutside(ref: OverlayRef | null): boolean {
    const active = this.activeElement();
    if (!ref || !active || active === this.document.body) {
      return false;
    }
    return !ref.overlayElement.contains(active);
  }

  private prefersReducedMotion(): boolean {
    const view = this.document.defaultView;
    return (
      typeof view?.matchMedia === 'function' &&
      view.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private buildOverlayConfig(config: AndesOverlayConfig): OverlayConfig {
    return {
      positionStrategy: createAndesPositionStrategy(
        this.injector,
        config.positioning,
        this._anchor(),
      ),
      scrollStrategy: this.buildScrollStrategy(config),
      hasBackdrop: config.hasBackdrop,
      backdropClass: [
        ANDES_OVERLAY_BACKDROP_CLASS,
        ...toClassList(config.backdropClass),
      ],
      disposeOnNavigation: config.disposeOnNavigation,
      // Never use the native top layer: `popover` ignores `z-index` and orders by
      // call time, which would make the `--andes-z-index-*` scale meaningless.
      usePopover: false,
      ...andesImpliedSize(config.positioning),
      ...this.anchorWidth(config),
      ...config.size,
    };
  }

  private anchorWidth(
    config: AndesOverlayConfig,
  ): Pick<AndesOverlayConfig['size'], 'width'> {
    const anchor = this._anchor();
    const positioning = config.positioning;
    if (positioning.kind !== 'anchored' || !positioning.matchAnchorWidth) {
      return {};
    }
    return anchor ? { width: anchor.getBoundingClientRect().width } : {};
  }

  private buildScrollStrategy(config: AndesOverlayConfig): ScrollStrategy {
    if (config.lockScroll) {
      // CDK's block strategy is safe to nest: an inner overlay sees the scroll
      // block already applied, declines to re-apply it, and so cannot release it
      // early when it closes. The outermost overlay owns the lock.
      return createBlockScrollStrategy(this.injector);
    }
    if (config.repositionOnScroll) {
      return createRepositionScrollStrategy(this.injector);
    }
    return createNoopScrollStrategy();
  }

  private applyLayerStyles(ref: OverlayRef, config: AndesOverlayConfig): void {
    const zIndex = andesOverlayZIndex(config.layer);
    // CDK declares its own `z-index: 1000` inside `@layer cdk-overlay`, so an
    // unlayered inline value always wins without `!important`.
    ref.hostElement.style.setProperty('z-index', zIndex);
    ref.backdropElement?.style.setProperty('z-index', zIndex);
  }

  private styleBackdrop(ref: OverlayRef, config: AndesOverlayConfig): void {
    const backdrop = ref.backdropElement;
    if (!backdrop) {
      return;
    }
    backdrop.style.setProperty('z-index', andesOverlayZIndex(config.layer));
    backdrop.style.setProperty('background', ANDES_OVERLAY_SCRIM);
  }

  private wireDismissal(ref: OverlayRef): void {
    this.openSubscriptions.add(
      ref.keydownEvents().subscribe((event) => {
        this._keydown.next(event);
        if (
          event.keyCode !== ESCAPE ||
          hasModifierKey(event) ||
          !this._config().closeOnEscape
        ) {
          return;
        }
        event.preventDefault();
        this.close('escape-key');
      }),
    );

    this.openSubscriptions.add(
      ref.outsidePointerEvents().subscribe((event) => {
        this._outsidePointer.next(event);
        if (!this._config().closeOnOutsideClick) {
          return;
        }
        const target = event.target as Node | null;
        // A click on the trigger is the trigger's own business — closing here as
        // well would fight its toggle and leave the overlay flickering.
        const anchor = this._anchor();
        if (anchor && target && anchor.contains(target)) {
          return;
        }
        // The backdrop is technically "outside" the pane, but it has its own,
        // more precise close reason.
        if (target && ref.backdropElement?.contains(target)) {
          return;
        }
        this.close('outside-click');
      }),
    );

    this.openSubscriptions.add(
      ref.backdropClick().subscribe(() => {
        if (this._config().closeOnOutsideClick) {
          this.close('backdrop-click');
        }
      }),
    );

    // Safety net: something else detached the overlay (navigation, the content
    // view being destroyed). Run our own teardown so focus is still restored and
    // `isOpen` does not lie.
    this.openSubscriptions.add(
      ref.detachments().subscribe(() => this.beginClose('destroyed', false)),
    );
  }

  /**
   * Makes the page outside the overlay inert, so AT browsing the document — not
   * just tabbing through it — cannot reach content behind a modal. That includes
   * overlays already open beneath it in the same CDK container (an outer dialog).
   * The pane and backdrop are exempt, and the registry reference-counts across
   * nested overlays.
   */
  private applyInertBackground(
    ref: OverlayRef,
    config: AndesOverlayConfig,
  ): void {
    if (!config.inertBackground) {
      return;
    }
    this.inertHandle = this.inertRegistry.inertBackgroundExcept([
      ref.overlayElement,
      ref.hostElement,
      ref.backdropElement,
    ]);
    this._isBackgroundInert.set(true);
  }

  private releaseInertBackground(): void {
    this.inertHandle?.release();
    this.inertHandle = null;
    this._isBackgroundInert.set(false);
  }

  private installFocusManagement(
    ref: OverlayRef,
    config: AndesOverlayConfig,
    moveFocus = true,
  ): void {
    const needsTrapObject =
      config.trapFocus || config.autoFocus === 'first-tabbable';

    if (needsTrapObject) {
      // The trap brackets the whole pane, not just the content element, so a
      // consumer that renders siblings next to its content cannot leak focus.
      this.focusTrap = this.focusTrapFactory.create(ref.overlayElement);
      this.focusTrap.enabled = config.trapFocus;
    }

    if (!moveFocus) {
      return;
    }

    switch (config.autoFocus) {
      case 'first-tabbable':
        this.focusTrap?.focusInitialElementWhenReady();
        break;
      case 'container':
        ref.overlayElement.setAttribute('tabindex', '-1');
        ref.overlayElement.focus();
        break;
      case 'none':
        break;
    }
  }

  /**
   * Focus goes back to, in order: an explicit `restoreFocusTo`, the registered
   * trigger, the element that was focused when the overlay opened. Each candidate
   * is skipped if it is no longer in the document — a trigger inside a list row
   * that the overlay's own action deleted, say. If none survive, focus is left to
   * the browser's own fallback (`document.body`).
   */
  private restoreFocus(): void {
    const candidates = [
      this.explicitRestoreTarget,
      this._anchor(),
      this.focusOrigin,
    ];
    const target = candidates.find(
      (candidate): candidate is HTMLElement =>
        !!candidate && candidate.isConnected,
    );
    target?.focus();
  }

  private activeElement(): HTMLElement | null {
    const active = this.document.activeElement;
    return active instanceof HTMLElement ? active : null;
  }
}

/**
 * Providers a compound overlay component puts in its own `providers` array to own
 * one overlay instance, scoped to itself and injectable by its sub-directives.
 */
export function provideAndesOverlay(): Provider[] {
  return [AndesOverlayPrimitive];
}
