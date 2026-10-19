/**
 * Where autoplay stands. Exactly one state at a time; when several pause sources hold at
 * once the one listed first wins, and each source lets go independently:
 *
 * - `idle`: autoplay is off, or there is nothing to rotate through.
 * - `reduced-motion`: the user asked for less motion, so nothing moves by itself.
 * - `paused-by-user`: the pause button, `pause()`, or an interaction with
 *   `resumeAfterInteraction` off. Only `play()` leaves it.
 * - `paused-hidden`: the page is in a background tab.
 * - `paused-offscreen`: the carousel is scrolled out of view.
 * - `paused-by-drag`: a drag is in progress.
 * - `paused-by-focus`: keyboard focus is inside the carousel.
 * - `paused-by-hover`: the pointer is over the carousel.
 * - `running`: the timer is counting down to the next change.
 */
export type AndesCarouselAutoplayState =
  | 'idle'
  | 'reduced-motion'
  | 'paused-by-user'
  | 'paused-hidden'
  | 'paused-offscreen'
  | 'paused-by-drag'
  | 'paused-by-focus'
  | 'paused-by-hover'
  | 'running';

/** Options of the `autoplay` input when given as an object. */
export interface AndesCarouselAutoplayOptions {
  /** Delay between automatic changes, in ms. */
  readonly speed?: number;
  /** Hold while the pointer is over the carousel (default true). */
  readonly pauseOnHover?: boolean;
  /** Hold while keyboard focus is inside the carousel (default true). */
  readonly pauseOnFocus?: boolean;
  /**
   * Carry on after the user steps through the slides themselves, restarting from a full
   * delay (default true). With `false` the first interaction stops autoplay until `play()`.
   */
  readonly resumeAfterInteraction?: boolean;
  /** Which way it rotates (default `forward`). */
  readonly direction?: 'forward' | 'backward';
}

/** Everything that can hold autoplay, as plain flags. */
export interface AndesCarouselAutoplaySources {
  readonly enabled: boolean;
  readonly reducedMotion: boolean;
  readonly userPaused: boolean;
  readonly hidden: boolean;
  readonly offscreen: boolean;
  readonly dragging: boolean;
  readonly focus: boolean;
  readonly hover: boolean;
}

/** Folds the pause sources into the one state they add up to. */
export function resolveAutoplayState(
  sources: AndesCarouselAutoplaySources,
): AndesCarouselAutoplayState {
  if (!sources.enabled) {
    return 'idle';
  }
  if (sources.reducedMotion) {
    return 'reduced-motion';
  }
  if (sources.userPaused) {
    return 'paused-by-user';
  }
  if (sources.hidden) {
    return 'paused-hidden';
  }
  if (sources.offscreen) {
    return 'paused-offscreen';
  }
  if (sources.dragging) {
    return 'paused-by-drag';
  }
  if (sources.focus) {
    return 'paused-by-focus';
  }
  if (sources.hover) {
    return 'paused-by-hover';
  }
  return 'running';
}
