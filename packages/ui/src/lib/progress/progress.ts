import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

export type AndesProgressVariant = 'primary' | 'success' | 'warning' | 'danger';

/** Shape of the meter. `circle`/`dashboard` render an SVG ring instead of a bar. */
export type AndesProgressType = 'line' | 'circle' | 'dashboard';

/**
 * Semantic status. `success`/`exception` override the {@link AndesProgressVariant} color and
 * swap the default info text for a check/close icon; `active` animates a shimmer across a line
 * bar.
 */
export type AndesProgressStatus = 'normal' | 'success' | 'exception' | 'active';

/** Named presets. `small`/`default` are aliases for `sm`/`md`. */
export type AndesProgressSizePreset = 'sm' | 'md' | 'lg' | 'small' | 'default';

/**
 * A preset, or an explicit size:
 * - line: a number is the bar thickness in px; `[width, height]`/`{ width, height }` sets both
 *   (width may be any CSS length string, e.g. `'50%'`).
 * - steps: a number is each step's width and height; `[width, height]` sets each step's size.
 * - circle/dashboard: a number (or the first tuple entry) is the diameter in px.
 */
export type AndesProgressSize =
  | AndesProgressSizePreset
  | number
  | [number | string | undefined, number | undefined]
  | { width?: number | string; height?: number };

/**
 * A gradient: either `{ from, to, direction? }` or percent-keyed stops
 * (`{ '0%': '#108ee9', '100%': '#87d068' }`). `direction` only applies to `line`.
 */
export type AndesProgressGradient = { direction?: string } & (
  { from: string; to: string } | Record<string, string>
);

/** A solid color, a gradient, or (with `steps`) one color per step. */
export type AndesProgressStrokeColor =
  string | string[] | AndesProgressGradient;

export type AndesProgressLinecap = 'round' | 'butt' | 'square';

/** The "already done" segment drawn on top of the main one. */
export interface AndesProgressSuccess {
  percent?: number;
  strokeColor?: string;
}

/** Where a `line` bar's info text sits. Defaults to `{ align: 'end', type: 'outer' }`. */
export interface AndesProgressPercentPosition {
  align?: 'start' | 'center' | 'end';
  type?: 'inner' | 'outer';
}

export type AndesProgressSteps = number | { count: number; gap?: number };

/** Context of a `format` template: `let-percent` / `let-success="successPercent"`. */
export interface AndesProgressFormatContext {
  $implicit: number;
  percent: number;
  successPercent: number | undefined;
}

export type AndesProgressFormatFn = (
  percent: number,
  successPercent: number | undefined,
) => string;

export type AndesProgressFormat =
  AndesProgressFormatFn | TemplateRef<AndesProgressFormatContext>;

type AndesProgressState = 'indeterminate' | 'progressing' | 'complete' | null;
type AndesProgressColor = AndesProgressVariant;
type InfoKind = 'template' | 'text' | 'success-icon' | 'exception-icon';

const VIEW_BOX = 100;
const HALF = VIEW_BOX / 2;
const CIRCLE_DEFAULT_STROKE_WIDTH = 6;
/** Keeps a tiny ring's stroke at least ~3px wide so it stays visible. */
const CIRCLE_MIN_STROKE_PX = 3;
/** At or below this diameter the ring is an inline icon-sized glyph with no room for text. */
const CIRCLE_TINY_SIZE = 20;
const CIRCLE_STEP_GAP = 2;
const CIRCLE_SIZES: Record<'sm' | 'md' | 'lg', number> = {
  sm: 60,
  md: 120,
  lg: 160,
};
/** Per-step [width, height] for line steps. */
const STEP_SIZES: Record<'sm' | 'md' | 'lg', [number, number]> = {
  sm: [2, 8],
  md: [14, 8],
  lg: [14, 12],
};

/** Rotation that puts the middle of the gap at each placement (SVG 0deg = 3 o'clock). */
const GAP_ROTATION: Record<'top' | 'bottom' | 'left' | 'right', number> = {
  bottom: 90,
  left: 180,
  top: 270,
  right: 0,
};

let nextId = 0;

function clampPercent(value: number | undefined | null): number {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function presetOf(size: AndesProgressSize): 'sm' | 'md' | 'lg' | null {
  switch (size) {
    case 'sm':
    case 'small':
      return 'sm';
    case 'md':
    case 'default':
      return 'md';
    case 'lg':
      return 'lg';
    default:
      return null;
  }
}

function explicitSize(
  size: AndesProgressSize,
): [number | string | undefined, number | undefined] | null {
  if (typeof size === 'number') {
    return [size, size];
  }
  if (Array.isArray(size)) {
    return size;
  }
  if (typeof size === 'object' && size !== null) {
    return [size.width, size.height];
  }
  return null;
}

/** `{ '0%': a, '50%': b }` -> `[{ offset: 0, color: a }, { offset: 50, color: b }]`. */
function gradientStops(
  gradient: AndesProgressGradient,
): { offset: number; color: string }[] {
  const {
    from,
    to,
    direction: _direction,
    ...rest
  } = gradient as Record<string, string | undefined>;
  const stops = Object.entries(rest)
    .map(([key, color]) => ({
      offset: Number.parseFloat(key.replace(/%/g, '')),
      color: color ?? '',
    }))
    .filter((stop) => !Number.isNaN(stop.offset))
    .sort((a, b) => a.offset - b.offset);
  if (stops.length > 0) {
    return stops;
  }
  return [
    { offset: 0, color: from ?? 'currentColor' },
    { offset: 100, color: to ?? from ?? 'currentColor' },
  ];
}

function isGradient(
  color: AndesProgressStrokeColor | undefined,
): color is AndesProgressGradient {
  return typeof color === 'object' && color !== null && !Array.isArray(color);
}

@Component({
  selector: 'andes-progress',
  imports: [NgTemplateOutlet],
  templateUrl: './progress.html',
  styleUrl: './progress.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // The host custom element is a bare wrapper - the real `role="progressbar"`
    // and `aria-*` wiring lives on the template's inner element (same pattern
    // as AndesButton), so assistive tech never sees these on the host tag.
    '[attr.role]': 'null',
  },
})
export class AndesProgress {
  /**
   * Current value. `null` (the default) puts the meter in the indeterminate
   * state - matching Base UI's `Progress.Root` contract - since `0` and
   * "unknown progress" are different states to assistive tech.
   */
  readonly value = input<number | null>(null);
  readonly min = input(0);
  readonly max = input(100);
  /**
   * Completion percentage (0-100). When set it takes precedence over `value`/`min`/`max` and
   * the meter is never indeterminate.
   */
  readonly percent = input<number | undefined>(undefined);
  readonly type = input<AndesProgressType>('line');
  readonly variant = input<AndesProgressVariant>('primary');
  readonly status = input<AndesProgressStatus | undefined>(undefined);
  readonly size = input<AndesProgressSize>('md');
  /**
   * Whether to render the percentage / status icon. Unset, it is on for `circle`/`dashboard`
   * (an empty ring says nothing) and off for `line`, which keeps the bare-bar look.
   */
  readonly showInfo = input<boolean | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null
        ? undefined
        : booleanAttribute(value),
  });
  /**
   * Custom info content: a function `(percent, successPercent) => string` (its result is also
   * used as `aria-valuetext`) or a template receiving `let-percent` and `successPercent`.
   */
  readonly format = input<AndesProgressFormat | undefined>(undefined);
  readonly strokeColor = input<AndesProgressStrokeColor | undefined>(undefined);
  readonly trailColor = input<string | undefined>(undefined);
  readonly strokeLinecap = input<AndesProgressLinecap>('round');
  /** Line: bar thickness in px. Circle/dashboard: stroke width as a % of the diameter. */
  readonly strokeWidth = input<number | undefined>(undefined);
  readonly steps = input<AndesProgressSteps | undefined>(undefined);
  /** How the filled step count is rounded from `percent`. */
  readonly rounding = input<(step: number) => number>(Math.round);
  /** Size of the dashboard's opening, in degrees (0-295). Defaults to 75 for `dashboard`. */
  readonly gapDegree = input<number | undefined>(undefined);
  /** Where the dashboard's opening sits. `start`/`end` map to left/right. */
  readonly gapPlacement = input<'top' | 'bottom' | 'start' | 'end' | undefined>(
    undefined,
  );
  /** @deprecated Use `gapPlacement` (logical `start`/`end` instead of `left`/`right`). */
  readonly gapPosition = input<'top' | 'bottom' | 'left' | 'right' | undefined>(
    undefined,
  );
  readonly success = input<AndesProgressSuccess | undefined>(undefined);
  readonly percentPosition = input<AndesProgressPercentPosition>({});

  /** Explicit accessible value text (e.g. "56 of 100 uploaded"). */
  readonly ariaValuetext = input<string | undefined>(undefined, {
    alias: 'aria-valuetext',
  });
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  /** Unique per instance so several rings on one page don't share one `<linearGradient>`. */
  protected readonly gradientId = `andes-progress-gradient-${nextId++}`;

  protected readonly isIndeterminate = computed(
    () => this.percent() === undefined && this.value() === null,
  );

  /** Range reported to assistive tech: `percent` always reports on a 0-100 scale. */
  protected readonly range = computed(() => {
    const percent = this.percent();
    if (percent !== undefined) {
      return {
        min: 0,
        max: 100,
        value: clampPercent(percent) as number | null,
      };
    }
    const value = this.value();
    const min = this.min();
    const max = this.max();
    return {
      min,
      max,
      value: value === null ? null : Math.min(max, Math.max(min, value)),
    };
  });

  /** Value clamped to [min, max]; `null` stays `null` (indeterminate). */
  protected readonly clampedValue = computed(() => this.range().value);

  protected readonly mergedPercent = computed(() => {
    const { min, max, value } = this.range();
    if (value === null) {
      return 0;
    }
    return max === min ? 0 : ((value - min) / (max - min)) * 100;
  });

  protected readonly successPercent = computed(() => {
    const success = this.success();
    return success?.percent === undefined
      ? undefined
      : clampPercent(success.percent);
  });

  protected readonly state = computed<AndesProgressState>(() => {
    if (this.isIndeterminate()) {
      return 'indeterminate';
    }
    const { min, max, value } = this.range();
    if (value === max) {
      return 'complete';
    }
    if (value !== null && value > min && value < max) {
      return 'progressing';
    }
    return null;
  });

  protected readonly mergedStatus = computed<AndesProgressStatus>(
    () => this.status() ?? 'normal',
  );

  /** Status wins over variant: `success`/`exception` always paint green/red. */
  protected readonly color = computed<AndesProgressColor>(() => {
    switch (this.mergedStatus()) {
      case 'success':
        return 'success';
      case 'exception':
        return 'danger';
      default:
        return this.variant();
    }
  });

  protected readonly isCircle = computed(() => this.type() !== 'line');
  protected readonly preset = computed(() => presetOf(this.size()));

  protected readonly infoAlign = computed(
    () => this.percentPosition().align ?? 'end',
  );
  protected readonly infoInner = computed(
    () =>
      !this.isCircle() &&
      this.stepCount() === 0 &&
      this.percentPosition().type === 'inner',
  );

  // --- Info -----------------------------------------------------------------

  protected readonly infoVisible = computed(() => {
    if (this.isIndeterminate()) {
      return false;
    }
    if (this.isCircle() && this.circleSize() <= CIRCLE_TINY_SIZE) {
      return false;
    }
    return this.showInfo() ?? this.isCircle();
  });

  protected readonly infoKind = computed<InfoKind>(() => {
    const format = this.format();
    if (format instanceof TemplateRef) {
      return 'template';
    }
    const status = this.mergedStatus();
    if (
      this.infoInner() ||
      format ||
      (status !== 'success' && status !== 'exception')
    ) {
      return 'text';
    }
    return status === 'success' ? 'success-icon' : 'exception-icon';
  });

  protected readonly infoTemplate = computed(() => {
    const format = this.format();
    return format instanceof TemplateRef ? format : null;
  });

  protected readonly infoContext = computed<AndesProgressFormatContext>(() => ({
    $implicit: this.mergedPercent(),
    percent: this.mergedPercent(),
    successPercent: this.successPercent(),
  }));

  /** Result of a function `format`, or the default `NN%`. */
  protected readonly infoText = computed(() => {
    const format = this.format();
    if (typeof format === 'function' && !(format instanceof TemplateRef)) {
      return format(this.mergedPercent(), this.successPercent());
    }
    // One decimal at most, rounded down so the text never reads "100%" before it is (the
    // epsilon absorbs float noise such as 0.57 / 1 * 100 = 56.99999999999999).
    return `${Math.floor(this.mergedPercent() * 10 + 1e-6) / 10}%`;
  });

  /**
   * An explicit `aria-valuetext` wins; otherwise a function `format`'s text is announced
   * (the visible info is `aria-hidden`, since a progressbar's children are presentational).
   */
  protected readonly mergedAriaValuetext = computed(() => {
    const explicit = this.ariaValuetext();
    if (explicit !== undefined) {
      return explicit;
    }
    const format = this.format();
    if (typeof format === 'function' && !this.isIndeterminate()) {
      return this.infoText();
    }
    return null;
  });

  // --- Line -----------------------------------------------------------------

  /** Explicit [width, height] for the line bar, or null to use the preset CSS. */
  private readonly lineBox = computed<[string | null, number | null]>(() => {
    const size = this.size();
    const strokeWidth = this.strokeWidth();
    if (typeof size === 'number') {
      // A lone number is the bar's thickness (andes `size` has always meant thickness).
      return [null, size];
    }
    const explicit = explicitSize(size);
    if (explicit) {
      const [width, height] = explicit;
      return [
        width === undefined || width === -1
          ? null
          : typeof width === 'number'
            ? `${width}px`
            : width,
        height ?? strokeWidth ?? 8,
      ];
    }
    return [null, strokeWidth ?? null];
  });

  protected readonly lineWidth = computed(() => this.lineBox()[0]);
  protected readonly lineHeight = computed(() => this.lineBox()[1]);

  private readonly solidStrokeColor = computed(() => {
    const color = this.strokeColor();
    return Array.isArray(color) ? color[0] : color;
  });

  /** CSS `background` for the line indicator: a color or a `linear-gradient()`. */
  protected readonly lineBackground = computed(() => {
    const color = this.solidStrokeColor();
    if (color === undefined) {
      return null;
    }
    if (typeof color === 'string') {
      return color;
    }
    const stops = gradientStops(color)
      .map((stop) => `${stop.color} ${stop.offset}%`)
      .join(', ');
    return `linear-gradient(${color.direction ?? 'to right'}, ${stops})`;
  });

  // --- Steps ----------------------------------------------------------------

  protected readonly stepCount = computed(() => {
    const steps = this.steps();
    const count = typeof steps === 'object' ? steps.count : steps;
    return count && count > 0 ? Math.floor(count) : 0;
  });

  private readonly activeSteps = computed(() =>
    this.rounding()(this.stepCount() * (this.mergedPercent() / 100)),
  );

  private stepColor(index: number): string | null {
    const color = this.strokeColor();
    if (Array.isArray(color)) {
      return color[index] ?? null;
    }
    return typeof color === 'string' ? color : null;
  }

  private readonly stepBox = computed<[number, number]>(() => {
    const size = this.size();
    const preset = presetOf(size);
    if (preset) {
      const [width, height] = STEP_SIZES[preset];
      return [width, this.strokeWidth() ?? height];
    }
    const [width, height] = explicitSize(size) ?? [];
    return [typeof width === 'number' ? width : 14, height ?? 8];
  });

  protected readonly lineSteps = computed(() => {
    const [width, height] = this.stepBox();
    const active = this.activeSteps();
    return Array.from({ length: this.stepCount() }, (_, index) => ({
      index,
      active: index < active,
      width,
      height,
      color:
        index < active ? this.stepColor(index) : (this.trailColor() ?? null),
    }));
  });

  // --- Circle / dashboard ---------------------------------------------------

  protected readonly circleSize = computed(() => {
    const size = this.size();
    const preset = presetOf(size);
    if (preset) {
      return CIRCLE_SIZES[preset];
    }
    const [width, height] = explicitSize(size) ?? [];
    const diameter = typeof width === 'number' ? width : height;
    return diameter ?? CIRCLE_SIZES.md;
  });

  protected readonly circleFontSize = computed(
    () => this.circleSize() * 0.15 + 6,
  );

  protected readonly circleStrokeWidth = computed(
    () =>
      this.strokeWidth() ??
      Math.max(
        (CIRCLE_MIN_STROKE_PX / this.circleSize()) * 100,
        CIRCLE_DEFAULT_STROKE_WIDTH,
      ),
  );

  protected readonly radius = computed(
    () => HALF - this.circleStrokeWidth() / 2,
  );
  protected readonly perimeter = computed(() => 2 * Math.PI * this.radius());

  protected readonly mergedGapDegree = computed(() => {
    const gap = this.gapDegree() ?? (this.type() === 'dashboard' ? 75 : 0);
    return Math.min(295, Math.max(0, gap));
  });

  /** Length of the ring actually drawn (the perimeter minus the dashboard's gap). */
  protected readonly arcLength = computed(
    () => this.perimeter() * ((360 - this.mergedGapDegree()) / 360),
  );

  /** Where the stroke starts: 12 o'clock for a full ring, the gap's trailing edge otherwise. */
  protected readonly rotation = computed(() => {
    const gap = this.mergedGapDegree();
    if (gap === 0) {
      return -90;
    }
    const placement = this.gapPlacement();
    const side =
      placement === 'start'
        ? 'left'
        : placement === 'end'
          ? 'right'
          : (placement ?? this.gapPosition() ?? 'bottom');
    return GAP_ROTATION[side] + gap / 2;
  });

  protected readonly circleTransform = computed(
    () => `rotate(${this.rotation()} ${HALF} ${HALF})`,
  );

  protected readonly railDasharray = computed(
    () => `${this.arcLength()} ${this.perimeter()}`,
  );

  /** Dash covering `percent` of the arc, trimmed so a round cap ends where the value does. */
  private arcDash(percent: number): string {
    const arc = this.arcLength();
    let length = (arc * percent) / 100;
    if (this.strokeLinecap() === 'round' && percent < 100) {
      length = Math.max(0.01, length - this.circleStrokeWidth() / 2);
    }
    return `${length} ${this.perimeter()}`;
  }

  protected readonly indicatorDasharray = computed(() =>
    this.arcDash(this.mergedPercent()),
  );
  protected readonly successDasharray = computed(() =>
    this.arcDash(this.successPercent() ?? 0),
  );

  /** Linear gradient stops, or null when the stroke is a solid color. */
  protected readonly circleGradient = computed(() => {
    const color = this.solidStrokeColor();
    return isGradient(color) ? gradientStops(color) : null;
  });

  /** Inline `stroke` for the circle indicator: gradient url, custom color, or null for CSS. */
  protected readonly circleStroke = computed(() => {
    if (this.circleGradient()) {
      return `url(#${this.gradientId})`;
    }
    const color = this.solidStrokeColor();
    return typeof color === 'string' ? color : null;
  });

  protected readonly circleSteps = computed(() => {
    const count = this.stepCount();
    if (count === 0) {
      return [];
    }
    const steps = this.steps();
    const gap =
      typeof steps === 'object' && steps.gap !== undefined
        ? steps.gap
        : CIRCLE_STEP_GAP;
    const slot = this.arcLength() / count;
    const length = Math.max(0.01, slot - gap);
    const active = this.activeSteps();
    return Array.from({ length: count }, (_, index) => ({
      index,
      active: index < active,
      dasharray: `${length} ${this.perimeter()}`,
      // Negative offset slides the dash forward along the ring; half a gap of lead-in keeps
      // the segments symmetric inside a dashboard's opening.
      dashoffset: -(index * slot + gap / 2),
      color:
        index < active ? this.stepColor(index) : (this.trailColor() ?? null),
    }));
  });

  // --- Classes --------------------------------------------------------------

  protected readonly classes = computed(() => {
    const type = this.type();
    const preset = this.preset();
    const status = this.mergedStatus();
    const isLine = !this.isCircle();
    return clsx(
      'andes-progress',
      `andes-progress--${this.color()}`,
      preset && `andes-progress--${preset}`,
      `andes-progress--type-${type}`,
      status !== 'normal' && `andes-progress--status-${status}`,
      this.stepCount() > 0 && 'andes-progress--steps',
      this.strokeLinecap() !== 'round' && 'andes-progress--square',
      isLine &&
        this.infoVisible() &&
        `andes-progress--align-${this.infoAlign()}`,
      this.infoInner() && 'andes-progress--inner',
      this.isCircle() &&
        this.circleSize() <= CIRCLE_TINY_SIZE &&
        'andes-progress--tiny',
    );
  });
}
