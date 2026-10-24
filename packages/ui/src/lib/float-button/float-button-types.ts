import { InjectionToken, Signal } from '@angular/core';

export type AndesFloatButtonType = 'default' | 'primary';
export type AndesFloatButtonShape = 'circle' | 'square';
export type AndesFloatButtonSize = 'sm' | 'md' | 'lg';
/** Where a group's menu opens relative to its trigger; `start`/`end` follow the text direction. */
export type AndesFloatButtonPlacement = 'up' | 'down' | 'start' | 'end';
export type AndesFloatButtonTrigger = 'click' | 'hover';

/** A CSS length (`'1.5rem'`, `'calc(...)'`) or a number of pixels. */
export type AndesFloatLength = string | number;

/** Where a fixed element sits. `right`/`left` are the inline-end/inline-start edges, so they
 *  mirror in right-to-left layouts. Safe-area insets (notches, home indicator) are added. */
export interface AndesFloatOffsets {
  right?: AndesFloatLength | undefined;
  bottom?: AndesFloatLength | undefined;
  left?: AndesFloatLength | undefined;
  top?: AndesFloatLength | undefined;
}

export interface AndesFloatInsets {
  insetInlineEnd: string | null;
  insetInlineStart: string | null;
  top: string | null;
  bottom: string | null;
}

const DEFAULT_RIGHT = '1.5rem';
const DEFAULT_BOTTOM = '3rem';

function length(value: AndesFloatLength): string {
  return typeof value === 'number' ? `${value}px` : value;
}

/** Resolves offsets to inset values: a missing horizontal edge defaults to the inline end, a
 *  missing vertical edge to the bottom, and every edge is pushed in by its safe-area inset. */
export function andesFloatInsets(offsets: AndesFloatOffsets): AndesFloatInsets {
  const { right, left, top, bottom } = offsets;
  const horizontalFromStart = left !== undefined && right === undefined;
  const verticalFromTop = top !== undefined && bottom === undefined;
  return {
    insetInlineEnd: horizontalFromStart
      ? null
      : `calc(${length(right ?? DEFAULT_RIGHT)} + env(safe-area-inset-right, 0px))`,
    insetInlineStart:
      left === undefined
        ? null
        : `calc(${length(left)} + env(safe-area-inset-left, 0px))`,
    top: verticalFromTop
      ? `calc(${length(top)} + env(safe-area-inset-top, 0px))`
      : null,
    bottom: verticalFromTop
      ? null
      : `calc(${length(bottom ?? DEFAULT_BOTTOM)} + env(safe-area-inset-bottom, 0px))`,
  };
}

/** What a float button inside a group reads from it. */
export interface AndesFloatButtonGroupApi {
  readonly type: Signal<AndesFloatButtonType>;
  readonly shape: Signal<AndesFloatButtonShape>;
  readonly size: Signal<AndesFloatButtonSize>;
}

export const ANDES_FLOAT_BUTTON_GROUP =
  new InjectionToken<AndesFloatButtonGroupApi>('ANDES_FLOAT_BUTTON_GROUP');
