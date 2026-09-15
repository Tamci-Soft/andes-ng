import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

export type AndesProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type AndesProgressSize = 'sm' | 'md' | 'lg';

/**
 * `data-*` status attributes mirroring Base UI's `Progress.Status` contract
 * (`indeterminate` | `progressing` | `complete`), exposed individually as
 * presence attributes so consumer CSS can hook into any of them.
 */
type AndesProgressState = 'indeterminate' | 'progressing' | 'complete' | null;

@Component({
  selector: 'andes-progress',
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
  readonly variant = input<AndesProgressVariant>('primary');
  readonly size = input<AndesProgressSize>('md');

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

  protected readonly isIndeterminate = computed(() => this.value() === null);

  /** Value clamped to [min, max]; `null` stays `null` (indeterminate). */
  protected readonly clampedValue = computed(() => {
    const value = this.value();
    if (value === null) {
      return null;
    }
    return Math.min(this.max(), Math.max(this.min(), value));
  });

  protected readonly percent = computed(() => {
    const value = this.clampedValue();
    if (value === null) {
      return 0;
    }
    const min = this.min();
    const max = this.max();
    return max === min ? 0 : ((value - min) / (max - min)) * 100;
  });

  protected readonly state = computed<AndesProgressState>(() => {
    if (this.isIndeterminate()) {
      return 'indeterminate';
    }
    const value = this.clampedValue();
    const max = this.max();
    const min = this.min();
    if (value === max) {
      return 'complete';
    }
    if (value !== null && value > min && value < max) {
      return 'progressing';
    }
    return null;
  });

  protected readonly classes = computed(() =>
    clsx(
      'andes-progress',
      `andes-progress--${this.variant()}`,
      `andes-progress--${this.size()}`,
    ),
  );
}
