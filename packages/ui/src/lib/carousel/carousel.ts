import { Directionality } from '@angular/cdk/bidi';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  numberAttribute,
  output,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';

import {
  resolveAutoplayState,
  type AndesCarouselAutoplayOptions,
  type AndesCarouselAutoplayState,
} from './carousel-autoplay';
import { ANDES_CAROUSEL, type AndesCarouselContext } from './carousel-context';
import { AndesCarouselSlide } from './carousel-slide';
import {
  ANDES_CAROUSEL_EASINGS,
  resolveCarouselLabels,
  type AndesCarouselAlign,
  type AndesCarouselArrowContext,
  type AndesCarouselArrowPlacement,
  type AndesCarouselArrows,
  type AndesCarouselArrowSize,
  type AndesCarouselChange,
  type AndesCarouselDotContext,
  type AndesCarouselDotPlacement,
  type AndesCarouselDotPosition,
  type AndesCarouselDotsOptions,
  type AndesCarouselDotStyle,
  type AndesCarouselEasing,
  type AndesCarouselEffect,
  type AndesCarouselLabels,
  type AndesCarouselOrientation,
  type AndesCarouselReducedMotion,
  type AndesCarouselSlidesPerView,
} from './carousel-types';

/** Release velocities are measured over this window of recent pointer samples. */
const VELOCITY_WINDOW_MS = 100;
/** How far a release velocity carries the slides on, in ms of travel. */
const INERTIA_MS = 220;
/** Fraction of the pull that shows past the first / last stop when not looping. */
const EDGE_RESISTANCE = 0.35;
/** Length of the coast after a free drag, unless `--andes-carousel-release-duration` says. */
const RELEASE_MS = 700;
/** Quiet time after a wheel step, so one flick of a trackpad moves one stop. */
const WHEEL_LOCK_MS = 120;
/** Slack for float comparisons between positions. */
const EPSILON = 1e-6;

interface DragState {
  readonly id: number;
  readonly startX: number;
  readonly startY: number;
  readonly startPosition: number;
  readonly samples: { t: number; v: number }[];
  captured: boolean;
}

type AutoplayInput = boolean | AndesCarouselAutoplayOptions;

function toAutoplay(
  value: AutoplayInput | string | null | undefined,
): AutoplayInput {
  return value !== null && typeof value === 'object'
    ? value
    : booleanAttribute(value);
}

function toDots(
  value: boolean | AndesCarouselDotsOptions | string | null | undefined,
): boolean | AndesCarouselDotsOptions {
  return value !== null && typeof value === 'object'
    ? value
    : booleanAttribute(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCssLength(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0px';
  }
  return typeof value === 'number' ? `${value}px` : value;
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function parseCssTime(text: string): number | null {
  const match = /^\s*(-?[\d.]+)(ms|s)\s*$/.exec(text);
  if (!match) {
    return null;
  }
  const value = Number(match[1]) * (match[2] === 's' ? 1000 : 1);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * A set of slides shown one (or several) at a time, with optional autoplay, dots, arrows,
 * drag and swipe, keyboard and looping. Follows the carousel pattern for assistive tech: a
 * labelled region, slides announced as "slide, n of m", a pause control while it plays and
 * a live region that stays quiet while it rotates.
 *
 * ```html
 * <andes-carousel autoplay arrows="hover" aria-label="Featured products" [(active)]="stop">
 *   <andes-carousel-slide>One</andes-carousel-slide>
 *   <andes-carousel-slide>Two</andes-carousel-slide>
 * </andes-carousel>
 * ```
 *
 * **Stops.** `active`, `selectedIndex`, the dots and `goTo()` all speak in *stops*: one per
 * slide by default, one per page with `slidesToScroll`, and without the ones that would
 * leave blank space at the ends of a carousel that does not loop (`containScroll`).
 *
 * **Autoplay.** Every source that can hold it (pointer over it, keyboard focus inside, a
 * drag, a hidden tab, the carousel scrolled out of view, the user's pause button, reduced
 * motion) lets go on its own and the timer then restarts from a full delay. Focus that came
 * from a pointer press does not hold it; keyboard focus does. See `autoplayState`.
 *
 * **Looping** (`infinite`) with a scrolling effect needs at least `slidesPerView + 2` slides
 * to be seamless; with fewer, `next()` / `prev()` rewind across the carousel instead. The
 * slides are repositioned rather than cloned, so assistive technology sees each slide once.
 *
 * **Vertical** carousels need a height: give the host one, or set `slideHeight`.
 *
 * CSS custom properties (set on the host or an ancestor): `--andes-carousel-duration`,
 * `--andes-carousel-easing`, `--andes-carousel-release-duration` (coast of `dragFree`),
 * `--andes-carousel-gap`, `--andes-carousel-peek`, `--andes-carousel-aspect`, and the dots'
 * `--andes-carousel-dot-color`, `-dot-active-color`, `-dot-hover-color`, `-dot-size`,
 * `-dot-length`, `-dot-active-length`, `-dot-gap`, `-dot-background`, `-dot-offset`.
 */
@Component({
  selector: 'andes-carousel',
  imports: [NgTemplateOutlet],
  templateUrl: './carousel.html',
  styleUrl: './carousel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ANDES_CAROUSEL, useExisting: AndesCarousel }],
  host: {
    role: 'region',
    'aria-roledescription': 'carousel',
    '[attr.aria-label]': 'regionLabel()',
    '[attr.aria-labelledby]': 'ariaLabelledby()',
    '[attr.data-slot]': '"carousel"',
    '[attr.data-effect]': 'effect()',
    '[attr.data-orientation]': 'isVertical() ? "vertical" : "horizontal"',
    '[attr.data-dragging]': 'dragging() ? "" : null',
    '[attr.data-draggable]': 'canDrag() ? "" : null',
    '[attr.data-playing]': 'isPlaying() ? "" : null',
    '[attr.data-autoplay]': 'autoplayEnabled() ? autoplayState() : null',
    '[attr.data-arrows]': 'arrowMode()',
    '[attr.data-arrow-placement]': 'arrowPlacement()',
    '[attr.data-arrow-size]': 'arrowSize()',
    '[attr.data-arrows-touch]': 'hideArrowsOnTouch() ? "hide" : null',
    '[attr.data-dot-style]': 'dotStyle()',
    '[attr.data-dot-position]': 'dotsPlacement() ? dotPosition() : null',
    '[attr.data-dot-placement]': 'dotsPlacement()',
    '[attr.data-instant]': 'instant() ? "" : null',
    '[attr.data-reduced]': 'reducedActive() ? "" : null',
    '[attr.data-release]': 'releasing() ? "free" : null',
    '[attr.data-adaptive]': 'adaptiveActive() ? "" : null',
    '[attr.data-fill]': 'fill() ? "" : null',
    '[style.--andes-carousel-position]': 'displayPosition()',
    '[style.--andes-carousel-count]': 'slideCount()',
    '[style.--andes-carousel-per-view]': 'perView()',
    '[style.--andes-carousel-window-start]': 'windowStart()',
    '[style.--andes-carousel-shift]': 'shift()',
    '[style.--andes-carousel-gap]': 'cssGap()',
    '[style.--andes-carousel-speed]': 'cssSpeed()',
    '[style.--andes-carousel-duration]': 'cssDuration()',
    '[style.--andes-carousel-easing]': 'cssEasing()',
    '[style.--andes-carousel-peek]': 'cssPeek()',
    '[style.--andes-carousel-aspect]': 'cssAspect()',
    '[style.--andes-carousel-height]': 'adaptiveHeightPx()',
    '[style.--andes-carousel-dot-size]': 'cssDotSize()',
    '[style.height]': 'hostHeight()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AndesCarousel implements AndesCarouselContext {
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly directionality = inject(Directionality);

  // --- Layout --------------------------------------------------------------------------

  /** How slides change. `fade` always shows one slide and ignores `gap` and `orientation`. */
  readonly effect = input<AndesCarouselEffect>('scroll');
  /** Axis the slides move along. A vertical carousel needs a height (see `slideHeight`). */
  readonly orientation = input<AndesCarouselOrientation>('horizontal');
  /** Shorthand for `orientation="vertical"`. */
  readonly vertical = input(false, { transform: booleanAttribute });
  /**
   * How many slides show at once; may be fractional to peek at the next one. Also takes a
   * map of the carousel's own minimum width (px) to a count: `{ 0: 1, 600: 2, 960: 3 }`.
   */
  readonly slidesPerView = input<AndesCarouselSlidesPerView>(1);
  /** Slides a step moves by: a number, or `'auto'` for as many as are in view. */
  readonly slidesToScroll = input<number | 'auto'>(1);
  /** Space between slides: px number or any CSS length. */
  readonly gap = input<number | string>(0);
  /** Which part of the view the selected slide lines up with. */
  readonly align = input<AndesCarouselAlign>('start');
  /**
   * Without looping, keep the slides flush with the ends: stops that would leave blank
   * space are dropped. Turn off to let the first and last slide reach the `align` point.
   */
  readonly containScroll = input(true, { transform: booleanAttribute });
  /** Wrap past the ends. */
  readonly infinite = input(true, { transform: booleanAttribute });
  /** Stop shown first, when `active` is not bound to something else. */
  readonly startIndex = input(0, { transform: numberAttribute });
  /** How much of the neighbouring slides shows at the edges: px number or any CSS length. */
  readonly peek = input<number | string | null>(null);
  /** Keep the viewport at this shape (`16 / 9`, `'4/3'`); slides stretch to fill it. */
  readonly aspectRatio = input<number | string | null>(null);
  /** Height of one slide, so a vertical carousel sizes itself (px number or CSS length). */
  readonly slideHeight = input<number | string | null>(null);
  /** Let the viewport follow the height of the slides in view (horizontal only). */
  readonly adaptiveHeight = input(false, { transform: booleanAttribute });
  /** Slides kept rendered on each side of the visible ones (see `andesCarouselLazy`). */
  readonly preload = input(1, { transform: numberAttribute });

  // --- Motion --------------------------------------------------------------------------

  /** Length of a change in ms (default 400; or set `--andes-carousel-duration`). */
  readonly speed = input<number | null, unknown>(null, {
    transform: toNullableNumber,
  });
  /** Timing curve: a preset name or any CSS easing (or set `--andes-carousel-easing`). */
  readonly easing = input<AndesCarouselEasing | null>(null);
  /** Ignore the arrows, dots, keys and wheel while a change is still moving. */
  readonly waitForAnimate = input(false, { transform: booleanAttribute });
  /** `system` honours `prefers-reduced-motion`; `allow` keeps motion regardless. */
  readonly reducedMotion = input<AndesCarouselReducedMotion>('system');

  // --- Autoplay ------------------------------------------------------------------------

  /** Advance on a timer; `true`, or an options object (see `AndesCarouselAutoplayOptions`). */
  readonly autoplay = input<
    AutoplayInput,
    AutoplayInput | string | null | undefined
  >(false, { transform: toAutoplay });
  /** Delay between automatic changes, in ms. */
  readonly autoplaySpeed = input(3000, { transform: numberAttribute });
  /** Hold autoplay while the pointer is over the carousel. */
  readonly pauseOnHover = input(true, { transform: booleanAttribute });
  /** Hold autoplay while keyboard focus is inside the carousel. */
  readonly pauseOnFocus = input(true, { transform: booleanAttribute });
  /** The first interaction (drag, arrows, dots, keys) stops autoplay until `play()`. */
  readonly stopOnInteraction = input(false, { transform: booleanAttribute });
  /** Show the play / pause button that moving content needs. */
  readonly autoplayControl = input(true, { transform: booleanAttribute });

  // --- Drag, wheel, keys ---------------------------------------------------------------

  /** Change slides by dragging or swiping with a mouse, finger or pen. */
  readonly draggable = input(true, { transform: booleanAttribute });
  /** Let a drag coast to rest anywhere instead of snapping to a stop. */
  readonly dragFree = input(false, { transform: booleanAttribute });
  /** Movement along the axis, in px, before a press becomes a drag. */
  readonly dragThreshold = input(6, { transform: numberAttribute });
  /** Let a fast flick pass several stops (by default a drag moves at most one). */
  readonly skipSnaps = input(false, { transform: booleanAttribute });
  /** Change slides with the mouse wheel or a trackpad swipe along the axis. */
  readonly wheel = input(false, { transform: booleanAttribute });
  /** Arrow keys, Home and End change slides while focus is inside. */
  readonly keyboard = input(true, { transform: booleanAttribute });

  // --- Dots ----------------------------------------------------------------------------

  /** Show the dots; an object adds a `className` to their container. */
  readonly dots = input<
    boolean | AndesCarouselDotsOptions,
    boolean | AndesCarouselDotsOptions | string | null | undefined
  >(true, { transform: toDots });
  /** `dot` is a circle, `line` a flat bar, `pill` a short bar with a longer active one. */
  readonly dotStyle = input<AndesCarouselDotStyle>('dot');
  /** Thickness of the dot in px (diameter for `dot`); defaults to the style's own. */
  readonly dotSize = input<number | null, unknown>(null, {
    transform: toNullableNumber,
  });
  /** Edge the dots sit on; default `bottom` (`end` when vertical). */
  readonly dotPlacement = input<AndesCarouselDotPlacement | null>(null);
  /** Over the slides (`inside`) or in their own space (`outside`). */
  readonly dotPosition = input<AndesCarouselDotPosition>('inside');
  /** Content of each dot button, in place of the default marker. */
  readonly dotTemplate = input<TemplateRef<AndesCarouselDotContext> | null>(
    null,
  );
  /** Fill the active dot over `autoplaySpeed` to show when the next change comes. */
  readonly dotProgress = input(false, { transform: booleanAttribute });

  // --- Arrows --------------------------------------------------------------------------

  /** Previous / next buttons: `true`, `'always'` or `'hover'`. */
  readonly arrows = input<AndesCarouselArrows>(false);
  /** Over the slides (`inside`) or beside them (`outside`). */
  readonly arrowPlacement = input<AndesCarouselArrowPlacement>('inside');
  readonly arrowSize = input<AndesCarouselArrowSize>('md');
  /** Content of each arrow button, in place of the chevron. */
  readonly arrowTemplate = input<TemplateRef<AndesCarouselArrowContext> | null>(
    null,
  );
  /** Hide the arrows on touch screens, where swiping does the job. */
  readonly hideArrowsOnTouch = input(false, { transform: booleanAttribute });

  // --- Naming --------------------------------------------------------------------------

  /** Accessible name of the region. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, {
    alias: 'aria-labelledby',
  });
  /** Localised strings; unset fields keep their English default. */
  readonly labels = input<AndesCarouselLabels | null>(null);

  // --- State and events ----------------------------------------------------------------

  /** Selected stop (`[(active)]`): the index of the slide, or page, the carousel is on. */
  readonly active = model(0);

  /** A change is about to happen; reports the stops involved. */
  readonly slideChange = output<AndesCarouselChange>();
  /** The carousel has finished moving to a new stop; reports it. */
  readonly slideChanged = output<number>();
  /** A drag began; reports the stop it started from. */
  readonly dragStarted = output<number>();
  /** A drag ended; reports the stop it started from and the one it settles on. */
  readonly dragEnded = output<AndesCarouselChange>();
  /** The carousel stopped moving for any reason (a change, or a drag that snapped back). */
  readonly settled = output<number>();
  /** The slides have been laid out for the first time. */
  readonly ready = output<void>();

  private readonly slides = contentChildren(AndesCarouselSlide);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  readonly slideCount = computed(() => this.slides().length);
  readonly isVertical = computed(
    () =>
      (this.orientation() === 'vertical' || this.vertical()) &&
      this.effect() !== 'fade',
  );
  readonly resolvedLabels = computed(() =>
    resolveCarouselLabels(this.labels()),
  );
  readonly fill = computed(
    () => this.aspectRatio() !== null || this.slideHeight() !== null,
  );

  /** Width of the carousel, tracked only when `slidesPerView` is a breakpoint map. */
  private readonly hostWidth = signal(0);

  /** Slides on screen at once, never more than there are slides. */
  readonly perView = computed(() => {
    if (this.effect() === 'fade') {
      return 1;
    }
    const wanted = this.resolveBreakpoint(this.slidesPerView());
    const view = Number.isFinite(wanted) && wanted >= 1 ? wanted : 1;
    return Math.max(1, Math.min(view, Math.max(1, this.slideCount())));
  });
  private readonly visibleCount = computed(() => Math.ceil(this.perView()));

  /** Whether the loop is seamless: fade always can, scrolling needs spare slides. */
  readonly wraps = computed(() => {
    if (!this.infinite() || this.slideCount() < 2) {
      return false;
    }
    return (
      this.effect() === 'fade' || this.slideCount() >= this.visibleCount() + 2
    );
  });

  readonly windowStart = computed(
    () =>
      -1 -
      Math.floor(Math.max(0, this.slideCount() - this.visibleCount() - 2) / 2),
  );

  /** How far the selected slide sits from the start edge, in slide steps. */
  protected readonly shift = computed(() => {
    const factor = { start: 0, center: 0.5, end: 1 }[this.align()] ?? 0;
    return (this.perView() - 1) * factor;
  });

  private readonly scrollStep = computed(() => {
    if (this.effect() === 'fade') {
      return 1;
    }
    const wanted = this.slidesToScroll();
    const step =
      wanted === 'auto'
        ? Math.floor(this.perView())
        : Math.floor(Number(wanted));
    return Math.max(1, Number.isFinite(step) ? step : 1);
  });

  /**
   * Every place the carousel can rest, as the slide coordinate at the start edge. Looping
   * carousels repeat these every `slideCount`.
   */
  protected readonly snaps = computed<readonly number[]>(() => {
    const count = this.slideCount();
    if (count === 0) {
      return [];
    }
    const shift = this.shift();
    const step = this.scrollStep();
    const stops: number[] = [];
    if (this.wraps()) {
      for (let i = 0; i < count; i += step) {
        stops.push(i - shift);
      }
      return stops;
    }
    const max = Math.max(0, count - this.perView());
    const contain = this.containScroll();
    for (let i = 0; i < count; i += step) {
      let stop = i - shift;
      if (contain) {
        stop = Math.min(Math.max(stop, 0), max);
      }
      if (
        stops.length === 0 ||
        Math.abs(stop - stops[stops.length - 1]) > EPSILON
      ) {
        stops.push(stop);
      }
    }
    return stops;
  });

  /** Number of stops (one per dot). */
  readonly stopCount = computed(() => this.snaps().length);

  private readonly reducedSystem = signal(false);
  protected readonly reducedActive = computed(
    () =>
      this.reducedMotion() === 'reduce' ||
      (this.reducedMotion() === 'system' && this.reducedSystem()),
  );
  protected readonly instant = signal(false);
  protected readonly dragging = signal(false);
  protected readonly releasing = signal(false);
  private readonly dragPosition = signal(0);
  private readonly animating = signal(false);

  /** Where the slides are (or are headed): unbounded when looping. */
  private readonly target = signal(0);
  /** Where the slides are headed (see `AndesCarouselContext.position`). */
  readonly position = this.target.asReadonly();
  protected readonly displayPosition = computed(() =>
    this.dragging() ? this.dragPosition() : this.position(),
  );

  protected readonly cssGap = computed(() =>
    this.effect() === 'fade' ? '0px' : toCssLength(this.gap()),
  );
  protected readonly cssSpeed = computed(() => {
    if (this.instant() || this.dragging() || this.reducedActive()) {
      return '0ms';
    }
    return this.releasing()
      ? `var(--andes-carousel-release-duration, ${RELEASE_MS}ms)`
      : 'var(--andes-carousel-duration, 400ms)';
  });
  protected readonly cssDuration = computed(() => {
    const speed = this.speed();
    return speed === null ? null : `${Math.max(0, speed)}ms`;
  });
  protected readonly cssEasing = computed(() => {
    const easing = this.easing();
    return easing ? (ANDES_CAROUSEL_EASINGS[easing] ?? easing) : null;
  });
  protected readonly cssPeek = computed(() => {
    const peek = this.peek();
    return peek === null || this.effect() === 'fade' ? null : toCssLength(peek);
  });
  protected readonly cssAspect = computed(() => {
    const ratio = this.aspectRatio();
    return ratio === null ? null : String(ratio);
  });
  protected readonly cssDotSize = computed(() => {
    const size = this.dotSize();
    return size === null ? null : `${size}px`;
  });
  protected readonly hostHeight = computed(() => {
    const height = this.slideHeight();
    if (height === null || !this.isVertical()) {
      return null;
    }
    const slide = toCssLength(height);
    const view = this.perView();
    const peek = this.cssPeek();
    return `calc(${view} * ${slide} + ${view - 1} * ${this.cssGap()}${
      peek ? ` + 2 * ${peek}` : ''
    })`;
  });

  protected readonly adaptiveActive = computed(
    () => this.adaptiveHeight() && !this.isVertical(),
  );
  protected readonly adaptiveHeightPx = signal<string | null>(null);

  /** Stop the carousel is on (the nearest one to where it is headed). */
  readonly selectedIndex = computed(() => this.nearestIndex(this.position()));

  protected readonly regionLabel = computed(
    () =>
      this.ariaLabel() ??
      (this.ariaLabelledby() ? null : this.resolvedLabels().carousel),
  );

  /** A change would move somewhere: looping, rewinding, or not yet at the end. */
  private readonly rewinds = computed(
    () => this.infinite() && !this.wraps() && this.stopCount() > 1,
  );
  readonly canScrollPrev = computed(
    () => this.wraps() || this.rewinds() || this.selectedIndex() > 0,
  );
  readonly canScrollNext = computed(
    () =>
      this.wraps() ||
      this.rewinds() ||
      this.selectedIndex() < this.stopCount() - 1,
  );

  protected readonly arrowMode = computed<'always' | 'hover' | null>(() => {
    if (this.slideCount() < 2 || this.stopCount() < 2) {
      return null;
    }
    const arrows = this.arrows();
    if (arrows === true || arrows === 'always') {
      return 'always';
    }
    return arrows === 'hover' ? 'hover' : null;
  });
  protected readonly prevContext = computed<AndesCarouselArrowContext>(() => ({
    $implicit: 'prev',
    direction: 'prev',
    disabled: !this.canScrollPrev(),
  }));
  protected readonly nextContext = computed<AndesCarouselArrowContext>(() => ({
    $implicit: 'next',
    direction: 'next',
    disabled: !this.canScrollNext(),
  }));

  private readonly dotsEnabled = computed(() => this.dots() !== false);
  protected readonly dotsClass = computed(() => {
    const dots = this.dots();
    return typeof dots === 'object' ? (dots.className ?? '') : '';
  });
  protected readonly dotsPlacement = computed(() =>
    this.dotsEnabled() && this.stopCount() > 1
      ? (this.dotPlacement() ?? (this.isVertical() ? 'end' : 'bottom'))
      : null,
  );
  protected readonly dotItems = computed<readonly AndesCarouselDotContext[]>(
    () => {
      const current = this.selectedIndex();
      const count = this.stopCount();
      return Array.from({ length: count }, (_, index) => ({
        $implicit: index,
        index,
        active: index === current,
        count,
        goTo: () => this.userGoTo(index),
      }));
    },
  );

  // --- Autoplay state machine ----------------------------------------------------------
  // Each pause source is its own signal and lets go on its own; `autoplayState` folds them
  // into the one state the timer and the controls follow.

  private readonly hovered = signal(false);
  private readonly keyboardFocus = signal(false);
  private readonly pageHidden = signal(false);
  private readonly offscreen = signal(false);
  private readonly userPaused = signal(false);
  private readonly stopped = signal(false);
  /** Bumped by every deliberate interaction, so the timer starts over from a full delay. */
  protected readonly interactionEpoch = signal(0);

  private readonly autoplayOptions = computed(() => {
    const value = this.autoplay();
    const options: AndesCarouselAutoplayOptions =
      typeof value === 'object' ? value : {};
    return {
      enabled: value !== false,
      speed: Math.max(0, options.speed ?? this.autoplaySpeed()),
      pauseOnHover: options.pauseOnHover ?? this.pauseOnHover(),
      pauseOnFocus: options.pauseOnFocus ?? this.pauseOnFocus(),
      resumeAfterInteraction:
        options.resumeAfterInteraction ?? !this.stopOnInteraction(),
      direction: options.direction === 'backward' ? -1 : 1,
    } as const;
  });

  /** Autoplay is switched on and there is something to rotate through. */
  protected readonly autoplayEnabled = computed(
    () =>
      this.autoplayOptions().enabled &&
      this.slideCount() > 1 &&
      this.stopCount() > 1,
  );

  /** What autoplay is doing right now. */
  readonly autoplayState = computed<AndesCarouselAutoplayState>(() => {
    const options = this.autoplayOptions();
    return resolveAutoplayState({
      enabled: this.autoplayEnabled(),
      reducedMotion: this.reducedActive(),
      userPaused: this.userPaused() || this.stopped(),
      hidden: this.pageHidden(),
      offscreen: this.offscreen(),
      dragging: this.dragging(),
      focus: options.pauseOnFocus && this.keyboardFocus(),
      hover: options.pauseOnHover && this.hovered(),
    });
  });

  /** The timer is counting down to the next change. */
  readonly isPlaying = computed(() => this.autoplayState() === 'running');

  /** Autoplay is wanted and not switched off by the user or reduced motion. */
  protected readonly autoplayWanted = computed(
    () =>
      this.autoplayEnabled() &&
      !this.reducedActive() &&
      !this.userPaused() &&
      !this.stopped(),
  );
  protected readonly showPlayControl = computed(
    () =>
      this.autoplayControl() && this.autoplayEnabled() && !this.reducedActive(),
  );

  /** Silent while the carousel rotates by itself, polite otherwise. */
  protected readonly liveMode = computed(() =>
    this.isPlaying() ? 'off' : 'polite',
  );
  protected readonly progressDuration = computed(
    () => `${this.autoplayOptions().speed}ms`,
  );
  protected readonly progressOn = computed(
    () => this.dotProgress() && this.isPlaying(),
  );
  /** Alternates, so the progress animation restarts when the delay does. */
  protected readonly progressAlt = computed(
    () => this.interactionEpoch() % 2 === 1,
  );

  protected readonly canDrag = computed(
    () => this.draggable() && this.slideCount() > 1 && this.stopCount() > 1,
  );

  private drag: DragState | null = null;
  private suppressClick = false;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChange = false;
  private lastFocusWasInSlide = false;
  private wheelLockedUntil = 0;
  private started = false;

  constructor() {
    this.setUpEnvironmentListeners();

    // Slides added or removed, or a different layout, leave the position off the stops.
    effect(() => {
      this.snaps();
      untracked(() => {
        if (this.started) {
          this.realign();
        }
      });
    });

    // The model drives the carousel from outside; our own moves write it back.
    effect(() => {
      const wanted = this.active();
      const count = this.slideCount();
      untracked(() => {
        if (count === 0) {
          return;
        }
        if (!this.started) {
          this.started = true;
          const first = wanted !== 0 ? wanted : this.startIndex();
          // The first placement is not a change: no events, no animation.
          this.target.set(
            this.stopPosition(this.clampIndex(Math.trunc(first) || 0), 0),
          );
          this.active.set(this.selectedIndex());
          afterNextRender(() => this.ready.emit(), {
            injector: this.injector,
          });
          return;
        }
        const clamped = this.clampIndex(Math.trunc(Number(wanted)) || 0);
        if (clamped !== this.selectedIndex()) {
          this.moveToStop(clamped, true);
        } else if (clamped !== wanted) {
          this.active.set(clamped);
        }
      });
    });

    // The timer runs only while autoplay is `running`, and starts over whenever the
    // position moves, the user interacts or any pause source lets go.
    effect((onCleanup) => {
      if (this.autoplayState() !== 'running') {
        return;
      }
      this.position();
      this.interactionEpoch();
      const delay = this.autoplayOptions().speed;
      const id = setTimeout(() => this.advanceAutomatically(), delay);
      onCleanup(() => clearTimeout(id));
    });

    // Pause while the carousel is scrolled out of view.
    effect((onCleanup) => {
      if (
        !this.autoplayEnabled() ||
        typeof IntersectionObserver !== 'function'
      ) {
        this.offscreen.set(false);
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        const last = entries[entries.length - 1];
        if (last) {
          this.offscreen.set(!last.isIntersecting);
        }
      });
      observer.observe(this.host);
      onCleanup(() => observer.disconnect());
    });

    // A pointer that left without a `pointerleave` (the carousel moved or was covered)
    // must not hold autoplay forever: any pointer move outside ends the hover.
    effect((onCleanup) => {
      if (!this.hovered()) {
        return;
      }
      const onMove = (event: PointerEvent) => {
        if (
          !(event.target instanceof Node) ||
          !this.host.contains(event.target)
        ) {
          this.hovered.set(false);
        }
      };
      this.document.addEventListener('pointermove', onMove, { passive: true });
      onCleanup(() => this.document.removeEventListener('pointermove', onMove));
    });

    // Breakpoint maps and an adaptive height need to know sizes.
    effect((onCleanup) => {
      const watchWidth = typeof this.slidesPerView() === 'object';
      const watchSlides = this.adaptiveActive();
      if (
        (!watchWidth && !watchSlides) ||
        typeof ResizeObserver !== 'function'
      ) {
        return;
      }
      const slides = this.slides();
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === this.host) {
            this.hostWidth.set(entry.contentRect.width);
          }
        }
        this.measureAdaptiveHeight();
      });
      if (watchWidth) {
        observer.observe(this.host);
        this.hostWidth.set(this.host.clientWidth);
      }
      if (watchSlides) {
        for (const slide of slides) {
          observer.observe(slide.element);
        }
      }
      onCleanup(() => observer.disconnect());
    });

    effect(() => {
      if (!this.adaptiveActive()) {
        this.adaptiveHeightPx.set(null);
        return;
      }
      for (const slide of this.slides()) {
        slide.visible();
      }
      afterNextRender(() => this.measureAdaptiveHeight(), {
        injector: this.injector,
      });
    });
  }

  private resolveBreakpoint(value: AndesCarouselSlidesPerView): number {
    if (typeof value !== 'object' || value === null) {
      return Number(value);
    }
    const width = this.hostWidth();
    let chosen: number | null = null;
    let chosenFrom = -Infinity;
    for (const [from, count] of Object.entries(value)) {
      const minimum = Number(from);
      if (minimum <= width && minimum >= chosenFrom) {
        chosen = Number(count);
        chosenFrom = minimum;
      }
    }
    return chosen ?? 1;
  }

  private measureAdaptiveHeight(): void {
    if (!this.adaptiveActive()) {
      return;
    }
    const heights = this.slides()
      .filter((slide) => slide.visible())
      .map((slide) => slide.element.offsetHeight);
    const tallest = Math.max(0, ...heights);
    this.adaptiveHeightPx.set(tallest > 0 ? `${tallest}px` : null);
  }

  // --- Stops ---------------------------------------------------------------------------

  /** The stop nearest to a position; going round when looping. */
  private nearestIndex(position: number): number {
    const snaps = this.snaps();
    const count = this.slideCount();
    const wraps = this.wraps();
    let best = 0;
    let bestDistance = Infinity;
    for (let k = 0; k < snaps.length; k++) {
      let distance = Math.abs(snaps[k] - position);
      if (wraps) {
        const rest = (((position - snaps[k]) % count) + count) % count;
        distance = Math.min(rest, count - rest);
      }
      if (distance < bestDistance - 1e-9) {
        best = k;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Where stop `k` sits; when looping, the copy of it nearest to `near`. */
  private stopPosition(k: number, near: number): number {
    const stop = this.snaps()[k] ?? 0;
    if (!this.wraps()) {
      return stop;
    }
    const count = this.slideCount();
    return stop + count * Math.round((near - stop) / count);
  }

  private clampIndex(index: number): number {
    return Math.min(Math.max(index, 0), Math.max(0, this.stopCount() - 1));
  }

  /** Puts the carousel back on a stop after the stops themselves changed. */
  private realign(): void {
    if (this.slideCount() === 0 || this.dragging()) {
      return;
    }
    const target = this.stopPosition(
      this.clampIndex(Math.trunc(Number(this.active())) || 0),
      this.position(),
    );
    if (Math.abs(target - this.position()) > EPSILON) {
      this.commit(target, false);
    }
  }

  indexOf(slide: object): number {
    return this.slides().indexOf(slide as AndesCarouselSlide);
  }

  // --- Public API ----------------------------------------------------------------------

  /** Shows the next stop (rewinding to the first at the end of a rewinding carousel). */
  next(): void {
    this.step(1);
  }

  /** Shows the previous stop. */
  prev(): void {
    this.step(-1);
  }

  /**
   * Shows the stop at `index`. With `animate` false the change is instant. When looping,
   * the shorter way round is taken.
   */
  goTo(index: number, animate = true): void {
    this.moveToStop(this.clampIndex(Math.trunc(index) || 0), animate);
  }

  /** Starts autoplay again after a pause or an interaction stop. */
  play(): void {
    this.userPaused.set(false);
    this.stopped.set(false);
    this.interactionEpoch.update((n) => n + 1);
  }

  /** Pauses autoplay until `play()`. */
  pause(): void {
    this.userPaused.set(true);
  }

  protected togglePlay(): void {
    if (this.autoplayWanted()) {
      this.pause();
    } else {
      this.play();
    }
  }

  protected userNext(): void {
    this.userStep(1);
  }

  protected userPrev(): void {
    this.userStep(-1);
  }

  protected userGoTo(index: number): void {
    this.interacted();
    if (!this.blockedByAnimation()) {
      this.moveToStop(this.clampIndex(index), true);
    }
  }

  private userStep(direction: 1 | -1): void {
    this.interacted();
    if (!this.blockedByAnimation()) {
      this.step(direction);
    }
  }

  private blockedByAnimation(): boolean {
    return this.waitForAnimate() && this.animating();
  }

  private step(direction: 1 | -1): void {
    const count = this.stopCount();
    if (count < 2) {
      return;
    }
    const current = this.selectedIndex();
    const target = current + direction;
    if (this.wraps()) {
      const next = (target + count) % count;
      const stop = this.snaps()[next];
      const here = this.stopPosition(current, this.position());
      const period = this.slideCount();
      const shifts =
        direction > 0
          ? Math.floor((here - stop) / period) + 1
          : Math.ceil((here - stop) / period) - 1;
      this.commit(stop + shifts * period, true);
      return;
    }
    if (target >= 0 && target < count) {
      this.moveToStop(target, true);
    } else if (this.rewinds()) {
      this.moveToStop(direction > 0 ? 0 : count - 1, true);
    }
  }

  /** Moves to a stop by the shortest route. */
  private moveToStop(index: number, animate: boolean): void {
    const target = this.stopPosition(index, this.position());
    if (Math.abs(target - this.position()) > EPSILON) {
      this.commit(target, animate);
    }
  }

  /** Applies a new target position and reports the change. */
  private commit(
    position: number,
    animate: boolean,
    release: 'snap' | 'free' = 'snap',
  ): void {
    const from = this.selectedIndex();
    const to = this.nearestIndex(position);
    if (to !== from) {
      this.slideChange.emit({ from, to });
      this.pendingChange = true;
    }
    this.lastFocusWasInSlide = this.focusIsInSlide();
    this.releasing.set(release === 'free');
    if (!animate) {
      this.instant.set(true);
      afterNextRender(
        () => {
          // Flush the style so the jump is committed at 0ms: restoring the speed in the
          // same frame would let the browser animate it after all.
          void getComputedStyle(this.host).getPropertyValue(
            '--andes-carousel-position',
          );
          this.instant.set(false);
        },
        { injector: this.injector },
      );
    }
    this.target.set(position);
    this.active.set(to);
    this.scheduleSettle(to, animate);
    if (to !== from) {
      this.keepFocusInside();
    }
  }

  private readCssTime(name: string): number | null {
    return parseCssTime(getComputedStyle(this.host).getPropertyValue(name));
  }

  /** Length of the move in flight, in ms. */
  private duration(): number {
    if (this.reducedActive()) {
      return 0;
    }
    if (this.releasing()) {
      return (
        this.readCssTime('--andes-carousel-release-duration') ?? RELEASE_MS
      );
    }
    return this.readCssTime('--andes-carousel-duration') ?? this.speed() ?? 400;
  }

  private scheduleSettle(index: number, animate: boolean): void {
    if (this.settleTimer !== null) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    const duration = animate ? this.duration() : 0;
    const done = () => {
      this.settleTimer = null;
      this.animating.set(false);
      this.releasing.set(false);
      if (this.pendingChange) {
        this.pendingChange = false;
        this.slideChanged.emit(index);
      }
      this.settled.emit(index);
    };
    if (duration <= 0) {
      done();
      return;
    }
    this.animating.set(true);
    this.settleTimer = setTimeout(done, duration);
  }

  private advanceAutomatically(): void {
    this.step(this.autoplayOptions().direction);
  }

  /** A deliberate user action: the delay starts over; with `stopOnInteraction`, it ends. */
  private interacted(): void {
    this.interactionEpoch.update((n) => n + 1);
    if (
      this.autoplayOptions().enabled &&
      !this.autoplayOptions().resumeAfterInteraction
    ) {
      this.stopped.set(true);
    }
  }

  private focusIsInSlide(): boolean {
    const active = this.document.activeElement;
    return (
      !!active &&
      this.host.contains(active) &&
      active.closest('[data-slot="carousel-slide"]') !== null
    );
  }

  /** A slide that held focus becomes inert; keep focus in the carousel instead of dropping it. */
  private keepFocusInside(): void {
    if (!this.lastFocusWasInSlide) {
      return;
    }
    afterNextRender(
      () => {
        const active = this.document.activeElement;
        if (!active || active === this.document.body) {
          this.viewport()?.nativeElement.focus({ preventScroll: true });
        }
      },
      { injector: this.injector },
    );
  }

  // --- Pointer, focus and keyboard -----------------------------------------------------

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      this.hovered.set(true);
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      this.hovered.set(false);
    }
  }

  /**
   * Only keyboard focus holds autoplay. Focus that landed here because the pointer pressed
   * something is not a reason to stay paused: it would never lift while the pointer is away.
   */
  protected onFocusIn(event: FocusEvent): void {
    this.keyboardFocus.set(this.isKeyboardFocus(event.target));
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.contains(next)) {
      this.keyboardFocus.set(false);
    }
  }

  private isKeyboardFocus(target: EventTarget | null): boolean {
    if (
      !(target instanceof HTMLElement) ||
      this.document.activeElement !== target
    ) {
      return true;
    }
    try {
      return target.matches(':focus-visible');
    } catch {
      return true;
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    // A key press inside makes whatever has focus a keyboard focus.
    if (this.host.contains(this.document.activeElement)) {
      this.keyboardFocus.set(true);
    }
    if (
      !this.keyboard() ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isEditable(event.target) ||
      this.slideCount() < 2
    ) {
      return;
    }
    const rtl = this.isRtl();
    const vertical = this.isVertical();
    let direction: 1 | -1 | null = null;
    let target: number | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        direction = vertical ? null : rtl ? 1 : -1;
        break;
      case 'ArrowRight':
        direction = vertical ? null : rtl ? -1 : 1;
        break;
      case 'ArrowUp':
        direction = vertical ? -1 : null;
        break;
      case 'ArrowDown':
        direction = vertical ? 1 : null;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = this.stopCount() - 1;
        break;
      default:
        return;
    }
    if (direction === null && target === null) {
      return;
    }
    event.preventDefault();
    if (direction !== null) {
      this.userStep(direction);
    } else if (target !== null) {
      this.userGoTo(target);
    }
  }

  protected onWheel(event: WheelEvent): void {
    if (!this.wheel() || this.stopCount() < 2) {
      return;
    }
    const vertical = this.isVertical();
    const along = vertical
      ? event.deltaY
      : event.shiftKey && event.deltaX === 0
        ? event.deltaY
        : event.deltaX;
    const across = vertical ? event.deltaX : event.deltaY;
    if (
      Math.abs(along) < 1 ||
      (!event.shiftKey && Math.abs(across) > Math.abs(along))
    ) {
      return;
    }
    const direction = along * this.axisSign(vertical) > 0 ? 1 : -1;
    if (direction > 0 ? !this.canScrollNext() : !this.canScrollPrev()) {
      return;
    }
    event.preventDefault();
    const now = event.timeStamp || Date.now();
    if (now < this.wheelLockedUntil) {
      return;
    }
    this.wheelLockedUntil = now + this.duration() + WHEEL_LOCK_MS;
    this.userStep(direction);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (
      !this.canDrag() ||
      this.drag ||
      (event.pointerType === 'mouse' && event.button !== 0) ||
      isEditable(event.target)
    ) {
      return;
    }
    const along = this.isVertical() ? event.clientY : event.clientX;
    this.drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: this.position(),
      samples: [{ t: event.timeStamp, v: along }],
      captured: false,
    };
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    const vertical = this.isVertical();
    const along =
      (vertical ? event.clientY : event.clientX) -
      (vertical ? drag.startY : drag.startX);
    const across =
      (vertical ? event.clientX : event.clientY) -
      (vertical ? drag.startX : drag.startY);
    if (!drag.captured) {
      if (
        Math.abs(along) < this.dragThreshold() ||
        Math.abs(along) < Math.abs(across)
      ) {
        return;
      }
      drag.captured = true;
      this.interacted();
      this.dragPosition.set(drag.startPosition);
      this.dragging.set(true);
      this.dragStarted.emit(this.nearestIndex(drag.startPosition));
      this.document.defaultView?.getSelection()?.removeAllRanges();
      try {
        this.viewport()?.nativeElement.setPointerCapture(event.pointerId);
      } catch {
        // Not every environment can capture; the drag still tracks while over the carousel.
      }
    }
    drag.samples.push({
      t: event.timeStamp,
      v: vertical ? event.clientY : event.clientX,
    });
    while (
      drag.samples.length > 2 &&
      event.timeStamp - drag.samples[0].t > VELOCITY_WINDOW_MS
    ) {
      drag.samples.shift();
    }
    this.dragPosition.set(this.positionFor(drag, along));
  }

  protected onPointerEnd(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    this.drag = null;
    if (!drag.captured) {
      return;
    }
    try {
      this.viewport()?.nativeElement.releasePointerCapture(event.pointerId);
    } catch {
      // Nothing was captured.
    }
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false), 0);

    const vertical = this.isVertical();
    const first = drag.samples[0];
    const last = drag.samples[drag.samples.length - 1];
    const elapsed = Math.max(1, last.t - first.t);
    const velocity =
      event.type === 'pointerup' ? (last.v - first.v) / elapsed : 0;
    const projected =
      this.dragPosition() -
      (this.axisSign(vertical) * velocity * INERTIA_MS) / this.stepSize();
    const from = this.nearestIndex(drag.startPosition);
    const free = this.dragFree();
    const target = free
      ? this.contain(projected)
      : this.snapNear(projected, drag.startPosition);

    this.dragging.set(false);
    const to = this.nearestIndex(target);
    if (Math.abs(target - this.position()) > EPSILON) {
      this.commit(target, true, free ? 'free' : 'snap');
    } else {
      // Back where it started: still a move, so it still settles.
      this.releasing.set(false);
      this.scheduleSettle(to, true);
    }
    this.dragEnded.emit({ from, to });
  }

  /** Capture-phase: a drag must not end in a click on whatever the pointer was released over. */
  private readonly swallowClick = (event: Event): void => {
    if (this.suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressClick = false;
    }
  };

  private readonly onWheelEvent = (event: WheelEvent): void =>
    this.onWheel(event);

  /**
   * Reading direction at the carousel: the nearest `dir` attribute wins (what the CSS
   * follows), then the document direction.
   */
  private isRtl(): boolean {
    const dir = this.host.closest('[dir]')?.getAttribute('dir');
    return (
      dir === 'rtl' || (dir !== 'ltr' && this.directionality.value === 'rtl')
    );
  }

  private axisSign(vertical: boolean): number {
    return vertical || !this.isRtl() ? 1 : -1;
  }

  /** Length in px of the gap between slides, whatever CSS length it was given in. */
  private gapPx(): number {
    const gap = this.gap();
    if (typeof gap === 'number') {
      return gap;
    }
    const direct = /^\s*(-?[\d.]+)(px)?\s*$/.exec(gap);
    if (direct) {
      return Number(direct[1]);
    }
    const viewport = this.viewport()?.nativeElement;
    if (!viewport || !gap) {
      return 0;
    }
    const probe = this.document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;width:${gap};height:0`;
    viewport.appendChild(probe);
    const width = probe.offsetWidth;
    probe.remove();
    return width;
  }

  /** Distance in px between one slide's start and the next one's. */
  private stepSize(): number {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) {
      return 1;
    }
    const vertical = this.isVertical();
    const style = getComputedStyle(viewport);
    const padding =
      (Number.parseFloat(vertical ? style.paddingTop : style.paddingLeft) ||
        0) +
      (Number.parseFloat(vertical ? style.paddingBottom : style.paddingRight) ||
        0);
    const size =
      (vertical ? viewport.clientHeight : viewport.clientWidth) - padding;
    return Math.max(1, (size + this.gapPx()) / this.perView());
  }

  /** Clamps a position to the first and last stop (a looping carousel has no ends). */
  private contain(position: number): number {
    if (this.wraps()) {
      return position;
    }
    const snaps = this.snaps();
    return Math.min(
      Math.max(position, snaps[0] ?? 0),
      snaps[snaps.length - 1] ?? 0,
    );
  }

  /** The stop to settle on after a drag: nearest to `projected`, one step from the start. */
  private snapNear(projected: number, start: number): number {
    const snaps = this.snaps();
    if (snaps.length === 0) {
      return 0;
    }
    const chain: number[] = [];
    if (this.wraps()) {
      const count = this.slideCount();
      const low = Math.floor(Math.min(projected, start) / count) - 1;
      const high = Math.floor(Math.max(projected, start) / count) + 1;
      for (let copy = low; copy <= high; copy++) {
        for (const stop of snaps) {
          chain.push(stop + copy * count);
        }
      }
      chain.sort((a, b) => a - b);
    } else {
      chain.push(...snaps);
    }
    let origin = 0;
    for (let i = 1; i < chain.length; i++) {
      if (Math.abs(chain[i] - start) < Math.abs(chain[origin] - start)) {
        origin = i;
      }
    }
    const reach = this.skipSnaps() ? Infinity : 1;
    let best = origin;
    for (let i = 0; i < chain.length; i++) {
      if (
        Math.abs(i - origin) <= reach &&
        Math.abs(chain[i] - projected) < Math.abs(chain[best] - projected)
      ) {
        best = i;
      }
    }
    return chain[best];
  }

  /** The position a drag of `distance` px has reached, with resistance past the ends. */
  private positionFor(drag: DragState, distance: number): number {
    const raw =
      drag.startPosition -
      (this.axisSign(this.isVertical()) * distance) / this.stepSize();
    if (this.wraps()) {
      return raw;
    }
    const snaps = this.snaps();
    const min = snaps[0] ?? 0;
    const max = snaps[snaps.length - 1] ?? 0;
    if (raw < min) {
      return min - (min - raw) * EDGE_RESISTANCE;
    }
    return raw > max ? max + (raw - max) * EDGE_RESISTANCE : raw;
  }

  protected onDragStart(event: DragEvent): void {
    event.preventDefault();
  }

  private setUpEnvironmentListeners(): void {
    const destroyRef = inject(DestroyRef);
    const view = this.document.defaultView;

    if (typeof view?.matchMedia === 'function') {
      const query = view.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedSystem.set(query.matches);
      const onChange = (event: MediaQueryListEvent) =>
        this.reducedSystem.set(event.matches);
      query.addEventListener?.('change', onChange);
      destroyRef.onDestroy(() =>
        query.removeEventListener?.('change', onChange),
      );
    }

    this.pageHidden.set(this.document.visibilityState === 'hidden');
    const onVisibility = () =>
      this.pageHidden.set(this.document.visibilityState === 'hidden');
    this.document.addEventListener('visibilitychange', onVisibility);

    this.host.addEventListener('click', this.swallowClick, true);
    this.host.addEventListener('wheel', this.onWheelEvent, { passive: false });
    destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.host.removeEventListener('click', this.swallowClick, true);
      this.host.removeEventListener('wheel', this.onWheelEvent);
      if (this.settleTimer !== null) {
        clearTimeout(this.settleTimer);
      }
    });
  }
}
