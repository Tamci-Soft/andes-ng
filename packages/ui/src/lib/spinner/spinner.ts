import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';

export type AndesSpinnerVariant = 'ring' | 'dots' | 'bars';
export type AndesSpinnerSizePreset = 'sm' | 'md' | 'lg';
/** A preset, a number of pixels, or any CSS length (`'2rem'`). */
export type AndesSpinnerSize = AndesSpinnerSizePreset | number | string;
/** A progress value from 0 to 100, or `'auto'` for a simulated one. */
export type AndesSpinnerPercent = number | 'auto';

const SIZE_PRESETS: Record<AndesSpinnerSizePreset, number> = {
  sm: 16,
  md: 24,
  lg: 40,
};

const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** How often the simulated progress advances. */
const AUTO_INTERVAL_MS = 200;
/** The simulated progress never claims to be done on its own. */
const AUTO_CEILING = 98;

export function spinnerPercentAttribute(
  value: unknown,
): AndesSpinnerPercent | undefined {
  if (value === 'auto') {
    return 'auto';
  }
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * A standalone loading indicator: a ring (default), three dots or three bars, with an optional
 * `tip` and a determinate `percent`.
 *
 * Indeterminate spinners are `role="status"` with a visually hidden label (the `tip` doubles as
 * the label when set). With a `percent` the host becomes a `role="progressbar"`. Under
 * `prefers-reduced-motion` the loop is not removed - it slows down (a gentle fade for dots and
 * bars, a slow turn for the ring) so the loading state stays visible.
 *
 * Styling hooks: `--andes-spinner-color`, `--andes-spinner-track-color`,
 * `--andes-spinner-size`.
 */
@Component({
  selector: 'andes-spinner',
  templateUrl: './spinner.html',
  styleUrl: './spinner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': '"spinner"',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'presetSize()',
    '[attr.data-determinate]': 'determinate() ? "" : null',
    '[style.--andes-spinner-size]': 'cssSize()',
    '[attr.role]': 'determinate() ? "progressbar" : "status"',
    '[attr.aria-label]': 'determinate() ? accessibleName() : null',
    '[attr.aria-valuemin]': 'determinate() ? 0 : null',
    '[attr.aria-valuemax]': 'determinate() ? 100 : null',
    '[attr.aria-valuenow]': 'resolvedPercent() ?? null',
  },
})
export class AndesSpinner {
  readonly variant = input<AndesSpinnerVariant>('ring');
  /** `sm` 16px, `md` 24px (default), `lg` 40px, a pixel number, or a CSS length. */
  readonly size = input<AndesSpinnerSize>('md');
  /** Text shown under the indicator; it is also the status label when set. */
  readonly tip = input<string | undefined>(undefined);
  /** Visually hidden status text, used when there is no visible `tip`. */
  readonly label = input('Loading');
  /**
   * Switches the ring to a determinate fill (0-100). `'auto'` simulates progress that slows
   * down as it approaches the end and never completes by itself. Only the ring is determinate;
   * the other variants keep animating and just report the value.
   */
  readonly percent = input<AndesSpinnerPercent | undefined, unknown>(
    undefined,
    { transform: spinnerPercentAttribute },
  );

  private readonly simulated = signal(0);

  constructor() {
    effect((onCleanup) => {
      if (this.percent() !== 'auto') {
        return;
      }
      this.simulated.set(0);
      const timer = setInterval(() => {
        this.simulated.update((value) =>
          Math.min(AUTO_CEILING, value + Math.max(0.4, (100 - value) * 0.045)),
        );
      }, AUTO_INTERVAL_MS);
      onCleanup(() => clearInterval(timer));
    });
  }

  /** The percentage being shown, clamped and rounded; `undefined` when indeterminate. */
  protected readonly resolvedPercent = computed(() => {
    const percent = this.percent();
    if (percent === undefined) {
      return undefined;
    }
    const value = percent === 'auto' ? this.simulated() : percent;
    return Math.round(Math.min(100, Math.max(0, value)));
  });

  protected readonly determinate = computed(
    () => this.resolvedPercent() !== undefined,
  );

  protected readonly presetSize = computed(() => {
    const size = this.size();
    return size === 'sm' || size === 'md' || size === 'lg' ? size : null;
  });

  protected readonly cssSize = computed(() => {
    const size = this.size();
    if (typeof size === 'number') {
      return Number.isFinite(size) && size > 0 ? `${size}px` : null;
    }
    if (this.presetSize()) {
      return `${SIZE_PRESETS[size as AndesSpinnerSizePreset]}px`;
    }
    const trimmed = size.trim();
    return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed || null;
  });

  protected readonly accessibleName = computed(
    () => this.tip() || this.label(),
  );

  protected readonly circumference = RING_CIRCUMFERENCE;
  protected readonly radius = RING_RADIUS;

  /** `stroke-dasharray` of the ring's arc: a quarter turn, or the determinate fraction. */
  protected readonly dash = computed(() => {
    const percent = this.resolvedPercent();
    const length =
      percent === undefined
        ? RING_CIRCUMFERENCE * 0.28
        : (RING_CIRCUMFERENCE * percent) / 100;
    return `${length.toFixed(2)} ${RING_CIRCUMFERENCE.toFixed(2)}`;
  });
}
