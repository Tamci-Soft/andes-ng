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
  ElementRef,
  type EmbeddedViewRef,
  inject,
  input,
  model,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import clsx from 'clsx';

import { AndesTooltipContent } from './tooltip-content';
import {
  AndesTooltipHoverIntent,
  type AndesTooltipTriggerAction,
} from './tooltip-hover-intent';
import {
  ANDES_TOOLTIP_ARROW_HEIGHT,
  andesTooltipArrowAttribute,
  andesTooltipArrowOffset,
  andesTooltipPlacementToSideAlign,
  andesTooltipPointAtCenterOffset,
  andesTooltipResolveSide,
  type AndesTooltipArrowConfig,
  type AndesTooltipArrowInput,
  type AndesTooltipPlacement,
} from './tooltip-placement';

/**
 * Default open delay, in ms. Base UI's `Tooltip.Trigger` documents `600` as
 * its own default `delay` - andes-ng follows that number rather than
 * inventing a new one.
 */
export const ANDES_TOOLTIP_DEFAULT_OPEN_DELAY = 600;

/**
 * Default close delay, in ms. Base UI defaults this to `0`: a tooltip is a
 * passive hint with no interactive content, unlike a Popover, so there is no
 * pointer-travel gap between trigger and content worth protecting - closing
 * promptly is correct, not just convenient.
 */
export const ANDES_TOOLTIP_DEFAULT_CLOSE_DELAY = 0;

/**
 * Default "instant reopen" grouping window, in ms: if another `<andes-tooltip>`
 * anywhere on the page closed within this window, the next one to open skips
 * `openDelay` entirely. Mirrors Base UI `Tooltip.Provider`'s `timeout` default
 * of `400`, which exists for exactly this case - e.g. sweeping across a
 * toolbar of icon buttons should feel instant after the first tooltip opens.
 */
export const ANDES_TOOLTIP_DEFAULT_INSTANT_REOPEN_WINDOW = 400;

/**
 * Default triggers. `focus` is included alongside `hover` so keyboard users
 * get the same hint mouse users do, per the WAI-ARIA tooltip pattern.
 */
export const ANDES_TOOLTIP_DEFAULT_TRIGGERS: readonly AndesTooltipTriggerAction[] =
  ['hover', 'focus'];

/**
 * Semantic color presets, each backed by an existing `--andes-color-*` /
 * `--andes-color-*-foreground` token pair. For a hue with no andes-ng token,
 * pass any CSS color instead.
 */
export const ANDES_TOOLTIP_PRESET_COLORS = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
] as const;

/** One of {@link ANDES_TOOLTIP_PRESET_COLORS}. */
export type AndesTooltipPresetColor =
  (typeof ANDES_TOOLTIP_PRESET_COLORS)[number];

function isPresetColor(value: string): value is AndesTooltipPresetColor {
  return (ANDES_TOOLTIP_PRESET_COLORS as readonly string[]).includes(value);
}

/**
 * A hover/focus-triggered hint attached to a trigger element.
 *
 * Compound API, mirroring shadcn/Base UI's `Tooltip` / `TooltipTrigger` /
 * `TooltipContent` split:
 *
 * ```html
 * <andes-tooltip content="Delete this project">
 *   <button andesTooltipTrigger aria-label="Delete">
 *     <ng-icon name="lucideTrash2" />
 *   </button>
 * </andes-tooltip>
 * ```
 *
 * Rich content uses `AndesTooltipContent` (or a `TemplateRef` passed to
 * `content`) instead of a string:
 *
 * ```html
 * <andes-tooltip>
 *   <button andesTooltipTrigger>Status</button>
 *   <ng-template andesTooltipContent>
 *     Last synced <strong>{{ lastSynced() | date: 'short' }}</strong>
 *   </ng-template>
 * </andes-tooltip>
 * ```
 *
 * `AndesTooltip` itself renders no visible DOM for the trigger - it only
 * projects it (`<ng-content />`) - and owns the overlay content's wrapper, so
 * that the popup's markup, `role="tooltip"` and `id` (via
 * `AndesOverlayContentPrimitive`) always come from one place, regardless of
 * which content style a caller uses. It never receives focus itself
 * (`autoFocus: 'none'`, `trapFocus: false`, per the `tooltip` overlay preset)
 * and is announced to assistive tech via `aria-describedby` on the trigger,
 * wired by `AndesTooltipTrigger` - not `aria-labelledby`, since the tooltip
 * describes the trigger rather than naming it.
 *
 * ## Styling
 *
 * The tooltip is portalled into the CDK overlay container, outside the
 * trigger's DOM, so it is styled through inputs (`color`, `maxWidth`,
 * `tooltipClass`) and three CSS custom properties that can be set on `:root`
 * or on a `tooltipClass` selector: `--andes-tooltip-background`,
 * `--andes-tooltip-foreground` and `--andes-tooltip-max-width`.
 */
@Component({
  selector: 'andes-tooltip',
  imports: [NgTemplateOutlet, AndesOverlayContentPrimitive],
  templateUrl: './tooltip.html',
  styleUrl: './tooltip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideAndesOverlay(), AndesTooltipHoverIntent],
  host: {
    '[attr.data-disabled-trigger]': 'intent.triggerDisabled() ? "" : null',
    '(pointerenter)': 'intent.pointerEnter($event, "wrapper")',
    '(pointerleave)': 'intent.pointerLeave($event, "wrapper")',
    '(pointerdown)': 'intent.pointerDown($event, "wrapper")',
    '(pointerup)': 'onWrapperPointerUp($event)',
    '(pointercancel)': 'onWrapperPointerUp($event)',
    '(click)': 'intent.click("wrapper")',
    '(contextmenu)': 'intent.contextMenu($event, "wrapper")',
  },
})
export class AndesTooltip {
  protected readonly overlay = inject(AndesOverlayPrimitive);
  protected readonly intent = inject(AndesTooltipHoverIntent);
  private readonly hostElement =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Tooltip content: plain text, or a `TemplateRef` for rich content. It is not
   * named `title` because a static `title` attribute would also give the host a
   * native browser tooltip. A projected `<ng-template andesTooltipContent>`
   * takes precedence. With no content at all the tooltip does not open.
   */
  readonly content = input<string | TemplateRef<unknown> | null | undefined>(
    '',
  );

  /**
   * Named placement shorthand (`top`, `topLeft`, `rightBottom`, ... - all 12). When set, it overrides `side` and `align`.
   */
  readonly placement = input<AndesTooltipPlacement | null | undefined>(null);
  /** Preferred side of the trigger. Default `'top'`. Overridden by `placement`. */
  readonly side = input<AndesOverlaySide>('top');
  /** Alignment along that side. Default `'center'`. Overridden by `placement`. */
  readonly align = input<AndesOverlayAlign>('center');
  /**
   * Gap in px between the trigger and the tooltip - measured to the arrow's
   * tip while the arrow is shown. Default `6`.
   */
  readonly sideOffset = input(6);
  /** Extra px offset along the alignment axis. Default `0`. */
  readonly alignOffset = input(0);

  /**
   * Whether to draw an arrow pointing at the trigger. `{ pointAtCenter: true }`
   * shifts an edge-aligned tooltip (`topLeft`, ...) so the arrow lands on the
   * trigger's center. The arrow follows the tooltip through flips and shifts.
   * Default `true`.
   */
  readonly arrow = input<
    AndesTooltipArrowConfig | false,
    AndesTooltipArrowInput
  >({ pointAtCenter: false }, { transform: andesTooltipArrowAttribute });

  /**
   * Flip to the opposite side, and shift along the trigger, when the tooltip
   * would otherwise overflow the viewport. Default `true`.
   */
  readonly autoAdjustOverflow = input(true, { transform: booleanAttribute });

  /**
   * What opens the tooltip: `'hover'`, `'focus'`, `'click'`, `'contextMenu'`,
   * or an array of them. Default `['hover', 'focus']`.
   */
  readonly trigger = input<
    AndesTooltipTriggerAction | readonly AndesTooltipTriggerAction[]
  >(ANDES_TOOLTIP_DEFAULT_TRIGGERS);

  /**
   * Disables the tooltip entirely: it never opens, and closes immediately if
   * it happened to already be open when this flips to `true`.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Hover/focus delay, in ms, before the tooltip opens. */
  readonly openDelay = input(ANDES_TOOLTIP_DEFAULT_OPEN_DELAY);
  /** Delay, in ms, before the tooltip closes after mouse-leave/blur. */
  readonly closeDelay = input(ANDES_TOOLTIP_DEFAULT_CLOSE_DELAY);
  /** Grouping window, in ms, for the cross-tooltip "instant reopen" pattern. */
  readonly instantReopenWindow = input(
    ANDES_TOOLTIP_DEFAULT_INSTANT_REOPEN_WINDOW,
  );

  /**
   * Whether the tooltip is open. Two-way bindable (`[(open)]`); `openChange`
   * fires whenever user interaction opens or closes it. Setting it opens or
   * closes the tooltip programmatically (never while `disabled`).
   */
  readonly open = model(false);

  /**
   * Background color: a semantic preset (`primary`, `success`, `danger`, ...)
   * or any CSS color. The text color follows automatically - the preset's
   * `-foreground` token, or black/white by lightness for a custom color - and
   * the arrow always matches.
   */
  readonly color = input<AndesTooltipPresetColor | (string & {}) | null>(null);

  /** Max width of the tooltip: px as a number, or any CSS length. Default `20rem`. */
  readonly maxWidth = input<number | string | null>(null);

  /** Extra classes on the tooltip element, a scoping hook for the CSS custom properties. */
  readonly tooltipClass = input<string | readonly string[] | null>(null);

  /**
   * Explicit `z-index` for the tooltip's overlay, overriding the
   * `--andes-z-index-tooltip` token. Relative to other andes-ng overlays,
   * since they all live in the CDK overlay container.
   */
  readonly zIndex = input<number | null>(null);

  /**
   * Destroy the rendered content when the tooltip closes. By default it is
   * kept, detached, and re-attached on the next open, so a component inside
   * rich content keeps its state across openings.
   */
  readonly destroyOnHidden = input(false, { transform: booleanAttribute });

  /**
   * Keep kept-alive content updating while the tooltip is closed. By default
   * change detection is paused on hidden content and resumes on the next
   * open. Only meaningful without `destroyOnHidden`.
   */
  readonly fresh = input(false, { transform: booleanAttribute });

  private readonly projectedContent = contentChild(AndesTooltipContent);
  private readonly overlayTemplate =
    viewChild<TemplateRef<unknown>>('overlayTemplate');
  private readonly bodyTemplate =
    viewChild<TemplateRef<unknown>>('bodyTemplate');
  private readonly bodyCache = viewChild('bodyCache', {
    read: ViewContainerRef,
  });

  /** The rich-content template, when the caller provided one. */
  protected readonly richContent = computed(() => {
    const projected = this.projectedContent()?.templateRef;
    if (projected) {
      return projected;
    }
    const content = this.content();
    return content instanceof TemplateRef ? content : null;
  });

  protected readonly textContent = computed(() => {
    const content = this.content();
    return typeof content === 'string' ? content : '';
  });

  private readonly hasContent = computed(
    () => !!this.richContent() || this.textContent().trim() !== '',
  );

  private readonly openState = computed(() => booleanAttribute(this.open()));

  private readonly sideAlign = computed(() => {
    const placement = this.placement();
    return placement
      ? andesTooltipPlacementToSideAlign(placement)
      : { side: this.side(), align: this.align() };
  });

  private readonly triggers = computed(() => {
    const trigger = this.trigger();
    return typeof trigger === 'string' ? [trigger] : trigger;
  });

  /** Trigger size, measured at open time, for `pointAtCenter`. */
  private readonly anchorSize = signal<{
    width: number;
    height: number;
  } | null>(null);

  /** The side the tooltip actually rendered on, after any flip. */
  protected readonly renderedSide = signal<AndesOverlaySide>('top');
  /** Arrow position along the tooltip's cross axis, in px, once measured. */
  protected readonly arrowOffset = signal<number | null>(null);

  private readonly positioning = computed<AndesOverlayConfig['positioning']>(
    () => {
      const { side, align } = this.sideAlign();
      const arrow = this.arrow();
      const anchorSize = this.anchorSize();
      const pointAtCenterShift =
        arrow && arrow.pointAtCenter && anchorSize
          ? andesTooltipPointAtCenterOffset(side, align, anchorSize)
          : 0;
      const adjust = this.autoAdjustOverflow();
      return {
        kind: 'anchored',
        side,
        align,
        sideOffset:
          this.sideOffset() + (arrow ? ANDES_TOOLTIP_ARROW_HEIGHT : 0),
        alignOffset: this.alignOffset() + pointAtCenterShift,
        flip: adjust,
        shift: adjust,
      };
    },
  );

  protected readonly panelClasses = computed(() => {
    const color = this.color();
    return clsx(
      'andes-tooltip',
      color && isPresetColor(color) && `andes-tooltip--${color}`,
      color && !isPresetColor(color) && 'andes-tooltip--custom-color',
      this.tooltipClass(),
    );
  });

  protected readonly customColor = computed(() => {
    const color = this.color();
    return color && !isPresetColor(color) ? color : null;
  });

  protected readonly maxWidthValue = computed(() => {
    const maxWidth = this.maxWidth();
    if (maxWidth == null || maxWidth === '') {
      return null;
    }
    return typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
  });

  protected readonly arrowOffsetValue = computed(() => {
    const offset = this.arrowOffset();
    return offset == null ? null : `${offset}px`;
  });

  private bodyView: EmbeddedViewRef<unknown> | null = null;
  private positionObserver: MutationObserver | null = null;

  constructor() {
    this.overlay.configure(andesOverlayPreset('tooltip'));

    this.intent.bind({
      open: () => this.show(),
      close: () => this.overlay.close('imperative'),
    });

    this.overlay.opened
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.onOpened());
    this.overlay.closed
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.onClosed());

    inject(DestroyRef).onDestroy(() => {
      this.positionObserver?.disconnect();
      this.bodyView?.destroy();
      this.bodyView = null;
    });

    effect(() => {
      const positioning = this.positioning();
      untracked(() => this.configureOverlay({ positioning }));
    });

    effect(() => {
      this.intent.configure({
        openDelay: this.openDelay(),
        closeDelay: this.closeDelay(),
        instantReopenWindow: this.instantReopenWindow(),
        disabled: this.disabled(),
        triggers: this.triggers(),
      });
    });

    // Only a tooltip the user opened by clicking is closed by clicking
    // elsewhere. A hover/focus tooltip already closes on leave
    // or blur, and closing a programmatically-opened one on any page click
    // would fight `[(open)]`.
    effect(() => {
      const triggers = this.triggers();
      const closeOnOutsideClick =
        triggers.includes('click') || triggers.includes('contextMenu');
      untracked(() => this.configureOverlay({ closeOnOutsideClick }));
    });

    // `open` -> overlay. The reverse direction (overlay -> `open`) is the
    // `opened`/`closed` subscriptions above, so user interaction and
    // programmatic control can never disagree for longer than one tick.
    effect(() => {
      const wanted = this.openState() && !this.disabled();
      // Tracked so an initially-`true` `open` waits for the template query.
      const template = this.overlayTemplate();
      untracked(() => {
        if (wanted && template && !this.overlay.isOpen()) {
          this.show();
        } else if (!wanted && this.overlay.isOpen()) {
          this.overlay.close('imperative');
        }
      });
    });

    effect(() => {
      this.zIndex();
      if (this.overlay.isOpen()) {
        untracked(() => this.configureOverlay({}));
      }
    });

    // Honour `destroyOnHidden`/`fresh` changing while the tooltip is closed.
    effect(() => {
      const destroy = this.destroyOnHidden();
      const fresh = this.fresh();
      if (this.overlay.isOpen()) {
        return;
      }
      untracked(() => {
        const view = this.bodyView;
        if (!view) {
          return;
        }
        if (destroy) {
          view.destroy();
          this.bodyView = null;
        } else if (fresh) {
          view.reattach();
        } else {
          view.detach();
        }
      });
    });
  }

  protected onWrapperPointerUp(event: PointerEvent): void {
    if (this.intent.triggerDisabled()) {
      this.intent.pointerUp(event);
    }
  }

  /** Measures the trigger, then opens the overlay against it. */
  private show(): void {
    const template = this.overlayTemplate();
    if (
      !template ||
      this.overlay.isOpen() ||
      this.disabled() ||
      !this.hasContent()
    ) {
      return;
    }

    // A disabled trigger is `pointer-events: none` inside the host, which
    // has turned `inline-block` around it - anchor to that wrapper, so the
    // outside-click check sees the wrapper as "inside".
    const anchor = this.intent.triggerDisabled()
      ? this.hostElement
      : (this.intent.triggerTarget() ?? this.overlay.anchor());
    this.overlay.registerAnchor(anchor);
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      this.anchorSize.set({ width: rect.width, height: rect.height });
    }
    this.renderedSide.set(this.sideAlign().side);
    this.arrowOffset.set(null);
    this.configureOverlay({ positioning: this.positioning() });
    this.overlay.open(template);
  }

  /**
   * Every `configure()` re-applies the primitive's own layer `z-index`, so an
   * explicit `zIndex` has to be re-applied after it. The primitive has no
   * z-index override of its own; this writes the same inline style on the
   * same CDK host element it does.
   */
  private configureOverlay(patch: Partial<AndesOverlayConfig>): void {
    this.overlay.configure(patch);
    const zIndex = this.zIndex();
    const host = this.overlay.panelElement()?.parentElement;
    if (host && zIndex != null) {
      host.style.setProperty('z-index', String(zIndex));
    }
  }

  private onOpened(): void {
    this.attachBody();
    this.configureOverlay({});
    this.observePosition();
    if (!this.openState()) {
      this.open.set(true);
    }
  }

  private onClosed(): void {
    this.positionObserver?.disconnect();
    this.positionObserver = null;

    const view = this.bodyView;
    if (view) {
      if (this.destroyOnHidden()) {
        view.destroy();
        this.bodyView = null;
      } else if (!this.fresh()) {
        view.detach();
      }
    }

    if (this.openState()) {
      this.open.set(false);
    }
  }

  /**
   * Renders the content into the freshly-opened overlay. The content lives in
   * its own embedded view, owned by this component rather than by the
   * overlay's (which the CDK destroys on every close), and only its DOM is
   * moved into the overlay - that is what lets it outlive a close when
   * `destroyOnHidden` is off.
   */
  private attachBody(): void {
    const host = this.overlay.contentElement();
    const cache = this.bodyCache();
    const template = this.bodyTemplate();
    if (!host || !cache || !template) {
      return;
    }
    if (!this.bodyView || this.bodyView.destroyed) {
      this.bodyView = cache.createEmbeddedView(template);
    } else {
      this.bodyView.reattach();
    }
    this.bodyView.detectChanges();
    for (const node of this.bodyView.rootNodes as Node[]) {
      host.appendChild(node);
    }
  }

  /**
   * The CDK repositions (and possibly flips) the pane on open, scroll and
   * resize, by rewriting its inline styles, without telling the primitive
   * which fallback position it picked. Watching those style writes is the
   * cheapest way to keep the arrow on the side - and at the spot - the
   * tooltip actually rendered at.
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

  private measure(): void {
    const pane = this.overlay.panelElement();
    const anchor = this.overlay.anchor();
    if (!pane || !anchor) {
      return;
    }
    const { side, align } = this.sideAlign();
    const anchorRect = anchor.getBoundingClientRect();
    const panelRect = pane.getBoundingClientRect();
    const rendered = andesTooltipResolveSide(anchorRect, panelRect, side);
    this.renderedSide.set(rendered);

    const arrow = this.arrow();
    if (!arrow || (panelRect.width === 0 && panelRect.height === 0)) {
      return;
    }
    this.arrowOffset.set(
      andesTooltipArrowOffset(
        rendered,
        align,
        arrow.pointAtCenter,
        anchorRect,
        panelRect,
      ),
    );
  }
}
