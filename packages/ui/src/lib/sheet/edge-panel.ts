import {
  AndesOverlayPrimitive,
  andesOverlayPreset,
  type AndesOverlayAutoFocus,
  type AndesOverlayCloseReason,
  type AndesOverlayConfig,
  type AndesOverlayEdge,
} from '@andes-ng/primitives';
import {
  ApplicationRef,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  input,
  model,
  type OnInit,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  type EmbeddedViewRef,
} from '@angular/core';

/**
 * Preset panel size, Ant Design's `size`: `'default'` (378px) or `'large'`
 * (736px) along the axis the panel slides on, or any number (px) / CSS length.
 */
export type AndesEdgePanelSize = 'default' | 'large' | number | string;

/** A number (px) or any CSS length. */
export type AndesEdgePanelLength = number | string;

/**
 * What receives focus on open. `true` is the first tabbable element (the
 * default), `false` leaves focus where it was, and the primitive's own values
 * are accepted as-is.
 */
export type AndesEdgePanelAutoFocus = boolean | AndesOverlayAutoFocus;

/**
 * Lets a Sheet or Drawer find the panel it is nested in (for `push`) and lets the
 * shared lazy-content outlet find the panel it renders into.
 */
export const ANDES_EDGE_PANEL = new InjectionToken<AndesEdgePanel>(
  'AndesEdgePanel',
);

/** Ant Design's preset: 378px by default, 736px when `large`. */
const LARGE_SIZE = '736px';
/** Ant Design's default `push.distance`. */
const DEFAULT_PUSH_DISTANCE = '180px';
/** Class of the CDK overlay container; clicks inside it belong to *some* overlay. */
const OVERLAY_CONTAINER_SELECTOR = '.cdk-overlay-container';

/** A bare number (or numeric string, from a static attribute) means px. */
export function toCssLength(
  value: AndesEdgePanelLength | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `${value}px` : null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  return /^-?\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed;
}

function toAutoFocus(value: unknown): AndesOverlayAutoFocus {
  if (value === 'container' || value === 'none') {
    return value;
  }
  if (value === false || value === 'false') {
    return 'none';
  }
  return 'first-tabbable';
}

function toZIndex(value: number | string | null): number | null {
  if (value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Longest duration in a computed `animation-duration`-style list, in ms. */
function parseTimeMs(value: string): number {
  return Math.max(
    0,
    ...value.split(',').map((part) => {
      const trimmed = part.trim();
      const amount = parseFloat(trimmed);
      if (Number.isNaN(amount)) {
        return 0;
      }
      return trimmed.endsWith('ms') ? amount : amount * 1000;
    }),
  );
}

/**
 * Runs `done` once the CSS animation currently applied to `element` ends, or
 * right away when there is none (reduced motion, no stylesheet, jsdom). A timer
 * backs up `animationend`, which never fires for a detached or hidden element.
 * Returns a canceller.
 */
function afterAnimation(
  element: HTMLElement | null,
  done: () => void,
): () => void {
  const view = element?.ownerDocument.defaultView;
  if (!element || !view) {
    done();
    return () => undefined;
  }
  const style = view.getComputedStyle(element);
  const name = style.animationName;
  const total =
    parseTimeMs(style.animationDuration || '0s') +
    parseTimeMs(style.animationDelay || '0s');
  if (!name || name === 'none' || total <= 0) {
    done();
    return () => undefined;
  }

  let settled = false;
  const onEnd = (event: AnimationEvent) => {
    if (event.target === element) {
      finish();
    }
  };
  const timer = view.setTimeout(() => finish(), total + 50);
  const cleanup = () => {
    settled = true;
    element.removeEventListener('animationend', onEnd);
    view.clearTimeout(timer);
  };
  function finish() {
    if (settled) {
      return;
    }
    cleanup();
    done();
  }
  element.addEventListener('animationend', onEnd);
  return cleanup;
}

/**
 * Shared behavior of `AndesSheet` and `AndesDrawer`: both are the same modal
 * edge panel on the overlay primitive, differing only in which edges they allow
 * and in their styling. Not part of the public API - use the two components.
 *
 * ## Why dismissal is handled here instead of by the primitive
 *
 * `AndesOverlayPrimitive.close()` disposes the pane synchronously, so a panel
 * closed by the primitive's own Escape/outside-click handling vanishes without a
 * slide-out. The panel therefore turns the primitive's dismissal off and handles
 * Escape (`keydownEvents`) and outside/backdrop clicks (`outsidePointerEvents`)
 * itself: it plays the slide-out, *then* calls `close()`, which still owns focus
 * restoration, scroll-lock release and teardown.
 */
@Directive()
export abstract class AndesEdgePanel {
  /** Injected so the trigger/parts can reach the shared overlay instance. */
  protected readonly overlay = inject(AndesOverlayPrimitive);
  private readonly appRef = inject(ApplicationRef);
  /** The Sheet/Drawer this one is nested in, if any - pushed aside when `push` is set. */
  private readonly parentPanel = inject(ANDES_EDGE_PANEL, {
    skipSelf: true,
    optional: true,
  });

  protected readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  /**
   * Controls visibility. Two-way bindable: `[(open)]="isOpen"`. Leave unbound for
   * uncontrolled use via the trigger, `open()`/`close()`/`toggle()`. Turns `false`
   * as soon as a close starts; `afterOpenChange` reports when it has finished.
   */
  readonly isOpen = model(false, { alias: 'open' });

  /** Preset size (`'default'` 378px, `'large'` 736px) or a number/CSS length. */
  readonly size = input<AndesEdgePanelSize>('default');
  /**
   * Explicit height (number = px, or a CSS length). Wins over `size` when the
   * panel slides vertically (top/bottom); ignored for left/right.
   */
  readonly height = input<AndesEdgePanelLength | null>(null);

  /** Render the backdrop mask. `false` makes the panel non-modal (no focus trap, scroll lock or `aria-modal`). Default `true`. */
  readonly mask = input(true, { transform: booleanAttribute });
  /** Escape closes the panel - Ant's `keyboard`. Default `true`. */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  /** A click on the backdrop or outside the panel closes it - Ant's `maskClosable`. Default `true`. */
  readonly closeOnOutsideClick = input(true, { transform: booleanAttribute });

  /** Render the built-in close button. Default `true`. */
  readonly closable = input(true, { transform: booleanAttribute });
  /** Replaces the close button's default X icon. */
  readonly closeIcon = input<TemplateRef<unknown> | null>(null);
  /** Accessible name of the close button. Default `'Close'`. */
  readonly closeLabel = input('Close');

  /** Show a skeleton in place of the body. The header, footer and close button stay. */
  readonly loading = input(false, { transform: booleanAttribute });

  /**
   * Destroy `<ng-template andes…Content>` content on close, so the next open
   * starts fresh. By default it is created on first open and kept alive (with
   * its state) between opens. Projected (non-template) content is owned by the
   * consumer's view and always stays alive.
   */
  readonly destroyOnHidden = input(false, { transform: booleanAttribute });

  /**
   * Push this panel aside while a nested Sheet/Drawer is open, Ant's `push`.
   * `true` pushes 180px; a number (px) or CSS length sets the distance. Opt-in.
   */
  readonly push = input<boolean | AndesEdgePanelLength>(false);

  /**
   * Explicit `z-index` for the panel and its backdrop, overriding the
   * `--andes-z-index-overlay` layer token. Prefer the token; this is an escape
   * hatch for embedding in third-party stacking contexts.
   */
  readonly zIndex = input<number | null, number | string | null>(null, {
    transform: toZIndex,
  });

  /** What receives focus on open. Default: the first tabbable element. */
  readonly autoFocus = input<
    AndesOverlayAutoFocus,
    AndesEdgePanelAutoFocus | 'true' | 'false' | ''
  >('first-tabbable', { transform: toAutoFocus });

  /** Extra classes on the panel - the hook for `--andes-sheet-*`/`--andes-drawer-*` overrides. */
  readonly panelClass = input<string | string[] | null>(null);

  /** Emits after the open (`true`) or close (`false`) slide animation has finished. */
  readonly afterOpenChange = output<boolean>();

  private readonly _titleId = signal<string | null>(null);
  private readonly _descriptionId = signal<string | null>(null);
  private readonly openChildren = signal(0);
  private readonly lazyTemplate = signal<TemplateRef<unknown> | null>(null);

  protected readonly ariaLabelledBy = computed(
    () => this._titleId() ?? undefined,
  );
  protected readonly ariaDescribedBy = computed(
    () => this._descriptionId() ?? undefined,
  );

  /** The panel's size along its slide axis, or `null` for the CSS default. */
  protected readonly panelSize = computed(() => {
    const explicit = toCssLength(this.explicitSize());
    if (explicit) {
      return explicit;
    }
    const size = this.size();
    if (size === 'default') {
      return null;
    }
    return size === 'large' ? LARGE_SIZE : toCssLength(size);
  });

  protected readonly pushDistance = computed(() => {
    const push = this.push();
    if (push === false || push === null || push === 'false') {
      return null;
    }
    if (push === true || push === '' || push === 'true') {
      return DEFAULT_PUSH_DISTANCE;
    }
    return toCssLength(push);
  });

  /** Whether a nested panel is open and this one should move aside for it. */
  protected readonly pushed = computed(
    () => this.openChildren() > 0 && this.pushDistance() !== null,
  );

  private closing = false;
  private destroyed = false;
  private countedInParent = false;
  private cancelAnimationWait: (() => void) | null = null;
  private lazyView: EmbeddedViewRef<unknown> | null = null;

  /** Viewport edge the panel is pinned to. */
  protected abstract panelEdge(): AndesOverlayEdge;
  /** The explicit width/height input that applies to the current edge, if any. */
  protected abstract explicitSize(): AndesEdgePanelLength | null;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('drawer'),
      // Dismissal is re-implemented here so it can animate - see the class doc.
      closeOnEscape: false,
      closeOnOutsideClick: false,
    });

    effect(() => {
      const modal = this.mask();
      this.configureOverlay({
        positioning: { kind: 'edge', edge: this.panelEdge() },
        hasBackdrop: modal,
        trapFocus: modal,
        lockScroll: modal,
        ariaModal: modal,
        autoFocus: this.autoFocus(),
      });
    });

    effect(() => {
      this.zIndex();
      untracked(() => this.configureOverlay({}));
    });

    effect(() => {
      const shouldBeOpen = this.isOpen();
      untracked(() => {
        if (shouldBeOpen) {
          this.show();
        } else {
          this.hide('imperative');
        }
      });
    });

    this.overlay.keydownEvents.subscribe((event) => {
      const isEscape = event.key === 'Escape' || event.keyCode === 27;
      const hasModifier =
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
      if (!isEscape || hasModifier || !this.closeOnEscape()) {
        return;
      }
      event.preventDefault();
      this.requestClose('escape-key');
    });

    this.overlay.outsidePointerEvents.subscribe((event) =>
      this.onOutsidePointer(event),
    );

    // Anything that closes the overlay - our own slide-out, or the primitive's
    // safety net (navigation, teardown) - ends up here.
    this.overlay.closed.subscribe(() => this.onOverlayClosed());

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.cancelAnimationWait?.();
      this.leaveParent();
      this.lazyView?.destroy();
      this.lazyView = null;
    });
  }

  /** Opens the panel. A no-op if already open. */
  open(): void {
    this.isOpen.set(true);
  }

  /** Closes the panel (with its slide-out). A no-op if already closed. */
  close(): void {
    this.isOpen.set(false);
  }

  /** Opens the panel if closed, closes it if open. */
  toggle(): void {
    this.isOpen.update((value) => !value);
  }

  /**
   * Closes as a user dismissal (close button, Escape, backdrop). Used by the
   * built-in close button and the `andes…Close` directives.
   */
  requestClose(reason: AndesOverlayCloseReason = 'close-button'): void {
    this.hide(reason);
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
  }

  /** Registers the id of the projected title, for `aria-labelledby`. */
  registerTitleId(id: string | null): void {
    this._titleId.set(id);
  }

  /** Registers the id of the projected description, for `aria-describedby`. */
  registerDescriptionId(id: string | null): void {
    this._descriptionId.set(id);
  }

  /** Registers the lazy `<ng-template andes…Content>`. Called by that directive. */
  registerLazyContent(template: TemplateRef<unknown> | null): void {
    this.lazyTemplate.set(template);
  }

  /** A nested panel opened. Called by the child panel. */
  childOpened(): void {
    this.openChildren.update((count) => count + 1);
  }

  /** A nested panel finished closing. Called by the child panel. */
  childClosed(): void {
    this.openChildren.update((count) => Math.max(0, count - 1));
  }

  /**
   * Renders the lazy content into `host`, creating it on first use. The view is
   * attached to the application rather than to the panel, so it survives the
   * panel being torn down on close (unless `destroyOnHidden`).
   */
  mountLazyContent(host: HTMLElement): void {
    const template = this.lazyTemplate();
    if (!template) {
      return;
    }
    if (!this.lazyView || this.lazyView.destroyed) {
      this.lazyView = template.createEmbeddedView(null);
      this.appRef.attachView(this.lazyView);
    }
    for (const node of this.lazyView.rootNodes) {
      host.appendChild(node);
    }
    this.lazyView.detectChanges();
  }

  private configureOverlay(patch: Partial<AndesOverlayConfig>): void {
    this.overlay.configure(patch);
    // `configure()` re-applies the layer's z-index while open; re-assert ours.
    this.applyZIndex();
  }

  private applyZIndex(): void {
    const zIndex = this.zIndex();
    const pane = this.overlay.panelElement();
    if (zIndex === null || zIndex === undefined || !pane) {
      return;
    }
    // The pane's parent is CDK's per-overlay host element, the one the primitive
    // puts the layer z-index on.
    pane.parentElement?.style.setProperty('z-index', String(zIndex));
    this.overlay
      .backdropElement()
      ?.style.setProperty('z-index', String(zIndex));
  }

  private show(): void {
    if (this.closing) {
      this.cancelClosing();
      return;
    }
    if (this.overlay.isOpen()) {
      return;
    }
    this.overlay.open(this.panel());
    if (!this.overlay.isOpen()) {
      return;
    }
    if (this.parentPanel) {
      this.parentPanel.childOpened();
      this.countedInParent = true;
    }
    this.applyZIndex();
    this.cancelAnimationWait = afterAnimation(
      this.overlay.contentElement(),
      () => {
        this.cancelAnimationWait = null;
        this.emitAfterOpenChange(true);
      },
    );
  }

  private hide(reason: AndesOverlayCloseReason): void {
    if (!this.overlay.isOpen() || this.closing) {
      return;
    }
    this.closing = true;
    this.cancelAnimationWait?.();

    // Set directly rather than via a template binding: the slide-out must be
    // applied (and measured) now, not on the next change detection pass.
    const content = this.overlay.contentElement();
    content?.setAttribute('data-closing', '');
    const backdrop = this.overlay.backdropElement();
    if (backdrop) {
      backdrop.style.transitionDuration = '200ms';
      backdrop.style.opacity = '0';
    }

    this.cancelAnimationWait = afterAnimation(content, () => {
      this.cancelAnimationWait = null;
      this.overlay.close(reason);
    });
  }

  /** Re-opened while the slide-out was still playing: stay open instead. */
  private cancelClosing(): void {
    this.closing = false;
    this.cancelAnimationWait?.();
    this.cancelAnimationWait = null;
    this.overlay.contentElement()?.removeAttribute('data-closing');
    const backdrop = this.overlay.backdropElement();
    if (backdrop) {
      backdrop.style.removeProperty('opacity');
      backdrop.style.removeProperty('transition-duration');
    }
  }

  private onOutsidePointer(event: MouseEvent): void {
    if (!this.closeOnOutsideClick() || this.closing) {
      return;
    }
    const target = event.target as Node | null;
    // A target already gone from the page was removed by this very click - a
    // nested panel's backdrop, which that panel handled first. CDK still
    // reports it as "outside" to every overlay below.
    if (!target || !target.isConnected) {
      return;
    }
    if (this.overlay.backdropElement()?.contains(target)) {
      this.requestClose('backdrop-click');
      return;
    }
    // A click on the trigger is the trigger's own business (it toggles).
    if (this.overlay.anchor()?.contains(target)) {
      return;
    }
    // Another overlay's pane or backdrop - a nested panel, a popover opened from
    // inside this one. CDK reports those as "outside" every overlay below them.
    const element = target instanceof Element ? target : target.parentElement;
    if (element?.closest(OVERLAY_CONTAINER_SELECTOR)) {
      return;
    }
    this.requestClose('outside-click');
  }

  private onOverlayClosed(): void {
    this.closing = false;
    this.cancelAnimationWait?.();
    this.cancelAnimationWait = null;
    this.leaveParent();

    if (this.lazyView?.destroyed) {
      this.lazyView = null;
    } else if (this.lazyView && this.destroyOnHidden()) {
      this.lazyView.destroy();
      this.lazyView = null;
    }

    if (this.destroyed) {
      return;
    }
    // The overlay can close itself without anyone touching `isOpen` - keep the
    // model in sync so a `[(open)]` consumer never sees a stale `true`.
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
    this.emitAfterOpenChange(false);
  }

  private leaveParent(): void {
    if (this.countedInParent) {
      this.countedInParent = false;
      this.parentPanel?.childClosed();
    }
  }

  private emitAfterOpenChange(open: boolean): void {
    if (!this.destroyed) {
      this.afterOpenChange.emit(open);
    }
  }
}

/**
 * Renders the panel's lazy content in place. Internal to Sheet/Drawer's panel
 * templates.
 */
@Directive({
  selector: '[andesEdgePanelLazyOutlet]',
})
export class AndesEdgePanelLazyOutlet implements OnInit {
  private readonly panel = inject(ANDES_EDGE_PANEL);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnInit(): void {
    this.panel.mountLazyContent(this.elementRef.nativeElement);
  }
}
