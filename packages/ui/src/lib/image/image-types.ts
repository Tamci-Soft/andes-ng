import type { TemplateRef } from '@angular/core';

/** Buttons the preview toolbar can show, in display order. */
export type AndesImagePreviewAction =
  | 'zoomOut'
  | 'zoomIn'
  | 'rotateLeft'
  | 'rotateRight'
  | 'flipX'
  | 'flipY'
  | 'reset'
  | 'download';

/** Every default toolbar action, in the order the toolbar lays them out. */
export const ANDES_IMAGE_PREVIEW_ACTIONS: readonly AndesImagePreviewAction[] = [
  'zoomOut',
  'zoomIn',
  'rotateLeft',
  'rotateRight',
  'flipX',
  'flipY',
  'reset',
  'download',
];

/** What changed the transform, reported with every `transformChange`. */
export type AndesImageTransformAction =
  | AndesImagePreviewAction
  | 'wheel'
  | 'doubleClick'
  | 'keyboard'
  | 'move'
  | 'navigate';

/** The geometric state of the previewed image. */
export interface AndesImageTransform {
  /** Horizontal pan, in px. */
  readonly x: number;
  /** Vertical pan, in px. */
  readonly y: number;
  /** Cumulative rotation in degrees (multiples of 90; clockwise is positive). */
  readonly rotate: number;
  /** Zoom factor; 1 fits the image to the viewport. */
  readonly scale: number;
  /** Mirrored left-to-right on screen. */
  readonly flipX: boolean;
  /** Mirrored top-to-bottom on screen. */
  readonly flipY: boolean;
}

/** Payload of the preview's `transformChange` output. */
export interface AndesImageTransformEvent {
  readonly transform: AndesImageTransform;
  readonly action: AndesImageTransformAction;
}

/** One image the preview can show. */
export interface AndesImagePreviewItem {
  /** Full-size source. */
  readonly src: string;
  /** Alternative text; announced when the preview opens or steps. */
  readonly alt?: string;
  /** Tried once if `src` fails to load. */
  readonly fallback?: string;
  /** File name used by the download action; defaults to the last URL segment. */
  readonly name?: string;
  /** Forwarded to the previewed `<img>`. */
  readonly crossOrigin?: 'anonymous' | 'use-credentials' | '' | null;
}

/** Context handed to a `countTemplate`. */
export interface AndesImageCountContext {
  /** 1-based position of the shown image. */
  readonly $implicit: number;
  readonly current: number;
  readonly total: number;
}

/** Context handed to an `extraActions` template, rendered after the built-in buttons. */
export interface AndesImageExtraActionsContext {
  readonly $implicit: AndesImagePreviewItem;
  readonly item: AndesImagePreviewItem;
  /** 0-based index of the shown image. */
  readonly index: number;
  readonly total: number;
  readonly transform: AndesImageTransform;
  /** Closes the preview. */
  readonly close: () => void;
}

/** Every user-facing string the image component renders, for localisation. */
export interface AndesImageLabels {
  /** Thumbnail mask text and the name of the thumbnail's preview button. */
  readonly preview?: string;
  /** Accessible name of the preview dialog when the image has no `alt`. */
  readonly dialog?: string;
  readonly close?: string;
  readonly zoomIn?: string;
  readonly zoomOut?: string;
  readonly rotateLeft?: string;
  readonly rotateRight?: string;
  readonly flipX?: string;
  readonly flipY?: string;
  readonly reset?: string;
  readonly download?: string;
  readonly previous?: string;
  readonly next?: string;
  /** Accessible name of the group of toolbar buttons. */
  readonly toolbar?: string;
  /** Shown in the preview when the image cannot be loaded. */
  readonly loadError?: string;
  /** Screen-reader announcement on stepping: receives the 1-based position and total. */
  readonly position?: (current: number, total: number) => string;
}

/** English defaults for {@link AndesImageLabels}. */
export const ANDES_IMAGE_LABELS: Required<AndesImageLabels> = {
  preview: 'Preview',
  dialog: 'Image preview',
  close: 'Close',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  flipX: 'Flip horizontally',
  flipY: 'Flip vertically',
  reset: 'Reset',
  download: 'Download',
  previous: 'Previous image',
  next: 'Next image',
  toolbar: 'Image tools',
  loadError: 'The image could not be loaded',
  position: (current, total) => `Image ${current} of ${total}`,
};

/** Merges partial labels over the English defaults (later arguments win). */
export function resolveImageLabels(
  ...parts: readonly (AndesImageLabels | null | undefined)[]
): Required<AndesImageLabels> {
  const merged: Record<string, unknown> = { ...ANDES_IMAGE_LABELS };
  for (const part of parts) {
    if (!part) {
      continue;
    }
    for (const [key, value] of Object.entries(part)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  return merged as unknown as Required<AndesImageLabels>;
}

/** Scrim settings of the preview. */
export interface AndesImagePreviewScrim {
  /** Blur the page behind the scrim. Default `false`. */
  readonly blur?: boolean;
  /** A click on the empty area around the image closes the preview. Default `true`. */
  readonly closable?: boolean;
}

/** Behaviour of the full-viewport preview. Every field is optional. */
export interface AndesImagePreviewConfig {
  /** Each zoom step multiplies the scale by `1 + scaleStep`. Default `0.5`. */
  readonly scaleStep?: number;
  /** Smallest zoom factor; 1 is "fit". Default `1`. */
  readonly minScale?: number;
  /** Largest zoom factor. Default `50`. */
  readonly maxScale?: number;
  /** Pan the zoomed image by dragging (or with the arrow keys). Default `true`. */
  readonly movable?: boolean;
  /** Zoom with the mouse wheel / trackpad pinch. Default `true`. */
  readonly wheel?: boolean;
  /** Keyboard shortcuts (zoom, rotate, flip, navigate). Default `true`. */
  readonly keyboard?: boolean;
  /** Escape closes the preview. Default `true`. */
  readonly closeOnEscape?: boolean;
  /**
   * The scrim behind the preview: `false` removes it, an object tunes it.
   * Default `true`.
   */
  readonly scrim?: boolean | AndesImagePreviewScrim;
  /** Wrap from the last image to the first and back, in a group. Default `false`. */
  readonly loop?: boolean;
  /** Which toolbar buttons to show, in order. Default: all of them. */
  readonly actions?: readonly AndesImagePreviewAction[];
  /** Extra toolbar content rendered after the built-in buttons. */
  readonly extraActions?: TemplateRef<AndesImageExtraActionsContext> | null;
  /** Replaces the "2 / 5" counter. */
  readonly countTemplate?: TemplateRef<AndesImageCountContext> | null;
}

/** The preview configuration with every default filled in. */
export interface AndesImageResolvedPreviewConfig {
  readonly scaleStep: number;
  readonly minScale: number;
  readonly maxScale: number;
  readonly movable: boolean;
  readonly wheel: boolean;
  readonly keyboard: boolean;
  readonly closeOnEscape: boolean;
  readonly scrim: boolean;
  readonly scrimBlur: boolean;
  readonly closeOnScrimClick: boolean;
  readonly loop: boolean;
  readonly actions: readonly AndesImagePreviewAction[];
  readonly extraActions: TemplateRef<AndesImageExtraActionsContext> | null;
  readonly countTemplate: TemplateRef<AndesImageCountContext> | null;
}

/** Fills the defaults into a (possibly absent) {@link AndesImagePreviewConfig}. */
export function resolvePreviewConfig(
  config: AndesImagePreviewConfig | null | undefined,
): AndesImageResolvedPreviewConfig {
  const scrim = config?.scrim;
  const scrimObject = typeof scrim === 'object' && scrim !== null ? scrim : {};
  const scaleStep = Number(config?.scaleStep);
  const minScale = Number(config?.minScale);
  const maxScale = Number(config?.maxScale);
  const min = Number.isFinite(minScale) && minScale > 0 ? minScale : 1;
  return {
    scaleStep: Number.isFinite(scaleStep) && scaleStep > 0 ? scaleStep : 0.5,
    minScale: min,
    maxScale:
      Number.isFinite(maxScale) && maxScale >= min
        ? maxScale
        : Math.max(50, min),
    movable: config?.movable ?? true,
    wheel: config?.wheel ?? true,
    keyboard: config?.keyboard ?? true,
    closeOnEscape: config?.closeOnEscape ?? true,
    scrim: scrim === false ? false : true,
    scrimBlur: scrimObject.blur ?? false,
    closeOnScrimClick: scrimObject.closable ?? true,
    loop: config?.loop ?? false,
    actions: config?.actions ?? ANDES_IMAGE_PREVIEW_ACTIONS,
    extraActions: config?.extraActions ?? null,
    countTemplate: config?.countTemplate ?? null,
  };
}

/** `preview` accepts `boolean | config`; a bare attribute arrives as `''`. */
export function normalizePreviewInput(
  value: boolean | string | AndesImagePreviewConfig | null | undefined,
): AndesImagePreviewConfig | null {
  if (value === false || value === null || value === undefined) {
    return value === undefined ? {} : null;
  }
  if (value === 'false') {
    return null;
  }
  return typeof value === 'object' ? value : {};
}
