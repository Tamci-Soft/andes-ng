import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

import { AndesPaletteColor, resolvePaletteColor } from '../palette/palette';

export type AndesBadgeVariant =
  'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
export type AndesBadgeSize = 'default' | 'small';
/** Status-indicator values - each maps onto one of andes-ng's semantic colors. */
export type AndesBadgeStatus =
  'success' | 'processing' | 'default' | 'error' | 'warning';
/**
 * A preset (one of the variant names, themed through `--andes-*` tokens), a named palette hue
 * (`red`, `indigo`, `magenta`, ... - themed for light and dark, see palette.css) or any other
 * CSS color string (`#722ed1`, `rgb(...)`, `hsl(...)`, `var(--x)`). Palette hues and arbitrary
 * colors get black or white text, whichever contrasts more - see `.andes-badge--custom` in
 * badge.css.
 */
// `string & {}` keeps the preset literals in editor autocompletion instead of collapsing the
// whole union to plain `string`.
export type AndesBadgeColor =
  AndesBadgeVariant | AndesPaletteColor | (string & {});

const BADGE_PRESETS: readonly string[] = [
  'primary',
  'secondary',
  'danger',
  'success',
  'warning',
  'info',
];

/** `default` is internal-only: the neutral gray used for `status="default"`. */
type ResolvedBadgeColor = AndesBadgeVariant | 'default';

const STATUS_COLORS: Record<AndesBadgeStatus, ResolvedBadgeColor> = {
  success: 'success',
  processing: 'info',
  default: 'default',
  error: 'danger',
  warning: 'warning',
};

/**
 * Splits a `color` input into the preset it names, or the CSS color to apply inline - a
 * palette name becomes its themed custom property, anything else passes through raw.
 */
export function resolveBadgeColor(color: string | undefined): {
  preset: AndesBadgeVariant | undefined;
  custom: string | undefined;
} {
  if (!color) {
    return { preset: undefined, custom: undefined };
  }
  return BADGE_PRESETS.includes(color)
    ? { preset: color as AndesBadgeVariant, custom: undefined }
    : { preset: undefined, custom: resolvePaletteColor(color) ?? color };
}

/** A numeric string (`count="5"` written as a plain attribute) counts as that number. */
function toNumericCount(count: unknown): number | undefined {
  if (typeof count === 'number') {
    return Number.isFinite(count) ? count : undefined;
  }
  if (typeof count === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(count)) {
    return Number(count);
  }
  return undefined;
}

@Component({
  selector: 'andes-badge',
  imports: [NgTemplateOutlet],
  templateUrl: './badge.html',
  styleUrls: ['../palette/palette.css', './badge.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Forwarded to the indicator element instead - a screen reader reading the host would
    // otherwise announce the label twice.
    '[attr.aria-label]': 'null',
  },
})
export class AndesBadge {
  /**
   * Value to display: a number (capped by `max`/`overflowCount`), a short string shown as-is in
   * the bubble (`"new"`, `"!"` - a numeric string counts as that number), or a `TemplateRef`
   * rendered as a custom indicator (e.g. an icon) in place of the bubble. Leave unset (and pass
   * `dot`) for a plain presence dot. With `dot`, a count of exactly 0 still hides the dot
   * unless `showZero` is set - so `[count]="unread" dot` disappears once nothing is unread.
   */
  readonly count = input<
    number | string | TemplateRef<unknown> | null | undefined
  >(undefined);
  /** Counts above this are shown as `${max}+`. */
  readonly max = input(99);
  /** Alternative name for `max`; wins over `max` when both are set. */
  readonly overflowCount = input<number | undefined>(undefined);
  /** Renders a small dot instead of a numeric value - the badge only signals presence. */
  readonly dot = input(false, { transform: booleanAttribute });
  /** Keep the badge visible when `count` is exactly 0 (hidden by default). */
  readonly showZero = input(false, { transform: booleanAttribute });
  readonly variant = input<AndesBadgeVariant>('danger');
  /**
   * Overrides `variant` (and `status`'s color): a preset name, a palette hue, or any CSS
   * color with auto-contrast text. In standalone mode with no `count`, a color on its own
   * renders a colored dot - `<andes-badge standalone color="pink" text="Pink" />`.
   */
  readonly color = input<AndesBadgeColor | undefined>(undefined);
  readonly size = input<AndesBadgeSize>('default');
  /**
   * Adds a looping pulse ring, the same treatment `status="processing"` gets.
   * Typically paired with `dot`.
   */
  readonly processing = input(false, { transform: booleanAttribute });
  /**
   * Status indicator: a colored dot (pulsing for `processing`) with an optional `text`
   * label beside it. Implies `standalone` + `dot` - the badge renders inline instead of pinned
   * over projected content, and `count` is ignored.
   */
  readonly status = input<AndesBadgeStatus | undefined>(undefined);
  /**
   * Label rendered beside the indicator in standalone/`status` mode - a string or a
   * `TemplateRef`. A projected `slot=label` element still works and renders after it.
   */
  readonly text = input<string | TemplateRef<unknown> | undefined>(undefined);
  /** [x, y] pixel offset applied on top of the default corner position. */
  readonly offset = input<[number, number] | undefined>(undefined);
  /** Native tooltip shown when hovering the count/dot indicator itself. */
  readonly title = input<string | undefined>(undefined);
  /**
   * Renders the badge as a normal inline element instead of an absolutely positioned
   * overlay - for a standalone status indicator (optionally paired with `text` or a
   * `slot=label` projected description) rather than a marker pinned to a sibling element.
   */
  readonly standalone = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  protected readonly isStandalone = computed(
    () => this.standalone() || this.status() !== undefined,
  );

  protected readonly isDot = computed(
    () =>
      this.dot() ||
      this.status() !== undefined ||
      // A colored dot is the only thing a count-less standalone color badge can show.
      (this.isStandalone() &&
        (this.count() === undefined || this.count() === null) &&
        !!this.color()),
  );

  protected readonly customCount = computed(() => {
    const count = this.count();
    return count instanceof TemplateRef ? count : null;
  });

  private readonly numericCount = computed(() => toNumericCount(this.count()));

  /** A non-numeric string count, shown verbatim. */
  private readonly textCount = computed(() => {
    const count = this.count();
    return typeof count === 'string' &&
      this.numericCount() === undefined &&
      count.trim() !== ''
      ? count
      : undefined;
  });

  /**
   * Flips on after the first render. Enter animations are bound to it, so a page full of
   * badges doesn't zoom in on load - only a badge that appears, or a count that changes,
   * afterwards animates.
   */
  protected readonly motion = signal(false);

  constructor() {
    afterNextRender(() => this.motion.set(true));
  }

  protected readonly textTemplate = computed(() => {
    const text = this.text();
    return text instanceof TemplateRef ? text : null;
  });

  protected readonly textString = computed(() => {
    const text = this.text();
    return typeof text === 'string' ? text : null;
  });

  private readonly resolvedColor = computed(() =>
    resolveBadgeColor(this.color()),
  );

  /** Arbitrary CSS color from `color`, applied through `--andes-badge-color`. */
  protected readonly customColor = computed(() => this.resolvedColor().custom);

  private readonly colorClass = computed<ResolvedBadgeColor>(() => {
    const status = this.status();
    return (
      this.resolvedColor().preset ??
      (status ? STATUS_COLORS[status] : this.variant())
    );
  });

  protected readonly isProcessing = computed(
    () => this.processing() || this.status() === 'processing',
  );

  protected readonly visible = computed(() => {
    const count = this.numericCount();
    const hiddenZero = count === 0 && !this.showZero();
    if (this.status() !== undefined) {
      return true;
    }
    if (this.isDot()) {
      return !hiddenZero;
    }
    if (this.textCount() !== undefined) {
      return true;
    }
    return count !== undefined && (count > 0 || this.showZero());
  });

  protected readonly displayValue = computed(() => {
    const text = this.textCount();
    if (text !== undefined) {
      return text;
    }
    const count = this.numericCount();
    if (count === undefined) {
      return '';
    }
    const max = this.overflowCount() ?? this.max();
    return count > max ? `${max}+` : `${count}`;
  });

  /**
   * A one-character count is forced into a true circle rather than the slightly elongated box
   * `min-width` alone produces, the usual count-indicator convention: the badge is
   * only allowed to stretch into a pill once the content genuinely needs the width.
   * `min-width` can't deliver that on its own - the glyph still sits on top of
   * `padding-inline`, so the box ends up wider than tall even for a single digit.
   *
   * Measuring `displayValue()` is exact rather than a heuristic: the indicator element renders
   * nothing but this string (`standalone`'s `text`/`slot=label` content is rendered as the
   * badge's *sibling*, never inside it), so `count`/`max` fully determine its length in every
   * mode. `dot` is excluded because it carries no text and already has its own fixed circle.
   */
  protected readonly singleCharacter = computed(
    () => !this.isDot() && this.displayValue().length === 1,
  );

  protected readonly offsetX = computed(() => this.offset()?.[0] ?? 0);
  protected readonly offsetY = computed(() => this.offset()?.[1] ?? 0);

  protected readonly classes = computed(() =>
    clsx(
      'andes-badge',
      this.customColor()
        ? 'andes-badge--custom'
        : `andes-badge--${this.colorClass()}`,
      this.isDot() && 'andes-badge--dot',
      this.singleCharacter() && 'andes-badge--single-char',
      this.size() === 'small' && 'andes-badge--small',
      this.isProcessing() && 'andes-badge--processing',
    ),
  );
}
