import { booleanAttribute } from '@angular/core';

/** Semantic colour of the text. Left unset, the text uses the surface foreground colour. */
export type AndesTypographyType =
  'secondary' | 'success' | 'warning' | 'danger' | 'disabled';

/** `md` is the 14px body size, `sm` the 12px caption size. */
export type AndesTypographySize = 'md' | 'sm';

/** The element a typography component renders its text in, independent of how it looks. */
export type AndesTypographyTag =
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div' | 'span';

export interface AndesTypographyEllipsisConfig {
  /** Visible lines before the text is cut. `1` (the default) is a single line. */
  rows?: number;
  /** Adds a "more" / "less" toggle while the text is cut (or expanded). */
  expandable?: boolean;
  /**
   * Shows the full text in a small popup on hover and focus, but only while the text is
   * actually cut. A string replaces the text the popup shows.
   */
  tooltip?: boolean | string;
  expandText?: string;
  collapseText?: string;
}

export interface AndesTypographyCopyConfig {
  /** What lands on the clipboard. Defaults to the visible text. */
  text?: string;
  /** Accessible name of the button, and its tooltip before copying. */
  label?: string;
  /** Tooltip and live-region announcement after copying. */
  copiedLabel?: string;
  /** Set to `false` to drop the native tooltip on the button. */
  tooltip?: boolean;
}

export interface AndesTypographyAutoSize {
  minRows?: number;
  maxRows?: number;
}

export interface AndesTypographyEditConfig {
  /** Text the editor starts with. Defaults to the visible text. */
  text?: string;
  maxLength?: number;
  /** Grows the field with its content. On by default; `false` keeps a fixed height. */
  autoSize?: boolean | AndesTypographyAutoSize;
  /**
   * `icon` (default) shows a pencil button, `text` makes the text itself the trigger (it is
   * focusable and opens on Enter or click), `both` does both.
   */
  triggerType?: 'icon' | 'text' | 'both';
  /** Accessible name of the pencil button. */
  label?: string;
  /** Accessible name of the field while editing. */
  fieldLabel?: string;
}

/** Bare attribute (`<andes-text copyable>`), boolean, or config object. */
export type AndesTypographyFeature<T extends object> = boolean | T;
type FeatureInput<T extends object> = boolean | T | string | null | undefined;

export function featureAttribute<T extends object>(
  value: FeatureInput<T>,
): boolean | T {
  return typeof value === 'object' && value !== null
    ? value
    : booleanAttribute(value);
}

export const COPIED_RESET_MS = 2000;
export const DEFAULT_ELLIPSIS_ROWS = 1;
