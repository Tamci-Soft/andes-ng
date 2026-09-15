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
export type AndesBadgeSize = 'default' | 'small';

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
  readonly size = input<AndesBadgeSize>('default');
  /**
   * Adds a looping pulse ring, matching Ant Badge's `status="processing"` treatment.
   * Typically paired with `dot`.
   */
  readonly processing = input(false, { transform: booleanAttribute });
  /** [x, y] pixel offset applied on top of the default corner position. */
  readonly offset = input<[number, number] | undefined>(undefined);
  /** Native tooltip shown when hovering the count/dot indicator itself. */
  readonly title = input<string | undefined>(undefined);
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

  /**
   * A one-character count is forced into a true circle rather than the slightly elongated box
   * `min-width` alone produces, matching Ant Design's and shadcn's count-indicator convention:
   * the badge is only allowed to stretch into a pill once the content genuinely needs the
   * width. `min-width` can't deliver that on its own - the glyph still sits on top of
   * `padding-inline`, so the box ends up wider than tall even for a single digit.
   *
   * Measuring `displayValue()` is exact rather than a heuristic: the indicator element renders
   * nothing but this string (`standalone`'s `slot=label` content is projected as the badge's
   * *sibling*, never inside it), so `count`/`max` fully determine its length in every mode.
   * `dot` is excluded because it carries no text and already has its own fixed circle.
   */
  protected readonly singleCharacter = computed(
    () => !this.dot() && this.displayValue().length === 1,
  );

  protected readonly offsetX = computed(() => this.offset()?.[0] ?? 0);
  protected readonly offsetY = computed(() => this.offset()?.[1] ?? 0);

  protected readonly classes = computed(() =>
    clsx(
      'andes-badge',
      `andes-badge--${this.variant()}`,
      this.dot() && 'andes-badge--dot',
      this.singleCharacter() && 'andes-badge--single-char',
      this.size() === 'small' && 'andes-badge--small',
      this.processing() && 'andes-badge--processing',
    ),
  );
}
