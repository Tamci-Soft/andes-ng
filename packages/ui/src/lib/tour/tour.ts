import {
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import { Directionality } from '@angular/cdk/bidi';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  output,
  signal,
  TemplateRef,
  untracked,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';

import {
  computeTourLayout,
  expandRect,
  type AndesTourRect,
  type AndesTourSize,
} from './tour-geometry';
import {
  resolveTourLabels,
  type AndesTourButtonProps,
  type AndesTourCloseEvent,
  type AndesTourCloseReason,
  type AndesTourGap,
  type AndesTourIndicators,
  type AndesTourIndicatorsContext,
  type AndesTourLabels,
  type AndesTourMask,
  type AndesTourPlacement,
  type AndesTourStep,
  type AndesTourStepContext,
  type AndesTourTarget,
  type AndesTourType,
} from './tour-types';

const PANE_CLASS = 'andes-tour-pane';
/** Card size assumed until it has been measured. */
const DEFAULT_CARD: AndesTourSize = { width: 320, height: 160 };
/** A target closer to the viewport edge than this is scrolled into view. */
const VISIBLE_MARGIN = 16;

let nextId = 0;

function toElement(
  target: AndesTourTarget | undefined,
  document: Document,
): Element | null {
  if (target === null || target === undefined) {
    return null;
  }
  if (typeof target === 'string') {
    try {
      return document.querySelector(target);
    } catch {
      return null;
    }
  }
  if (typeof target === 'function') {
    return target() ?? null;
  }
  if (target instanceof ElementRef) {
    return target.nativeElement;
  }
  return target;
}

function sameRect(a: AndesTourRect | null, b: AndesTourRect | null): boolean {
  return (
    a === b ||
    (!!a &&
      !!b &&
      a.left === b.left &&
      a.top === b.top &&
      a.width === b.width &&
      a.height === b.height)
  );
}

/**
 * A guided walkthrough: a card per step, pointing at an element of the page that is
 * spotlighted by dimming everything else.
 *
 * ```html
 * <andes-tour [(open)]="open" [(current)]="step" [steps]="steps" />
 * ```
 *
 * ```ts
 * steps = [
 *   { target: '#search', title: 'Search', description: 'Find anything here.' },
 *   { title: 'That is it', description: 'A step with no target is centred.' },
 * ];
 * ```
 *
 * The card is a dialog on the shared overlay: focus moves into it and returns when the tour
 * closes, Tab stays inside it, Escape closes it, and it leaves with the same short exit as
 * every other overlay. The spotlight follows the target through scrolling, resizing and
 * layout changes, and the page is scrolled to bring the target into view.
 *
 * Arrow keys step through when `keyboard` is on. The page stays interactive around the card
 * only where there is no mask; with a mask the dimmed area swallows clicks, and
 * `targetClickable` lets them through to the spotlighted element alone.
 */
@Component({
  selector: 'andes-tour',
  imports: [AndesOverlayContentPrimitive, NgTemplateOutlet],
  templateUrl: './tour.html',
  styleUrl: './tour.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideAndesOverlay()],
  host: {
    class: 'andes-tour-host',
    '[attr.data-slot]': '"tour-host"',
    '[attr.data-state]': 'overlay.isOpen() ? "open" : "closed"',
  },
})
export class AndesTour {
  protected readonly overlay = inject(AndesOverlayPrimitive);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly directionality = inject(Directionality);

  /** The stops, in order. */
  readonly steps = input<readonly AndesTourStep[]>([]);
  /** Whether the tour is showing (`[(open)]`). */
  readonly open = model(false);
  /** 0-based index of the current step (`[(current)]`). */
  readonly current = model(0);
  /** The dimming around the target: `false` for none, or `{ color }`. A step can override it. */
  readonly mask = input<AndesTourMask>(true);
  /** Card colouring; a step can override it. */
  readonly type = input<AndesTourType>('default');
  /** Spotlight offset and radius; a step can override it. */
  readonly gap = input<AndesTourGap>({ offset: 6, radius: 6 });
  /** Default card placement; a step can override it. */
  readonly placement = input<AndesTourPlacement>('bottom');
  /** Point the card at the target with an arrow. */
  readonly arrow = input(true, { transform: booleanAttribute });
  /** Let clicks reach the spotlighted element. A step can override it. */
  readonly targetClickable = input(false, { transform: booleanAttribute });
  /** A click on the dimmed area closes the tour. */
  readonly closeOnMaskClick = input(false, { transform: booleanAttribute });
  /** Escape closes the tour. */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  /** The arrow keys step through the tour. */
  readonly keyboard = input(true, { transform: booleanAttribute });
  /** Show the Skip button on every step but the last. */
  readonly showSkip = input(true, { transform: booleanAttribute });
  /** Show the close button in the card's corner. */
  readonly showClose = input(true, { transform: booleanAttribute });
  /** How progress shows: `dots`, a "2 / 5" `count`, or `none`. */
  readonly indicators = input<AndesTourIndicators>('dots');
  /** Replaces the built-in indicators. */
  readonly indicatorsTemplate =
    input<TemplateRef<AndesTourIndicatorsContext> | null>(null);
  /** Scroll the target into view: `false` to leave the page alone, or custom options. */
  readonly scrollIntoView = input<boolean | ScrollIntoViewOptions>(true);
  /** Localised strings; unset fields keep their English default. */
  readonly labels = input<AndesTourLabels | null>(null);

  /** The current step changed (by the buttons, the keys, `current` or the methods). */
  readonly stepChange = output<number>();
  /** The tour closed; says why and on which step. */
  readonly closed = output<AndesTourCloseEvent>();
  /** The last step's Finish button was used. Emitted just before `close`. */
  readonly finish = output<void>();

  protected readonly text = computed(() => resolveTourLabels(this.labels()));
  protected readonly total = computed(() => this.steps().length);
  protected readonly index = computed(() =>
    Math.min(
      Math.max(Math.trunc(Number(this.current())) || 0, 0),
      Math.max(0, this.total() - 1),
    ),
  );
  protected readonly step = computed(() => this.steps()[this.index()] ?? null);
  protected readonly isFirst = computed(() => this.index() === 0);
  protected readonly isLast = computed(() => this.index() >= this.total() - 1);

  // --- Per-step settings: the step wins over the tour ----------------------------------
  protected readonly maskSetting = computed(() => {
    const setting = this.step()?.mask ?? this.mask();
    return {
      on: setting !== false,
      color: typeof setting === 'object' ? (setting.color ?? null) : null,
    };
  });
  protected readonly cardType = computed(
    () => this.step()?.type ?? this.type(),
  );
  protected readonly cardPlacement = computed(
    () => this.step()?.placement ?? this.placement(),
  );
  protected readonly cardArrow = computed(
    () => this.step()?.arrow ?? this.arrow(),
  );
  protected readonly clickable = computed(
    () => this.step()?.targetClickable ?? this.targetClickable(),
  );
  protected readonly radius = computed(
    () => this.step()?.gap?.radius ?? this.gap().radius ?? 6,
  );

  // --- Geometry ---------------------------------------------------------------------------
  private readonly targetRect = signal<AndesTourRect | null>(null, {
    equal: sameRect,
  });
  private readonly viewport = signal<AndesTourSize>({
    width: 1024,
    height: 768,
  });
  private readonly cardSize = signal<AndesTourSize>(DEFAULT_CARD);

  /** The spotlight box, or `null` while the step has no (visible) target. */
  protected readonly spot = computed(() => {
    const rect = this.targetRect();
    if (!rect) {
      return null;
    }
    const gap = this.step()?.gap ?? this.gap();
    return expandRect(rect, { offset: gap.offset ?? this.gap().offset });
  });

  /** What the mask draws: the spotlight, or a point in the middle that dims everything. */
  protected readonly maskBox = computed<AndesTourRect>(() => {
    const spot = this.spot();
    if (spot) {
      return spot;
    }
    const { width, height } = this.viewport();
    return { left: width / 2, top: height / 2, width: 0, height: 0 };
  });

  /** The four regions around the spotlight that swallow clicks on the dimmed area. */
  protected readonly strips = computed(() => {
    const box = this.maskBox();
    const { width, height } = this.viewport();
    const right = box.left + box.width;
    const bottom = box.top + box.height;
    return [
      { left: 0, top: 0, width, height: box.top },
      { left: 0, top: bottom, width, height: height - bottom },
      { left: 0, top: box.top, width: box.left, height: box.height },
      { left: right, top: box.top, width: width - right, height: box.height },
    ];
  });

  protected readonly layout = computed(() =>
    computeTourLayout({
      spot: this.spot(),
      card: this.cardSize(),
      viewport: this.viewport(),
      placement: this.cardPlacement(),
      arrow: this.cardArrow(),
    }),
  );

  /** Transitions are off until the first layout, so the card does not fly in from a corner. */
  protected readonly ready = signal(false);

  // --- Content -----------------------------------------------------------------------------
  protected readonly titleId = `andes-tour-title-${nextId}`;
  protected readonly descriptionId = `andes-tour-description-${nextId++}`;
  protected readonly titleText = computed(() =>
    this.asText(this.step()?.title),
  );
  protected readonly titleTemplate = computed(() =>
    this.asTemplate(this.step()?.title),
  );
  protected readonly descriptionText = computed(() =>
    this.asText(this.step()?.description),
  );
  protected readonly descriptionTemplate = computed(() =>
    this.asTemplate(this.step()?.description),
  );
  protected readonly coverUrl = computed(() => this.asText(this.step()?.cover));
  protected readonly coverTemplate = computed(() =>
    this.asTemplate(this.step()?.cover),
  );
  protected readonly hasTitle = computed(
    () => !!this.titleText() || !!this.titleTemplate(),
  );
  protected readonly hasDescription = computed(
    () => !!this.descriptionText() || !!this.descriptionTemplate(),
  );
  protected readonly stepContext = computed<AndesTourStepContext | null>(() => {
    const step = this.step();
    return step
      ? {
          $implicit: step,
          step,
          index: this.index(),
          total: this.total(),
          next: () => this.next(),
          previous: () => this.previous(),
          close: () => this.close(),
        }
      : null;
  });
  protected readonly indicatorsContext = computed<AndesTourIndicatorsContext>(
    () => ({
      $implicit: this.index() + 1,
      current: this.index() + 1,
      total: this.total(),
    }),
  );
  protected readonly dots = computed(() =>
    Array.from({ length: this.total() }, (_, i) => i),
  );
  protected readonly announcement = computed(() => {
    const step = this.text().step(this.index() + 1, this.total());
    const title = this.titleText();
    return title ? `${step}: ${title}` : step;
  });
  protected readonly dialogLabel = computed(() =>
    this.hasTitle() ? null : this.text().dialog,
  );

  protected readonly previousButton = computed(() =>
    this.buttonState(
      this.step()?.prevButton,
      this.text().previous,
      this.isFirst(),
    ),
  );
  protected readonly nextButton = computed(() =>
    this.buttonState(
      this.step()?.nextButton,
      this.isLast() ? this.text().finish : this.text().next,
      false,
    ),
  );
  protected readonly skipVisible = computed(
    () => this.showSkip() && !this.isLast(),
  );

  private readonly surface = viewChild<TemplateRef<unknown>>('surface');
  private readonly popup = viewChild<ElementRef<HTMLElement>>('popup');

  private pendingReason: AndesTourCloseReason | null = null;
  private lastIndex = 0;
  private frame: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private tracking = false;
  private targetElement: Element | null = null;
  private readonly onViewportChange = () => this.scheduleMeasure();

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('dialog'),
      layer: 'popover',
      hasBackdrop: false,
      lockScroll: false,
      inertBackground: false,
      closeOnOutsideClick: false,
      panelClass: PANE_CLASS,
      size: { width: '100%', height: '100%' },
    });

    effect(() => {
      this.overlay.configure({
        closeOnEscape: this.closeOnEscape(),
        ariaModal: !this.clickable(),
      });
    });

    effect(() => {
      const wantsOpen = this.open();
      const template = this.surface();
      const total = this.total();
      untracked(() => {
        if (!wantsOpen) {
          this.overlay.close();
          return;
        }
        if (!template) {
          return;
        }
        if (total === 0) {
          this.open.set(false);
          return;
        }
        this.lastIndex = this.index();
        this.ready.set(false);
        this.overlay.open(template);
      });
    });

    // The step (or the target it points at) changed: bring the target into view, then
    // measure. Reads the step so any change to it re-runs this.
    effect(() => {
      const open = this.overlay.isOpen();
      const step = this.step();
      const index = this.index();
      untracked(() => {
        if (!open || !step) {
          return;
        }
        if (index !== this.lastIndex) {
          this.lastIndex = index;
          this.stepChange.emit(index);
        }
        this.activate(step);
      });
    });

    this.overlay.keydownEvents.subscribe((event) => this.onKeydown(event));
    this.overlay.opened.subscribe(() => this.startTracking());
    this.overlay.closed.subscribe((overlayReason) => {
      this.stopTracking();
      const reason =
        this.pendingReason ??
        (overlayReason === 'escape-key' ? 'escape-key' : 'imperative');
      this.pendingReason = null;
      const current = this.index();
      this.open.set(false);
      this.closed.emit({ reason, current });
    });

    inject(DestroyRef).onDestroy(() => this.stopTracking());
  }

  /** Starts the tour at `index`. */
  start(index = 0): void {
    this.current.set(index);
    this.open.set(true);
  }

  /** Goes to the next step; does nothing on the last one (use `complete()`). */
  next(): void {
    this.goTo(this.index() + 1);
  }

  /** Goes to the previous step. */
  previous(): void {
    this.goTo(this.index() - 1);
  }

  /** Goes to the step at `index`. */
  goTo(index: number): void {
    if (index < 0 || index >= this.total()) {
      return;
    }
    this.current.set(index);
  }

  /** Ends the tour as finished: emits `finish`, then `close`. */
  complete(): void {
    if (!this.overlay.isOpen()) {
      return;
    }
    this.finish.emit();
    this.end('finish');
  }

  /** Closes the tour. */
  close(reason: AndesTourCloseReason = 'imperative'): void {
    this.end(reason);
  }

  /** Re-measures the target and the card now; call it after changing the layout yourself. */
  updatePosition(): void {
    this.measure();
  }

  private end(reason: AndesTourCloseReason): void {
    if (!this.overlay.isOpen()) {
      return;
    }
    this.pendingReason = reason;
    this.overlay.close('imperative');
  }

  // --- Buttons -----------------------------------------------------------------------------

  protected onPrevious(): void {
    const props = this.step()?.prevButton;
    if (this.runHandler(props)) {
      this.previous();
    }
  }

  protected onNext(): void {
    const props = this.step()?.nextButton;
    if (!this.runHandler(props)) {
      return;
    }
    if (this.isLast()) {
      this.complete();
    } else {
      this.next();
    }
  }

  protected onSkip(): void {
    this.end('skip');
  }

  protected onClose(): void {
    this.end('close-button');
  }

  protected onMaskClick(): void {
    if (this.closeOnMaskClick()) {
      this.end('mask-click');
    }
  }

  private runHandler(props: AndesTourButtonProps | undefined): boolean {
    const context = this.stepContext();
    if (!props?.onClick || !context) {
      return true;
    }
    return props.onClick(context) !== false;
  }

  private buttonState(
    props: AndesTourButtonProps | undefined,
    fallbackLabel: string,
    hiddenByDefault: boolean,
  ) {
    return {
      label: props?.label ?? fallbackLabel,
      hidden: props?.hidden ?? hiddenByDefault,
      disabled: props?.disabled ?? false,
    };
  }

  private asText(value: unknown): string | null {
    return typeof value === 'string' && value ? value : null;
  }

  private asTemplate<C>(value: unknown): TemplateRef<C> | null {
    return value instanceof TemplateRef ? (value as TemplateRef<C>) : null;
  }

  private onKeydown(event: KeyboardEvent): void {
    if (
      !this.keyboard() ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
    ) {
      return;
    }
    const rtl = this.isRtl();
    const forward = (event.key === 'ArrowRight') !== rtl;
    event.preventDefault();
    if (forward) {
      this.next();
    } else {
      this.previous();
    }
  }

  private isRtl(): boolean {
    const dir = this.popup()
      ?.nativeElement.closest('[dir]')
      ?.getAttribute('dir');
    return (
      dir === 'rtl' || (dir !== 'ltr' && this.directionality.value === 'rtl')
    );
  }

  // --- Tracking the target -----------------------------------------------------------------

  private startTracking(): void {
    const view = this.document.defaultView;
    if (!view || this.tracking) {
      return;
    }
    this.tracking = true;
    view.addEventListener('resize', this.onViewportChange);
    // Capture: scrolling any ancestor of the target moves it, not only the window.
    view.addEventListener('scroll', this.onViewportChange, {
      capture: true,
      passive: true,
    });
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
    }
    this.observe();
  }

  private stopTracking(): void {
    if (!this.tracking) {
      return;
    }
    this.tracking = false;
    const view = this.document.defaultView;
    view?.removeEventListener('resize', this.onViewportChange);
    view?.removeEventListener('scroll', this.onViewportChange, {
      capture: true,
    });
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.frame !== null) {
      view?.cancelAnimationFrame?.(this.frame);
      this.frame = null;
    }
    this.targetElement = null;
    this.targetRect.set(null);
  }

  /** Watches the card and the current target for size changes. */
  private observe(): void {
    const observer = this.resizeObserver;
    if (!observer) {
      return;
    }
    observer.disconnect();
    const popup = this.popup()?.nativeElement;
    if (popup) {
      observer.observe(popup);
    }
    if (this.targetElement) {
      observer.observe(this.targetElement);
    }
  }

  /** A new step: find its target, scroll it into view, measure. */
  private activate(step: AndesTourStep): void {
    this.targetElement = toElement(step.target, this.document);
    const element = this.targetElement;
    if (element && this.isUsable(element)) {
      this.scrollToTarget(element, step);
    }
    this.measure();
    this.observe();
    this.restoreFocusIfLost();
    if (!this.ready()) {
      afterNextRender(() => this.ready.set(true), { injector: this.injector });
    }
  }

  private isUsable(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  private scrollToTarget(element: Element, step: AndesTourStep): void {
    const setting = step.scrollIntoView ?? this.scrollIntoView();
    if (setting === false || typeof element.scrollIntoView !== 'function') {
      return;
    }
    const rect = element.getBoundingClientRect();
    const view = this.document.defaultView;
    const height = view?.innerHeight ?? this.viewport().height;
    const width = view?.innerWidth ?? this.viewport().width;
    const visible =
      rect.top >= VISIBLE_MARGIN &&
      rect.left >= VISIBLE_MARGIN &&
      rect.bottom <= height - VISIBLE_MARGIN &&
      rect.right <= width - VISIBLE_MARGIN;
    if (visible) {
      return;
    }
    const reduced =
      typeof view?.matchMedia === 'function' &&
      view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const options: ScrollIntoViewOptions =
      typeof setting === 'object'
        ? setting
        : {
            block: 'center',
            inline: 'nearest',
            behavior: reduced ? 'auto' : 'smooth',
          };
    element.scrollIntoView(options);
  }

  private scheduleMeasure(): void {
    if (this.frame !== null) {
      return;
    }
    const view = this.document.defaultView;
    if (!view || typeof view.requestAnimationFrame !== 'function') {
      this.measure();
      return;
    }
    this.frame = view.requestAnimationFrame(() => {
      this.frame = null;
      this.measure();
    });
  }

  private measure(): void {
    const view = this.document.defaultView;
    if (view) {
      this.viewport.set({ width: view.innerWidth, height: view.innerHeight });
    }
    const step = this.step();
    // A selector or function can resolve to a different element as the page changes.
    if (step && typeof step.target !== 'object') {
      const element = toElement(step.target, this.document);
      if (element !== this.targetElement) {
        this.targetElement = element;
        this.observe();
      }
    }
    const element = this.targetElement;
    if (element?.isConnected && this.isUsable(element)) {
      const rect = element.getBoundingClientRect();
      this.targetRect.set({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    } else {
      this.targetRect.set(null);
    }
    const popup = this.popup()?.nativeElement;
    if (popup && popup.offsetWidth > 0 && popup.offsetHeight > 0) {
      const size = { width: popup.offsetWidth, height: popup.offsetHeight };
      const known = this.cardSize();
      if (size.width !== known.width || size.height !== known.height) {
        this.cardSize.set(size);
      }
    }
  }

  /** The card keeps the same element between steps, but a button can vanish under focus. */
  private restoreFocusIfLost(): void {
    afterNextRender(
      () => {
        const popup = this.popup()?.nativeElement;
        const active = this.document.activeElement;
        if (
          popup &&
          (!active || active === this.document.body || !popup.contains(active))
        ) {
          popup
            .querySelector<HTMLElement>('.andes-tour__body')
            ?.focus({ preventScroll: true });
        }
      },
      { injector: this.injector },
    );
  }

  /** Radius of the spotlight in CSS. */
  protected get spotlightRadius(): string {
    return `${this.radius()}px`;
  }

  protected maskColor(): string | null {
    return this.maskSetting().color;
  }
}
