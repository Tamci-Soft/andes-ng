/** How slides change: `scroll` slides along the axis, `fade` cross-fades in place. */
export type AndesCarouselEffect = 'scroll' | 'fade';

/** Where the dots sit; `start` / `end` are the inline-start / inline-end edges. */
export type AndesCarouselDotPosition = 'top' | 'bottom' | 'start' | 'end';

/** `true` / `'always'` keep the arrows visible, `'hover'` shows them on hover and focus. */
export type AndesCarouselArrows = boolean | 'hover' | 'always';

/** Payload of `beforeChange`: indexes of the slide being left and the one being shown. */
export interface AndesCarouselChange {
  readonly from: number;
  readonly to: number;
}

/** Context handed to a custom `dotTemplate`, rendered inside each dot button. */
export interface AndesCarouselDotContext {
  readonly $implicit: number;
  /** 0-based index of the slide this dot selects. */
  readonly index: number;
  readonly active: boolean;
  readonly count: number;
  /** Selects the slide; the wrapping button already does this on click. */
  readonly goTo: () => void;
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
