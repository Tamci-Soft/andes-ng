import {
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  provideAndesOverlay,
  type AndesOverlayAlign,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  inject,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesTooltipContent } from './tooltip-content';
import { AndesTooltipHoverIntent } from './tooltip-hover-intent';

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
 * Rich content uses `AndesTooltipContent` instead of the `content` input:
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
 */
@Component({
  selector: 'andes-tooltip',
  imports: [NgTemplateOutlet, AndesOverlayContentPrimitive],
  templateUrl: './tooltip.html',
  styleUrl: './tooltip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideAndesOverlay(), AndesTooltipHoverIntent],
})
export class AndesTooltip {
  protected readonly overlay = inject(AndesOverlayPrimitive);
  private readonly hoverIntent = inject(AndesTooltipHoverIntent);

  /**
   * Plain-text tooltip content. Ignored when a projected
   * `<ng-template andesTooltipContent>` is present.
   */
  readonly content = input<string>('');

  /** Preferred side of the trigger. Default `'top'`. */
  readonly side = input<AndesOverlaySide>('top');
  /** Alignment along that side. Default `'center'`. */
  readonly align = input<AndesOverlayAlign>('center');
  /** Gap in px between trigger and tooltip. Default `6`. */
  readonly sideOffset = input(6);
  /** Extra px offset along the alignment axis. Default `0`. */
  readonly alignOffset = input(0);

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

  private readonly projectedContent = contentChild(AndesTooltipContent);
  private readonly overlayTemplate =
    viewChild.required<TemplateRef<unknown>>('overlayTemplate');

  /** The rich-content template, when the caller provided one. */
  protected readonly richContent = computed(
    () => this.projectedContent()?.templateRef ?? null,
  );

  constructor() {
    this.overlay.configure(andesOverlayPreset('tooltip'));

    // The handlers close over `this.overlayTemplate()` rather than reading it
    // up front - `viewChild.required` cannot resolve until after the first
    // render, which has not happened yet at constructor time, but by the time
    // hover/focus can actually fire, it always has.
    this.hoverIntent.bind({
      open: () => this.overlay.open(this.overlayTemplate()),
      close: () => this.overlay.close('imperative'),
    });

    effect(() => {
      this.overlay.configure({
        positioning: {
          kind: 'anchored',
          side: this.side(),
          align: this.align(),
          sideOffset: this.sideOffset(),
          alignOffset: this.alignOffset(),
        },
      });
    });

    effect(() => {
      this.hoverIntent.configure({
        openDelay: this.openDelay(),
        closeDelay: this.closeDelay(),
        instantReopenWindow: this.instantReopenWindow(),
        disabled: this.disabled(),
      });
    });
  }
}
