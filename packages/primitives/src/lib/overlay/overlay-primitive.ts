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
  ANDES_OVERLAY_DEFAULT_CONFIG,
  ANDES_OVERLAY_PANE_CLASS,
  ANDES_OVERLAY_SCRIM,
  type AndesOverlayCloseReason,
  type AndesOverlayConfig,
  type AndesOverlayContent,
} from './overlay-config';
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
   * Element focus returns to on close, overriding the registered trigger. The
   * equivalent of Base UI's `finalFocus`.
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
 */
@Injectable()
export class AndesOverlayPrimitive {
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
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

  /** The resolved behavior configuration. */
  readonly config = this._config.asReadonly();
  /** Whether the overlay is currently attached. */
  readonly isOpen = this._isOpen.asReadonly();
  /** The registered trigger element, if any. */
  readonly anchor = this._anchor.asReadonly();
  /** The CDK overlay pane, while open. */
  readonly panelElement = this._panelElement.asReadonly();
  /** The backdrop scrim, while open and if the config renders one. */
  readonly backdropElement = this._backdropElement.asReadonly();
  /** The element carrying `andesOverlayContent`, while open. */
  readonly contentElement = this._contentElement.asReadonly();

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
  /** Emits the reason after the overlay has been detached. */
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
  private focusOrigin: HTMLElement | null = null;
  private explicitRestoreTarget: HTMLElement | null = null;
  private openSubscriptions = new Subscription();
  private isClosing = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.close('destroyed');
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
   * `autoFocus`) take effect on the next `open()`; the dismissal flags
   * (`closeOnEscape`, `closeOnOutsideClick`) are read at event time and so apply
   * immediately.
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

  /** Opens the overlay with the given content. A no-op if already open. */
  open<C>(
    content: AndesOverlayContent<C>,
    options: AndesOverlayOpenOptions<C> = {},
  ): void {
    if (this._isOpen()) {
      return;
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
    this._panelElement.set(ref.overlayElement);
    this._backdropElement.set(ref.backdropElement);
    this._isOpen.set(true);

    this.wireDismissal(ref);
    this.installFocusManagement(ref, config);

    this._opened.next();
  }

  /** Closes the overlay. A no-op if already closed. */
  close(reason: AndesOverlayCloseReason = 'imperative'): void {
    if (!this._isOpen() || this.isClosing) {
      return;
    }
    this.isClosing = true;

    try {
      const config = this._config();

      this.openSubscriptions.unsubscribe();
      this.openSubscriptions = new Subscription();

      this.focusTrap?.destroy();
      this.focusTrap = null;

      this.overlayRef?.dispose();
      this.overlayRef = null;

      this._panelElement.set(null);
      this._backdropElement.set(null);
      this._contentElement.set(null);
      this._isOpen.set(false);

      if (config.restoreFocus) {
        this.restoreFocus();
      }
      this.focusOrigin = null;
      this.explicitRestoreTarget = null;

      this._closed.next(reason);
    } finally {
      this.isClosing = false;
    }
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
      ref.detachments().subscribe(() => this.close('destroyed')),
    );
  }

  private installFocusManagement(
    ref: OverlayRef,
    config: AndesOverlayConfig,
  ): void {
    const needsTrapObject =
      config.trapFocus || config.autoFocus === 'first-tabbable';

    if (needsTrapObject) {
      // The trap brackets the whole pane, not just the content element, so a
      // consumer that renders siblings next to its content cannot leak focus.
      this.focusTrap = this.focusTrapFactory.create(ref.overlayElement);
      this.focusTrap.enabled = config.trapFocus;
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
