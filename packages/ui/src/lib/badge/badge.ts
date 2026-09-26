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

export type AndesBadgeVariant =
  'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
export type AndesBadgeSize = 'default' | 'small';
/** Status-indicator values - each maps onto one of andes-ng's semantic colors. */
export type AndesBadgeStatus =
  'success' | 'processing' | 'default' | 'error' | 'warning';
/**
 * A preset (one of the variant names, themed through `--andes-*` tokens) or any CSS color
 * string (`#722ed1`, `rgb(...)`, `hsl(...)`, a named color, `var(--x)`). Arbitrary colors get
 * black or white text, whichever contrasts more - see `.andes-badge--custom` in badge.css.
 */
// `string & {}` keeps the preset literals in editor autocompletion instead of collapsing the
// whole union to plain `string`.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AndesBadgeColor = AndesBadgeVariant | (string & {});

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

/** Splits a `color` input into the preset it names, or the raw CSS color to apply inline. */
export function resolveBadgeColor(color: string | undefined): {
  preset: AndesBadgeVariant | undefined;
  custom: string | undefined;
} {
  if (!color) {
    return { preset: undefined, custom: undefined };
  }
  return BADGE_PRESETS.includes(color)
    ? { preset: color as AndesBadgeVariant, custom: undefined }
    : { preset: undefined, custom: color };
}

@Component({
  selector: 'andes-badge',
  imports: [NgTemplateOutlet],
  templateUrl: './badge.html',
  styleUrl: './badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Forwarded to the indicator element instead - a screen reader reading the host would
    // otherwise announce the label twice.
    '[attr.aria-label]': 'null',
  },
})
export class AndesBadge {
  /**
   * Numeric value to display, or a `TemplateRef` rendered as a custom indicator (e.g. an icon)
   * in place of the count bubble. Leave unset (and pass `dot`) for a plain presence dot.
   */
  readonly count = input<number | TemplateRef<unknown> | undefined>(undefined);
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
   * Overrides `variant` (and `status`'s color): a preset name, or any CSS color with
   * auto-contrast text.
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
    () => this.dot() || this.status() !== undefined,
  );

  protected readonly customCount = computed(() => {
    const count = this.count();
    return count instanceof TemplateRef ? count : null;
  });

  private readonly numericCount = computed(() => {
    const count = this.count();
    return typeof count === 'number' ? count : undefined;
  });

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
    if (this.isDot()) {
      return true;
    }
    const count = this.numericCount();
    return count !== undefined && (count > 0 || this.showZero());
  });

  protected readonly displayValue = computed(() => {
    const count = this.numericCount();
    if (count === undefined) {
      return '';
    }
    const max = this.overflowCount() ?? this.max();
    return count > max ? `${max}+` : `${count}`;
  });

  /**
   * A one-character count is forced into a true circle rather than the slightly elongated box
   * `min-width` alone produces, matching shadcn's count-indicator convention: the badge is
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
