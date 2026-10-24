import type { AndesOverlayAlign, AndesOverlaySide } from '@andes-ng/primitives';
import type { TemplateRef } from '@angular/core';

/**
 * The twelve supported placements. The first word is the side of the trigger the
 * panel renders on; the second (if any) is which edge of the panel lines up with
 * the matching edge of the trigger.
 */
export type AndesPopoverPlacement =
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'
  | 'left'
  | 'leftTop'
  | 'leftBottom'
  | 'right'
  | 'rightTop'
  | 'rightBottom';

/** What opens the panel. Several can be combined by passing an array. */
export type AndesPopoverTriggerAction =
  'click' | 'hover' | 'focus' | 'contextMenu';

/** Plain text, or a template for rich markup. */
export type AndesPopoverRenderable = string | TemplateRef<unknown>;

export const ANDES_POPOVER_PLACEMENTS: Readonly<
  Record<
    AndesPopoverPlacement,
    { readonly side: AndesOverlaySide; readonly align: AndesOverlayAlign }
  >
> = {
  top: { side: 'top', align: 'center' },
  topLeft: { side: 'top', align: 'start' },
  topRight: { side: 'top', align: 'end' },
  bottom: { side: 'bottom', align: 'center' },
  bottomLeft: { side: 'bottom', align: 'start' },
  bottomRight: { side: 'bottom', align: 'end' },
  left: { side: 'left', align: 'center' },
  leftTop: { side: 'left', align: 'start' },
  leftBottom: { side: 'left', align: 'end' },
  right: { side: 'right', align: 'center' },
  rightTop: { side: 'right', align: 'start' },
  rightBottom: { side: 'right', align: 'end' },
};

/**
 * Semantic color presets for the panel's `color` input, each backed by an
 * existing `--andes-color-*` / `--andes-color-*-foreground` token pair.
 */
export const ANDES_POPOVER_PRESET_COLORS = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
] as const;

/** One of {@link ANDES_POPOVER_PRESET_COLORS}. */
export type AndesPopoverPresetColor =
  (typeof ANDES_POPOVER_PRESET_COLORS)[number];

/** Default hover open/close delay, in ms (0.1s). */
export const ANDES_POPOVER_DEFAULT_HOVER_DELAY = 100;
