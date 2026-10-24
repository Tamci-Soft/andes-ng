import {
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  provideAndesOverlay,
  type AndesOverlayAlign,
  type AndesOverlayConfig,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import clsx from 'clsx';

import { AndesHoverCardContent } from './hover-card-content';
import { AndesHoverCardSurface } from './hover-card-surface';
import {
  AndesHoverCardIntent,
  ANDES_HOVER_CARD_DEFAULT_CLOSE_DELAY,
  ANDES_HOVER_CARD_DEFAULT_OPEN_DELAY,
} from './hover-card-intent';
import { andesHoverCardTabbables } from './hover-card-focus';
import {
  andesHoverCardArrowOffset,
  andesHoverCardPlacementToSideAlign,
  andesHoverCardResolveSide,
  ANDES_HOVER_CARD_ARROW_SIZE,
  type AndesHoverCardPlacement,
} from './hover-card-placement';

/**
 * A preview card that appears when the pointer rests on its trigger or keyboard focus reaches
 * it, and stays while the pointer is over the card itself.
 *
 * ```html
 * <andes-hover-card>
 *   <a andesHoverCardTrigger href="/people/ana">&#64;ana</a>
 *   <ng-template andesHoverCardContent>
 *     <strong>Ana Torres</strong>
 *     <p>Finance lead. Joined in 2021.</p>
 *   </ng-template>
 * </andes-hover-card>
 * ```
 *
 * ## What it is, and is not
 *
 * A hover card is a hint with a body, not a dialog: it has no role, takes no focus when it
 * opens and traps nothing. The trigger describes itself with it (`aria-describedby`) while it
 * is open, exactly as a tooltip does, which is why the content should be a preview of the
 * trigger rather than the only way to do something. Because it can still hold links and
 * buttons, it follows WCAG 1.4.13: it is dismissible (`Escape`), hoverable (the pointer can
 * travel to it across an invisible bridge over the gap) and persistent (it stays until the
 * pointer and focus leave, or it is dismissed).
 *
 * ## Interaction
 *
 * - Mouse and pen: opens `openDelay` ms after the pointer enters the trigger, closes
 *   `closeDelay` ms after it has left both the trigger and the card. Pressing inside the card
 *   (selecting its text) holds it open until the button is released.
 * - Keyboard: focus that shows a ring opens it after `openDelay`; `Escape` closes it, returning
 *   focus to the trigger if it was inside the card. `Tab` moves on normally and closes the card.
 *   To use what is inside it, press `Alt+ArrowDown` on the trigger: the card opens at once and
 *   focus moves to its first interactive element. `Tab` and `Shift+Tab` then travel through the
 *   card and leave it for the element after, or back to, the trigger.
 * - Touch: there is no hover, so a tap on the trigger toggles the card (the first tap does not
 *   follow a link trigger) and a tap anywhere else closes it.
 */
@Component({
  selector: 'andes-hover-card',
  imports: [
    NgTemplateOutlet,
    AndesOverlayContentPrimitive,
    AndesHoverCardSurface,
  ],
  templateUrl: './hover-card.html',
  styleUrl: './hover-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideAndesOverlay(), AndesHoverCardIntent],
})
export class AndesHoverCard {
  protected readonly overlay = inject(AndesOverlayPrimitive);
  protected readonly intent = inject(AndesHoverCardIntent);

  /** Preferred side of the trigger. Default `'bottom'`. Overridden by `placement`. */
  readonly side = input<AndesOverlaySide>('bottom');
  /** Alignment along that side. Default `'center'`. Overridden by `placement`. */
  readonly align = input<AndesOverlayAlign>('center');
  /** Named shorthand for `side` + `align` (`'topLeft'`, `'rightBottom'`, ...). */
  readonly placement = input<AndesHoverCardPlacement | null | undefined>(null);
  /**
   * Gap in px between the trigger and the card, measured to the arrow's tip while the arrow
   * is shown. Default `8`.
   */
  readonly sideOffset = input(8);
  /** Extra px offset along the alignment axis. Default `0`. */
  readonly alignOffset = input(0);
  /** Draw an arrow pointing at the trigger. Default `false`. */
  readonly arrow = input(false, { transform: booleanAttribute });
  /**
   * Flip to the opposite side, and shift along the trigger, when the card would overflow the
   * viewport. Default `true`.
   */
  readonly autoAdjustOverflow = input(true, { transform: booleanAttribute });

  /** Delay in ms before the card opens after the pointer or focus arrives. Default `600`. */
  readonly openDelay = input(ANDES_HOVER_CARD_DEFAULT_OPEN_DELAY);
  /**
   * Delay in ms before the card closes after the pointer and focus have left. Default `300`.
   */
  readonly closeDelay = input(ANDES_HOVER_CARD_DEFAULT_CLOSE_DELAY);
  /** The card never opens, and closes at once if it is open. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the card is open. Two-way bindable (`[(open)]`); setting it opens or closes the
   * card from code (never while `disabled`).
   */
  readonly open = model(false);

  /** Card width: px as a number, or any CSS length. Default `16rem`. */
  readonly width = input<number | string | null>(null);
  /** Extra classes on the card surface, a scoping hook for its CSS custom properties. */
  readonly cardClass = input<string | readonly string[] | null>(null);
  /**
   * The content as a template, as an alternative to a projected
   * `<ng-template andesHoverCardContent>`, which takes precedence.
   */
  readonly content = input<TemplateRef<unknown> | null | undefined>(null);

  private readonly projectedContent = contentChild(AndesHoverCardContent);
  private readonly overlayTemplate =
    viewChild<TemplateRef<unknown>>('overlayTemplate');

  protected readonly bodyTemplate = computed(
    () => this.projectedContent()?.templateRef ?? this.content() ?? null,
  );

  private readonly sideAlign = computed(() => {
    const placement = this.placement();
    return placement
      ? andesHoverCardPlacementToSideAlign(placement)
      : { side: this.side(), align: this.align() };
  });

  /** The side the card actually rendered on, after any flip. */
  protected readonly renderedSide = signal<AndesOverlaySide>('bottom');
  protected readonly resolvedAlign = computed(() => this.sideAlign().align);
  private readonly arrowOffset = signal<number | null>(null);

  private readonly totalOffset = computed(
    () => this.sideOffset() + (this.arrow() ? ANDES_HOVER_CARD_ARROW_SIZE : 0),
  );

  private readonly positioning = computed<AndesOverlayConfig['positioning']>(
    () => {
      const { side, align } = this.sideAlign();
      const adjust = this.autoAdjustOverflow();
      return {
        kind: 'anchored',
        side,
        align,
        sideOffset: this.totalOffset(),
        alignOffset: this.alignOffset(),
        flip: adjust,
        shift: adjust,
      };
    },
  );

  protected readonly panelClasses = computed(() =>
    clsx(
      'andes-hover-card',
      this.arrow() && 'andes-hover-card--arrow',
      this.cardClass(),
    ),
  );

  protected readonly widthValue = computed(() => {
    const width = this.width();
    if (width == null || width === '') {
      return null;
    }
    return typeof width === 'number' ? `${width}px` : width;
  });

  protected readonly bridgeValue = computed(
    () => `${Math.max(this.totalOffset(), 0) + 1}px`,
  );

  protected readonly arrowOffsetValue = computed(() => {
    const offset = this.arrowOffset();
    return offset == null ? null : `${offset}px`;
  });

  private positionObserver: MutationObserver | null = null;
  private layoutObserver: ResizeObserver | null = null;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('popover'),
      layer: 'popover',
      // A hover card is a hint with a body, not a dialog: no role, and nothing takes focus.
      role: 'none',
      ariaModal: false,
      autoFocus: 'none',
      trapFocus: false,
      // Focus is only returned from inside the card, by hand: restoring it on every close
      // would pull focus onto the trigger each time the pointer simply moved away.
      restoreFocus: false,
      closeOnEscape: true,
      closeOnOutsideClick: true,
      repositionOnScroll: true,
    });

    this.intent.bind({
      open: () => this.show(),
      close: () => this.overlay.close('imperative'),
      cardContains: (node) => this.cardContains(node),
      enterCard: () => this.enterCard(),
    });

    this.overlay.opened
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.onOpened());
    this.overlay.closed
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.onClosed());

    inject(DestroyRef).onDestroy(() => {
      this.positionObserver?.disconnect();
      this.layoutObserver?.disconnect();
    });

    effect(() => {
      const positioning = this.positioning();
      untracked(() => this.overlay.configure({ positioning }));
    });

    effect(() => {
      this.intent.configure({
        openDelay: this.openDelay(),
        closeDelay: this.closeDelay(),
        disabled: this.disabled(),
      });
    });

    // `open` -> overlay. The reverse direction is the effect below plus `onOpened`.
    effect(() => {
      const wanted = this.open() && !this.disabled();
      // Tracked, so an initially-`true` `open` waits for the template query.
      const template = this.overlayTemplate();
      untracked(() => {
        if (wanted && template && !this.overlay.isOpen()) {
          this.show();
        } else if (!wanted && this.overlay.isOpen()) {
          this.overlay.close('imperative');
        }
      });
    });

    // overlay -> `open`, as soon as a close is requested rather than after its exit
    // animation. Only genuine changes are mirrored, so an initial `open = true` that has not
    // reached the overlay yet is not undone.
    let wasOpen = false;
    effect(() => {
      const isOpen = this.overlay.isOpen();
      untracked(() => {
        if (isOpen === wasOpen) {
          return;
        }
        wasOpen = isOpen;
        if (!isOpen) {
          this.intent.cardClosed();
        }
        if (this.open() !== isOpen) {
          this.open.set(isOpen);
        }
      });
    });
  }

  /** Opens the card at once, ignoring `openDelay`. A no-op while `disabled`. */
  show(): void {
    const template = this.overlayTemplate();
    if (
      !template ||
      !this.bodyTemplate() ||
      this.overlay.isOpen() ||
      this.disabled()
    ) {
      return;
    }
    const anchor = this.intent.triggerTarget() ?? this.overlay.anchor();
    this.overlay.registerAnchor(anchor);
    this.renderedSide.set(this.sideAlign().side);
    this.arrowOffset.set(null);
    this.overlay.configure({ positioning: this.positioning() });
    this.overlay.open(template);
  }

  /** Closes the card at once, ignoring `closeDelay`. */
  hide(): void {
    this.intent.closeNow();
  }

  /** Opens the card if it is closed, closes it if it is open. */
  toggle(): void {
    if (this.overlay.isOpen()) {
      this.hide();
    } else {
      this.intent.openNow();
    }
  }

  /**
   * Re-aligns an open card with its trigger. Size changes of either are followed
   * automatically; call this after a layout change that moves the trigger without resizing it.
   */
  updatePosition(): void {
    if (!this.overlay.isOpen()) {
      return;
    }
    this.overlay.updatePosition();
    this.measure();
  }

  /** Focuses the first interactive element of the open card. */
  private enterCard(): boolean {
    const content = this.overlay.contentElement();
    if (!content) {
      return false;
    }
    const first = andesHoverCardTabbables(content)[0];
    if (!first) {
      return false;
    }
    first.focus();
    return true;
  }

  private cardContains(node: Node | null): boolean {
    const content = this.overlay.panelElement();
    return !!node && !!content && content.contains(node);
  }

  private onOpened(): void {
    this.observePosition();
    this.observeLayout();
    if (!this.open()) {
      this.open.set(true);
    }
  }

  private onClosed(): void {
    this.positionObserver?.disconnect();
    this.positionObserver = null;
    this.layoutObserver?.disconnect();
    this.layoutObserver = null;
  }

  /**
   * The overlay repositions (and may flip) the pane on open, scroll and resize by rewriting its
   * inline styles, without saying which side it settled on. Watching those writes keeps the
   * arrow on the side, and at the spot, the card actually rendered at.
   */
  private observePosition(): void {
    const pane = this.overlay.panelElement();
    if (!pane) {
      return;
    }
    this.measure();
    if (typeof MutationObserver === 'undefined') {
      return;
    }
    this.positionObserver = new MutationObserver(() => this.measure());
    const options = { attributes: true, attributeFilter: ['style', 'class'] };
    this.positionObserver.observe(pane, options);
    if (pane.parentElement) {
      this.positionObserver.observe(pane.parentElement, options);
    }
  }

  /** Keeps an open card glued to its trigger when either one changes size. */
  private observeLayout(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const anchor = this.overlay.anchor();
    const content = this.overlay.contentElement();
    if (!anchor && !content) {
      return;
    }
    this.layoutObserver = new ResizeObserver(() => this.updatePosition());
    if (anchor) {
      this.layoutObserver.observe(anchor);
    }
    if (content) {
      this.layoutObserver.observe(content);
    }
  }

  private measure(): void {
    const pane = this.overlay.panelElement();
    const anchor = this.overlay.anchor();
    if (!pane || !anchor) {
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();
    const panelRect = pane.getBoundingClientRect();
    const rendered = andesHoverCardResolveSide(
      anchorRect,
      panelRect,
      this.sideAlign().side,
    );
    this.renderedSide.set(rendered);
    if (!this.arrow() || (panelRect.width === 0 && panelRect.height === 0)) {
      return;
    }
    this.arrowOffset.set(
      andesHoverCardArrowOffset(rendered, anchorRect, panelRect),
    );
  }
}
