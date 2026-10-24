import type { TemplateRef } from '@angular/core';

import type { AndesColor, AndesColorInput } from './color';

export type AndesColorPickerSize = 'sm' | 'md' | 'lg';

/** `error` also sets `aria-invalid`; `warning` is purely visual. */
export type AndesColorPickerStatus = 'error' | 'warning';

/** Where the panel opens relative to the trigger: above or below, aligned to one edge. */
export type AndesColorPickerPlacement =
  'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

/** A labelled group of ready-made colours shown under the picker. */
export interface AndesColorPreset {
  /** Heading of the group; also the accessible name of its list of colours. */
  label: string;
  /** The colours, as text (`'#ff4d4f'`, `'rgb(0 0 0)'`, `'teal'`) or {@link AndesColor}s. */
  colors: readonly AndesColorInput[];
  /** Whether the group starts expanded. Default `true`. */
  defaultOpen?: boolean;
}

/** What `colorChange` and `colorChangeComplete` carry. */
export interface AndesColorChangeEvent {
  /** The new colour. */
  color: AndesColor;
  /**
   * The new value as the picker's value now holds it: an {@link AndesColor} when the value
   * is one, otherwise text in the current format (`#1677ff`, `rgb(22, 119, 255)`,
   * `hsb(215, 91%, 100%)`).
   */
  value: AndesColorInput;
}

/** Context of a custom `showText` template. */
export interface AndesColorPickerTextContext {
  /** The current colour. */
  $implicit: AndesColor;
  /** The colour as text in the current format. */
  value: string;
}

/** Every visible or spoken string, so the picker can be translated. */
export interface AndesColorPickerLabels {
  /** Name of the trigger button. */
  trigger: string;
  /** Spoken (and shown, with `showText`) when no colour is set. */
  noColor: string;
  /** Name of the panel. */
  panel: string;
  /** Name of the saturation / brightness area. */
  area: string;
  /** Spoken value of the area; `{s}` and `{b}` are the two percentages. */
  areaValue: string;
  hue: string;
  alpha: string;
  format: string;
  hex: string;
  red: string;
  green: string;
  blue: string;
  saturation: string;
  brightness: string;
  clear: string;
  eyeDropper: string;
}

export const ANDES_COLOR_PICKER_DEFAULT_LABELS: AndesColorPickerLabels = {
  trigger: 'Color',
  noColor: 'No color',
  panel: 'Color picker',
  area: 'Saturation and brightness',
  areaValue: 'Saturation {s}%, brightness {b}%',
  hue: 'Hue',
  alpha: 'Opacity',
  format: 'Color format',
  hex: 'Hex color',
  red: 'Red',
  green: 'Green',
  blue: 'Blue',
  saturation: 'Saturation',
  brightness: 'Brightness',
  clear: 'Clear color',
  eyeDropper: 'Pick a color from the screen',
};

/** Content of the `showText` input: a flag, or a template given the colour. */
export type AndesColorPickerShowText =
  boolean | TemplateRef<AndesColorPickerTextContext>;
