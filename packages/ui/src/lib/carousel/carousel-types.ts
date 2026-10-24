/**
 * How slides change: `scroll` slides along the axis, `fade` cross-fades stacked slides in
 * place, `slide-fade` slides and fades the slides that leave or arrive.
 */
export type AndesCarouselEffect = 'scroll' | 'fade' | 'slide-fade';

export type AndesCarouselOrientation = 'horizontal' | 'vertical';

/** Which edge the dots sit on; `start` / `end` are vertical rails on the inline edges. */
export type AndesCarouselDotPlacement = 'top' | 'bottom' | 'start' | 'end';

/** Whether the dots float over the slides or take their own space beside them. */
export type AndesCarouselDotPosition = 'inside' | 'outside';

/** `dot` is a circle, `line` a flat bar, `pill` a short bar whose active one is longer. */
export type AndesCarouselDotStyle = 'dot' | 'line' | 'pill';

/** Options for `dots`; `className` is added to the dots container. */
export interface AndesCarouselDotsOptions {
  readonly className?: string;
}

/** `true` / `'always'` keep the arrows visible, `'hover'` shows them on hover and focus. */
export type AndesCarouselArrows = boolean | 'hover' | 'always';

export type AndesCarouselArrowPlacement = 'inside' | 'outside';

/** 24 / 32 / 40 px buttons, like the other controls. */
export type AndesCarouselArrowSize = 'sm' | 'md' | 'lg';

/** Which part of the view the selected slide lines up with. */
export type AndesCarouselAlign = 'start' | 'center' | 'end';

/**
 * Timing curve of a change: a named preset (`smooth`, the default, `out` for a sharper stop, `ease`, `ease-in-out`,
 * `linear`, `spring` for a soft overshoot) or any CSS easing string.
 */
export type AndesCarouselEasing =
  | 'smooth'
  | 'out'
  | 'ease'
  | 'ease-in-out'
  | 'linear'
  | 'spring'
  | (string & Record<never, never>);

/**
 * `system` follows `prefers-reduced-motion` (changes become instant and autoplay stops),
 * `reduce` always behaves that way, `allow` keeps the motion whatever the preference.
 */
export type AndesCarouselReducedMotion = 'system' | 'reduce' | 'allow';

/** Slides shown at once: one number, or a map of minimum carousel width (px) to count. */
export type AndesCarouselSlidesPerView =
  number | Readonly<Record<number, number>>;

/** Payload of `slideChange` and `dragEnded`: the stops being left and reached. */
export interface AndesCarouselChange {
  readonly from: number;
  readonly to: number;
}

/** Context handed to a custom `dotTemplate`, rendered inside each dot button. */
export interface AndesCarouselDotContext {
  readonly $implicit: number;
  /** 0-based stop this dot selects. */
  readonly index: number;
  readonly active: boolean;
  readonly count: number;
  /** Selects the stop; the wrapping button already does this on click. */
  readonly goTo: () => void;
}

/** Context handed to a custom `arrowTemplate`, rendered inside each arrow button. */
export interface AndesCarouselArrowContext {
  readonly $implicit: 'prev' | 'next';
  readonly direction: 'prev' | 'next';
  /** The arrow cannot move any further (start or end of a carousel that does not loop). */
  readonly disabled: boolean;
}

/** Every user-facing string the carousel renders, for localisation. */
export interface AndesCarouselLabels {
  /** Name of the carousel region when no `aria-label` is given. */
  readonly carousel?: string;
  /** Name of the focusable slide viewport. */
  readonly slides?: string;
  /** Name of each slide: receives the 1-based position and the total. */
  readonly slide?: (position: number, total: number) => string;
  readonly previous?: string;
  readonly next?: string;
  /** Name of the dot that selects a slide. */
  readonly goTo?: (position: number, total: number) => string;
  /** Name of the group of dots. */
  readonly dots?: string;
  readonly pause?: string;
  readonly play?: string;
  /** Name of the group of thumbnails. */
  readonly thumbs?: string;
}

/** English defaults for {@link AndesCarouselLabels}. */
export const ANDES_CAROUSEL_LABELS: Required<AndesCarouselLabels> = {
  carousel: 'Carousel',
  slides: 'Slides',
  slide: (position, total) => `${position} of ${total}`,
  previous: 'Previous slide',
  next: 'Next slide',
  goTo: (position) => `Go to slide ${position}`,
  dots: 'Choose a slide',
  pause: 'Pause slide show',
  play: 'Start slide show',
  thumbs: 'Slide thumbnails',
};

/** Merges partial labels over the English defaults. */
export function resolveCarouselLabels(
  labels: AndesCarouselLabels | null | undefined,
): Required<AndesCarouselLabels> {
  const merged: Record<string, unknown> = { ...ANDES_CAROUSEL_LABELS };
  for (const [key, value] of Object.entries(labels ?? {})) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged as unknown as Required<AndesCarouselLabels>;
}

/** Named easing presets; anything else is used as given. */
export const ANDES_CAROUSEL_EASINGS: Readonly<Record<string, string>> = {
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  out: 'cubic-bezier(0.2, 0, 0, 1)',
  ease: 'ease',
  'ease-in-out': 'cubic-bezier(0.45, 0, 0.25, 1)',
  linear: 'linear',
  spring: 'cubic-bezier(0.3, 1.25, 0.5, 1)',
};
