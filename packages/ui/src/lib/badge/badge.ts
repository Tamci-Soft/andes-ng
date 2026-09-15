import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

export type AndesBadgeVariant =
  'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';

@Component({
  selector: 'andes-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesBadge {
  /** Numeric value to display. Leave unset (and pass `dot`) for a plain presence dot. */
  readonly count = input<number | undefined>(undefined);
  /** Counts above this are shown as `${max}+`. */
  readonly max = input(99);
  /** Renders a small dot instead of a numeric value - the badge only signals presence. */
  readonly dot = input(false, { transform: booleanAttribute });
  /** Keep the badge visible when `count` is exactly 0 (hidden by default, matching Ant). */
  readonly showZero = input(false, { transform: booleanAttribute });
  readonly variant = input<AndesBadgeVariant>('danger');
  /**
   * Renders the badge as a normal inline element instead of an absolutely positioned
   * overlay - for a standalone status indicator (optionally paired with a `slot=label`
   * projected description) rather than a marker pinned to a sibling element.
   */
  readonly standalone = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  protected readonly visible = computed(() => {
    if (this.dot()) {
      return true;
    }
    const count = this.count();
    return count !== undefined && (count > 0 || this.showZero());
  });

  protected readonly displayValue = computed(() => {
    const count = this.count();
    if (count === undefined) {
      return '';
    }
    const max = this.max();
    return count > max ? `${max}+` : `${count}`;
  });

  protected readonly classes = computed(() =>
    clsx(
      'andes-badge',
      `andes-badge--${this.variant()}`,
      this.dot() && 'andes-badge--dot',
    ),
  );
}
