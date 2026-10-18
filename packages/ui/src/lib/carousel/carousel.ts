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

import { ANDES_CAROUSEL, type AndesCarouselContext } from './carousel-context';
import { AndesCarouselSlide } from './carousel-slide';
import {
  resolveCarouselLabels,
  type AndesCarouselArrows,
  type AndesCarouselChange,
  type AndesCarouselDotContext,
  type AndesCarouselDotPosition,
  type AndesCarouselEffect,
  type AndesCarouselLabels,
} from './carousel-types';

/** Movement along the axis before a press becomes a drag. */
const DRAG_THRESHOLD = 6;
/** Pointer samples older than this are ignored when measuring release velocity. */
const VELOCITY_WINDOW_MS = 100;
/** How far a release velocity carries the slides on, in ms of travel. */
const INERTIA_MS = 220;
/** Fraction of the pull that shows past the first / last slide when not looping. */
const EDGE_RESISTANCE = 0.35;

interface DragState {
  readonly id: number;
  readonly startX: number;
  readonly startY: number;
  readonly startPosition: number;
  readonly samples: { t: number; v: number }[];
  captured: boolean;
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

/**
 * A set of slides shown one (or several) at a time, with optional autoplay, dots, arrows,
 * drag and swipe, keyboard and looping. Follows the carousel pattern for assistive tech: a
 * labelled region, slides announced as "slide, n of m", a pause control while it plays and
 * a live region that stays quiet while it rotates.
 *
 * ```html
 * <andes-carousel autoplay arrows="hover" aria-label="Featured products" [(active)]="index">
 *   <andes-carousel-slide>One</andes-carousel-slide>
 *   <andes-carousel-slide>Two</andes-carousel-slide>
 * </andes-carousel>
 * ```
 *
 * Looping (`infinite`) with `effect="scroll"` needs at least `slidesPerView + 2` slides to
 * be seamless; with fewer, `next()` / `prev()` rewind across the carousel instead.
 * A vertical carousel needs a height (on the host or its parent).
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
    '[attr.data-playing]': 'rotating() ? "" : null',
    '[attr.data-arrows]': 'arrowMode()',
    '[style.--andes-carousel-position]': 'displayPosition()',
    '[style.--andes-carousel-count]': 'count()',
    '[style.--andes-carousel-per-view]': 'perView()',
    '[style.--andes-carousel-window-start]': 'windowStart()',
    '[style.--andes-carousel-gap]': 'cssGap()',
    '[style.--andes-carousel-speed]': 'cssSpeed()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focusin)': 'onFocusIn()',
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

  /** How slides change. */
  readonly effect = input<AndesCarouselEffect>('scroll');
  /** Advance on a timer. */
  readonly autoplay = input(false, { transform: booleanAttribute });
  /** Delay between automatic changes, in ms. */
  readonly autoplaySpeed = input(3000, { transform: numberAttribute });
  /** Hold autoplay while the pointer is over the carousel. */
  readonly pauseOnHover = input(true, { transform: booleanAttribute });
  /** Hold autoplay while focus is inside the carousel. */
  readonly pauseOnFocus = input(true, { transform: booleanAttribute });
  /** The first interaction (drag, arrows, dots, keys) stops autoplay for good. */
  readonly stopOnInteraction = input(false, { transform: booleanAttribute });
  /** Show the dots. */
  readonly dots = input(true, { transform: booleanAttribute });
  /** Where the dots sit; default `bottom` (`end` when vertical). */
  readonly dotPosition = input<AndesCarouselDotPosition | null>(null);
  /** Content of each dot button, in place of the default round marker. */
  readonly dotTemplate = input<TemplateRef<AndesCarouselDotContext> | null>(
    null,
  );
  /** Fill the active dot over `autoplaySpeed` to show when the next change comes. */
  readonly dotProgress = input(false, { transform: booleanAttribute });
  /** Previous / next buttons: `true`, `'always'` or `'hover'`. */
  readonly arrows = input<AndesCarouselArrows>(false);
  /** Wrap past the ends. */
  readonly infinite = input(true, { transform: booleanAttribute });
  /** Slide along the vertical axis (scroll effect only). */
  readonly vertical = input(false, { transform: booleanAttribute });
  /** How many slides show at once; may be fractional to peek at the next one. */
  readonly slidesPerView = input(1, { transform: numberAttribute });
  /** Space between slides: px number or any CSS length. */
  readonly gap = input<number | string>(0);
  /** Length of a change, in ms. */
  readonly speed = input(400, { transform: numberAttribute });
  /** Change slides by dragging or swiping. */
  readonly draggable = input(true, { transform: booleanAttribute });
  /** Arrow keys, Home and End change slides while focus is inside. */
  readonly keyboard = input(true, { transform: booleanAttribute });
  /** Slides kept rendered on each side of the visible ones (see `andesCarouselLazy`). */
  readonly preload = input(1, { transform: numberAttribute });
  /** Accessible name of the region. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, {
    alias: 'aria-labelledby',
  });
  /** Localised strings; unset fields keep their English default. */
  readonly labels = input<AndesCarouselLabels | null>(null);

  /** Index of the first visible slide (`[(active)]`). */
  readonly active = model(0);

  /** A change is about to happen; reports the indexes involved. */
  readonly beforeChange = output<AndesCarouselChange>();
  /** The carousel settled on a slide. */
  readonly afterChange = output<number>();

  private readonly slides = contentChildren(AndesCarouselSlide);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  readonly count = computed(() => this.slides().length);
  readonly isVertical = computed(
    () => this.vertical() && this.effect() === 'scroll',
  );
  readonly resolvedLabels = computed(() =>
    resolveCarouselLabels(this.labels()),
  );
  readonly visibleCount = computed(() => Math.ceil(this.perView()));

  /** Slides on screen at once, never more than there are slides. */
  protected readonly perView = computed(() => {
    if (this.effect() === 'fade') {
      return 1;
    }
    const wanted = Number(this.slidesPerView());
    const view = Number.isFinite(wanted) && wanted >= 1 ? wanted : 1;
    return Math.max(1, Math.min(view, Math.max(1, this.count())));
  });

  /** Whether the loop is seamless: fade always can, scroll needs spare slides. */
  readonly wraps = computed(() => {
    if (!this.infinite() || this.count() < 2) {
      return false;
    }
    return this.effect() === 'fade' || this.count() >= this.visibleCount() + 2;
  });

  /** `infinite` without room to loop seamlessly: next / previous rewind instead. */
  private readonly rewinds = computed(
    () => this.infinite() && !this.wraps() && this.maxIndex() > 0,
  );

  /** Highest first-visible index when not looping. */
  protected readonly maxIndex = computed(() =>
    this.effect() === 'fade'
      ? Math.max(0, this.count() - 1)
      : Math.max(0, Math.ceil(this.count() - this.perView())),
  );

  /** Furthest position (may be fractional) when not looping. */
  private readonly maxPosition = computed(() =>
    Math.max(0, this.count() - this.perView()),
  );

  protected readonly windowStart = computed(
    () =>
      -1 - Math.floor(Math.max(0, this.count() - this.visibleCount() - 2) / 2),
  );
  protected readonly cssGap = computed(() =>
    this.effect() === 'fade' ? '0px' : toCssLength(this.gap()),
  );

  private readonly reducedMotion = signal(false);
  protected readonly instant = signal(false);
  protected readonly dragging = signal(false);
  private readonly dragPosition = signal(0);

  /** Where the slides are (or are headed): unbounded when looping. */
  private readonly position = signal(0);
  protected readonly displayPosition = computed(() =>
    this.dragging() ? this.dragPosition() : this.position(),
  );

  protected readonly cssSpeed = computed(() =>
    this.instant() || this.dragging() || this.reducedMotion()
      ? '0ms'
      : `${Math.max(0, Number(this.speed()) || 0)}ms`,
  );

  /** Index of the first visible slide. */
  readonly index = computed(() => this.normalise(Math.round(this.position())));

  protected readonly regionLabel = computed(
    () =>
      this.ariaLabel() ??
      (this.ariaLabelledby() ? null : this.resolvedLabels().carousel),
  );

  protected readonly arrowMode = computed<'always' | 'hover' | null>(() => {
    if (this.count() < 2) {
      return null;
    }
    const arrows = this.arrows();
    if (arrows === true || arrows === 'always') {
      return 'always';
    }
    return arrows === 'hover' ? 'hover' : null;
  });

  protected readonly dotPlacement = computed(() =>
    this.dots() && this.count() > 1
      ? (this.dotPosition() ?? (this.isVertical() ? 'end' : 'bottom'))
      : null,
  );

  protected readonly dotItems = computed<readonly AndesCarouselDotContext[]>(
    () => {
      const total = this.wraps() ? this.count() : this.maxIndex() + 1;
      const current = this.index();
      const count = this.count();
      return Array.from({ length: total }, (_, index) => ({
        $implicit: index,
        index,
        active: index === current,
        count,
        goTo: () => this.userGoTo(index),
      }));
    },
  );

  // Autoplay state. The timer only runs while `rotating()`.
  private readonly hovered = signal(false);
  private readonly focusInside = signal(false);
  private readonly pageHidden = signal(false);
  private readonly userPaused = signal(false);
  private readonly stopped = signal(false);

  /** Autoplay is on and has not been paused by the user or stopped by interaction. */
  readonly playing = computed(
    () =>
      this.autoplay() &&
      this.count() > 1 &&
      !this.userPaused() &&
      !this.stopped(),
  );

  /** Autoplay is actually advancing right now (not held by hover, focus, a drag or a hidden page). */
  protected readonly rotating = computed(
    () =>
      this.playing() &&
      !(this.pauseOnHover() && this.hovered()) &&
      !(this.pauseOnFocus() && this.focusInside()) &&
      !this.pageHidden() &&
      !this.dragging(),
  );

  protected readonly liveMode = computed(() =>
    this.rotating() ? 'off' : 'polite',
  );
  protected readonly progressDuration = computed(
    () => `${this.autoplaySpeed()}ms`,
  );

  private drag: DragState | null = null;
  private suppressClick = false;
  private afterChangeTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFocusWasInSlide = false;

  constructor() {
    this.setUpEnvironmentListeners();

    // The model drives the carousel from outside; our own moves write it back below.
    effect(() => {
      const wanted = this.active();
      const count = this.count();
      untracked(() => {
        if (count === 0) {
          return;
        }
        const clamped = this.clampIndex(Math.trunc(Number(wanted)) || 0);
        if (clamped !== this.index()) {
          this.moveTo(clamped, true);
        } else if (clamped !== wanted) {
          this.active.set(clamped);
        }
      });
    });

    // Slides added or removed (or loop / per-view changes) can strand the position.
    effect(() => {
      const count = this.count();
      const maxPosition = this.maxPosition();
      const wraps = this.wraps();
      untracked(() => {
        const position = this.position();
        const next = wraps
          ? this.normalise(Math.round(position)) +
            (position - Math.round(position))
          : Math.min(Math.max(position, 0), maxPosition);
        if (count > 0 && next !== position) {
          this.position.set(next);
          this.active.set(this.index());
        }
      });
    });

    effect((onCleanup) => {
      if (!this.rotating()) {
        return;
      }
      this.position();
      const delay = Math.max(0, Number(this.autoplaySpeed()) || 0);
      const id = setTimeout(() => this.advanceAutomatically(), delay);
      onCleanup(() => clearTimeout(id));
    });
  }

  /** Wraps (or clamps) a position into a valid index. */
  private normalise(position: number): number {
    const count = this.count();
    if (count === 0) {
      return 0;
    }
    return this.wraps()
      ? ((position % count) + count) % count
      : Math.min(Math.max(position, 0), this.maxIndex());
  }

  private clampIndex(index: number): number {
    return Math.min(Math.max(index, 0), this.lastIndex());
  }

  /** The highest index a slide change can reach. */
  private lastIndex(): number {
    return this.wraps() ? Math.max(0, this.count() - 1) : this.maxIndex();
  }

  indexOf(slide: object): number {
    return this.slides().indexOf(slide as AndesCarouselSlide);
  }

  /** Shows the next slide (rewinding to the first at the end of a rewinding carousel). */
  next(): void {
    this.step(1);
  }

  /** Shows the previous slide. */
  prev(): void {
    this.step(-1);
  }

  /**
   * Shows the slide at `index`. With `animate` false the change is instant. When looping,
   * the shorter way round is taken.
   */
  goTo(index: number, animate = true): void {
    this.moveTo(this.clampIndex(Math.trunc(index) || 0), animate);
  }

  /** Starts autoplay again after a pause or an interaction stop. */
  play(): void {
    this.userPaused.set(false);
    this.stopped.set(false);
  }

  /** Pauses autoplay until `play()`. */
  pause(): void {
    this.userPaused.set(true);
  }

  protected togglePlay(): void {
    if (this.playing()) {
      this.pause();
    } else {
      this.play();
    }
  }

  protected userNext(): void {
    this.step(1, true);
  }

  protected userPrev(): void {
    this.step(-1, true);
  }

  protected userGoTo(index: number): void {
    this.interacted();
    this.moveTo(this.clampIndex(index), true);
  }

  protected canPrev(): boolean {
    return this.wraps() || this.rewinds() || this.index() > 0;
  }

  protected canNext(): boolean {
    return this.wraps() || this.rewinds() || this.index() < this.maxIndex();
  }

  private step(direction: 1 | -1, byUser = false): void {
    if (this.count() < 2) {
      return;
    }
    if (byUser) {
      this.interacted();
    }
    if (this.wraps()) {
      this.commit(this.position() + direction, true);
      return;
    }
    const target = this.index() + direction;
    if (target >= 0 && target <= this.maxIndex()) {
      this.moveTo(target, true);
    } else if (this.rewinds()) {
      this.moveTo(direction > 0 ? 0 : this.maxIndex(), true);
    }
  }

  /** Moves to a first-visible index by the shortest route. */
  private moveTo(index: number, animate: boolean): void {
    const current = this.index();
    if (index === current) {
      return;
    }
    if (this.wraps()) {
      const count = this.count();
      let delta = index - current;
      if (delta > count / 2) {
        delta -= count;
      } else if (delta < -count / 2) {
        delta += count;
      }
      this.commit(this.position() + delta, animate);
    } else {
      this.commit(Math.min(index, this.maxPosition()), animate);
    }
  }

  /** Applies a new target position and reports the change. */
  private commit(position: number, animate: boolean): void {
    if (position === this.position()) {
      return;
    }
    const from = this.index();
    const to = this.normalise(Math.round(position));
    if (to !== from) {
      this.beforeChange.emit({ from, to });
    }
    this.lastFocusWasInSlide = this.focusIsInSlide();
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
    this.position.set(position);
    this.active.set(to);
    if (to !== from) {
      this.scheduleAfterChange(to, animate);
      this.keepFocusInside();
    }
  }

  private scheduleAfterChange(index: number, animate: boolean): void {
    if (this.afterChangeTimer !== null) {
      clearTimeout(this.afterChangeTimer);
      this.afterChangeTimer = null;
    }
    const duration =
      animate && !this.reducedMotion() ? Number(this.speed()) || 0 : 0;
    if (duration <= 0) {
      this.afterChange.emit(index);
      return;
    }
    this.afterChangeTimer = setTimeout(() => {
      this.afterChangeTimer = null;
      this.afterChange.emit(index);
    }, duration);
  }

  private advanceAutomatically(): void {
    if (this.wraps() || this.index() < this.maxIndex()) {
      this.step(1);
    } else if (this.rewinds()) {
      this.moveTo(0, true);
    }
  }

  /** A deliberate user action: with `stopOnInteraction`, autoplay ends here. */
  private interacted(): void {
    if (this.stopOnInteraction() && this.autoplay()) {
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

  // --- Pointer, focus and keyboard ----------------------------------------------------

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.hovered.set(true);
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.hovered.set(false);
    }
  }

  protected onFocusIn(): void {
    this.focusInside.set(true);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.contains(next)) {
      this.focusInside.set(false);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (
      !this.keyboard() ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isEditable(event.target) ||
      this.count() < 2
    ) {
      return;
    }
    const rtl = this.isRtl();
    let direction: 1 | -1 | null = null;
    let target: number | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        direction = this.isVertical() ? null : rtl ? 1 : -1;
        break;
      case 'ArrowRight':
        direction = this.isVertical() ? null : rtl ? -1 : 1;
        break;
      case 'ArrowUp':
        direction = this.isVertical() ? -1 : null;
        break;
      case 'ArrowDown':
        direction = this.isVertical() ? 1 : null;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = this.lastIndex();
        break;
      default:
        return;
    }
    if (direction === null && target === null) {
      return;
    }
    event.preventDefault();
    if (direction !== null) {
      this.step(direction, true);
    } else if (target !== null) {
      this.userGoTo(target);
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (
      !this.draggable() ||
      this.count() < 2 ||
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
        Math.abs(along) < DRAG_THRESHOLD ||
        Math.abs(along) < Math.abs(across)
      ) {
        return;
      }
      drag.captured = true;
      this.interacted();
      this.dragPosition.set(drag.startPosition);
      this.dragging.set(true);
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
    const step = this.stepSize();
    const sign = this.axisSign(vertical);
    const projected =
      this.dragPosition() - (sign * velocity * INERTIA_MS) / step;
    const limit = Math.max(1, this.visibleCount());
    let target = Math.round(projected);
    target = Math.min(
      Math.max(target, drag.startPosition - limit),
      drag.startPosition + limit,
    );
    if (!this.wraps()) {
      target = Math.min(Math.max(target, 0), this.maxIndex());
    }
    const resolved = this.wraps()
      ? target
      : Math.min(target, this.maxPosition());
    this.dragging.set(false);
    this.commit(resolved, true);
  }

  /** Capture-phase: a drag must not end in a click on whatever the pointer was released over. */
  private readonly swallowClick = (event: Event): void => {
    if (this.suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressClick = false;
    }
  };

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

  private stepSize(): number {
    const viewport = this.viewport()?.nativeElement;
    const size = viewport
      ? this.isVertical()
        ? viewport.clientHeight
        : viewport.clientWidth
      : 0;
    const gap = Number.parseFloat(this.cssGap()) || 0;
    return Math.max(1, (size + gap) / this.perView());
  }

  /** The position a drag of `distance` px has reached, with resistance past the ends. */
  private positionFor(drag: DragState, distance: number): number {
    const raw =
      drag.startPosition -
      (this.axisSign(this.isVertical()) * distance) / this.stepSize();
    if (this.wraps()) {
      return raw;
    }
    const max = this.maxPosition();
    if (raw < 0) {
      return raw * EDGE_RESISTANCE;
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
      this.reducedMotion.set(query.matches);
      const onChange = (event: MediaQueryListEvent) =>
        this.reducedMotion.set(event.matches);
      query.addEventListener?.('change', onChange);
      destroyRef.onDestroy(() =>
        query.removeEventListener?.('change', onChange),
      );
    }

    this.pageHidden.set(this.document.visibilityState === 'hidden');
    const onVisibility = () =>
      this.pageHidden.set(this.document.visibilityState === 'hidden');
    this.document.addEventListener('visibilitychange', onVisibility);
    destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', onVisibility),
    );

    this.host.addEventListener('click', this.swallowClick, true);
    destroyRef.onDestroy(() => {
      this.host.removeEventListener('click', this.swallowClick, true);
      if (this.afterChangeTimer !== null) {
        clearTimeout(this.afterChangeTimer);
      }
    });
  }
}
