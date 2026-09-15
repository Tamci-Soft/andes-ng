import type { TemplateRef } from '@angular/core';
import type { ComponentType } from '@angular/cdk/overlay';

/**
 * Named stacking layer. Each value maps 1:1 onto an `--andes-z-index-*` token in
 * `@andes-ng/tokens`, so overlay stacking is a token decision, not a magic number
 * picked per component.
 */
export type AndesOverlayLayer =
  'dropdown' | 'overlay' | 'modal' | 'popover' | 'tooltip' | 'toast';

/**
 * Numeric fallbacks that mirror the current `--andes-z-index-*` token values. They are
 * only used when `@andes-ng/tokens`' `theme.css` is not loaded, so an overlay still
 * stacks in the right order instead of collapsing to `auto`.
 */
export const ANDES_OVERLAY_Z_INDEX_FALLBACKS: Readonly<
  Record<AndesOverlayLayer, number>
> = {
  dropdown: 1000,
  overlay: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
};

/** The CSS value applied as `z-index` for a layer, token first, numeric fallback second. */
export function andesOverlayZIndex(layer: AndesOverlayLayer): string {
  return `var(--andes-z-index-${layer}, ${ANDES_OVERLAY_Z_INDEX_FALLBACKS[layer]})`;
}

/** The CSS value applied as the backdrop scrim's background. */
export const ANDES_OVERLAY_SCRIM =
  'var(--andes-color-overlay, rgb(15 23 42 / 45%))';

/** Side of the anchor an anchored overlay prefers to render on. */
export type AndesOverlaySide = 'top' | 'bottom' | 'left' | 'right';

/** Alignment of an anchored overlay along its side. */
export type AndesOverlayAlign = 'start' | 'center' | 'end';

/** Viewport edge an edge-anchored overlay (Drawer/Sheet) slides in from. */
export type AndesOverlayEdge = 'top' | 'right' | 'bottom' | 'left';

/**
 * Anchor-relative positioning, for Popover / Tooltip / Dropdown Menu. Collision
 * handling (flip to the opposite side, then shift along the cross axis) is on by
 * default — an overlay that would render off-screen is a bug, not a variant.
 */
export interface AndesOverlayAnchoredPositioning {
  readonly kind: 'anchored';
  /** Preferred side. Default `'bottom'`. */
  readonly side?: AndesOverlaySide;
  /** Alignment along the side. Default `'center'`. */
  readonly align?: AndesOverlayAlign;
  /** Gap in px between anchor and overlay along the side axis. Default `0`. */
  readonly sideOffset?: number;
  /** Extra px offset along the alignment axis. Default `0`. */
  readonly alignOffset?: number;
  /** Flip to the opposite side when the preferred one does not fit. Default `true`. */
  readonly flip?: boolean;
  /** Shift along the cross axis to stay on screen. Default `true`. */
  readonly shift?: boolean;
  /** Minimum px kept between the overlay and the viewport edge. Default `8`. */
  readonly viewportMargin?: number;
  /** Size the overlay to the anchor's width (Select/Combobox-style). Default `false`. */
  readonly matchAnchorWidth?: boolean;
  /** Never re-position after the first open, even on scroll. Default `false`. */
  readonly lockPosition?: boolean;
}

/** Viewport-centered positioning, for Dialog / Alert Dialog. */
export interface AndesOverlayCenteredPositioning {
  readonly kind: 'centered';
}

/** Edge-pinned positioning, for Drawer / Sheet. */
export interface AndesOverlayEdgePositioning {
  readonly kind: 'edge';
  /** Which viewport edge to pin to. Default `'right'`. */
  readonly edge?: AndesOverlayEdge;
}

export type AndesOverlayPositioning =
  | AndesOverlayAnchoredPositioning
  | AndesOverlayCenteredPositioning
  | AndesOverlayEdgePositioning;

/** Why an overlay closed. Forwarded to consumers so they can veto or branch on it. */
export type AndesOverlayCloseReason =
  | 'imperative'
  | 'escape-key'
  | 'outside-click'
  | 'backdrop-click'
  | 'close-button'
  | 'trigger'
  | 'destroyed';

/** What receives focus when the overlay opens. */
export type AndesOverlayAutoFocus =
  /** The first tabbable element inside the overlay (honours `cdkFocusInitial`). */
  | 'first-tabbable'
  /** The overlay pane itself, via `tabindex="-1"`. */
  | 'container'
  /** Nothing — focus stays where the user left it. Correct for Tooltip. */
  | 'none';

/** ARIA role applied to the overlay content by `AndesOverlayContentPrimitive`. */
export type AndesOverlayRole =
  'dialog' | 'alertdialog' | 'menu' | 'listbox' | 'tooltip' | 'none';

/** Explicit sizing forwarded to the CDK overlay pane. */
export interface AndesOverlaySize {
  readonly width?: number | string;
  readonly height?: number | string;
  readonly minWidth?: number | string;
  readonly minHeight?: number | string;
  readonly maxWidth?: number | string;
  readonly maxHeight?: number | string;
}

/**
 * The full behavior contract of an andes-ng overlay. Every dismissal, focus and
 * scroll behavior is an independent flag: Dialog wants all of them, Tooltip wants
 * almost none, and Popover/Dropdown Menu sit in between.
 */
export interface AndesOverlayConfig {
  /** Stacking layer, sourced from `--andes-z-index-*`. */
  readonly layer: AndesOverlayLayer;
  /** How the overlay is placed. */
  readonly positioning: AndesOverlayPositioning;
  /** Keep Tab/Shift+Tab inside the overlay while it is open. */
  readonly trapFocus: boolean;
  /** Return focus to the trigger (or the element focused at open time) on close. */
  readonly restoreFocus: boolean;
  /** What receives focus when the overlay opens. */
  readonly autoFocus: AndesOverlayAutoFocus;
  /** Escape closes the overlay. Only the topmost open overlay reacts. */
  readonly closeOnEscape: boolean;
  /** A pointer event outside the overlay (or on its backdrop) closes it. */
  readonly closeOnOutsideClick: boolean;
  /** Block document scroll while open. */
  readonly lockScroll: boolean;
  /** Render a backdrop scrim using `--andes-color-overlay`. */
  readonly hasBackdrop: boolean;
  /** ARIA role for the content element. */
  readonly role: AndesOverlayRole;
  /** Whether the content element gets `aria-modal="true"`. */
  readonly ariaModal: boolean;
  /** Extra classes on the CDK overlay pane. */
  readonly panelClass: string | readonly string[] | null;
  /** Extra classes on the backdrop, in addition to `andes-overlay-backdrop`. */
  readonly backdropClass: string | readonly string[] | null;
  /** Re-position on scroll. Only meaningful for anchored positioning. */
  readonly repositionOnScroll: boolean;
  /** Dispose the overlay on browser back/forward. */
  readonly disposeOnNavigation: boolean;
  /** Explicit pane sizing. */
  readonly size: AndesOverlaySize;
}

/**
 * Deliberately conservative defaults: no focus trap, no scroll lock, no backdrop.
 * A consumer that forgets to configure gets the least invasive overlay rather than
 * one that silently hijacks the page.
 */
export const ANDES_OVERLAY_DEFAULT_CONFIG: AndesOverlayConfig = {
  layer: 'overlay',
  positioning: { kind: 'centered' },
  trapFocus: false,
  restoreFocus: true,
  autoFocus: 'none',
  closeOnEscape: true,
  closeOnOutsideClick: true,
  lockScroll: false,
  hasBackdrop: false,
  role: 'none',
  ariaModal: false,
  panelClass: null,
  backdropClass: null,
  repositionOnScroll: false,
  disposeOnNavigation: true,
  size: {},
};

/** The overlay flavours the five planned components map onto. */
export type AndesOverlayPreset =
  'dialog' | 'alert-dialog' | 'drawer' | 'popover' | 'menu' | 'tooltip';

const DIALOG_PRESET: Partial<AndesOverlayConfig> = {
  layer: 'modal',
  positioning: { kind: 'centered' },
  trapFocus: true,
  restoreFocus: true,
  autoFocus: 'first-tabbable',
  closeOnEscape: true,
  closeOnOutsideClick: true,
  lockScroll: true,
  hasBackdrop: true,
  role: 'dialog',
  ariaModal: true,
  repositionOnScroll: false,
};

/**
 * Starting points, not policy: every consumer is expected to spread a preset and
 * then override. They exist so the five components do not each invent their own
 * answer to "should a menu trap focus?" independently.
 *
 * - `dialog` / `alert-dialog` / `drawer` are modal: trap, lock scroll, backdrop.
 *   `alert-dialog` additionally refuses outside-click dismissal, per the WAI-ARIA
 *   distinction between `dialog` and `alertdialog`.
 * - `drawer` sits on the `overlay` layer rather than `modal`, so a confirmation
 *   dialog opened from inside a drawer stacks above it.
 * - `popover` and `menu` move focus into the overlay (both are click-opened and
 *   contain interactive content, so keyboard users must be able to reach it) but do
 *   not trap it: the page behind stays usable and scrollable, matching Base UI's
 *   non-modal Popover default. Consumers that render a close button inside and want
 *   modal semantics can flip `trapFocus` on.
 * - `tooltip` moves nothing, traps nothing and restores nothing — it is a passive
 *   hint attached to an element that already has focus.
 */
export const ANDES_OVERLAY_PRESETS: Readonly<
  Record<AndesOverlayPreset, Partial<AndesOverlayConfig>>
> = {
  dialog: DIALOG_PRESET,
  'alert-dialog': {
    ...DIALOG_PRESET,
    role: 'alertdialog',
    closeOnOutsideClick: false,
  },
  drawer: {
    ...DIALOG_PRESET,
    layer: 'overlay',
    positioning: { kind: 'edge', edge: 'right' },
  },
  popover: {
    layer: 'popover',
    positioning: {
      kind: 'anchored',
      side: 'bottom',
      align: 'center',
      sideOffset: 8,
    },
    trapFocus: false,
    restoreFocus: true,
    autoFocus: 'first-tabbable',
    closeOnEscape: true,
    closeOnOutsideClick: true,
    lockScroll: false,
    hasBackdrop: false,
    role: 'dialog',
    ariaModal: false,
    repositionOnScroll: true,
  },
  menu: {
    layer: 'dropdown',
    positioning: {
      kind: 'anchored',
      side: 'bottom',
      align: 'start',
      sideOffset: 4,
    },
    trapFocus: false,
    restoreFocus: true,
    autoFocus: 'first-tabbable',
    closeOnEscape: true,
    closeOnOutsideClick: true,
    lockScroll: false,
    hasBackdrop: false,
    role: 'menu',
    ariaModal: false,
    repositionOnScroll: true,
  },
  tooltip: {
    layer: 'tooltip',
    positioning: {
      kind: 'anchored',
      side: 'top',
      align: 'center',
      sideOffset: 6,
    },
    trapFocus: false,
    restoreFocus: false,
    autoFocus: 'none',
    closeOnEscape: true,
    closeOnOutsideClick: true,
    lockScroll: false,
    hasBackdrop: false,
    role: 'tooltip',
    ariaModal: false,
    repositionOnScroll: true,
  },
};

/** Reads a preset. A thin helper so consumers never hand-copy a preset's fields. */
export function andesOverlayPreset(
  preset: AndesOverlayPreset,
): Partial<AndesOverlayConfig> {
  return ANDES_OVERLAY_PRESETS[preset];
}

/** What can be rendered into an overlay. */
export type AndesOverlayContent<C = unknown> =
  TemplateRef<C> | ComponentType<unknown>;

/** Class applied to every andes-ng backdrop, as a styling hook for consumers. */
export const ANDES_OVERLAY_BACKDROP_CLASS = 'andes-overlay-backdrop';

/** Class applied to every andes-ng overlay pane, as a styling hook for consumers. */
export const ANDES_OVERLAY_PANE_CLASS = 'andes-overlay-pane';
