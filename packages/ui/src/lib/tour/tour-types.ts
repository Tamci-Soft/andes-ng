import type { ElementRef, TemplateRef } from '@angular/core';

/** Where the step card sits relative to its target; `auto` picks the side with room. */
export type AndesTourPlacement =
  | 'auto'
  | 'center'
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

/** `primary` fills the card with the primary colour. */
export type AndesTourType = 'default' | 'primary';

/** What a step can point at: a CSS selector, an element, or a function returning one. */
export type AndesTourTarget =
  | string
  | Element
  | ElementRef<Element>
  | (() => Element | null | undefined)
  | null;

/** Distance and corner radius of the spotlight around the target. */
export interface AndesTourGap {
  /** Space around the target, in px: one value, or `[horizontal, vertical]`. Default `6`. */
  readonly offset?: number | readonly [number, number];
  /** Corner radius of the spotlight, in px. Default `6`. */
  readonly radius?: number;
}

/** `false` shows no mask; an object tunes it. */
export type AndesTourMask = boolean | { readonly color?: string };

/** Why the tour closed. */
export type AndesTourCloseReason =
  | 'finish'
  | 'skip'
  | 'close-button'
  | 'escape-key'
  | 'mask-click'
  | 'imperative';

/** What a step's templates and button handlers receive. */
export interface AndesTourStepContext {
  readonly $implicit: AndesTourStep;
  readonly step: AndesTourStep;
  /** 0-based index of the step. */
  readonly index: number;
  readonly total: number;
  readonly next: () => void;
  readonly previous: () => void;
  readonly close: () => void;
}

/**
 * Overrides for one of the step's buttons. `onClick` runs before the tour moves; return
 * `false` to stay on the step.
 */
export interface AndesTourButtonProps {
  readonly label?: string;
  readonly hidden?: boolean;
  readonly disabled?: boolean;
  readonly onClick?: (context: AndesTourStepContext) => void | boolean;
}

/** One stop of the tour. */
export interface AndesTourStep {
  /** The element to spotlight; leave out (or `null`) for a card centred on the page. */
  readonly target?: AndesTourTarget;
  readonly title?: string | TemplateRef<AndesTourStepContext>;
  readonly description?: string | TemplateRef<AndesTourStepContext>;
  /** An image (URL) or template shown above the text. */
  readonly cover?: string | TemplateRef<AndesTourStepContext>;
  /** Alternative text of a cover image URL; empty keeps it decorative. */
  readonly coverAlt?: string;
  readonly placement?: AndesTourPlacement;
  readonly arrow?: boolean;
  readonly type?: AndesTourType;
  readonly mask?: AndesTourMask;
  readonly gap?: AndesTourGap;
  /** Let clicks through to the spotlighted element. */
  readonly targetClickable?: boolean;
  /** Overrides the tour's scroll behaviour for this step. */
  readonly scrollIntoView?: boolean | ScrollIntoViewOptions;
  readonly nextButton?: AndesTourButtonProps;
  readonly prevButton?: AndesTourButtonProps;
}

/** Payload of the `close` output. */
export interface AndesTourCloseEvent {
  readonly reason: AndesTourCloseReason;
  /** The step that was showing. */
  readonly current: number;
}

/** Step indicators: `dots`, a "2 / 5" `count`, or none. */
export type AndesTourIndicators = 'dots' | 'count' | 'none';

/** Context of a custom `indicatorsTemplate`. */
export interface AndesTourIndicatorsContext {
  readonly $implicit: number;
  /** 1-based number of the current step. */
  readonly current: number;
  readonly total: number;
}

/** Every user-facing string the tour renders, for localisation. */
export interface AndesTourLabels {
  readonly dialog?: string;
  readonly previous?: string;
  readonly next?: string;
  readonly finish?: string;
  readonly skip?: string;
  readonly close?: string;
  /** Screen-reader description of progress; receives the 1-based step and the total. */
  readonly step?: (current: number, total: number) => string;
}

/** English defaults for {@link AndesTourLabels}. */
export const ANDES_TOUR_LABELS: Required<AndesTourLabels> = {
  dialog: 'Guided tour',
  previous: 'Previous',
  next: 'Next',
  finish: 'Finish',
  skip: 'Skip',
  close: 'Close tour',
  step: (current, total) => `Step ${current} of ${total}`,
};

/** Merges partial labels over the English defaults. */
export function resolveTourLabels(
  labels: AndesTourLabels | null | undefined,
): Required<AndesTourLabels> {
  const merged: Record<string, unknown> = { ...ANDES_TOUR_LABELS };
  for (const [key, value] of Object.entries(labels ?? {})) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged as unknown as Required<AndesTourLabels>;
}
